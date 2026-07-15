---
Task ID: 2
Agent: Settings Overhaul
Task: Add Vote Management, Roles & Access, Authentication to Settings; eye-catching UI
File: /home/z/my-project/src/components/erp/modules/settings.tsx

# What was done

Expanded the Settings module from 3 tabs → 6 tabs in order:
1. **User Profiles** (enhanced) — added Password column with Lock/Unlock status badge,
   per-row "Password" action button that opens SetPasswordDialog → POST /api/auth/set-password.
   Replaced "Departments" stat with "With Password" count. Added blue gradient header banner.
2. **Roles & Access** (NEW) — 5 role description cards + full 8×5 ROLE_PERMISSIONS matrix
   with color-coded column headers, PermissionBadge helper using permissionColor, legend.
3. **Authentication** (NEW) — Default credentials info card; Login Test Panel (POST /api/auth/login
   with green success / red error result); Current Session card (GET /api/auth/session +
   Logout → POST /api/auth/logout); User Password Status table with quick Set Password action.
4. **Vote Management** (NEW) — 4 gradient stat cards (Total/Capital/Recurring/Total Allocation
   via formatCurrency); amber hint card; full CRUD table with mono voteNumber badge, voteType
   badge, formatted allocation, financial year, active status, edit/delete actions; VoteFormDialog.
5. **Store Management** (existing) — added pink gradient header banner for visual consistency.
6. **Process** (existing) — unchanged.

# Key technical decisions

- New tab bar: gradient container, color-coded icon badges per tab (blue/violet/emerald/amber/pink/sky),
  responsive (full labels on sm+, short labels on mobile), data-[state=active] indicator.
- SetPasswordDialog uses `useState` initial values + parent's conditional render with `key`
  to reset state on each open — no useEffect (lint rule `react-hooks/set-state-in-effect`).
- UserProfile interface extended with `passwordHash?: string | null`.
- Added Vote / SessionUser / SessionResponse interfaces matching API shapes.
- Custom gradient stat cards in VoteManagementTab (not the shared StatCard) for visual pop.

# Files modified
- `/home/z/my-project/src/components/erp/modules/settings.tsx` (2484 → 4038 lines, +1554)

# Verification
- `bun run lint` → 0 errors, 0 warnings
- curl tests: GET /api/votes 200, GET /api/auth/session 200, GET /api/settings/users 200
  (returns passwordHash), POST /api/auth/login 200 (correct creds) / 401 (wrong creds)
- Dev server log: clean compiles, no errors

# Exports
- Named export `SettingsModule` with `"use client"` (unchanged)
