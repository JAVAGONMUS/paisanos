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
        return `${aaaa}-${mm}-${dd}`; // Formato ISO AAAA-MM-DD
    }
    return null;
};


exports.registerDriver = async (req, res) => {
    // 1. Obtener datos del formulario.
    // 🛑 CORRECCIÓN 3: Ajustamos la destructuración para recibir los emails ya formados (emailPart1 y emailPart2)
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, 
        emailPart1, // Email Principal (ya incluye el @)
        emailPart2, // Email Secundario (ya incluye el @ o es null)
        password 
    } = req.body;
    
    // --- PREPARACIÓN DE DATOS ---
    
    // 1. RECONSTRUCCIÓN DE EMAILS
    // 🛑 CORRECCIÓN 2 (Emails): Ahora usamos directamente emailPart1 y emailPart2 que ya vienen del frontend con el formato completo (user@domain.com)
    // El email principal para validación será emailPart1.
    const email = emailPart1; 

    // 2. CONVERSIÓN DE FECHAS AL FORMATO DE LA BASE DE DATOS (AAAA-MM-DD)
    const dbVencimientoDPI = convertDateToDBFormat(vencimientoDPI);
    const dbVencimientoLicencia = convertDateToDBFormat(vencimientoLicencia);
    
    // 🛑 CORRECCIÓN 1 (Fecha de Nacimiento): Se aplica la conversión solo si el campo existe, ya que ahora es opcional.
    const dbFechaNacimiento = convertDateToDBFormat(fechaNacimiento);


    // 3. Variables de Auditoría
    const now = new Date();
    const fechaAlta = now.toISOString().split('T')[0];
    const horaAlta = now.toLocaleTimeString('en-US', { hour12: false });
    const userNewData = 0; 
    
    const ID_PERFIL_CONDUCTOR = 3; 
    const ESTADO_INACTIVO = 0; 

    try {
        // 4. VERIFICAR si ya existe
        const existingPerson = await User.findOne({ 
            // La columna para el email principal en tu modelo User (tabla PERSONAS) debe ser CORREO1 o similar. 
            // Si el nombre real es diferente, ajústalo aquí. Asumo que es CORREO1, basado en la consulta findOne.
            where: { CORREO1: email }, 
            attributes: ['ID_PERSO'] 
        });
        
        if (existingPerson) {
            return res.status(409).json({ message: 'El Email Principal ya está registrado en el sistema.' });
        }
        
        // 5. CREACIÓN del registro en la tabla PERSONAS (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, 
            vencimientoDPI: dbVencimientoDPI, 
            licencia, 
            vencimientoLicencia: dbVencimientoLicencia, 
            nit: nit || null, 
            // 🛑 CORRECCIÓN 1: Usar la fecha ya convertida al formato AAAA-MM-DD.
            fechaNacimiento: dbFechaNacimiento, 
            telefono: telefono || null, 
            celular, numeralDireccion, 
            zonaDireccion, coloniaDireccion, departamentoDireccion, municipioDireccion,
            // 🛑 CORRECCIÓN 2: Usar las variables del email completo que ya tienen el @
            CORREO1: emailPart1, // Asumo que el campo en BD es CORREO1
            CORREO2: emailPart2, // Asumo que el campo en BD es CORREO2
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
            USUARIO: emailPart1, // Usar el email completo para el USUARIO
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
            STATUS: false, 
            ID_VEH: null,
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
