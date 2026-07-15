# Task 2 — Projects + Procurement Multi-Select + Cost Columns + Estimate Fix

## Summary
Updated 5 files in the Projects + Procurement modules to add checkbox multi-select
for bulk "Initiate" actions, added Cost + File Cost columns to the file registers,
renamed "Estimate Cost" → "Unit Cost" everywhere in the estimate UI, fixed the
divided-by-qty bug, and ensured no re-routing occurs after initiating a file from
the estimate items table.

## Files Modified
1. `src/components/erp/modules/projects/present-position.tsx` — Projects file register
2. `src/components/erp/modules/projects/estimate-items.tsx` — Estimate items table (PR from Estimate tab + Step 2 of wizard)
3. `src/components/erp/modules/projects/initiate-file.tsx` — Single-item Initiate File dialog
4. `src/components/erp/modules/projects/add-project-wizard.tsx` — CSV template + editable grid (Step 1)
5. `src/components/erp/modules/procurement.tsx` — Procurement files table

## Pre-existing Bug Fixed (out of scope but blocking)
- `src/components/erp/modules/settings.tsx` line 3632: a `.map((s, idx) => { ... return (...) })`
  block was being closed with `))}` instead of `);})}` — caused a parsing error that
  blocked the entire home page with HTTP 500. Fixed by correcting the closing syntax
  so the dev server could compile again. (This was uncommitted work from a previous
  agent's schema-finance task; not introduced by my work.)

## Highlights
- **Multi-select**: Checkbox column as the first column in both the Projects file
  register and the Procurement files table. Group headers also have a checkbox that
  toggles all items in the group. Header has a "Select All" checkbox (with
  indeterminate state for partial selection).
- **Selection bar**: A floating bar appears above the table when items are selected,
  showing the count + Clear + Initiate Selected buttons.
- **Bulk Initiate Dialog**: For Projects/Procurement, the dialog asks for the target
  position + Changed By + Comment, then bulk-PUTs all selected files. For Estimate
  items, the dialog asks for PR Number (auto-suggested from /api/number-prefixes
  PR entry), File Number, File Group Key, Authorized By (officer), Created By (sailor)
  — same values reused across all selected items so they collapse into a single
  grouped file in the PR Raised Files window.
- **Cost + File Cost columns**: New "Cost" column showing `unitPrice × qty` (per-item
  cost). Existing "File Cost" column retained (shows the stored fileCost). For
  grouped rows, Cost shows "varies" and File Cost shows the summed total.
- **Unit Cost rename**: All "Approx Cost" / "Estimate Cost" / "Est. Cost / Unit"
  labels renamed to "Unit Cost". Added a "Total Cost" column showing
  `Unit Cost × Qty`. Removed the buggy `approxCost / qty` calculation in
  estimate-items.tsx and initiate-file.tsx — `approxCost` is already per-unit
  (RC rate or estimateCost per the AI lib / API route).
- **No re-routing**: The InitiateFileDialog toast now reads
  "File initiated — {prNumber} / PR raised successfully. Item status updated below."
  (removed the old "forwarded to project window" wording). The dialog still closes
  + refreshes the estimate items table so the user stays on the same tab.
- **CSV template**: `ItemName,Qty,Unit,UnitCost,TotalCost` (renamed EstimateCost →
  UnitCost). Parser accepts both `UnitCost` and the legacy `EstimateCost` header
  for backward compatibility.

## Lint Status
`bun run lint` → 0 errors, 0 warnings across the whole project.

## API Endpoints Used
- `GET /api/projects/[id]/files` — fetches project files (has unitPrice, qty, fileCost, fileGroupKey)
- `PUT /api/projects/[id]/files/[fileId]` — bulk-update selected files' presentPosition
- `GET /api/procurement` — fetches procurement files
- `PUT /api/procurement/[id]` — bulk-update selected procurement files' presentPosition
- `POST /api/estimates/[id]/items/[itemId]` — initiate a PR from an estimate item (used in bulk loop)
- `GET /api/number-prefixes` — auto-suggests the next PR number
- `GET /api/stakeholders` — fetches officers + sailors for the bulk initiate dialog selects
