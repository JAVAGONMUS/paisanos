const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');   // Tabla CONDUCTORES (PostgreSQL)
const User = require('../models/User');       // Tabla PERSONAS (MySQL)
const Usuario = require('../models/Usuario'); // Tabla USUARIOS (MySQL)
require('dotenv').config();

// =========================================================================
// FUNCIÓN DE REGISTRO (exports.registerDriver)
// * Corregida para INSERCIÓN en PERSONAS, USUARIOS y CONDUCTORES.
// =========================================================================

exports.registerDriver = async (req, res) => {
    // 1. Obtener datos del formulario
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, email1, email2, password 
    } = req.body;
    
    // Asignación de variables de auditoría y clave
    const email = email1; 
    const fechaAlta = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const horaAlta = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
    const userNewData = 'sistema_registro_app'; 
    const ID_PERFIL_CONDUCTOR = 3; // ⚠️ ASUMIMOS que el ID del perfil 'Conductor' es 3

    try {
        // 2. VERIFICAR si el email ya existe en la tabla PERSONAS (CORREO1)
        const existingPerson = await User.findOne({ where: { CORREO1: email } });
        if (existingPerson) {
            return res.status(409).json({ message: 'El Email Principal ya está registrado en el sistema.' });
        }
        
        // 3. CREACIÓN del registro en la tabla PERSONAS (MySQL)
        // Usamos los nombres de las propiedades del modelo (Camel Case) que Sequelize mapea a las columnas de la BD (Mayúsculas)
        const newPerson = await User.create({
            nombres, 
            apellidos, 
            dpi, 
            vencimientoDPI, 
            licencia, 
            vencimientoLicencia, 
            nit, 
            fechaNacimiento,
            telefono, 
            celular, 
            numeralDireccion, 
            zonaDireccion, 
            coloniaDireccion,
            departamentoDireccion,
            municipioDireccion,
            email1: email1,
            email2: email2,
            FECHA_ALTA: fechaAlta, // Se pasa el valor explícito para columnas personalizadas
            HORA_ALTA: horaAlta,
            userNewData,
        });

        // 4. OBTENER la llave primaria (ID_PERSO) de la nueva persona creada
        const idPerso = newPerson.ID_PERSO; 

        // 5. Hash de la Contraseña y CREACIÓN del registro en la tabla USUARIOS (MySQL)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await Usuario.create({
            ID_PERSO: idPerso,
            ID_PER: ID_PERFIL_CONDUCTOR, 
            ESTADO: 'ACTIVO', 
            USUARIO: email, // Usar el email como nombre de usuario
            PASSWORD: hashedPassword,
            FECHA_ALTA: fechaAlta,
            HORA_ALTA: horaAlta,
            USER_NEW_DATA: userNewData
        });

        // 6. CREAR el registro en la tabla CONDUCTORES (PostgreSQL)
        await Driver.create({
            ID_PERSO: idPerso, 
            UBICACION_LAT: null, 
            UBICACION_LON: null,
            STATUS: 'pendiente_aprobacion', 
            IS_ONLINE: false,
            // Otros campos de CONDUCTORES se inicializan por defecto
        });

        // 7. Respuesta exitosa
        res.status(201).json({ 
            message: 'Registro de conductor exitoso. Sus datos están pendientes de aprobación.' 
        });

    } catch (error) {
        console.error('Error en Registro de Conductor:', error);
        res.status(500).json({ message: 'Error interno al procesar el registro.' });
    }
};

// =========================================================================
// FUNCIÓN DE LOGIN (exports.loginDriver)
// * Corregida para buscar credenciales en USUARIOS y la llave ID_PERSO en PERSONAS.
// =========================================================================

exports.loginDriver = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar credenciales en la tabla USUARIOS (MySQL) usando el email como USUARIO
        const userCredentials = await Usuario.findOne({ where: { USUARIO: email } }); 

        if (!userCredentials || !bcrypt.compareSync(password, userCredentials.PASSWORD)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const ID_PERSO_USER = userCredentials.ID_PERSO; 
        
        // 2. Verificar que el ID_PERSO sea un conductor registrado (en PostgreSQL/CONDUCTORES)
        const driver = await Driver.findOne({ where: { ID_PERSO: ID_PERSO_USER } });
        if (!driver) {
            return res.status(403).json({ message: 'Usuario no es un conductor registrado o no tiene registro activo.' });
        }

        // 3. Generar Token JWT
        const token = jwt.sign(
            { userId: ID_PERSO_USER, driverId: driver.ID_COND, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Opcional: Podrías buscar los datos de la persona en la tabla PERSONAS aquí para retornar más info
        // const person = await User.findByPk(ID_PERSO_USER);
        
        res.json({ token, driver });
    } catch (error) {
        console.error('Error en Login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Función para Actualizar el Estado del Conductor
exports.updateStatus = async (req, res) => {
    // ... (Esta función no necesita cambios si usa ID_COND de la tabla CONDUCTORES)
    const { driverId } = req.user; 
    const { status } = req.body; // 'disponible' o 'no_disponible'

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
