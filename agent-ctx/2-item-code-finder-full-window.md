# Task ID: 2 — Item Code Finder Full Window

**Agent:** Item Code Finder Full Window
**File modified:** `/home/z/my-project/src/components/erp/modules/stores.tsx`
**Final size:** 3886 lines (was ~2807)
**Status:** ✅ Complete — lint-clean, runtime-clean

## What was done
Replaced the small `FindItemCodeDialog` (small Dialog) with a dedicated
**full-window overlay** `ItemCodeMasterWindow` (fixed inset-0 z-50) opened
by the existing "Find Item Codes (AI)" toolbar button in the Stores module.

## Three tabs in the full window

### Section A — Item Master Database (`ItemMasterDatabaseSection`)
- `GET /api/item-master` with live query (search/category/status)
- 4 stat tiles (Total / Active / Merged / Discontinued)
- Toolbar: search input + category Select (STORE_CATEGORIES minus "All") + status Select + Add Item button
- Table: canonical code (mono highlighted), description (+ "→ merged into X" sub), category badge, unit, alternate codes/names (muted, truncated), status badge via `itemMasterStatusColor`, Edit/Delete actions
- `ItemMasterFormDialog` for Add/Edit → POST /api/item-master or PUT /api/item-master/[id]
- DELETE with confirm + Loader2 spinner → DELETE /api/item-master/[id]

### Section B — Duplicate Analysis (AI) (`DuplicateAnalysisSection`)
- "Run Duplicate Analysis (AI)" button → POST /api/item-master/analyze (Loader2 spinner + "10-25s" hint)
- Summary tiles: Entries Scanned, Duplicate Groups, Multi-Code/One Item, Same-Code/Near-Dup
- Groups rendered as cards with type badge via `duplicateTypeColor`, description, recommendation
- Per-group items table: radio for canonical (disabled for store-item rows), Checkbox for merge (disabled for canonical & store-items), source badge (Master/Store), zone column
- "Merge Selected" button → POST /api/item-master/[canonicalId]/merge with `{canonicalId, mergeIds}` — on success removes the group from list, toasts `Merged X items into CODE`
- Auto-initialises selections: first item-master item as canonical, remaining item-master items as merge candidates
- `groupKey()` helper builds stable key from sorted source-id pairs so selections survive group removal
- Re-run Analysis button

### Section C — Bulk Upload (`BulkUploadItemMasterSection`)
- Intro card with CSV format chips (ItemCode, Description, Category, Unit) + Download CSV Template button + file input + Add Manual Row button
- Preview/edit table: row#, ItemCode, Description, Category Select (FILE_CATEGORIES), Unit, delete — invalid rows highlighted red
- Import button → POST /api/item-master with array (bulk createMany with skipDuplicates)
- Progress bar + success/skipped counts + error list + Clear button

## API endpoints used (all verified via curl)
- `GET /api/item-master?search=&category=&status=` → array of ItemMasterRecord
- `POST /api/item-master` (single object OR array for bulk) — bulk uses `createMany` with `skipDuplicates`
- `PUT /api/item-master/[id]` — updates canonicalCode/description/category/unit/alternateCodes/alternateNames/status
- `DELETE /api/item-master/[id]`
- `POST /api/item-master/analyze` → `{totalScanned, duplicatesFound, groups: DuplicateGroup[]}`
- `POST /api/item-master/[id]/merge` with `{canonicalId, mergeIds: string[]}` → `{ok, canonicalCode, mergedCount, alternateCodes, alternateNames}`

## Live API verification
- GET /api/item-master → 15 seeded records (AL-015, BMS-220, BMS-220-SK, BMS-220A, …)
- GET /api/item-master?search=BMS → 4 matches
- POST /api/item-master/analyze → `{totalScanned: 32, duplicatesFound: 4, groups: [multi_code_one_item ×2, same_code_diff_name ×1, near_duplicate ×1]}` — the seeded BMS-220/BMS-220A duplicate is correctly detected

## Imports added
- lucide-react: `Database`, `GitMerge`, `Sparkles`, `Copy`
- constants: `itemMasterStatusColor`, `duplicateTypeColor`
- shadcn/ui: `Checkbox` from `@/components/ui/checkbox`

## What was removed
- Entire `FindItemCodeDialog` component (~480 lines)
- `EMPTY_CANDIDATE` constant
- `FindItemCodeDialogProps` interface

## What was preserved (untouched)
All existing Stores functionality:
- `StoresModule` named export with `"use client"` directive
- Zones tab (scaled tiles)
- Stores tab (filters/sort/pagination)
- ItemFormDialog (Add/Edit store items)
- BulkUploadDialog (CSV bulk upload for store items)
- ViewItemDialog
- EarmarkItemDialog + EarmarkedItemsDialog
- Toolbar buttons: Find Item Codes (AI), View Earmarked, Earmark Item, Bulk Upload, Add Item

## Lint & runtime
- `bun run lint` → 0 errors
- Dev server log: `✓ Compiled in 250ms`, `✓ Compiled in 995ms`, `✓ Compiled in 628ms`, `✓ Compiled in 234ms` — clean

## Files for reference
- `/home/z/my-project/src/components/erp/modules/stores.tsx` — main file
- `/home/z/my-project/worklog.md` — full work record appended at the end
