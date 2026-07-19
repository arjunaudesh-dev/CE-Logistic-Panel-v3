# Task 7 — Rate Finder Module Builder

## Task
Build the Rate Finder module (`src/components/erp/modules/rate-finder.tsx`) for the CE Logistic Panel ERP.

## Work Log
- Read `worklog.md` for project context, conventions, available shared components and API endpoints.
- Inspected shared building blocks: `StatCard`, `PageHeader`, `states` (Loading/Error/Empty), `badges` (CategoryBadge/CustomBadge), `useFetch`/`apiRequest`, `useToast`, shadcn Tabs/Dialog/Select/Table/Button/Input/Label/Textarea/Badge, `constants.ts` (RATE_CATEGORIES, formatCurrency).
- Inspected Prisma schema: `RateContract` & `DiscontinuedItem` models; confirmed field shapes match API responses.
- Inspected API routes `/api/rate-finder/rc` (GET/POST array bulk) and `/api/rate-finder/discontinued` (GET/POST array bulk) plus their `[id]` DELETE routes.
- Inspected existing `projects.tsx`, `add-project.tsx`, `dashboard.tsx` for stylistic and structural conventions.
- Created `rate-finder.tsx` with:
  - Named export `RateFinderModule` (`"use client"`).
  - Two `Tabs`: **RC** and **Discontinued**.
  - Two `StatCard`s at top: Total RC Items, Total Discontinued.
  - Custom CSV parser (handles quoted fields, `""` escape, CRLF, trailing newline).
  - RC tab: debounced search input (item name/code), Category / Year / Supplier filters (all derived from data, with "All" options), `Clear` button when filters active, sticky header table inside horizontal-scroll + max-height container, `CategoryBadge` for category column, per-row `Compare` button shown when an `itemCode` has multiple year entries (grouped by `itemCode` via `useMemo`).
  - `CompareDialog` with summary tiles (years / price range / change %), `recharts` `BarChart` (Bar/XAxis/YAxis/Tooltip/ResponsiveContainer/CartesianGrid), and a detail table.
  - `AddRCDialog` (form dialog, posts single object to `/api/rate-finder/rc`).
  - `UploadRCDialog` (hidden file input, parse → preview table, downloadable CSV template button, posts array to `/api/rate-finder/rc`).
  - Discontinued tab: Year selector derived from `lastRCYear` with "All Years" option, Add & Upload buttons, table with formatted `lastRCPrice`, `lastRCYear`, `discontinuedDate`, reason, alternatives rendered as clickable emerald `CustomBadge`s (split on `,` or `;`), per-row delete.
  - `AddDiscontinuedDialog` and `UploadDiscontinuedDialog` following the same pattern as RC.
  - All async actions surface `useToast` notifications; loading spinners via `Loader2` for delete/save/upload states.
  - Dark theme using `bg-card`/`border-border`/`text-foreground` tokens (consistent with rest of app).
  - Responsive layout: filter row wraps on small screens; stat grid 1 col → 2 cols; dialogs scrollable.
- Verified file lints cleanly (`npx eslint src/components/erp/modules/rate-finder.tsx` → no output, exit 0).
- The remaining lint errors are pre-existing in `app-shell.tsx` and `use-fetch.ts` (other agents' files), not in this module.

## Stage Summary
- `RateFinderModule` (`src/components/erp/modules/rate-finder.tsx`) is complete and production-ready.
- All four CRUD operations are wired: GET list (both tabs), POST single, POST bulk array, DELETE by id.
- CSV bulk upload + downloadable template + preview table implemented for both RC and Discontinued.
- Year-over-year price comparison chart (recharts BarChart) implemented via the Compare dialog.
- No TODOs or placeholders; no extra npm packages installed (recharts & lucide-react were already in `package.json`).
- Lint passes for this file. Pre-existing lint errors in other files remain untouched.
