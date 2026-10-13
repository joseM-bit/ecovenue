const express = require('express');
const session = require('express-session');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// 1. Instanciar app
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares base
app.use(cors({
    origin: function (origin, callback) {
        // Permet qualsevol sol·licitud local des de 127.0.0.1 o localhost (sigui quin sigui el port)
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io')) {
            callback(null, true);
        } else {
            callback(new Error('Bloquejat per política CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// 4. Conexión a la base de datos MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'ecovenue',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 5. Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'ecovenue_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false }
}));
// Configuració de Nodemailer (Correu de confirmació)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'ecovenue.info@gmail.com',
        pass: process.env.EMAIL_PASS || 'el_teu_pass_d_aplicacio'
    }
});
// ==========================================
// MIDDLEWARES DE AUTORIZACIÓN
// ==========================================

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Cal iniciar sessió per continuar' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accés denegat: Només administració' });
    }
    next();
}

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.get('/api/auth/me', (req, res) => {
    if (req.session.user) return res.json({ loggedIn: true, user: req.session.user });
    res.json({ loggedIn: false });
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Tots els camps són obligatoris' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        return res.status(201).json({ success: true, message: 'Usuari registrat amb èxit', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Aquest correu ja està registrat' });
        res.status(500).json({ error: 'Error al servidor en registrar usuari' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credencials incorrectes' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credencials incorrectes' });

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.json({ success: true, user: req.session.user });
    } catch (error) {
        res.status(500).json({ error: 'Error al servidor en iniciar sessió' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// ==========================================
// RUTAS DE ESPACIOS Y RESERVAS
// ==========================================

app.get('/api/spaces', async (req, res) => {
    try {
        const [spaces] = await db.query('SELECT * FROM spaces');
        return res.json(spaces);
    } catch (error) {
        console.error('Error al obtenir espais:', error);
        return res.status(500).json({ error: 'Error al carregar els espais de la base de dades' });
    }
});

// POST /api/reservations/checkout — Processar el pagament i desar la reserva
app.get('/api/spaces', async (req, res) => {
    try {
        const [spaces] = await db.query(`
            SELECT s.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS total_reviews
            FROM spaces s
            LEFT JOIN reviews r ON s.id = r.space_id
            GROUP BY s.id
        `);
        res.json(spaces);
    } catch (error) {
        res.status(500).json({ error: 'Error al carregar espais' });
    }
});

app.post('/api/reservations/checkout', requireAuth, async (req, res) => {
    const { spaceId, date, startTime, endTime, totalPrice, nif, phone, address } = req.body;
    const userId = req.session.user.id;

    if (!nif || !phone || !address) {
        return res.status(400).json({ error: 'Les dades de facturació són obligatòries' });
    }

    try {
        // 1. CONTROL D'OVERBOOKING: Comprovar que la sala no estigui ocupada en la franja
        const [overlap] = await db.query(`
            SELECT id FROM reservations 
            WHERE space_id = ? 
              AND reservation_date = ? 
              AND status = 'confirmed'
              AND (
                (start_time < ? AND end_time > ?)
              )
        `, [spaceId, date, endTime, startTime]);

        if (overlap.length > 0) {
            return res.status(409).json({ error: 'Aquest espai ja s’ha reservat en aquesta franja horària. Selecciona un altre horari.' });
        }

        // 2. Guardar/Actualitzar dades de facturació de l'usuari
        await db.query('UPDATE users SET nif = ?, phone = ?, address = ? WHERE id = ?', [nif, phone, address, userId]);

        // 3. Crear la reserva
        const [result] = await db.query(`
            INSERT INTO reservations (user_id, space_id, reservation_date, start_time, end_time, total_price, status, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, 'confirmed', 'paid')
        `, [userId, spaceId, date, startTime, endTime, parseFloat(totalPrice), 'confirmed', 'paid']);

        // 4. Enviament de correu automàtic (Nodemailer)
        const mailOptions = {
            from: '"EcoVenue Reservations" <no-reply@ecovenue.com>',
            to: req.session.user.email,
            subject: `Confirmació de Reserva #${result.insertId} - EcoVenue`,
            html: `
                <h2>Gràcies per la teva reserva sostenibilitat a EcoVenue!</h2>
                <p><strong>Codi de reserva:</strong> #${result.insertId}</p>
                <p><strong>Data:</strong> ${date}</p>
                <p><strong>Horari:</strong> ${startTime} - ${endTime}</p>
                <p><strong>Total pagat:</strong> ${totalPrice} €</p>
                <p>Has evitat <strong>2.1 kg de CO₂e</strong> gràcies a l'eficiència bioclimàtica de l'espai.</p>
            `
        };
        transporter.sendMail(mailOptions).catch(e => console.log('Correi no enviat (Mock mode):', e.message));

        res.json({ success: true, reservationId: result.insertId });
    } catch (error) {
        console.error('Error en checkout:', error);
        res.status(500).json({ error: 'Error intern al servidor' });
    }
});

// ==========================================
// RUTAS DE ADMINISTRACIÓN
// ==========================================

app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(r.id) AS totalBookings,
                COALESCE(SUM(r.total_price), 0) AS totalRevenue,
                COALESCE(SUM(s.co2_emissions_kg), 0) AS totalCO2Saved
            FROM reservations r
            JOIN spaces s ON r.space_id = s.id
            WHERE r.payment_status = 'paid'
        `);

        const [requests] = await db.query(`
            SELECT 
                r.id, r.reservation_date, r.start_time, r.end_time, r.total_price, r.status,
                u.name AS user_name, u.email AS user_email, s.title AS space_title
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            JOIN spaces s ON r.space_id = s.id
            ORDER BY r.created_at DESC
        `);

        res.json({
            metrics: {
                totalCO2Saved: `${stats[0].totalCO2Saved} kg`,
                totalBookings: stats[0].totalBookings,
                totalRevenue: `${stats[0].totalRevenue} €`
            },
            requests
        });
    } catch (error) {
        console.error('Error en admin dashboard:', error);
        res.status(500).json({ error: 'Error al consultar el panel de administración' });
    }
});

app.get('/api/admin/reservations', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, s.title AS space_title, u.email AS user_email
            FROM reservations r
            LEFT JOIN spaces s ON r.space_id = s.id
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obtenint reserves admin:', error);
        res.status(500).json({ error: 'Error al servidor en carregar les reserves' });
    }
});

app.put('/api/admin/spaces/:id', requireAdmin, async (req, res) => {
    const spaceId = req.params.id;
    const { title, capacity, price_per_hour, co2_emissions_kg, image_url, opening_time, closing_time, amenities } = req.body;

    try {
        const query = `
            UPDATE spaces 
            SET title = ?, capacity = ?, price_per_hour = ?, co2_emissions_kg = ?, 
                image_url = ?, opening_time = ?, closing_time = ?, amenities = ?
            WHERE id = ?
        `;

        const amenitiesJson = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);

        await db.execute(query, [
            title, 
            capacity, 
            price_per_hour, 
            co2_emissions_kg || 2.1, 
            image_url, 
            opening_time, 
            closing_time, 
            amenitiesJson, 
            spaceId
        ]);

        res.json({ success: true, message: 'Espai actualitzat amb èxit' });
    } catch (error) {
        console.error('Error actualitzant espai:', error);
        res.status(500).json({ error: 'Error intern en actualitzar l’espai' });
    }
});

// ==========================================
// RUTAS DE FAVORITOS
// ==========================================

// Obtenir la llista d'IDs d'espais preferits de l'usuari autenticat
app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT space_id FROM favorites WHERE user_id = ?',
            [req.session.user.id]
        );
        const favoriteIds = rows.map(r => r.space_id);
        res.json(favoriteIds);
    } catch (error) {
        console.error('Error obtenint preferits:', error);
        res.status(500).json({ error: 'Error en carregar els preferits' });
    }
});

// Afegir o treure un espai de preferits (Toggle)
app.post('/api/favorites/toggle', requireAuth, async (req, res) => {
    const { spaceId } = req.body;
    const userId = req.session.user.id;

    if (!spaceId) {
        return res.status(400).json({ error: 'ID d’espai requerit' });
    }

    try {
        // Comprovar si ja és favorit
        const [existing] = await db.query(
            'SELECT id FROM favorites WHERE user_id = ? AND space_id = ?',
            [userId, spaceId]
        );

        if (existing.length > 0) {
            // Si ja existeix, el retrobem (Eliminar)
            await db.query(
                'DELETE FROM favorites WHERE user_id = ? AND space_id = ?',
                [userId, spaceId]
            );
            return res.json({ success: true, isFavorite: false, message: 'Eliminat de preferits' });
        } else {
            // Si no existeix, l'afegim
            await db.query(
                'INSERT INTO favorites (user_id, space_id) VALUES (?, ?)',
                [userId, spaceId]
            );
            return res.json({ success: true, isFavorite: true, message: 'Afegit a preferits' });
        }
    } catch (error) {
        console.error('Error gestionant preferits:', error);
        res.status(500).json({ error: 'Error al servidor en desar el favorit' });
    }
});
// GET /api/user/profile — Obtenir dades del perfil i resum de reserves
// GET /api/user/profile — Obtenir dades del perfil i reserves de l'usuari
app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // 1. Obtenir dades de l'usuari
        const [users] = await db.query(
            'SELECT id, name, email, nif, phone, address FROM users WHERE id = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuari no trobat' });
        }

        // 2. Obtenir reserves de l'usuari (LEFT JOIN per si un espai s'ha esborrat)
        const [reservations] = await db.query(`
            SELECT r.*, COALESCE(s.title, 'Espai no disponible') AS space_title, s.image_url 
            FROM reservations r
            LEFT JOIN spaces s ON r.space_id = s.id
            WHERE r.user_id = ?
            ORDER BY r.id DESC
        `, [userId]);

        res.json({
            user: users[0],
            reservations: reservations || []
        });
    } catch (error) {
        console.error('Error carregant perfil d’usuari:', error);
        res.status(500).json({ error: 'Error intern del servidor en carregar el perfil' });
    }
});

// PUT /api/user/profile — Actualitzar dades personals i de facturació
app.put('/api/user/profile', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const { nif, phone, address, password } = req.body;

    try {
        if (password && password.trim() !== '') {
            await db.query(
                'UPDATE users SET nif = ?, phone = ?, address = ?, password = ? WHERE id = ?',
                [nif, phone, address, password, userId]
            );
        } else {
            await db.query(
                'UPDATE users SET nif = ?, phone = ?, address = ? WHERE id = ?',
                [nif, phone, address, userId]
            );
        }

        res.json({ success: true, message: 'Perfil actualitzat correctament' });
    } catch (error) {
        console.error('Error actualitzant perfil:', error);
        res.status(500).json({ error: 'Error en desar el perfil' });
    }
});

// DELETE /api/user/reservations/:id — Sol·licitar/Executar cancel·lació de reserva
app.delete('/api/user/reservations/:id', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const reservationId = req.params.id;

    try {
        const [result] = await db.query(
            'DELETE FROM reservations WHERE id = ? AND user_id = ?',
            [reservationId, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Reserva cancel·lada' });
        } else {
            res.status(404).json({ error: 'Reserva no trobada o no autoritzat' });
        }
    } catch (error) {
        console.error('Error cancel·lant reserva:', error);
        res.status(500).json({ error: 'Error en cancel·lar la reserva' });
    }
});

// ==========================================
// RESSENYES I VALORACIONS
// ==========================================

app.get('/api/spaces/:id/reviews', async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT r.*, u.name AS user_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.space_id = ?
            ORDER BY r.created_at DESC
        `, [req.params.id]);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Error en carregar les ressenyes' });
    }
});

app.post('/api/reviews', requireAuth, async (req, res) => {
    const { spaceId, rating, comment } = req.body;
    const userId = req.session.user.id;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'La valoració ha de ser entre 1 i 5 estrelles.' });
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Comprovar que l'usuari té una reserva PASSADA i CONFIRMADA en aquest espai
        const [pastReservations] = await db.query(`
            SELECT id FROM reservations 
            WHERE user_id = ? 
              AND space_id = ? 
              AND status = 'confirmed' 
              AND reservation_date < ?
        `, [userId, spaceId, today]);

        if (pastReservations.length === 0) {
            return res.status(403).json({ 
                error: 'Només pots valorar un espai si ja hi has celebrat un esdeveniment en una data passada.' 
            });
        }

        // 2. Evitar ressenyes duplicades del mateix usuari per al mateix espai
        const [existingReview] = await db.query(
            'SELECT id FROM reviews WHERE user_id = ? AND space_id = ?',
            [userId, spaceId]
        );

        if (existingReview.length > 0) {
            return res.status(400).json({ error: 'Ja has enviat una valoració per a aquest espai.' });
        }

        // 3. Desar la valoració
        await db.query(
            'INSERT INTO reviews (user_id, space_id, rating, comment) VALUES (?, ?, ?, ?)',
            [userId, spaceId, parseInt(rating, 10), comment ? comment.trim() : '']
        );

        res.json({ success: true, message: 'Gràcies per la teva valoració!' });
    } catch (error) {
        console.error('Error en desar la ressenya:', error);
        res.status(500).json({ error: 'Error intern al servidor en desar la valoració.' });
    }
});

// ==========================================
// PERFIL I FAVORITS
// ==========================================

app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [users] = await db.query('SELECT id, name, email, nif, phone, address FROM users WHERE id = ?', [userId]);
        const [reservations] = await db.query(`
            SELECT r.*, COALESCE(s.title, 'Espai') AS space_title 
            FROM reservations r
            LEFT JOIN spaces s ON r.space_id = s.id
            WHERE r.user_id = ? ORDER BY r.id DESC
        `, [userId]);

        res.json({ user: users[0], reservations });
    } catch (error) {
        res.status(500).json({ error: 'Error al carregar perfil' });
    }
});
// ==========================================
// FALLBACK Y CONTROL DE ERRORES 404 (SIEMPRE AL FINAL)
// ==========================================

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta API no trobada' });
});

// INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoVenue actiu i escoltant a http://0.0.0.0:${PORT}`);
});