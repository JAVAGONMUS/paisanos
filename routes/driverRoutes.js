const express = require('express');
const router = express.Router();

// Importaciones exactas
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/authMiddleware');
const geoFenceGuard = require('../middlewares/geoFenceMiddleware');

// --- RUTAS PÚBLICAS ---
router.post('/register', driverController.registerDriver);
router.post('/login', driverController.loginDriver);
router.get('/check-username/:username', driverController.checkUsername);

// --- RUTAS PROTEGIDAS POR JWT (Punto 9 - Seguridad) ---
router.post('/status', verifyToken, driverController.updateStatus);
router.post('/update-permissions', verifyToken, driverController.updatePermissions);
router.post('/logout', verifyToken, driverController.logoutDriver);

// --- RUTAS DE GEOLOCALIZACIÓN ---
// IMPORTANTE: Aseguramos que verifyToken y geoFenceGuard sean funciones
router.post('/update-location', verifyToken, geoFenceGuard, driverController.updateLocation);

module.exports = router;
