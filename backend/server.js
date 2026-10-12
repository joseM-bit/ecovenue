const express = require('express');
const session = require('express-session');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

// 1. Instanciar app PRIMERO antes de cualquier app.use()
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares base
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    credentials: true // Permet l'enviament de cookies de sessió
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// 4. Conexión a la base de datos MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST || 'ecovenue_db_container',
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

// ==========================================
// MIDDLEWARES DE AUTORIZACIÓN
// ==========================================

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: Sección exclusiva de administración' });
    }
    next();
}

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
        return res.json({ loggedIn: true, user: req.session.user });
    }
    res.json({ loggedIn: false });
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Tots els camps són obligatoris' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password]
        );

        // ✅ Respuesta JSON explícita en éxito
        return res.status(201).json({
            success: true,
            message: 'Usuari registrat amb èxit',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error en registro:', error);
        
        // Manejar email duplicado
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Aquest correu ja està registrat' });
        }

        // ✅ Respuesta JSON explícita en error 500
        return res.status(500).json({ error: 'Error intern del servidor al registrar' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query(
            'SELECT id, name, email, password, role FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0 || rows[0].password !== password) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = rows[0];
        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

        res.json({ success: true, user: req.session.user });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
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

app.post('/api/reservations/checkout', async (req, res) => {
    const { spaceId, date, startTime, endTime } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // 1. Validar que la fecha no sea en el pasado
    if (date < today) {
        return res.status(400).json({ error: 'No es pot realitzar una reserva en una data passada' });
    }

    // 2. Si es para hoy, validar que la hora de inicio no haya pasado
    if (date === today) {
        const startHour = parseInt(startTime.split(':')[0], 10);
        if (startHour <= currentHour) {
            return res.status(400).json({ error: 'L\'hora d\'inici ha de ser posterior a l\'hora actual' });
        }
    }

    // Continuar con la transacción MySQL de reserva...
});

// ==========================================
// RUTA EXCLUSIVA ADMINISTRADOR
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

// Gestor global de errores 404
// ✅ CORRECTO:
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta API no trobada' });
});

app.listen(PORT, () => console.log(`Servidor Ecovenue iniciado en el puerto ${PORT}`));