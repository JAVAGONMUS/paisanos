const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Op } = require('sequelize'); // 👈 IMPORTANTE: Añadido para el limpiador
require('dotenv').config();

// 1. IMPORTACIÓN DE CONFIGURACIONES Y DB
const { authenticateDBs } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); 

// 2. IMPORTACIÓN DE MODELOS (PostgreSQL)
const Driver = require('./models/Driver');
const HistorialGPS = require('./models/HistorialGPS');
const HistorialViajes = require('./models/HistorialViajes');
const Vehiculo = require('./models/Vehiculo');

const pgModels = [
    Driver,
    Vehiculo,
    HistorialGPS,
    HistorialViajes
];

// 3. IMPORTACIÓN DE RUTAS
const driverRoutes = require('./routes/driverRoutes'); 
const ubicacionRoutes = require('./routes/ubicacionRoutes'); 
const catalogsRoutes = require('./routes/catalogsRoutes');
const { initSocketIO } = require('./sockets/socketHandler'); 

// 4. CONFIGURACIÓN DEL SERVIDOR
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

global.io = io;

// 5. MIDDLEWARES
app.use(express.json());

// 6. DEFINICIÓN DE RUTAS API
app.use('/api/drivers', driverRoutes);
app.use('/api/ubicacion', ubicacionRoutes); 
app.use('/api/catalogs', catalogsRoutes);

initSocketIO(io);

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
        
        setupAssociations();
        console.log('✅ Asociaciones de Sequelize establecidas.');

        console.log('🛰️ Sincronizando modelos PostgreSQL en Railway...');
        
        for (const Model of pgModels) {
            await Model.sync({ alter: true }); 
            const tableName = Model.tableName || (Model.options && Model.options.tableName) || Model.name;
            console.log(`   * Tabla ${tableName} verificada.`);
        }
        
        console.log('✅ Base de datos PostgreSQL lista y actualizada.');

        // Encender el servidor
        server.listen(PORT, () => {
            console.log('=========================================================');
            console.log(`🚀 PAISANOS BACKEND ACTIVO EN PUERTO: ${PORT}`);
            console.log(`📡 ESCUCHANDO RASTREO GPS EN TIEMPO REAL`);
            console.log('=========================================================');

            // --- 🚀 INICIO DEL LIMPIADOR AUTOMÁTICO (ESTRATEGIA B) ---
            console.log('🧹 Limpiador de inactividad activado (Cada 2 minutos)');
            
            setInterval(async () => {
                try {
                    // Si un conductor no envía GPS en 5 minutos, se considera inactivo
                    const MINUTOS_LIMITE = 5;
                    const tiempoCorte = new Date(Date.now() - (MINUTOS_LIMITE * 60 * 1000));

                    const [actualizados] = await Driver.update(
                        { IS_ONLINE: false },
                        { 
                            where: {
                                IS_ONLINE: true,
                                // Compara si la última actualización es menor al tiempo de corte
                                UPDATED_AT: { [Op.lt]: tiempoCorte } 
                            }
                        }
                    );

                    if (actualizados > 0) {
                        console.log(`🧹 [AUTO-OFFLINE] ${actualizados} conductores desconectados por inactividad.`);
                    }
                } catch (error) {
                    console.error("❌ Error en limpiador de inactividad:", error);
                }
            }, 2 * 60 * 1000); // 120,000 ms = 2 minutos
            // --- 🏁 FIN DEL LIMPIADOR ---
        });

    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor:', err);
        setTimeout(() => process.exit(1), 1000);
    }
}

startServer();
