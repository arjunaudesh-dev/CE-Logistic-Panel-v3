import mysql, { Pool, RowDataPacket } from "mysql2/promise";
import { rawDb } from "@/lib/db";

// Configuration from environment variables
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "ncw_ps_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
};

let pool: Pool | null = null;

export function getMysqlPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(MYSQL_CONFIG);
  }
  return pool;
}

export interface MysqlHealthResult {
  connected: boolean;
  latencyMs: number;
  database: string;
  host: string;
  tableCounts: {
    users: number;
    work_orders: number;
    inventory: number;
    locations: number;
  };
  error?: string;
}

/**
 * Checks MySQL connection and measures response latency.
 */
export async function getMysqlHealth(): Promise<MysqlHealthResult> {
  const start = Date.now();
  try {
    const p = getMysqlPool();
    const conn = await p.getConnection();

    try {
      // Prepared queries for safety
      const [userRows] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) as cnt FROM users");
      const [woRows] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) as cnt FROM work_orders");
      const [invRows] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) as cnt FROM inventory");
      const [locRows] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) as cnt FROM locations");

      const latencyMs = Date.now() - start;

      return {
        connected: true,
        latencyMs,
        database: MYSQL_CONFIG.database,
        host: MYSQL_CONFIG.host,
        tableCounts: {
          users: Number(userRows[0]?.cnt || 0),
          work_orders: Number(woRows[0]?.cnt || 0),
          inventory: Number(invRows[0]?.cnt || 0),
          locations: Number(locRows[0]?.cnt || 0),
        },
      };
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      database: MYSQL_CONFIG.database,
      host: MYSQL_CONFIG.host,
      tableCounts: { users: 0, work_orders: 0, inventory: 0, locations: 0 },
      error: err.message,
    };
  }
}

/**
 * Imports the 681 active naval sailors & officers from ncw_ps_db.users
 * directly into the Logistics Stakeholder directory.
 */
export async function importSailorsFromMysql() {
  const p = getMysqlPool();
  const conn = await p.getConnection();

  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, official_number, name, rank, trade, category, zone_assigned, role, contact_number, email, status FROM users"
    );

    let importedCount = 0;
    let updatedCount = 0;

    for (const u of rows) {
      const svcNumber = (u.official_number || "").trim();
      const name = (u.name || "").trim();
      if (!svcNumber && !name) continue;

      // Determine category (Officer vs Sailor)
      const rankUpper = (u.rank || "").toUpperCase();
      const isOfficer =
        rankUpper.includes("CDR") ||
        rankUpper.includes("CAPT") ||
        rankUpper.includes("LT") ||
        rankUpper.includes("COMMODORE") ||
        rankUpper.includes("ADMIRAL") ||
        u.role === "Command" ||
        u.role === "OIC";

      const category = isOfficer ? "Officer" : "Sailor";
      const availability =
        u.status === "Active"
          ? "Available"
          : u.status === "Leave"
          ? "On Leave"
          : u.status === "Sick"
          ? "Off Duty"
          : "Available";

      const appointment = u.trade
        ? `${u.trade} (${u.category || "Regular"})`
        : u.role || "Civil Works";

      // Look up existing stakeholder by svcNumber or exact name
      const existing = await rawDb.stakeholder.findFirst({
        where: {
          OR: [
            svcNumber ? { svcNumber } : { id: "__none__" },
            { name },
          ],
        },
      });

      if (existing) {
        await rawDb.stakeholder.update({
          where: { id: existing.id },
          data: {
            svcNumber: svcNumber || existing.svcNumber,
            rankOrRate: u.rank || existing.rankOrRate,
            category,
            department: "CE",
            appointment: appointment || existing.appointment,
            telephone: u.contact_number || existing.telephone,
            email: u.email || existing.email,
            availability,
          },
        });
        updatedCount++;
      } else {
        await rawDb.stakeholder.create({
          data: {
            name,
            svcNumber,
            rankOrRate: u.rank || "",
            category,
            department: "CE",
            appointment,
            telephone: u.contact_number || "",
            email: u.email || "",
            availability,
            role: category,
          },
        });
        importedCount++;
      }
    }

    return {
      success: true,
      totalFromMysql: rows.length,
      importedCount,
      updatedCount,
    };
  } finally {
    conn.release();
  }
}

/**
 * Imports active work orders from ncw_ps_db.work_orders into Logistics Projects
 * so civil engineering tasks appear inside the Logistics File & Vote management system.
 */
export async function importWorkOrdersFromMysql() {
  const p = getMysqlPool();
  const conn = await p.getConnection();

  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, zone_id, type, reference_no, reference_type, description, status, priority, budget_allocation, progress_percentage FROM work_orders LIMIT 100"
    );

    let created = 0;
    let existingCount = 0;

    for (const wo of rows) {
      const refNo = wo.reference_no || `WO-${wo.id}`;
      const projectName = (wo.description || `Civil Job #${wo.id}`).substring(0, 180);

      const existing = await rawDb.project.findFirst({
        where: {
          OR: [{ reference: refNo }, { name: projectName }],
        },
      });

      if (existing) {
        existingCount++;
        continue;
      }

      await rawDb.project.create({
        data: {
          name: projectName,
          reference: refNo,
          voteNumber: refNo,
          voteAllocation: Number(wo.budget_allocation || 0),
          actualSpent:
            Number(wo.budget_allocation || 0) *
            (Number(wo.progress_percentage || 0) / 100),
          benefactor: wo.zone_id || "Civil Works Zone",
          projectType: wo.type === "PROJECT" ? "New Construction" : "Maintenance",
          status:
            wo.status === "Active"
              ? "Active"
              : wo.status === "Completed"
              ? "Completed"
              : "Active",
          description: `Imported from CMSys V2 Work Order #${wo.id} (${wo.type || "JOB"}) - Priority: ${wo.priority || "Medium"}`,
        },
      });
      created++;
    }

    return {
      success: true,
      totalWorkOrders: rows.length,
      importedProjects: created,
      alreadyExisted: existingCount,
    };
  } finally {
    conn.release();
  }
}

/**
 * Synchronizes inventory items from ncw_ps_db.inventory into Logistics StoreItem.
 */
export async function syncInventoryFromMysql() {
  const p = getMysqlPool();
  const conn = await p.getConnection();

  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, category, description, deno, quantity, cost_per_unit, location, book_no, on_charge_ref FROM inventory"
    );

    let synced = 0;

    for (const inv of rows) {
      const desc = (inv.description || "").trim();
      if (!desc) continue;

      const zoneName = inv.location || "Zone Store";
      const qty = Number(inv.quantity || 0);
      const unitCost = Number(inv.cost_per_unit || 0);

      const existing = await rawDb.storeItem.findFirst({
        where: {
          description: desc,
          zoneName,
        },
      });

      if (existing) {
        await rawDb.storeItem.update({
          where: { id: existing.id },
          data: {
            qty,
            unitCost,
            totalCost: qty * unitCost,
            bookNo: inv.book_no || existing.bookNo,
            location: inv.location || existing.location,
          },
        });
      } else {
        await rawDb.storeItem.create({
          data: {
            description: desc,
            category: inv.category || "General",
            unit: inv.deno || "NOS",
            qty,
            unitCost,
            totalCost: qty * unitCost,
            zoneName,
            location: inv.location || "Store Shelf",
            bookNo: inv.book_no || "",
          },
        });
      }
      synced++;
    }

    return {
      success: true,
      totalInventory: rows.length,
      synced,
    };
  } finally {
    conn.release();
  }
}
