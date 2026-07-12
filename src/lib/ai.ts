import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

// Shared ZAI instance (created lazily)
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export interface EstimateLineInput {
  srNo: number;
  itemName: string;
  qty: number;
  unit: string;
  estimateCost: number;
}

export interface EstimateLineResult {
  srNo: number;
  itemName: string;
  itemCode: string | null;
  isRC: boolean;
  rcNumber: string | null;
  rcRate: number;
  rcSupplier: string | null;
  approxCost: number;
  lastPurchasePrice: number;
  availableStock: number;
  stockLocation: string | null;
  nonMovingStock: number;
  matchConfidence: "high" | "medium" | "low" | "none";
  matchNote: string;
}

/**
 * Process a material estimate using AI: match each line item to the best
 * Rate Contract (RC) and Store Item in the database. Returns enriched data
 * including item codes, RC numbers, last purchase prices and available stock.
 */
export async function processEstimateWithAI(
  lines: EstimateLineInput[]
): Promise<EstimateLineResult[]> {
  // Gather DB context: RC list + store items
  const rcList = await db.rateContract.findMany({
    orderBy: { rcYear: "desc" },
    take: 500,
  });
  const storeItems = await db.storeItem.findMany({ take: 500 });

  // Compact context for the model
  const rcContext = rcList.map((r) => ({
    itemCode: r.itemCode,
    description: r.description,
    unit: r.unit,
    rcPrice: r.rcPrice,
    supplier: r.supplier,
    rcYear: r.rcYear,
  }));
  const storeContext = storeItems.map((s) => ({
    itemCode: s.itemCode,
    description: s.description,
    category: s.category,
    unit: s.unit,
    qty: s.qty,
    unitCost: s.unitCost,
    location: s.location,
    zoneName: s.zoneName,
  }));

  // Previous purchase prices from procurement files (last price per itemCode)
  const procFiles = await db.procurementFile.findMany({
    where: { itemCode: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const lastPriceMap = new Map<string, number>();
  for (const p of procFiles) {
    if (!lastPriceMap.has(p.itemCode)) lastPriceMap.set(p.itemCode, p.unitPrice);
  }
  const lastPriceContext = Array.from(lastPriceMap.entries()).map(([itemCode, price]) => ({
    itemCode,
    lastPrice: price,
  }));

  const systemPrompt = `You are a senior dockyard procurement analyst. You match material estimate line items to the existing Rate Contract (RC) list and Store inventory database.

For EACH estimate line item, find the BEST matching item by semantic similarity of the item name/description. Consider:
- Whether the item exists in the RC list (rate contract) → use RC rate as approxCost, set isRC=true, rcNumber=rcYear
- Whether the item exists in store inventory → provide availableStock and stockLocation
- Last purchase price from procurement history
- Handle DUPLICATE item codes: if multiple RC/store entries exist for the same physical item, pick the most recent RC year and consolidate stock. Note duplicates in matchNote.

Rules:
- approxCost = RC rate if matched to RC, otherwise the estimateCost from input
- availableStock = sum of qty from matching store items (balance stock)
- nonMovingStock = stock qty where the item hasn't moved (treat low-rotation items; approximate as stock if location suggests Balance/Project stores)
- matchConfidence: "high" if exact/near-exact code or description match, "medium" if semantic match, "low" if weak match, "none" if no match
- If no match: itemCode=null, isRC=false, all stock/price=0

Respond with ONLY valid JSON (no markdown fences, no explanation): an array of objects, one per input line, in the same order.`;

  const userPrompt = `Estimate line items to process:
${JSON.stringify(lines, null, 2)}

RC LIST (database):
${JSON.stringify(rcContext, null, 2)}

STORE INVENTORY (database):
${JSON.stringify(storeContext, null, 2)}

LAST PURCHASE PRICES (database):
${JSON.stringify(lastPriceContext, null, 2)}

Return a JSON array with exactly ${lines.length} objects, each having keys:
srNo, itemName, itemCode (string|null), isRC (boolean), rcNumber (string|null), rcRate (number), rcSupplier (string|null), approxCost (number), lastPurchasePrice (number), availableStock (number), stockLocation (string|null), nonMovingStock (number), matchConfidence ("high"|"medium"|"low"|"none"), matchNote (string)`;

  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "[]";
    // strip code fences if present
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as EstimateLineResult[];
    return parsed;
  } catch (e) {
    console.error("AI estimate processing failed:", e);
    // Fallback: deterministic match by exact itemCode/name substring
    return lines.map((l) => fallbackMatch(l, rcList, storeItems, lastPriceMap));
  }
}

function fallbackMatch(
  line: EstimateLineInput,
  rcList: { itemCode: string; description: string; rcPrice: number; supplier: string | null; rcYear: string }[],
  storeItems: { itemCode: string | null; description: string; qty: number; location: string | null; zoneName: string }[],
  lastPriceMap: Map<string, number>
): EstimateLineResult {
  const name = line.itemName.toLowerCase();
  const rc = rcList.find(
    (r) =>
      r.description.toLowerCase().includes(name) ||
      name.includes(r.description.toLowerCase())
  );
  const stores = storeItems.filter(
    (s) =>
      s.description.toLowerCase().includes(name) ||
      name.includes(s.description.toLowerCase())
  );
  const availStock = stores.reduce((s, x) => s + x.qty, 0);
  const loc = stores[0]?.location || stores[0]?.zoneName || null;
  const itemCode = rc?.itemCode || stores[0]?.itemCode || null;
  return {
    srNo: line.srNo,
    itemName: line.itemName,
    itemCode,
    isRC: !!rc,
    rcNumber: rc?.rcYear || null,
    rcRate: rc?.rcPrice || 0,
    rcSupplier: rc?.supplier || null,
    approxCost: rc ? rc.rcPrice : line.estimateCost,
    lastPurchasePrice: itemCode ? lastPriceMap.get(itemCode) || 0 : 0,
    availableStock: availStock,
    stockLocation: loc,
    nonMovingStock: stores.some((s) => /balance|project/i.test(s.zoneName)) ? availStock : 0,
    matchConfidence: rc || stores.length ? "medium" : "none",
    matchNote: rc ? "Matched to RC list" : stores.length ? "Matched to store inventory" : "No match found",
  };
}

// ─── Item Code Finder (Stores) ───
export interface ItemCodeMatchInput {
  description: string;
  category: string;
  unit: string;
  cost: number;
}

export interface ItemCodeMatchResult {
  description: string;
  suggestedItemCode: string | null;
  isDuplicate: boolean;
  duplicateOf: string | null; // existing item code that this duplicates
  existingCodes: string[]; // all existing codes that match this item
  confidence: "high" | "medium" | "low" | "none";
  recommendation: string; // e.g. "Use existing BMS-220" or "Assign new code"
}

/**
 * Given bulk items (description, category, cost), use AI to find/assign item codes
 * from the existing database. Detects duplicates and recommends consolidation.
 */
export async function findItemCodesWithAI(
  items: ItemCodeMatchInput[]
): Promise<ItemCodeMatchResult[]> {
  const storeItems = await db.storeItem.findMany({ take: 1000 });
  const existing = storeItems.map((s) => ({
    itemCode: s.itemCode,
    description: s.description,
    category: s.category,
    unit: s.unit,
    unitCost: s.unitCost,
  }));

  // Build a duplicate map: items sharing the same normalized description or itemCode
  const codeGroups = new Map<string, typeof existing>();
  for (const s of existing) {
    const key = s.itemCode || s.description.toLowerCase();
    if (!codeGroups.has(key)) codeGroups.set(key, []);
    codeGroups.get(key)!.push(s);
  }

  const systemPrompt = `You are a dockyard inventory cataloguer. You find and assign item codes to bulk-uploaded store items by matching them against the existing item master database.

Your job:
- For each input item, find the best matching existing item code by semantic similarity (description + category + unit).
- Detect DUPLICATES: if an input item appears to be the same physical item as an existing entry (even with slight description variations), mark isDuplicate=true and set duplicateOf to the existing code.
- List ALL existing codes that could match in existingCodes.
- If no good match exists, suggest a new item code following the pattern <CATEGORY-PREFIX>-<NUMBER> (e.g. BMS-220, MT-045, EL-301).
- confidence: "high" exact, "medium" semantic, "low" weak, "none" no match.
- recommendation: brief action e.g. "Use existing BMS-220 (consolidate duplicate)" or "Assign new code AL-016".

Respond with ONLY valid JSON (no markdown): an array of objects, one per input item, same order.`;

  const userPrompt = `Input items to find codes for:
${JSON.stringify(items, null, 2)}

EXISTING ITEM MASTER (database):
${JSON.stringify(existing, null, 2)}

Return a JSON array with exactly ${items.length} objects, each having keys:
description, suggestedItemCode (string|null), isDuplicate (boolean), duplicateOf (string|null), existingCodes (string[]), confidence ("high"|"medium"|"low"|"none"), recommendation (string)`;

  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned) as ItemCodeMatchResult[];
  } catch (e) {
    console.error("AI item-code matching failed:", e);
    // Fallback deterministic
    return items.map((it) => {
      const matches = storeItems.filter(
        (s) =>
          s.description.toLowerCase().includes(it.description.toLowerCase()) ||
          it.description.toLowerCase().includes(s.description.toLowerCase())
      );
      const codes = matches.map((m) => m.itemCode).filter(Boolean) as string[];
      return {
        description: it.description,
        suggestedItemCode: codes[0] || null,
        isDuplicate: codes.length > 0,
        duplicateOf: codes[0] || null,
        existingCodes: codes,
        confidence: codes.length ? "medium" : "none",
        recommendation: codes.length
          ? `Use existing ${codes[0]}`
          : `Assign new code`,
      };
    });
  }
}
