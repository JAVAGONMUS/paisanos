const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// 💡 Importamos la función de autenticación y las instancias de DB
const { authenticateDBs } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); 

// 💡 IMPORTAR MODELOS DE POSTGRESQL (Asegúrate que los nombres coincidan con tus archivos)
const Driver = require('./models/Driver'); 
const Vehiculo = require('./models/Vehiculo');
// Aquí debes importar los modelos de HISTORIAL_GPS y VIAJES_ACTIVOS si ya tienes los archivos creados
// const HistorialGPS = require('./models/HistorialGPS'); 

const pgModels = [
    Driver,
    Vehiculo,
    // HistorialGPS
];

// Importar rutas
const driverRoutes = require('./routes/driverRoutes'); 
const ubicacionRoutes = require('./routes/ubicacionRoutes'); 
const catalogsRoutes = require('./routes/catalogsRoutes');
const { initSocketIO } = require('./sockets/socketHandler'); 

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// 🔒 SEGURIDAD: Hacer 'io' accesible globalmente
// Esto permite que tus controladores usen global.io.emit si fuera necesario
global.io = io;

// Middleware Global
app.use(express.json());

// RUTAS DE LA API
app.use('/api/drivers', driverRoutes);
app.use('/api/ubicacion', ubicacionRoutes); 
app.use('/api/catalogs', catalogsRoutes);

// Inicializar la lógica de Socket.io
initSocketIO(io);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error("❌ Error detectado:", err.stack);
    res.status(500).json({ 
        success: false, 
        message: '¡Algo salió mal en el servidor de PAISANOS!',
        error: process.env.NODE_ENV === 'development' ? err.message : {} 
    });
});

const PORT = process.env.PORT || 3000;

// --- Lógica de Sincronización y Arranque ---
async function startServer() {
    try {
        console.log('⏳ Conectando a bases de datos (MySQL & Postgres)...');
        await authenticateDBs(); 
        
        // 2. ESTABLECER ASOCIACIONES (MySQL)
        setupAssociations();
        console.log('✅ Asociaciones de Sequelize establecidas.');

        // 3. Sincronizar los modelos de PostgreSQL
        console.log('🛰️ Sincronizando modelos PostgreSQL en Railway...');
        for (const Model of pgModels) {
            // alter: true actualiza la tabla si agregaste columnas (como PERMISOS_ACEPTADOS)
            await Model.sync({ alter: true }); 
            console.log(`   * Tabla ${Model.tableName || Model.name} verificada.`);
        }
        console.log('✅ Base de datos PostgreSQL lista.');

        // 4. Arrancar el servidor
        server.listen(PORT, () => {
            console.log('---------------------------------------------------------');
            console.log(`🚀 PAISANOS BACKEND ACTIVO EN PUERTO: ${PORT}`);
            console.log(`📡 SOCKET.IO LISTO PARA RASTREO GPS`);
            console.log('---------------------------------------------------------');
        });

    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor (DB):', err);
        process.exit(1);
    }
}

startServer();
