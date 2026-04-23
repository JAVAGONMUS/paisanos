const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sequelizePostgres } = require('../config/databases');
const User = require('../models/User');
const Usuario = require('../models/Usuario');
const Cliente = require('../models/Cliente');
const { validationResult } = require('express-validator');

// ID de Perfil para Cliente (Ajusta este número según tu tabla PERFILES)
const PERFIL_CLIENTE_ID = 2; 

exports.registerClient = async (req, res) => {
    // Revisar errores de validación de express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errores: errors.array() });
    }

    const { nombres, apellidos, email, telefono, password } = req.body;
    const t = await sequelizePostgres.transaction();

    try {
        // 1. Validar si el email ya existe
        const existingUser = await User.findOne({ where: { email1: email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'El correo ya está registrado.' });
        }

        const fechaActual = new Date();

        // 2. Crear Registro en PERSONAS
        const nuevaPersona = await User.create({
            nombres,
            apellidos,
            email1: email,
            telefono,
            FECHA_ALTA: fechaActual,
            HORA_ALTA: fechaActual
        }, { transaction: t });

        // 3. Hashear la contraseña y Crear en USUARIOS
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Usuario.create({
            ID_PERSO: nuevaPersona.ID_PERSO,
            ID_PER: PERFIL_CLIENTE_ID,
            ESTADO: 1, // 1 = Activo
            USUARIO: email, // Usamos el email como nombre de usuario
            PASSWORD: hashedPassword,
            FECHA_ALTA: fechaActual,
            HORA_ALTA: fechaActual
        }, { transaction: t });

        // 4. Crear registro en CLIENTES
        const nuevoCliente = await Cliente.create({
            ID_PERSO: nuevaPersona.ID_PERSO,
            FECHA_ALTA: fechaActual,
            HORA_ALTA: fechaActual
        }, { transaction: t });

        await t.commit();

        res.status(201).json({ 
            success: true, 
            message: 'Cliente registrado exitosamente',
            clienteId: nuevoCliente.ID_CL
        });

    } catch (error) {
        await t.rollback();
        console.error("Error en registro de cliente:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

exports.loginClient = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errores: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Buscar al usuario
        const usuario = await Usuario.findOne({ where: { USUARIO: email, ESTADO: 1 } });
        if (!usuario) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas o cuenta inactiva.' });
        }

        // Verificar que sea perfil cliente
        if (usuario.ID_PER !== PERFIL_CLIENTE_ID) {
             return res.status(403).json({ success: false, message: 'Acceso denegado. Perfil incorrecto.' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, usuario.PASSWORD);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
        }

        // Buscar el ID del Cliente asociado
        const cliente = await Cliente.findOne({ where: { ID_PERSO: usuario.ID_PERSO } });

        // 🔒 Generar Token con el Secreto de Clientes
        const token = jwt.sign(
            { 
                id: usuario.ID_USS, 
                personaId: usuario.ID_PERSO, 
                clienteId: cliente ? cliente.ID_CL : null,
                rol: 'CLIENTE' 
            },
            process.env.JWT_SECRET_CLIENT,
            { expiresIn: process.env.JWT_EXPIRES_IN_CLIENT || '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: usuario.ID_USS,
                email: usuario.USUARIO
            }
        });

    } catch (error) {
        console.error("Error en login de cliente:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};