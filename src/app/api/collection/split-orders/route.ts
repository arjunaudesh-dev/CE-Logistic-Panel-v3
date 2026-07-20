import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let orders = await db.splitOrderHeader.findMany({
      include: {
        splits: {
          include: {
            entries: { orderBy: { createdAt: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Seed sample split order if none exists
    if (orders.length === 0) {
      const sample = await db.splitOrderHeader.create({
        data: {
          fileNumber: "FILE/2025-004",
          itemName: "Portland Cement (50kg Bag)",
          totalQty: 30,
          supplier: "Tokyo / Insee Cement",
          splits: {
            create: [
              {
                poNumber: "PO/2025/0001",
                allocatedQty: 20,
                receivedQty: 10,
                entries: {
                  create: [
                    {
                      date: new Date().toISOString().slice(0, 10),
                      receivedQty: 10,
                      vehicleType: "Civil",
                      vehicleNumber: "WP CAB-1042",
                      driverName: "K. Perera",
                      sentToQCI: false,
                    },
                  ],
                },
              },
              {
                poNumber: "PO/2025/0002",
                allocatedQty: 10,
                receivedQty: 5,
                entries: {
                  create: [
                    {
                      date: new Date().toISOString().slice(0, 10),
                      receivedQty: 5,
                      vehicleType: "Civil",
                      vehicleNumber: "WP GB-8821",
                      driverName: "M. Silva",
                      sentToQCI: false,
                    },
                  ],
                },
              },
            ],
          },
        },
        include: {
          splits: {
            include: {
              entries: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      });
      orders = [sample];
    }

    return NextResponse.json(orders);
  } catch (e) {
    console.error("split-orders GET error", e);
    return NextResponse.json({ error: "Failed to fetch split orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileNumber, itemName, totalQty, supplier, splits } = body;

    const created = await db.splitOrderHeader.create({
      data: {
        fileNumber: fileNumber?.trim() || "FILE/2025-SPLIT",
        itemName: itemName?.trim() || "Item",
        totalQty: Number(totalQty) || 0,
        supplier: supplier || null,
        splits: {
          create: (splits || []).map((s: any) => ({
            poNumber: s.poNumber,
            allocatedQty: Number(s.allocatedQty || s.poQty) || 0,
            receivedQty: 0,
          })),
        },
      },
      include: {
        splits: {
          include: {
            entries: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("split-orders POST error", e);
    return NextResponse.json({ error: "Failed to create split order" }, { status: 500 });
  }
}
