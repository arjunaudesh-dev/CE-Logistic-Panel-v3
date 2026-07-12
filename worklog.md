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

---
Task ID: 1-stakeholders
Agent: Main (Stakeholders + Item Master foundation)
Task: Schema/API/AI for Stakeholders, Suppliers, Item Master

Work Log:
- Added Prisma models: Stakeholder, Supplier, SupplierContact, SupplierNomination, SupplierRating, ItemMaster
- Created API routes: /api/stakeholders (GET,POST) + [id] (PUT,DELETE); /api/suppliers (GET,POST) + [id] (GET,PUT,DELETE) + nested contacts/nominations/ratings; /api/item-master (GET,POST bulk) + [id] (PUT,DELETE) + [id]/merge (POST consolidate) + /analyze (POST AI dedup)
- Item Master analyze endpoint uses z-ai-web-dev-sdk for near-duplicate clustering with deterministic fallback (same-name-diff-code, same-code-diff-name)
- Merge endpoint consolidates duplicates into one canonical code, marks merged records, repoints StoreItems
- Added constants: CSLOG_APPOINTMENTS, CE_APPOINTMENTS, STAKEHOLDER_DEPARTMENTS/ROLES, AVAILABILITY_STATUSES, availabilityColor, departmentColor, ratingColor, ratingLabel, itemMasterStatusColor, duplicateTypeColor
- Seeded 9 stakeholders (5 CSLOG, 4 CE), 4 suppliers with contacts/nominations/ratings, 15 item-master entries (with deliberate duplicates: BMS-220/BMS-220A, MT-045/MT-045-PL, PL-118/PL-118-A)
- Added "Stakeholders" to sidebar nav (Users icon)
- Database re-seeded successfully

Stage Summary:
- All backend ready. Frontend needed: Item Code Finder full window (Stores), Stakeholders module (Officers/Sailors + Suppliers dashboard with pop-up)
- Shared helpers: useFetch, apiRequest, StatCard, badges, PageHeader, states, all new constants

---
Task ID: 3
Agent: Stakeholders Module Builder
Task: Build Stakeholders module (Officers/Sailors + Suppliers dashboard with pop-up)

Work Log:
- Read worklog.md to absorb project context, shared helpers (StatCard, PageHeader, LoadingState/ErrorState/EmptyState, CustomBadge, useFetch, apiRequest, useToast) and constants (CSLOG_APPOINTMENTS, CE_APPOINTMENTS, STAKEHOLDER_DEPARTMENTS, STAKEHOLDER_ROLES, AVAILABILITY_STATUSES, availabilityColor, departmentColor, ratingColor, ratingLabel).
- Inspected all relevant API route.ts files for /api/stakeholders (GET/POST/PUT/DELETE), /api/suppliers (GET/POST/GET-by-id/PUT/DELETE), nested /contacts, /nominations, /ratings endpoints to confirm exact request/response shapes.
- Verified via curl that GET /api/stakeholders returns 9 records (5 CSLOG, 4 CE) and GET /api/suppliers returns 4 suppliers with nested contacts[], nominations[], ratings[] (and computed avgRating/ratingCount).
- Inspected shadcn primitives (dialog, tabs, select, table, slider, progress, scroll-area, alert-dialog, button) for prop conventions; recharts usage in dashboard.tsx as reference.
- Created /home/z/my-project/src/components/erp/modules/stakeholders.tsx — named export `StakeholdersModule` with `"use client"` directive.
- Helpers: digits(), telLink(), waMeLink() (LK-aware: leading-0 numbers → +94), ratingBarColor() (for chart cells), ratingProgressClass() (for breakdown bars), formatDate().
- Main module: PageHeader + shadcn Tabs ("Officers & Sailors" | "Suppliers").
- Tab 1 (OfficersSailorsTab):
  * 4 StatCards (Total Personnel, CSLOG Dept, CE Dept, Available Now) using Users/Anchor/Wrench/ShieldCheck icons.
  * Filters bar: Search (name/SVC/appointment), Department dropdown, Appointment dropdown (combined CSLOG_APPOINTMENTS + CE_APPOINTMENTS with group separators), Role dropdown, Availability dropdown, Clear button, Add Person button.
  * Directory table with 10 columns: Name+role, Rank/Rate, Appointment badge (departmentColor), Department badge, SVC Number, Office Number, Telephone (clickable tel:), WhatsApp (clickable wa.me), Availability badge (availabilityColor), Actions (View/Edit/Delete). Row click → View dialog.
  * StakeholderFormDialog (Add/Edit): 12 fields including name/rankOrRate/svcNumber/appointment/department/officeNumber/telephone/whatsapp/email/availability/role. Department change resets appointment to avoid mismatches. POST/PUT wired.
  * StakeholderViewDialog: contact card pop-up with avatar, dept/role/availability chips, and a divided contact-rows panel (SVC, Office, Telephone → tel: link, WhatsApp → wa.me link, Email → mailto:). Edit shortcut.
  * Delete via AlertDialog confirmation → DELETE /api/stakeholders/[id].
- Tab 2 (SuppliersTab):
  * 4 StatCards (Total Suppliers, Avg Rating, Top Rated, Under Review <2.5).
  * Ratings overview BarChart (recharts) with CartesianGrid, sorted desc, each bar colored via Cell + ratingBarColor (emerald/blue/amber/red by score band), X-axis angled -15°, Y-axis 0-5 with 5 ticks.
  * Filters: search + min-rating Select (0/4.5/3.5/2.5/1.5), Clear button, Add Supplier button.
  * Suppliers table: Supplier (name + contract details sub-line), Contact Person, Telephone (tel:), WhatsApp (wa.me), Nominated Items count, Avg Rating badge (ratingColor + Star + ratingLabel), Rating Count, Actions.
  * SupplierFormDialog (Add/Edit): 10 fields including name/contactPerson/telephone/whatsapp/email/address/contractDetails/registrationNo/vatNo/bankDetails.
  * Delete supplier via AlertDialog → DELETE /api/suppliers/[id].
- SupplierDetailsDialog (centerpiece, max-w-4xl): fetches /api/suppliers/[id] live (refreshable from inside). Layout:
  * Header: avatar, supplier name, contact person, overall rating badge.
  * Section: Contract Details (DetailItem grid for contractDetails, registrationNo, vatNo, bankDetails, address, telephone (tel:), whatsapp (wa.me), email (mailto:)).
  * Section: Contact Persons — table (Name, Designation, Telephone clickable, WhatsApp clickable, Email mailto:, Primary badge, Delete button). AddContactDialog form (name/designation/telephone/whatsapp/email/isPrimary checkbox) → POST /api/suppliers/[id]/contacts. Delete → DELETE /api/suppliers/[id]/contacts/[cid] with Loader2 spinner.
  * Section: Nominated Items — responsive grid of cards (item name, code, category badge, hover-reveal delete). AddNominationDialog (itemName*/itemCode/category) → POST /api/suppliers/[id]/nominations. Delete → DELETE /api/suppliers/[id]/nominations/[nid].
  * Section: Ratings & Evaluation — big overall score tile (ratingColor border), label, count; latest breakdown (5 RatingBar progress bars for QCI/Loyalty/Professionalism/Active Engagement/Values with color-coded fills); history table (Rated At, Rated By, 5 breakdown scores, Overall badge, Remarks line-clamped, Delete); AddRatingDialog with 5 Sliders (min=1 max=5 step=0.1, numeric value shown next to each label, color-coded), live preview of computed overall + ratingLabel, ratedBy + remarks → POST /api/suppliers/[id]/ratings.
- Reusable Section wrapper (icon + colored tile + title), DetailItem (label/value + optional link), ContactRow (icon + label/value + action link), RatingBar (label + numeric value + colored progress bar), RatingSlider (Slider + numeric value), Field (label + required asterisk) helpers.
- Wired StakeholdersModule into src/app/page.tsx (`active === "stakeholders" && <StakeholdersModule />`) — nav.ts already had the "stakeholders" ModuleId with Users icon.
- All mutations call refresh() and surface success/error toasts via useToast.
- Ran `bun run lint` — 0 errors across the project (including stakeholders.tsx). Verified dev.log shows clean compiles; GET /api/stakeholders and GET /api/suppliers respond 200; POST /api/suppliers/[id]/ratings correctly computes overallScore server-side (verified with test payload then cleaned up).
- Dark theme tokens (#0f1420 / #1a1f2e / #2d3548 / #3b82f6) honored throughout via bg-card/border-border/text-foreground.

Stage Summary:
- File created: /home/z/my-project/src/components/erp/modules/stakeholders.tsx (~1.6k lines, single named export `StakeholdersModule`, `"use client"` directive).
- Two shadcn Tabs: Officers & Sailors directory (stats + filters + clickable table + contact card pop-up + Add/Edit/Delete CRUD); Suppliers directory & ratings dashboard (stats + recharts bar chart + filters + table + Add/Edit/Delete CRUD + comprehensive details pop-up).
- Centerpiece supplier details pop-up (max-w-4xl) implements a full dashboard layout: contract details, contact persons (CRUD), nominated items (CRUD), ratings & evaluation (big overall score, breakdown bars, history table, Add Rating form with 5 sliders + live preview).
- All phone numbers wired as clickable `tel:` links; WhatsApp numbers wired as `https://wa.me/<digits>` (LK-aware: leading-0 → +94).
- Reuses all shared ERP components (StatCard, PageHeader, states, CustomBadge) + constants (departmentColor, availabilityColor, ratingColor, ratingLabel, CSLOG_APPOINTMENTS, CE_APPOINTMENTS, STAKEHOLDER_DEPARTMENTS, STAKEHOLDER_ROLES, AVAILABILITY_STATUSES) + shadcn primitives + recharts (BarChart with per-bar Cell coloring) + lucide-react icons.
- Lint-clean; runtime-clean; integrates cleanly with AppShell via src/app/page.tsx.

---
Task ID: 2
Agent: Item Code Finder Full Window
Task: Build dedicated full-window Item Code Finder with deduplication + bulk upload

Work Log:
- Read worklog.md (esp. Task 1-stakeholders) for the new Item Master API routes + constants (itemMasterStatusColor, duplicateTypeColor, STORE_CATEGORIES) and shared ERP components/hook conventions.
- Read existing /home/z/my-project/src/components/erp/modules/stores.tsx (~2.8k lines) in full to map every existing piece (StoresModule, ZonesTab, StoresTab, ItemFormDialog, BulkUploadDialog, ViewItemDialog, EarmarkItemDialog, EarmarkedItemsDialog, FindItemCodeDialog) — to preserve all functionality and only swap the small FindItemCodeDialog for a full-window.
- Read /api/item-master (GET/POST bulk), /api/item-master/[id] (PUT/DELETE), /api/item-master/[id]/merge (POST), /api/item-master/analyze (POST) route.ts files to confirm request/response shapes (DuplicateGroup with source: "item-master"|"store-item", zoneName, storeItemId; MergeResponse returns mergedCount + canonicalCode; analyze uses z-ai-web-dev-sdk with deterministic + AI clustering).
- Read projects/present-position.tsx for the established full-window overlay pattern (fixed inset-0 z-50 bg-background flex flex-col + sticky header with X close + custom tab buttons + scrollable body).
- Updated imports: added lucide icons Database, GitMerge, Sparkles, Copy; added itemMasterStatusColor + duplicateTypeColor to constants import; added `import { Checkbox } from "@/components/ui/checkbox"`.
- Added new types after existing types: ItemMasterRecord, DuplicateGroupItem, DuplicateGroup, AnalyzeResponse, MergeResponse (kept old FindCodeCandidate/FindCodeResult types for safety — they are no longer referenced; no-unused-vars is off).
- Replaced the `<FindItemCodeDialog ... />` JSX block in StoresModule with `<ItemCodeMasterWindow open={findCodeOpen} onOpenChange={setFindCodeOpen} />` — the existing toolbar button "Find Item Codes (AI)" now opens the full window.
- Removed the entire old FindItemCodeDialog component + EMPTY_CANDIDATE constant + FindItemCodeDialogProps interface via `sed -i '2379,2861d'` (verified clean boundary with EarmarkedItemsDialog above and new content below).
- Appended new code (~1500 lines) implementing:
  * ItemCodeMasterWindow — fixed inset-0 overlay with header (title, subtitle, X close) + custom WindowTabButton bar (3 tabs) + scrollable body.
  * WindowTabButton — tab pill component matching present-position.tsx pattern.
  * MiniStat — small stat tile reused in all 3 sections.
  * Section A — ItemMasterDatabaseSection: fetches GET /api/item-master with live query params (search/category/status), 4 stat tiles (Total/Active/Merged/Discontinued), toolbar (search input, category Select from STORE_CATEGORIES minus "All", status Select, Add Item button), table with canonical code (mono highlighted badge), description (with "→ merged into X" sub-line), CategoryBadge, unit, alternate codes/names (muted, truncated), status badge using itemMasterStatusColor, Edit/Delete actions; ItemMasterFormDialog for add/edit (POST /api/item-master or PUT /api/item-master/[id]) with canonicalCode/description/category/unit/alternateCodes/alternateNames/status fields; DELETE with confirm + Loader2 spinner.
  * Section B — DuplicateAnalysisSection: "Run Duplicate Analysis (AI)" button → POST /api/item-master/analyze with Loader2 spinner + "10-25 seconds" hint; summary tiles (Entries Scanned, Duplicate Groups, Multi-Code/One Item, Same-Code/Near-Dup); groups rendered as cards with type badge using duplicateTypeColor, description, recommendation, items table per group (radio for canonical — disabled for store-item rows with title tooltip; Checkbox for merge — disabled for canonical & store-items; source badge Master/Store; zone column); Merge Selected button → POST /api/item-master/[canonicalId]/merge with {canonicalId, mergeIds} — on success removes the group from the list, shows toast "Merged X items into CODE", refreshes. Auto-initialises selections: first item-master item as canonical, remaining item-master items as merge candidates. Re-run Analysis button. groupKey() helper builds stable key from sorted source-id pairs so selections survive group removal.
  * Section C — BulkUploadItemMasterSection: intro card with CSV format chips (ItemCode, Description, Category, Unit) + Download CSV Template button (downloadItemMasterTemplate — Blob with 2 sample rows) + file input + Add Manual Row button; preview/edit table (row#, ItemCode, Description, Category Select from FILE_CATEGORIES, Unit, delete) — invalid rows highlighted red; Import button → POST /api/item-master with array (bulk createMany with skipDuplicates); Progress bar + success/skipped counts + error list; Clear button resets rows.
- Verified lint clean: `bun run lint` → 0 errors. Dev server log shows multiple `✓ Compiled` entries with no errors after edits.
- Verified API contracts via curl: GET /api/item-master returns the 15 seeded records with expected fields; GET /api/item-master?search=BMS returns 4 matches (BMS-220, BMS-220-SK, BMS-220A, BMS-6204); POST /api/item-master/analyze returns {totalScanned: 32, duplicatesFound: 4, groups: [multi_code_one_item ×2, same_code_diff_name ×1, near_duplicate ×1]} — the seeded BMS-220/BMS-220A duplicate is correctly detected.

Stage Summary:
- StoresModule enhanced in place at /home/z/my-project/src/components/erp/modules/stores.tsx (~3.9k lines). Component still named `StoresModule` with `"use client"` directive. Only ONE file edited (no new files created).
- The small FindItemCodeDialog is GONE; the existing "Find Item Codes (AI)" toolbar button now opens a fixed inset-0 full-window overlay titled "Item Code Master & Deduplication" with 3 tabs.
- Section A (Item Master Database): searchable/filterable table of canonical item records with full CRUD (Add/Edit/Delete) + status badges + alternate codes/names display.
- Section B (Duplicate Analysis AI): one-click AI scan detects 3 duplicate types (multi-code/one-item, same-code/different-items, AI near-duplicates); per-group consolidation with radio (canonical) + checkboxes (merge targets) → backend merge marks records as Merged + repoints StoreItems.
- Section C (Bulk Upload): CSV template download + file parse + editable preview + manual row entry + bulk POST with skipDuplicates + progress/error reporting.
- All existing Stores functionality preserved untouched: Zones tab, Stores tab (filters/sort/pagination), Add/Edit/Bulk Upload store items, View Item, Earmark Item, View Earmarked.
- Lint-clean, runtime-clean, dev server compiles successfully. Uses only shared ERP components (StatCard, badges, PageHeader, states, useFetch/apiRequest, useToast) + shadcn/ui primitives + lucide-react icons. Dark theme tokens honored throughout. Responsive (mobile-first, flex-wrap toolbars, max-h scroll containers with scrollbar-thin).
