# STP Control Dashboard

A simple frontend dashboard for sewage treatment plant monitoring.

## What it does

- Displays inlet and outlet readings for:
  - COD
  - BOD
  - TSS
  - TDS
  - pH
  - Nitrite + Nitrate as N
  - Fecal coliform
- Shows a dashboard summary with counts of healthy, warning, and critical parameters.
- Applies basic operational rules:
  - TSS increase: recommend pumping treated water back in to dilute solids.
  - BOD/COD increase: recommend stopping the plant briefly to increase residence time.

## Run

Start the server with `npm start`, then open `https://localhost:3443` in a browser.

If you open `index.html` directly from disk, the app stays in demo mode and will not use the live auth API.

## Notes

- The current version uses direct username/password auth plus browser local storage in demo mode.
- If you want live Google Sheets sync, the sheet needs to be published or exposed through an API/export URL.
