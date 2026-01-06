const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// 1. IMPORTACIÓN DE CONFIGURACIONES Y DB
const { authenticateDBs } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); 

// 2. IMPORTACIÓN DE MODELOS (PostgreSQL)
const Driver = require('./models/Driver'); 
const Vehiculo = require('./models/Vehiculo');
const HistorialGPS = require('./models/HistorialGPS'); 

// Agrupamos los modelos para la sincronización automática
const pgModels = [
    Driver,
    Vehiculo,
    HistorialGPS
];

// 3. IMPORTACIÓN DE RUTAS
const driverRoutes = require('./routes/driverRoutes'); 
const ubicacionRoutes = require('./routes/ubicacionRoutes'); 
const catalogsRoutes = require('./routes/catalogsRoutes');
const { initSocketIO } = require('./sockets/socketHandler'); 

// 4. CONFIGURACIÓN DEL SERVIDOR
const app = express();
const server = http.createServer(app);

// Configuración de CORS para Socket.io (Necesario para comunicación con la App)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Hacer 'io' accesible globalmente para otros servicios si es necesario
global.io = io;

// 5. MIDDLEWARES
app.use(express.json());

// 6. DEFINICIÓN DE RUTAS API
app.use('/api/drivers', driverRoutes);
app.use('/api/ubicacion', ubicacionRoutes); 
app.use('/api/catalogs', catalogsRoutes);

// Inicializar la lógica de WebSockets
initSocketIO(io);

// Middleware para manejo de errores global
app.use((err, req, res, next) => {
    console.error("❌ Error detectado en el servidor:", err.stack);
    res.status(500).json({ 
        success: false, 
        message: '¡Algo salió mal en el servidor de PAISANOS!',
        error: process.env.NODE_ENV === 'development' ? err.message : {} 
    });
});

const PORT = process.env.PORT || 3000;

// 7. LÓGICA DE ARRANQUE Y SINCRONIZACIÓN
async function startServer() {
    try {
        console.log('⏳ Conectando a bases de datos (MySQL & Postgres)...');
        await authenticateDBs(); 
        
        // Configurar relaciones de MySQL
        setupAssociations();
        console.log('✅ Asociaciones de Sequelize establecidas.');

        // Sincronizar modelos en PostgreSQL (Crea tablas o columnas nuevas como PERMISOS_ACEPTADOS)
        console.log('🛰️ Sincronizando modelos PostgreSQL en Railway...');
        for (const Model of pgModels) {
            await Model.sync({ alter: true }); 
            console.log(`   * Tabla ${Model.tableName || Model.name} verificada.`);
        }
        console.log('✅ Base de datos PostgreSQL lista y actualizada.');

        // Encender el motor
        server.listen(PORT, () => {
            console.log('=========================================================');
            console.log(`🚀 PAISANOS BACKEND ACTIVO EN PUERTO: ${PORT}`);
            console.log(`📡 ESCUCHANDO RASTREO GPS EN TIEMPO REAL`);
            console.log('=========================================================');
        });

    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor:', err);
        process.exit(1);
    }
}

// Iniciar el proceso
startServer();
