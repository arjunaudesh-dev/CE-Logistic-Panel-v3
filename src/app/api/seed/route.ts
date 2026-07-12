import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Seeds the database with realistic dockyard sample data
export async function POST() {
  try {
    // Clean slate
    await db.dailyCollection.deleteMany();
    await db.partSupplyEntry.deleteMany();
    await db.partSupplyOrder.deleteMany();
    await db.collectionItem.deleteMany();
    await db.discontinuedItem.deleteMany();
    await db.rateContract.deleteMany();
    await db.storeItem.deleteMany();
    await db.storeZone.deleteMany();
    await db.procurementLog.deleteMany();
    await db.procurementFile.deleteMany();
    await db.fileLog.deleteMany();
    await db.projectFile.deleteMany();
    await db.allocation.deleteMany();
    await db.project.deleteMany();

    // ── Projects ──
    const p1 = await db.project.create({
      data: {
        name: "Dockyard Refit 2025 — Ship A",
        voteNumber: "V-2025-001",
        voteAllocation: 85000000,
        committed: 42000000,
        actualSpent: 18500000,
        startDate: "2025-01-15",
        endDate: "2025-12-20",
        department: "Engineering",
        projectOfficer: "Cdr. R. Perera",
        status: "Active",
        description: "Annual refit of Ship A hull and propulsion systems.",
      },
    });
    const p2 = await db.project.create({
      data: {
        name: "New Jetty Construction",
        voteNumber: "V-2025-002",
        voteAllocation: 120000000,
        committed: 67000000,
        actualSpent: 51000000,
        startDate: "2024-08-01",
        endDate: "2026-03-30",
        department: "Civil Works",
        projectOfficer: "Lt. M. Fernando",
        status: "Active",
        description: "Construction of reinforced concrete jetty and approaches.",
      },
    });
    const p3 = await db.project.create({
      data: {
        name: "Workshop Modernization",
        voteNumber: "V-2025-003",
        voteAllocation: 35000000,
        committed: 12000000,
        actualSpent: 4600000,
        startDate: "2025-03-01",
        endDate: "2025-11-30",
        department: "Workshop",
        projectOfficer: "WO K. Silva",
        status: "On Hold",
        description: "Upgrade of workshop machinery and ventilation.",
      },
    });

    // ── Project files (Processing File Register) ──
    const fileDefs = [
      [p1.id, "PR-2025-001", "BMS-220", "Centrifugal Pump 15kW", "NOS", 4, 385000, "Marine Pumps Ltd", "Order Placed", "BMS"],
      [p1.id, "PR-2025-002", "PL-118", "GI Pipe 50mm", "MTR", 120, 4200, "Steel Centre", "Items Received", "Plumbing"],
      [p1.id, "PR-2025-003", "MT-045", "Mild Steel Plate 6mm", "KG", 850, 245, "Ceylon Steel", "QC Pending", "Metal"],
      [p1.id, "PR-2025-004", "EL-301", "LED Flood Light 200W", "NOS", 30, 18500, "Electro Lanka", "PO Placed", "Electrical"],
      [p1.id, "PR-2025-005", "PT-077", "Epoxy Primer Grey", "LTR", 80, 3200, "Asian Paints", "Awaiting Payment", "Paint"],
      [p2.id, "PR-2025-010", "MT-110", "TMT Bars 16mm", "KG", 5200, 168, "Steel Centre", "Part Supply", "Metal"],
      [p2.id, "PR-2025-011", "GN-205", "Portland Cement 50kg", "BAG", 400, 1450, "Lanka Cement", "Items Dispatched", "General"],
      [p2.id, "PR-2025-012", "TL-090", "Concrete Vibrator", "NOS", 2, 145000, "Tools & Co", "Tender Called", "Tools"],
      [p3.id, "PR-2025-020", "AL-015", "Aluminium Sheet 2mm", "SHT", 25, 12500, "Alu Traders", "PR Raised", "Aluminium"],
      [p3.id, "PR-2025-021", "LO-008", "Hydraulic Oil ISO 68", "LTR", 200, 1850, "Lubricant Hub", "GS Approval", "Lubricant Oil"],
    ] as const;

    for (const f of fileDefs) {
      const fileCost = (f[5] as number) * (f[6] as number);
      await db.projectFile.create({
        data: {
          projectId: f[0] as string,
          prNumber: f[1] as string,
          itemCode: f[2] as string,
          itemName: f[3] as string,
          unit: f[4] as string,
          qty: f[5] as number,
          unitPrice: f[6] as number,
          fileCost,
          supplier: f[7] as string,
          presentPosition: f[8] as string,
          fileCategory: f[9] as string,
          createdBy: "System Seed",
          authorizedBy: "Cdr. R. Perera",
        },
      });
    }

    // ── Allocations ──
    await db.allocation.createMany({
      data: [
        { projectId: p1.id, date: "2025-01-20", description: "Initial commitment - pumps", amount: 1540000, type: "Commitment", authorizedBy: "Cdr. R. Perera" },
        { projectId: p1.id, date: "2025-02-05", description: "Pipes & fittings", amount: 504000, type: "Actual", authorizedBy: "Lt. M. Fernando" },
        { projectId: p2.id, date: "2025-01-10", description: "Steel reinforcement", amount: 873600, type: "Actual", authorizedBy: "Lt. M. Fernando" },
        { projectId: p2.id, date: "2025-02-15", description: "Cement supply", amount: 580000, type: "Commitment", authorizedBy: "WO K. Silva" },
      ],
    });

    // ── Procurement files ──
    const procDefs = [
      ["PR-2025-001", "BMS-220", "Centrifugal Pump 15kW", "NOS", 4, 385000, "Marine Pumps Ltd", "Order Placed", "BMS", p1.name, p1.voteNumber],
      ["PR-2025-010", "MT-110", "TMT Bars 16mm", "KG", 5200, 168, "Steel Centre", "Part Supply", "Metal", p2.name, p2.voteNumber],
      ["PR-2025-011", "GN-205", "Portland Cement 50kg", "BAG", 400, 1450, "Lanka Cement", "Items Dispatched", "General", p2.name, p2.voteNumber],
      ["PR-2025-030", "EL-410", "Cable 3-Core 25sqmm", "MTR", 600, 980, "Cables Inc", "Tender Called", "Electrical", "", ""],
      ["PR-2025-031", "PT-099", "Marine Paint Red Oxide", "LTR", 150, 4100, "Asian Paints", " quotation Received", "Paint", p1.name, p1.voteNumber],
      ["PR-2025-032", "TL-022", "Hydraulic Jack 20T", "NOS", 3, 89000, "Tools & Co", "Items Received", "Tools", p3.name, p3.voteNumber],
    ] as const;

    for (const f of procDefs) {
      await db.procurementFile.create({
        data: {
          prNumber: f[0] as string,
          itemCode: f[1] as string,
          itemName: f[2] as string,
          unit: f[3] as string,
          qty: f[4] as number,
          unitPrice: f[5] as number,
          fileCost: (f[4] as number) * (f[5] as number),
          supplier: f[6] as string,
          presentPosition: f[7] as string,
          fileCategory: f[8] as string,
          projectName: (f[9] as string) || null,
          voteNumber: (f[10] as string) || null,
          createdBy: "System Seed",
        },
      });
    }

    // ── Store Zones ──
    const zoneDefs: [string, string][] = [
      ["Zone A", "Zone"], ["Zone B", "Zone"], ["Zone C", "Zone"],
      ["Zone D", "Zone"], ["Ready-Use Stores", "Ready-Use"],
      ["Balance Stores", "Balance"], ["Project Stores", "Project"],
    ];
    for (const z of zoneDefs) {
      await db.storeZone.create({ data: { name: z[0], type: z[1] } });
    }

    // ── Store Items ──
    const itemDefs = [
      ["Centrifugal Pump Seal Kit", "BMS", "SET", 12, 8500, "Zone A", "Marine Pumps Ltd", "BMS-220-SK", 5],
      ["GI Elbow 50mm", "Plumbing", "NOS", 240, 320, "Zone A", "Steel Centre", "PL-118-E", 100],
      ["Mild Steel Plate 6mm", "Metal", "KG", 1200, 245, "Zone B", "Ceylon Steel", "MT-045", 500],
      ["LED Flood Light 200W", "Electrical", "NOS", 6, 18500, "Zone C", "Electro Lanka", "EL-301", 10],
      ["Epoxy Primer Grey", "Paint", "LTR", 18, 3200, "Zone D", "Asian Paints", "PT-077", 20],
      ["TMT Bar 16mm", "Metal", "KG", 3200, 168, "Zone B", "Steel Centre", "MT-110", 2000],
      ["Portland Cement 50kg", "General", "BAG", 45, 1450, "Project Stores", "Lanka Cement", "GN-205", 50],
      ["Concrete Vibrator Needle", "Tools", "NOS", 2, 18500, "Zone C", "Tools & Co", "TL-090-N", 1],
      ["Aluminium Sheet 2mm", "Aluminium", "SHT", 8, 12500, "Zone D", "Alu Traders", "AL-015", 5],
      ["Hydraulic Oil ISO 68", "Lubricant Oil", "LTR", 60, 1850, "Zone A", "Lubricant Hub", "LO-008", 40],
      ["Welding Rod 3.2mm", "Metal", "KG", 35, 980, "Zone B", "Weld Mart", "MT-201", 20],
      ["Cable Tie 200mm", "Electrical", "NOS", 500, 12, "Zone C", "Electro Lanka", "EL-512", 200],
      ["Bearing 6204 ZZ", "BMS", "NOS", 3, 1850, "Zone A", "Bearing House", "BMS-6204", 5],
      ["Paint Brush 50mm", "Paint", "NOS", 0, 280, "Zone D", "Asian Paints", "PT-BR50", 10],
      ["Hand Gloves Leather", "General", "PR", 120, 450, "Ready-Use Stores", "Safety First", "GN-GLV", 50],
      ["Grinding Wheel 100mm", "Tools", "NOS", 4, 380, "Zone C", "Tools & Co", "TL-GW100", 10],
    ] as const;

    for (const it of itemDefs) {
      await db.storeItem.create({
        data: {
          description: it[0] as string,
          category: it[1] as string,
          unit: it[2] as string,
          qty: it[3] as number,
          unitCost: it[4] as number,
          totalCost: (it[3] as number) * (it[4] as number),
          location: it[5] as string,
          minStock: it[8] as number,
          maxStock: (it[8] as number) * 4,
          supplier: it[6] as string,
          itemCode: it[7] as string,
          zoneName: it[5] as string,
          lastMovement: new Date().toISOString().slice(0, 10),
        },
      });
    }

    // Recompute zone aggregates
    const zones = await db.storeZone.findMany();
    for (const z of zones) {
      const items = await db.storeItem.findMany({ where: { zoneName: z.name } });
      await db.storeZone.update({
        where: { id: z.id },
        data: {
          totalValue: items.reduce((s, i) => s + i.totalCost, 0),
          itemCount: items.length,
          lowStockCount: items.filter((i) => i.minStock > 0 && i.qty <= i.minStock).length,
        },
      });
    }

    // ── Rate Contracts ──
    const rcDefs = [
      ["BMS-220", "Centrifugal Pump 15kW", "NOS", 385000, "Marine Pumps Ltd", "2025", "BMS"],
      ["BMS-220", "Centrifugal Pump 15kW", "NOS", 372000, "Marine Pumps Ltd", "2024", "BMS"],
      ["MT-045", "Mild Steel Plate 6mm", "KG", 245, "Ceylon Steel", "2025", "Metal"],
      ["MT-045", "Mild Steel Plate 6mm", "KG", 232, "Ceylon Steel", "2024", "Metal"],
      ["EL-301", "LED Flood Light 200W", "NOS", 18500, "Electro Lanka", "2025", "Electrical"],
      ["PT-077", "Epoxy Primer Grey", "LTR", 3200, "Asian Paints", "2025", "Paint"],
      ["PL-118", "GI Pipe 50mm", "MTR", 4200, "Steel Centre", "2025", "Plumbing"],
      ["LO-008", "Hydraulic Oil ISO 68", "LTR", 1850, "Lubricant Hub", "2025", "Lubricant Oil"],
    ] as const;
    for (const r of rcDefs) {
      await db.rateContract.create({
        data: {
          itemCode: r[0] as string,
          description: r[1] as string,
          unit: r[2] as string,
          rcPrice: r[3] as number,
          supplier: r[4] as string,
          rcYear: r[5] as string,
          category: r[6] as string,
          validFrom: `${r[5]}-01-01`,
          validUntil: `${r[5]}-12-31`,
        },
      });
    }

    // ── Discontinued ──
    await db.discontinuedItem.createMany({
      data: [
        { itemCode: "OLD-001", description: "Mercury Switch 10A", unit: "NOS", lastRCPrice: 1200, lastRCYear: "2023", discontinuedDate: "2024-06-15", reason: "Banned hazardous material", alternatives: "SSR-10A" },
        { itemCode: "OLD-002", description: "Asbestos Gasket Sheet", unit: "SHT", lastRCPrice: 3400, lastRCYear: "2022", discontinuedDate: "2023-12-01", reason: "Health hazard regulation", alternatives: "NON-ASB-GSK" },
      ],
    });

    // ── Collection ──
    await db.collectionItem.createMany({
      data: [
        { name: "Centrifugal Pump 15kW", expectedQty: 4, status: "In Progress", dueDate: "2025-07-15", supplier: "Marine Pumps Ltd" },
        { name: "LED Flood Light 200W", expectedQty: 30, status: "Pending", dueDate: "2025-07-20", supplier: "Electro Lanka" },
        { name: "Hydraulic Jack 20T", expectedQty: 3, status: "Collected", dueDate: "2025-06-30", supplier: "Tools & Co" },
      ],
    });

    // Part supply order for TMT bars
    const ps = await db.partSupplyOrder.create({
      data: {
        itemName: "TMT Bars 16mm",
        orderedQty: 5200,
        receivedQty: 2400,
        balance: 2800,
        startDate: "2025-06-01",
        expectedEndDate: "2025-07-15",
        status: "Active",
        supplier: "Steel Centre",
      },
    });
    await db.partSupplyEntry.createMany({
      data: [
        { orderId: ps.id, srNo: 1, date: "2025-06-02", vehicleNumber: "NB-4521", qty: 1200, qcCheckedBy: "PO Bandara", sailorCount: 4, driverName: "S. Perera", driverLicense: "B1234567", driverPhone: "0771234567", cumulativeBalance: 1200 },
        { orderId: ps.id, srNo: 2, date: "2025-06-09", vehicleNumber: "NB-8832", qty: 1200, qcCheckedBy: "PO Bandara", sailorCount: 4, driverName: "K. Nimal", driverLicense: "B7654321", driverPhone: "0779876543", cumulativeBalance: 2400 },
      ],
    });

    // Daily collection entries
    const today = new Date().toISOString().slice(0, 10);
    await db.dailyCollection.createMany({
      data: [
        { date: today, itemName: "Hydraulic Jack 20T", qty: 3, receivedFrom: "Tools & Co", recordedBy: "Clerk A" },
        { date: today, itemName: "Bearing 6204 ZZ", qty: 10, receivedFrom: "Bearing House", recordedBy: "Clerk B" },
        { date: "2025-06-09", itemName: "TMT Bars 16mm", qty: 1200, receivedFrom: "Steel Centre", recordedBy: "Clerk A" },
      ],
    });

    // Update projects with new fields (benefactor, reference, EDC)
    await db.project.update({ where: { id: p1.id }, data: { benefactor: "Engineering Dept", reference: "AOR", endDate: "2025-12-20" } });
    await db.project.update({ where: { id: p2.id }, data: { benefactor: "Civil Works Dept", reference: "Work Order", endDate: "2026-03-30" } });
    await db.project.update({ where: { id: p3.id }, data: { benefactor: "Workshop Dept", reference: "Job Order", endDate: "2025-11-30" } });

    // ── Sample Estimate (Step 1 draft + processed) ──
    const est = await db.estimate.create({
      data: { projectId: p1.id, name: "Refit Material Estimate - Q3", status: "Processed", processedAt: new Date() },
    });
    const estItems = [
      ["Centrifugal Pump 15kW", 4, "NOS", 385000],
      ["Mild Steel Plate 6mm", 1200, "KG", 245],
      ["LED Flood Light 200W", 20, "NOS", 18500],
      ["Epoxy Primer Grey", 60, "LTR", 3200],
      ["GI Pipe 50mm", 80, "MTR", 4200],
      ["Hydraulic Oil ISO 68", 150, "LTR", 1850],
    ] as const;
    for (let i = 0; i < estItems.length; i++) {
      const it = estItems[i];
      const isRC = ["BMS-220", "MT-045", "EL-301", "PT-077", "PL-118", "LO-008"][i] !== undefined;
      const code = ["BMS-220", "MT-045", "EL-301", "PT-077", "PL-118", "LO-008"][i];
      const rcRate = [385000, 245, 18500, 3200, 4200, 1850][i];
      await db.estimateItem.create({
        data: {
          estimateId: est.id,
          srNo: i + 1,
          itemName: it[0] as string,
          itemCode: code,
          qty: it[1] as number,
          unit: it[2] as string,
          estimateCost: (it[1] as number) * (it[3] as number),
          approxCost: isRC ? rcRate * (it[1] as number) : (it[1] as number) * (it[3] as number),
          isRC,
          rcNumber: isRC ? "2025" : null,
          rcRate: isRC ? rcRate : 0,
          rcSupplier: isRC ? ["Marine Pumps Ltd", "Ceylon Steel", "Electro Lanka", "Asian Paints", "Steel Centre", "Lubricant Hub"][i] : null,
          lastPurchasePrice: isRC ? rcRate : (it[3] as number),
          availableStock: [12, 1200, 6, 18, 240, 60][i],
          stockLocation: ["Zone A", "Zone B", "Zone C", "Zone D", "Zone A", "Zone A"][i],
          nonMovingStock: i === 5 ? 60 : 0,
          status: i < 2 ? "Initiated" : "Pending",
          prNumber: i < 2 ? ["PR-2025-001", "PR-2025-003"][i] : null,
          fileNumber: i < 2 ? [`FILE/2025-01-15`, `FILE/2025-01-16`][i] : null,
        },
      });
    }

    // ── Sample Earmarked Items ──
    await db.earmarkedItem.createMany({
      data: [
        { itemDescription: "TMT Bars 16mm", itemCode: "MT-110", projectId: p2.id, projectName: p2.name, qty: 500, unit: "KG", authority: "Lt. M. Fernando", remarks: "Earmarked for jetty slab pending PR" },
        { itemDescription: "Portland Cement 50kg", itemCode: "GN-205", projectId: p2.id, projectName: p2.name, qty: 50, unit: "BAG", authority: "WO K. Silva", remarks: "Reserved for urgent patch work" },
      ],
    });

    // ── Sample QC Inspections ──
    await db.qCInspection.createMany({
      data: [
        { refType: "daily", refId: "seed-1", itemName: "Hydraulic Jack 20T", supplier: "Tools & Co", qty: 3, qcLevel: "Good", qcOfficer: "PO Bandara", qcOfficerDetails: "QC Bay 2", remarks: "Functional test passed" },
        { refType: "partsupply", refId: "seed-ps-1", itemName: "TMT Bars 16mm", supplier: "Steel Centre", qty: 1200, qcLevel: "Satisfactory", qcOfficer: "LS Silva", qcOfficerDetails: "QC Bay 1", remarks: "Tensile test within spec" },
        { refType: "daily", refId: "seed-2", itemName: "Bearing 6204 ZZ", supplier: "Bearing House", qty: 10, qcLevel: "Fail", qcOfficer: "PO Bandara", qcOfficerDetails: "QC Bay 2", remarks: "2 units pitted; rejected batch" },
      ],
    });

    return NextResponse.json({ ok: true, message: "Seed data created" });
  } catch (e) {
    console.error("seed error", e);
    return NextResponse.json(
      { error: "Seed failed: " + (e as Error).message },
      { status: 500 }
    );
  }
}
