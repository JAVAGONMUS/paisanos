const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require.require('../middlewares/authMiddleware');

// --- RUTAS PÚBLICAS ---
router.post('/login', driverController.loginDriver);

// 💡 AÑADIR LA RUTA DE REGISTRO
router.post('/register', driverController.registerDriver); // <-- ¡ESTA ES LA RUTA FALTANTE!

// --- RUTAS PROTEGIDAS POR JWT ---
router.post('/status', verifyToken, driverController.updateStatus);
// router.get('/history', verifyToken, driverController.getTripHistory); 

module.exports = router;
