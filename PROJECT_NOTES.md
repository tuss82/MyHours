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
- Responsive mobile-first layout.
- Accessibility labels, view-selector states, dialog semantics, validation announcements, invalid-field states, and live clock status messaging.
- Local `.gitignore` excluding `node_modules`, `dist`, environment files, and `.DS_Store`.

## Known issues

None currently recorded for the MVP.

## Next steps

None currently planned. Resume from the latest committed state when development continues.

## Development environment

Node.js is managed with fnm. The tool-launched Windows PowerShell session does not automatically load the PowerShell profile, so initialize fnm in every PowerShell process that runs Node.js or npm:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

Then run commands from the project directory:

```powershell
Set-Location C:\Users\tuss8\Documents\DAVE3625\NewProject
npm install
npm run dev
```

Do not modify the system PATH, PowerShell profile, or Node.js installation to work around this. For a production validation:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
npm run build
```

The Git remote is:

```text
https://github.com/tuss82/MyHours.git
```

GitHub Pages is not configured or enabled.
