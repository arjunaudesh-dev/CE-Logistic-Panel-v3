# Task 3-4 — Rate Finder Discontinue + Collection PO Auto-fill + Part Supply Form

## Summary
Updated two ERP modules: rate-finder.tsx and collection.tsx.
- **PART A**: Added a new "Upload Discontinue List" button on the Rate Finder Discontinued tab that accepts a single-column CSV of Rate Codes, looks up the matching RateContract items, creates DiscontinuedItem records (reason="Discontinued via bulk upload", discontinuedDate=today) and deletes the matched RC entries — effectively moving them from RC list to Discontinued list.
- **PART B**: Added a "Files to be Collected" card on the Collection Dashboard showing procurement files where `presentPosition` is PO Placed / Order Placed / Items Dispatched / In Transit.
- **PART C**: Added a "Select PO Item" dropdown at the top of both `AddPartSupplyDialog` and `RecordCollectionDialog`. Picking an item auto-fills itemName, qty, supplier/receivedFrom.
- **PART D**: Redesigned `AddEntryDialog` — removed "No. of Sailors" field, added a "Provost Sailor Checked" Select (CSLOG Sailor stakeholders), added a "QC Checked By" Select (CCED stakeholders), added a Dimensions card (Height/Width/Depth + meter/inch unit) that auto-calculates the Quantity field.

## Work Log
- Read worklog.md (foundation Task 1-schema-finance: DIMENSION_UNITS already exported, ProcurementFile/Stakeholder/PartSupplyEntry schemas confirmed).
- Read both target files in full (rate-finder.tsx ~1907 lines, collection.tsx ~3884 lines).
- Inspected API routes for rate-finder/discontinued (POST accepts arrays), rate-finder/rc/[id] (DELETE), procurement (GET), stakeholders (GET), collection/part-supply/[id]/entries (POST).
- Confirmed seed data: 2 PO-processed procurement files, 4 CSLOG Sailors (provost), 4 CCED Officers (QC fallback).

### rate-finder.tsx changes
- Imported `ArrowRightLeft` icon. Added `DISCONTINUE_BY_RC_TEMPLATE` constant (single-column CSV).
- Extended `DiscontinuedTabProps` with `rcItems` + `rcRefresh`; RateFinderModule passes both.
- Added new "Upload Discontinue List" button (distinct from existing "Upload Discontinued List") before the Add button.
- New `UploadDiscontinueByRateCodeDialog` component (~330 lines):
  - CSV parser handles "Rate code" header or single-column list (with optional header row); trims + de-duplicates codes case-insensitively.
  - Preview table: Rate Code, Matched Item(s) (up to 3 with supplier), Last RC Price, RC Year, Status badge ("Will move" green or "Skipped" amber). Header shows count badges (matched / total-to-move / no-match) + Reset.
  - Submit: builds discontinuePayload from matched RC items → POST bulk array to `/api/rate-finder/discontinued` → sequentially DELETEs each matched RC item via `/api/rate-finder/rc/[id]`. Success toast: "X items moved from RC list to Discontinued list".

### collection.tsx changes
- Imported `DIMENSION_UNITS` from constants, `PositionBadge` from badges, `ShoppingCart`/`Calculator`/`Ruler`/`Anchor` icons.
- Added `ProcurementFile` + `Stakeholder` interfaces, `PO_PROCESSED_POSITIONS` constant, `isPoProcessed()` helper, `formatStakeholder()` helper.
- **DashboardTab**: Added `useFetch<ProcurementFile[]>("/api/procurement")`. New "Files to be Collected" card with sticky-header table (PR Number, Item with item code/unit/project, Supplier, Qty, File Cost, PositionBadge). max-h-96 scrollable with custom scrollbar.
- **AddPartSupplyDialog**: Added `selectedPoId` state + `useFetch<ProcurementFile[]>` (only when open). "Select PO Item" Select at top auto-fills itemName, orderedQty, supplier.
- **RecordCollectionDialog**: Same pattern — auto-fills itemName, qty, receivedFrom.
- **AddEntryDialog** redesign:
  - Removed: `sailorCount`, `driverLicense`, `driverPhone` fields/inputs.
  - Added: `dimH`, `dimW`, `dimD`, `dimUnit` state. `computedQty` useMemo (H×W×D rounded to 4dp). `effectiveQty` shows computed value when dimensions present (read-only + "auto" badge), else falls back to manual `qty` input.
  - Added `useFetch<Stakeholder[]>("/api/stakeholders")`. Derived `provostSailors` (category contains "sailor" OR department contains "provost") and `ccedSailors` (category === "cced sailor" OR category/appointment contains "cced" — fallback).
  - "Provost Sailor Checked" Select (Anchor icon) — value saved into `driverName` column (repurposed).
  - "QC Checked By" Select (ShieldCheck icon) — value saved into `qcCheckedBy` column.
  - Dimension card with Ruler icon, 4-col grid (H/W/D inputs + Unit Select), help text shows cubic meters/inches.
  - Submit payload: sailorCount=0 (model default preserved), driverLicense/driverPhone=undefined.
- **Entries table + Print Receipt**: Replaced "Sailors" column (was sailorCount) and "Driver" column (was driverName + license + phone) with a single "Provost Sailor" column showing e.driverName. Print Receipt "No entries" row colspan reduced 8 → 7.

## Verification
- `npx eslint src/components/erp/modules/rate-finder.tsx src/components/erp/modules/collection.tsx` → EXIT 0, zero errors in either file. (1 pre-existing error in settings.tsx from another agent's work — `ValueAndStepTab` undefined — is unrelated.)
- Verified via curl: GET /api/procurement returns 6 files (2 PO-processed). GET /api/stakeholders returns 12 (4 sailors + 4 CCED). All endpoints 200 OK.
- dev.log shows successful compiles after edits; GET / returns HTTP 200.

## Stage Summary
- 2 files touched: rate-finder.tsx (~1907 → ~2342 lines, +435), collection.tsx (~3884 → ~4218 lines, +334). Both retain named exports (`RateFinderModule`, `CollectionModule`) + "use client" directive. All existing functionality preserved.
- All 4 parts delivered end-to-end with no TODOs/placeholders and no extra dependencies. Uses only shared ERP components + shadcn/ui + lucide-react. Semantic Tailwind classes for light/dark theme support; responsive (mobile-first, grid breakpoints, max-h scroll containers with custom scrollbar styling).
