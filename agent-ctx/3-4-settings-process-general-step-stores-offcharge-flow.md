# Task 3-4 — Settings Process General Step + Stores Off-charge Flow

## Files modified
- `src/components/erp/modules/settings.tsx` — GeneralStepFormDialog refactored (removed step order, uses STAGE_AUTO_DETAILS + predefinedStage)
- `src/components/erp/modules/stores.tsx` — Area Stores off-charge flow (Stage 1 NAV 251 / Stage 2 NAV 255)
- `src/app/api/area-stores/route.ts` — accepts destinationStore + offChargeStage, applies Stage 2 destination store item update

## Settings.tsx changes (Process tab + Value & Step tab General Steps pool)

### ProcessFlowsTab → StepFormDialog (Process tab "Add Step" dialog)
Already complete — verified all listed fields:
- Predefined Stage dropdown iterating `PROCESS_STEP_STAGES` (includes Spec making, Pre Tender, Post Tender, Split Order, Part Supply, NHQ, DPC, etc.)
- Custom Step Name (optional, disabled when predefined stage is selected)
- Before (mandatory) dropdown with `__start__` option
- After (optional) dropdown with `__none__` option
- Department Select (CCED / CSLOG / Others via `SETTINGS_DEPARTMENTS`)
- Responsible Officers + Sailors via `MultiStakeholderPicker` (filtered by department → stakeholders with category containing "officer"/"sailor")
- Auto-set block shows isTenderStage / isEvaluationStage / prefixedNumber from `STAGE_AUTO_DETAILS`
- Prefixed Number read-only (resolved from `/api/number-prefixes` if available)
- Description auto-filled but editable
- Tender Stage + Evaluation Stage checkboxes (auto-set by stage but togglable)
- NO step order field (steps linked via before/after)
- NO editable financial delegation at step level (legacy value shown read-only)
- Live Preview block with all badges

### GeneralStepFormDialog (Value & Step tab → Step Management section "Add Step" dialog)
Refactored to remove the step order field and use `STAGE_AUTO_DETAILS` for auto-fill:
- Removed `stepOrder` state, `nextOrder` useMemo, the step order `<Field>` block, and the `stepOrder` validation in `handleSubmit`.
- Removed `positionName`/`stageSelect`/`applyStage` (manual keyword matching) — replaced with `predefinedStage`/`customName`/`applyPredefinedStage` (uses `STAGE_AUTO_DETAILS` for isTenderStage, isEvaluationStage, prefixedNumber, description).
- Added `prefixedNumber` state (auto-resolved from `/api/number-prefixes`).
- Added `stageInfo` from `STAGE_AUTO_DETAILS[predefinedStage]` for the auto-set hints block.
- Added a read-only "Prefixed Number (auto)" field.
- Added an auto-set hints block (Sparkles + Tender/Evaluation/Prefix badges) — visible when a predefined stage is selected.
- `handleSubmit` now sends `predefinedStage`, `prefixedNumber`, `isTenderStage`, `isEvaluationStage`, and `positionName: resolvedName` (predefined stage OR custom name) — NO stepOrder.
- Added a Live Preview block (resolved name + department + TENDER/EVALUATION badges + prefixedNumber + officer/sailor counts).
- Updated the dialog description to call out "no step order required" and the responsible officer/sailor dropdowns.

### StepManagementSection table (in Value & Step tab)
- Replaced the `#{s.stepOrder}` badge in the table with either the `prefixedNumber` (if present, with Hash icon) or the Sr number (`idx + 1`).
- Step name cell now shows `s.predefinedStage || s.positionName || "Unnamed step"`.
- Sort key changed from `stepOrder` to alphabetical (predefined stage / position name).

## Stores.tsx changes (Area Stores tab — off-charge flow NAV 251 → NAV 255)

### Type + filter updates
- Extended `AreaStoreRecord` interface with `destinationStore` (string|null) and `offChargeStage` (string|null).
- Extended `AreaRecordTypeFilter` to include `IntermediateOffCharge` and `FinalOffCharge`.
- Added new constants: `DESTINATION_STORE_OPTIONS` (Zone A/B/C/D, Project Stores, Ready-Use Stores, Balance Stores).
- Added helpers: `recordTypeLabel(type)` (Oncharge / Off-charge / Intermediate Off-charge / Final Off-charge), `offChargeStageColor(stage)`, `offChargeStageLabel(stage)`.
- Extended `recordTypeColor` to cover `IntermediateOffCharge` (amber) and `FinalOffCharge` (blue).

### AreaStoresTab updates
- Added `offChargeTarget` state — opens the new `OffChargeDialog` when an Oncharge row's "Off-charge" button is clicked.
- Updated `storeSummaries` to track `intermediateValue` + `finalValue` per area store (in addition to oncharge/offCharge).
- Updated `totals` to compute `intermediateValue` and `finalValue` separately. `offChargeValue` now includes legacy OffCharge + IntermediateOffCharge + FinalOffCharge (all represent items leaving the area store).
- Updated the header strip text to describe the off-charge flow: "Area Store → NAV 251 (intermediate stores) → NAV 255 (to CCED Stores / Zone / Project / RU)".
- Replaced the 4-card stats grid with a 5-card grid: Oncharge Value / Intermediate Off-charge / Final Off-charge / Net Stock Value / Records.
- Filter dropdown for record type now offers: All Records, Oncharge (NAV 251), Intermediate Off-charge (Stage 1 — NAV 251), Final Off-charge (Stage 2 — NAV 255), Legacy Off-charge (NAV 255).
- Table header gained 2 new columns: "Stage" (Off-charge Stage badge) and "Destination" (destination store badge).
- Record Type cell now uses `recordTypeLabel()` (so IntermediateOffCharge shows "Intermediate Off-charge" etc.).
- New Stage cell shows `offChargeStage` as a colored badge (Stage 1 amber, Stage 2 blue).
- New Destination cell shows `destinationStore` as a violet MapPin badge.
- Actions cell: added an "Off-charge" ghost button (ArrowUpFromLine icon) shown only on `Oncharge` records — opens the Off-charge dialog.
- CSV export extended with 2 new columns: "Off-charge Stage" and "Destination Store".

### New OffChargeDialog component
A dialog opened from an oncharge record's "Off-charge" button:
- **Off-charge Stage** Select — "Stage 1: To Intermediate Stores (NAV 251)" or "Stage 2: To CCED Stores (NAV 255)".
- **NAV Reference (auto)** — auto-set to "NAV 251" for Stage 1 / "NAV 255" for Stage 2 (shown as a read-only colored badge).
- **Quantity** — defaults from the oncharge record; validated to be > 0 and ≤ the oncharge qty.
- **Destination Store** — conditional:
  - Stage 1 → free-text intermediate store name (e.g. "Transit Store").
  - Stage 2 → dropdown of `DESTINATION_STORE_OPTIONS`.
- **Total Cost** — auto-calculated as qty × source record's unitCost.
- **NAV 255 Number** (fileNumber) — defaults from the oncharge record's fileNumber.
- **Date** — defaults to today.
- **Remarks** — optional.
- Source-record summary card at the top showing the oncharge record's badges, item name, item code, qty, and unit cost.
- Submit POSTs `/api/area-stores` with `recordType="IntermediateOffCharge"` (Stage 1) or `"FinalOffCharge"` (Stage 2), plus `navReference`, `destinationStore`, `offChargeStage`, `fileNumber`, etc.
- Per-stage help text explains what gets created and what auto-actions occur.
- Validation toasts: qty must be > 0; qty must not exceed oncharge qty; Stage 1 requires intermediate store name; Stage 2 requires destination store.

## API route changes (/api/area-stores POST)
- POST handler now reads `destinationStore` and `offChargeStage` from the request body (both optional, persisted to the new schema fields). Applies to both single-object and bulk-array paths.
- Added a new helper `applyStage2DestinationUpdate({ destinationStore, itemName, itemCode, category, unit, qty, unitCost, fileNumber, remarks, date })`:
  - Looks up an existing StoreItem in the destination store by `itemCode` (preferred) or by `description` matching the itemName.
  - If found → increments qty and recomputes totalCost; updates `lastMovement`.
  - If not found → creates a new StoreItem in the destination zone with the off-charged qty + unitCost.
  - Best-effort: re-syncs the destination `StoreZone` aggregate (totalValue, itemCount, lowStockCount) if a matching zone exists. Wrapped in try/catch since RU/Balance zones may not always be pre-created.
- After creating the AreaStoreRecord, if `recordType === "FinalOffCharge"` AND `destinationStore` is set AND `itemName` is present → calls `applyStage2DestinationUpdate`. This keeps the destination store's inventory in sync with the area-store off-charge flow.
- `DESTINATION_STORES` set (Zone A/B/C/D, Project Stores, Ready-Use Stores, Balance Stores) is the guard for which destination stores trigger the StoreItem update.

## Verification
- `bun run lint` → EXIT 0 (zero errors, zero warnings across the whole project after all edits).
- `bun run db:push` → "The database is already in sync with the Prisma schema." (destinationStore + offChargeStage fields already present).
- `npx eslint src/components/erp/modules/settings.tsx src/components/erp/modules/stores.tsx src/app/api/area-stores/route.ts` → all clean.

## Notes
- `OffChargeDialog` uses the parent's `key={`offcharge-${offChargeTarget.id}`}` prop to remount when the target record changes, so internal `useState` initialisers always read the latest record — no `useEffect` reset needed.
- The existing `AreaStoreRecordFormDialog` (Add Record dialog) is untouched — it still offers only Oncharge/OffCharge for manual entry; the new Stage 1/Stage 2 flow is exclusively via the Off-charge button on oncharge records (per task spec).
- Existing Oncharge / Legacy OffCharge record display continues to work — the table now uses `recordTypeLabel()` for consistent labelling, and existing records with no `offChargeStage` show "—" in the new Stage column.
