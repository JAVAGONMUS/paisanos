const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/authMiddleware');
const { getUbicaciones } = require('../controllers/ubicacionController');

// --- RUTAS PÚBLICAS ---
router.post('/login', driverController.loginDriver);

// 💡 AÑADIR LA RUTA DE REGISTRO
router.post('/register', driverController.registerDriver); // <-- ¡ESTA ES LA RUTA FALTANTE!

// --- RUTAS PROTEGIDAS POR JWT ---
router.post('/status', verifyToken, driverController.updateStatus);
// router.get('/history', verifyToken, driverController.getTripHistory); 

router.get('/ubicaciones', getUbicaciones);

module.exports = router;
