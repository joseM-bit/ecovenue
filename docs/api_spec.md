# Especificació de l'API REST · EcoVenue

Totes les peticions i respostes s'intercanvien en format JSON.

## Endpoints Publics

### 1. Obtindre llista d'espais
- **URL:** `GET /api/espais`
- **Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "nom": "Sala Polivalent A",
    "capacitat": 80,
    "preu_hora": 25.00,
    "co2_hora_kg": 1.20,
    "estat": "ACTIU"
  }
]
