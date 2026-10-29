import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

// Resolve the absolute path to the SQLite database file dynamically
const candidate1 = path.join(process.cwd(), 'prisma', 'custom.db')
const candidate2 = path.join(process.cwd(), 'db', 'custom.db')
const candidate3 = path.join(process.cwd(), '.next', 'standalone', 'prisma', 'custom.db')
const candidate4 = path.join(process.cwd(), '.next', 'standalone', 'db', 'custom.db')

let customDbPath = [candidate1, candidate2, candidate3, candidate4].find(p => fs.existsSync(p)) || candidate1

// On Vercel / serverless environments, the deployment directory (/var/task) is read-only.
// Copy custom.db to /tmp/custom.db ONCE on cold boot if not present so SQLite can perform writes.
if (process.env.VERCEL) {
  const tmpDbDir = path.join('/tmp', 'db')
  const tmpDbPath = path.join(tmpDbDir, 'custom.db')
  try {
    if (!fs.existsSync(tmpDbDir)) {
      fs.mkdirSync(tmpDbDir, { recursive: true })
    }
    if (fs.existsSync(customDbPath) && !fs.existsSync(tmpDbPath)) {
      fs.copyFileSync(customDbPath, tmpDbPath)
    }
    if (fs.existsSync(tmpDbPath)) {
      customDbPath = tmpDbPath
    }
  } catch (err) {
    console.error('Failed to copy custom.db to /tmp:', err)
  }
}

// If a remote DATABASE_URL is explicitly set (e.g. Postgres, Turso, Supabase), use it. Otherwise use local SQLite custom.db.
const isRemoteDb = process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')
const dbUrl = isRemoteDb ? process.env.DATABASE_URL! : `file:${customDbPath}`

if (!isRemoteDb) {
  process.env.DATABASE_URL = dbUrl
}

// 1. Raw client used for seeds, migrations, and applying sync data without loop feedbacks
export const rawDb =
  (globalThis as any).prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.DEBUG_PRISMA ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') (globalThis as any).prisma = rawDb

// Helper to get camelCase model name for client property access
function getModelClient(modelName: string) {
  const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1)
  return (rawDb as any)[camelModel]
}

// Helper to log changes to ChangeLog using rawDb (to prevent recursive loops)
async function logChange(modelName: string, recordId: string, operation: string, data: any) {
  // Prevent logging ChangeLog and SyncStatus operations
  if (modelName === 'ChangeLog' || modelName === 'SyncStatus') return

  const nodeId = process.env.NODE_ID || 'local'
  try {
    await rawDb.changeLog.create({
      data: {
        tableName: modelName,
        recordId,
        operation,
        data: data ? JSON.stringify(data) : '',
        sourceNodeId: nodeId,
        synced: false
      }
    })

    // Auto-trigger cloud sync to Firebase API for all new/updated records
    if (data && (operation === 'CREATE' || operation === 'UPDATE')) {
      import('@/lib/firebase-realtime').then(m => m.syncRecordToFirebase(modelName, data)).catch(() => {});
    }
    if (process.env.VERCEL || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      import('@/lib/firebase-sync').then(m => m.syncDatabaseToFirebase()).catch(() => {});
    }
  } catch (err) {
    console.error(`Error logging change for ${modelName}:`, err)
  }
}

// 2. Extended client for normal application use (automatically logs mutations in background)
export const db = rawDb.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args)
        if (result && result.id) {
          logChange(model, result.id, 'CREATE', result).catch(() => {})
        }
        return result
      },
      async update({ model, args, query }) {
        const result = await query(args)
        if (result && result.id) {
          logChange(model, result.id, 'UPDATE', result).catch(() => {})
        }
        return result
      },
      async delete({ model, args, query }) {
        const result = await query(args)
        const recordId = result?.id || args?.where?.id
        if (recordId) {
          logChange(model, recordId, 'DELETE', null).catch(() => {})
        }
        return result
      },
      async updateMany({ model, args, query }) {
        const result = await query(args)
        setTimeout(async () => {
          try {
            const modelClient = getModelClient(model)
            if (!modelClient) return
            const affected = await modelClient.findMany({
              where: args.where,
              select: { id: true }
            })
            for (const record of affected) {
              logChange(model, record.id, 'UPDATE', args.data).catch(() => {})
            }
          } catch {}
        }, 0)
        return result
      },
      async deleteMany({ model, args, query }) {
        const result = await query(args)
        return result
      }
    }
  }
})