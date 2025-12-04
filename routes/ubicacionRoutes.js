// /app/routes/ubicacionRoutes.js
const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');

// Ruta para obtener el catálogo de departamentos con municipios anidados
router.get('/ubicaciones', ubicacionController.getUbicaciones);

module.exports = router;