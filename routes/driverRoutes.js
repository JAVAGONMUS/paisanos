const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/authMiddleware');
const { getUbicaciones } = require('../controllers/ubicacionController');

// --- RUTAS PÚBLICAS ---

// Registro de nuevos conductores (incluye guardado inicial en MySQL y Postgres)
router.post('/register', driverController.registerDriver);

// Inicio de sesión (devuelve JWT y estado de permisos)
router.post('/login', driverController.loginDriver);

// Verificación de disponibilidad de usuario (evita duplicidad en tiempo real)
router.get('/check-username/:username', driverController.checkUsername);


// --- RUTAS PROTEGIDAS POR JWT ---
// Estas rutas requieren el header: Authorization: Bearer <TOKEN>

// 1. Actualización de disponibilidad (Online/Offline)
router.post('/status', verifyToken, driverController.updateStatus);

// 2. Actualización de Permisos (GPS, Cámara, etc.)
// Se llama cuando el conductor acepta los permisos en el celular por primera vez
router.post('/update-permissions', verifyToken, driverController.updatePermissions);

// 3. Cierre de sesión formal (Limpia estados en ambas bases de datos)
router.post('/logout', verifyToken, driverController.logoutDriver);

// --- RUTAS DE GEOLOCALIZACIÓN ---

// Obtener ubicaciones para el mapa (puedes protegerla con verifyToken si solo es para uso interno)
router.get('/ubicaciones', verifyToken, getUbicaciones); 

module.exports = router;
