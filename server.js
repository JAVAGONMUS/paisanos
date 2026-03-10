//   ../server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Op } = require('sequelize'); 
const Driver = require('./models/Driver');
const Usuario = require('./models/Usuario');
require('dotenv').config();

const { authenticateDBs } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); 

// Importación de Modelos para sincronización
const User = require('./models/User');
const Usuario = require('./models/Usuario');
const Driver = require('./models/Driver');
const Vehiculo = require('./models/Vehiculo');
const Pais = require('./models/Pais');
const Departamento = require('./models/Departamento');
const Municipio = require('./models/Municipio');
const Dominio = require('./models/Dominio');
//const HistorialGPS = require('./models/HistorialGPS');
//const HistorialViajes = require('./models/HistorialViajes');
//const Viajes = require('./models/Viajes');
//const FilesPer = require('./models/FilesPer');

// Lista unificada de modelos para PostgreSQL
const allModels = [
    User,
    Usuario,
    Driver,
    Vehiculo,
    Pais, 
    Departamento,
    Municipio, 
    Dominio
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
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'], 
    allowEIO3: true,
    connectTimeout: 60000,
    pingTimeout: 60000,
    pingInterval: 25000
});

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
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

const PORT = process.env.PORT || 10000;

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
                console.log("Cleaning inactive sessions...");
                const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos de inactividad
                
                const inactiveDrivers = await Driver.findAll({
                    where: { IS_ONLINE: true, UPDATED_AT: { [Op.lt]: threshold } }
                });

                for (const d of inactiveDrivers) {
                    await d.update({ IS_ONLINE: false });
                    // Cambiar estado de usuario a 22 o 25 (Salida por sistema)
                    await Usuario.update({ ESTADO: 25 }, { where: { ID_PERSO: d.ID_PERSO } });
                    console.log(`Sesión cerrada por inactividad: Driver ID ${d.ID_COND}`);
                }
            }, 60000);
        });
    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor:', err);
        setTimeout(() => process.exit(1), 1000);
    }
}

startServer();
