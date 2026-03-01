# Simply Weather 2

Minimal, client-side weather app designed from Figma for mobile-first use and deployed on GitHub Pages.

## Stack

- React + TypeScript + Vite
- Open-Meteo APIs (forecast, archive, geocoding)
- Native drag/scroll + CSS snap (no carousel libraries)

## Features

- Temperature-driven background color bands
- Figma-matched gradient overlay and modal scrim
- 24-hour rail (`-11h`, current, `+12h`) with 5 visible cards
- 20-day rail (`-9d`, today, `+10d`) with 4 visible cards
- Past cards are dimmed but legible
- Search modal with city autocomplete
- Reset button returns to user location and current day/hour
- Persists location, unit, and selected day/hour in localStorage

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run test
npm run build
```

## GitHub Pages

A Pages workflow is included at `.github/workflows/deploy.yml`.

- On `main` push, CI builds with `BASE_PATH=/<repo-name>/`
- `vite.config.ts` reads `BASE_PATH` (or `VITE_BASE_PATH`) for deploy-safe asset paths
