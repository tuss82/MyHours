# MyHours project notes

## Current status

MyHours is a functional mobile-first personal timesheet prototype built with React, Vite, and CSS. It has no backend and no authentication. All shift data and active clock state are stored locally in the browser with `localStorage`.

Repository: https://github.com/tuss82/MyHours

Current branch:

```text
main
```

The local branch is synchronized with `origin/main` when these notes are created.

## Implemented

- Clock in and clock out with actual timestamps.
- Live local clock and elapsed work timer.
- Start and end unpaid breaks while actively working.
- Persist active clock-in and break state across page refreshes.
- Add, edit, and delete saved shifts.
- Add retrospective unpaid break minutes to saved shifts.
- Correctly handle shifts crossing midnight.
- Prevent overlapping saved shifts and overlapping active/manual shifts.
- Show total paid hours for today, the current week, and the current month.
- Today view with a 24-hour timeline and current-time marker.
- Week view with Monday-Sunday rows, calendar week numbering, previous/next week navigation, current-week reset, shift timestamps, and paid-hour totals.
- Month view with worked days highlighted in deep orange and paid decimal hours displayed to one decimal place.
- Recent shifts list limited to the five most recent entries; the complete history remains available to calculations and calendar views.
- English date and month display using `en-GB` while retaining local timezone behavior.
- Whole-minute break display and storage rounding.
- Inline overlap validation errors that identify conflicts with saved or active shifts while keeping the form open for correction.
- Calendar day notes stored locally, with add/edit/delete dialogs, note indicators, accessible keyboard interaction, and auto-dismissing confirmations.
- “Click day to add note” guidance and responsive calendar navigation.
- Teal clock-card theme, matching progress bars and branding, gradient background, responsive spacing, and readable calendar styling.
- Maintainability refactor separating time calculations into `src/utils/time.js` and localStorage access into `src/utils/storage.js`.
- Clarifying names and comments for break allocation, overnight shifts, and timeline clipping without changing application behavior.
- Readable, consistently formatted CSS with unchanged visual tokens and behavior.
- Automated Node tests covering break deduction, overnight shifts, edited weekly/monthly totals, and localStorage persistence.
- Production GitHub Pages configuration using the `/MyHours/` Vite base path.
- PWA manifest, local icons, service worker, and repository-aware asset paths.
- GitHub Actions workflow that runs tests and builds before deploying `dist` to GitHub Pages.
- Responsive mobile-first layout.
- Accessibility labels, view-selector states, dialog semantics, validation announcements, invalid-field states, and live clock status messaging.
- Local `.gitignore` excluding `node_modules`, `dist`, environment files, and `.DS_Store`.

## Known issues

None currently recorded for the MVP.

## Next steps

The application is deployed and available at:

```text
https://tuss82.github.io/MyHours/
```

The deployment configuration was added in commit `e49da4a` (`Configure GitHub Pages deployment`),
and the GitHub Actions deployment completed successfully after GitHub Pages was enabled.

No further MVP work is currently planned. Resume from the latest committed state when development continues.

## Development environment

With Node.js available, open a terminal in the project directory.
When using a tool-launched PowerShell session with fnm, initialize fnm in the
same PowerShell process before running Node.js or npm commands:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

Then run:

```powershell
npm install
npm run dev
```

For a production validation:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
npm run build
```

The Git remote is:

```text
https://github.com/tuss82/MyHours.git
```

The project is configured for GitHub Pages under the `/MyHours/` repository path:

- Vite uses `base: '/MyHours/'`.
- The PWA manifest, icons, and service worker are emitted with repository-aware paths.
- `.github/workflows/deploy.yml` runs `npm ci`, `npm test`, `npm run build`, and deploys `dist`.
- Local checks completed successfully: `npm test` (4 tests passed) and `npm run build`.
- GitHub Pages is enabled and the deployment workflow is passing.
