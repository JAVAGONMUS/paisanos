const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { authenticateAll } = require('./config/databases'); // <-- NUEVO
// const driverRoutes = require('./routes/driverRoutes'); // Rutas para el conductor
const driverRoutes = require('./routes/driverRoutes');
const { initSocketIO } = require('./sockets/socketHandler'); // Lógica de Socket.io

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Socket.io (ajusta 'origin' al dominio de tu app Expo)
const io = new Server(server, {
  cors: {
    origin: "*", // Cambiar por la URL de tu frontend en producción
    methods: ["GET", "POST"]
  }
});

// Middleware Global
app.use(express.json());

// Rutas de la API (por ejemplo, para Login y Historial)
app.use('/api/drivers', driverRoutes);

// Inicializar la lógica de Socket.io (Ubicación, Solicitudes, etc.)
initSocketIO(io);

// Middleware para manejo de errores (opcional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('¡Algo salió mal!');
});


const PORT = process.env.PORT || 3000;

// Sincronizar Base de Datos y Arrancar Servidor
authenticateAll() // <-- USAR LA FUNCIÓN DUAL
  .then(() => {
    server.listen(PORT, () => {
      // Usar '0.0.0.0' en producción/contenedores como Railway
      console.log(`🚀 Servidor Express y Socket.io escuchando en puerto ${PORT}`); 
    });
  })
  .catch(err => {
    console.error('❌ Error fatal al iniciar el servidor:', err);
    process.exit(1);
  });
