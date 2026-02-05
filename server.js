const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Op } = require('sequelize'); 
require('dotenv').config();

const { authenticateDBs } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); 

// Importación de Modelos para sincronización
const User = require('./models/User');
const Usuario = require('./models/Usuario');
const Driver = require('./models/Driver');
const Vehiculo = require('./models/Vehiculo');
//const HistorialGPS = require('./models/HistorialGPS');
//const HistorialViajes = require('./models/HistorialViajes');
//const Viajes = require('./models/Viajes');
//const FilesPer = require('./models/FilesPer');

// Lista unificada de modelos para PostgreSQL
const allModels = [
    User,
    Usuario,
    Driver,
    Vehiculo
    //FilesPer
    //HistorialGPS
    //HistorialViajes
    //Viajes    
];

const driverRoutes = require('./routes/driverRoutes'); 
const ubicacionRoutes = require('./routes/ubicacionRoutes'); 
const catalogsRoutes = require('./routes/catalogsRoutes');
const { initSocketIO } = require('./sockets/socketHandler'); 

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    connectTimeout: 45000,
    pingTimeout: 30000,
    pingInterval: 25000
});

global.io = io;

app.use(express.json());

// Rutas API
app.use('/api/drivers', driverRoutes);
app.use('/api/ubicacion', ubicacionRoutes); 
app.use('/api/catalogs', catalogsRoutes);

// Inicializar lógica de sockets
initSocketIO(io);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error("❌ Error detectado en el servidor:", err.stack);
    res.status(500).json({ 
        success: false, 
        message: '¡Algo salió mal en el servidor de PAISANOS!',
        error: process.env.NODE_ENV === 'development' ? err.message : {} 
    });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        console.log('⏳ Conectando a PostgreSQL (Base de Datos Única)...');
        await authenticateDBs(); 
        
        // Configurar relaciones entre modelos
        setupAssociations();
        console.log('✅ Asociaciones de Sequelize establecidas.');

        console.log('🛰️ Sincronizando modelos en PostgreSQL...');        
        for (const Model of allModels) {
            // Usamos alter: true para que Sequelize ajuste las tablas si hay cambios
            await Model.sync({ alter: true }); 
            const tableName = Model.tableName || Model.name;
            console.log(`   * Tabla ${tableName} verificada.`);
        }        
        
        console.log('✅ Base de datos unificada lista.');

        server.listen(PORT, () => {
            console.log('=========================================================');
            console.log(`🚀 PAISANOS BACKEND ACTIVO EN PUERTO: ${PORT}`);
            console.log(`📡 SISTEMA DE RASTREO POSTGIS ACTIVADO`);
            console.log('=========================================================');
            
            // --- LIMPIADOR DE INACTIVIDAD (Cierra sesiones muertas) ---
            setInterval(async () => {
                try {
                    const MINUTOS_LIMITE = 5;
                    const tiempoCorte = new Date(Date.now() - (MINUTOS_LIMITE * 60 * 1000));
                    
                    const conductoresAfectados = await Driver.findAll({
                        where: {
                            IS_ONLINE: true,
                            UPDATED_AT: { [Op.lt]: tiempoCorte }
                        }
                    });

                    if (conductoresAfectados.length > 0) {
                        const ids = conductoresAfectados.map(d => d.ID_COND);
                        await Driver.update({ IS_ONLINE: false }, { where: { ID_COND: ids } });
                        
                        console.log(`🧹 [AUTO-OFFLINE] ${ids.length} conductores por inactividad.`);
                            
                        ids.forEach(id => {
                            global.io.to(`driver_${id}`).emit('force_reconnect', { 
                                reason: 'Inactividad de pulso GPS' 
                            });
                        });
                    }
                } catch (error) {
                    console.error("❌ Error en limpiador:", error);
                }
            }, 2 * 60 * 1000); // Se ejecuta cada 2 minutos
        });
    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor:', err);
        setTimeout(() => process.exit(1), 1000);
    }
}

startServer();
