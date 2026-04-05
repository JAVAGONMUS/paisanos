//    ../controllers/driverController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Usuario = require('../models/Usuario');
const Vehiculo = require('../models/Vehiculo');
const { pool, sequelizePostgres } = require('../config/databases');
require('dotenv').config();
// Helper para fechas
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
/**
 * ACTUALIZAR UBICACIÓN
 */
const updateLocation = async (req, res) => {
    const { driverId, lat, lon } = req.body; // Cambiado lng a lon para consistencia
    const id = req.user?.id || driverId;
    try {
        await Driver.update({
            UBICACION_LAT: lat,
            UBICACION_LON: lon,
            IS_ONLINE: true,
            UPDATED_AT: new Date()
        }, { where: { ID_COND: id } });
        global.io.emit('driver_moved', { id, lat, lon });
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
 * REGISTRO DE CONDUCTOR (Unificado en Postgres)
 */
const registerDriver = async (req, res) => {
    const {
        nombres, apellidos, dpi, vencimientoDPI, licencia,
        vencimientoLicencia, nit, fechaNacimiento, telefono, celular,
        numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion,
        emailPart1, dominio1, emailPart2, dominio2, password,
        codigoVehiculo, placasVehiculo, tipoVehiculo, colorVehiculo,
        aseguradoraVehiculo, idSeguroVehiculo, comentariosVehiculo
    } = req.body;
    const fullEmail1 = `${emailPart1}@${dominio1}`;
    const fullEmail2 = emailPart2 && dominio2 ? `${emailPart2}@${dominio2}` : null;
    const t = await sequelizePostgres.transaction();
    try {
        const existingPerson = await User.findOne({ where: { email1: fullEmail1 }, transaction: t });
        if (existingPerson) {
            await t.rollback();
            return res.status(409).json({ message: 'EL CORREO YA EXISTE.' });
        }
        const newPerson = await User.create({
            nombres, apellidos, dpi, vencimientoDPI: convertDateToDBFormat(vencimientoDPI),
            licencia, vencimientoLicencia: convertDateToDBFormat(vencimientoLicencia), nit,
            fechaNacimiento: convertDateToDBFormat(fechaNacimiento), telefono, celular,
            numeralDireccion, zonaDireccion, coloniaDireccion,
            departamentoDireccion, municipioDireccion,
            email1: fullEmail1, email2: fullEmail2, // Se guardan ambos correos concatenados
            FECHA_ALTA: new Date(), HORA_ALTA: new Date().toLocaleTimeString('en-US', { hour12: false }),
            USER_NEW_DATA: 0
        }, { transaction: t });
        const hashedPassword = await bcrypt.hash(password, 10);
        await Usuario.create({
            ID_PERSO: newPerson.ID_PERSO, ID_PER: 3, ESTADO: 0,
            USUARIO: fullEmail1, PASSWORD: hashedPassword,
            FECHA_ALTA: new Date(), HORA_ALTA: new Date().toLocaleTimeString('en-US', { hour12: false }),
            USER_NEW_DATA: 0
        }, { transaction: t });
        const newVehiculo = await Vehiculo.create({
            CODIGO: codigoVehiculo, PLACAS: placasVehiculo, TIPO: tipoVehiculo,
            COLOR: colorVehiculo, ESTADO: 0, ASEGURADORA: aseguradoraVehiculo,
            ID_SEGURO: idSeguroVehiculo, COMENTARIOS: comentariosVehiculo
        }, { transaction: t });
        await Driver.create({
            ID_PERSO: newPerson.ID_PERSO, ID_VEH: newVehiculo.ID_VEH, STATUS: false, IS_ONLINE: false
        }, { transaction: t });
        await t.commit();
        res.status(201).json({ message: 'Registro exitoso.' });
    } catch (error) {
        if (t) await t.rollback();
        res.status(500).json({ message: 'Error interno en registro.' });
    }
};
/**
 * LOGIN DE CONDUCTOR (Auditoría vía Pool)
 */
const loginDriver = async (req, res) => {
    const { username, password, intento, lat, lon, permisosDispositivo } = req.body;     
    try {
        const userCredentials = await Usuario.findOne({ where: { USUARIO: username } });
        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'DATOS INCORRECTOS' });
        }
        // VALIDACIÓN: Estados de Usuario
        if (userCredentials.ESTADO >= 30) {
            const msgs = { 31: 'Suspendido', 32: 'Suspendido', 41: 'Cuenta eliminada', 42: 'Cuenta eliminada', 51: 'Bloqueado', 52: 'Bloqueado' };
            return res.status(403).json({ message: msgs[userCredentials.ESTADO] || 'Acceso denegado. Comuníquese a administración!' });
        }
        const driver = await Driver.findOne({
            where: { ID_PERSO: userCredentials.ID_PERSO },
            include: [{ model: Vehiculo }]
        });
        // VALIDACIÓN: Reglas de Negocio Rigurosas
        if (!driver || driver.STATUS !== true) {
            return res.status(403).json({ message: 'Conductor no habilitado.' });
        }
        if (!driver.Vehiculo || driver.Vehiculo.ESTADO !== 1) {
            return res.status(403).json({ message: 'Vehículo no autorizado por administración.' });
        }
        if (driver.IS_ONLINE === true) {
            return res.status(403).json({ message: 'Error. Comuníquese a soporte técnico!' });
        }
        let nuevoEstado = userCredentials.ESTADO;
        if ([21, 22].includes(userCredentials.ESTADO)) nuevoEstado = 23;
        if ([24, 25].includes(userCredentials.ESTADO)) nuevoEstado = 26;
        await userCredentials.update({ ESTADO: nuevoEstado });        
        await driver.update({
            IS_ONLINE: true,
            PERMISOS_ACEPTADOS: permisosDispositivo === true,
            UBICACION_LAT: lat,
            UBICACION_LON: lon,
            UPDATED_AT: new Date()
        });
        // Auditoría en Postgres usando Pool (SQL Crudo)
        const lugarFormateado = `${driver.ID_COND}//${lat || 0}//${lon || 0}`;
        await pool.query(`
            INSERT INTO "HISTORIAL_LOGIN" 
            ("ID_USS", "ID_AGEN", "CAJA", "TIPO", "INTENTO", "LUGAR", "FECHA_ALTA", "HORA_ALTA")
            VALUES ($1, 0, 0, 1, $2, $3, CURRENT_DATE, CURRENT_TIME)
        `, [userCredentials.ID_PERSO, intento || 1, lugarFormateado]);
        const token = jwt.sign(
            { id: driver.ID_COND, userId: userCredentials.ID_PERSO },
            process.env.JWT_SECRET, { expiresIn: '24h' }
        );
        res.json({
            success: true,
            token,
            driver: {
                id_cond: driver.ID_COND,
                placas: driver.Vehiculo.PLACAS,
                nombre: userCredentials.USUARIO
            }
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: 'Error crítico de servidor.' });
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
        await pool.query(`
            INSERT INTO "HISTORIAL_LOGIN" 
            ("ID_USS", "ID_AGEN", "CAJA", "TIPO", "INTENTO", "LUGAR", "FECHA_ALTA", "HORA_ALTA")
            VALUES ($1, 0, 0, $2, 1, $3, CURRENT_DATE, CURRENT_TIME)
        `, [id_uss, tipoCierre || 11, lugarFormateado]);
        res.json({ success: true, message: "Sesión cerrada." });
    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ success: false, message: "Error al procesar el cierre." });
    }
};
module.exports = {
    updateLocation,
    registerDriver,
    loginDriver,
    logoutDriver,
    checkUsername: async (req, res) => {
        try {
            const userExists = await Usuario.findOne({ where: { USUARIO: req.params.username } });
            return res.status(200).json({ exists: !!userExists });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    updatePermissions: async (req, res) => {
        try {
            await Driver.update({ PERMISOS_ACEPTADOS: req.body.estado }, { where: { ID_COND: req.user.id } });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    updateStatus: async (req, res) => {
        try {
            await Driver.update({ IS_ONLINE: req.body.is_online, UPDATED_AT: new Date() }, { where: { ID_COND: req.user.id } });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};
