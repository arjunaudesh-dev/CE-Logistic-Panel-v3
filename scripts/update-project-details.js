const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROJECT_UPDATES = [
  {
    matchName: "GOTABAYA",
    fullName: "CONSTRUCTION OF NEW SECURITY POINT OF FRONT OF BEACH SLNS GOTABAYA",
    voteAllocation: 484573.80,
    committed: 484573.80,
    actualSpent: 71470.48,
    files: [
      // Processing File
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0531",
        itemCode: "ENA/APOE/RCFO/ENG/2026/1278",
        itemName: "ANGLE IRON MILD STEEL EQUAL 65MM X 63MM X 6MM (5.8M PRE LENGTH)",
        unit: "No's",
        qty: 4.00,
        unitPrice: 7110.00,
        fileCost: 33559.20,
        presentPosition: "Processing File",
        supplier: "AARA LANKA PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0530",
        itemCode: "ENA/APO/BMS/2026/2354",
        itemName: "SHEET ASBESTOS CORRUGATED 8'-2\" (2500MM)",
        unit: "No's",
        qty: 10.00,
        unitPrice: 5117.00,
        fileCost: 60380.60,
        presentPosition: "Processing File",
        supplier: "M/S New Maruthi International"
      },
      // Awaiting Financial Approval
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0535",
        itemCode: "ENA/APO/FO/GEN/2026/2370",
        itemName: "GLASS SHEET PLAIN 08' X 04' X 05MM",
        unit: "No's",
        qty: 1.00,
        unitPrice: 5900.00,
        fileCost: 6962.00,
        presentPosition: "Awaiting Financial Approval",
        supplier: "M/S Dee Mart Trading (Pvt) Ltd"
      },
      // Order Placed File
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0116",
        itemCode: "ENA/APO/FO/BMS/2026/1102",
        itemName: "RUBBLE 6\" x 9\" WITH TRANSPORT CHARGES",
        unit: "Cube",
        qty: 3.0,
        unitPrice: 12000.00,
        fileCost: 36000.00,
        presentPosition: "Order Placed",
        supplier: "M/S BEN Vision (Pvt) Ltd"
      },
      {
        prNumber: "ENA/APO/FO/BMS/2026/1102",
        itemCode: "ENA/APOE/PO/2026/1473",
        itemName: "SAND RIVER (WITH TRANSPORT CHARGES)",
        unit: "Cube",
        qty: 3.0,
        unitPrice: 22500.00,
        fileCost: 67500.00,
        presentPosition: "Order Placed",
        supplier: "M/S BEN Vision (Pvt) Ltd"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0529",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1270",
        itemName: "TILE CALICUT RIDGE (GRADE 1)",
        unit: "No's",
        qty: 32.00,
        unitPrice: 100.00,
        fileCost: 3776.00,
        presentPosition: "Order Placed",
        supplier: "MARUTHI ENTERPRISES"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0524",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1267",
        itemName: "LOCAL TIMBER CLASS I (WELL SEASONED) (HIORA / ACCASIA) 2\" X 2\" X 10'-0\"",
        unit: "LFT",
        qty: 100.0,
        unitPrice: 92.00,
        fileCost: 10856.00,
        presentPosition: "Order Placed",
        supplier: "MULTY TIMBER DEALERS"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0524-B",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1267",
        itemName: "LOCAL TIMBER LUXURY CLASS (WELL SEASONED) MAHOGANY 4\" X 3\" X 5'-0\"",
        unit: "LFT",
        qty: 20.0,
        unitPrice: 194.00,
        fileCost: 4578.40,
        presentPosition: "Order Placed",
        supplier: "MULTY TIMBER DEALERS"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0525",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1268",
        itemName: "DOOR PLYWOOD 2'-6\"x6'-9\"",
        unit: "No's",
        qty: 1.00,
        unitPrice: 5175.00,
        fileCost: 6106.50,
        presentPosition: "Order Placed",
        supplier: "SIEMEN TRADING COMPANY"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0532",
        itemCode: "ENA/APOE/RCFO/ENG/2026/1279",
        itemName: "PIPE GI MEDIUM DUTY 1/2\" DIA (2.6 MM Tk.) LENGTH -5.8 MTR",
        unit: "No's",
        qty: 4.00,
        unitPrice: 2749.00,
        fileCost: 12975.28,
        presentPosition: "Order Placed",
        supplier: "POWER STEELS PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0526",
        itemCode: "ENA/APOE/RCFO/ENG/2026/1277",
        itemName: "SINGLE DOOR LOCK MORTISE, 2 LEVER WITH DOOR HANDLE AND ALL ACCESSORIES (UNION, ENGLISH MAKE)",
        unit: "No's",
        qty: 1.00,
        unitPrice: 2730.00,
        fileCost: 3221.40,
        presentPosition: "Order Placed",
        supplier: "MARSHAL TRADING COMPANY"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0533",
        itemCode: "ENA/APO/FO/BMS/2026/2353",
        itemName: "2'-9\" x 6'-9\" WOOD COMPOSITE DOOR WITH FRAME AND ALL ACCESSORIES (HINGES, DOOR LOCKS & FIXING SCREWS ETC) LAMINATED, ANY COLOUR",
        unit: "No's",
        qty: 1.00,
        unitPrice: 16000.00,
        fileCost: 18880.00,
        presentPosition: "Order Placed",
        supplier: "NEW MARUTHI ENTERPRISES"
      },

      // Received Not Actual Files
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0116-M",
        itemCode: "ENA/APO/FO/BMS/2026/1102",
        itemName: "METAL 3/4\" (WITH TRANSPORT CHARGES)",
        unit: "Cube",
        qty: 3.0,
        unitPrice: 16999.00,
        fileCost: 50997.00,
        presentPosition: "Items Received",
        supplier: "M/s Hopeful International (Pvt) Ltd"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0503",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1126",
        itemName: "CEMENT 50KG PORTLAND COMPOSITE CEMENT (PCC)",
        unit: "No's",
        qty: 50.00,
        unitPrice: 1461.86,
        fileCost: 86249.74,
        presentPosition: "Items Received",
        supplier: "Siam City Cement (Lanka) Limited"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0528",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1269",
        itemName: "LOCAL TIMBER CLASS I (WELL SEASONED) (HIORA / ACCASIA) 6\" X 2\" X 10'-0\"",
        unit: "LFT",
        qty: 40.0,
        unitPrice: 320.00,
        fileCost: 12800.00,
        presentPosition: "Items Received",
        supplier: "AMITH LEE VELANDASALA"
      },

      // Actual Files
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0120",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0121",
        itemName: "NAIL WIRE 4\" G-5",
        unit: "Kg",
        qty: 5.0,
        unitPrice: 242.00,
        fileCost: 1427.80,
        presentPosition: "Awaiting Payment",
        supplier: "MARUTHI ENTERPRISES"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0119",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0131",
        itemName: "MILD STEEL ROUND IRON ROD 6MM 6M LENGTH",
        unit: "Ton",
        qty: 0.10,
        unitPrice: 242692.00,
        fileCost: 28637.66,
        presentPosition: "Awaiting Payment",
        supplier: "MARSHAL TRADING COMPANY"
      }
    ]
  },
  {
    matchName: "LOGISTIC & MANAGEMENT SCHOOL",
    fullName: "NEW ACADEMY COMPLEX TRINCOMALEE – LOGISTIC & MANAGEMENT SCHOOL BUILDING",
    voteAllocation: 1921000.00,
    committed: 1883280.00,
    actualSpent: 0,
    files: [
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0636",
        itemCode: "ENA/APO/FO/BMS/2026/2536",
        itemName: "CONCRETE READY MIXED GRADE 30 (Without pump car)",
        unit: "3M",
        qty: 32.00,
        unitPrice: 45500.00,
        fileCost: 1718080.00,
        presentPosition: "Tender Evaluation",
        supplier: "TOKYO SUPERMIX (PVT) LTD"
      },
      {
        prNumber: "ENA/CEWSE/NSRJRF/2026/0027",
        itemCode: "ENA/AROE/RFO/HR/2026/0546",
        itemName: "Hiring of Concrete Pump Car for New Academy Complex Trincomalee – Logistic & Management School Building. Pump of 70 M3.",
        unit: "3M",
        qty: 70.00,
        unitPrice: 2000.00,
        fileCost: 165200.00,
        presentPosition: "Tender Evaluation",
        supplier: "TOKYO SUPERMIX (PVT) LTD"
      }
    ]
  },
  {
    matchName: "KASHYAPA",
    fullName: "IMPROVEMENT OF SECURITY FENCE AT SLNS KASHYAPA (FROM NO 01 SECURITY POINT TO NO 12 SECURITY POINT)",
    voteAllocation: 3300000.00,
    committed: 2853283.79,
    actualSpent: 1227049.43,
    files: [
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0648",
        itemCode: "ENA/APO/FO/ENG/2026/2529",
        itemName: "PIPE GALVANIZED MEDIUM DUTY OD 1\" MM X WT 3.2 MM (5.8M PER LENGTH)",
        unit: "No's",
        qty: 150.0,
        unitPrice: 4500.00,
        fileCost: 796500.00,
        presentPosition: "Processing File",
        supplier: "M/S Machine Mart International"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0072",
        itemCode: "ENA/APO/FO/BMS/2026/1099",
        itemName: "RUBBLE 6\" x 9\" (WITH TRANSPORT CHARGES)",
        unit: "Cube",
        qty: 45.0,
        unitPrice: 10494.00,
        fileCost: 557231.40,
        presentPosition: "Processing File",
        supplier: "M/S Machine Mart International"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0198",
        itemCode: "ENA/APOE/RCFO/PAT/2026/0511",
        itemName: "PAINT ENEMAL MAT (GREEN COLOUR) - 4 LTR",
        unit: "No's",
        qty: 3.0,
        unitPrice: 4427.97,
        fileCost: 15675.01,
        presentPosition: "Order Placed",
        supplier: "CAUSEWAY PAINTS LANKA PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0196",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0375",
        itemName: "PIPE GI MEDIUM DUTY 1\" Dia (3.2 MM Tk.) - 5.8 Mtr",
        unit: "No's",
        qty: 170.0,
        unitPrice: 3534.00,
        fileCost: 708920.40,
        presentPosition: "Part Supply",
        supplier: "POWER STEELS PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0070",
        itemCode: "ENA/APO/FO/BMS/2026/1097",
        itemName: "SAND RIVER (WITH TRANSPORT CHARGES)",
        unit: "Cube",
        qty: 18.0,
        unitPrice: 19710.00,
        fileCost: 418640.40,
        presentPosition: "Part Supply",
        supplier: "M/S Machine Mart International"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0484",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1120",
        itemName: "CEMENT 50KG PORTLAND COMPOSITE CEMENT (PCC)",
        unit: "No's",
        qty: 280.0,
        unitPrice: 1461.86,
        fileCost: 482998.54,
        presentPosition: "Items Received",
        supplier: "M/S Siam City Cement (Lanka) Ltd"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0076",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0023",
        itemName: "\"J\" HOOKS GI 6\" WITH DIAMOND AND RUBBER PACKING WASHER AND RUBBER PACKING PLATES",
        unit: "Kg's",
        qty: 32.0,
        unitPrice: 454.70,
        fileCost: 17169.47,
        presentPosition: "Awaiting Payment",
        supplier: "WESTERN ENGINEERS"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0074",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0100",
        itemName: "BARBED WIRE HOT DIPPED GALVANIZED WIRE WITH A MINIMUM ZINC COATING OF 55 GRAMS / SQM, 275 METER LONG ROLL, WEIGHTING 25 KG",
        unit: "No's",
        qty: 6.0,
        unitPrice: 8296.00,
        fileCost: 58735.68,
        presentPosition: "Awaiting Payment",
        supplier: "MARUTHI ENTERPRISES"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0073",
        itemCode: "ENA/APOE/RCFO/BMS/2026/0103",
        itemName: "PVC COATED CHAIN LINK AND GALVANIZED (12 GAUGE), HOLE SIZE 2\"X2\" ROLL DIMENSION 2.40 M X15M WIRE DIA METER",
        unit: "No's",
        qty: 25.0,
        unitPrice: 20082.00,
        fileCost: 592419.00,
        presentPosition: "Awaiting Payment",
        supplier: "A R ENTERPRISES"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0075",
        itemCode: "ENA/APO/FO/ENG/2026/0922",
        itemName: "PVC COATED LINE WIRE 12G",
        unit: "Kg's",
        qty: 100.0,
        unitPrice: 739.00,
        fileCost: 80122.00,
        presentPosition: "Awaiting Payment",
        supplier: "M/S ROMAX HARDWARE"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0071",
        itemCode: "ENA/APO/FO/BMS/2026/1098",
        itemName: "METAL 3/4\" (WITH TRANSPORT CHARGES)",
        unit: "Cube",
        qty: 24.0,
        unitPrice: 16799.00,
        fileCost: 475747.68,
        presentPosition: "Awaiting Payment",
        supplier: "M/S HOPEFUL INTERNATIONAL (PVT) LTD"
      }
    ]
  },
  {
    matchName: "VIDURA",
    fullName: "RENOVATION OF MARINE HOME BUILDING AT SLNS VIDURA",
    voteAllocation: 2100000.00,
    committed: 1373834.82,
    actualSpent: 242966.28,
    files: [
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0082",
        itemCode: "ENA/APOE/RCFO/GEN/2026/1280",
        itemName: "MIRROR GLASS SHEET 6'X4'X5MM",
        unit: "No's",
        qty: 3.0,
        unitPrice: 22839.00,
        fileCost: 80850.06,
        presentPosition: "Processing File",
        supplier: "ROMAX HARDWARE CENTER"
      },
      {
        prNumber: "ENA/APO/FO/BMS/2026/2217",
        itemCode: "ENA/APO/FO/BMS/2026/2217",
        itemName: "300 x 600 mm GLAZED CERAMIC WALL TILE WHITE COLOUR",
        unit: "No's",
        qty: 69.0,
        unitPrice: 860.00,
        fileCost: 69962.00,
        presentPosition: "Processing File",
        supplier: "M/s AR Enterprises"
      },
      {
        prNumber: "ENA/APO/FO/ENG/2026/2218",
        itemCode: "ENA/APO/FO/ENG/2026/2218",
        itemName: "MASTER SEAL 540 (BARRALASTIC) 36kg",
        unit: "No's",
        qty: 3.0,
        unitPrice: 49150.00,
        fileCost: 173991.00,
        presentPosition: "Processing File",
        supplier: "M/s AR Enterprises"
      }
    ]
  },
  {
    matchName: "SSSO",
    fullName: "RENOVATION WORK OF MAIN GATE, VEHICAL PARK IN SSSO (D) AND RATHNA SECURITY POINT AT SLN DOCKYAD",
    voteAllocation: 1600000.00,
    committed: 1419213.78,
    actualSpent: 130165.80,
    files: [
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0537",
        itemCode: "ENA/APO/FO/GEN/2026/2382",
        itemName: "GLASS SHEET PLAIN 06' X 04' X 05MM",
        unit: "No's",
        qty: 1.00,
        unitPrice: 5900.00,
        fileCost: 6962.00,
        presentPosition: "Processing File",
        supplier: "Dee Mart International"
      },
      {
        prNumber: "ENA/CEWSE/NSRJRF/2026/0026",
        itemCode: "ENA/AROE/RFO/GEN/2026/0515",
        itemName: "PROVIDING CURVING AND BENDING SERVICES FOR ZN/AL ROOFING SHEET FOR RATHNA SECURITY POINT- SLNS THISSA",
        unit: "Job",
        qty: 1.00,
        unitPrice: 430000.00,
        fileCost: 430000.00,
        presentPosition: "Processing File",
        supplier: "Tender Open Date: 02/07/2026"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0226",
        itemCode: "ENA/APOE/RCFO/BMS/2026/0278",
        itemName: "SHEET GLASS CLEAR 6'-00\" X 4'-00\" X 5MM",
        unit: "No's",
        qty: 1.00,
        unitPrice: 3839.00,
        fileCost: 4530.02,
        presentPosition: "Awaiting Financial Approval",
        supplier: "ROMAX HARDWARE CENTRE"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0518",
        itemCode: "ENA/APOE/RCFO/ENG/2026/1448",
        itemName: "PIPE GI MEDIUM DUTY 1 1/2\" Dia 3.2 Mm Tk. LENGTH -5.8 MTR",
        unit: "No's",
        qty: 6.00,
        unitPrice: 5394.00,
        fileCost: 38189.52,
        presentPosition: "Awaiting Financial Approval",
        supplier: "POWER STEELS PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0163",
        itemCode: "ENA/APOE/RCFO/PAT/2026/0509",
        itemName: "PAINT ANTICORROSIVE MAT (BLACK AND RED) - 4 LTR",
        unit: "No's",
        qty: 7.0,
        unitPrice: 3881.74,
        fileCost: 32063.17,
        presentPosition: "Order Placed",
        supplier: "JAT HOLDINGS PLC"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0439",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0945",
        itemName: "DOOR LOCK ALUMINUM ( ALPHA OR VVP EQUIVALENT QUALITY)",
        unit: "No's",
        qty: 6.00,
        unitPrice: 760.00,
        fileCost: 5380.80,
        presentPosition: "Order Placed",
        supplier: "POWER STEELS PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0438",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0946",
        itemName: "BUTT HINGES S/S 4\"x3\"",
        unit: "No's",
        qty: 12.00,
        unitPrice: 189.00,
        fileCost: 2676.24,
        presentPosition: "Items Received",
        supplier: "ROMAX HARDWARE CENTRE"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0166",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0236",
        itemName: "\"C\" CHANNELS 100MM X 50MM X 18MM X 3MM PIPE GI MEDIUM DUTY 2\" DIA (3.6MM TK)",
        unit: "No's",
        qty: 25.0,
        unitPrice: 7340.00,
        fileCost: 216530.00,
        presentPosition: "Items Received",
        supplier: "AARA LANKA PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0509",
        itemCode: "ENA/APOE/RCFO/BMS/2026/1219",
        itemName: "ZINK ALUMINUM PROFILE ROOFING SHEET, 762MM EFFECTIVE WIDTH, TENSILE STRENGTH 550 N/MM2, THICKNESS 0.47MM, ANY COLOUR",
        unit: "M tr",
        qty: 400.00,
        unitPrice: 1990.00,
        fileCost: 939280.00,
        presentPosition: "Items Received",
        supplier: "AARA LANKA PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0165",
        itemCode: "ENA/APOE/RCFO/PAT/2026/0835",
        itemName: "THINNER N/C HI-GLOSE - (04 LTRS)",
        unit: "No's",
        qty: 7.0,
        unitPrice: 2064.83,
        fileCost: 17055.50,
        presentPosition: "Items Received",
        supplier: "NIPPON PAINTS LANKA (PVT) LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0229",
        itemCode: "ENA/APOE/RCFO/BMS/2026/0279",
        itemName: "PVC COATED CHAIN LINK AND GALVANIZED (12 GAUGE), HOLE SIZE 2\"X2\" ROLL DIMENSION 2 M X15M WIRE DIA METER APPROX X 3.5MM",
        unit: "No's",
        qty: 3.0,
        unitPrice: 16735.00,
        fileCost: 59241.90,
        presentPosition: "Awaiting Payment",
        supplier: "A R ENTERPRISES"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0225",
        itemCode: "ENA/APOE/RCFO/ENG/2026/0369",
        itemName: "PIPE GI MEDIUM DUTY 1/2\" DIA (2.6 MM Tk.) LENGTH -5.8 MTR",
        unit: "No's",
        qty: 5.00,
        unitPrice: 2749.00,
        fileCost: 16219.10,
        presentPosition: "Awaiting Payment",
        supplier: "POWER STEELS PVT LTD"
      },
      {
        prNumber: "ENA/CEWS/NSGORF/2026/0437",
        itemCode: "ENA/APOE/RCFO/BMS/2026/0933",
        itemName: "CERAMIC CLOSED COUPLED 'P' TRAP COMMODE COMPLETE SET WITH CISTERN INCLUDING FIXING SCREWS, SEAT COVER, SYPHON SET WITH ALL OTHER ACCESSORIES APPROX. DIMENSION:- L = 630MM, W=350MM - 400MM, H=765 MM, H=390MM COLOUR - WHITE",
        unit: "No's",
        qty: 1.00,
        unitPrice: 17900.00,
        fileCost: 21122.00,
        presentPosition: "Awaiting Payment",
        supplier: "SIEMEN TRADING COMPANY"
      }
    ]
  }
];

async function main() {
  console.log("Updating projects & files with exact spreadsheet data...");

  for (const upd of PROJECT_UPDATES) {
    const proj = await prisma.project.findFirst({
      where: {
        name: { contains: upd.matchName }
      }
    });

    if (!proj) {
      console.log(`Warning: Project matching '${upd.matchName}' not found!`);
      continue;
    }

    // 1. Update Project allocations
    await prisma.project.update({
      where: { id: proj.id },
      data: {
        voteAllocation: upd.voteAllocation,
        committed: upd.committed,
        actualSpent: upd.actualSpent,
      }
    });

    console.log(`Updated project '${proj.name}' allocations: Vote = ${upd.voteAllocation}, Committed = ${upd.committed}, Actual = ${upd.actualSpent}`);

    // 2. Clear old files for this project to avoid duplicates
    await prisma.projectFile.deleteMany({
      where: { projectId: proj.id }
    });

    // 3. Create fresh ProjectFile entries
    for (const f of upd.files) {
      await prisma.projectFile.create({
        data: {
          projectId: proj.id,
          prNumber: f.prNumber,
          itemCode: f.itemCode,
          itemName: f.itemName,
          unit: f.unit,
          qty: f.qty,
          unitPrice: f.unitPrice,
          fileCost: f.fileCost,
          presentPosition: f.presentPosition,
          supplier: f.supplier,
        }
      });
    }

    console.log(`Added ${upd.files.length} project files to '${proj.name}'.`);
  }

  console.log("Project update completed successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
