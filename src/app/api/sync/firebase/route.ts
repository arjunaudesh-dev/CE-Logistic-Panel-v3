import { NextResponse } from "next/server";
import { syncDatabaseToFirebase, syncStorageToFirebase } from "@/lib/firebase-sync";

export async function GET() {
  return handleFirebaseSync();
}

export async function POST() {
  return handleFirebaseSync();
}

async function handleFirebaseSync() {
  try {
    console.log("[Firebase Sync] Starting sync cycle...");
    
    // 1. Run database sync
    const dbResult = await syncDatabaseToFirebase();
    
    // 2. Run storage sync
    const storageResult = await syncStorageToFirebase();
    
    console.log("[Firebase Sync] Sync cycle finished successfully.");
    
    return NextResponse.json({
      success: true,
      stats: {
        db: dbResult,
        storage: storageResult
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Firebase Sync Error] Sync execution failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
