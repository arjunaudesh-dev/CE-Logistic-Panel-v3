import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SP_V1_API_URL = "http://localhost/SP%20V1/api/api.php?action=get_projects";
const SP_V1_STATUS_URL = "http://localhost/SP%20V1/api/api.php?action=status";
const SP_V1_ABSORB_URL = "http://localhost/SP%20V1/api/api.php?action=cmsys_absorb";
const SP_V1_SAMPLE_PATH = "C:\\xampp\\htdocs\\SP V1\\data\\sample_projects.json";

interface SPProjectPayload {
  id: string;
  code: string;
  category: string;
  title: string;
  location?: string;
  gps?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  approval_ref?: string;
  approval_type?: string;
  approval_authority?: string;
  end_user_name?: string;
  end_user_contact?: string;
  work_scope?: string;
  progress?: number;
  job_card_cost?: number;
  material_status?: string;
  incharge?: string;
  notes?: string;
}

// Fetch SP V1 projects from live PHP API or fallback to sample JSON
async function fetchSPV1Projects(): Promise<{ projects: SPProjectPayload[]; source: string; connected: boolean }> {
  try {
    const res = await fetch(SP_V1_API_URL, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.projects) && data.projects.length > 0) {
        return { projects: data.projects, source: "Live SP V1 REST API", connected: true };
      }
    }
  } catch {
    // API failed, fallback to local file
  }

  // Fallback to reading file on disk
  if (fs.existsSync(SP_V1_SAMPLE_PATH)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(SP_V1_SAMPLE_PATH, "utf8"));
      if (fileData && Array.isArray(fileData.projects)) {
        return { projects: fileData.projects, source: "Local SP V1 Repository File", connected: true };
      }
    } catch (e: any) {
      console.warn("Error reading SP V1 sample file:", e.message);
    }
  }

  return { projects: [], source: "Unavailable", connected: false };
}

// Default materials per SP category for procurement action generation
const SP_CATEGORY_DEFAULT_MATERIALS: Record<string, Array<{
  itemName: string;
  itemCode: string;
  category: string;
  unit: string;
  qty: number;
  unitPrice: number;
  supplier: string;
  presentPosition: string;
}>> = {
  Religious: [
    {
      itemName: "CEMENT 50KG PORTLAND COMPOSITE CEMENT (PCC)",
      itemCode: "ENA/APOE/RCFO/BMS/2026/1126",
      category: "BMS",
      unit: "No's",
      qty: 120,
      unitPrice: 1461.86,
      supplier: "Siam City Cement (Lanka) Limited",
      presentPosition: "Items Received",
    },
    {
      itemName: "TILE CALICUT RIDGE (GRADE 1) ROOF TILES",
      itemCode: "ENA/APOE/RCFO/BMS/2026/1270",
      category: "BMS",
      unit: "No's",
      qty: 450,
      unitPrice: 100.0,
      supplier: "MARUTHI ENTERPRISES",
      presentPosition: "Order Placed",
    },
    {
      itemName: "CERAMIC PORCELAIN FLOOR TILE 600MM X 600MM",
      itemCode: "ENA/APO/FO/BMS/2026/2217",
      category: "BMS",
      unit: "No's",
      qty: 180,
      unitPrice: 1250.0,
      supplier: "M/s AR Enterprises",
      presentPosition: "Tender Evaluation",
    },
    {
      itemName: "MASTER SEAL 540 WATERPROOFING SLAB SEALER 36KG",
      itemCode: "ENA/APO/FO/ENG/2026/2218",
      category: "General",
      unit: "No's",
      qty: 6,
      unitPrice: 49150.0,
      supplier: "M/s AR Enterprises",
      presentPosition: "Processing File",
    },
    {
      itemName: "WEATHER SHIELD EXTERIOR EMULSION PAINT 20 LTR",
      itemCode: "ENA/APOE/RCFO/PAT/2026/0511",
      category: "Paint",
      unit: "No's",
      qty: 8,
      unitPrice: 28500.0,
      supplier: "CAUSEWAY PAINTS LANKA PVT LTD",
      presentPosition: "Pre-tender",
    },
  ],
  "Clean Sri Lanka": [
    {
      itemName: "CONCRETE READY MIXED GRADE 25 (FOR WALKWAY)",
      itemCode: "ENA/APO/FO/BMS/2026/2536",
      category: "BMS",
      unit: "3M",
      qty: 45,
      unitPrice: 42000.0,
      supplier: "TOKYO SUPERMIX (PVT) LTD",
      presentPosition: "Items Received",
    },
    {
      itemName: "MILD STEEL ROUND IRON ROD 12MM TOR STEEL",
      itemCode: "ENA/APOE/RCFO/ENG/2026/0131",
      category: "Metal",
      unit: "Ton",
      qty: 1.5,
      unitPrice: 242692.0,
      supplier: "POWER STEELS PVT LTD",
      presentPosition: "Order Placed",
    },
    {
      itemName: "RUBBLE 6\" x 9\" (WITH TRANSPORT CHARGES)",
      itemCode: "ENA/APO/FO/BMS/2026/1099",
      category: "BMS",
      unit: "Cube",
      qty: 35,
      unitPrice: 10494.0,
      supplier: "M/S Machine Mart International",
      presentPosition: "Order Placed",
    },
    {
      itemName: "LED WEATHERPROOF POST LIGHT 45W COMPLETE FITTING",
      itemCode: "ENA/APOE/RCFO/ENG/2026/1448",
      category: "Electrical",
      unit: "No's",
      qty: 15,
      unitPrice: 12800.0,
      supplier: "Dee Mart International",
      presentPosition: "Tender Evaluation",
    },
    {
      itemName: "PRECAST CONCRETE DRAIN SLAB 600MM X 450MM X 75MM",
      itemCode: "ENA/APO/FO/BMS/2026/2540",
      category: "BMS",
      unit: "No's",
      qty: 200,
      unitPrice: 1850.0,
      supplier: "M/S Hopeful International (Pvt) Ltd",
      presentPosition: "Processing File",
    },
  ],
  Housing: [
    {
      itemName: "ZINK ALUMINUM PROFILE ROOFING SHEET 0.47MM",
      itemCode: "ENA/APOE/RCFO/BMS/2026/1219",
      category: "BMS",
      unit: "M tr",
      qty: 350,
      unitPrice: 1990.0,
      supplier: "AARA LANKA PVT LTD",
      presentPosition: "Items Received",
    },
    {
      itemName: "LOCAL TIMBER CLASS I (HIORA / ACCASIA) 4\" X 2\" X 10'",
      itemCode: "ENA/APOE/RCFO/BMS/2026/1269",
      category: "BMS",
      unit: "LFT",
      qty: 400,
      unitPrice: 280.0,
      supplier: "MULTY TIMBER DEALERS",
      presentPosition: "Order Placed",
    },
    {
      itemName: "CERAMIC CLOSED COUPLED 'P' TRAP COMMODE COMPLETE SET",
      itemCode: "ENA/APOE/RCFO/BMS/2026/0933",
      category: "Plumbing",
      unit: "No's",
      qty: 4,
      unitPrice: 17900.0,
      supplier: "SIEMEN TRADING COMPANY",
      presentPosition: "Awaiting Payment",
    },
    {
      itemName: "PIPE PVC MEDIUM DUTY 1/2\" & FITTINGS ASSORTED",
      itemCode: "ENA/APOE/RCFO/ENG/2026/1279",
      category: "Plumbing",
      unit: "Job",
      qty: 1,
      unitPrice: 85000.0,
      supplier: "ROMAX HARDWARE CENTRE",
      presentPosition: "Processing File",
    },
    {
      itemName: "DOOR PLYWOOD FLUSH 2'-9\" X 6'-9\" WITH MORTISE LOCK",
      itemCode: "ENA/APOE/RCFO/BMS/2026/1268",
      category: "General",
      unit: "No's",
      qty: 6,
      unitPrice: 9500.0,
      supplier: "SIEMEN TRADING COMPANY",
      presentPosition: "Tender Evaluation",
    },
  ],
  Miscellaneous: [
    {
      itemName: "CEMENT 50KG PORTLAND COMPOSITE CEMENT (PCC)",
      itemCode: "ENA/APOE/RCFO/BMS/2026/1126",
      category: "BMS",
      unit: "No's",
      qty: 80,
      unitPrice: 1461.86,
      supplier: "Siam City Cement (Lanka) Limited",
      presentPosition: "Items Received",
    },
    {
      itemName: "RUBBLE 6\" x 9\" WITH TRANSPORT CHARGES",
      itemCode: "ENA/APO/FO/BMS/2026/1102",
      category: "BMS",
      unit: "Cube",
      qty: 15,
      unitPrice: 12000.0,
      supplier: "M/S BEN Vision (Pvt) Ltd",
      presentPosition: "Order Placed",
    },
    {
      itemName: "BARBED WIRE HOT DIPPED GALVANIZED 25KG ROLL",
      itemCode: "ENA/APOE/RCFO/ENG/2026/0100",
      category: "Metal",
      unit: "No's",
      qty: 12,
      unitPrice: 8296.0,
      supplier: "MARUTHI ENTERPRISES",
      presentPosition: "Processing File",
    },
    {
      itemName: "SAND RIVER (WITH TRANSPORT CHARGES)",
      itemCode: "ENA/APO/FO/BMS/2026/1097",
      category: "BMS",
      unit: "Cube",
      qty: 8,
      unitPrice: 19710.0,
      supplier: "M/S Machine Mart International",
      presentPosition: "Order Placed",
    },
  ],
};

export async function GET() {
  try {
    const { projects, source, connected } = await fetchSPV1Projects();

    // Check existing projects in SQLite database
    const localProjects = await db.project.findMany({
      where: {
        OR: [{ sourceSystem: "SP_V1" }, { spCode: { not: null } }],
      },
      include: {
        files: {
          select: { id: true, fileCost: true, presentPosition: true },
        },
      },
    });

    const localMap = new Map(localProjects.map((p) => [p.spCode || p.name, p]));

    const enriched = projects.map((sp) => {
      const match = localMap.get(sp.code) || localMap.get(sp.title);
      return {
        ...sp,
        synced: !!match,
        logisticsProjectId: match?.id || null,
        fileCount: match?.files.length || 0,
        committedFilesCost: match?.files.reduce((sum, f) => sum + (f.fileCost || 0), 0) || 0,
      };
    });

    return NextResponse.json({
      connected,
      source,
      totalSPProjects: projects.length,
      syncedCount: localProjects.length,
      pendingCount: Math.max(0, projects.length - localProjects.length),
      projects: enriched,
    });
  } catch (error: any) {
    console.error("[SP Bridge Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projects, source } = await fetchSPV1Projects();
    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { error: "No SP V1 projects could be retrieved from live API or local cache" },
        { status: 404 }
      );
    }

    let syncedCount = 0;
    let createdFilesCount = 0;

    for (const sp of projects) {
      const category = sp.category || "Miscellaneous";
      const spCode = sp.code || sp.id;
      const budget = Number(sp.budget) || 1000000;
      const voteNumber = `SP-V1 / ${category.toUpperCase()}`;

      // 1. Upsert Project
      let project = await db.project.findFirst({
        where: {
          OR: [{ spCode: spCode }, { name: sp.title }],
        },
      });

      const projectData = {
        name: sp.title,
        nameAbbreviation: spCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase(),
        voteNumber: voteNumber,
        voteAllocation: budget,
        startDate: sp.start_date || "2026-05-01",
        endDate: sp.end_date || "2026-11-30",
        department: "Civil Engineering Dept",
        benefactor: sp.end_user_name || "Community / CSR",
        reference: sp.approval_ref || `SP-V1-${spCode}`,
        projectType: "Special Project",
        financialMean: "Special Project Fund",
        projectOfficer: sp.incharge || "PO1 Ruwan Jayasena",
        status: sp.status === "On Hold" ? "On Hold" : (sp.status || "Active"),
        description: sp.work_scope || `Special project under ${category} stream.`,
        spCode: spCode,
        spCategory: category,
        sourceSystem: "SP_V1",
        approvalRef: sp.approval_ref || null,
        approvalType: sp.approval_type || "Signal",
        approvalAuthority: sp.approval_authority || "Commander Eastern Naval Command",
        workScope: sp.work_scope || null,
        showOnDashboard: true,
      };

      if (project) {
        project = await db.project.update({
          where: { id: project.id },
          data: projectData,
        });
      } else {
        project = await db.project.create({
          data: projectData,
        });
      }

      syncedCount++;

      // 2. Check and provision procurement action files
      const existingFiles = await db.projectFile.count({
        where: { projectId: project.id },
      });

      if (existingFiles === 0) {
        const materialTemplates = SP_CATEGORY_DEFAULT_MATERIALS[category] || SP_CATEGORY_DEFAULT_MATERIALS["Miscellaneous"];
        let seq = 1;
        let projectCommitted = 0;
        let projectSpent = 0;

        for (const mat of materialTemplates) {
          const prNumber = `ENA/SP/${spCode}/2026/${String(seq).padStart(4, "0")}`;
          const fileCost = mat.qty * mat.unitPrice;
          const groupKey = `${spCode}-G${Math.ceil(seq / 2)}`;

          // Create ProjectFile
          const projFile = await db.projectFile.create({
            data: {
              projectId: project.id,
              prNumber,
              itemCode: mat.itemCode,
              itemName: mat.itemName,
              unit: mat.unit,
              qty: mat.qty,
              unitPrice: mat.unitPrice,
              fileCost,
              supplier: mat.supplier,
              presentPosition: mat.presentPosition,
              fileCategory: mat.category,
              fileGroupKey: groupKey,
              fileGroupSeq: seq,
              createdBy: "PO1 Ruwan Jayasena",
              authorizedBy: "Lt. Cdr. S. Silva",
              responsiblePerson: "Lt. Cdr. S. Silva",
              progressPercentage: mat.presentPosition === "Items Received" ? 90 : mat.presentPosition === "Order Placed" ? 65 : 30,
              logs: {
                create: {
                  newPosition: mat.presentPosition,
                  changedBy: "PO1 Ruwan Jayasena",
                  comment: `Procurement action initiated for ${sp.title} [${mat.presentPosition}]`,
                },
              },
            },
          });

          // Mirror to ProcurementFile
          await db.procurementFile.create({
            data: {
              projectId: project.id,
              projectName: project.name,
              voteNumber: project.voteNumber,
              prNumber,
              itemCode: mat.itemCode,
              itemName: mat.itemName,
              unit: mat.unit,
              qty: mat.qty,
              unitPrice: mat.unitPrice,
              fileCost,
              supplier: mat.supplier,
              presentPosition: mat.presentPosition,
              fileCategory: mat.category,
              fileGroupKey: groupKey,
              createdBy: "PO1 Ruwan Jayasena",
              authorizedBy: "Lt. Cdr. S. Silva",
              responsiblePerson: "Lt. Cdr. S. Silva",
              spCode: spCode,
              logs: {
                create: {
                  newPosition: mat.presentPosition,
                  changedBy: "PO1 Ruwan Jayasena",
                  comment: `Procurement action logged for SP ${spCode} [${mat.presentPosition}]`,
                },
              },
            },
          });

          projectCommitted += fileCost;
          if (["Items Received", "Awaiting Payment", "Payment Done", "Closed"].includes(mat.presentPosition)) {
            projectSpent += fileCost;
          }

          createdFilesCount++;
          seq++;
        }

        // Update Project committed & actualSpent
        await db.project.update({
          where: { id: project.id },
          data: {
            committed: projectCommitted,
            actualSpent: projectSpent,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${syncedCount} SP V1 projects and provisioned ${createdFilesCount} procurement files.`,
      syncedCount,
      createdFilesCount,
      source,
    });
  } catch (error: any) {
    console.error("[SP Bridge Sync Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
