# Task ID: 2 — Projects Step1 Funds + Step2 Show All + Group By File

**Agent:** Projects Step1 Funds + Step2 Show All + Group By File
**Task:** Update the Projects module wizard — Funds checkbox (Step 1) + show-all sortable items + group-by-file view (Step 2) + fileGroupKey support (Initiate File)

## Files modified
1. `/home/z/my-project/src/components/erp/modules/projects/initiate-file.tsx` (PART C — fileGroupKey field in dialog + POST body)
2. `/home/z/my-project/src/app/api/estimates/[id]/items/[itemId]/route.ts` (PART C — fileGroupKey added to ProjectFile.create)
3. `/home/z/my-project/src/components/erp/modules/projects/add-project-wizard.tsx` (PART A — Funds checkbox + conditional Vote Number + validation)
4. `/home/z/my-project/src/components/erp/modules/projects/estimate-items.tsx` (PART B — sortable headers + show-all scrollable table + group-by-file toggle + expandable group cards)

## What was delivered

### PART A — Add Project Wizard Step 1: Funds checkbox + conditional Vote Number
- Replaced the Financial Mean dropdown with a "Funds" checkbox (`@/components/ui/checkbox`) — NOT mandatory. Imports updated: added `Checkbox` from shadcn/ui, added `Wallet` icon from lucide-react, removed unused `FINANCIAL_MEANS` constant import.
- Added a `FUND_OPTIONS` const = `["Malima Fund", "Non-Public Fund", "Contractual"]`.
- Added `fundsChecked` boolean state; `handleFundsToggle(checked)` sets the state and updates `form.financialMean` (defaults to "Malima Fund" when checked, "Vote/Funds" when unchecked), clears `voteNumber`, `voteAllocation`, `selectedVoteId`, `customVoteNumber`.
- When Funds is CHECKED: shows a small fund Select (Malima/Non-Public/Contractual). `form.financialMean` saves the selected fund. Vote Number label shows "(optional)" and the vote sub-select dropdown is hidden; instead a manual text input is shown with placeholder ("CONTRACTUAL" or "NON-NAVAL") + amber Landmark hint describing the funding source.
- When Funds is UNCHECKED: keeps the existing vote sub-select dropdown (fetches `/api/votes`), the "Enter custom vote number" toggle, and the manual input fallback. Vote Number label shows "*".
- Updated `handleSaveAndProcess` validation: now requires `form.name` first (separate toast); then if `!fundsChecked && !form.voteNumber.trim()`, blocks submit with toast "Vote Number is required" + description "Tick the Funds checkbox for non-vote funding (Malima/Non-Public/Contractual)." — matches the spec wording.
- `handleGoToProject` reset now also resets `fundsChecked` to `false` and `form.financialMean` to "Vote/Funds".
- All other Step 1 fields (Project Type, Reference, Vote Allocation, Benefactor, Start/EDC dates, Officer, Status, Description) and the Material Estimate section (download template, upload CSV with preview, add/remove rows, mandatory-estimate enforcement) preserved untouched.
- Step 2 (EstimateItemsTable with AI Process button + Go to Project Window) preserved.

### PART B — Estimate Items Table: show-all + sorting + group-by-file
- Removed the shadcn `ScrollArea` wrapper (which was capping visibility on long lists). Replaced with a plain `<div className="max-h-[60vh] overflow-auto scrollbar-thin">` wrapper as required by the spec — every item is now rendered, every "Initiate File" button is reachable.
- Added sortable column headers (Sr, Item Name, Item Code, Qty, Approx Cost) via a new `SortHeader` helper component that shows `ChevronUp` (asc), `ChevronDown` (desc), or `ChevronsUpDown` (inactive, dimmed). Clicking toggles asc/desc when same column, or switches to the new column with asc default. Default sort: Sr No asc.
- Sorting state (`sortKey`, `sortDir`) lives in `EstimateItemsTable` and is passed down to each `ItemsSection` — one preference shared across the 3 sections.
- Sticky table header (`sticky top-0 z-10 bg-secondary/95 backdrop-blur`) so column headers remain visible while scrolling through long lists.
- Added a "Group by File" toggle button at the top of the table — disabled when there are no initiated items; toggles `groupByFile` state. When enabled, items WITH a `prNumber` (or `fileNumber`) get grouped into expandable group cards; items WITHOUT a `prNumber` remain as individual rows.
- New `GroupCard` component: expandable card showing the common PR/File Number (primary badge, mono), item count, total qty, common RC Supplier (if shared across all items), common RC Number (if shared, RC section only), common File Number (if shared), total file cost (sum of approxCost). ChevronRight/ChevronDown toggle to expand. Expanded view renders a compact item table inside.
- Groups of 2+ items become group cards; single-initiated items render as individual rows (so the user still sees the PR badge inline). When all items in a section are part of file groups, an "All items in this section are part of file groups above" empty hint is shown.
- Extracted a shared `ItemRow` component (used by both the main table and the expanded group view) with a `compact` prop to hide the Last Purchase / Available Stock columns in the expanded group view (since those are useful for pending items, not for already-initiated grouped items).
- Preserved the 3-table separation (RC / Non-Rate / Contractual), the colored section header bars, the description strips, the section total cost, the RC No. + RC Supplier columns (RC section only), the summary tiles (Total Approx Cost / RC Items / Stock Available / Initiated PRs), the AI Process button + status badge, and the InitiateFileDialog integration.
- The InitiateFileDialog is now conditionally rendered in the parent (`{initiateItem && <InitiateFileDialog key={initiateItem.id} ... />}`) so the form state (including the new `usePrAsGroupKey` state from PART C) initializes fresh each time the user opens the dialog for a new item — no setState-in-effect, lint-clean.

### PART C — Initiate File: fileGroupKey support
- Added `fileGroupKey: ""` to the dialog form state and a `usePrAsGroupKey: true` boolean state (defaults to mirroring the PR Number).
- New "File Group Key (optional)" field (Layers icon) below the PR/File Number row. Input value shows `form.prNumber` while `usePrAsGroupKey` is true (so it visibly mirrors the PR Number as the user types). When the user edits the field directly, `usePrAsGroupKey` flips to `false` and a "Reset" button (RotateCcw icon) appears to restore the mirror behavior.
- Helper text dynamically explains the current behavior: "Currently mirroring the PR Number (PR-XXXX). Initiating another item with the same PR will group them under one file." vs "Custom group key set. Items initiated with the same key will be grouped together in the file register."
- The submit handler computes `effectiveGroupKey = usePrAsGroupKey || !form.fileGroupKey.trim() ? form.prNumber : form.fileGroupKey.trim()` and includes it in the POST body as `fileGroupKey`.
- After successful submit, both `form.fileGroupKey` and `usePrAsGroupKey` are reset.
- Updated the API route (`/api/estimates/[id]/items/[itemId]/route.ts`) to read `body.fileGroupKey` (defaults to `prNumber` when not provided or empty) and pass it to `db.projectFile.create({ data: { ..., fileGroupKey } })`. The ProcurementFile mirror record does NOT get a fileGroupKey (the ProcurementFile model doesn't have one — only ProjectFile does, per the schema).
- Existing InitiateFileDialog features preserved: stakeholder fetch + officer/sailor Selects (sorted by seniority for officers), item/RC details panel, computed file cost preview, "Authorized By (Officer) *" and "Created By (Sailor) *" required Selects, responsiblePerson auto-populated from the selected officer.

## Lint & runtime
- `bun run lint` → 0 errors, 0 warnings across the whole project.
- `npx eslint` on the 4 modified files → 0 errors (clean exit).
- Dev server log: clean compiles after the only intermediate error (`FileMultiple` icon import — replaced with `Files`). All recent compile entries show success; `GET / 200`, `GET /api/votes 200`, `GET /api/estimates 200` confirmed via curl.
- Tested POST `/api/estimates/[id]/items/[itemId]` with `fileGroupKey: "PR-2025-001"` in the body → 201 with `{ok:true, fileId, prNumber}`. Verified the created ProjectFile record via `GET /api/projects/[id]/files` shows `"fileGroupKey":"PR-2025-001"` (the fileGroupKey field is persisted on the ProjectFile). Test record cleaned up via DELETE.

## Patterns honoured
- Components remain named exports (`AddProjectWizard`, `EstimateItemsTable`, `InitiateFileDialog`) with `"use client"` directive at top.
- Dark theme tokens used throughout (`bg-card`, `border-border`, `text-foreground`, `bg-secondary/40`, `text-muted-foreground`, `text-primary`, etc.) — no hardcoded hex. Works in light theme too (per Task 1-theme-schema foundation).
- Responsive (mobile-first grid for the form, flex-wrap toolbars, max-h-[60vh] scroll containers with `scrollbar-thin`, sticky table headers).
- shadcn/ui primitives reused (Checkbox, Select, Input, Label, Table family, Dialog, Button).
- Lucide icons reused + added (Wallet, ChevronUp, ChevronDown, ChevronsUpDown, Group, Files, ChevronRight, Layers, Info, RotateCcw).
- `useFetch`, `apiRequest`, `useToast`, `CustomBadge`, `cn`, and constants from `@/lib/constants` (financialMeanColor, voteTypeColor, estimateStatusColor, projectTypeColor, formatCurrency) reused.
- No TODOs, no placeholders, no extra dependencies installed.
