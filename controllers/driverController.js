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
        emailPart1, 
        emailPart2, 
        password,
        codigoVehiculo, placasVehiculo, tipoVehiculo, colorVehiculo, 
        aseguradoraVehiculo, idSeguroVehiculo, comentariosVehiculo
    } = req.body;

    // --- PREPARACIÓN DE DATOS ---
    
    const email = emailPart1;

    // 2. CONVERSIÓN DE FECHAS AL FORMATO DE LA BASE DE DATOS (AAAA-MM-DD)
    const dbVencimientoDPI = convertDateToDBFormat(vencimientoDPI);
    const dbVencimientoLicencia = convertDateToDBFormat(vencimientoLicencia);
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
            where: { CORREO1: email }, 
            attributes: ['ID_PERSO'] 
        });
        
        if (existingPerson) {
            return res.status(409).json({ message: 'El Email Principal ya está registrado en el sistema.' });
        }
        
        // --- LÓGICA DE CORRECCIÓN DE FECHA DE NACIMIENTO ---
        let fechaNacimientoCorregida = dbFechaNacimiento;
        if (dbFechaNacimiento) {
            const parts = dbFechaNacimiento.split('-'); 
            fechaNacimientoCorregida = `${parts[0]}-${parts[2]}-${parts[1]}`; 
        }
        
        // 5. CREACIÓN del registro en la tabla PERSONAS (MySQL)
        const newPerson = await User.create({
            nombres, apellidos, dpi, 
            vencimientoDPI: dbVencimientoDPI, 
            licencia, 
            vencimientoLicencia: dbVencimientoLicencia, 
            nit: nit || null,
            
            fechaNacimiento: dbFechaNacimiento,
            
            telefono: telefono || null, 
            celular, numeralDireccion, 
            zonaDireccion, coloniaDireccion, departamentoDireccion, municipioDireccion,
            
            email1: emailPart1, 
            email2: emailPart2 || null, 
            
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
            USUARIO: emailPart1, 
            PASSWORD: hashedPassword,
            FECHA_ALTA: fechaAlta,
            HORA_ALTA: horaAlta,
            USER_NEW_DATA: userNewData
        });       
        
        // 7. CREACIÓN del registro en la tabla VEHICULOS (PostgreSQL)
        const newVehiculo = await Vehiculo.create({
            CODIGO: codigoVehiculo || null,
            PLACAS: placasVehiculo,
            TIPO: tipoVehiculo,
            COLOR: colorVehiculo,
            ESTADO: 0, // Estado inicial 0
            ASEGURADORA: aseguradoraVehiculo || null,
            ID_SEGURO: idSeguroVehiculo || null,
            COMENTARIOS: comentariosVehiculo || null,
        });
        
        const idVehiculo = newVehiculo.ID_VEH;

        // 8. CREAR el registro en la tabla CONDUCTORES (PostgreSQL)
        await Driver.create({
            ID_PERSO: idPerso, 
            UBICACION_LAT: null, 
            UBICACION_LON: null,
            STATUS: false, 
            ID_VEH: idVehiculo,
            IS_ONLINE: false, 
        });
        
        res.status(201).json({ 
            message: 'Registro de conductor exitoso. Sus datos están pendientes de aprobación.' 
        });

    } catch (error) {
        console.error('Error en Registro de Conductor:', error);
        
        if (error.name === 'SequelizeValidationError') {
            const validationMessages = error.errors.map(err => err.message).join('; ');
             return res.status(400).json({ message: `Error de Validación de Datos: ${validationMessages}` });
        }
        
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
        const is_online_value = status === 'disponible';

        const [updated] = await Driver.update(
            { IS_ONLINE: is_online_value, LAST_UPDATED: new Date() }, 
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
