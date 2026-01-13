const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   
const User = require('../models/User');       
const Usuario = require('../models/Usuario'); 
const Vehiculo = require('../models/Vehiculo');
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
        
        // 1. Crear Persona (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, vencimientoDPI: dbVencimientoDPI, 
            licencia, vencimientoLicencia: dbVencimientoLicencia, nit,
            fechaNacimiento: dbFechaNacimiento, telefono, celular, 
            numeralDireccion, zonaDireccion, coloniaDireccion, 
            departamentoDireccion, municipioDireccion, email1: emailPart1,
            FECHA_ALTA: fechaAlta, HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });

        idPerso = newPerson.ID_PERSO; 

        // 2. Crear Usuario (MySQL)
        const hashedPassword = await bcrypt.hash(password, 10);
        await Usuario.create({
            ID_PERSO: idPerso, ID_PER: ID_PERFIL_CONDUCTOR, 
            ESTADO: ESTADO_INACTIVO, USUARIO: emailPart1, 
            PASSWORD: hashedPassword, FECHA_ALTA: fechaAlta, 
            HORA_ALTA: horaAlta, USER_NEW_DATA: 0
        });
        
        // 3. Crear Vehículo (Postgres)
        const newVehiculo = await Vehiculo.create({
            CODIGO: codigoVehiculo, PLACAS: placasVehiculo, TIPO: tipoVehiculo,
            COLOR: colorVehiculo, ESTADO: 0, ASEGURADORA: aseguradoraVehiculo,
            ID_SEGURO: idSeguroVehiculo, COMENTARIOS: comentariosVehiculo
        });
        
        idVehiculo = newVehiculo.ID_VEH;

        // 4. Crear Conductor (Postgres)
        await Driver.create({
            ID_PERSO: idPerso, ID_VEH: idVehiculo,
            UBICACION_LAT: null, UBICACION_LON: null,
            STATUS: false, IS_ONLINE: false,
            PERMISOS_ACEPTADOS: null // Inicia en NULL por seguridad
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
        res.status(500).json({ message: 'Error interno en registro. Se realizó rollback.' });
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

exports.loginDriver = async (req, res) => {
    const { username, password } = req.body; 

    try {
        const userCredentials = await Usuario.findOne({ where: { USUARIO: username } }); 
        
        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Validación de Estado de Sesión (MySQL)
        // Nota: Si el estado es 1, ya tiene sesión abierta. 
        // Tú decides si permites re-login o lo bloqueas.
        if (userCredentials.ESTADO === 2) { 
            return res.status(403).json({ message: 'Cuenta bloqueada. Contacte a soporte.' });
        }

        const driver = await Driver.findOne({ where: { ID_PERSO: userCredentials.ID_PERSO } });
        
        // Regla: Solo conductores aprobados por administración
        if (!driver || (driver.STATUS !== true && driver.STATUS !== 1)) {
            return res.status(403).json({ message: 'Cuenta no autorizada por administración.' });
        }

        const vehiculo = await Vehiculo.findByPk(driver.ID_VEH);
        if (!vehiculo || vehiculo.ESTADO !== 1) {
            return res.status(403).json({ message: 'Vehículo no habilitado.' });
        }

        // GENERAR TOKEN (Incluimos ID_COND para el Middleware de seguridad)
        const token = jwt.sign(
            { id: driver.ID_COND, userId: userCredentials.ID_PERSO, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Actualizar estado de sesión en MySQL
        await Usuario.update({ ESTADO: 1 }, { where: { ID_PERSO: userCredentials.ID_PERSO } }); 
        
        res.json({ 
            success: true,
            token, 
            driver: {
                id: driver.ID_COND,
                placas: vehiculo.PLACAS,
                permisos_aceptados: driver.PERMISOS_ACEPTADOS // Enviará null, true o false
            }
        });

    } catch (error) {
        console.error('Error Login:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

exports.updatePermissions = async (req, res) => {
    // Obtenemos el ID del token (más seguro) o del body
    const id_cond = req.user ? req.user.id : req.body.id_cond;
    const { estado } = req.body;

    try {
        // Sequelize se encarga de convertir el booleano de JS al formato de Postgres
        await Driver.update(
            { PERMISOS_ACEPTADOS: estado }, 
            { where: { ID_COND: id_cond } }
        );

        console.log(`DB UPDATED: Conductor ${id_cond} ahora tiene permisos en ${estado}`);
        
        res.json({ 
            success: true, 
            message: 'Estado de permisos actualizado en Postgres' 
        });
    } catch (error) {
        console.error("Error en updatePermissions Backend:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    // Obtenemos id del token y el estado del body
    const id_cond = req.user.id; 
    const { is_online } = req.body; 

    try {
        await Driver.update(
            { 
                IS_ONLINE: is_online,
                UPDATED_AT: new Date() // Para el Time-out de actividad
            },
            { where: { ID_COND: id_cond } }
        );
        
        console.log(`📡 Conductor ${id_cond} cambió estado a: ${is_online ? 'ONLINE' : 'OFFLINE'}`);
        res.json({ success: true, message: `Estado actualizado a ${is_online}` });
    } catch (error) {
        console.error("Error en updateStatus:", error);
        res.status(500).json({ success: false });
    }
};

// Cierre de sesión formal (Botón)
exports.logoutDriver = async (req, res) => {
    try {
        const { userId, id } = req.user; 

        // 1. Forzar OFFLINE en Postgres
        await Driver.update({ 
            IS_ONLINE: false,
            UPDATED_AT: new Date() 
        }, { where: { ID_COND: id } });

        // 2. Liberar sesión en MySQL (Estado 0)
        await Usuario.update({ ESTADO: 0 }, { where: { ID_PERSO: userId } });

        res.json({ success: true, message: "Sesión cerrada y conductor offline." });
    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ success: false, message: "Error al cerrar sesión." });
    }
};
