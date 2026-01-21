const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   
const User = require('../models/User');       
const Usuario = require('../models/Usuario'); 
const Vehiculo = require('../models/Vehiculo');
const { sequelizeMySQL } = require('../config/databases'); 
const { QueryTypes } = require('sequelize');
const geoService = require('../services/geoValidation');
require('dotenv').config();

/**
 * Utilidad: Conversión de fechas
 */
const convertDateToDBFormat = (dateString) => {
    if (!dateString || dateString.trim() === '') return null;
    const cleanDate = dateString.replace(/\//g, '');
    if (cleanDate.length === 8) {
        const dd = cleanDate.substring(0, 2);
        const mm = cleanDate.substring(2, 4);
        const aaaa = cleanDate.substring(4, 8);
        return `${aaaa}-${mm}-${dd}`; 
    }
    return null;
};

// --- CONTROLADORES ---

/**
 * ACTUALIZAR UBICACIÓN (Blindado por Middleware)
 */
const updateLocation = async (req, res) => {
    const { driverId, lat, lng } = req.body;
    const id = req.user?.id || driverId;

    try {
        // Actualización en Postgres
        await Driver.update({
            UBICACION_LAT: lat,
            UBICACION_LON: lng,
            IS_ONLINE: true,
            UPDATED_AT: new Date()
        }, { 
            where: { ID_COND: id } 
        });

        // Emitir a pasajeros (Broadcast general)
        global.io.emit('driver_moved', { id, lat, lng });

        return res.status(200).json({ 
            success: true, 
            message: "Ubicación actualizada." 
        });
    } catch (error) {
        console.error("Error en updateLocation:", error);
        res.status(500).json({ error: "Error interno al actualizar ubicación" });
    }
};

/**
 * REGISTRO DE CONDUCTOR
 */
const registerDriver = async (req, res) => {
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, 
        emailPart1, password,
        codigoVehiculo, placasVehiculo, tipoVehiculo, colorVehiculo, 
        aseguradoraVehiculo, idSeguroVehiculo, comentariosVehiculo
    } = req.body;

    const dbVencimientoDPI = convertDateToDBFormat(vencimientoDPI);
    const dbVencimientoLicencia = convertDateToDBFormat(vencimientoLicencia);
    const dbFechaNacimiento = convertDateToDBFormat(fechaNacimiento);

    const now = new Date();
    const fechaAlta = now.toISOString().split('T')[0];
    const horaAlta = now.toLocaleTimeString('en-US', { hour12: false });
    
    let idPerso = null;
    let idVehiculo = null;

    try {
        const existingPerson = await User.findOne({ where: { CORREO1: emailPart1 } });
        if (existingPerson) return res.status(409).json({ message: 'EL CORREO YA EXISTE.' });
        
        // A. MySQL: Persona
        const newPerson = await User.create({
            nombres, apellidos, dpi, vencimientoDPI: dbVencimientoDPI, 
            licencia, vencimientoLicencia: dbVencimientoLicencia, nit,
            fechaNacimiento: dbFechaNacimiento, telefono, celular, 
            numeralDireccion, zonaDireccion, coloniaDireccion, 
            departamentoDireccion, municipioDireccion, email1: emailPart1,
            FECHA_ALTA: fechaAlta, HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });
        idPerso = newPerson.ID_PERSO; 

        // B. MySQL: Usuario
        const hashedPassword = await bcrypt.hash(password, 10);
        await Usuario.create({
            ID_PERSO: idPerso, ID_PER: 3, ESTADO: 0, 
            USUARIO: emailPart1, PASSWORD: hashedPassword, 
            FECHA_ALTA: fechaAlta, HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });
        
        // C. Postgres: Vehículo
        const newVehiculo = await Vehiculo.create({
            CODIGO: codigoVehiculo, PLACAS: placasVehiculo, TIPO: tipoVehiculo,
            COLOR: colorVehiculo, ESTADO: 0, ASEGURADORA: aseguradoraVehiculo,
            ID_SEGURO: idSeguroVehiculo, COMENTARIOS: comentariosVehiculo
        });
        idVehiculo = newVehiculo.ID_VEH;

        // D. Postgres: Conductor
        await Driver.create({
            ID_PERSO: idPerso, ID_VEH: idVehiculo, STATUS: false, IS_ONLINE: false
        });
        
        res.status(201).json({ message: 'Registro exitoso. En espera de aprobación.' });
    } catch (error) {
        console.error('Error en Registro:', error);
        // Rollback básico
        if (idPerso) {
            await Usuario.destroy({ where: { ID_PERSO: idPerso } });
            await User.destroy({ where: { ID_PERSO: idPerso } });
        }
        res.status(500).json({ message: 'Error interno en registro.' });
    }
};

/**
 * LOGIN DE CONDUCTOR
 */
const loginDriver = async (req, res) => {
    const { username, password, intento, lat, lon } = req.body; 

    try {
        const userCredentials = await Usuario.findOne({ where: { USUARIO: username } }); 
        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        if (userCredentials.ESTADO === 2) return res.status(403).json({ message: 'Cuenta bloqueada.' });

        const driver = await Driver.findOne({ where: { ID_PERSO: userCredentials.ID_PERSO } });
        if (!driver || !driver.STATUS) return res.status(403).json({ message: 'No autorizado por administración.' });

        // Auditoría MySQL
        const lugarFormateado = `${driver.ID_COND}//${lat}//${lon}`;
        await sequelizeMySQL.query(`
            INSERT INTO HISTORIAL_LOGIN (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
            VALUES (?, 0, 0, 1, ?, ?, CURDATE(), CURTIME())
        `, { replacements: [userCredentials.ID_PERSO, intento || 1, lugarFormateado], type: QueryTypes.INSERT });

        const token = jwt.sign(
            { id: driver.ID_COND, userId: userCredentials.ID_PERSO, role: 'driver' }, 
            process.env.JWT_SECRET, { expiresIn: '24h' }
        );

        await Usuario.update({ ESTADO: 1 }, { where: { ID_PERSO: userCredentials.ID_PERSO } }); 
        
        res.json({ success: true, token, driver: { id: driver.ID_COND, id_uss: userCredentials.ID_PERSO } });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

/**
 * LOGOUT DE CONDUCTOR
 */
const logoutDriver = async (req, res) => {
    try {
        const id_cond = req.user?.id || req.body.id_cond;
        const id_uss = req.user?.userId || req.body.id_uss; 
        const { lat, lon, tipoCierre } = req.body;

        await Driver.update({ IS_ONLINE: false, UPDATED_AT: new Date() }, { where: { ID_COND: id_cond } });
        await Usuario.update({ ESTADO: 0 }, { where: { ID_PERSO: id_uss } });

        const lugarFormateado = `${id_cond}//${lat || 0}//${lon || 0}`;
        await sequelizeMySQL.query(`
            INSERT INTO HISTORIAL_LOGIN (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
            VALUES (?, 0, 0, ?, 1, ?, CURDATE(), CURTIME())
        `, { replacements: [id_uss, tipoCierre || 11, lugarFormateado], type: QueryTypes.INSERT });

        res.json({ success: true, message: "Sesión cerrada." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al procesar el cierre." });
    }
};

// Exportación única y limpia
module.exports = {
    updateLocation,
    registerDriver,
    loginDriver,
    logoutDriver,
    checkUsername: async (req, res) => {
        const userExists = await Usuario.findOne({ where: { USUARIO: req.params.username } });
        return res.status(200).json({ exists: !!userExists });
    },
    updatePermissions: async (req, res) => {
        await Driver.update({ PERMISOS_ACEPTADOS: req.body.estado }, { where: { ID_COND: req.user.id } });
        res.json({ success: true });
    },
    updateStatus: async (req, res) => {
        await Driver.update({ IS_ONLINE: req.body.is_online, UPDATED_AT: new Date() }, { where: { ID_COND: req.user.id } });
        res.json({ success: true });
    }
};
