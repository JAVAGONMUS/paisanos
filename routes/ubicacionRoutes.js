const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
let verifyToken = require('../middlewares/authMiddleware');

// Auto-corrección
if (typeof verifyToken === 'object' && verifyToken.verifyToken) verifyToken = verifyToken.verifyToken;

// 1. Obtener departamentos y municipios
router.get('/ubicaciones', verifyToken, ubicacionController.getUbicaciones);

// 2. Actualizar GPS crudo en Postgres
router.post('/actualizar', verifyToken, ubicacionController.actualizarUbicacionConductor);

// 3. Punto 11: Obtener la Geocerca Dinámica según el GPS del conductor
router.get('/zona-activa', verifyToken, ubicacionController.obtenerZonaPorUbicacion);

module.exports = router;
