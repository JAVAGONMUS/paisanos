const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   
const User = require('../models/User');       
const Usuario = require('../models/Usuario'); 
const Vehiculo = require('../models/Vehiculo');
const { sequelizeMySQL } = require('../config/databases'); // Importante para el historial
const { QueryTypes } = require('sequelize');
require('dotenv').config();

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

exports.registerDriver = async (req, res) => {
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, 
        emailPart1, password,
        codigoVehiculo, placasVehiculo, tipoVehiculo, colorVehiculo, 
        aseguradoraVehiculo, idSeguroVehiculo, comentariosVehiculo
    } = req.body;

    const email = emailPart1;
    const dbVencimientoDPI = convertDateToDBFormat(vencimientoDPI);
    const dbVencimientoLicencia = convertDateToDBFormat(vencimientoLicencia);
    const dbFechaNacimiento = convertDateToDBFormat(fechaNacimiento);

    const now = new Date();
    const fechaAlta = now.toISOString().split('T')[0];
    const horaAlta = now.toLocaleTimeString('en-US', { hour12: false });
    
    const ID_PERFIL_CONDUCTOR = 3; 
    const ESTADO_INACTIVO = 0; 

    let idPerso = null;
    let idVehiculo = null;

    try {
        const existingPerson = await User.findOne({ where: { CORREO1: email } });
        if (existingPerson) return res.status(409).json({ message: 'EL CORREO YA EXISTE EN EL SISTEMA.' });
        
        const newPerson = await User.create({
            nombres, apellidos, dpi, vencimientoDPI: dbVencimientoDPI, 
            licencia, vencimientoLicencia: dbVencimientoLicencia, nit,
            fechaNacimiento: dbFechaNacimiento, telefono, celular, 
            numeralDireccion, zonaDireccion, coloniaDireccion, 
            departamentoDireccion, municipioDireccion, email1: emailPart1,
            FECHA_ALTA: fechaAlta, HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });

        idPerso = newPerson.ID_PERSO; 

        const hashedPassword = await bcrypt.hash(password, 10);
        await Usuario.create({
            ID_PERSO: idPerso, ID_PER: ID_PERFIL_CONDUCTOR, 
            ESTADO: ESTADO_INACTIVO, USUARIO: emailPart1, 
            PASSWORD: hashedPassword, FECHA_ALTA: fechaAlta, 
            HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });
        
        const newVehiculo = await Vehiculo.create({
            CODIGO: codigoVehiculo, PLACAS: placasVehiculo, TIPO: tipoVehiculo,
            COLOR: colorVehiculo, ESTADO: 0, ASEGURADORA: aseguradoraVehiculo,
            ID_SEGURO: idSeguroVehiculo, COMENTARIOS: comentariosVehiculo
        });
        
        idVehiculo = newVehiculo.ID_VEH;

        await Driver.create({
            ID_PERSO: idPerso, ID_VEH: idVehiculo,
            UBICACION_LAT: null, UBICACION_LON: null,
            STATUS: false, IS_ONLINE: false,
            PERMISOS_ACEPTADOS: null 
        });
        
        res.status(201).json({ message: 'Registro exitoso. Pendiente de aprobación.' });

    } catch (error) {
        console.error('Error en Registro:', error);
        if (idPerso) {
            await Usuario.destroy({ where: { ID_PERSO: idPerso } }).catch(()=>{});
            await User.destroy({ where: { ID_PERSO: idPerso } }).catch(()=>{});
        }
        if (idVehiculo) await Vehiculo.destroy({ where: { ID_VEH: idVehiculo } }).catch(()=>{});
        res.status(500).json({ message: 'Error interno en registro.' });
    }
};

exports.checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const userExists = await Usuario.findOne({ where: { USUARIO: username } });
        return res.status(200).json({ exists: !!userExists });
    } catch (error) {
        return res.status(500).json({ exists: false });
    }
};

// --- PASO 2: RECTIFICACIÓN DEL LOGIN (MySQL HISTORIAL) ---
exports.loginDriver = async (req, res) => {
    const { username, password, intento, lat, lon } = req.body; 

    try {
        const userCredentials = await Usuario.findOne({ where: { USUARIO: username } }); 
        
        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        if (userCredentials.ESTADO === 2) { 
            return res.status(403).json({ message: 'Cuenta bloqueada. Contacte a soporte.' });
        }

        const driver = await Driver.findOne({ where: { ID_PERSO: userCredentials.ID_PERSO } });
        
        if (!driver || (driver.STATUS !== true && driver.STATUS !== 1)) {
            return res.status(403).json({ message: 'Cuenta no autorizada por administración.' });
        }

        const vehiculo = await Vehiculo.findByPk(driver.ID_VEH);
        if (!vehiculo || vehiculo.ESTADO !== 1) {
            return res.status(403).json({ message: 'Vehículo no habilitado.' });
        }

        // --- REGISTRO EN HISTORIAL_LOGIN (MySQL) ---
        const lugarFormateado = `${driver.ID_COND}//${lat || 0}//${lon || 0}`;
        await sequelizeMySQL.query(`
            INSERT INTO HISTORIAL_LOGIN 
            (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
            VALUES (?, 0, 0, 1, ?, ?, CURDATE(), CURTIME())
        `, {
            replacements: [userCredentials.ID_PERSO, intento || 1, lugarFormateado],
            type: QueryTypes.INSERT
        });

        const token = jwt.sign(
            { id: driver.ID_COND, userId: userCredentials.ID_PERSO, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        await Usuario.update({ ESTADO: 1 }, { where: { ID_PERSO: userCredentials.ID_PERSO } }); 
        
        res.json({ 
            success: true,
            token, 
            driver: {
                id: driver.ID_COND,
                id_uss: userCredentials.ID_PERSO, // Enviamos el ID de usuario para el frontend
                placas: vehiculo.PLACAS,
                permisos_aceptados: driver.PERMISOS_ACEPTADOS
            }
        });

    } catch (error) {
        console.error('Error Login:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

exports.updatePermissions = async (req, res) => {
    const id_cond = req.user ? req.user.id : req.body.id_cond;
    const { estado } = req.body;

    try {
        await Driver.update(
            { PERMISOS_ACEPTADOS: estado }, 
            { where: { ID_COND: id_cond } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    const id_cond = req.user.id; 
    const { is_online } = req.body; 

    try {
        await Driver.update(
            { is_online, UPDATED_AT: new Date() },
            { where: { ID_COND: id_cond } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

// --- PASO 4: RECTIFICACIÓN DEL LOGOUT (MySQL HISTORIAL TIPO 11/33) ---
exports.logoutDriver = async (req, res) => {
    try {
        // Obtenemos IDs del token (inyectado por el middleware)
        const { userId, id } = req.user; 
        // Obtenemos datos del cierre enviados desde DriverHome.js
        const { lat, lon, tipoCierre } = req.body;

        // 1. Forzar OFFLINE en Postgres
        await Driver.update({ 
            IS_ONLINE: false,
            UPDATED_AT: new Date() 
        }, { where: { ID_COND: id } });

        // 2. Liberar sesión en MySQL (Estado 0)
        await Usuario.update({ ESTADO: 0 }, { where: { ID_PERSO: userId } });

        // 3. Registrar cierre en HISTORIAL_LOGIN (MySQL)
        const lugarFormateado = `${id}//${lat || 0}//${lon || 0}`;
        const tipoFinal = tipoCierre || 11; // 11=Normal, 33=Inesperado

        await sequelizeMySQL.query(`
            INSERT INTO HISTORIAL_LOGIN 
            (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
            VALUES (?, 0, 0, ?, 1, ?, CURDATE(), CURTIME())
        `, {
            replacements: [userId, tipoFinal, lugarFormateado],
            type: QueryTypes.INSERT
        });

        console.log(`✅ Cierre registrado TIPO ${tipoFinal} para Usuario ${userId}`);

        res.json({ success: true, message: "Sesión cerrada correctamente." });
    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ success: false, message: "Error al cerrar sesión." });
    }
};
