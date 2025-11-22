const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/authMiddleware');

// Ruta pública
router.post('/login', driverController.loginDriver);

// Rutas protegidas por JWT
router.post('/status', verifyToken, driverController.updateStatus);
// router.get('/history', verifyToken, driverController.getTripHistory); 
// etc.

module.exports = router;
