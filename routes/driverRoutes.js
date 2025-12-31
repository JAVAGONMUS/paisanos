const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/authMiddleware');
const { getUbicaciones } = require('../controllers/ubicacionController');

// --- RUTAS PÚBLICAS ---

// Ruta para el inicio de sesión formal
router.post('/login', driverController.loginDriver);

// Ruta para el registro de nuevos conductores
router.post('/register', driverController.registerDriver);

router.get('/check-username/:username', driverController.checkUsername);


// --- RUTAS PROTEGIDAS POR JWT ---

// Actualización de estado (disponible/no disponible)
router.post('/status', verifyToken, driverController.updateStatus);

// Obtener ubicaciones para el mapa
router.get('/ubicaciones', getUbicaciones);

module.exports = router;
