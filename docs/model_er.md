# Model Entitat-Relació · EcoVenue

## Taules i Relacions

1. **USUARI**
   - `id` (PK, INT, AUTO_INCREMENT)
   - `nom` (VARCHAR 100, NOT NULL)
   - `email` (VARCHAR 150, UNIQUE, NOT NULL)
   - `password_hash` (VARCHAR 255, NOT NULL)
   - `rol` (ENUM('ADMIN', 'CLIENT'), DEFAULT 'CLIENT')
   - `created_at` (TIMESTAMP)

2. **ESPAI**
   - `id` (PK, INT, AUTO_INCREMENT)
   - `nom` (VARCHAR 100, NOT NULL)
   - `capacitat` (INT, NOT NULL)
   - `preu_hora` (DECIMAL(8,2), NOT NULL)
   - `co2_hora_kg` (DECIMAL(5,2), NOT NULL) -- Estimació de CO2 per hora d'ús
   - `descripcio` (TEXT)
   - `estat` (ENUM('ACTIU', 'MANTENIMENT'), DEFAULT 'ACTIU')

3. **RESERVA**
   - `id` (PK, INT, AUTO_INCREMENT)
   - `usuari_id` (FK -> USUARI.id, NOT NULL)
   - `espai_id` (FK -> ESPAI.id, NOT NULL)
   - `data_inici` (DATETIME, NOT NULL)
   - `data_fi` (DATETIME, NOT NULL)
   - `assistents` (INT, NOT NULL)
   - `co2_total_estimat` (DECIMAL(8,2))
   - `estat` (ENUM('PENDENT', 'CONFIRMADA', 'CANCEL·LADA'), DEFAULT 'PENDENT')

4. **SERVEI_EXTRA**
   - `id` (PK, INT, AUTO_INCREMENT)
   - `nom` (VARCHAR 100, NOT NULL)
   - `cost` (DECIMAL(8,2), NOT NULL)
   - `co2_estalviat_kg` (DECIMAL(5,2), DEFAULT 0) -- Impacte positiu (ex: vaixella reutilitzable)

5. **RESERVA_SERVEI** (Taula intermèdia M:N)
   - `reserva_id` (PK, FK -> RESERVA.id)
   - `servei_id` (PK, FK -> SERVEI_EXTRA.id)
   - `quantitat` (INT, DEFAULT 1)
