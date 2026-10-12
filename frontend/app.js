let usuariActual = null;
let dadaReservaPendent = null;
let llistaEspais = [];
let espaiSeleccionat = null;
// Detectar entorn
const API_URL = window.location.hostname.includes('github.io')
    ? 'https://tu-api-ecovenue.onrender.com'
    : 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // Definir la data d'avui en format YYYY-MM-DD
    const avui = new Date().toISOString().split('T')[0];

    // Establir la data mínima al cercador principal de la Pantalla 1
    const filtreData = document.getElementById('filtre-data');
    if (filtreData) {
        filtreData.min = avui;
    }

    navegarA('pantalla-1');
    comprovarSessio();
    carregarCataleg();

    const formReserva = document.getElementById('form-reserva');
    if (formReserva) {
        formReserva.addEventListener('submit', gestionarIniciReserva);
    }
});

// -----------------------------------------------------------------
// NAVEGACIÓ I CONTROL DE VISTES
// -----------------------------------------------------------------
function navegarA(pantallaId) {
    if (pantallaId === 'pantalla-3') {
        if (!usuariActual || usuariActual.role !== 'admin') {
            alert('Accés denegat: Aquest panell és exclusiu per a l\'administrador.');
            obrirModalAuth();
            return;
        }
        carregarPanellAdmin();
    }

    document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
    
    const pantalla = document.getElementById(pantallaId);
    if (pantalla) {
        pantalla.style.display = 'block';
    }

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (pantallaId === 'pantalla-1') document.getElementById('link-p1')?.classList.add('active');
    if (pantallaId === 'pantalla-2') document.getElementById('link-p2')?.classList.add('active');
    if (pantallaId === 'pantalla-3') document.getElementById('link-p3')?.classList.add('active');
}

// -----------------------------------------------------------------
// AUTENTICACIÓ I CONTROL DE SESSIÓ
// -----------------------------------------------------------------
async function comprovarSessio() {
    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include' // Obligatori per enviar la cookie de sessió
        });
        const data = await res.json();

        const btnLogin = document.getElementById('btn-login-nav');
        const btnLogout = document.getElementById('btn-logout-nav');
        const userDisplay = document.getElementById('user-display');
        const linkP3 = document.getElementById('link-p3');
        const inputReservaEmail = document.getElementById('reserva-email');

        if (data.loggedIn) {
            usuariActual = data.user;
            
            // 1. Mostrar nom de l'usuari a la barra superior
            if (userDisplay) {
                userDisplay.style.display = 'inline-block';
                userDisplay.innerText = `👤 ${usuariActual.name}`;
            }
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnLogout) btnLogout.style.display = 'inline-block';

            if (linkP3) {
                linkP3.style.display = usuariActual.role === 'admin' ? 'inline-block' : 'none';
            }

            // 2. Emplenar automàticament el correu al formulari de reserva
            if (inputReservaEmail && usuariActual.email) {
                inputReservaEmail.value = usuariActual.email;
            }
        } else {
            usuariActual = null;
            if (btnLogin) btnLogin.style.display = 'inline-block';
            if (btnLogout) btnLogout.style.display = 'none';
            if (userDisplay) userDisplay.style.display = 'none';
            if (linkP3) linkP3.style.display = 'none';
        }
    } catch (err) {
        console.error('Error comprovant la sessió:', err);
    }
}

function obrirModalAuth() {
    switchAuthTab('login');
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLoginBtn.style.borderBottom = '2px solid #16a34a';
        tabLoginBtn.style.color = '#1a2e22';
        tabRegisterBtn.style.borderBottom = 'none';
        tabRegisterBtn.style.color = '#64748b';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabRegisterBtn.style.borderBottom = '2px solid #16a34a';
        tabRegisterBtn.style.color = '#1a2e22';
        tabLoginBtn.style.borderBottom = 'none';
        tabLoginBtn.style.color = '#64748b';
    }
}

// ==========================================
// INICI DE SESSIÓ (LOGIN)
// ==========================================
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value;

    if (!email || !password) {
        alert('Si us plau, introdueix el correu i la contrasenya');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const contentType = response.headers.get('content-type');
        let data = {};

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        closeAuthModal();
        await comprovarSessio();

        // Si l'usuari estava intentant fer una reserva, continua cap al checkout
        if (dadaReservaPendent) {
            mostrarCheckout();
        } else {
            alert(`Benvingut/da, ${data.user?.name || 'usuari'}!`);
        }

    } catch (error) {
        console.error('Error en iniciar sessió:', error);
        alert(error.message);
    }
}

// ==========================================
// REGISTRE D'USUARI
// ==========================================
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;

    if (!name || !email || !password) {
        alert('Si us plau, omple tots els camps');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include'
        });

        const contentType = response.headers.get('content-type');
        let data = {};
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        alert('Registre completat amb èxit! Ara pots iniciar sessió.');
        switchAuthTab('login');
    } catch (error) {
        console.error('Error al registrar:', error);
        alert(error.message);
    }
}

async function tancarSessio() {
    await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    usuariActual = null;
    await comprovarSessio();
    navegarA('pantalla-1');
}

// -----------------------------------------------------------------
// FLUIX DE RESERVA I PASSAREL·LA DE PAGAMENT
// -----------------------------------------------------------------
function gestionarIniciReserva(event) {
    event.preventDefault();

    dadaReservaPendent = {
        spaceId: 1,
        spaceTitle: document.getElementById('detall-nom-espai')?.innerText || 'L\'Hivernacle',
        date: document.getElementById('reserva-data').value,
        startTime: document.getElementById('hora-inici').value,
        endTime: document.getElementById('hora-fi').value,
        totalPrice: 1282.60
    };

    if (usuariActual) {
        mostrarCheckout();
    } else {
        obrirModalAuth();
    }
}

function mostrarCheckout() {
    document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
    
    const checkoutSummary = document.getElementById('checkoutDetails');
    checkoutSummary.innerHTML = `
        <div class="editorial-card" style="margin-bottom: 20px;">
            <h3>${dadaReservaPendent.spaceTitle}</h3>
            <p><strong>Data:</strong> ${dadaReservaPendent.date}</p>
            <p><strong>Horari:</strong> ${dadaReservaPendent.startTime} – ${dadaReservaPendent.endTime}</p>
            <p style="font-size: 1.2rem; color: #16a34a; font-weight: bold;">Import Total: ${dadaReservaPendent.totalPrice} €</p>
        </div>
    `;
    
    document.getElementById('checkoutSection').style.display = 'block';
}

async function processPayment() {
    try {
        const res = await fetch(`${API_URL}/api/reservations/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadaReservaPendent),
            credentials: 'include'
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('detalls-confirmacio').innerHTML = `
                <p><strong>Codi de localitzador:</strong> #${data.reservationId}</p>
                <p><strong>Espai:</strong> ${dadaReservaPendent.spaceTitle}</p>
                <p><strong>Data i hora:</strong> ${dadaReservaPendent.date} (${dadaReservaPendent.startTime} – ${dadaReservaPendent.endTime})</p>
                <p><strong>Estat del pagament:</strong> <span style="color: #16a34a; font-weight: bold;">PAGAT</span></p>
            `;
            dadaReservaPendent = null;
            navegarA('pantalla-confirmacio');
        } else {
            alert(data.error || 'Error en processar el pagament');
        }
    } catch (err) {
        alert('Error en contactar amb la passarel·la de pagament');
    }
}

// -----------------------------------------------------------------
// PANELL D'ADMINISTRACIÓ (PANELL 3)
// -----------------------------------------------------------------
async function carregarPanellAdmin() {
    try {
        const res = await fetch(`${API_URL}/api/admin/dashboard`, {
            credentials: 'include'
        });
        
        if (res.status === 403) {
            alert('Accés denegat.');
            navegarA('pantalla-1');
            return;
        }

        const data = await res.json();

        document.getElementById('admin-total-reserves').innerText = data.metrics?.totalBookings || 0;
        document.getElementById('admin-total-facturacio').innerText = data.metrics?.totalRevenue || '0,00 €';
        document.getElementById('admin-total-co2').innerText = data.metrics?.totalCO2Saved || '0 kg';

        const tbody = document.getElementById('taula-reserves-body');
        tbody.innerHTML = (data.requests || []).map(req => `
            <tr>
                <td>#${req.id}</td>
                <td>${req.space_title}</td>
                <td>${req.user_name} (${req.user_email})</td>
                <td>${req.reservation_date}</td>
                <td>${req.start_time} – ${req.end_time}</td>
                <td><span class="badge-status ${req.status}">${req.status}</span></td>
                <td><button class="btn-pill">Gestionar</button></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error carregant el panell d\'administració:', err);
    }
}

// -----------------------------------------------------------------
// CATÀLEG D'ESPAIS
// -----------------------------------------------------------------
async function carregarCataleg() {
    try {
        const response = await fetch(`${API_URL}/api/spaces`);

        const contentType = response.headers.get('content-type');
        let spaces = [];

        if (contentType && contentType.includes('application/json')) {
            spaces = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Servidor no retornà JSON (${response.status}): ${text.substring(0, 50)}...`);
        }

        if (!response.ok) {
            throw new Error(spaces.error || `Error HTTP ${response.status}`);
        }

        renderizarEspais(spaces);
    } catch (error) {
        console.error('Error carregant el catàleg:', error);
    }
}

function renderizarEspais(spaces) {
    const grid = document.getElementById('grid-cataleg');
    if (!grid) return;

    if (!spaces || spaces.length === 0) {
        grid.innerHTML = '<p class="no-results">No s’han trobat espais disponibles.</p>';
        return;
    }

    grid.innerHTML = spaces.map(espai => `
        <article class="space-card" onclick="carregarFitxaEspai(${espai.id})">
            <div class="card-image-box">
                <img src="${espai.image_url || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae'}" alt="${espai.title}">
            </div>
            <div class="card-content">
                <h3 class="card-title">${espai.title}</h3>
                <p class="card-info">Fins a ${espai.capacity} persones</p>
                <div class="card-meta">
                    <span class="card-price"><strong>${espai.price_per_hour} €</strong> / hora</span>
                    <span class="card-co2">🌱 ${espai.co2_emissions_kg} kg CO₂e/h</span>
                </div>
            </div>
        </article>
    `).join('');
}

function carregarFitxaEspai(id) {
    if (typeof navegarA === 'function') {
        navegarA('pantalla-2');
    }
}
// -----------------------------------------------------------------
// CATÀLEG D'ESPAIS
// -----------------------------------------------------------------
async function carregarCataleg() {
    try {
        const response = await fetch(`${API_URL}/api/spaces`);

        const contentType = response.headers.get('content-type');
        let spaces = [];

        if (contentType && contentType.includes('application/json')) {
            spaces = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Servidor no retornà JSON (${response.status}): ${text.substring(0, 50)}...`);
        }

        if (!response.ok) {
            throw new Error(spaces.error || `Error HTTP ${response.status}`);
        }

        // Garantizar que llistaEspais sea siempre un Array
        llistaEspais = Array.isArray(spaces) ? spaces : (spaces.spaces || spaces.data || []);
        renderizarEspais(llistaEspais);
    } catch (error) {
        console.error('Error carregant el catàleg:', error);
    }
}

function renderizarEspais(spaces) {
    const grid = document.getElementById('grid-cataleg');
    if (!grid) return;

    // Validar que se reciba un Array antes de iterar
    const llista = Array.isArray(spaces) ? spaces : [];

    if (llista.length === 0) {
        grid.innerHTML = '<p class="no-results" style="padding: 20px; text-align: center; color: #64748b;">No s’han trobat espais disponibles.</p>';
        return;
    }

    grid.innerHTML = llista.map(espai => `
        <article class="space-card" style="cursor: pointer;" onclick="carregarFitxaEspai(${espai.id})">
            <div class="card-image-box">
                <img src="${espai.image_url || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae'}" alt="${espai.title}">
            </div>
            <div class="card-content">
                <h3 class="card-title">${espai.title}</h3>
                <p class="card-info">Fins a ${espai.capacity} persones</p>
                <div class="card-meta">
                    <span class="card-price"><strong>${espai.price_per_hour} €</strong> / hora</span>
                    <span class="card-co2">🌱 ${espai.co2_emissions_kg} kg CO₂e/h</span>
                </div>
            </div>
        </article>
    `).join('');
}

// ==========================================
// MOSTRAR FICHA DEL SITIO SELECCIONADO
// ==========================================
function carregarFitxaEspai(id) {
    espaiSeleccionat = llistaEspais.find(item => item.id === id);

    if (!espaiSeleccionat) {
        console.error('Espai no trobat amb ID:', id);
        return;
    }

    // Actualizar detalles del espacio
    const elemBreadcrumb = document.getElementById('detall-nom-breadcrumb');
    const elemNom = document.getElementById('detall-nom-espai');
    const elemUbicacio = document.getElementById('detall-ubicacio');
    const elemPreu = document.getElementById('detall-preu-hora');
    const elemCo2 = document.getElementById('detall-co2-hora');
    const imgHero = document.querySelector('.hero-img');

    if (elemBreadcrumb) elemBreadcrumb.innerText = espaiSeleccionat.title;
    if (elemNom) elemNom.innerText = espaiSeleccionat.title;
    if (elemUbicacio) elemUbicacio.innerText = `Barcelona · Fins a ${espaiSeleccionat.capacity} persones`;
    if (elemPreu) elemPreu.innerText = `${espaiSeleccionat.price_per_hour} €`;
    if (elemCo2) elemCo2.innerText = `${espaiSeleccionat.co2_emissions_kg} kg CO₂e/h`;
    if (imgHero && espaiSeleccionat.image_url) imgHero.src = espaiSeleccionat.image_url;

    // Inicializar inputs de fecha, selectores de hora y cálculo dinámico
    inicialitzarDataIHoraris();

    navegarA('pantalla-2');
}

// -----------------------------------------------------------------
// FLUIX DE RESERVA
// -----------------------------------------------------------------
function gestionarIniciReserva(event) {
    event.preventDefault();

    if (!espaiSeleccionat) {
        alert('Selecciona un espai primer');
        return;
    }

    dadaReservaPendent = {
        spaceId: espaiSeleccionat.id,
        spaceTitle: espaiSeleccionat.title,
        date: document.getElementById('reserva-data').value,
        startTime: document.getElementById('hora-inici').value,
        endTime: document.getElementById('hora-fi').value,
        totalPrice: espaiSeleccionat.price_per_hour * 4 // Cálculo básico o total acumulado
    };

    if (usuariActual) {
        mostrarCheckout();
    } else {
        obrirModalAuth();
    }
}
// Funció per cercar/filtrar els espais del catàleg
function filtrarEspais() {
    const inputData = document.getElementById('filtre-data');
    const avui = new Date().toISOString().split('T')[0];

    // Validar si l'usuari intenta introduir manualment una data passada
    if (inputData && inputData.value && inputData.value < avui) {
        alert('No es poden cercar espais per a dates passades.');
        inputData.value = avui;
    }

    const aforamentMin = parseInt(document.getElementById('filtre-aforament')?.value || '0', 10);

    if (!Array.isArray(llistaEspais)) return;

    const resultats = llistaEspais.filter(espai => {
        if (aforamentMin > 0) {
            return espai.capacity >= aforamentMin;
        }
        return true;
    });

    renderizarEspais(resultats);
}
// ==========================================
// GESTIÓ DINÀMICA DE FRANGES HORÀRIES I PREUS
// ==========================================

// Inicializar la fecha por defecto a la fecha actual si no tiene valor
// ==========================================
// GESTIÓ DINÀMICA DE FRANGES HORÀRIES I VALIDACIONS DE DATA
// ==========================================

// Inicializar la fecha mínima a la fecha de hoy
function inicialitzarDataIHoraris() {
    const inputData = document.getElementById('reserva-data');
    const ara = new Date();
    const avui = ara.toISOString().split('T')[0];

    if (inputData) {
        // Deshabilitar la selección de días pasados en el calendario HTML5
        inputData.min = avui;
        
        // Si no hay fecha o es anterior a hoy, establecer la fecha actual por defecto
        if (!inputData.value || inputData.value < avui) {
            inputData.value = avui;
        }
    }

    poblarDesplegableHores();
}

// Poblar horas válidas considerando si la reserva es para hoy o días futuros
function poblarDesplegableHores() {
    const selectInici = document.getElementById('hora-inici');
    const inputData = document.getElementById('reserva-data');
    if (!selectInici) return;

    const ara = new Date();
    const avui = ara.toISOString().split('T')[0];
    const horaActual = ara.getHours();
    const dataSeleccionada = inputData ? inputData.value : avui;

    selectInici.innerHTML = '';

    // Si la fecha seleccionada es hoy, la hora de inicio debe ser posterior a la hora actual
    let horaMinima = 8; // Hora apertura por defecto
    if (dataSeleccionada === avui) {
        horaMinima = Math.max(8, horaActual + 1); // Al menos la siguiente hora
    }

    // Si ya es más tarde del horario comercial de hoy (20:00)
    if (horaMinima >= 20) {
        selectInici.innerHTML = '<option value="">Cap hora disponible avui</option>';
        const selectFi = document.getElementById('hora-fi');
        if (selectFi) selectFi.innerHTML = '<option value="">-</option>';
        recalcularResumReserva();
        return;
    }

    // Generar opciones de hora de inicio permitidas
    for (let h = horaMinima; h <= 19; h++) {
        const horaStr = h < 10 ? `0${h}:00` : `${h}:00`;
        selectInici.innerHTML += `<option value="${horaStr}">${horaStr}</option>`;
    }

    actualitzarOpcionsHoraFi();
}

// Actualizar opciones de la hora de fin garantizando que sea posterior a la de inicio
function actualitzarOpcionsHoraFi() {
    const selectInici = document.getElementById('hora-inici');
    const selectFi = document.getElementById('hora-fi');
    if (!selectInici || !selectFi || !selectInici.value) return;

    const horaIniciNum = parseInt(selectInici.value.split(':')[0], 10);
    selectFi.innerHTML = '';

    for (let h = horaIniciNum + 1; h <= 21; h++) {
        const horaStr = h < 10 ? `0${h}:00` : `${h}:00`;
        selectFi.innerHTML += `<option value="${horaStr}">${horaStr}</option>`;
    }

    // Seleccionar por defecto 2 horas después o la hora más cercana disponible
    const horaFiDefecte = Math.min(horaIniciNum + 2, 21);
    const horaFiStr = horaFiDefecte < 10 ? `0${horaFiDefecte}:00` : `${horaFiDefecte}:00`;
    selectFi.value = horaFiStr;

    recalcularResumReserva();
}

// Recalcular horas y precios dinámicamente
function recalcularResumReserva() {
    if (!espaiSeleccionat) return;

    const horaInici = document.getElementById('hora-inici')?.value;
    const horaFi = document.getElementById('hora-fi')?.value;

    const elemHours = document.getElementById('summary-hours');
    const elemSubtotal = document.getElementById('summary-subtotal');
    const elemTotal = document.getElementById('summary-total');

    if (!horaInici || !horaFi || horaInici === '') {
        if (elemHours) elemHours.innerText = '0 hores';
        if (elemSubtotal) elemSubtotal.innerText = '0,00 €';
        if (elemTotal) elemTotal.innerText = '0,00 €';
        dadaReservaPendent = null;
        return;
    }

    const hInici = parseInt(horaInici.split(':')[0], 10);
    const hFi = parseInt(horaFi.split(':')[0], 10);
    const horesTotals = Math.max(1, hFi - hInici);

    const preuHora = parseFloat(espaiSeleccionat.price_per_hour) || 0;
    let subtotal = horesTotals * preuHora;

    const checkCatering = document.getElementById('check-catering');
    const checkAudiovisual = document.getElementById('check-audiovisual');

    if (checkCatering && checkCatering.checked) {
        const aforament = parseInt(espaiSeleccionat.capacity, 10) || 20;
        subtotal += aforament * 12;
    }

    if (checkAudiovisual && checkAudiovisual.checked) {
        subtotal += 80;
    }

    const totalIva = subtotal * 1.21;

    if (elemHours) elemHours.innerText = `${horesTotals} hores`;
    if (elemSubtotal) elemSubtotal.innerText = `${subtotal.toFixed(2).replace('.', ',')} €`;
    if (elemTotal) elemTotal.innerText = `${totalIva.toFixed(2).replace('.', ',')} €`;

    dadaReservaPendent = {
        spaceId: espaiSeleccionat.id,
        spaceTitle: espaiSeleccionat.title,
        date: document.getElementById('reserva-data')?.value,
        startTime: horaInici,
        endTime: horaFi,
        totalPrice: totalIva.toFixed(2)
    };
}

// Actualizar franjas en el calendario visual
function actualitzarCalendariIPreu() {
    const inputData = document.getElementById('reserva-data');
    const monthTitle = document.getElementById('calendar-month-title');
    const slotsContainer = document.getElementById('slots-container');

    const ara = new Date();
    const avui = ara.toISOString().split('T')[0];
    const horaActual = ara.getHours();

    // Validar si el usuario introduce manualmente una fecha pasada
    if (inputData && inputData.value < avui) {
        alert('No es poden seleccionar dates passades.');
        inputData.value = avui;
    }

    poblarDesplegableHores();

    const dataSeleccionada = inputData ? inputData.value : avui;

    if (dataSeleccionada && monthTitle) {
        const dataObj = new Date(dataSeleccionada);
        const opcions = { month: 'long', year: 'numeric' };
        monthTitle.innerText = dataObj.toLocaleDateString('ca-ES', opcions);
    }

    if (slotsContainer) {
        const horaIniciSel = parseInt(document.getElementById('hora-inici')?.value?.split(':')[0] || '0', 10);
        const horaFiSel = parseInt(document.getElementById('hora-fi')?.value?.split(':')[0] || '0', 10);

        let htmlSlots = '';
        for (let h = 8; h < 20; h++) {
            const horaIniciSlot = `${h < 10 ? '0' + h : h}:00`;
            const horaFiSlot = `${(h + 1) < 10 ? '0' + (h + 1) : (h + 1)}:00`;

            const esPasat = (dataSeleccionada === avui && h <= horaActual);
            const isSelected = !esPasat && (h >= horaIniciSel && h < horaFiSel);

            let clase = 'slot';
            let estatText = 'Disponible';

            if (esPasat) {
                clase = 'slot occupied';
                estatText = 'No disponible';
            } else if (isSelected) {
                clase = 'slot selected';
                estatText = 'Seleccionat';
            }

            htmlSlots += `
                <button type="button" class="${clase}" ${esPasat ? 'disabled' : ''} onclick="seleccionarFranjaSlot(${h})">
                    ${horaIniciSlot}–${horaFiSlot}<br><small>${estatText}</small>
                </button>
            `;
        }
        slotsContainer.innerHTML = htmlSlots;
    }

    recalcularResumReserva();
}

// Seleccionar franja al hacer clic en las casillas del calendario
function seleccionarFranjaSlot(hora) {
    const selectInici = document.getElementById('hora-inici');
    if (!selectInici) return;

    const horaIniciStr = `${hora < 10 ? '0' + hora : hora}:00`;
    selectInici.value = horaIniciStr;
    actualitzarOpcionsHoraFi();
}