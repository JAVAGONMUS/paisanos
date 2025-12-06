const express = require('express');
const router = express.Router();
const catalogsController = require('../controllers/catalogsController');

// 1. Ruta para Ubicaciones (Departamentos y Municipios)
// URL Frontend: /api/ubicaciones
router.get('/ubicaciones', catalogsController.getLocations);

// 2. Ruta para Dominios (Email)
// URL Frontend: /api/dominios
// ⚠️ ESTA ES LA RUTA QUE FALTABA Y CAUSABA EL ERROR 404
router.get('/dominios', catalogsController.getDomains);

module.exports = router;