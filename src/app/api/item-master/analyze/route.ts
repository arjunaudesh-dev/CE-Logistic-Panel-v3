import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export interface DuplicateGroup {
  type: "same_name_diff_code" | "same_code_diff_name" | "multi_code_one_item" | "near_duplicate";
  description: string;
  canonicalCode: string | null;
  items: {
    id: string;
    canonicalCode: string;
    description: string;
    category: string;
    source: "item-master" | "store-item";
    storeItemId?: string;
    zoneName?: string;
  }[];
  recommendation: string;
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// Scans ItemMaster + StoreItem tables to detect duplicates and recommend consolidation.
export async function POST() {
  try {
    const masterItems = await db.itemMaster.findMany();
    const storeItems = await db.storeItem.findMany();

    // Build a unified list of all (code, description) pairs from both sources
    const allEntries: { code: string; desc: string; category: string; source: string; id: string; zoneName?: string }[] = [];
    for (const m of masterItems) {
      allEntries.push({ code: m.canonicalCode, desc: m.description, category: m.category, source: "item-master", id: m.id });
    }
    for (const s of storeItems) {
      if (s.itemCode) {
        allEntries.push({ code: s.itemCode, desc: s.description, category: s.category, source: "store-item", id: s.id, zoneName: s.zoneName });
      }
    }

    // ── Deterministic duplicate detection ──
    // 1. Same description, different codes (multi-code one item)
    const byDesc = new Map<string, typeof allEntries>();
    for (const e of allEntries) {
      const key = e.desc.toLowerCase().trim();
      if (!byDesc.has(key)) byDesc.set(key, []);
      byDesc.get(key)!.push(e);
    }
    const groups: DuplicateGroup[] = [];
    for (const [desc, entries] of byDesc) {
      const uniqueCodes = new Set(entries.map((e) => e.code));
      if (uniqueCodes.size > 1) {
        groups.push({
          type: "multi_code_one_item",
          description: `Multiple item codes found for "${desc}"`,
          canonicalCode: null,
          items: entries.map((e) => ({
            id: e.id,
            canonicalCode: e.code,
            description: e.desc,
            category: e.category,
            source: e.source as "item-master" | "store-item",
            storeItemId: e.source === "store-item" ? e.id : undefined,
            zoneName: e.zoneName,
          })),
          recommendation: `Consolidate to a single canonical item code (recommend the most-used code).`,
        });
      }
    }

    // 2. Same code, different descriptions (duplicate code misuse)
    const byCode = new Map<string, typeof allEntries>();
    for (const e of allEntries) {
      const key = e.code.toLowerCase().trim();
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key)!.push(e);
    }
    for (const [code, entries] of byCode) {
      const uniqueDescs = new Set(entries.map((e) => e.desc.toLowerCase().trim()));
      if (uniqueDescs.size > 1) {
        groups.push({
          type: "same_code_diff_name",
          description: `Item code "${code}" used for ${uniqueDescs.size} different items`,
          canonicalCode: code,
          items: entries.map((e) => ({
            id: e.id,
            canonicalCode: e.code,
            description: e.desc,
            category: e.category,
            source: e.source as "item-master" | "store-item",
            storeItemId: e.source === "store-item" ? e.id : undefined,
            zoneName: e.zoneName,
          })),
          recommendation: `Resolve: either split into separate codes or correct the descriptions to one canonical name.`,
        });
      }
    }

    // ── AI-powered near-duplicate detection for descriptions that aren't exact matches ──
    // Take descriptions not already grouped, ask AI to cluster near-duplicates
    const groupedDescs = new Set<string>();
    for (const g of groups) {
      g.items.forEach((i) => groupedDescs.add(i.description.toLowerCase().trim()));
    }
    const ungroupedEntries = allEntries.filter(
      (e) => !groupedDescs.has(e.desc.toLowerCase().trim())
    );
    const uniqueUngroupedDescs = Array.from(
      new Map(ungroupedEntries.map((e) => [e.desc.toLowerCase().trim(), e])).values()
    );

    let aiGroups: DuplicateGroup[] = [];
    if (uniqueUngroupedDescs.length > 1) {
      try {
        const zai = await getZAI();
        const systemPrompt = `You are a dockyard inventory cataloguer. Given a list of item descriptions, identify NEAR-DUPLICATES (same physical item described slightly differently, e.g. "GI Pipe 50mm" vs "G.I. Pipe 50mm" vs "GI Pipe 50 mm"). Group them. Only group items that are clearly the same physical item. Do NOT group unrelated items.

Respond with ONLY valid JSON: an array of groups. Each group: { "descriptions": [list of input descriptions in this group], "canonicalDescription": "best canonical description", "reason": "why grouped" }. If no near-duplicates, return an empty array [].`;

        const userPrompt = `Item descriptions:\n${JSON.stringify(uniqueUngroupedDescs.map((e) => e.desc), null, 2)}`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          thinking: { type: "disabled" },
        });
        const raw = completion.choices[0]?.message?.content || "[]";
        const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned) as {
          descriptions: string[];
          canonicalDescription: string;
          reason: string;
        }[];

        for (const g of parsed) {
          if (g.descriptions.length < 2) continue;
          const entries = ungroupedEntries.filter((e) =>
            g.descriptions.some((d) => d.toLowerCase().trim() === e.desc.toLowerCase().trim())
          );
          const uniqueCodes = new Set(entries.map((e) => e.code));
          if (entries.length >= 2) {
            aiGroups.push({
              type: "near_duplicate",
              description: `Near-duplicate descriptions (AI): ${g.canonicalDescription}`,
              canonicalCode: null,
              items: entries.map((e) => ({
                id: e.id,
                canonicalCode: e.code,
                description: e.desc,
                category: e.category,
                source: e.source as "item-master" | "store-item",
                storeItemId: e.source === "store-item" ? e.id : undefined,
                zoneName: e.zoneName,
              })),
              recommendation: `${g.reason}. Consolidate ${uniqueCodes.size} code(s) into one canonical item code.`,
            });
          }
        }
      } catch (e) {
        console.error("AI dedup analysis failed:", e);
        // fallback: no AI groups
      }
    }

    return NextResponse.json({
      totalScanned: allEntries.length,
      duplicatesFound: groups.length + aiGroups.length,
      groups: [...groups, ...aiGroups],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Analysis failed: " + (e as Error).message }, { status: 500 });
  }
}
