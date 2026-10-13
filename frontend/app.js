let usuariActual = null;
let dadaReservaPendent = null;
let llistaEspais = [];
let espaiSeleccionat = null;
let preferitsUsuari = [];

// Detectar entorno
const API_URL = window.location.hostname.includes('github.io')
    ? 'https://tu-api-ecovenue.onrender.com'
    : 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const avui = new Date().toISOString().split('T')[0];

    // 1. Configurar la data per defecte al filtre del catàleg
    const filtreData = document.getElementById('filtre-data');
    if (filtreData) {
        filtreData.min = avui;
        filtreData.value = avui;
    }

    // 2. Activar el clic a la badge d'usuari per obrir el Perfil
    const userBadge = document.getElementById('user-display');
    if (userBadge) {
        userBadge.style.cursor = 'pointer';
        userBadge.onclick = obrirModalPerfil;
    }

    // 3. Inicialitzar la navegació, sessió i el catàleg
    navegarA('pantalla-1');
    comprovarSessio();
    carregarCataleg();

    // 4. Escoltador per al formulari de reserva
    const formReserva = document.getElementById('form-reserva');
    if (formReserva) {
        formReserva.addEventListener('submit', gestionarIniciReserva);
    }
});

// -----------------------------------------------------------------
// NAVEGACIÓ I CONTROL DE VISTES
// -----------------------------------------------------------------
function navegarA(pantallaId) {
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = 'none';
    });

    const target = document.getElementById(pantallaId);
    if (target) {
        target.style.display = 'block';
    }

    if (pantallaId === 'pantalla-3') {
        carregarDashboardAdmin();
    }
}

// -----------------------------------------------------------------
// AUTENTICACIÓ I CONTROL DE SESSIÓ
// -----------------------------------------------------------------
async function comprovarSessio() {
    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include'
        });
        const data = await res.json();

        const btnLogin = document.getElementById('btn-login-nav');
        const btnLogout = document.getElementById('btn-logout-nav');
        const userDisplay = document.getElementById('user-display');
        const linkP3 = document.getElementById('link-p3');
        const inputReservaEmail = document.getElementById('reserva-email');

        if (data.loggedIn) {
            usuariActual = data.user;
            
            if (userDisplay) {
                userDisplay.style.display = 'inline-block';
                userDisplay.innerText = `👤 ${usuariActual.name}`;
            }
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnLogout) btnLogout.style.display = 'inline-block';

            if (linkP3) {
                linkP3.style.display = usuariActual.role === 'admin' ? 'inline-block' : 'none';
            }

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

        llistaEspais = Array.isArray(spaces) ? spaces : (spaces.spaces || spaces.data || []);
        renderizarEspais(llistaEspais);
    } catch (error) {
        console.error('Error carregant el catàleg:', error);
    }
}

function renderizarEspais(spaces) {
    const grid = document.getElementById('grid-cataleg');
    if (!grid) return;

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

// -----------------------------------------------------------------
// FITXA DE L'ESPAI SELECCIONAT
// -----------------------------------------------------------------
function carregarFitxaEspai(id) {
    // Usar com comparació == per si un id ve com a cadena de text
    espaiSeleccionat = llistaEspais.find(item => item.id == id);

    if (!espaiSeleccionat) {
        console.error('Espai no trobat amb ID:', id);
        return;
    }

    // Actualitzar detalls generals
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

    // 1. Mostrar vista de la fitxa
    navegarA('pantalla-2');

    // 2. Executar inicialització de blocs
    inicialitzarDataIHoraris();
    renderizarAmenities(espaiSeleccionat.amenities);
    actualitzarCalendariIPreu();
    // Carregar preferits i actualitzar l'estat del botó
    carregarPreferits();
    actualitzarBotoFavorit();
}

function renderizarAmenities(amenitiesData) {
    const gridAmenities = document.getElementById('detall-amenities');
    if (!gridAmenities) return;

    let llista = [];
    try {
        if (typeof amenitiesData === 'string') {
            llista = JSON.parse(amenitiesData);
        } else if (Array.isArray(amenitiesData)) {
            llista = amenitiesData;
        }
    } catch (e) {
        console.error('Error parsejant amenities:', e);
        llista = [];
    }

    if (!llista || llista.length === 0) {
        gridAmenities.innerHTML = '<p style="color: #64748b; grid-column: 1/-1;">Aquest espai no té equipaments especificats.</p>';
        return;
    }

    gridAmenities.innerHTML = llista.map(item => `
        <div class="amenity-item">
            <span class="amenity-icon">${item.icon || '✓'}</span>
            <div>
                <strong>${item.title || 'Equipament'}</strong>
                <p>${item.desc || ''}</p>
            </div>
        </div>
    `).join('');
}

function filtrarEspais() {
    const inputData = document.getElementById('filtre-data');
    const avui = new Date().toISOString().split('T')[0];

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

// -----------------------------------------------------------------
// GESTIÓ DINÀMICA DE FRANGES HORÀRIES I CALENDARI
// -----------------------------------------------------------------
function inicialitzarDataIHoraris() {
    const inputData = document.getElementById('reserva-data');
    if (inputData && !inputData.value) {
        const avui = new Date().toISOString().split('T')[0];
        inputData.value = avui;
        inputData.min = avui;
    }
}

function poblarDesplegableHores() {
    const selectInici = document.getElementById('hora-inici');
    const inputData = document.getElementById('reserva-data');
    if (!selectInici || !espaiSeleccionat) return;

    const ara = new Date();
    const avui = ara.toISOString().split('T')[0];
    const horaActual = ara.getHours();
    const dataSeleccionada = inputData ? inputData.value : avui;

    const opening = espaiSeleccionat.opening_time || '08:00:00';
    const closing = espaiSeleccionat.closing_time || '20:00:00';

    const horaObertura = parseInt(opening.split(':')[0], 10) || 8;
    const horaTancament = parseInt(closing.split(':')[0], 10) || 20;

    selectInici.innerHTML = '';

    let horaMinima = horaObertura;
    if (dataSeleccionada === avui) {
        horaMinima = Math.max(horaObertura, horaActual + 1);
    }

    if (horaMinima >= horaTancament) {
        selectInici.innerHTML = '<option value="">Cap hora disponible avui</option>';
        const selectFi = document.getElementById('hora-fi');
        if (selectFi) selectFi.innerHTML = '<option value="">-</option>';
        recalcularResumReserva();
        return;
    }

    for (let h = horaMinima; h < horaTancament; h++) {
        const horaStr = h < 10 ? `0${h}:00` : `${h}:00`;
        selectInici.innerHTML += `<option value="${horaStr}">${horaStr}</option>`;
    }

    actualitzarOpcionsHoraFi();
}

function actualitzarOpcionsHoraFi() {
    const selectInici = document.getElementById('hora-inici');
    const selectFi = document.getElementById('hora-fi');
    if (!selectInici || !selectFi || !selectInici.value || !espaiSeleccionat) return;

    const horaIniciNum = parseInt(selectInici.value.split(':')[0], 10);
    const closing = espaiSeleccionat.closing_time || '20:00:00';
    const horaTancament = parseInt(closing.split(':')[0], 10) || 20;

    selectFi.innerHTML = '';

    for (let h = horaIniciNum + 1; h <= horaTancament; h++) {
        const horaStr = h < 10 ? `0${h}:00` : `${h}:00`;
        selectFi.innerHTML += `<option value="${horaStr}">${horaStr}</option>`;
    }

    const horaFiDefecte = Math.min(horaIniciNum + 2, horaTancament);
    const horaFiStr = horaFiDefecte < 10 ? `0${horaFiDefecte}:00` : `${horaFiDefecte}:00`;
    selectFi.value = horaFiStr;

    recalcularResumReserva();
}

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

function actualitzarCalendariIPreu() {
    const inputData = document.getElementById('reserva-data');
    const monthTitle = document.getElementById('calendar-month-title');
    const slotsContainer = document.getElementById('slots-container');

    if (!espaiSeleccionat) return;

    const ara = new Date();
    const avui = ara.toISOString().split('T')[0];
    const horaActual = ara.getHours();

    poblarDesplegableHores();

    const dataSeleccionada = (inputData && inputData.value) ? inputData.value : avui;

    if (monthTitle) {
        const dataObj = new Date(dataSeleccionada + 'T00:00:00');
        monthTitle.innerText = dataObj.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
    }

    if (slotsContainer) {
        const selectInici = document.getElementById('hora-inici');
        const selectFi = document.getElementById('hora-fi');

        const horaIniciSel = selectInici && selectInici.value ? parseInt(selectInici.value.split(':')[0], 10) : 0;
        const horaFiSel = selectFi && selectFi.value ? parseInt(selectFi.value.split(':')[0], 10) : 0;

        const opening = espaiSeleccionat.opening_time || '08:00:00';
        const closing = espaiSeleccionat.closing_time || '20:00:00';

        const horaObertura = parseInt(opening.split(':')[0], 10) || 8;
        const horaTancament = parseInt(closing.split(':')[0], 10) || 20;

        let htmlSlots = '';
        for (let h = horaObertura; h < horaTancament; h++) {
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

function seleccionarFranjaSlot(hora) {
    const selectInici = document.getElementById('hora-inici');
    if (!selectInici) return;

    const horaIniciStr = `${hora < 10 ? '0' + hora : hora}:00`;
    selectInici.value = horaIniciStr;
    actualitzarOpcionsHoraFi();
}

// -----------------------------------------------------------------
// FLUIX DE RESERVA I CHECKOUT
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
        totalPrice: document.getElementById('summary-total')?.innerText.replace(' €', '') || '0'
    };

    if (usuariActual) {
        mostrarCheckout();
    } else {
        obrirModalAuth();
    }
}

// 1. Mostrar la pantalla de Checkout amb formulari de facturació
async function mostrarCheckout() {
    document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
    
    // Carregar dades de facturació actuals de l'usuari si ja existeixen
    let nif = '', phone = '', address = '';
    try {
        const res = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                nif = data.user.nif || '';
                phone = data.user.phone || '';
                address = data.user.address || '';
            }
        }
    } catch (e) {
        console.error('Error carregant dades de facturació:', e);
    }

    const checkoutSummary = document.getElementById('checkoutDetails');
    if (checkoutSummary) {
        checkoutSummary.innerHTML = `
            <!-- Resum de la Reserva -->
            <div class="editorial-card" style="margin-bottom: 20px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: white;">
                <h3>${dadaReservaPendent.spaceTitle}</h3>
                <p><strong>Data:</strong> ${dadaReservaPendent.date}</p>
                <p><strong>Horari:</strong> ${dadaReservaPendent.startTime} – ${dadaReservaPendent.endTime}</p>
                <p style="font-size: 1.2rem; color: #16a34a; font-weight: bold; margin-top: 10px;">Import Total: ${dadaReservaPendent.totalPrice} €</p>
            </div>

            <!-- Formulari de Dades de Facturació -->
            <div class="editorial-card" style="margin-bottom: 20px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
                <h4 style="margin-bottom: 8px; color: #1e293b;">📄 Dades de Facturació</h4>
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 15px;">Aquestes dades s'utilitzaran per emetre la factura de la reserva:</p>
                
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.85rem; font-weight: bold;">NIF / CIF *</label>
                        <input type="text" id="checkout-nif" value="${nif}" placeholder="12345678X" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px;" required>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Telèfon *</label>
                        <input type="tel" id="checkout-phone" value="${phone}" placeholder="+34 600 000 000" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px;" required>
                    </div>
                </div>
                <div>
                    <label style="font-size: 0.85rem; font-weight: bold;">Adreça de Facturació *</label>
                    <input type="text" id="checkout-address" value="${address}" placeholder="Carrer, Número, Pis, Ciutat" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px;" required>
                </div>
            </div>
        `;
    }
    
    document.getElementById('checkoutSection').style.display = 'block';
}

async function processPayment() {
    const nif = document.getElementById('checkout-nif')?.value.trim();
    const phone = document.getElementById('checkout-phone')?.value.trim();
    const address = document.getElementById('checkout-address')?.value.trim();

    if (!nif || !phone || !address) {
        alert('Si us plau, omple totes les dades de facturació (NIF, Telèfon i Adreça) abans de pagar.');
        return;
    }

    const payload = {
        ...dadaReservaPendent,
        nif,
        phone,
        address
    };

    try {
        const res = await fetch(`${API_URL}/api/reservations/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        const data = await res.json();

        if (data.success) {
            const confirmBox = document.getElementById('detalls-confirmacio');
            if (confirmBox) {
                confirmBox.innerHTML = `
                    <p><strong>Codi de localitzador:</strong> #${data.reservationId}</p>
                    <p><strong>Espai:</strong> ${dadaReservaPendent.spaceTitle}</p>
                    <p><strong>Data i hora:</strong> ${dadaReservaPendent.date} (${dadaReservaPendent.startTime} – ${dadaReservaPendent.endTime})</p>
                    <p><strong>Estat del pagament:</strong> <span style="color: #16a34a; font-weight: bold;">PAGAT</span></p>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 0.9rem; color: #64748b;"><strong>Factura a nom de:</strong> ${nif} (${address})</p>
                    <br>
                    <button class="btn-submit-main" onclick="obrirModalPerfil(); switchProfileTab('reserves');" style="padding: 10px 15px;">📅 Veure les meves reserves al perfil</button>
                `;
            }
            dadaReservaPendent = null;
            navegarA('pantalla-confirmacio');
        } else {
            alert(data.error || 'Error en processar el pagament');
        }
    } catch (err) {
        console.error('Error en checkout:', err);
        alert('Error en contactar amb la passarel·la de pagament');
    }
}
// -----------------------------------------------------------------
// SISTEMA DE NOTIFICACIONS TOAST (REEMPLAÇA ELS ALERTS NATIUS)
// -----------------------------------------------------------------
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.padding = '12px 20px';
    toast.style.marginBottom = '10px';
    toast.style.borderRadius = '6px';
    toast.style.color = 'white';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.background = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb';
    toast.innerText = message;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// -----------------------------------------------------------------
// GENERACIÓ I DESCÀRREGA DE FACTURA PDF
// -----------------------------------------------------------------
function descarregarFacturaPDF() {
    const element = document.getElementById('factura-pdf-area');
    if (!element) return;

    const opt = {
        margin:       10,
        filename:     `Factura_EcoVenue_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    showToast('Factura descarregada en PDF', 'info');
}

// -----------------------------------------------------------------
// FILTRATGE AVANÇAT DEL CATÀLEG
// -----------------------------------------------------------------
function filtrarEspaisAvançat() {
    const query = document.getElementById('filtre-text')?.value.toLowerCase() || '';
    const aforamentMin = parseInt(document.getElementById('filtre-aforament')?.value || '0', 10);

    const filtrats = llistaEspais.filter(espai => {
        const coincideixNom = espai.title.toLowerCase().includes(query);
        const coincideixCap = aforamentMin === 0 || espai.capacity >= aforamentMin;
        return coincideixNom && coincideixCap;
    });

    renderizarEspais(filtrats);
}

// -----------------------------------------------------------------
// CARREGAR I ENVIAR RESSENYES
// -----------------------------------------------------------------
async function carregarRessenyes(spaceId) {
    try {
        const res = await fetch(`${API_URL}/api/spaces/${spaceId}/reviews`);
        const reviews = await res.json();
        const container = document.getElementById('llista-ressenyes');

        if (container) {
            if (!reviews || reviews.length === 0) {
                container.innerHTML = '<p style="color:#64748b;">Aquest espai encara no té cap valoració de clients.</p>';
            } else {
                container.innerHTML = reviews.map(r => `
                    <div style="border-bottom: 1px solid #f1f5f9; padding: 12px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>👤 ${r.user_name}</strong>
                            <span style="color:#f59e0b;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        <p style="margin: 6px 0 0 0; color: #334155; font-size:0.95rem;">${r.comment || 'Sense comentari escrit.'}</p>
                    </div>
                `).join('');
            }
        }

        // Comprovar si l'usuari actual té dret a opina (reserva passada)
        const reviewFormArea = document.getElementById('area-formulari-ressenya');
        if (reviewFormArea) {
            if (!usuariActual) {
                reviewFormArea.innerHTML = `
                    <div style="background:#f8fafc; padding:15px; border-radius:6px; border:1px solid #e2e8f0; color:#64748b; font-size:0.9rem;">
                        🔒 <a href="#" onclick="obrirModalAuth()" style="color:#16a34a; font-weight:bold;">Inicia sessió</a> per deixar una valoració si ja has utilitzat aquest espai.
                    </div>`;
            } else {
                reviewFormArea.innerHTML = `
                    <h3 style="font-size: 1.1rem; margin-bottom: 12px;">Deixa la teva opinió</h3>
                    <form onsubmit="enviarRessenya(event)" style="display: flex; flex-direction: column; gap: 12px; max-width: 550px;">
                        <label style="font-weight: 500;">Puntuació:
                          <select id="rev-rating" style="padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-left: 8px;">
                            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                            <option value="4">⭐⭐⭐⭐ (4/5)</option>
                            <option value="3">⭐⭐⭐ (3/5)</option>
                            <option value="2">⭐⭐ (2/5)</option>
                            <option value="1">⭐ (1/5)</option>
                          </select>
                        </label>
                        <textarea id="rev-comment" placeholder="Escriu com va anar la teva experiència en aquest espai..." rows="3" style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; width: 100%;" required></textarea>
                        <button type="submit" class="btn-submit-main" style="width: fit-content; padding: 10px 20px;">Enviar Valoració</button>
                    </form>`;
            }
        }
    } catch (e) {
        console.error('Error carregant ressenyes:', e);
    }
}

async function enviarRessenya(event) {
    event.preventDefault();
    if (!usuariActual) {
        showToast('Inicia sessió per deixar una valoració', 'error');
        obrirModalAuth();
        return;
    }

    const rating = document.getElementById('rev-rating').value;
    const comment = document.getElementById('rev-comment').value;

    try {
        const res = await fetch(`${API_URL}/api/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spaceId: espaiSeleccionat.id, rating, comment }),
            credentials: 'include'
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Gràcies per la teva valoració!', 'success');
            document.getElementById('rev-comment').value = '';
            carregarRessenyes(espaiSeleccionat.id);
        } else {
            showToast(data.error || 'Error en enviar la ressenya', 'error');
        }
    } catch (e) {
        showToast('Error de connexió', 'error');
    }
}
// -----------------------------------------------------------------
// PANELL D'ADMINISTRACIÓ (DASHBOARD)
// -----------------------------------------------------------------
async function carregarDashboardAdmin() {
    try {
        await carregarCataleg();
        renderizarTaulaEspaisAdmin();

        const res = await fetch(`${API_URL}/api/admin/reservations`, {
            credentials: 'include'
        });
        
        if (res.status === 403) {
            alert('Accés denegat.');
            navegarA('pantalla-1');
            return;
        }

        if (res.ok) {
            const reserves = await res.json();
            const llistaReserves = Array.isArray(reserves) ? reserves : (reserves.data || []);
            renderizarTaulaReservesAdmin(llistaReserves);
            calcularKPIsAdmin(llistaReserves);
        }
    } catch (err) {
        console.error('Error carregant el panell d\'administració:', err);
    }
}

function renderizarTaulaEspaisAdmin() {
    const tbody = document.getElementById('taula-espais-admin-body');
    if (!tbody || !Array.isArray(llistaEspais)) return;

    if (llistaEspais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No hi ha espais registrats.</td></tr>';
        return;
    }

    tbody.innerHTML = llistaEspais.map(espai => `
        <tr>
            <td>#${espai.id}</td>
            <td><strong>${espai.title}</strong></td>
            <td>Fins a ${espai.capacity} pers.</td>
            <td>${parseFloat(espai.price_per_hour).toFixed(2)} €</td>
            <td>${espai.opening_time ? espai.opening_time.substring(0, 5) : '08:00'} - ${espai.closing_time ? espai.closing_time.substring(0, 5) : '20:00'}</td>
            <td>
                <button class="btn-outline-sm" onclick="obrirModalEdicioEspai(${espai.id})">✏️ Editar</button>
            </td>
        </tr>
    `).join('');
}

function renderizarTaulaReservesAdmin(reserves) {
    const tbody = document.getElementById('taula-reserves-body');
    if (!tbody) return;

    if (!reserves || reserves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b;">No s’han trobat reserves registrades.</td></tr>';
        return;
    }

    tbody.innerHTML = reserves.map(reserva => `
        <tr>
            <td>#${reserva.id}</td>
            <td><strong>${reserva.space_title || reserva.space_id}</strong></td>
            <td>${reserva.user_email || reserva.user_name || 'Client'}</td>
            <td>${reserva.reservation_date || reserva.date ? (reserva.reservation_date || reserva.date).substring(0, 10) : '-'}</td>
            <td>${reserva.start_time ? reserva.start_time.substring(0, 5) : ''} – ${reserva.end_time ? reserva.end_time.substring(0, 5) : ''}</td>
            <td>
                <span class="badge ${reserva.status === 'confirmed' ? 'badge-success' : 'badge-pending'}">
                    ${reserva.status || 'Pendent'}
                </span>
            </td>
            <td>
                <button class="btn-outline-sm" onclick="canviarEstatReserva(${reserva.id}, 'confirmed')">✓ Confirmar</button>
            </td>
        </tr>
    `).join('');
}

function calcularKPIsAdmin(reserves) {
    const elemTotals = document.getElementById('admin-total-reserves');
    const elemFacturacio = document.getElementById('admin-total-facturacio');
    const elemCo2 = document.getElementById('admin-total-co2');

    const totalSollicituds = reserves.length;
    let totalFacturacio = 0;
    let totalCo2Evitat = 0;

    reserves.forEach(r => {
        const preu = parseFloat(r.total_price || 0);
        totalFacturacio += preu;
        totalCo2Evitat += 2.1;
    });

    if (elemTotals) elemTotals.innerText = totalSollicituds;
    if (elemFacturacio) elemFacturacio.innerText = `${totalFacturacio.toFixed(2).replace('.', ',')} €`;
    if (elemCo2) elemCo2.innerText = `${totalCo2Evitat.toFixed(1)} kg`;
}

// -----------------------------------------------------------------
// MODAL EDICIÓ D'ESPAI PER A ADMIN
// -----------------------------------------------------------------
const PRESET_AMENITIES = [
    { id: 'jardi', icon: '🪴', title: 'Jardí interior', desc: 'Vegetació natural' },
    { id: 'mobiliari', icon: '🪑', title: 'Mobiliari inclòs', desc: 'Taules i cadires adaptables' },
    { id: 'wifi', icon: '📶', title: "Wi-Fi d'alta velocitat", desc: 'Connexió simètrica' },
    { id: 'distribucio', icon: '📐', title: 'Distribució flexible', desc: 'Taller o reunió' },
    { id: 'audiovisual', icon: '🎥', title: 'Equip audiovisual', desc: 'Projector i altaveus' },
    { id: 'clima', icon: '❄️', title: 'Climatització', desc: 'Aire condicionat i calefacció' },
    { id: 'accessibilitat', icon: '♿', title: 'Accés adaptat', desc: 'Apte per a cadira de rodes' },
    { id: 'llum', icon: '☀️', title: 'Llum natural', desc: 'Finestrals i sostre bioclimàtic' }
];

function renderizarFormulariAmenities(amenitiesActuals) {
    const container = document.getElementById('edit-amenities-checkboxes');
    if (!container) return;

    let llistaActual = [];
    try {
        llistaActual = typeof amenitiesActuals === 'string' ? JSON.parse(amenitiesActuals) : (amenitiesActuals || []);
    } catch (e) {
        llistaActual = [];
    }

    container.innerHTML = PRESET_AMENITIES.map(preset => {
        const isChecked = llistaActual.some(item => item.title === preset.title || item.id === preset.id);

        return `
            <label style="display: flex; align-items: flex-start; gap: 8px; padding: 6px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;">
                <input type="checkbox" class="amenity-checkbox" 
                       data-icon="${preset.icon}" 
                       data-title="${preset.title}" 
                       data-desc="${preset.desc}" 
                       ${isChecked ? 'checked' : ''} style="margin-top: 3px;">
                <div>
                    <strong style="font-size: 0.9rem;">${preset.icon} ${preset.title}</strong>
                    <p style="font-size: 0.75rem; color: #64748b; margin: 0;">${preset.desc}</p>
                </div>
            </label>
        `;
    }).join('');
}

function obrirModalEdicioEspai(spaceId) {
    const espai = llistaEspais.find(s => s.id == spaceId);
    if (!espai) return;

    document.getElementById('edit-space-id').value = espai.id;
    document.getElementById('edit-title').value = espai.title;
    document.getElementById('edit-capacity').value = espai.capacity;
    document.getElementById('edit-price').value = espai.price_per_hour;
    document.getElementById('edit-opening').value = espai.opening_time ? espai.opening_time.substring(0, 5) : '08:00';
    document.getElementById('edit-closing').value = espai.closing_time ? espai.closing_time.substring(0, 5) : '20:00';
    document.getElementById('edit-image').value = espai.image_url || '';

    const checkContainer = document.getElementById('edit-amenities-checkboxes');
    if (checkContainer) {
        renderizarFormulariAmenities(espai.amenities);
    } else {
        const textarea = document.getElementById('edit-amenities');
        if (textarea) {
            textarea.value = typeof espai.amenities === 'string' 
                ? espai.amenities 
                : JSON.stringify(espai.amenities || [], null, 2);
        }
    }

    document.getElementById('modalEditSpace').style.display = 'flex';
}

function tancarModalEditSpace() {
    document.getElementById('modalEditSpace').style.display = 'none';
}

async function guardarCanvisEspai(event) {
    event.preventDefault();

    const id = document.getElementById('edit-space-id').value;

    let selectedAmenities = [];
    const checkboxes = document.querySelectorAll('.amenity-checkbox:checked');
    if (checkboxes.length > 0) {
        selectedAmenities = Array.from(checkboxes).map(cb => ({
            icon: cb.dataset.icon,
            title: cb.dataset.title,
            desc: cb.dataset.desc
        }));
    } else {
        const textarea = document.getElementById('edit-amenities');
        if (textarea && textarea.value) {
            try {
                selectedAmenities = JSON.parse(textarea.value);
            } catch (e) {
                selectedAmenities = textarea.value;
            }
        }
    }

    const dataToSend = {
        title: document.getElementById('edit-title').value,
        capacity: parseInt(document.getElementById('edit-capacity').value, 10),
        price_per_hour: parseFloat(document.getElementById('edit-price').value),
        opening_time: document.getElementById('edit-opening').value,
        closing_time: document.getElementById('edit-closing').value,
        image_url: document.getElementById('edit-image').value,
        amenities: selectedAmenities
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/spaces/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
            credentials: 'include'
        });

        const resData = await response.json();

        if (response.ok) {
            alert('Espai actualitzat amb èxit!');
            tancarModalEditSpace();

            // Refrescar les dades globals i re-renderitzar la taula mantenint-se a l'Admin Panel
            await carregarCataleg();
            renderizarTaulaEspaisAdmin();
        } else {
            alert(resData.error || 'Error en desar l’espai');
        }
    } catch (error) {
        console.error('Error guardant canvis de l’espai:', error);
        alert('Error de connexió amb el servidor.');
    }
}
// Funció per carregar la llista de preferits de l'usuari actiu
async function carregarPreferits() {
    if (!usuariActual) {
        preferitsUsuari = [];
        return;
    }
    try {
        const res = await fetch(`${API_URL}/api/favorites`, { credentials: 'include' });
        if (res.ok) {
            preferitsUsuari = await res.json();
        }
    } catch (e) {
        console.error('Error carregant preferits:', e);
    }
}

// Actualitzar l'estat visual del botó de favorits
function actualitzarBotoFavorit() {
    const btnFav = document.getElementById('btn-fav');
    if (!btnFav || !espaiSeleccionat) return;

    const isFav = preferitsUsuari.includes(espaiSeleccionat.id);
    if (isFav) {
        btnFav.innerHTML = '❤️ En preferits';
        btnFav.style.borderColor = '#ef4444';
        btnFav.style.color = '#ef4444';
    } else {
        btnFav.innerHTML = '♡ Desa l\'espai';
        btnFav.style.borderColor = '';
        btnFav.style.color = '';
    }
}

// Funció que s'executa en fer clic al botó "Desa l'espai"
async function toggleFavorit() {
    // Si l'usuari no està autenticat, li obrim la modal de login
    if (!usuariActual) {
        alert('Heus d’iniciar sessió per desar espais als teus preferits.');
        obrirModalAuth();
        return;
    }

    if (!espaiSeleccionat) return;

    try {
        const response = await fetch(`${API_URL}/api/favorites/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spaceId: espaiSeleccionat.id }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            if (data.isFavorite) {
                preferitsUsuari.push(espaiSeleccionat.id);
            } else {
                preferitsUsuari = preferitsUsuari.filter(id => id !== espaiSeleccionat.id);
            }
            actualitzarBotoFavorit();
        } else {
            alert(data.error || 'Error en gestionar el favorit');
        }
    } catch (err) {
        console.error('Error toggle favorit:', err);
        alert('Error de connexió amb el servidor');
    }
}
// Obrir Modal de Perfil
async function obrirModalPerfil() {
    if (!usuariActual) return;

    try {
        const res = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
        if (!res.ok) throw new Error('Error carregant perfil');

        const data = await res.json();

        // 1. Dades bàsiques
        document.getElementById('profile-user-name').innerText = data.user.name;
        document.getElementById('profile-user-email').innerText = data.user.email;
        document.getElementById('prof-nif').value = data.user.nif || '';
        document.getElementById('prof-phone').value = data.user.phone || '';
        document.getElementById('prof-address').value = data.user.address || '';

        // 2. Renderitzar Reserves i KPIs
        renderizarReservesPerfil(data.reservations || []);

        // 3. Renderitzar Favorits
        renderizarFavoritsPerfil();

        switchProfileTab('reserves');
        document.getElementById('userProfileModal').style.display = 'flex';
    } catch (e) {
        console.error('Error en obrir perfil:', e);
    }
}

function tancarModalPerfil() {
    document.getElementById('userProfileModal').style.display = 'none';
}

// Canviar de pestanya dins del modal
function switchProfileTab(tab) {
    const secReserves = document.getElementById('sec-prof-reserves');
    const secFavs = document.getElementById('sec-prof-favs');
    const secDades = document.getElementById('sec-prof-dades');

    const tabReserves = document.getElementById('tab-prof-reserves');
    const tabFavs = document.getElementById('tab-prof-favs');
    const tabDades = document.getElementById('tab-prof-dades');

    [secReserves, secFavs, secDades].forEach(s => s.style.display = 'none');
    [tabReserves, tabFavs, tabDades].forEach(t => {
        t.style.borderBottom = 'none';
        t.style.color = '#64748b';
    });

    if (tab === 'reserves') {
        secReserves.style.display = 'block';
        tabReserves.style.borderBottom = '2px solid #16a34a';
        tabReserves.style.color = '#1a2e22';
    } else if (tab === 'favs') {
        secFavs.style.display = 'block';
        tabFavs.style.borderBottom = '2px solid #16a34a';
        tabFavs.style.color = '#1a2e22';
    } else if (tab === 'dades') {
        secDades.style.display = 'block';
        tabDades.style.borderBottom = '2px solid #16a34a';
        tabDades.style.color = '#1a2e22';
    }
}

// Renderitzar reserves de l'usuari
function renderizarReservesPerfil(reserves) {
    const tbody = document.getElementById('taula-user-reserves-body');
    const elemCount = document.getElementById('user-kpi-count');
    const elemCo2 = document.getElementById('user-kpi-co2');

    if (elemCount) elemCount.innerText = reserves.length;
    if (elemCo2) elemCo2.innerText = `${(reserves.length * 2.1).toFixed(1)} kg`;

    if (!tbody) return;

    if (reserves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No tens cap reserva realitzada.</td></tr>';
        return;
    }

    tbody.innerHTML = reserves.map(r => `
        <tr>
            <td><strong>${r.space_title}</strong></td>
            <td>${r.reservation_date ? r.reservation_date.substring(0, 10) : '-'}</td>
            <td>${r.start_time ? r.start_time.substring(0, 5) : ''} - ${r.end_time ? r.end_time.substring(0, 5) : ''}</td>
            <td>${parseFloat(r.total_price || 0).toFixed(2)} €</td>
            <td><span class="badge badge-success">Confirmada</span></td>
            <td>
                <button class="btn-outline-sm" style="color:#ef4444;" onclick="cancelarReservaUsuari(${r.id})">Anul·lar</button>
            </td>
        </tr>
    `).join('');
}

// Renderitzar favorits
function renderizarFavoritsPerfil() {
    const container = document.getElementById('user-favs-grid');
    if (!container) return;

    const espaisFav = llistaEspais.filter(e => preferitsUsuari.includes(e.id));

    if (espaisFav.length === 0) {
        container.innerHTML = '<p style="color:#64748b; grid-column:1/-1;">No tens cap espai desat com a favorit.</p>';
        return;
    }

    container.innerHTML = espaisFav.map(e => `
        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:white;">
            <img src="${e.image_url || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae'}" style="width:100%; height:100px; object-fit:cover; border-radius:6px;">
            <h4 style="margin:8px 0 4px 0;">${e.title}</h4>
            <p style="margin:0; font-size:0.85rem; color:#64748b;">${e.price_per_hour} €/h</p>
            <button class="btn-submit-main" style="width:100%; margin-top:8px; padding:6px; font-size:0.8rem;" onclick="tancarModalPerfil(); carregarFitxaEspai(${e.id});">Reservar</button>
        </div>
    `).join('');
}

// Desar canvis del perfil
async function guardarDadesPerfil(event) {
    event.preventDefault();

    const dataToSend = {
        nif: document.getElementById('prof-nif').value,
        phone: document.getElementById('prof-phone').value,
        address: document.getElementById('prof-address').value,
        password: document.getElementById('prof-password').value
    };

    try {
        const res = await fetch(`${API_URL}/api/user/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
            credentials: 'include'
        });

        if (res.ok) {
            alert('Dades actualitzades correctament!');
            document.getElementById('prof-password').value = '';
        } else {
            alert('Error en desar les dades');
        }
    } catch (e) {
        alert('Error de connexió');
    }
}

// Anul·lar reserva
async function cancelarReservaUsuari(id) {
    if (!confirm('Estàs segur/a que vols cancel·lar aquesta reserva?')) return;

    try {
        const res = await fetch(`${API_URL}/api/user/reservations/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.ok) {
            alert('Reserva cancel·lada correctament.');
            obrirModalPerfil(); // Recompilar dades
        } else {
            alert('Error en cancel·lar la reserva.');
        }
    } catch (e) {
        alert('Error de connexió.');
    }
}