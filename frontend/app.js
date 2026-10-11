// Configuración dinámica del backend
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ecovenue-tb58.onrender.com';

// Precios base
const PREU_HORA = 95;
const PREU_CATERING_PERS = 12;
const PREU_AUDIOVISUAL = 80;
const CO2_PER_HORA = 2.1;

// Elementos de la Calculadora en Tiempo Real
const selectHoraInici = document.getElementById('hora-inici');
const selectHoraFi = document.getElementById('hora-fi');
const selectPersones = document.getElementById('reserva-persones');
const checkCatering = document.getElementById('check-catering');
const checkAudiovisual = document.getElementById('check-audiovisual');

function calcularResum() {
  const hInici = parseInt(selectHoraInici.value.split(':')[0]);
  const hFi = parseInt(selectHoraFi.value.split(':')[0]);
  const hores = Math.max(1, hFi - hInici);
  const persones = parseInt(selectPersones.value);

  // Totales parciales
  const preuEspai = hores * PREU_HORA;
  const preuCatering = checkCatering.checked ? (persones * PREU_CATERING_PERS) : 0;
  const preuAV = checkAudiovisual.checked ? PREU_AUDIOVISUAL : 0;

  const subtotal = preuEspai + preuCatering + preuAV;
  const iva = subtotal * 0.21;
  const total = subtotal + iva;
  const co2Estalviat = (hores * CO2_PER_HORA).toFixed(1);

  // Actualizar DOM
  document.getElementById('summary-hours').textContent = hores;
  document.getElementById('summary-people').textContent = persones;
  document.getElementById('summary-price-space').textContent = `${preuEspai.toFixed(2).replace('.', ',')} €`;
  
  // Mostrar / Ocultar Catering en resumen
  const rowCatering = document.getElementById('row-catering');
  if (checkCatering.checked) {
    rowCatering.style.display = 'flex';
    document.getElementById('summary-price-catering').textContent = `${preuCatering.toFixed(2).replace('.', ',')} €`;
  } else {
    rowCatering.style.display = 'none';
  }

  // Mostrar / Ocultar Audiovisual en resumen
  const rowAV = document.getElementById('row-audiovisual');
  if (checkAudiovisual.checked) {
    rowAV.style.display = 'flex';
    document.getElementById('summary-price-av').textContent = `${preuAV.toFixed(2).replace('.', ',')} €`;
  } else {
    rowAV.style.display = 'none';
  }

  document.getElementById('summary-subtotal').textContent = `${subtotal.toFixed(2).replace('.', ',')} €`;
  document.getElementById('summary-iva').textContent = `${iva.toFixed(2).replace('.', ',')} €`;
  document.getElementById('summary-total').textContent = `${total.toFixed(2).replace('.', ',')} €`;
  document.getElementById('co2-total-calc').textContent = co2Estalviat.replace('.', ',');
  document.getElementById('summary-meta').textContent = `23 oct · ${selectHoraInici.value}-${selectHoraFi.value} · ${persones} persones`;
}

// Event Listeners para recálculo instantáneo
[selectHoraInici, selectHoraFi, selectPersones, checkCatering, checkAudiovisual].forEach(el => {
  if (el) el.addEventListener('change', calcularResum);
});

// Procesar el envío del formulario al backend PostgreSQL
const formReserva = document.getElementById('form-reserva-figma');
if (formReserva) {
  formReserva.addEventListener('submit', async (e) => {
    e.preventDefault();

    const hInici = parseInt(selectHoraInici.value.split(':')[0]);
    const hFi = parseInt(selectHoraFi.value.split(':')[0]);
    const hores = Math.max(1, hFi - hInici);

    const payload = {
      espai_id: 1, // L'Hivernacle
      data: document.getElementById('reserva-data').value,
      hores: hores,
      email: document.getElementById('reserva-email').value
    };

    try {
      const response = await fetch(`${API_URL}/api/reserves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Aquest espai ja està reservat en aquesta data.');
      }

      alert(`✅ Sol·licitud enviada amb èxit!\nCodi de Reserva: #${data.reserva.id}\nI.V.A inclòs.`);

    } catch (err) {
      alert(`❌ Error en la reserva: ${err.message}`);
    }
  });
}

// Inicializar vista al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  calcularResum();
});