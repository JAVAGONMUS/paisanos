const express = require('express');
const router = express.Router();
// Importación limpia de ambas funciones desde el controlador
const { getUbicaciones, actualizarUbicacionConductor } = require('../controllers/ubicacionController');
// Corregido: Debe ser verifyToken para coincidir con tu authMiddleware.js
const verifyToken = require('../middlewares/authMiddleware'); 

// Obtener catálogo de departamentos/municipios
router.get('/ubicaciones', getUbicaciones);

// Actualizar ubicación actual (Ruta protegida para el GPS)
router.post('/update-location', verifyToken, actualizarUbicacionConductor);

module.exports = router;
