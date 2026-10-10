# Arquitectura del Sistema · EcoVenue

## Model Tres Capes (Client - Servidor - Base de Dades)

[Navegador Web / Client] 
     │
     │ Peticions HTTP Asíncrones (Fetch API / JSON)
     ▼
[API REST Backend (Node.js/Express o PHP)]
  ├── Middlewares (Autenticació JWT, Validació de dates)
  ├── Controlador de Reserves (Lògica de concurrència i càlcul CO2)
  └── ORM / SQL Driver
     │
     │ Consultes SQL Transaccionals (BEGIN / COMMIT / ROLLBACK)
     ▼
[Base de Dades Relacional (MySQL / PostgreSQL)]

## Flux de Concurrència en una Reserva
1. El Client envia `POST /api/reserves` amb `espai_id`, `data_inici` i `data_fi`.
2. El Backend inicia una transacció SQL.
3. El Backend executa una consulta amb bloqueig temporal (`FOR UPDATE` o comprovació de rangs):
   `SELECT * FROM Reserva WHERE espai_id = ? AND data_inici < ? AND data_fi > ?`
4. Si existeixen coincidències: el Backend retorna codi HTTP `409 Conflict` (Sala ocupada).
5. Si NO existeixen coincidències: insereix el registre, calcula el CO₂ total, executa `COMMIT` i retorna `201 Created`.
