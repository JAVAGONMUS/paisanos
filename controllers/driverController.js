const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   // Tabla CONDUCTORES (PostgreSQL)
const User = require('../models/User');       // Tabla PERSONAS (MySQL)
const Usuario = require('../models/Usuario'); // Tabla USUARIOS (MySQL)
require('dotenv').config();

// =========================================================================
// FUNCIÓN AUXILIAR: Conversión de Fecha
// Convierte el formato de usuario DD/MM/AAAA a formato DB AAAA-MM-DD
// =========================================================================
const convertDateToDBFormat = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('/'); // dd/mm/aaaa
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // aaaa-mm-dd
};


exports.registerDriver = async (req, res) => {
    // 1. Obtener datos del formulario, incluyendo los nuevos campos de email
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, 
        emailUserPart1, domain1, // Nuevo: Email Principal
        emailUserPart2, domain2, // Nuevo: Email Secundario
        password 
    } = req.body;
    
    // --- PREPARACIÓN DE DATOS ---
    
    // 💥 1. RECONSTRUCCIÓN DE EMAILS
    const fullEmail1 = emailUserPart1 + (domain1 || ''); // Requerido
    // El email secundario es opcional, solo se reconstruye si hay parte de usuario
    const fullEmail2 = emailUserPart2 ? emailUserPart2 + (domain2 || '') : null; 
    
    const email = fullEmail1; 

    // 💥 2. CONVERSIÓN DE FECHAS AL FORMATO DE LA BASE DE DATOS
    const dbVencimientoDPI = convertDateToDBFormat(vencimientoDPI);
    const dbVencimientoLicencia = convertDateToDBFormat(vencimientoLicencia);

    // 3. Variables de Auditoría
    const now = new Date();
    const fechaAlta = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaAlta = now.toLocaleTimeString('en-US', { hour12: false }); // HH:MM:SS
    const userNewData = 0; 
    
    const ID_PERFIL_CONDUCTOR = 3; 
    const ESTADO_INACTIVO = 0; 

    try {
        // 4. VERIFICAR si el email ya existe en la tabla PERSONAS (CORREO1)
        const existingPerson = await User.findOne({ 
            where: { CORREO1: email },
            attributes: ['ID_PERSO'] 
        });
        
        if (existingPerson) {
            return res.status(409).json({ message: 'El Email Principal ya está registrado en el sistema.' });
        }
        
        // 5. CREACIÓN del registro en la tabla PERSONAS (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, 
            vencimientoDPI: dbVencimientoDPI, // 💥 Usamos el formato DB
            licencia, 
            vencimientoLicencia: dbVencimientoLicencia, // 💥 Usamos el formato DB
            // 💡 NIT y Teléfono Fijo se permiten nulos/vacíos si el frontend no los envía
            nit: nit || null, 
            fechaNacimiento, 
            telefono: telefono || null, 
            celular, numeralDireccion, 
            zonaDireccion, coloniaDireccion, departamentoDireccion, municipioDireccion,
            email1: fullEmail1, // 💥 Usamos el email reconstruido
            email2: fullEmail2, // 💥 Usamos el email reconstruido (puede ser null)
            FECHA_ALTA: fechaAlta, 
            HORA_ALTA: horaAlta,
            USER_NEW_DATA: userNewData,
        });

        const idPerso = newPerson.ID_PERSO; 

        // 6. CREACIÓN del registro en la tabla USUARIOS (MySQL)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await Usuario.create({
            ID_PERSO: idPerso,
            ID_PER: ID_PERFIL_CONDUCTOR, 
            ESTADO: ESTADO_INACTIVO, 
            USUARIO: fullEmail1, 
            PASSWORD: hashedPassword,
            FECHA_ALTA: fechaAlta,
            HORA_ALTA: horaAlta,
            USER_NEW_DATA: userNewData
        });       
        
        // 7. CREAR el registro en la tabla CONDUCTORES (PostgreSQL)
        await Driver.create({
            ID_PERSO: idPerso, 
            UBICACION_LAT: null, 
            UBICACION_LON: null,
            STATUS: 'pendiente_aprobacion', 
            IS_ONLINE: false,
        });
        
        res.status(201).json({ 
            message: 'Registro de conductor exitoso. Sus datos están pendientes de aprobación.' 
        });

    } catch (error) {
        console.error('Error en Registro de Conductor:', error);
        res.status(500).json({ message: 'Error interno al procesar el registro.' });
    }
};

exports.loginDriver = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCredentials = await Usuario.findOne({ where: { USUARIO: email } }); 
        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const ID_PERSO_USER = userCredentials.ID_PERSO;         
        const driver = await Driver.findOne({ where: { ID_PERSO: ID_PERSO_USER } });
        if (!driver) {
            return res.status(403).json({ message: 'Usuario no es un conductor registrado o no tiene registro activo.' });
        }
        const token = jwt.sign(
            { userId: ID_PERSO_USER, driverId: driver.ID_COND, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        await Usuario.update({ ESTADO: 1 }, { where: { ID_PERSO: ID_PERSO_USER } }); 
        
        res.json({ token, driver });
    } catch (error) {
        console.error('Error en Login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

exports.updateStatus = async (req, res) => {
    const { driverId } = req.user; 
    const { status } = req.body; 

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
