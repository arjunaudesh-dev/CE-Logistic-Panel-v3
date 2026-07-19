# Task 3 — Projects Wizard: Estimate Optional, Requirement Group Combobox, Active Votes, Recurrence

**Agent:** Projects Wizard — Estimate Not Mandatory, Requirement Group Combobox, Active Votes, Recurrence
**Task ID:** 3
**Files touched:**
- `/home/z/my-project/src/components/erp/modules/projects/add-project-wizard.tsx` (994 → 1150 lines)
- `/home/z/my-project/src/components/erp/modules/projects.tsx` (one-line string change on line 392)

## Summary

Updates the Projects module's "Add Project" wizard per Task 3 spec:
1. **Material Estimate is now OPTIONAL** — users can create a project without any estimate rows. When no rows are filled, Step 2 (AI processing) is skipped entirely and the wizard goes straight to the project window (Step 3).
2. **Requirement Group is now a combobox** for Maintenance projects — Input + Popover pattern showing existing groups (fetched from `/api/projects`, filtered to `projectType === "Maintenance"`, unique `requirementGroup` values). User can pick an existing group OR type a new one. Filtered as the user types; a "Use '<typed>' (new)" option appears when the typed text doesn't match an existing group.
3. **Vote Number dropdown only shows ACTIVE votes** — filtered via `votes.filter(v => v.active)`. Inactive/archived votes are excluded. Placeholder copy updated to "Select an active vote from the list…".
4. **"Recurring" → "Recurrence" rename** across the projects module — VOTE_TYPES constant already updated to `["Capital", "Recurrence"]`; we updated the visible copy in `add-project-wizard.tsx` (vote sub-select help text) and `projects.tsx` (Maintenance section header).
5. **pp.csv bulk upload verification** — confirmed already implemented in `present-position.tsx` (`BulkFilesUploadDialog`) + `/api/upload` + `/api/projects/[id]/files/bulk`. Template columns exactly match the spec: `PRNumber, ItemCode, ItemName, Unit, Qty, UnitPrice, FileCost, Supplier, PresentPosition, FileCategory`. No changes needed.

## Work Log

1. Read `worklog.md` for project context + shared components (`useFetch`, `apiRequest`, `useToast`, shadcn/ui, `VOTE_TYPES`, `voteTypeColor`).
2. Read both target files fully:
   - `add-project-wizard.tsx` (994 lines)
   - `projects.tsx` (557 lines)
3. Verified API endpoints return the expected shapes:
   - `GET /api/votes` → returns votes with `active: boolean` (one inactive vote in seed data).
   - `GET /api/projects` → returns projects with `requirementGroup` field (2 maintenance projects in seed data with groups "Water Purification" + "ENA Maintenance").
4. Confirmed `src/components/ui/popover.tsx` exports `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` (PopoverAnchor needed for the combobox so the input doesn't act as a click-toggle trigger).
5. Edits to `add-project-wizard.tsx`:
   - Added `useMemo` to React imports.
   - Added `Popover`, `PopoverContent`, `PopoverAnchor` imports + `ChevronDown` icon.
   - Removed unused `AlertCircle` icon import (no longer referenced after Material Estimate became optional).
   - Added `ExistingProject` interface (minimal: `id`, `projectType?`, `requirementGroup?`).
   - Added `useFetch<ExistingProject[]>("/api/projects")` + `useMemo` to extract unique maintenance `requirementGroup` values (`existingRequirementGroups`, sorted alphabetically).
   - Added `activeVotes = useMemo(() => (votes ?? []).filter((v) => v.active), [votes])`.
   - Added `reqGroupOpen` state for the combobox Popover.
   - Updated `selectedVote` lookup + `handleVoteSelect` to use `activeVotes` instead of `votes`.
   - Replaced the Vote dropdown: iterates `activeVotes` instead of `votes`; placeholder + empty-state copy now say "active".
   - Replaced the vote sub-select help text: "Recurring votes fund annual maintenance" → "Recurrence votes fund annual maintenance".
   - Replaced the Requirement Group Input (Maintenance only) with a combobox: Input + Popover (`PopoverAnchor asChild` wraps the relative-positioned input container; chevron button toggles open; `PopoverContent` renders a filtered list of existing groups + an optional "Use '<typed>' (new)" item when the typed text doesn't match any existing group; `onOpenAutoFocus` prevented so focus stays on the input). Width uses `--radix-popover-anchor-width` so the dropdown matches the input's width.
   - Updated `validEstimateRows`/`hasValidEstimate` comment to reflect new semantics (path-selector, not gating).
   - Rewrote `handleSaveAndProcess`: if `validEstimateRows.length === 0` → create project only, toast "Project created / Step 2 skipped", call `finishAndGoToProject(project.id)` and return; else (existing path) create project + estimate, go to Step 2.
   - Extracted the reset logic into `finishAndGoToProject(projectId)` helper (DRY — used by both Step 2 → "Go to Project Window" and the new skip-Step-2 path). Also resets `reqGroupOpen` on close.
   - `handleGoToProject` now delegates to `finishAndGoToProject(createdProjectId)`.
   - Material Estimate section header: changed from amber "Mandatory — required to create project material list" badge to muted "Optional — add items now or skip (you can add later in Step 2 / project window)" badge.
   - Material Estimate tip text: when no valid items, the inline warning changed from amber "Add estimate items to continue" to muted "No items yet — Step 2 will be skipped and you'll go straight to the project window".
   - Bottom action button: removed `!hasValidEstimate` from `disabled`; dynamic label ("Export Estimate & Process (Step 2)" when items present, "Create Project & Open (Skip Estimate)" when empty) + dynamic icon (Sparkles vs ArrowRight) + dynamic tooltip. Side warning copy changed from amber to muted ("No estimate items — Step 2 will be skipped").
6. Edit to `projects.tsx`:
   - Line 392: "Maintenance (Recurring Vote) Projects" → "Maintenance (Recurrence Vote) Projects".
7. Verified pp.csv bulk upload flow (no changes):
   - `BulkFilesUploadDialog` in `present-position.tsx` (lines ~2047+) correctly:
     - Downloads `pp.csv` template with `BULK_FILE_CSV_COLUMNS = ["PRNumber","ItemCode","ItemName","Unit","Qty","UnitPrice","FileCost","Supplier","PresentPosition","FileCategory"]`.
     - Parses uploaded CSV (RFC-4180), shows preview with projected file group keys.
     - Phase 1: POSTs source CSV to `/api/upload` as FormData (saved to `/home/z/my-project/upload/{filename}`).
     - Phase 2: POSTs parsed rows to `/api/projects/[id]/files/bulk` as `{ files: [...] }`.
     - Server-side endpoint at `src/app/api/projects/[id]/files/bulk/route.ts` auto-generates file group keys (`{ABBREV}-{SEQ}`), mirrors into procurement, returns `{ ok, count }`.
   - `/api/upload` (`src/app/api/upload/route.ts`) writes to `process.cwd()/upload/{filename}` — confirmed.
8. Ran `bunx eslint` on both modified files + `present-position.tsx` → EXIT 0, zero errors.
   - The remaining `bun run lint` error is in `collection.tsx:628` (a pre-existing `react-hooks/set-state-in-effect` warning), NOT in any file touched by this task.
9. Checked dev log: latest "✓ Compiled in 1034ms" + "✓ Compiled in 291ms", all API routes returning HTTP 200. No client-side runtime errors related to my changes.

## Stage Summary

- **Files touched:** 2 (`projects.tsx`, `add-project-wizard.tsx`). 0 new files.
- **Behavioral changes:**
  - Material Estimate is OPTIONAL. Projects can be created with zero estimate rows; Step 2 (AI processing) is skipped, user goes straight to the project window.
  - Requirement Group (Maintenance only) is now a filterable combobox with "create new" support, populated from existing maintenance projects' `requirementGroup` values.
  - Vote Number dropdown only shows active votes.
  - All user-visible "Recurring" text in the projects module is now "Recurrence".
- **Backward compatibility preserved:**
  - All existing functionality intact: Funds checkbox (Malima/Non-Public/Contractual), vote sub-select, custom vote number, file group key prefix (name abbreviation), project type/dispatch, etc.
  - The `voteTypeColor` helper still accepts both "Recurrence" and "Recurring" (backward compat for old DB rows).
- **Code quality:**
  - `"use client"` directive preserved at top of both files.
  - Both components remain named exports (`AddProjectWizard`, `ProjectsModule`).
  - TypeScript throughout, strict typing. No `any`. No TODOs/placeholders.
  - Semantic Tailwind classes for light/dark theme support (`bg-card`, `bg-background`, `bg-popover`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `bg-secondary/60`).
  - Responsive: combobox PopoverContent uses `min-w-[240px]` + `w-[var(--radix-popover-anchor-width)]` to match input width on all viewports.
  - Accessibility: combobox chevron button has `aria-label`; `tabIndex={-1}` to keep tab order on the input; `onOpenAutoFocus` prevented so focus stays on the input.
- **Lint:** both files pass `bunx eslint` cleanly (EXIT 0).
- **Dev server:** compiles + runs without errors; `/api/projects` and `/api/votes` both return HTTP 200.
