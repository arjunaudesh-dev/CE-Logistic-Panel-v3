# Task 8 — Collection Module Builder

## Work Log
- Read project context (worklog.md, use-fetch.ts, constants.ts, stat-card/page-header/states/badges).
- Read existing API routes for collection (items, part-supply, part-supply/[id]/entries, daily) and prisma schema to confirm shapes.
- Inspected dashboard.tsx and projects.tsx for design conventions (dark theme colors, StatCard / PageHeader usage, chart styling).
- Built `/home/z/my-project/src/components/erp/modules/collection.tsx` — a single named export `CollectionModule` with shadcn `Tabs` (Dashboard | Part Supply | Daily Collection).
  - **DashboardTab**: 3 StatCards (Items to be Received — blue PackageX; Part Supply Items — amber Layers; Collected Items — green PackageCheck). recharts LineChart (qty over last 7 days derived from daily data) + PieChart (collection items by status, colored from COLLECTION_STATUSES order). Recent activity feed (last 5 daily collections).
  - **PartSupplyTab**: Add Part Supply Order dialog (POST /api/collection/part-supply). Expandable cards using local `expandedId` state. Each card shows Item/Ordered/Received/Balance/% Complete progress bar (green >90%, amber >=50%, red <50%) + status badge. Expanded view has summary bar, delivery entries Table (Sr/Date/Vehicle/Qty/QC By/Sailors/Driver name+license+phone/Cum. Bal.), Add Entry dialog (POST entries — API auto-calculates srNo & cumulativeBalance & updates order totals/status), Print Receipt dialog with embedded `@media print` style block. Completed orders greyed (opacity-70) but still expandable.
  - **DailyCollectionTab**: Filter buttons (All/Today/Yesterday/Custom/Range) that build `?date=` / `?from=&to=` query. Group toggle (By Date | By Period | By Supplier) with ISO-week grouping for "period". Record Collection dialog (single) + Bulk Record dialog (multi-select pending items from /api/collection/items where status !== Collected, with shared date+qty+recordedBy → POST array). CSV export of current filtered data via Blob download. Summary badges + grouped list with max-h-96 scroll + custom webkit-scrollbar styling.
- Used shared helpers (`useFetch`, `apiRequest`, `useToast`, `formatNumber`, `COLLECTION_STATUSES`, `PART_SUPPLY_STATUSES`), shadcn primitives, lucide icons, recharts, and `cn`. Dark theme tokens (#0f1420 / #1a1f2e / #2d3548 / #3b82f6) honored throughout.
- Ran `bun run lint` — zero issues attributable to this file. (4 pre-existing errors live in app-shell.tsx and use-fetch.ts.)
- Verified dev server log — no compile errors referencing collection module.

## Stage Summary
- File created: `/home/z/my-project/src/components/erp/modules/collection.tsx` (~1100 lines, single named export `CollectionModule`).
- Three sub-tabs implemented end-to-end with create dialogs, expandable cards, entries table, print receipt, filters, view-mode grouping, bulk record, CSV export.
- All mutations call `refresh()` and surface toasts.
- Component is already wired into `src/app/page.tsx` via `active === "collection" && <CollectionModule />`.
