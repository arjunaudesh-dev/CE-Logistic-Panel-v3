# CE Logistic Panel — Work Log

This file tracks work across all agents building the CE Logistic Panel ERP system.

## Project Overview
A dockyard ERP admin panel built with Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite).
Single-page app with state-based module switching (only `/` route is allowed).

## Tech & Conventions
- Dark theme (bg `#0f1420`, card `#1a1f2e`, border `#2d3548`, primary `#3b82f6`)
- shadcn/ui components in `src/components/ui/`
- ERP common components in `src/components/erp/` (StatCard, badges, PageHeader, states)
- Custom hook `useFetch` + `apiRequest` in `src/lib/use-fetch.ts`
- Constants & helpers in `src/lib/constants.ts` (PRESENT_POSITIONS, FILE_CATEGORIES, formatCurrency, positionColor, etc.)
- All components use `"use client"` where interactive
- Toast via `useToast` from `@/hooks/use-toast`

## Available Shared Components
- `@/components/erp/stat-card` → `StatCard` (label, value, icon, accent, sub)
- `@/components/erp/badges` → `PositionBadge`, `CategoryBadge`, `CustomBadge`
- `@/components/erp/page-header` → `PageHeader` (title, description, icon, actions)
- `@/components/erp/states` → `EmptyState`, `LoadingState`, `ErrorState`
- `@/components/erp/app-shell` → `AppShell` (sidebar + topbar wrapper)
- `@/lib/use-fetch` → `useFetch<T>(url)` returns `{data, loading, error, refresh}`; `apiRequest(url, method, body)` returns `{ok, data, error}`

## API Endpoints (all under /api)
- `/api/stats` GET — dashboard stats
- `/api/seed` POST — seed sample data
- Projects: `/api/projects` (GET,POST), `/api/projects/[id]` (GET,PUT,DELETE), `/api/projects/[id]/files` (GET,POST), `/api/projects/[id]/files/[fileId]` (PUT,DELETE), `/api/projects/[id]/allocations` (GET,POST)
- Procurement: `/api/procurement` (GET,POST; query params: supplier,position,category,project), `/api/procurement/[id]` (PUT,DELETE), `/api/procurement/[id]/logs` (GET,POST)
- Stores: `/api/stores` (GET,POST; query: zone,category,stock,search), `/api/stores/[id]` (PUT,DELETE), `/api/stores/zones` (GET)
- Rate Finder: `/api/rate-finder/rc` (GET,POST; query: category,year,search; POST supports array bulk), `/api/rate-finder/rc/[id]` (DELETE), `/api/rate-finder/discontinued` (GET,POST), `/api/rate-finder/discontinued/[id]` (DELETE)
- Collection: `/api/collection/items` (GET,POST), `/api/collection/part-supply` (GET,POST), `/api/collection/part-supply/[id]` (GET,PUT,DELETE), `/api/collection/part-supply/[id]/entries` (POST), `/api/collection/daily` (GET,POST; query: date,from,to)

## Completed Work
- Foundation: Prisma schema, dark theme globals.css, layout.tsx, constants, use-fetch hook
- All API routes created and working
- Database seeded with sample data
- App Shell (sidebar + topbar) created
- Dashboard module created
- Projects module created (dashboard, present position window, file register, file log timeline, allocations)
- Procurement module — PENDING
- Stores module — PENDING
- Rate Finder module — PENDING
- Collection module — PENDING

---
Task ID: 5
Agent: Procurement Module Builder
Task: Build the Procurement Files module

Work Log:
- Read worklog.md to understand shared components, API endpoints, and design conventions
- Inspected existing Projects module (page-header, file-log, present-position, add-project) for design patterns (timeline, file form, sortable table)
- Inspected API routes for /api/procurement (GET/POST), /api/procurement/[id] (PUT/DELETE) and /api/projects (GET) to confirm field shapes
- Confirmed shared ERP components: StatCard, PositionBadge/CategoryBadge, PageHeader, LoadingState/ErrorState/EmptyState, useFetch/apiRequest, constants (PRESENT_POSITIONS, FILE_CATEGORIES, formatCurrency)
- Created /home/z/my-project/src/components/erp/modules/procurement.tsx (named export ProcurementModule) implementing:
  * PageHeader with FileText icon + "Add File" action button
  * 4 StatCards: Total Files, Pending Collection (Order Placed/Items Dispatched/In Transit/Part Supply), Items Received, Total File Cost
  * Specialized filters bar: search input, Supplier/Project/Position/Category dropdowns, date range with quick presets (Today/This Week/This Month), Clear Filters button
  * Files Table with 12 columns (PR Number, Project, Item Code, Item Name, Unit, Qty, Unit Price, File Cost, Supplier, Position badge, Category badge, Actions) wrapped in horizontally scrollable container
  * Sortable headers (File Cost + PR Number) with chevron indicators
  * Pagination: 15 rows per page with prev/next buttons + "Page X of Y"
  * Row click opens File Log dialog
  * Per-row actions: Update Position (small dialog with Select + comment + changedBy → PUT /api/procurement/[id]), View Log (file log dialog), Export CSV (single-row CSV download)
  * Add File dialog: Project Select (auto-fills vote number read-only), PR Number, Item Code, Item Name, Unit, Qty, Unit Price, File Cost (auto if empty), Supplier, Present Position, File Category → POST /api/procurement
  * File Log dialog: details grid (15 fields) + vertical timeline of logs (colored dots, position badges, changedBy, comment, timestamp)
  * EmptyState + filtered-empty state with "Clear Filters" action
- Used conditional rendering for Update Position dialog (mounted on demand) so form state initializes cleanly from file prop without setState-in-effect lint violations
- Responsive grid (2 cols mobile → 4 cols desktop for stats; 1→2→3→5 cols for filters); scrollbar-thin class on horizontal table container
- Ran `bun run lint` — 0 errors in procurement.tsx (4 remaining pre-existing errors in app-shell.tsx and use-fetch.ts, not related to this task)

Stage Summary:
- ProcurementModule complete and lint-clean
- Reuses all shared ERP components (StatCard, badges, PageHeader, states) and constants
- Full CRUD coverage: list (with client-side filter/sort/paginate), create (Add File dialog), update (Update Position dialog), export (CSV per row)
- File Log timeline matches the pattern established by Projects module's FileLogDialog for visual consistency
- Ready to be consumed by `<ProcurementModule />` in src/app/page.tsx (already wired)

---
Task ID: 7
Agent: Rate Finder Module Builder
Task: Build the Rate Finder module

Work Log:
- Read worklog.md, constants, use-fetch, stat-card, badges, page-header, states, dialog/select/tabs/table components and Prisma schema for RateContract & DiscontinuedItem models.
- Inspected existing projects.tsx and add-project.tsx for component/dialog conventions.
- Created src/components/erp/modules/rate-finder.tsx with named export RateFinderModule ("use client").
- Built two shadcn Tabs: RC | Discontinued, plus two StatCards (Total RC Items, Total Discontinued) at top.
- Implemented a custom CSV parser (quoted fields, "" escape, CRLF, trailing newline) without any extra packages.
- RC tab: debounced search (item name/code), Category (RATE_CATEGORIES) / Year / Supplier filters (all derived from data), Clear-filters button, sticky-header horizontal-scroll table, CategoryBadge column, per-row Compare button when an itemCode spans multiple years (grouped via useMemo).
- CompareDialog: summary tiles (years / price range / change %), recharts BarChart with CartesianGrid + Tooltip, plus a year-by-year detail table.
- AddRCDialog: single-entry form posting to /api/rate-finder/rc.
- UploadRCDialog: hidden file input → CSV parse → preview table → downloadable CSV template button → bulk POST array.
- Discontinued tab: Year selector derived from lastRCYear (with "All Years" option), Add & Upload buttons, table with formatted lastRCPrice, lastRCYear, discontinuedDate, reason, alternatives as clickable emerald CustomBadge chips (split on , or ;), per-row delete.
- AddDiscontinuedDialog and UploadDiscontinuedDialog follow the same pattern as their RC counterparts.
- All async actions wired to useToast (success + destructive error variants); Loader2 spinners for delete/save/upload states.
- Sticky-footer, responsive layout, dark theme tokens (bg-card / border-border / text-foreground) consistent with the rest of the ERP.
- Verified: `npx eslint src/components/erp/modules/rate-finder.tsx` passes with 0 errors. The remaining 4 lint errors are pre-existing in app-shell.tsx and use-fetch.ts (other agents' files).

Stage Summary:
- RateFinderModule complete and production-ready in src/components/erp/modules/rate-finder.tsx.
- Full CRUD wired for both RC and Discontinued: GET list, POST single, POST bulk array, DELETE by id.
- CSV bulk upload (with downloadable template + preview) and year-over-year price comparison chart (recharts BarChart) both implemented.
- No TODOs, no placeholders, no extra dependencies installed.

---
Task ID: 8
Agent: Collection Module Builder
Task: Build the Collection module

Work Log:
- Read project context (worklog.md, use-fetch.ts, constants.ts, shared erp components) and existing collection API routes (items, part-supply, part-supply/[id]/entries, daily) plus prisma schema to confirm data shapes.
- Inspected dashboard.tsx and projects.tsx for design conventions (dark theme tokens, StatCard / PageHeader usage, recharts styling).
- Built `/home/z/my-project/src/components/erp/modules/collection.tsx` — single named export `CollectionModule` with shadcn `Tabs` (Dashboard | Part Supply | Daily Collection).
  - DashboardTab: 3 StatCards (Items to be Received — blue PackageX, qty expected sub; Part Supply Items — amber Layers, active orders count; Collected Items — green PackageCheck, today's count sub). recharts LineChart (qty over last 7 days derived from daily data) + PieChart (collection items by status, colored using COLLECTION_STATUSES order). Recent activity feed (last 5 daily collections showing itemName/qty/receivedFrom/date).
  - PartSupplyTab: Add Part Supply Order dialog (POST /api/collection/part-supply). Expandable cards via local `expandedId` state. Header shows Item/Ordered/Received/Balance + % Complete progress bar (green >90%, amber >=50%, red <50%) + status badge. Expanded body has summary bar, delivery entries Table (Sr/Date/Vehicle/Qty/QC By/Sailors/Driver name+license+phone/Cum. Bal.), Add Entry dialog (POST /api/collection/part-supply/[id]/entries — API auto-calculates srNo & cumulativeBalance & updates order receivedQty/balance/status), Print Receipt dialog with embedded `@media print` style block (showCloseButton=false, no-print on header/footer). Completed orders greyed (opacity-70) but still expandable.
  - DailyCollectionTab: Filter buttons (All/Today/Yesterday/Custom/Range) that build `?date=` / `?from=&to=` query. View-mode toggle (By Date | By Period | By Supplier) with ISO-week grouping for period. Record Collection dialog (single) + Bulk Record dialog (multi-select pending items from /api/collection/items where status !== Collected, with shared date+qty+recordedBy → POST array to /api/collection/daily). CSV export of current filtered data via Blob download. Summary badges + grouped list with max-h-96 scroll and custom webkit-scrollbar styling.
- Used shared helpers (`useFetch`, `apiRequest`, `useToast`, `formatNumber`, `COLLECTION_STATUSES`, `PART_SUPPLY_STATUSES`), shadcn primitives (Tabs, Dialog, Button, Input, Label, Checkbox, Table, etc.), lucide-react icons, recharts (LineChart/PieChart/Cell/Tooltip/etc.), and `cn`. Dark theme tokens (#0f1420 / #1a1f2e / #2d3548 / #3b82f6) honored throughout.
- Ran `bun run lint` — zero issues attributable to this file. (4 pre-existing errors live in app-shell.tsx and use-fetch.ts, untouched.)
- Verified dev server log — no compile/runtime errors referencing the collection module.

Stage Summary:
- File created: `/home/z/my-project/src/components/erp/modules/collection.tsx` (~1100 lines, single named export `CollectionModule`).
- Three sub-tabs implemented end-to-end: stat cards, line + pie charts, recent feed; expandable part-supply cards with entries table, add-entry dialog, and printable receipt; daily collection with date/period/supplier grouping, filters, bulk record, and CSV export.
- All mutations call `refresh()` and surface toasts via `useToast`.
- Component is already wired into `src/app/page.tsx` (`active === "collection" && <CollectionModule />`).

---
Task ID: 6
Agent: Stores Module Builder
Task: Build the Store Management module

Work Log:
- Read worklog.md, constants.ts, use-fetch.ts, shared ERP components (StatCard, badges, PageHeader, states) and the existing stores API routes (/api/stores, /api/stores/[id], /api/stores/zones) to align with project conventions.
- Studied existing modules (dashboard.tsx, projects.tsx, add-project.tsx) and shadcn/ui primitives (Tabs, Dialog, Select, Table, Progress) for styling and prop conventions.
- Created /src/components/erp/modules/stores.tsx with a named `StoresModule` export and `"use client"` directive.
- Built Zones tab (dashboard view): fetches /api/stores/zones, renders a responsive grid of zone tiles whose minHeight scales with totalValue (120 + min(value/100000, 80)), colour-coded by lowStockCount (green=healthy, amber=attention, red=critical), each tile showing stock value, item count and 4 stat chips (running out / received / to collect / non-moving). Clicking a tile switches to Stores tab and applies that zone as a filter.
- Built Stores tab (detailed inventory): top stat cards (NET/TASK/AVAIL/TEAM using StatCard), category tabs (STORE_CATEGORIES), search-by-description input, zone filter dropdown (from /api/stores/zones), stock-level filter (All/In/Low/Out/Overstock), sort dropdown (Description/Qty/Cost/Category) plus asc/desc toggle, sticky-header table inside a max-h-[60vh] overflow-auto container with columns Description, Category, Unit, Qty (with ⚠ Low / Out warnings), Cost (with @unit price), Location, Actions (View 👁 / Edit ✏), and pagination at 25 per page.
- Built Add/Edit Item dialog (ItemFormDialog) with all required fields (Description*, Category from FILE_CATEGORIES, Unit, Qty, Unit Cost, Location, Min/Max Stock, Supplier, Item Code, ILMS Code, Zone from zones). Auto-calculates total cost = qty × unitCost. POSTs to /api/stores or PUTs to /api/stores/[id]. Uses a `key` prop + useState initialiser pattern (no setState-in-effect) so the form resets cleanly when the editing target changes.
- Built Bulk Upload dialog (BulkUploadDialog) with CSV template download (in-browser Blob with the 10 required columns + 2 sample rows), a file input, an RFC-4180-aware CSV parser, sequential POST to /api/stores per row, live Progress bar, success/failure counters and an error list. Calls refresh on completion.
- Built View Item dialog (ViewItemDialog) showing the full record with a low/out-of-stock warning banner and an Edit shortcut.
- Used `useFetch` for GETs and `apiRequest` for mutations; calls refresh() on items + zones after every mutation.
- Wrapped all filter setters so any filter change also resets pagination to page 1 (no useEffect / no ref-during-render — passes `react-hooks/refs` and `react-hooks/set-state-in-effect` rules).
- Verified with `bun run lint`: stores.tsx produces zero lint errors (the 4 remaining errors are pre-existing in app-shell.tsx and use-fetch.ts).
- Verified via curl that /api/stores and /api/stores/zones return data shaped exactly as the component expects; dev.log shows both endpoints responding 200 OK.

Stage Summary:
- StoresModule component delivered at /home/z/my-project/src/components/erp/modules/stores.tsx (~1.8k lines, single file, no TODOs).
- Two sub-tabs: Zones (dashboard with scaled, colour-coded tiles) and Stores (filterable, sortable, paginated inventory table).
- Full CRUD: Add, Edit, View, plus Bulk CSV upload with template + progress.
- Fully typed (TypeScript), dark-theme styled, responsive (mobile-first), uses only shared ERP components and shadcn/ui primitives.
- Lint-clean for the new file; integrates cleanly with the existing AppShell (StoresModule is already wired into src/app/page.tsx).

---
Task ID: 1-enhance
Agent: Main (Foundation + AI)
Task: Schema/API/AI foundation for enhancements

Work Log:
- Added new Prisma models: Estimate, EstimateItem, EarmarkedItem, QCInspection
- Added Project fields: benefactor, reference (EDC reuses endDate field)
- Created AI lib (src/lib/ai.ts): processEstimateWithAI() + findItemCodesWithAI() using z-ai-web-dev-sdk with deterministic fallbacks
- Created API routes: /api/estimates (GET,POST), /api/estimates/[id] (GET,DELETE), /api/estimates/[id]/process (POST - AI), /api/estimates/[id]/items/[itemId] (POST - Initiate File), /api/earmarked (GET,POST), /api/earmarked/[id] (DELETE), /api/qc (GET,POST), /api/qc/[id] (PUT,DELETE), /api/stores/find-code (POST - AI)
- Updated /api/projects POST/PUT to accept benefactor + reference
- Updated /api/stats to return topProjects (most active/valued), estimates count, earmarks, qc counts
- Updated /api/seed with sample estimate, earmarked items, QC inspections, project benefactor/reference
- Added constants: REFERENCE_TYPES, QC_LEVELS, qcLevelColor, estimateStatusColor, confidenceColor
- Re-seeded database successfully

Stage Summary:
- All backend foundation ready. AI endpoints use z-ai-web-dev-sdk server-side.
- Frontend modules need updating: Dashboard (top projects + toggle), Projects (full-window + wizard + estimates), Stores (earmarked + find-code), Collection (filters + QC section)
- Shared helpers available: useFetch, apiRequest, StatCard, badges, PageHeader, states, constants

---
Task ID: 4
Agent: Stores Enhancement
Task: Add Earmarked Items + AI Item Code Finder to Stores module

Work Log:
- Read worklog.md and the existing /src/components/erp/modules/stores.tsx (~1.8k lines) in full to understand existing structure (Zones/Stores tabs, ItemFormDialog, BulkUploadDialog, ViewItemDialog) and preserve it.
- Confirmed Task 1-enhance deliverables: /api/earmarked (GET/POST/DELETE), /api/stores/find-code (POST AI), confidenceColor helper in @/lib/constants, plus /api/projects (GET) shape.
- Verified backend route signatures by reading route.ts files: earmarked POST accepts {storeItemId?, itemDescription, itemCode?, projectId, projectName, qty, unit, authority, remarks}; find-code returns [{description, suggestedItemCode, isDuplicate, duplicateOf, existingCodes, confidence, recommendation}]; stores PUT /[id] preserves unspecified fields via `?? existing.X` so applying just {itemCode} is safe.
- Added new imports to stores.tsx: Textarea, Tooltip/TooltipTrigger/TooltipContent, lucide icons (Bookmark, BookmarkPlus, List, ScanSearch, Trash2, Wand2, Check, RefreshCw), and confidenceColor from constants.
- Added new types: EarmarkedItem, ProjectOption, FindCodeCandidate, Confidence, FindCodeResult.
- Added 3 new dialog state hooks in StoresModule: earmarkOpen, earmarkListOpen, findCodeOpen.
- Extended PageHeader actions with 3 new buttons (wrapped in a flex-wrap div for responsive layout): "Find Item Codes (AI)" (ScanSearch), "View Earmarked" (List), "Earmark Item" (BookmarkPlus) — placed before the existing Bulk Upload + Add Item buttons. All existing functionality untouched.
- Rendered 3 new dialogs at the bottom of StoresModule, wired to refresh items+zones where needed.
- Implemented EarmarkItemDialog: Select of existing store items (or "Manual entry") that auto-fills description+itemCode+unit; required Item Description, Project Select (fetches /api/projects only when dialog opens), Qty, Authority; optional Item Code, Unit, Remarks textarea; POSTs to /api/earmarked with the exact body shape; resets form on close (skips reset while saving). Toast "Item earmarked" on success.
- Implemented EarmarkedItemsDialog: fetches /api/earmarked only when open; renders a sticky-header Table (Item Description, Item Code, Project, Qty+Unit, Authority, Remarks, Actions) inside a max-h-[60vh] scroll container; per-row Delete button (Trash2) → DELETE /api/earmarked/[id] with Loader2 spinner on the deleting row; Refresh button; EmptyState + LoadingState + ErrorState handling.
- Implemented FindItemCodeDialog (AI Item Code Finder): editable candidate table (Description*, Category, Unit, Cost, remove-row) with "Load from current store items" (Boxes icon, maps store items keeping their storeItemId) and "Add Row" buttons; "Run AI Matching" button POSTs to /api/stores/find-code with Loader2 spinner; results table with columns Description (with "Manual entry" tag for rows lacking storeItemId), Suggested Code (highlighted primary badge), Is Duplicate (Yes=red/No=green CustomBadge), Duplicate Of, Existing Codes (comma list), Confidence (confidenceColor badge), Recommendation, Action. Duplicate rows get border-l-4 border-l-red-500/60 + bg-red-500/[0.04]. Apply button: if suggestedItemCode exists and storeItemId present → PUT /api/stores/[id] with {itemCode} and shows "Applied" with Check icon (disables further clicks); if no suggestedItemCode → "No code"; if manual entry (no storeItemId) → disabled Apply button wrapped in a Tooltip "Manual entry — create item first". Toast per Apply + onApplied callback refreshes parent store list.
- Ran `npx eslint src/components/erp/modules/stores.tsx` → 0 errors. `bun run lint` shows only pre-existing 1 error + 5 warnings in collection.tsx (other agent's file, untouched).
- Verified dev.log: file compiled successfully (multiple "✓ Compiled" entries after edits, no errors).
- Verified API shapes via curl: GET /api/earmarked returns [{id, storeItemId, itemDescription, itemCode, projectId, projectName, qty, unit, authority, remarks, createdAt}, ...] — matches EarmarkedItem type. POST /api/stores/find-code returns [{description, suggestedItemCode, isDuplicate, duplicateOf, existingCodes, confidence, recommendation}] — matches FindCodeResult type.

Stage Summary:
- StoresModule enhanced in-place at /src/components/erp/modules/stores.tsx (now ~2.8k lines). Component still named `StoresModule` with `"use client"` directive.
- Feature A "Earmarked Item" delivered: toolbar button + dialog form (manual entry or pick from store items) + View Earmarked dialog with table + delete. POST/GET/DELETE wired to /api/earmarked.
- Feature B "Item Code Finder (AI)" delivered: toolbar button + dialog with editable candidate table, "Load from current store items" + "Add Row", "Run AI Matching" → POST /api/stores/find-code, results table with suggested code, duplicate flag (red left border + badge), duplicateOf, existingCodes, confidence badge (confidenceColor), recommendation, and per-row Apply (PUT /api/stores/[id]) with manual-entry tooltip disable.
- All existing functionality (Zones tab, Stores tab with filters/sort/pagination, Add/Edit/Bulk Upload/View) preserved untouched.
- Lint-clean for stores.tsx; responsive (mobile-first, flex-wrap toolbar, max-h scroll containers with scrollbar-thin); dark theme tokens honored; uses only shared ERP components + shadcn/ui primitives + lucide-react icons.

---
Task ID: 5
Agent: Collection Enhancement
Task: Add filters + QC Inspection section to Collection module

Work Log:
- Read worklog.md (foundation Task 1-enhance context), the existing collection.tsx (~2k lines, 3 tabs: Dashboard / Part Supply / Daily Collection), constants.ts (QC_LEVELS, qcLevelColor, FILE_CATEGORIES, formatCurrency), use-fetch.ts, QC API routes (/api/qc GET/POST, /api/qc/[id] PUT/DELETE), QCInspection prisma schema, and confirmed shapes of /api/projects, /api/stores, /api/collection/* via curl.
- Enhancement A — Dashboard filter bar + view toggle:
  * Added 4-column filter bar at the top of DashboardTab: By Project (Select from /api/projects), By Vote (Select from unique voteNumbers), By Type (Select from FILE_CATEGORIES minus GEN), and a By Numbers / By Value toggle.
  * Added module-level pure helpers (so the React Compiler preserves manual memoization): `looselyMatches`, `applyProjVoteFilter`, `applyTypeFilter`, `unitCostFor`, `valueFor`. Each takes the needed lookup Maps as explicit parameters.
  * Built `storeByName` map (description → StoreItem), `projectById`, `projectByVote`, and `votes` lookups via useFetch + useMemo.
  * Project/vote filter: loosely matches the row's supplier/receivedFrom against the selected project name; falls back to showing all if no rows match (per spec).
  * Type filter: looks up item name in stores; only includes rows whose store category matches the selected type (excludes items not in stores when a type is set).
  * View toggle: By Numbers shows counts via formatNumber; By Value computes value = qty × unitCost (unitCost looked up from stores by item name; 0 if not found) and displays via formatCurrency.
  * Filters apply to: 3 stat cards (counts ↔ values), trend line chart (qty ↔ value with formatted YAxis + Tooltip), status pie chart (count ↔ value), and the recent activity feed.
  * Added "Clear" button when any filter is active; EmptyState copy adapts to whether filters are active.
- Enhancement B — QC Inspection tab (NEW):
  * Added a 4th tab "QC Inspection" to the CollectionModule Tabs (grid-cols-4, max-w-2xl) with ShieldCheck icon.
  * QCInspectionTab: 4 top stat cards (Total Inspections, Passed = Satisfactory+Good+Excellent, Failed, Pass Rate %).
  * "New QC Inspection" button opens QCInspectionDialog (keyed by editing id or "new" so form state resets cleanly on open).
  * QCInspectionDialog (Create + Edit):
    - Reference Type Select (Daily Collection / Part Supply Entry / Collection Item) from QC_REF_TYPES; disabled in edit mode.
    - Reference Select fetches the appropriate endpoint (/api/collection/daily, /api/collection/part-supply, /api/collection/items) based on refType (only in create mode via conditional useFetch URL). Options are flattened/labelled per spec (e.g. `${itemName} — ${qty} ${date} (${receivedFrom})`).
    - Selecting a reference auto-fills itemName, supplier, qty (all still editable in create mode; read-only in edit mode since PUT only updates qcLevel/officer/remarks).
    - When refType changes (create mode), the dependent fields are reset in the onValueChange handler (NOT in a useEffect) to satisfy the react-hooks/set-state-in-effect rule.
    - QC Level Select from QC_LEVELS constant.
    - QCI Officer Name (required) + QCI Officer Details (optional, e.g. "QC Bay 2").
    - Remarks Textarea — mandatory when QC Level is "Fail"; shows a red "Remarks required when Fail" hint, red asterisk, and red border when Fail + empty. Submit is blocked client-side with a destructive toast if Fail + empty remarks (also enforced server-side as a 400).
    - Submit: POST /api/qc (create) or PUT /api/qc/[id] (edit, only sends qcLevel/qcOfficer/qcOfficerDetails/remarks).
  * Inspections table: Inspected At (formatted date), Item (with refType caption), Supplier, Qty, QC Level badge (uses qcLevelColor from constants), QCI Officer (with details sub-line), Remarks (line-clamp-2), Actions (Edit pencil, Delete trash).
  * Delete uses an AlertDialog confirmation (red destructive action button) with Loader2 spinner while deleting.
  * Supplier Rating Summary card: aggregates inspections by supplier, maps levels to numeric (Fail=1, Below Average=2, Satisfactory=3, Good=4, Excellent=5), shows each supplier's average score (e.g. 4.20 / 5.00), count of inspections, color-coded rating badge (supplierRatingColor) + label (supplierRatingLabel), and a Progress bar. Sorted by avg descending.
- Preserved all existing functionality (Part Supply tab, Daily Collection tab, all dialogs) unchanged.
- Imports expanded: added Select/SelectContent/SelectItem/SelectTrigger/SelectValue, Textarea, Progress, AlertDialog family, formatCurrency, FILE_CATEGORIES, QC_LEVELS, qcLevelColor, and icons (ShieldCheck, ClipboardCheck, Pencil, Trash2, Loader2, Filter, AlertCircle, Star, X).
- Ran `bun run lint` — 0 errors, 0 warnings in collection.tsx (and the wider project). Verified /api/qc POST 201 + 400 validation + DELETE 200 via curl. Dev log shows clean compiles with no runtime errors.

Stage Summary:
- Collection module enhanced in place at /home/z/my-project/src/components/erp/modules/collection.tsx (~3.3k lines).
- Two new capabilities shipped: (A) Dashboard filter bar with 3 Selects + By Numbers/By Value toggle that re-derives stat cards, trend chart, pie chart, and recent feed; (B) QC Inspection tab with full CRUD (create/edit dialog, delete confirm), 4 stat cards, color-coded QC level badges, and a supplier rating summary that evaluates suppliers on a 1–5 scale.
- All shared helpers, shadcn primitives, recharts, and the dark theme are reused; no new files created; no new dependencies.
- Lint-clean and runtime-clean.
