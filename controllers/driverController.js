const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   // Tabla CONDUCTORES (PostgreSQL)
const User = require('../models/User');       // Tabla PERSONAS (MySQL)
const Usuario = require('../models/Usuario'); // Tabla USUARIOS (MySQL)
require('dotenv').config();

// =========================================================================
// FUNCIÓN DE REGISTRO (exports.registerDriver)
// =========================================================================

exports.registerDriver = async (req, res) => {
    // 1. Obtener datos del formulario
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, email1, email2, password 
    } = req.body;
    
    // --- VARIABLES DE AUDITORÍA Y CLAVE ---
    const email = email1; 
    
    // 💡 Valores de fecha y hora actuales en formato MySQL
    const now = new Date();
    const fechaAlta = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaAlta = now.toLocaleTimeString('en-US', { hour12: false }); // HH:MM:SS
    
    // 💡 Usamos 0 como valor temporal, ya que es INTEGER
    const userNewData = 0; 
    
    // 🔑 CONSTANTES DE SISTEMA
    const ID_PERFIL_CONDUCTOR = 3; 
    const ESTADO_INACTIVO = 0; // 💡 0: Inactivo (No logueado)

    try {
        // 2. VERIFICAR si el email ya existe en la tabla PERSONAS (CORREO1)
        const existingPerson = await User.findOne({ 
            where: { CORREO1: email },
            attributes: ['ID_PERSO'] 
        });
        
        if (existingPerson) {
            return res.status(409).json({ message: 'El Email Principal ya está registrado en el sistema.' });
        }
        
        // 3. CREACIÓN del registro en la tabla PERSONAS (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, vencimientoDPI, licencia, vencimientoLicencia, 
            nit, fechaNacimiento, telefono, celular, numeralDireccion, 
            zonaDireccion, coloniaDireccion, departamentoDireccion, municipioDireccion,
            email1: email1,
            email2: email2,
            FECHA_ALTA: fechaAlta, 
            HORA_ALTA: horaAlta,
            // 💡 Ahora enviamos el INTEGER 0
            USER_NEW_DATA: userNewData,
        });

        // 4. OBTENER la llave primaria (ID_PERSO)
        const idPerso = newPerson.ID_PERSO; 

        // 5. Hash de la Contraseña y CREACIÓN del registro en la tabla USUARIOS (MySQL)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await Usuario.create({
            ID_PERSO: idPerso,
            ID_PER: ID_PERFIL_CONDUCTOR, 
            // 💥 CORRECCIÓN CRÍTICA: Ahora enviamos el INTEGER 0
            ESTADO: ESTADO_INACTIVO, 
            USUARIO: email, 
            PASSWORD: hashedPassword,
            FECHA_ALTA: fechaAlta,
            HORA_ALTA: horaAlta,
            // 💡 Enviamos el INTEGER 0
            USER_NEW_DATA: userNewData
        });

        // 6. CREAR el registro en la tabla CONDUCTORES (PostgreSQL)
        // 💡 Asumo que el modelo Driver.js está mapeado correctamente a CONDUCTORES
        await Driver.create({
            ID_PERSO: idPerso, 
            UBICACION_LAT: null, 
            UBICACION_LON: null,
            STATUS: 'pendiente_aprobacion', 
            IS_ONLINE: false,
        });

        // 7. Respuesta exitosa
        res.status(201).json({ 
            message: 'Registro de conductor exitoso. Sus datos están pendientes de aprobación.' 
        });

    } catch (error) {
        console.error('Error en Registro de Conductor:', error);
        // 💡 Podemos agregar lógica para eliminar el registro de PERSONAS si falla USUARIOS, 
        // pero por ahora solo devolvemos el error.
        res.status(500).json({ message: 'Error interno al procesar el registro.' });
    }
};

// ... (El resto de funciones, loginDriver y updateStatus, se mantienen sin cambios)
// =========================================================================
// FUNCIÓN DE LOGIN (exports.loginDriver)
// ...
// =========================================================================

exports.loginDriver = async (req, res) => {
    const { email, password } = req.body;

    try {
        // La búsqueda en USUARIOS es correcta porque esa tabla SÍ tiene PASSWORD
        const userCredentials = await Usuario.findOne({ where: { USUARIO: email } }); 

        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const ID_PERSO_USER = userCredentials.ID_PERSO; 
        
        const driver = await Driver.findOne({ where: { ID_PERSO: ID_PERSO_USER } });
        if (!driver) {
            return res.status(403).json({ message: 'Usuario no es un conductor registrado o no tiene registro activo.' });
        }

        // 💡 El token debe usar el ID_PERSO como identificador principal si es la FK
        const token = jwt.sign(
            { userId: ID_PERSO_USER, driverId: driver.ID_COND, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // 💡 ACTIVA el estado en USUARIOS después del login
        await Usuario.update({ ESTADO: 1 }, { where: { ID_PERSO: ID_PERSO_USER } }); 
        
        res.json({ token, driver });
    } catch (error) {
        console.error('Error en Login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Función para Actualizar el Estado del Conductor
exports.updateStatus = async (req, res) => {
    // ... (El resto de la función se mantiene)
    const { driverId } = req.user; 
    const { status } = req.body; 
    
    // ... (validación de status y lógica de actualización) ...

    if (!['disponible', 'no_disponible'].includes(status)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    try {
        const [updated] = await Driver.update(
            { STATUS: status },
            { where: { ID_COND: driverId } }
        );

        if (updated) {
            return res.json({ message: `Estado actualizado a: ${status}` });
        }
        res.status(404).json({ message: 'Conductor no encontrado.' });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
