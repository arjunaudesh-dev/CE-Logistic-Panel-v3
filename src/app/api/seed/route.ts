import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

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
    await db.estimateItem.deleteMany();
    await db.estimate.deleteMany();
    await db.earmarkedItem.deleteMany();
    await db.qCInspection.deleteMany();
    await db.supplierRating.deleteMany();
    await db.supplierNomination.deleteMany();
    await db.supplierContact.deleteMany();
    await db.supplier.deleteMany();
    await db.stakeholder.deleteMany();
    await db.itemMaster.deleteMany();
    await db.processStep.deleteMany();
    await db.processFlow.deleteMany();
    await db.areaStoreRecord.deleteMany();
    await db.userProfile.deleteMany();
    await db.storeSetting.deleteMany();
    await db.vote.deleteMany();
    await db.navyListImport.deleteMany();
    await db.project.deleteMany();

    // ── Projects (Real Vote Data) ──
    // VOTE 223-1-01-2104 — New Construction
    const p1 = await db.project.create({
      data: {
        name: "Construction of No. 03 Slipway Hangar at Naval Dockyard",
        voteNumber: "223-1-01-2104",
        voteAllocation: 85000000,
        committed: 42000000,
        actualSpent: 18500000,
        startDate: "2025-01-15",
        endDate: "2025-12-20",
        benefactor: "Engineering Dept",
        reference: "Vote 2104 - Allocation 2025",
        projectType: "New Construction",
        financialMean: "Vote",
        projectOfficer: "Cdr. R. Perera",
        status: "Active",
        description: "VOTE 223-1-01-2104 Item 01: Construction of No. 03 Slipway Hangar at Naval Dockyard.",
      },
    });
    const p2 = await db.project.create({
      data: {
        name: "Expansion of facilities around No. 03 Slipway at Naval Base Trincomalee (50m x 20m steel workshop)",
        voteNumber: "223-1-01-2104",
        voteAllocation: 45000000,
        committed: 18000000,
        actualSpent: 7200000,
        startDate: "2025-02-01",
        endDate: "2026-03-30",
        benefactor: "Civil Works Dept",
        reference: "Vote 2104 - Allocation 2025",
        projectType: "New Construction",
        financialMean: "Vote",
        projectOfficer: "Lt. M. Fernando",
        status: "Active",
        description: "VOTE 223-1-01-2104 Item 02: Expansion of facilities around No. 03 Slipway at Naval Base Trincomalee.",
      },
    });
    const p3 = await db.project.create({
      data: {
        name: "Construction of new security point in front of beach at SLNS Gotabaya",
        voteNumber: "223-1-01-2104",
        voteAllocation: 12000000,
        committed: 4500000,
        actualSpent: 1200000,
        startDate: "2025-03-01",
        endDate: "2025-11-30",
        benefactor: "Civil Works Dept",
        reference: "Vote 2104 - Allocation 2025",
        projectType: "New Construction",
        financialMean: "Vote",
        projectOfficer: "Lt. D. Rajapaksa",
        status: "Active",
        description: "VOTE 223-1-01-2104 Item 03: Construction of new security point at SLNS Gotabaya.",
      },
    });
    const p4 = await db.project.create({
      data: {
        name: "New Academy Complex Trincomalee – Logistic & Management School Building",
        voteNumber: "223-1-01-2104",
        voteAllocation: 150000000,
        committed: 35000000,
        actualSpent: 8200000,
        startDate: "2025-01-01",
        endDate: "2026-12-31",
        benefactor: "CE Dept",
        reference: "Vote 2104 - Allocation 2025",
        projectType: "New Construction",
        financialMean: "Vote",
        projectOfficer: "Capt. T. Jayasuriya",
        status: "Active",
        description: "VOTE 223-1-01-2104 Item 04: New Academy Complex Trincomalee.",
      },
    });
    // VOTE 223-1-01-2001 — Renovation
    const p5 = await db.project.create({
      data: {
        name: "Improvement of security fence at SLNS Kashyapa (No.01 to No.12 security points)",
        voteNumber: "223-1-01-2001",
        voteAllocation: 8500000,
        committed: 3200000,
        actualSpent: 1100000,
        startDate: "2025-04-01",
        endDate: "2025-10-30",
        benefactor: "CE Dept",
        reference: "Vote 2001 - Renovation 2025",
        projectType: "Renovation",
        financialMean: "Vote",
        projectOfficer: "Lt. N. Gunawardena",
        status: "Active",
        description: "VOTE 223-1-01-2001 Item 01.",
      },
    });
    const p6 = await db.project.create({
      data: {
        name: "Renovation of Marine Home building at SLNS Vidura",
        voteNumber: "223-1-01-2001",
        voteAllocation: 6500000,
        committed: 2100000,
        actualSpent: 680000,
        startDate: "2025-05-01",
        endDate: "2025-12-15",
        benefactor: "CE Dept",
        reference: "Vote 2001 - Renovation 2025",
        projectType: "Renovation",
        financialMean: "Vote",
        projectOfficer: "Lt. Cdr. A. Wickrama",
        status: "Active",
        description: "VOTE 223-1-01-2001 Item 02.",
      },
    });
    const p7 = await db.project.create({
      data: {
        name: "Renovation of Command Wardroom at SLN Dockyard (granite floor, Golden Loge rooftop, Commandant Chalet)",
        voteNumber: "223-1-01-2001",
        voteAllocation: 9800000,
        committed: 5400000,
        actualSpent: 2300000,
        startDate: "2025-03-15",
        endDate: "2025-11-30",
        benefactor: "CE Dept",
        reference: "Vote 2001 - Renovation 2025",
        projectType: "Renovation",
        financialMean: "Vote",
        projectOfficer: "Lt. Cdr. A. Wickrama",
        status: "Active",
        description: "VOTE 223-1-01-2001 Item 03.",
      },
    });
    // VOTE 223-1-01-2506 — Mixed
    const p8 = await db.project.create({
      data: {
        name: "Floating Dock at SLN Dockyard",
        voteNumber: "223-1-01-2506",
        voteAllocation: 200000000,
        committed: 45000000,
        actualSpent: 12000000,
        startDate: "2025-01-01",
        endDate: "2027-06-30",
        benefactor: "Engineering Dept",
        reference: "Vote 2506 - Capital 2025",
        projectType: "New Construction",
        financialMean: "Vote",
        projectOfficer: "Cdr. R. Perera",
        status: "Active",
        description: "VOTE 223-1-01-2506 Item 06: Floating Dock at SLN Dockyard.",
      },
    });
    // VOTE 223-1-01-1303 — Maintenance
    const p9 = await db.project.create({
      data: {
        name: "Maintenance work at ENA (1303)",
        voteNumber: "223-1-01-1303",
        voteAllocation: 18000000,
        committed: 6500000,
        actualSpent: 2400000,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        benefactor: "CE Dept",
        reference: "Vote 1303 - Maintenance 2025",
        projectType: "Maintenance",
        financialMean: "Vote",
        projectOfficer: "Lt. D. Rajapaksa",
        status: "Active",
        description: "VOTE 223-1-01-1303 Item 01: Maintenance work at ENA.",
      },
    });
    // NON-NAVAL — no vote, uses Malima Fund
    const p10 = await db.project.create({
      data: {
        name: "Renovation work of Sober Island Resort - Trincomalee",
        voteNumber: "NON-NAVAL",
        voteAllocation: 25000000,
        committed: 8500000,
        actualSpent: 3200000,
        startDate: "2025-04-01",
        endDate: "2025-12-30",
        benefactor: "Non-Public",
        reference: "Malima Fund Approval 2025",
        projectType: "Renovation",
        financialMean: "Malima Fund",
        projectOfficer: "Lt. N. Gunawardena",
        status: "Active",
        description: "NON-NAVAL: Renovation work of Sober Island Resort. Funded via Malima Fund (no government vote).",
      },
    });
    // VOTE 223-1-01-2103 — General Requirement (Equipment)
    const p11 = await db.project.create({
      data: {
        name: "Acquisition of plant machinery & equipment requirement for ENA - 2026",
        voteNumber: "223-1-01-2103",
        voteAllocation: 75000000,
        committed: 12000000,
        actualSpent: 0,
        startDate: "2025-07-01",
        endDate: "2026-06-30",
        benefactor: "Engineering Dept",
        reference: "Vote 2103 - Equipment 2026",
        projectType: "General Requirement",
        financialMean: "Vote",
        projectOfficer: "Cdr. R. Perera",
        status: "Active",
        description: "VOTE 223-1-01-2103: Acquisition of plant machinery & equipment for ENA 2026.",
      },
    });
    // CONTRACTUAL JOB ENA
    const p12 = await db.project.create({
      data: {
        name: "Contractual Job ENA",
        voteNumber: "CONTRACTUAL",
        voteAllocation: 55000000,
        committed: 15000000,
        actualSpent: 4500000,
        startDate: "2025-03-01",
        endDate: "2026-02-28",
        benefactor: "Contractual",
        reference: "ARO Contract - ENA 2025",
        projectType: "Contractual Job",
        financialMean: "Contractual",
        projectOfficer: "Capt. T. Jayasuriya",
        status: "Active",
        description: "CONTRACTUAL JOB ENA: ARO (Contractual) flow applies.",
      },
    });

    // ── Project files (Processing File Register) ──
    const fileDefs = [
      [p1.id, "PR-2025-001", "BMS-220", "Centrifugal Pump 15kW", "NOS", 4, 385000, "Marine Pumps Ltd", "Order Placed", "BMS", "FILE/2025-001", "PO Bandara", "Cdr. R. Perera"],
      [p1.id, "PR-2025-002", "PL-118", "GI Pipe 50mm", "MTR", 120, 4200, "Steel Centre", "Items Received", "Plumbing", "FILE/2025-002", "LS Silva", "Lt. M. Fernando"],
      [p1.id, "PR-2025-003", "MT-045", "Mild Steel Plate 6mm", "KG", 850, 245, "Ceylon Steel", "QC Pending", "Metal", "FILE/2025-003", "PO Bandara", "Lt. Cdr. K. Silva"],
      [p1.id, "PR-2025-004", "EL-301", "LED Flood Light 200W", "NOS", 30, 18500, "Electro Lanka", "PO Placed", "Electrical", null, "LS Silva", "Cdr. R. Perera"],
      [p1.id, "PR-2025-005", "PT-077", "Epoxy Primer Grey", "LTR", 80, 3200, "Asian Paints", "Awaiting Payment", "Paint", null, "PO Bandara", "Lt. M. Fernando"],
      [p2.id, "PR-2025-010", "MT-110", "TMT Bars 16mm", "KG", 5200, 168, "Steel Centre", "Part Supply", "Metal", "FILE/2025-010", "LS Silva", "Lt. M. Fernando"],
      [p8.id, "PR-2025-011", "GN-205", "Portland Cement 50kg", "BAG", 400, 1450, "Lanka Cement", "Items Dispatched", "General", "FILE/2025-011", "PO Bandara", "Cdr. R. Perera"],
      [p8.id, "PR-2025-012", "TL-090", "Concrete Vibrator", "NOS", 2, 145000, "Tools & Co", "Tender Called", "Tools", null, "LS Silva", "Cdr. R. Perera"],
      [p9.id, "PR-2025-020", "AL-015", "Aluminium Sheet 2mm", "SHT", 25, 12500, "Alu Traders", "PR Raised", "Aluminium", null, "PO Bandara", "Lt. D. Rajapaksa"],
      [p9.id, "PR-2025-021", "LO-008", "Hydraulic Oil ISO 68", "LTR", 200, 1850, "Lubricant Hub", "GS Approval", "Lubricant Oil", null, "LS Silva", "Lt. D. Rajapaksa"],
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
          fileNumber: (f[10] as string) || null,
          createdBy: f[11] as string,
          authorizedBy: f[12] as string,
          responsiblePerson: f[12] as string,
        },
      });
    }

    // ── Allocations ──
    await db.allocation.createMany({
      data: [
        { projectId: p1.id, date: "2025-01-20", description: "Initial commitment - pumps", amount: 1540000, type: "Commitment", authorizedBy: "Cdr. R. Perera" },
        { projectId: p1.id, date: "2025-02-05", description: "Pipes & fittings", amount: 504000, type: "Actual", authorizedBy: "Lt. M. Fernando" },
        { projectId: p2.id, date: "2025-01-10", description: "Steel reinforcement", amount: 873600, type: "Actual", authorizedBy: "Lt. M. Fernando" },
        { projectId: p8.id, date: "2025-02-15", description: "Cement supply", amount: 580000, type: "Commitment", authorizedBy: "Cdr. R. Perera" },
      ],
    });

    // ── Procurement files ──
    const procDefs = [
      ["PR-2025-001", "BMS-220", "Centrifugal Pump 15kW", "NOS", 4, 385000, "Marine Pumps Ltd", "Order Placed", "BMS", p1.name, p1.voteNumber],
      ["PR-2025-010", "MT-110", "TMT Bars 16mm", "KG", 5200, 168, "Steel Centre", "Part Supply", "Metal", p2.name, p2.voteNumber],
      ["PR-2025-011", "GN-205", "Portland Cement 50kg", "BAG", 400, 1450, "Lanka Cement", "Items Dispatched", "General", p8.name, p8.voteNumber],
      ["PR-2025-030", "EL-410", "Cable 3-Core 25sqmm", "MTR", 600, 980, "Cables Inc", "Tender Called", "Electrical", "", ""],
      ["PR-2025-031", "PT-099", "Marine Paint Red Oxide", "LTR", 150, 4100, "Asian Paints", " quotation Received", "Paint", p1.name, p1.voteNumber],
      ["PR-2025-032", "TL-022", "Hydraulic Jack 20T", "NOS", 3, 89000, "Tools & Co", "Items Received", "Tools", p9.name, p9.voteNumber],
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
        { itemDescription: "TMT Bars 16mm", itemCode: "MT-110", projectId: p2.id, projectName: p2.name, qty: 500, unit: "KG", authority: "Lt. M. Fernando", remarks: "Earmarked for slipway workshop pending PR" },
        { itemDescription: "Portland Cement 50kg", itemCode: "GN-205", projectId: p8.id, projectName: p8.name, qty: 50, unit: "BAG", authority: "Cdr. R. Perera", remarks: "Reserved for floating dock urgent work" },
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

    // ── Stakeholders (Officers & Sailors) ──
    await db.stakeholder.createMany({
      data: [
        // CSLOG dept
        { name: "Cdr. R. Perera", rankOrRate: "Commander", svcNumber: "SVC/1234", appointment: "CSLOG", department: "CSLOG", officeNumber: "Ext 2101", telephone: "011-2345678", whatsapp: "077-1234567", email: "rperera@navy.lk", availability: "Available", role: "Officer" },
        { name: "Lt. M. Fernando", rankOrRate: "Lieutenant", svcNumber: "SVC/2345", appointment: "CLOGD", department: "CSLOG", officeNumber: "Ext 2102", telephone: "011-2345679", whatsapp: "077-2345678", email: "mfernando@navy.lk", availability: "Available", role: "Officer" },
        { name: "Lt. Cdr. K. Silva", rankOrRate: "Lt. Commander", svcNumber: "SVC/3456", appointment: "ASO(E)", department: "CSLOG", officeNumber: "Ext 2103", telephone: "011-2345680", whatsapp: "077-3456789", email: "ksilva@navy.lk", availability: "On Leave", role: "Officer" },
        { name: "PO Bandara", rankOrRate: "Petty Officer", svcNumber: "SVC/5678", appointment: "APO(E)", department: "CSLOG", officeNumber: "Ext 2104", telephone: "011-2345681", whatsapp: "077-4567890", email: "pbandara@navy.lk", availability: "Available", role: "Sailor" },
        { name: "LS Silva", rankOrRate: "Leading Seaman", svcNumber: "SVC/6789", appointment: "AAPO(PT)", department: "CSLOG", officeNumber: "Ext 2105", telephone: "011-2345682", whatsapp: "077-5678901", email: "ssilva@navy.lk", availability: "Busy", role: "Sailor" },
        // CE dept
        { name: "Capt. T. Jayasuriya", rankOrRate: "Captain", svcNumber: "SVC/1111", appointment: "CCED(E)", department: "CE", officeNumber: "Ext 2201", telephone: "011-3456789", whatsapp: "077-1111111", email: "tjaya@navy.lk", availability: "Available", role: "Officer" },
        { name: "Lt. Cdr. A. Wickrama", rankOrRate: "Lt. Commander", svcNumber: "SVC/2222", appointment: "CCEO(E)", department: "CE", officeNumber: "Ext 2202", telephone: "011-3456790", whatsapp: "077-2222222", email: "awick@navy.lk", availability: "Available", role: "Officer" },
        { name: "Lt. D. Rajapaksa", rankOrRate: "Lieutenant", svcNumber: "SVC/3333", appointment: "SCE(M)", department: "CE", officeNumber: "Ext 2203", telephone: "011-3456791", whatsapp: "077-3333333", email: "draja@navy.lk", availability: "Off Duty", role: "Officer" },
        { name: "Lt. N. Gunawardena", rankOrRate: "Lieutenant", svcNumber: "SVC/4444", appointment: "SCE(P&P)", department: "CE", officeNumber: "Ext 2204", telephone: "011-3456792", whatsapp: "077-4444444", email: "nguna@navy.lk", availability: "Available", role: "Officer" },
        // Area Store sailors (CSLOG) — each linked to an area store location
        { name: "LS Perera", rankOrRate: "Leading Seaman", svcNumber: "SVC/8888", appointment: "APO(E)", department: "CSLOG", officeNumber: "Ext 2106", telephone: "011-2345683", whatsapp: "077-6678901", email: "lperera@navy.lk", availability: "Available", role: "Sailor" },
        { name: "AB Fernando", rankOrRate: "Able Seaman", svcNumber: "SVC/9999", appointment: "APO(E)", department: "CSLOG", officeNumber: "Ext 2107", telephone: "011-2345684", whatsapp: "077-7789012", email: "afernando@navy.lk", availability: "On Leave", role: "Sailor" },
        // Officers-in-Area (assigned to area stores)
        { name: "Lt. S. Wijesinghe", rankOrRate: "Lieutenant", svcNumber: "SVC/5555", appointment: "AOE", department: "CE", officeNumber: "Ext 2205", telephone: "011-3456793", whatsapp: "077-5555555", email: "swijeya@navy.lk", availability: "Available", role: "Officer" },
      ],
    });

    // Update stakeholders with category & seniority (new fields) — must run AFTER createMany above
    await db.stakeholder.updateMany({ where: { department: "CSLOG", role: "Officer" }, data: { category: "CSLOG Officer" } });
    await db.stakeholder.updateMany({ where: { department: "CSLOG", role: "Sailor" }, data: { category: "CSLOG Sailor" } });
    await db.stakeholder.updateMany({ where: { department: "CE", role: "Officer", appointment: { not: "AOE" } }, data: { category: "CCED Officer" } });
    await db.stakeholder.updateMany({ where: { department: "CE", role: "Sailor" }, data: { category: "CCED Sailor" } });
    await db.stakeholder.updateMany({ where: { appointment: "AOE" }, data: { category: "Officer-in-Area" } });
    // set seniority for officers (lower = more senior) — from Navy List
    await db.stakeholder.updateMany({ where: { appointment: "CCED(E)" }, data: { seniority: 1 } });
    await db.stakeholder.updateMany({ where: { appointment: "CSLOG" }, data: { seniority: 2 } });
    await db.stakeholder.updateMany({ where: { appointment: "CCEO(E)" }, data: { seniority: 3 } });
    await db.stakeholder.updateMany({ where: { appointment: "ASO(E)" }, data: { seniority: 4 } });
    await db.stakeholder.updateMany({ where: { appointment: "SCE(M)" }, data: { seniority: 5 } });
    await db.stakeholder.updateMany({ where: { appointment: "SCE(P&P)" }, data: { seniority: 6 } });
    await db.stakeholder.updateMany({ where: { appointment: "CLOGD" }, data: { seniority: 7 } });
    await db.stakeholder.updateMany({ where: { appointment: "AOE" }, data: { seniority: 8 } });
    // set area store locations for sailors (APO(E)→BMS, AAPO(PT)→General; distribute the extra sailors to other stores)
    await db.stakeholder.updateMany({ where: { appointment: "APO(E)", name: "PO Bandara" }, data: { areaStoreLocation: "BMS", subjectClerk: "BMS Clerk", ilmsCced: "ILMS CCED" } });
    await db.stakeholder.updateMany({ where: { appointment: "AAPO(PT)" }, data: { areaStoreLocation: "General", subjectClerk: "General Clerk", ilmsCced: "ILMS CCED" } });
    await db.stakeholder.updateMany({ where: { appointment: "APO(E)", name: "LS Perera" }, data: { areaStoreLocation: "Metal", subjectClerk: "Metal Clerk", ilmsCced: "ILMS CCED" } });
    await db.stakeholder.updateMany({ where: { appointment: "APO(E)", name: "AB Fernando" }, data: { areaStoreLocation: "Paint", subjectClerk: "Paint Clerk", ilmsCced: "ILMS CCED" } });
    // Officer-in-Area assigned to area store
    await db.stakeholder.updateMany({ where: { appointment: "AOE" }, data: { areaStoreLocation: "BMS", subjectClerk: "BMS Clerk", ilmsCced: "ILMS CCED" } });

    // ── Suppliers with contacts, nominations, ratings ──
    const sup1 = await db.supplier.create({
      data: {
        name: "Marine Pumps Ltd",
        contactPerson: "Mr. Sunil Perera",
        telephone: "011-2587411",
        whatsapp: "077-9988776",
        email: "sales@marinepumps.lk",
        address: "No 45, Industrial Zone, Colombo 10",
        contractDetails: "RC 2025 valid till 31 Dec 2025. Annual supply contract for BMS pumps.",
        registrationNo: "PV-2001-1234",
        vatNo: "VAT-1144556",
        bankDetails: "BOC Colombo - 0012003456789",
      },
    });
    await db.supplierContact.createMany({
      data: [
        { supplierId: sup1.id, name: "Sunil Perera", designation: "Sales Manager", telephone: "011-2587411", whatsapp: "077-9988776", email: "sunil@marinepumps.lk", isPrimary: true },
        { supplierId: sup1.id, name: "Nimal Silva", designation: "Service Engineer", telephone: "011-2587412", whatsapp: "077-9988777", email: "nimal@marinepumps.lk", isPrimary: false },
      ],
    });
    await db.supplierNomination.createMany({
      data: [
        { supplierId: sup1.id, itemCode: "BMS-220", itemName: "Centrifugal Pump 15kW", category: "BMS" },
        { supplierId: sup1.id, itemCode: "BMS-220-SK", itemName: "Centrifugal Pump Seal Kit", category: "BMS" },
        { supplierId: sup1.id, itemCode: "BMS-6204", itemName: "Bearing 6204 ZZ", category: "BMS" },
      ],
    });
    await db.supplierRating.create({
      data: { supplierId: sup1.id, qciScore: 5, loyalty: 4.5, professionalism: 5, activeEngagement: 4.5, values: 4.8, overallScore: 4.76, remarks: "Reliable supplier, consistent quality", ratedBy: "Cdr. R. Perera" },
    });

    const sup2 = await db.supplier.create({
      data: {
        name: "Steel Centre",
        contactPerson: "Mr. Rohan De Silva",
        telephone: "011-3698521",
        whatsapp: "071-5566778",
        email: "info@steelcentre.lk",
        address: "No 120, Steel City, Colombo 15",
        contractDetails: "RC 2025 for TMT bars & MS plates. Bulk supply agreement.",
        registrationNo: "PV-2002-5678",
        vatNo: "VAT-2233667",
        bankDetails: "Commercial Bank - 8001200345678",
      },
    });
    await db.supplierContact.createMany({
      data: [
        { supplierId: sup2.id, name: "Rohan De Silva", designation: "Director", telephone: "011-3698521", whatsapp: "071-5566778", email: "rohan@steelcentre.lk", isPrimary: true },
        { supplierId: sup2.id, name: "Chamara", designation: "Delivery Coordinator", telephone: "011-3698522", whatsapp: "071-5566779", email: "chamara@steelcentre.lk", isPrimary: false },
      ],
    });
    await db.supplierNomination.createMany({
      data: [
        { supplierId: sup2.id, itemCode: "MT-045", itemName: "Mild Steel Plate 6mm", category: "Metal" },
        { supplierId: sup2.id, itemCode: "MT-110", itemName: "TMT Bars 16mm", category: "Metal" },
        { supplierId: sup2.id, itemCode: "MT-201", itemName: "Welding Rod 3.2mm", category: "Metal" },
      ],
    });
    await db.supplierRating.create({
      data: { supplierId: sup2.id, qciScore: 3, loyalty: 4, professionalism: 3.5, activeEngagement: 4, values: 3.5, overallScore: 3.6, remarks: "Good but occasional delivery delays", ratedBy: "Lt. M. Fernando" },
    });

    const sup3 = await db.supplier.create({
      data: {
        name: "Tools & Co",
        contactPerson: "Mr. Kasun Jay",
        telephone: "011-4785963",
        whatsapp: "076-7788990",
        email: "sales@toolsco.lk",
        address: "No 78, Tools Street, Colombo 11",
        contractDetails: "Spot purchase supplier for hand tools.",
      },
    });
    await db.supplierContact.createMany({
      data: [
        { supplierId: sup3.id, name: "Kasun Jay", designation: "Proprietor", telephone: "011-4785963", whatsapp: "076-7788990", email: "kasun@toolsco.lk", isPrimary: true },
      ],
    });
    await db.supplierRating.create({
      data: { supplierId: sup3.id, qciScore: 4, loyalty: 3.5, professionalism: 4, activeEngagement: 3.5, values: 4, overallScore: 3.8, remarks: "Decent quality tools", ratedBy: "PO Bandara" },
    });

    const sup4 = await db.supplier.create({
      data: {
        name: "Bearing House",
        contactPerson: "Mr. Anura",
        telephone: "011-5823697",
        whatsapp: "075-6677889",
        email: "anura@bearinghouse.lk",
        address: "No 33, Bearing Lane, Colombo 02",
        contractDetails: "Supplier for bearings and power transmission items.",
      },
    });
    await db.supplierRating.create({
      data: { supplierId: sup4.id, qciScore: 1, loyalty: 2.5, professionalism: 2, activeEngagement: 2, values: 2, overallScore: 1.9, remarks: "Failed QC — pitted bearings. Under review.", ratedBy: "PO Bandara" },
    });

    // ── Item Master (consolidated catalogue) — includes deliberate duplicates ──
    await db.itemMaster.createMany({
      data: [
        { canonicalCode: "BMS-220", description: "Centrifugal Pump 15kW", category: "BMS", unit: "NOS", status: "Active" },
        // deliberate duplicate: same item, different code
        { canonicalCode: "BMS-220A", description: "Centrifugal Pump 15kW", category: "BMS", unit: "NOS", status: "Active" },
        { canonicalCode: "BMS-220-SK", description: "Centrifugal Pump Seal Kit", category: "BMS", unit: "SET", status: "Active" },
        { canonicalCode: "BMS-6204", description: "Bearing 6204 ZZ", category: "BMS", unit: "NOS", status: "Active" },
        { canonicalCode: "MT-045", description: "Mild Steel Plate 6mm", category: "Metal", unit: "KG", status: "Active" },
        // deliberate near-duplicate: different spelling
        { canonicalCode: "MT-045-PL", description: "M.S. Plate 6mm", category: "Metal", unit: "KG", status: "Active" },
        { canonicalCode: "MT-110", description: "TMT Bars 16mm", category: "Metal", unit: "KG", status: "Active" },
        { canonicalCode: "MT-201", description: "Welding Rod 3.2mm", category: "Metal", unit: "KG", status: "Active" },
        { canonicalCode: "EL-301", description: "LED Flood Light 200W", category: "Electrical", unit: "NOS", status: "Active" },
        { canonicalCode: "EL-512", description: "Cable Tie 200mm", category: "Electrical", unit: "NOS", status: "Active" },
        { canonicalCode: "PT-077", description: "Epoxy Primer Grey", category: "Paint", unit: "LTR", status: "Active" },
        { canonicalCode: "PL-118", description: "GI Pipe 50mm", category: "Plumbing", unit: "MTR", status: "Active" },
        // deliberate duplicate: same name different code
        { canonicalCode: "PL-118-A", description: "GI Pipe 50mm", category: "Plumbing", unit: "MTR", status: "Active" },
        { canonicalCode: "LO-008", description: "Hydraulic Oil ISO 68", category: "Lubricant Oil", unit: "LTR", status: "Active" },
        { canonicalCode: "AL-015", description: "Aluminium Sheet 2mm", category: "Aluminium", unit: "SHT", status: "Active" },
        { canonicalCode: "GN-205", description: "Portland Cement 50kg", category: "General", unit: "BAG", status: "Active" },
      ],
    });

    // ── Process Flows (RC, Non-Rate, ARO Contractual) with steps + financial delegation ──
    const flowRC = await db.processFlow.create({ data: { name: "RC", description: "Rate Contract procurement flow — items under active RC list" } });
    await db.processStep.createMany({
      data: [
        { flowId: flowRC.id, stepOrder: 1, positionName: "PR Raised", defaultResponsiblePerson: "APO(E) — PO Bandara", financialDelegationLevel: "—" },
        { flowId: flowRC.id, stepOrder: 2, positionName: "GS Approval", defaultResponsiblePerson: "GS Officer", financialDelegationLevel: "Up to Rs. 500,000 — Cdr" },
        { flowId: flowRC.id, stepOrder: 3, positionName: "RC Verification", defaultResponsiblePerson: "ASO(E) — Lt. Cdr. K. Silva", financialDelegationLevel: "Up to Rs. 500,000 — Cdr" },
        { flowId: flowRC.id, stepOrder: 4, positionName: "PO Placed", defaultResponsiblePerson: "CLOGD — Lt. M. Fernando", financialDelegationLevel: "Up to Rs. 2,000,000 — Capt" },
        { flowId: flowRC.id, stepOrder: 5, positionName: "Items Received", defaultResponsiblePerson: "APO(E) — PO Bandara", financialDelegationLevel: "—" },
        { flowId: flowRC.id, stepOrder: 6, positionName: "QC Passed", defaultResponsiblePerson: "QCI Officer", financialDelegationLevel: "—" },
        { flowId: flowRC.id, stepOrder: 7, positionName: "Payment Done", defaultResponsiblePerson: "CSLOG — Cdr. R. Perera", financialDelegationLevel: "Up to Rs. 5,000,000 — Capt" },
      ],
    });

    const flowNR = await db.processFlow.create({ data: { name: "Non-Rate", description: "Non-Rate contract flow — items not under RC, requires tender/evaluation" } });
    await db.processStep.createMany({
      data: [
        { flowId: flowNR.id, stepOrder: 1, positionName: "PR Raised", defaultResponsiblePerson: "APO(E) — PO Bandara", financialDelegationLevel: "—" },
        { flowId: flowNR.id, stepOrder: 2, positionName: "GS Approval", defaultResponsiblePerson: "GS Officer", financialDelegationLevel: "Up to Rs. 500,000 — Cdr" },
        { flowId: flowNR.id, stepOrder: 3, positionName: "Tender Called", defaultResponsiblePerson: "ASO(E) — Lt. Cdr. K. Silva", financialDelegationLevel: "Up to Rs. 500,000 — Cdr", isTenderStage: true },
        { flowId: flowNR.id, stepOrder: 4, positionName: "Quotation Received", defaultResponsiblePerson: "CLOGD — Lt. M. Fernando", financialDelegationLevel: "Up to Rs. 1,000,000 — Cdr", isTenderStage: true },
        { flowId: flowNR.id, stepOrder: 5, positionName: "BEC Evaluation", defaultResponsiblePerson: "BEC Committee", financialDelegationLevel: "Up to Rs. 2,000,000 — Capt", isEvaluationStage: true },
        { flowId: flowNR.id, stepOrder: 6, positionName: "AOE Approval", defaultResponsiblePerson: "AOE", financialDelegationLevel: "Up to Rs. 2,000,000 — Capt", isEvaluationStage: true },
        { flowId: flowNR.id, stepOrder: 7, positionName: "PO Placed", defaultResponsiblePerson: "CLOGD — Lt. M. Fernando", financialDelegationLevel: "Up to Rs. 5,000,000 — Capt" },
        { flowId: flowNR.id, stepOrder: 8, positionName: "Items Received", defaultResponsiblePerson: "APO(E) — PO Bandara", financialDelegationLevel: "—" },
        { flowId: flowNR.id, stepOrder: 9, positionName: "QC Passed", defaultResponsiblePerson: "QCI Officer", financialDelegationLevel: "—" },
        { flowId: flowNR.id, stepOrder: 10, positionName: "Payment Done", defaultResponsiblePerson: "CSLOG — Cdr. R. Perera", financialDelegationLevel: "Up to Rs. 10,000,000 — FC" },
      ],
    });

    const flowARO = await db.processFlow.create({ data: { name: "ARO (Contractual)", description: "ARO Contractual job flow — complex tender opening, evaluation & financial delegation" } });
    await db.processStep.createMany({
      data: [
        { flowId: flowARO.id, stepOrder: 1, positionName: "Contract Initiation", defaultResponsiblePerson: "CCED(E) — Capt. T. Jayasuriya", financialDelegationLevel: "—" },
        { flowId: flowARO.id, stepOrder: 2, positionName: "Scope Definition", defaultResponsiblePerson: "SCE(M) — Lt. D. Rajapaksa", financialDelegationLevel: "—" },
        { flowId: flowARO.id, stepOrder: 3, positionName: "Tender Called", defaultResponsiblePerson: "CCEO(E) — Lt. Cdr. A. Wickrama", financialDelegationLevel: "Up to Rs. 5,000,000 — Capt", isTenderStage: true },
        { flowId: flowARO.id, stepOrder: 4, positionName: "Tender Opening", defaultResponsiblePerson: "Tender Board", financialDelegationLevel: "Up to Rs. 5,000,000 — Capt", isTenderStage: true },
        { flowId: flowARO.id, stepOrder: 5, positionName: "BEC Evaluation", defaultResponsiblePerson: "BEC Committee", financialDelegationLevel: "Up to Rs. 10,000,000 — FC", isEvaluationStage: true },
        { flowId: flowARO.id, stepOrder: 6, positionName: "Negotiation", defaultResponsiblePerson: "CCED(E) — Capt. T. Jayasuriya", financialDelegationLevel: "Up to Rs. 10,000,000 — FC", isEvaluationStage: true },
        { flowId: flowARO.id, stepOrder: 7, positionName: "AOE Approval", defaultResponsiblePerson: "AOE", financialDelegationLevel: "Up to Rs. 20,000,000 — AOE", isEvaluationStage: true },
        { flowId: flowARO.id, stepOrder: 8, positionName: "Contract Award", defaultResponsiblePerson: "CCED(E) — Capt. T. Jayasuriya", financialDelegationLevel: "Up to Rs. 50,000,000 — CNC" },
        { flowId: flowARO.id, stepOrder: 9, positionName: "Work In Progress", defaultResponsiblePerson: "SCE(P&P) — Lt. N. Gunawardena", financialDelegationLevel: "—" },
        { flowId: flowARO.id, stepOrder: 10, positionName: "QC Passed", defaultResponsiblePerson: "QCI Officer", financialDelegationLevel: "—" },
        { flowId: flowARO.id, stepOrder: 11, positionName: "Final Payment", defaultResponsiblePerson: "CSLOG — Cdr. R. Perera", financialDelegationLevel: "Up to Rs. 50,000,000 — CNC" },
      ],
    });

    // ── Area Store Records (oncharge NAV 251, off-charge NAV 255) ──
    await db.areaStoreRecord.createMany({
      data: [
        { storeName: "BMS", itemCode: "BMS-220", itemName: "Centrifugal Pump 15kW", category: "BMS", unit: "NOS", qty: 4, unitCost: 385000, totalCost: 1540000, recordType: "Oncharge", navReference: "NAV 251", fileNumber: "FILE/2025-001", location: "BMS Store", date: "2025-06-15", remarks: "Oncharge via QCI" },
        { storeName: "BMS", itemCode: "BMS-6204", itemName: "Bearing 6204 ZZ", category: "BMS", unit: "NOS", qty: 10, unitCost: 1850, totalCost: 18500, recordType: "Oncharge", navReference: "NAV 251", fileNumber: "FILE/2025-005", location: "BMS Store", date: "2025-06-20" },
        { storeName: "Metal", itemCode: "MT-045", itemName: "Mild Steel Plate 6mm", category: "Metal", unit: "KG", qty: 850, unitCost: 245, totalCost: 208250, recordType: "Oncharge", navReference: "NAV 251", fileNumber: "FILE/2025-003", location: "Metal Store", date: "2025-06-18" },
        { storeName: "Paint", itemCode: "PT-077", itemName: "Epoxy Primer Grey", category: "Paint", unit: "LTR", qty: 20, unitCost: 3200, totalCost: 64000, recordType: "OffCharge", navReference: "NAV 255", fileNumber: "FILE/2025-002", location: "Zone D", date: "2025-06-22", remarks: "Off-charge to Zone D Stores" },
        { storeName: "Oil & Lubricant", itemCode: "LO-008", itemName: "Hydraulic Oil ISO 68", category: "Lubricant Oil", unit: "LTR", qty: 60, unitCost: 1850, totalCost: 111000, recordType: "Oncharge", navReference: "NAV 251", fileNumber: "FILE/2025-021", location: "Oil Store", date: "2025-06-10" },
        { storeName: "General", itemCode: "GN-205", itemName: "Portland Cement 50kg", category: "General", unit: "BAG", qty: 45, unitCost: 1450, totalCost: 65250, recordType: "Oncharge", navReference: "NAV 251", fileNumber: "FILE/2025-011", location: "General Store", date: "2025-06-12" },
      ],
    });

    // ── User Profiles (with passwords for authentication) ──
    const adminHash = hashPassword("admin123");
    await db.userProfile.createMany({
      data: [
        { username: "rperera", displayName: "Cdr. R. Perera", email: "rperera@navy.lk", role: "Admin", department: "CSLOG", passwordHash: adminHash },
        { username: "mfernando", displayName: "Lt. M. Fernando", email: "mfernando@navy.lk", role: "Officer", department: "CSLOG", passwordHash: hashPassword("officer123") },
        { username: "pbandara", displayName: "PO Bandara", email: "pbandara@navy.lk", role: "Clerk", department: "CSLOG", passwordHash: hashPassword("clerk123") },
        { username: "tjaya", displayName: "Capt. T. Jayasuriya", email: "tjaya@navy.lk", role: "Manager", department: "CE", passwordHash: hashPassword("manager123") },
      ],
    });

    // ── Votes (Vote/Funds management) ──
    await db.vote.createMany({
      data: [
        { voteNumber: "223-1-01-2104", description: "New Construction", voteType: "Capital", allocation: 292000000, financialYear: "2025" },
        { voteNumber: "223-1-01-2001", description: "Renovation", voteType: "Capital", allocation: 85000000, financialYear: "2025" },
        { voteNumber: "223-1-01-2506", description: "Infrastructure Development", voteType: "Capital", allocation: 250000000, financialYear: "2025" },
        { voteNumber: "223-1-01-1303", description: "Maintenance", voteType: "Recurring", allocation: 18000000, financialYear: "2025" },
        { voteNumber: "223-1-01-2103", description: "General Requirement (Equipment)", voteType: "Capital", allocation: 75000000, financialYear: "2026" },
      ],
    });

    // ── Store Settings ──
    await db.storeSetting.createMany({
      data: [
        { storeName: "Zone A", storeType: "Zone", responsiblePerson: "PO Bandara", location: "Dockyard Block A" },
        { storeName: "Zone B", storeType: "Zone", responsiblePerson: "LS Silva", location: "Dockyard Block B" },
        { storeName: "BMS Area Store", storeType: "AreaStore", responsiblePerson: "PO Bandara", location: "CSLOG BMS Bay" },
        { storeName: "Metal Area Store", storeType: "AreaStore", responsiblePerson: "LS Silva", location: "CSLOG Metal Bay" },
        { storeName: "Paint Area Store", storeType: "AreaStore", responsiblePerson: "PO Bandara", location: "CSLOG Paint Bay" },
        { storeName: "Oil & Lubricant Area Store", storeType: "AreaStore", responsiblePerson: "LS Silva", location: "CSLOG Oil Bay" },
        { storeName: "Ready-Use Stores", storeType: "Ready-Use", responsiblePerson: "LS Silva", location: "Dockyard RU" },
      ],
    });

    // ── Navy List (officers seniority) ──
    await db.navyListImport.createMany({
      data: [
        { name: "Capt. T. Jayasuriya", rank: "Captain", svcNumber: "SVC/1111", appointment: "CCED(E)", seniority: 1, department: "CE", category: "CCED Officer" },
        { name: "Cdr. R. Perera", rank: "Commander", svcNumber: "SVC/1234", appointment: "CSLOG", seniority: 2, department: "CSLOG", category: "CSLOG Officer" },
        { name: "Lt. Cdr. A. Wickrama", rank: "Lt. Commander", svcNumber: "SVC/2222", appointment: "CCEO(E)", seniority: 3, department: "CE", category: "CCED Officer" },
        { name: "Lt. Cdr. K. Silva", rank: "Lt. Commander", svcNumber: "SVC/3456", appointment: "ASO(E)", seniority: 4, department: "CSLOG", category: "CSLOG Officer" },
        { name: "Lt. M. Fernando", rank: "Lieutenant", svcNumber: "SVC/2345", appointment: "CLOGD", seniority: 5, department: "CSLOG", category: "CSLOG Officer" },
        { name: "Lt. D. Rajapaksa", rank: "Lieutenant", svcNumber: "SVC/3333", appointment: "SCE(M)", seniority: 6, department: "CE", category: "CCED Officer" },
        { name: "Lt. N. Gunawardena", rank: "Lieutenant", svcNumber: "SVC/4444", appointment: "SCE(P&P)", seniority: 7, department: "CE", category: "CCED Officer" },
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
