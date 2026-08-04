const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.resolve(__dirname, '../prisma/custom.db');
process.env.DATABASE_URL = `file:${dbPath}`;
const prisma = new PrismaClient();

// Synchronous password hash matching src/lib/auth.ts
function hashPassword(password) {
  let hash = 2166136261;
  const salted = `ce-logistic-salt::${password}`;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "h$" + (hash >>> 0).toString(36) + "$" + salted.length.toString(36);
}

const ACTUAL_PROJECTS = [
  // VOTE 223-1-01-2104
  {
    name: "CONSTRUCTION OF NO.03 SLIPWAY HANGAR AT NAVAL DOCKYARD",
    nameAbbreviation: "NSH",
    voteNumber: "VOTE 223-1-01-2104",
    voteAllocation: 85000000,
    committed: 42000000,
    actualSpent: 18500000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "Engineering Dept",
    projectOfficer: "Cdr. R. Perera",
    status: "Active",
    startDate: "2025-01-15",
    endDate: "2025-12-20",
  },
  {
    name: "EXPANSION OF FACILITIES AROUND NO 03 SLIPWAY AT NAVAL BASE TRINCOMALEE CONSTRUCTION OF 50m x 20m STEEL WORKSHOP BUILDING",
    nameAbbreviation: "EFS",
    voteNumber: "VOTE 223-1-01-2104",
    voteAllocation: 45000000,
    committed: 18000000,
    actualSpent: 7200000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "Civil Works Dept",
    projectOfficer: "Lt. M. Fernando",
    status: "Active",
    startDate: "2025-02-01",
    endDate: "2026-03-30",
  },
  {
    name: "CONSTRUCTION OF NEW SECURITY POINT OF FRONT OF BEACH SLNS GOTABAYA",
    nameAbbreviation: "SGP",
    voteNumber: "VOTE 223-1-01-2104",
    voteAllocation: 12000000,
    committed: 4500000,
    actualSpent: 1200000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "Civil Works Dept",
    projectOfficer: "Lt. D. Rajapaksa",
    status: "Active",
    startDate: "2025-03-01",
    endDate: "2025-11-30",
  },
  {
    name: "NEW ACADEMY COMPLEX TRINCOMALEE – LOGISTIC & MANAGEMENT SCHOOL BUILDING",
    nameAbbreviation: "LMS",
    voteNumber: "VOTE 223-1-01-2104",
    voteAllocation: 150000000,
    committed: 35000000,
    actualSpent: 8200000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "CE Dept",
    projectOfficer: "Capt. T. Jayasuriya",
    status: "Active",
    startDate: "2025-01-01",
    endDate: "2026-12-31",
  },

  // VOTE 223-1-01-2001
  {
    name: "IMPROVEMENT OF SECURITY FENCE AT SLNS KASHYAPA (FROM NO 01 SECURITY POINT TO NO 12 SECURITY POINT)",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 15000000,
    committed: 6000000,
    actualSpent: 2100000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "Base Security",
    projectOfficer: "Lt. K. Perera",
    status: "Active",
    startDate: "2025-02-15",
    endDate: "2025-09-30",
  },
  {
    name: "RENOVATION OF MARINE HOME BUILDING AT SLNS VIDURA",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 25000000,
    committed: 10000000,
    actualSpent: 4500000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "CE Dept",
    projectOfficer: "Lt. Cdr. S. Silva",
    status: "Active",
    startDate: "2025-01-10",
    endDate: "2025-10-15",
  },
  {
    name: "RENOVATION WORK OF BUILDING IN COMMAND WARD ROOM AT SLN DOCKYARD (CUT & POLISH - GRANITE FLOOR OF DINING HALL, ROOFTOP OF GOLDEN LOGE AND COMMANDANT CHALET)",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 35000000,
    committed: 12000000,
    actualSpent: 5800000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "Wardroom Admin",
    projectOfficer: "Cdr. A. Wickramasinghe",
    status: "Active",
    startDate: "2025-03-01",
    endDate: "2025-11-15",
  },
  {
    name: "RENOVATION WORK OF MAIN GATE, VEHICAL PARK IN SSSO (D) AND RATHNA SECURITY POINT AT SLN DOCKYARD",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 18000000,
    committed: 5000000,
    actualSpent: 1500000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "SSSO Dept",
    projectOfficer: "Lt. M. Fernando",
    status: "Active",
    startDate: "2025-04-01",
    endDate: "2025-12-01",
  },
  {
    name: "RENOVATION WORK OF STORE YARD CCED (E) SLN DOCKYARD",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 22000000,
    committed: 8000000,
    actualSpent: 3000000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "CCED (E)",
    projectOfficer: "Lt. Cdr. N. Bandara",
    status: "Active",
    startDate: "2025-02-01",
    endDate: "2025-10-30",
  },
  {
    name: "RENOVATION WORK OF MARRIED QUARTERS AT SLN DOCKYARD (PEYTON TERRACE 01 TO 10)",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 40000000,
    committed: 15000000,
    actualSpent: 6200000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "Civil Works Dept",
    projectOfficer: "Cdr. W. Gunaratne",
    status: "Active",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
  },
  {
    name: "RENOVATION WORK OF TRAINING BUILDING, WARDROOM AND SENIOR SAILORS MESS AT SBS (HQ)",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 28000000,
    committed: 9000000,
    actualSpent: 3800000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "SBS HQ",
    projectOfficer: "Lt. Cdr. K. Jayawardena",
    status: "Active",
    startDate: "2025-03-15",
    endDate: "2025-11-30",
  },
  {
    name: "RENOVATION WORK OF COMMAND WARDROOM (BLOCK I & II) AT SLN DOCKYARD",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 30000000,
    committed: 11000000,
    actualSpent: 4200000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "Command Wardroom",
    projectOfficer: "Cdr. R. Fonseka",
    status: "Active",
    startDate: "2025-02-10",
    endDate: "2025-12-15",
  },
  {
    name: "WATER PROOFING WORK TUNNELS OF NAD (28,29,44 & 45) SLN DOCKYARD",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 16000000,
    committed: 4000000,
    actualSpent: 1800000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "NAD Dept",
    projectOfficer: "Lt. D. Mendis",
    status: "Active",
    startDate: "2025-04-15",
    endDate: "2025-11-30",
  },
  {
    name: "RENOVATION WORK OF NAVAL HOSPITAL AT SLNS THISSA (ROOF OF SURGICAL & ISOLATION WARD AND BATHROOM OF OFFICER WARD & MEDICAL WARD)",
    voteNumber: "VOTE 223-1-01-2001",
    voteAllocation: 32000000,
    committed: 13000000,
    actualSpent: 5100000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "Medical Dept",
    projectOfficer: "Surg. Cdr. M. Rathnayake",
    status: "Active",
    startDate: "2025-02-01",
    endDate: "2025-10-31",
  },

  // VOTE 223-1-01-2506
  {
    name: "RENOVATION WORK SECURITY FENCE IN NAVY HOUSE AT ENA",
    voteNumber: "VOTE 223-1-01-2506",
    voteAllocation: 8000000,
    committed: 2500000,
    actualSpent: 900000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "ENA Admin",
    projectOfficer: "Lt. T. Cooray",
    status: "Active",
    startDate: "2025-03-01",
    endDate: "2025-08-30",
  },
  {
    name: "EXTENSION OF RENOVATION EXISTING GUIDE PIER",
    voteNumber: "VOTE 223-1-01-2506",
    voteAllocation: 50000000,
    committed: 20000000,
    actualSpent: 8500000,
    projectType: "Renovation",
    financialMean: "Vote",
    benefactor: "Civil Works Dept",
    projectOfficer: "Cdr. H. Abeywickrama",
    status: "Active",
    startDate: "2025-01-15",
    endDate: "2026-04-30",
  },
  {
    name: "ESTABLISHMENT OF GAS CHLORINATION SYSTEM FOR NAVAL WATER PURIFICATION PLANT AT ANDANKULAM",
    voteNumber: "VOTE 223-1-01-2506",
    voteAllocation: 14000000,
    committed: 5000000,
    actualSpent: 1200000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "Water Supply Dept",
    projectOfficer: "Lt. Cdr. P. Liyanage",
    status: "Active",
    startDate: "2025-02-20",
    endDate: "2025-10-15",
  },
  {
    name: "TARRING WORK FROM MAIN ROAD TO TISSA SCHOOL (150MTR X6.2 MTR) AT SLNS THISSA",
    voteNumber: "VOTE 223-1-01-2506",
    voteAllocation: 9500000,
    committed: 3000000,
    actualSpent: 1100000,
    projectType: "Maintenance",
    financialMean: "Vote",
    benefactor: "Civil Works Dept",
    projectOfficer: "Lt. S. Gamage",
    status: "Active",
    startDate: "2025-04-01",
    endDate: "2025-09-15",
  },
  {
    name: "IMPLEMENTING OF GREEN FENCE FOR GOLF LINK HOTEL ROAD AT NAVAL DOCKYARD",
    voteNumber: "VOTE 223-1-01-2506",
    voteAllocation: 6000000,
    committed: 1800000,
    actualSpent: 600000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "Base Command",
    projectOfficer: "Lt. W. Kumara",
    status: "Active",
    startDate: "2025-03-10",
    endDate: "2025-07-30",
  },
  {
    name: "FLOATING DOCK SLNS DOCKYARD",
    voteNumber: "VOTE 223-1-01-2506",
    voteAllocation: 120000000,
    committed: 45000000,
    actualSpent: 22000000,
    projectType: "New Construction",
    financialMean: "Vote",
    benefactor: "Engineering Dept",
    projectOfficer: "Capt. K. Senanayake",
    status: "Active",
    startDate: "2025-01-01",
    endDate: "2026-06-30",
  },

  // VOTE 223-1-01-1303
  {
    name: "MAINTENANCE WORK AT ENA (1303)",
    voteNumber: "VOTE 223-1-01-1303",
    voteAllocation: 12500000,
    committed: 4800000,
    actualSpent: 1600000,
    projectType: "Maintenance",
    financialMean: "Vote",
    benefactor: "ENA Admin",
    projectOfficer: "Lt. Cdr. U. Jayasinghe",
    status: "Active",
    startDate: "2025-01-15",
    endDate: "2025-12-15",
  },
  {
    name: "ANDANKULAM WATER PURIFICATION PLANT - 2025",
    voteNumber: "VOTE 223-1-01-1303",
    voteAllocation: 18000000,
    committed: 6500000,
    actualSpent: 2400000,
    projectType: "Maintenance",
    financialMean: "Vote",
    benefactor: "Water Supply Dept",
    projectOfficer: "Lt. Cdr. P. Liyanage",
    status: "Active",
    startDate: "2025-02-01",
    endDate: "2025-11-30",
  },

  // NON NAVAL
  {
    name: "RENOVATION WORK OF SOBAR ISLAND RESORT - TRINCOMALEE",
    voteNumber: "NON-NAVAL",
    voteAllocation: 35000000,
    committed: 15000000,
    actualSpent: 6800000,
    projectType: "Renovation",
    financialMean: "Non-Public Fund",
    benefactor: "Malima Hospitality",
    projectOfficer: "Cdr. S. Ranasinghe",
    status: "Active",
    startDate: "2025-01-10",
    endDate: "2025-11-20",
  },
  {
    name: "CONSTRUCTION OF NEW WASHROOM FACILITY NEAR PAPER PORT JETTY AT DOCKYARD",
    voteNumber: "NON-NAVAL",
    voteAllocation: 7500000,
    committed: 2200000,
    actualSpent: 800000,
    projectType: "New Construction",
    financialMean: "Contractual",
    benefactor: "Paper Port Admin",
    projectOfficer: "Lt. N. Wickramaratne",
    status: "Active",
    startDate: "2025-03-01",
    endDate: "2025-08-15",
  },

  // VOTE 223-1-01-2103
  {
    name: "2103- ACQUISITION OF PLANT MACHINERY & EQUIPMENT REQUIREMENT FOR ENA-2026",
    voteNumber: "VOTE 223-1-01-2103",
    voteAllocation: 45000000,
    committed: 12000000,
    actualSpent: 3500000,
    projectType: "General Requirement",
    financialMean: "Vote",
    benefactor: "ENA Mechanical",
    projectOfficer: "Cdr. T. Dissanayake",
    status: "Active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
];

async function main() {
  console.log("Setting up Master Admin account & 25 official projects...");

  const pwHash = hashPassword("arjuna@1991");
  const realUsernames = ["KMAU Kahandawa", "kmau.kahandawa"];

  // Purge all dummy user accounts
  await prisma.userProfile.deleteMany({
    where: {
      username: {
        notIn: realUsernames
      }
    }
  });

  for (const uname of realUsernames) {
    await prisma.userProfile.upsert({
      where: { username: uname },
      update: {
        displayName: "KMAU Kahandawa",
        role: "Admin",
        passwordHash: pwHash,
        active: true,
      },
      create: {
        username: uname,
        displayName: "KMAU Kahandawa",
        email: "kmau.kahandawa@navy.lk",
        role: "Admin",
        department: "CSLOG",
        passwordHash: pwHash,
        active: true,
      },
    });
  }

  console.log("Master Admin user accounts set up (Name: KMAU Kahandawa, PW: arjuna@1991), dummy users purged.");

  let projectCount = 0;
  for (const projData of ACTUAL_PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { name: projData.name },
    });

    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: projData,
      });
    } else {
      await prisma.project.create({
        data: projData,
      });
    }
    projectCount++;
  }

  console.log(`Successfully provisioned ${projectCount} official projects with names & vote numbers.`);
}

main()
  .catch((e) => {
    console.error("Error setting up master admin and projects:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
