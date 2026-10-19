# MyHours

MyHours is a mobile-first personal timesheet prototype built with React, Vite, and CSS. Shift data,  notes and the active clock-in timestamp are stored in the browser's `localStorage`; there is no backend or authentication.

The app is vibe-coded with GitHub Copilot.

## Run locally

Requires Node.js 18 or newer.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. To run the production build check:

```powershell
npm run build
```

## GitHub Pages

The production build is configured for the repository subpath `/MyHours/` and is
deployed automatically by the GitHub Actions workflow when changes are pushed
to `main`.

After enabling GitHub Pages with **GitHub Actions** as the source, the
application is available at:

<https://tuss82.github.io/MyHours/>
