import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const FIREBASE_WORK_ORDERS_URL = "https://ncw-ps-operations-default-rtdb.asia-southeast1.firebasedatabase.app/work_orders.json";

interface FirebaseWorkOrder {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  budget_allocation?: number;
  voteAllocation?: number;
  committed?: number;
  actualSpent?: number;
  startDate?: string;
  endDate?: string;
  department?: string;
  benefactor?: string;
  reference?: string;
  reference_no?: string;
  projectType?: string;
  financialMean?: string;
  projectOfficer?: string;
  incharge?: string;
  status?: string;
  zone_id?: string;
  created_at?: number;
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: "CMSys Project & Job sync is disabled for this system. Only Stock Inventory & Location are synchronized.",
  });
}

export async function GET() {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: "CMSys Project & Job sync is disabled for this system. Only Stock Inventory & Location are synchronized.",
  });
}

