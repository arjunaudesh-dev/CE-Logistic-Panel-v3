# Task 6 — Stores Module Builder

## File Created
- `/home/z/my-project/src/components/erp/modules/stores.tsx` (~1.8k lines)

## Component
- Named export `StoresModule` with `"use client"` directive.

## Sub-tabs
1. **Zones** — dashboard grid of zone tiles. Tile `minHeight = 120 + min(totalValue/100000, 80)`. Colour-coded by `lowStockCount` (green=0, amber=1–2, red≥3). Each tile shows: name + type badge, stock value, item count, and 4 stat chips (Running out / Received / To collect / Non-moving). Clicking a tile switches to Stores tab and applies that zone as a filter.
2. **Stores** — detailed inventory view:
   - Top stat cards: NET (total stock value), TASK (total items), AVAIL (items in stock), TEAM (low stock count).
   - Category tabs from `STORE_CATEGORIES` (All | BMS | Plumbing | Metal | …).
   - Search-by-description input.
   - Zone filter dropdown (All Zones + names from `/api/stores/zones`).
   - Stock-level filter (All / In Stock / Low Stock / Out of Stock / Overstock).
   - Sort dropdown (Description / Qty / Cost / Category) + asc/desc toggle. Table headers are also clickable to toggle sort.
   - Sticky-header table inside `max-h-[60vh] overflow-auto scrollbar-thin`, columns: Description (with item code sub-text), Category badge, Unit, Qty (with ⚠ Low / Out warnings in red/amber), Cost (total + @unit), Location badge, Actions (View 👁 / Edit ✏).
   - Pagination 25 per page with Prev / Next and "x / y" indicator.

## Dialogs
- **Add/Edit Item** (`ItemFormDialog`): all fields incl. Zone Select from zones (falls back to `ZONES` constant). Auto-computes total cost = qty × unitCost. POSTs to `/api/stores` or PUTs to `/api/stores/[id]`. Uses `key={editing ? 'edit-'+id : 'new'}` + `useState` initialiser so the form resets cleanly without setState-in-effect.
- **Bulk Upload** (`BulkUploadDialog`): in-browser CSV template download (Blob, 10 columns + 2 sample rows), file input, RFC-4180-aware CSV parser, sequential POST per row, live `Progress` bar, success/failure counters, error list. Calls `refresh()` on completion.
- **View Item** (`ViewItemDialog`): read-only record with low/out-of-stock banner and Edit shortcut.

## Data Fetching
- `useFetch<StoreZone[]>("/api/stores/zones")` and `useFetch<StoreItem[]>("/api/stores")` (shared across both tabs).
- `apiRequest` for POST/PUT. `refresh()` called on both fetches after every mutation.

## Conformance Notes
- All filter setters wrapped to also `setPage(1)` (no `useEffect`, no ref-during-render) — passes `react-hooks/refs` and `react-hooks/set-state-in-effect` rules.
- `bun run lint` on the new file: **0 errors**. (4 remaining errors in repo are pre-existing in `app-shell.tsx` and `use-fetch.ts`.)
- Verified `/api/stores` and `/api/stores/zones` return data matching the TS interfaces; dev.log shows 200 OK on both endpoints.
- Dark theme, responsive (mobile-first), uses only shared ERP components (StatCard, PageHeader, states, badges) and shadcn/ui primitives (Tabs, Dialog, Select, Table, Progress, Input, Label, Button).
EOF