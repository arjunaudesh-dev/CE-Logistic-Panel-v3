# Task ID: 2 — Projects Wizard + Present Position Update

**Agent:** Projects Wizard + Present Position Update
**Task:** Add project types, financial means, estimate template, next-position popup with responsible person

## Files modified
1. `/home/z/my-project/src/components/erp/modules/projects/add-project-wizard.tsx` (rewritten Step 1)
2. `/home/z/my-project/src/components/erp/modules/projects/present-position.tsx` (full rewrite to add UpdatePositionDialog + File Number column + filter toggle)
3. `/home/z/my-project/src/components/erp/modules/projects/initiate-file.tsx` (added Authorized By Officer + Created By Sailor Selects)
4. `/home/z/my-project/src/components/erp/modules/projects/file-log.tsx` (extended ProjectFile interface + display)
5. `/home/z/my-project/src/components/erp/modules/projects.tsx` (projectType + financialMean badges on cards)
6. `/home/z/my-project/src/app/api/estimates/[id]/items/[itemId]/route.ts` (accepts authorizedBy/responsiblePerson on initiate)

## What was delivered

### PART A — Add Project Wizard Step 1
- Reference field is now a manual text input (label "Reference (how vote allocated)") — placeholder "e.g. Vote 2104 - Allocation 2025"
- Added "Project Type" Select (PROJECT_TYPES) with live `projectTypeColor` badge preview
- Added "Financial Mean" Select (FINANCIAL_MEANS) with live `financialMeanColor` badge preview; when non-Vote selected, Vote Number hint changes to "Non-Vote funding — Vote Number can be 'NON-NAVAL' or 'CONTRACTUAL'"
- Material Estimate section clearly marked "Mandatory — required to create project material list"
- "Download Template" button → downloads CSV with header `ItemName,Qty,Unit,EstimateCost` + 1 sample row
- "Upload Estimate" button → hidden file input, accepts .csv; robust CSV parser handles quoted fields; opens preview Dialog showing parsed rows; "Confirm Import (N rows)" replaces the current estimate rows
- "Export Estimate & Process (Step 2)" button is disabled (and shows hint "Add estimate items to continue") when no valid rows exist (valid = itemName + qty or estimateCost)
- Form state and POST body include `projectType` and `financialMean`; onCreated callback returns them so the parent (projects.tsx) gets the right shape
- All Step 2 functionality preserved (EstimateItemsTable with AI process, Go to Project Window)

### PART B — Present Position popup
- ProjectFile interface extended (in file-log.tsx) with `fileNumber?: string | null` and `responsiblePerson?: string | null`; FileLogDialog Details panel now shows File Number + Responsible Person
- New `/api/process-flows` fetch builds a `positionToResponsible: Map<string, string>` lookup (first non-empty defaultResponsiblePerson across all flows)
- File register table has a new **File Number** column: rows with a file number show it as a green Hash-prefixed mono string; rows without show an amber "Assign File No" inline button that opens the Update Position dialog
- Filter toggle (3 pills): `All (N) · With File No (N) · Pending (N)` shows live counts; search now also matches fileNumber
- Edit (pencil) button opens the new **UpdatePositionDialog** (replaces the old FileFormDialog for edit)
- **UpdatePositionDialog** dedicated popup:
  - Position Transition section: side-by-side "Current Position" (read-only colored box + default officer hint) → arrow → "Next Position" Select; default officer hint shown for both
  - "Responsible Person" field: auto-filled from the process-flow default for the selected next position (via `handleNextPositionChange` — no useEffect setState, lint-clean); user can override by typing
  - File Number field (editable) + Supplier field
  - Changed By (required when position actually changes) + Comment field
  - Submit sends `presentPosition`, `responsiblePerson`, `fileNumber`, `supplier`, `changedBy`, `comment` via PUT `/api/projects/[id]/files/[fileId]`
- FileFormDialog kept for Add mode (and includes the optional File Number field)
- Position column now also shows a small responsible-person subtitle when set

### PART B.3 — Initiate File dialog (officer + sailor)
- Fetches `/api/stakeholders` once and splits into `officers` (category contains "officer") and `sailors` (category contains "sailor") via useMemo; officers sorted by seniority then name
- "Authorized By (Officer) *" Select (UserCheck icon) — options show `name — rankOrRate (appointment)`; selected officer's name + appointment + department shown below as confirmation
- "Created By (Sailor) *" Select (User icon) — same pattern
- On submit, sends `createdBy`, `authorizedBy`, and `responsiblePerson` to POST `/api/estimates/[id]/items/[itemId]` (values formatted as "Name (Appointment)")
- Backend route updated to accept `authorizedBy` and `responsiblePerson` (was hard-coded to null) — both ProjectFile and ProcurementFile mirror records now receive them; file-log comment includes "Authorized by X" suffix

### PART C — Project cards
- Project interface extended with `projectType?` and `financialMean?`
- Card header now stacks up to 3 badges (right-aligned, flex-wrap): Financial Mean badge (only when not "Vote" — to highlight Malima/Non-Public/Contractual), Project Type badge (always when set), Status badge (existing)
- Subtitle line updated to: `voteNumber · benefactor · reference · projectType`
- Existing financial breakdown, utilization, and footer (files count + EDC) preserved

## Lint & runtime
- `bun run lint` → 0 errors, 0 warnings across the project
- Dev server compiles cleanly; verified `GET /api/projects` returns projectType + financialMean; verified `POST /api/projects` accepts and persists both fields (test created then deleted cleanly)
- `GET /api/process-flows` and `GET /api/stakeholders` already return the shapes the new UI consumes (verified via curl)
- All existing functionality preserved: Step 2 AI processing, estimates, allocation history, file log, PR-from-Estimate tab, sort/search/export, delete with confirm

## Patterns honoured
- Dark theme tokens (`bg-card`, `border-border`, `text-foreground`, etc.) used throughout
- Responsive (mobile-first; flex-wrap toolbars; tables wrap horizontally)
- All interactive components remain `"use client"`; named exports unchanged (`AddProjectWizard`, `PresentPositionDialog`, `InitiateFileDialog`, `FileLogDialog`, `ProjectsModule`)
- shadcn/ui primitives reused (Dialog, Select, Table family, Input, Label, Button)
- Lucide icons reused + added (ArrowRight, User, UserCheck, Hash, Download, Upload, Info, AlertCircle, Check)
- `useFetch`, `apiRequest`, `useToast`, `CustomBadge`, `cn`, and constants from `@/lib/constants` reused
