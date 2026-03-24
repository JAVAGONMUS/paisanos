const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
const verifyToken = require('../middlewares/authMiddleware');

// Obtener departamentos y municipios
router.get('/ubicaciones', verifyToken, ubicacionController.getUbicaciones);

// Actualizar GPS crudo en Postgres
router.post('/actualizar', verifyToken, ubicacionController.actualizarUbicacionConductor);

// Punto 11: Obtener la Geocerca Dinámica según el GPS del conductor
router.get('/zona-activa', verifyToken, ubicacionController.obtenerZonaPorUbicacion);

module.exports = router;
