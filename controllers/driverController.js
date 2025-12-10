const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   // Tabla CONDUCTORES (PostgreSQL)
const User = require('../models/User');       // Tabla PERSONAS (MySQL)
const Usuario = require('../models/Usuario'); // Tabla USUARIOS (MySQL)
require('dotenv').config();

const convertDateToDBFormat = (dateString) => {
    if (!dateString || dateString.trim() === '') return null;
    
    // Quitar barras para procesar solo los 8 dígitos
    const cleanDate = dateString.replace(/\//g, '');
    
    if (cleanDate.length === 8) {
        // Se espera DD/MM/AAAA. Se extraen las partes:
        const dd = cleanDate.substring(0, 2);
        const mm = cleanDate.substring(2, 4);
        const aaaa = cleanDate.substring(4, 8);
        
        // Retorna formato ISO: AAAA-MM-DD
        return `${aaaa}-${mm}-${dd}`; 
    }
    return null;
};

const forceDateFix = (isoDate) => {
    if (!isoDate) return null;
    const parts = isoDate.split('-'); // parts = [AAAA, MM, DD]
    if (parts.length === 3) {
        // Forzamos la inversión de MM y DD para que el ORM lo corrija al revés.
        return `${parts[0]}-${parts[2]}-${parts[1]}`; // Devuelve AAAA-DD-MM
    }
    return isoDate; // Retorna el original si no es válido
};

exports.registerDriver = async (req, res) => {
    
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, 
        emailPart1, 
        emailPart2, 
        password 
    } = req.body;

    // --- PREPARACIÓN DE DATOS ---
    
    const email = emailPart1; 

    // 2. CONVERSIÓN DE FECHAS AL FORMATO DE LA BASE DE DATOS (AAAA-MM-DD)
    const dbVencimientoDPI = convertDateToDBFormat(vencimientoDPI);
    const dbVencimientoLicencia = convertDateToDBFormat(vencimientoLicencia);
    
    // 🛑 APLICACIÓN DE LA CORRECCIÓN FORZADA:
    // a. Convertimos a ISO estándar (AAAA-MM-DD)
    let dbFechaNacimiento = convertDateToDBFormat(fechaNacimiento);
    
    // b. Invertimos el día y el mes (Si el valor existe, ahora es AAAA-DD-MM)
    dbFechaNacimiento = forceDateFix(dbFechaNacimiento);

    // 3. Variables de Auditoría
    const now = new Date();
    const fechaAlta = now.toISOString().split('T')[0];
    const horaAlta = now.toLocaleTimeString('en-US', { hour12: false });
    const userNewData = 0; 
    
    const ID_PERFIL_CONDUCTOR = 3; 
    const ESTADO_INACTIVO = 0; 

    try {
        // ... (Verificación de existencia sin cambios)
        
        // 5. CREACIÓN del registro en la tabla PERSONAS (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, 
            vencimientoDPI: dbVencimientoDPI, 
            licencia, 
            vencimientoLicencia: dbVencimientoLicencia, 
            nit: nit || null, 
            
            // Usamos la variable forzada AAAA-DD-MM. MySQL/Sequelize la invertirá y guardará AAAA-MM-DD.
            fechaNacimiento: dbFechaNacimiento, 
            
            telefono: telefono || null, 
            celular, numeralDireccion, 
            zonaDireccion, coloniaDireccion, departamentoDireccion, municipioDireccion,
            CORREO1: emailPart1, 
            CORREO2: emailPart2, 
            FECHA_ALTA: fechaAlta, 
            HORA_ALTA: horaAlta,
            USER_NEW_DATA: userNewData,
        });

        const idPerso = newPerson.ID_PERSO; 

        // ... (Pasos 6 y 7, creación de Usuario y Driver, sin cambios)
        
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

    // Aquí 'status' se usa para IS_ONLINE (disponibilidad)
    if (!['disponible', 'no_disponible'].includes(status)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    try {
        const is_online_value = status === 'disponible';

        const [updated] = await Driver.update(
            { IS_ONLINE: is_online_value, LAST_UPDATED: new Date() }, // Actualizar LAST_UPDATED también
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
