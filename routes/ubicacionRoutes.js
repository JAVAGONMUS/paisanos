const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
const { actualizarUbicacionConductor } = require('../controllers/ubicacionController');
const { verificarToken } = require('../middlewares/authMiddleware'); // Tu seguridad JWT

router.get('/ubicaciones', ubicacionController.getUbicaciones);

router.post('/update-location', verificarToken, actualizarUbicacionConductor);

module.exports = router;
