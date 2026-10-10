const API_URL = 'http://localhost:3000';

// 1. Comprovar estat del backend
fetch(`${API_URL}/ping`)
  .then(res => res.json())
  .then(data => {
    document.getElementById('api-status').innerHTML = `✅ Backend connectat (Estat: ${data.status})`;
  })
  .catch(err => {
    document.getElementById('api-status').innerHTML = `❌ Error de connexió amb el servidor backend`;
  });

// 2. Carregar espais al catàleg i al desplegable del formulari
function carregarEspais() {
  fetch(`${API_URL}/api/espais`)
    .then(res => res.json())
    .then(espais => {
      const contenidor = document.getElementById('llista-espais');
      const select = document.getElementById('reserva-espai');
      
      contenidor.innerHTML = '';
      select.innerHTML = '<option value="">Selecciona un espai</option>';

      espais.forEach(espai => {
        // Renderitzar targeta
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h3>${espai.nom}</h3>
          <p>Capacitat: ${espai.capacitat} persones | Preu: ${espai.preu_hora} €/hora</p>
          <p>Impacte estimat: <span class="badge">${espai.co2_hora_kg} kg CO₂/h</span></p>
        `;
        contenidor.appendChild(card);

        // Omplir desplegable
        const option = document.createElement('option');
        option.value = espai.id;
        option.textContent = espai.nom;
        select.appendChild(option);
      });
    })
    .catch(err => {
      document.getElementById('llista-espais').innerHTML = "<p>Error en carregar la llista d'espais.</p>";
    });
}
// Carregar i renderitzar mètriques globals
function carregarMetriques() {
  fetch(`${API_URL}/api/metriques`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('kpi-reserves').textContent = data.total_reserves;
      document.getElementById('kpi-facturacio').textContent = `${data.ingressos_totals.toFixed(2)} €`;
      document.getElementById('kpi-co2').textContent = `${data.co2_total_kg.toFixed(2)} kg`;
    })
    .catch(err => console.error('Error carregant mètriques:', err));
}
// 3. Processar la reserva (POST)
document.getElementById('form-reserva').addEventListener('submit', (e) => {
  e.preventDefault();

  const missatgeDiv = document.getElementById('missatge-reserva');
  missatgeDiv.className = 'msg';

  const dadesReserva = {
    espai_id: document.getElementById('reserva-espai').value,
    data: document.getElementById('reserva-data').value,
    hores: document.getElementById('reserva-hores').value,
    email: document.getElementById('reserva-email').value
  };

  fetch(`${API_URL}/api/reserves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dadesReserva)
  })
  .then(async res => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  })
  .then(data => {
    missatgeDiv.className = 'msg ok';
    missatgeDiv.innerHTML = `✅ Reserva confirmada! Preu total: ${data.reserva.preu_total}€ | Impacte: ${data.reserva.co2_total} kg CO₂`;
    document.getElementById('form-reserva').reset();
  })
  .catch(err => {
    missatgeDiv.className = 'msg error';
    missatgeDiv.innerHTML = `❌ ${err.message}`;
  });
});

carregarEspais();
carregarMetriques();