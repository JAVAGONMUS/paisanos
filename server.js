const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Op } = require('sequelize'); 
require('dotenv').config();
const { authenticateDBs } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); 
const Driver = require('./models/Driver');
const HistorialGPS = require('./models/HistorialGPS');
const HistorialViajes = require('./models/HistorialViajes');
const Vehiculo = require('./models/Vehiculo');
const Viajes = require('./models/Viajes');
const pgModels = [
    Driver,
    Vehiculo,
    HistorialGPS,
    HistorialViajes,
    Viajes
];
const driverRoutes = require('./routes/driverRoutes'); 
const ubicacionRoutes = require('./routes/ubicacionRoutes'); 
const catalogsRoutes = require('./routes/catalogsRoutes');
const { initSocketIO } = require('./sockets/socketHandler'); 
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});
global.io = io;
app.use(express.json());
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
        server.listen(PORT, () => {
            console.log('=========================================================');
            console.log(`🚀 PAISANOS BACKEND ACTIVO EN PUERTO: ${PORT}`);
            console.log(`📡 ESCUCHANDO RASTREO GPS EN TIEMPO REAL`);
            console.log('=========================================================');
            console.log('🧹 Limpiador de inactividad activado (Cada 2 minutos)');            
            setInterval(async () => {
                try {
                    const MINUTOS_LIMITE = 5;
                    const tiempoCorte = new Date(Date.now() - (MINUTOS_LIMITE * 60 * 1000));
                    const [actualizados] = await Driver.update(
                        { IS_ONLINE: false },
                        { 
                            where: {
                                IS_ONLINE: true,
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
        });
    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor:', err);
        setTimeout(() => process.exit(1), 1000);
    }
}
startServer();
