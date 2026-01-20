const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   
const User = require('../models/User');       
const Usuario = require('../models/Usuario'); 
const Vehiculo = require('../models/Vehiculo');
const Viajes = require('../models/Viajes');
const { sequelizeMySQL } = require('../config/databases'); 
const { QueryTypes } = require('sequelize');
require('dotenv').config();

/**
 * Utilidad para convertir fechas de DD/MM/AAAA a YYYY-MM-DD
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

/**
 * 1. REGISTRO DE CONDUCTOR
 */
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
        
        // A. Crear Persona (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, vencimientoDPI: dbVencimientoDPI, 
            licencia, vencimientoLicencia: dbVencimientoLicencia, nit,
            fechaNacimiento: dbFechaNacimiento, telefono, celular, 
            numeralDireccion, zonaDireccion, coloniaDireccion, 
            departamentoDireccion, municipioDireccion, email1: emailPart1,
            FECHA_ALTA: fechaAlta, HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });

        idPerso = newPerson.ID_PERSO; 

        // B. Crear Usuario (MySQL)
        const hashedPassword = await bcrypt.hash(password, 10);
        await Usuario.create({
            ID_PERSO: idPerso, ID_PER: ID_PERFIL_CONDUCTOR, 
            ESTADO: ESTADO_INACTIVO, USUARIO: emailPart1, 
            PASSWORD: hashedPassword, FECHA_ALTA: fechaAlta, 
            HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });
        
        // C. Crear Vehículo (Postgres)
        const newVehiculo = await Vehiculo.create({
            CODIGO: codigoVehiculo, PLACAS: placasVehiculo, TIPO: tipoVehiculo,
            COLOR: colorVehiculo, ESTADO: 0, ASEGURADORA: aseguradoraVehiculo,
            ID_SEGURO: idSeguroVehiculo, COMENTARIOS: comentariosVehiculo
        });
        
        idVehiculo = newVehiculo.ID_VEH;

        // D. Crear Conductor (Postgres)
        await Driver.create({
            ID_PERSO: idPerso, ID_VEH: idVehiculo,
            UBICACION_LAT: null, UBICACION_LON: null,
            STATUS: false, IS_ONLINE: false,
            PERMISOS_ACEPTADOS: null 
        });
        
        res.status(201).json({ message: 'Registro exitoso. Pendiente de aprobación.' });

    } catch (error) {
        console.error('Error en Registro:', error);
        // Rollback manual simple
        if (idPerso) {
            await Usuario.destroy({ where: { ID_PERSO: idPerso } }).catch(()=>{});
            await User.destroy({ where: { ID_PERSO: idPerso } }).catch(()=>{});
        }
        if (idVehiculo) await Vehiculo.destroy({ where: { ID_VEH: idVehiculo } }).catch(()=>{});
        res.status(500).json({ message: 'Error interno en registro.' });
    }
};

/**
 * 2. VALIDACIÓN DE USUARIO EXISTENTE
 */
exports.checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const userExists = await Usuario.findOne({ where: { USUARIO: username } });
        return res.status(200).json({ exists: !!userExists });
    } catch (error) {
        return res.status(500).json({ exists: false });
    }
};

/**
 * 3. LOGIN DE CONDUCTOR (MySQL HISTORIAL TIPO 1)
 */
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

        // VALIDACIÓN CRÍTICA DE GPS
        if (!lat || !lon || parseFloat(lat) === 0 || parseFloat(lon) === 0) {
            return res.status(422).json({ 
                success: false, 
                message: 'Error de Seguridad: No se detectó ubicación GPS válida.' 
            });
        }

        // REGISTRO EN HISTORIAL_LOGIN (MySQL)
        const lugarFormateado = `${driver.ID_COND}//${lat}//${lon}`;
        await sequelizeMySQL.query(`
            INSERT INTO HISTORIAL_LOGIN 
            (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
            VALUES (?, 0, 0, 1, ?, ?, CURDATE(), CURTIME())
        `, {
            replacements: [userCredentials.ID_PERSO, intento || 1, lugarFormateado],
            type: QueryTypes.INSERT
        });

        // GENERAR TOKEN JWT
        const token = jwt.sign(
            { id: driver.ID_COND, userId: userCredentials.ID_PERSO, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Actualizar estado online en MySQL
        await Usuario.update({ ESTADO: 1 }, { where: { ID_PERSO: userCredentials.ID_PERSO } }); 
        
        res.json({ 
            success: true,
            token, 
            driver: {
                id: driver.ID_COND,
                id_uss: userCredentials.ID_PERSO,
                placas: vehiculo.PLACAS,
                permisos_aceptados: driver.PERMISOS_ACEPTADOS
            }
        });

    } catch (error) {
        console.error('Error Login:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

/**
 * 4. ACTUALIZAR PERMISOS (GPS/CÁMARA)
 */
exports.updatePermissions = async (req, res) => {
    const id_cond = req.user ? req.user.id : req.body.id_cond;
    const { estado } = req.body;
    try {
        await Driver.update({ PERMISOS_ACEPTADOS: estado }, { where: { ID_COND: id_cond } });
        res.json({ success: true, message: 'Permisos actualizados' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 5. ACTUALIZAR ESTADO DISPONIBILIDAD
 */
exports.updateStatus = async (req, res) => {
    const id_cond = req.user.id; 
    const { is_online } = req.body; 
    try {
        await Driver.update(
            { IS_ONLINE: is_online, UPDATED_AT: new Date() },
            { where: { ID_COND: id_cond } }
        );
        res.json({ success: true, message: `Estado: ${is_online}` });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

/**
 * 6. CIERRE DE SESIÓN (MySQL HISTORIAL TIPO 11 o 33)
 */
exports.logoutDriver = async (req, res) => {
    try {
        // Extraemos datos del token (vía middleware) con respaldo de req.body
        const id_cond = req.user?.id || req.body.id_cond;
        const id_uss = req.user?.userId || req.body.id_uss; 
        const { lat, lon, tipoCierre } = req.body;

        if (!id_cond || !id_uss) {
            return res.status(400).json({ success: false, message: "IDs no identificados." });
        }

        // A. Forzar OFFLINE en Postgres
        await Driver.update({ 
            IS_ONLINE: false,
            UPDATED_AT: new Date() 
        }, { where: { ID_COND: id_cond } });

        // B. Liberar sesión en MySQL (Estado 0)
        await Usuario.update({ ESTADO: 0 }, { where: { ID_PERSO: id_uss } });

        // C. Registrar auditoría en HISTORIAL_LOGIN (MySQL)
        const lugarFormateado = `${id_cond}//${lat || 0}//${lon || 0}`;
        const tipoFinal = tipoCierre || 11; // 11=Manual, 33=Inesperado

        await sequelizeMySQL.query(`
            INSERT INTO HISTORIAL_LOGIN 
            (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
            VALUES (?, 0, 0, ?, 1, ?, CURDATE(), CURTIME())
        `, {
            replacements: [id_uss, tipoFinal, lugarFormateado],
            type: QueryTypes.INSERT
        });

        console.log(`✅ Logout exitoso registrado: ID_USS ${id_uss}, Tipo ${tipoFinal}`);
        res.json({ success: true, message: "Sesión cerrada correctamente." });

    } catch (error) {
        console.error("❌ Error en logout:", error);
        res.status(500).json({ success: false, message: "Error al procesar el cierre." });
    }
};
