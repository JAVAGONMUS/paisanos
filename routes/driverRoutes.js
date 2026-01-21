const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/authMiddleware');
const verifyToken = require('../middlewares/geoFenceMiddleware');
// Importación desde el controlador de ubicación
const { getUbicaciones } = require('../controllers/ubicacionController');

// --- RUTAS PÚBLICAS ---
router.post('/register', driverController.registerDriver);
router.post('/login', driverController.loginDriver);
router.get('/check-username/:username', driverController.checkUsername);

// --- RUTAS PROTEGIDAS POR JWT ---
// 1. Disponibilidad
router.post('/status', verifyToken, driverController.updateStatus);

// 2. Permisos (La función que creamos para NULL/TRUE/FALSE)
router.post('/update-permissions', verifyToken, driverController.updatePermissions);

// 3. Logout
router.post('/logout', verifyToken, driverController.logoutDriver);

// --- RUTAS DE GEOLOCALIZACIÓN ---
// Nota: Esta ruta ya existe en ubicacionRoutes, pero se deja aquí si el Driver la necesita directamente
router.get('/ubicaciones', verifyToken, getUbicaciones); 

// 1. Verifica Token -> 2. Verifica Geocerca -> 3. Actualiza Ubicación
router.post('/update-location', auth, geoFenceGuard, driverController.updateLocation);

module.exports = router;
