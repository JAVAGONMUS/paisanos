const express = require('express');
const router = express.Router();

const driverController = require('../controllers/driverController');
let verifyToken = require('../middlewares/authMiddleware');
let geoFenceGuard = require('../middlewares/geoFenceMiddleware');

// --- AUTO-CORRECCIÓN DE IMPORTACIONES ---
// Si los middlewares se exportaron como objeto { verifyToken }, los extraemos:
if (typeof verifyToken === 'object' && verifyToken.verifyToken) verifyToken = verifyToken.verifyToken;
if (typeof geoFenceGuard === 'object' && geoFenceGuard.geoFenceGuard) geoFenceGuard = geoFenceGuard.geoFenceGuard;

// --- VERIFICACIÓN DE SEGURIDAD (Evita caídas en Render) ---
if (typeof driverController.loginDriver !== 'function') throw new Error("Error Crítico: loginDriver no se exportó en driverController");
if (typeof verifyToken !== 'function') throw new Error("Error Crítico: verifyToken no es una función en authMiddleware");
if (typeof geoFenceGuard !== 'function') throw new Error("Error Crítico: geoFenceGuard no es una función en geoFenceMiddleware");

// --- RUTAS PÚBLICAS ---
router.post('/register', driverController.registerDriver);
router.post('/login', driverController.loginDriver);
router.get('/check-username/:username', driverController.checkUsername);

// --- RUTAS PROTEGIDAS POR JWT (Punto 9 - Seguridad Bancaria) ---
router.post('/status', verifyToken, driverController.updateStatus);
router.post('/update-permissions', verifyToken, driverController.updatePermissions);
router.post('/logout', verifyToken, driverController.logoutDriver);

// --- RUTAS DE GEOLOCALIZACIÓN ---
// 1. Verifica Token -> 2. Verifica Geocerca -> 3. Actualiza Ubicación
router.post('/update-location', verifyToken, geoFenceGuard, driverController.updateLocation);

module.exports = router;
