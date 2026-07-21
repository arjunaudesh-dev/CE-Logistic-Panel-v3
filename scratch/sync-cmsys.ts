import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FIREBASE_DB2_URL = "https://ncw-ps-operations-default-rtdb.asia-southeast1.firebasedatabase.app/inventory.json";

interface FirebaseInventoryItem {
  category?: string;
  cost_per_unit?: number;
  date_added?: string;
  deno?: string;
  description?: string;
  location?: string;
  on_charge_ref?: string;
  off_charge_ref?: string;
  quantity?: number;
  requirement?: string;
  zone_id?: string;
}

async function main() {
  console.log("[CMSys Sync Script] Fetching live inventory from CMSys Firebase DB (ncw-ps-operations)...");
  
  const response = await fetch(FIREBASE_DB2_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Firebase request failed with status ${response.status}`);
  }

  const inventoryMap: Record<string, FirebaseInventoryItem> = await response.json();
  if (!inventoryMap) {
    console.log("No inventory items found in Firebase.");
    return;
  }

  const items = Object.entries(inventoryMap);
  console.log(`[CMSys Sync Script] Received ${items.length} raw inventory records from Firebase.`);

  // Map zone_id to clean display Store Zone names
  const ZONE_DISPLAY_MAP: Record<string, string> = {
    "OTW": "OTW Site",
    "A-Zone": "Zone A",
    "B-Zone": "Zone B",
    "C-Zone": "Zone C",
    "D-Zone": "Zone D",
    "E-Zone": "Zone E",
    "Supply-School": "Supply School",
    "Balance-Stores": "Balance Stores",
    "Genaral-Zone": "General Zone",
  };

  let syncedItems = 0;
  let createdZones = 0;
  const zonesMap = new Map<string, { totalValue: number; itemCount: number; lowStockCount: number; nonMovingCount: number }>();

  for (const [fbKey, fbItem] of items) {
    if (!fbItem.description) continue;

    const description = fbItem.description.replace(/^"|"$/g, '').trim();
    
    // Correctly prioritize zone_id for the Store Zone name (not Stock Book location!)
    const rawZoneId = fbItem.zone_id?.trim() || "";
    const zoneName = ZONE_DISPLAY_MAP[rawZoneId] || rawZoneId || "General Zone";

    const rawLocation = fbItem.location?.trim() || "";
    const isStockBook = /^Stock\s*book/i.test(rawLocation);

    // Book No is populated when location contains Stock Book reference
    const bookNo = isStockBook ? rawLocation : null;

    // Location field logic
    let location = zoneName;
    if (!isStockBook && rawLocation) {
      location = rawLocation;
    } else if (fbItem.requirement && !fbItem.requirement.includes('"')) {
      location = fbItem.requirement.trim();
    }

    const category = fbItem.category || "General";
    const unit = fbItem.deno || "NOS";
    const qty = Number(fbItem.quantity) || 0;
    const unitCost = Number(fbItem.cost_per_unit) || 0;
    const totalCost = qty * unitCost;
    const itemCode = fbItem.on_charge_ref || `FB-${fbKey.slice(-6).toUpperCase()}`;

    // Determine movement position
    let lastMovement = "Fast Moving";
    if (qty === 0) {
      lastMovement = "Non Moving";
    } else if (qty < 5) {
      lastMovement = "Low Stock";
    }

    // Upsert into StoreItem
    await db.storeItem.upsert({
      where: { id: `fb_${fbKey}` },
      create: {
        id: `fb_${fbKey}`,
        zoneName,
        description,
        category,
        unit,
        qty,
        unitCost,
        totalCost,
        location,
        bookNo,
        itemCode,
        lastMovement,
        minStock: 5,
      },
      update: {
        zoneName,
        description,
        category,
        unit,
        qty,
        unitCost,
        totalCost,
        location,
        bookNo,
        itemCode,
        lastMovement,
        updatedAt: new Date(),
      },
    });

    // Update Zone Stats
    const currentZone = zonesMap.get(zoneName) || { totalValue: 0, itemCount: 0, lowStockCount: 0, nonMovingCount: 0 };
    currentZone.totalValue += totalCost;
    currentZone.itemCount += 1;
    if (qty < 5 && qty > 0) currentZone.lowStockCount += 1;
    if (qty === 0) currentZone.nonMovingCount += 1;
    zonesMap.set(zoneName, currentZone);

    syncedItems++;
  }

  // Delete invalid Stock book StoreZone records that were erroneously created earlier
  const deleted = await db.storeZone.deleteMany({
    where: {
      name: {
        startsWith: "Stock book",
      },
    },
  });
  console.log(`[CMSys Sync Script] Cleaned up ${deleted.count} invalid Stock book StoreZone entries.`);

  // Upsert StoreZones
  for (const [zName, zStats] of zonesMap.entries()) {
    await db.storeZone.upsert({
      where: { name: zName },
      create: {
        name: zName,
        type: zName.includes("Ready") ? "Ready-Use" : zName.includes("Balance") ? "Balance" : "Zone",
        totalValue: zStats.totalValue,
        itemCount: zStats.itemCount,
        lowStockCount: zStats.lowStockCount,
        nonMovingCount: zStats.nonMovingCount,
      },
      update: {
        totalValue: zStats.totalValue,
        itemCount: zStats.itemCount,
        lowStockCount: zStats.lowStockCount,
        nonMovingCount: zStats.nonMovingCount,
      },
    });
    createdZones++;
  }

  console.log(`[CMSys Sync Script] Successfully synchronized ${syncedItems} items across ${createdZones} store zones!`);
}

main()
  .catch((e) => {
    console.error("Sync error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
