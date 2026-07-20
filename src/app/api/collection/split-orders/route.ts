import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let orders = await db.splitOrderHeader.findMany({
      include: {
        subs: {
          include: {
            entries: { orderBy: { srNo: "asc" } },
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
          unit: "BAGS",
          remarks: "Split delivery across two purchase orders",
          subs: {
            create: [
              {
                poNumber: "PO/2025/0001",
                supplier: "Tokyo Cement PLC",
                poQty: 20,
                unitPrice: 2450,
                totalPrice: 49000,
                entries: {
                  create: [
                    {
                      srNo: 1,
                      date: new Date().toISOString().slice(0, 10),
                      vehicleNumber: "WP CAB-1042",
                      qty: 10,
                      driverName: "K. Perera",
                      sentToQCI: false,
                    },
                  ],
                },
              },
              {
                poNumber: "PO/2025/0002",
                supplier: "Insee Cement (Siam City)",
                poQty: 10,
                unitPrice: 2500,
                totalPrice: 25000,
                entries: {
                  create: [
                    {
                      srNo: 1,
                      date: new Date().toISOString().slice(0, 10),
                      vehicleNumber: "WP GB-8821",
                      qty: 5,
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
          subs: {
            include: {
              entries: { orderBy: { srNo: "asc" } },
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
    const { fileNumber, itemName, totalQty, unit, remarks, subs } = body;

    const created = await db.splitOrderHeader.create({
      data: {
        fileNumber: fileNumber?.trim() || "FILE/2025-SPLIT",
        itemName: itemName?.trim() || "Item",
        totalQty: Number(totalQty) || 0,
        unit: unit || "NOS",
        remarks: remarks || null,
        subs: {
          create: (subs || []).map((s: any) => ({
            poNumber: s.poNumber,
            supplier: s.supplier || null,
            poQty: Number(s.poQty) || 0,
            unitPrice: Number(s.unitPrice) || 0,
            totalPrice: (Number(s.poQty) || 0) * (Number(s.unitPrice) || 0),
          })),
        },
      },
      include: {
        subs: {
          include: {
            entries: { orderBy: { srNo: "asc" } },
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
