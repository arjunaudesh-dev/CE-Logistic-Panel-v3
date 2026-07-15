# Task 4-5 — Stakeholders Navy List + Collection QCI Area Stores

## Scope
Two updates to the CE Logistic Panel ERP:

1. **stakeholders.tsx** — Navy List upload/export/clear for officer seniority, on the Officers & Sailors tab.
2. **collection.tsx** — QCI → Send to Area Stores action on the QC Inspection tab.

## Foundation context used (from prior agents)
- **Task 1-vote-auth**: `NavyListImport` Prisma model + `/api/navy-list` (GET sorted by seniority, POST bulk array that replaces all + auto-updates `Stakeholder.seniority` by name match, DELETE clears all) + seeded 7 officers.
- **Task 1-vote-settings**: `AreaStoreRecord` Prisma model + `/api/area-stores` (GET all, POST single/array with `qcInspectionId` link + `fileNumber` + `location` + `recordType` Oncharge/OffCharge + `navReference` NAV 251/NAV 255) + constants `AREA_STORES`, `AREA_STORE_CATEGORIES`, `NAV_REFERENCES`, `navRefColor`.
- **Task 3-4**: stakeholders.tsx already categorises into 5 sections (CCED Officer / CCED Sailor / CSLOG Officer / CSLOG Sailor / Officer-in-Area) and officers are already sorted by seniority ascending with a `#N` badge in a dedicated Seniority column. The Stakeholder schema already has `seniority Int?` and the POST/PUT `/api/stakeholders` routes already persist it.

## Part A — stakeholders.tsx

### New types & helpers (module-level)
- `interface NavyListRecord` — mirrors prisma model.
- `interface ParsedNavyRecord` — local shape used by the upload preview.
- `isUnranked(seniority)` → `true` for `null` OR `999` (prisma default).
- `parseCSV(text)` — RFC-4180-aware (handles quoted fields, `""` escape, CRLF).
- `csvCell`, `toCSV`, `downloadCSV` — in-browser CSV writer with Blob + auto-revoke.
- `NAVY_LIST_CSV_COLUMNS = [Name, Rank, SVCNumber, Appointment, Seniority, Department, Category]`.
- `buildNavyListTemplate()` — returns a CSV string with header + 2 sample rows.

### Officer seniority display updates
- **CategorySection table**: Name cell now shows a seniority badge right next to the name (in addition to the existing Seniority column). Ranked → violet `#N`; null/999 → muted "Unranked". Seniority column cell also updated: `#N` violet badge or "Unranked" muted badge (instead of "—").
- **StakeholderViewDialog**: seniority info row now shows "Unranked" instead of "—" for null/999.

### NavyListSection component (rendered above the categorised directory)
- Header with Ship icon + hint: "Upload the Navy List to define officer seniority. Officers will be sorted by seniority (lower number = more senior) in each officer section."
- Badges: `{count} records` + `{officerCount} officers · {rankedCount} ranked` (computed from stakeholders via `resolveCategory` + `isUnranked`).
- Buttons: Upload Navy List (Upload icon) → opens UploadNavyListDialog; View Navy List (Eye icon, disabled when count is 0) → opens ViewNavyListDialog; Clear (Trash2 icon, disabled when count is 0) → opens AlertDialog confirm → DELETE `/api/navy-list` with Loader2 spinner; `e.preventDefault()` on the action so the dialog stays open during the request.
- After upload/clear: refreshes the navy-list fetch AND calls `onStakeholdersRefresh` (parent's `refresh`) so the directory reflects the auto-updated seniorities.

### UploadNavyListDialog
- File input (`accept=".csv,text/csv"`) + "Download CSV Template" button.
- Parses CSV in-browser, detects columns by lowercased header (Name required).
- Preview table (sorted by seniority) with a green ShieldCheck icon next to names that match an existing stakeholder (uses `stakeholderNames: Set<string>` passed from parent).
- Progress bar (15/45/85/100% milestones during import).
- Success toast: "Imported X records, updated Y stakeholder seniorit(y/ies)" where Y is the count of parsed names matching existing stakeholders.
- POST `/api/navy-list` with bulk array `{name, rank, svcNumber, appointment, seniority, department, category}`.
- Calls `onImported()` → closes dialog, refreshes navy-list + stakeholders.

### ViewNavyListDialog
- GET `/api/navy-list`, sorted by seniority asc then name.
- Sticky-header table (8 columns: #, Name, Rank, SVC, Appointment, Seniority, Department, Category) inside `max-h-[55vh]` scroll container with custom scrollbar.
- Seniority rendered as `#N` violet badge or "Unranked" for 999.
- "Export CSV" button builds a CSV via `toCSV` and triggers `downloadCSV` with a date-stamped filename.

## Part B — collection.tsx

### New types & helpers (module-level)
- `interface AreaStoreRecord` — mirrors prisma model (includes `qcInspectionId`, `fileNumber`, `navReference`, `recordType`).
- `suggestStoreForCategory(category)` — iterates `AREA_STORE_CATEGORIES` entries; returns the first store whose allowed-categories contains the given category; falls back to "General". Mapping: BMS/Plumbing → BMS; Metal/Aluminium → Metal; Paint → Paint; Lubricant Oil → Oil & Lubricant; Tools/General → General.
- `isPassingQc(level)` → true for Satisfactory/Good/Excellent.

### QCInspectionTab enhancements
- New `useFetch<AreaStoreRecord[]>("/api/area-stores")` for transfer tracking.
- New `sendTarget: QCInspection | null` state.
- `transferredByInspection` Map (keyed by `qcInspectionId`, most-recent wins) + `transferredByName` Map (keyed by lowercased `itemName`, most-recent wins) via `useMemo`.
- `transferredRecordFor(i)` helper: checks by-id first, then by-name fallback.
- New "Area Store" column on the inspections table:
  - Transferred → emerald "Sent to {store}" badge + NAV-reference badge.
  - Passing (Satisfactory/Good/Excellent) → outline "Send to Store" button (Send icon) opens dialog.
  - Fail → disabled red "Rejected — cannot transfer" badge with tooltip.
- Renders `<SendToAreaStoreDialog key={`send-${id}`} />` when `sendTarget` is set (key remounts per inspection so form state resets cleanly).
- `onSent(storeName)` callback: closes dialog, toasts "Item sent to {storeName} Area Store", calls `refreshAreaStores()` so the new "Sent to" badge appears immediately on the row.

### SendToAreaStoreDialog
- Fetches `/api/stores` to find a matching `StoreItem` by description (case-insensitive exact match).
- Auto-suggests Area Store (via `suggestStoreForCategory` on the matched item's category), Item Code, Category, Unit, Unit Cost from the matched store item.
- Defaults: NAV Reference = "NAV 255" (selectable NAV 251/NAV 255), Location = "{store} Store", Date = today, Remarks = "Transferred from QCI after inspection passed", File Number = empty (user-entered QCI file number).
- Inspection summary panel (Item/Qty/QC Level/QCI Officer) at top; matched/unmatched store item hint banner (green when matched, amber when not).
- Live total cost preview in footer (qty × unitCost).
- `handleStoreChange` re-suggests category + location when the area store changes (only resets category if the current one isn't allowed for the new store).
- Validates `storeName`, `itemName`, and `qty > 0` before submit.
- POST `/api/area-stores` with body:
  ```json
  {
    "storeName": "...",
    "itemCode": "...",
    "itemName": "...",
    "category": "...",
    "unit": "...",
    "qty": N,
    "unitCost": N,
    "recordType": "Oncharge",
    "navReference": "NAV 255",
    "qcInspectionId": "<inspection.id>",
    "fileNumber": "...",
    "location": "...",
    "date": "YYYY-MM-DD",
    "remarks": "Transferred from QCI after inspection passed"
  }
  ```
- `recordType` = "Oncharge" (received INTO the area store); `navReference` = "NAV 255" (off-charge from shipping stores) — per the task spec.

## Verification
- `bun run lint` → EXIT 0 (0 errors, 0 warnings across the project).
- `npx eslint src/components/erp/modules/stakeholders.tsx src/components/erp/modules/collection.tsx` → EXIT 0.
- dev.log: home page compiles successfully (GET / 200 in 631ms); GET /api/navy-list, /api/area-stores, /api/qc all 200 OK; no errors after edits.
- curl-tested POST /api/area-stores with the dialog's body shape → 201 with computed totalCost; cleaned up test record via DELETE.
- curl-tested POST /api/navy-list with an array body → 201 {"count":1}; cleaned up and re-seeded database (POST /api/seed) so the original navy-list (7 officers) is restored.

## Constraints honoured
- Both files retain named exports `StakeholdersModule` and `CollectionModule` with `"use client"` directive.
- All existing functionality preserved (5 categorised stakeholder sections, Suppliers tab with details popup + contacts/nominations/ratings CRUD; Collection's Dashboard/Part Supply/Daily Collection/QC Inspection tabs + filters + supplier ratings + CRUD dialogs).
- Dark theme tokens (#0f1420 / #1a1f2e / #2d3548 / #3b82f6) honoured throughout.
- Responsive (mobile-first, flex-wrap toolbars, max-h scroll containers with custom scrollbar styling).
- Only shared ERP components (StatCard, badges, PageHeader, states, useFetch/apiRequest, useToast) + shadcn/ui primitives + lucide-react icons used. No TODOs/placeholders.
