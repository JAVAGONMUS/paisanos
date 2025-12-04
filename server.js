const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 💡 Importamos la función de autenticación y las instancias de DB
const { authenticateDBs, sequelizePostgres } = require('./config/databases'); 
const { setupAssociations } = require('./config/associations'); // 🔑 Importamos las asociaciones
const Pais = require('./models/Pais');
const Departamento = require('./models/Departamento');
const Municipio = require('./models/Municipio');

// 💡 IMPORTAR MODELOS DE POSTGRESQL AQUÍ 
const Driver = require('./models/Driver'); // Tabla: CONDUCTORES
// const GpsHistory = require('./models/GpsHistory'); 
// ... importa el resto de tus modelos PG aquí

// Lista de modelos de PostgreSQL a sincronizar
const pgModels = [
    Driver,
    // ... añade el resto aquí
];

// Lista de modelos de MySQL de catálogo (No necesitan sync en el arranque si ya existen)
// const mysqlCatalogModels = [Pais, Departamento, Municipio]; 

const driverRoutes = require('./routes/driverRoutes'); 
const ubicacionRoutes = require('./routes/ubicacionRoutes'); // 🔑 Ruta para el catálogo
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

// 🔑 RUTAS DE LA API
app.use('/api/drivers', driverRoutes);
app.use('/api', ubicacionRoutes); // Usamos una ruta base para los catálogos

// Inicializar la lógica de Socket.io
initSocketIO(io);

// Middleware para manejo de errores (opcional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('¡Algo salió mal!');
});


const PORT = process.env.PORT || 3000;

// --- Lógica de Sincronización y Arranque ---
async function startServer() {
    try {
        // 1. Autenticar (Conectar) las bases de datos
        await authenticateDBs(); 
        
        // 🔑 2. ESTABLECER ASOCIACIONES: ¡Debe ir ANTES de cualquier uso de modelos!
        setupAssociations();
        console.log('✅ Asociaciones de Sequelize establecidas.');

        // 3. Sincronizar los modelos de PostgreSQL
        console.log('Iniciando sincronización de modelos PostgreSQL...');
        for (const Model of pgModels) {
            // Se usa { alter: true } para crear/actualizar la estructura de la tabla
            await Model.sync({ alter: true }); 
            console.log(`   * Tabla ${Model.tableName || Model.name} sincronizada.`);
        }
        console.log('✅ Todos los modelos de PostgreSQL sincronizados exitosamente.');

        // 4. Arrancar el servidor
        server.listen(PORT, () => {
            console.log(`🚀 Servidor Express y Socket.io escuchando en puerto ${PORT}`); 
        });

    } catch (err) {
        console.error('❌ Error fatal al iniciar el servidor (DB):', err);
        process.exit(1);
    }
}

startServer();
