# Registre d'Incidències · EcoVenue (RA4)

## Incidència #1 · Error d'execució al Backend (`MODULE_NOT_FOUND`)

- **Data:** 2026-10-10
- **Afectació:** Servidor Backend (`/backend`)
- **Tipus:** Error d'entorn / Falta de dependències
- **Símptoma:** En executar `node server.js`, Node.js llança l'excepció `Error: Cannot find module 'express'`.
- **Causa arrel:** Les llibreries `express` i `cors` no s'havien instal·lat dins del directori `/backend` ni figuraven al fitxer `package.json`.
- **Solució aplicada:** 
  1. Execució de `npm install express cors` a la carpeta `backend/`.
  2. Generació de la carpeta `node_modules` i el fitxer `package-lock.json`.
  3. Reexecució de `node server.js` confirmant el funcionament a `http://localhost:3000`.
- **Estat:** Resolt
- **Temps de resolució:** 10 minuts
