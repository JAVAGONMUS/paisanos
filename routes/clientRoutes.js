const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const clientController = require('../controllers/clientController');
const authClientMiddleware = require('../middlewares/authClientMiddleware');

// Validaciones para el registro
const validacionesRegistro = [
    body('nombres').trim().notEmpty().withMessage('El nombre es obligatorio').escape(),
    body('apellidos').trim().notEmpty().withMessage('El apellido es obligatorio').escape(),
    body('email').isEmail().withMessage('Debe ser un correo válido').normalizeEmail(),
    body('telefono').isLength({ min: 8 }).withMessage('El teléfono debe tener al menos 8 dígitos').trim(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres')
];

// Validaciones para el login
const validacionesLogin = [
    body('email').isEmail().withMessage('Debe ser un correo válido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria')
];

// Rutas Públicas
router.post('/register', validacionesRegistro, clientController.registerClient);
router.post('/login', validacionesLogin, clientController.loginClient);

// Ruta Protegida de prueba
router.get('/perfil', authClientMiddleware, (req, res) => {
    res.json({ success: true, message: 'Bienvenido pasajero', datos: req.user });
});

module.exports = router;