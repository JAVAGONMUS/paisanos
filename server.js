const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
// 💡 Importamos el nuevo nombre de la función de autenticación y las instancias de DB
const { authenticateDBs, sequelizePostgres } = require('./config/databases'); 

// 💡 IMPORTAR MODELOS DE POSTGRESQL AQUÍ (rompe la dependencia circular)
const Driver = require('./models/Driver'); // Tabla: CONDUCTORES
// const GpsHistory = require('./models/GpsHistory'); 
// ... importa el resto de tus modelos PG aquí

// Lista de modelos a sincronizar
const pgModels = [
    Driver,
    // ... añade el resto aquí
];

const driverRoutes = require('./routes/driverRoutes'); 
const { initSocketIO } = require('./sockets/socketHandler'); 

const app = express();
const server = http.createServer(app);

// Configuración de CORS
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Middleware Global
app.use(express.json());

// Rutas de la API
app.use('/api/drivers', driverRoutes);

// Inicializar la lógica de Socket.io
initSocketIO(io);

// Middleware para manejo de errores (opcional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('¡Algo salió mal!');
});


const PORT = process.env.PORT || 3000;

// --- Nueva Lógica de Sincronización y Arranque ---
async function startServer() {
    try {
        // 1. Autenticar (Conectar) las bases de datos
        await authenticateDBs(); 

        // 2. Sincronizar los modelos de PostgreSQL
        console.log('Iniciando sincronización de modelos PostgreSQL...');
        for (const Model of pgModels) {
            await Model.sync({ alter: true }); 
            console.log(`   * Tabla ${Model.tableName || Model.name} sincronizada.`);
        }
        console.log('✅ Todos los modelos de PostgreSQL sincronizados exitosamente.');

        // 3. Arrancar el servidor
        server.listen(PORT, () => {
            console.log(`🚀 Servidor Express y Socket.io escuchando en puerto ${PORT}`); 
        });

    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor:', err);
        // Termina el proceso si no se puede conectar a la DB
        process.exit(1);
    }
}

startServer(); // Llama a la función asíncrona para iniciar
