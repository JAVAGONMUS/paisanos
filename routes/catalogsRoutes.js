// server/routes/catalogsRoutes.js
const express = require('express');
const router = express.Router();
// Importa el controlador de catálogos
const catalogsController = require('../controllers/catalogsController');

// Ruta para obtener el catálogo de dominios
// La ruta que uses aquí (por ejemplo, '/domains') se combinará con el prefijo
// que le des en app.js/index.js (ej: /api/catalogs/domains)
router.get('/domains', catalogsController.getDomains);

module.exports = router;
