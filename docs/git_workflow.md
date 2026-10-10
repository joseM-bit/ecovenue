# Estratègia de Branques i Commits · EcoVenue

## Flux de Treball (GitHub Flow)
- `main`: Branca principal amb codi estable i desplegable a producció.
- `feature/<nom-tasca>`: Branques temporals per a desenvolupar noves funcionalitats (ex: `feature/api-espais`, `feature/calendari-frontend`).
- `fix/<nom-incidència>`: Branques per a corregir *bugs* o errors de concurrència.

## Convenció de Commits (Conventional Commits)
Tots els missatges de commit han de seguir l'estructura `tipus: descripció curta`:

- `feat:` Nova funcionalitat (ex: `feat: afegeix endpoint POST /api/reserves`).
- `fix:` Resolució d'un bug (ex: `fix: evita doble reserva en el mateix interval horari`).
- `docs:` Canvis en la documentació (ex: `docs: actualitza el README amb instruccions d'instal·lació`).
- `style:` Canvis de format o CSS sense afectar la lògica.
- `refactor:` Reestructuració de codi sense canviar la seua funcionalitat.
