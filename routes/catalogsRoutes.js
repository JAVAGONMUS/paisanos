//   ../routes/catalogsRoutes.js

const express = require('express');
const router = express.Router();
// Importa el controlador de catálogos
const catalogsController = require('../controllers/catalogsController');

router.get('/domains', catalogsController.getDomains);

module.exports = router;
