const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// BBDD temporal en memòria
const espais = [
  { id: 1, nom: 'Sala Polivalent A', capacitat: 80, preu_hora: 25.00, co2_hora_kg: 1.20 },
  { id: 2, nom: 'Auditori Principal', capacitat: 200, preu_hora: 60.00, co2_hora_kg: 2.80 }
];

const reserves = [];

// GET: Comprovar estat
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// GET: Llista d'espais
app.get('/api/espais', (req, res) => {
  res.status(200).json(espais);
});

// POST: Crear reserva amb control de concurrència (RA4)
app.post('/api/reserves', (req, res) => {
  const { espai_id, data, hores, email } = req.body;

  // 1. Validació de dades d'entrada
  if (!espai_id || !data || !hores || !email) {
    return res.status(400).json({ error: 'Tots els camps són obligatoris.' });
  }

  // 2. Control de concurrència: Comprovar si l'espai ja està reservat en la mateixa data
  const solapament = reserves.find(r => r.espai_id === Number(espai_id) && r.data === data);
  if (solapament) {
    return res.status(409).json({ 
      error: 'Conflicte de reserva: Aquest espai ja està reservat per a la data seleccionada.' 
    });
  }

  // 3. Càlcul d'impacte ambiental i preu
  const espai = espais.find(e => e.id === Number(espai_id));
  const preu_total = espai ? espai.preu_hora * Number(hores) : 0;
  const co2_total = espai ? espai.co2_hora_kg * Number(hores) : 0;

  const novaReserva = {
    id: reserves.length + 1,
    espai_id: Number(espai_id),
    data,
    hores: Number(hores),
    email,
    preu_total,
    co2_total,
    created_at: new Date()
  };

  reserves.push(novaReserva);
  res.status(201).json({ status: 'reserva_creada', reserva: novaReserva });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor EcoVenue ejecutándose en puerto ${PORT}`);
});
// GET: Resum de mètriques globals (SaaS)
app.get('/api/metriques', (req, res) => {
  const total_reserves = reserves.length;
  const ingressos_totals = reserves.reduce((acc, r) => acc + r.preu_total, 0);
  const co2_total_kg = reserves.reduce((acc, r) => acc + r.co2_total, 0);

  res.status(200).json({
    total_reserves,
    ingressos_totals: Number(ingressos_totals.toFixed(2)),
    co2_total_kg: Number(co2_total_kg.toFixed(2))
  });
});