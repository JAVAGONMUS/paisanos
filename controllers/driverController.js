const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Importación corregida: Asumimos que Driver ahora se refiere a la tabla CONDUCTORES
const Driver = require('../models/Driver'); 
// Asumimos que User ahora se refiere a la tabla PERSONAS/USUARIOS en MySQL
const User = require('../models/User'); 
require('dotenv').config();

// =========================================================================
// FUNCIÓN DE REGISTRO (exports.registerDriver)
// * Corregida la lógica para buscar en el modelo User/PERSONAS por email,
// * y luego crear el registro en el modelo Driver/CONDUCTORES.
// =========================================================================

exports.registerDriver = async (req, res) => {
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, email1, email2, password 
    } = req.body;
    
    // Usamos email1 como el email principal y la contraseña para el Usuario
    const email = email1; 

    try {
        // 1. VERIFICAR si el email principal ya existe en la BD de PERSONAS/USUARIOS (MySQL)
        // **IMPORTANTE: Si 'User' es la tabla que almacena email y password en MySQL.**
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'El Email Principal ya está registrado en el sistema.' });
        }
        
        // 2. Hash de la Contraseña y CREACIÓN del nuevo Usuario/Persona (MySQL)
        const hashedPassword = await bcrypt.hash(password, 10);

        // ASUMIMOS que el modelo 'User' crea el registro en la tabla PERSONAS O USUARIOS en MySQL
        const newUser = await User.create({
            // Aquí se agregan los campos de la tabla PERSONAS de MySQL
            nombres, 
            apellidos, 
            dpi, 
            vencimiento_dpi: vencimientoDPI, 
            licencia, 
            vencimiento_licencia: vencimientoLicencia, 
            nit, 
            fecha_nacimiento: fechaNacimiento,
            telefono, 
            celular, 
            numeral_direccion: numeralDireccion, 
            zona_direccion: zonaDireccion, 
            colonia_direccion: coloniaDireccion,
            departamento_direccion: departamentoDireccion,
            municipio_direccion: municipioDireccion,
            email1: email1,
            email2: email2, // Incluimos el segundo email
            password: hashedPassword, // Contraseña hasheada
            role: 'driver' // Asignar el rol
        });

        // OBTENER la llave primaria de la nueva persona/usuario creada en MySQL
        const idPerso = newUser.ID_PERSO; // **¡Asegúrate que la PK sea ID_PERSO!**

        // 3. CREAR el registro en la tabla CONDUCTORES (PostgreSQL)
        // Solo necesitamos los campos de la tabla CONDUCTORES que dependen de ID_PERSO
        await Driver.create({
            ID_PERSO: idPerso, // Usar la llave primaria de la persona/usuario
            // Inicializar el conductor con el estado inicial, ubicación nula, etc.
            UBICACION_LAT: null, 
            UBICACION_LON: null,
            STATUS: 'pendiente_aprobacion', 
            IS_ONLINE: false,
            // Los demás campos se inician en NULL/0 o según las reglas de tu BD
        });

        // 4. Respuesta exitosa (JSON)
        res.status(201).json({ 
            message: 'Registro de conductor exitoso. Sus datos están pendientes de aprobación.' 
        });

    } catch (error) {
        console.error('Error en Registro de Conductor:', error);
        // Devolver un error JSON en caso de fallo
        res.status(500).json({ message: 'Error interno al procesar el registro.' });
    }
};

// =========================================================================
// FUNCIONES DE CONTROL EXISTENTES (Login y UpdateStatus)
// * Estas funciones dependen del correcto mapeo de los modelos.
// =========================================================================

// Función de Login del Conductor
exports.loginDriver = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar el usuario por email (en MySQL/User/PERSONAS)
        const user = await User.findOne({ where: { email } }); 

        // ASUMIMOS que el campo 'email' en la BD de PERSONAS es 'email' o 'email1'
        // ASUMIMOS que la contraseña hasheada está en el campo 'password'
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Opcional: Verificar que el usuario tenga un registro de CONDUCTOR (en PostgreSQL/Driver/CONDUCTORES)
        // **NOTA: Aquí debes usar la llave primaria de PERSONAS (ID_PERSO) para la búsqueda.**
        // Asumimos que tu modelo 'User' tiene un campo 'ID_PERSO' para obtener la llave.
        const ID_PERSO_USER = user.ID_PERSO; 
        
        const driver = await Driver.findOne({ where: { ID_PERSO: ID_PERSO_USER } });
        if (!driver) {
            return res.status(403).json({ message: 'Usuario no es un conductor registrado o no tiene registro en la tabla CONDUCTORES.' });
        }

        // 2. Generar Token JWT
        const token = jwt.sign(
            // **NOTA: Usar el ID_PERSO como identificador principal si es la llave compartida**
            { userId: ID_PERSO_USER, driverId: driver.ID_COND, role: 'driver' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token, driver });
    } catch (error) {
        console.error('Error en Login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Función para Actualizar el Estado del Conductor
exports.updateStatus = async (req, res) => {
    // req.user viene del authMiddleware y contiene { userId, driverId, role }
    // Usamos driverId, que debe ser el ID_COND de la tabla CONDUCTORES (PostgreSQL)
    const { driverId } = req.user; 
    const { status } = req.body; // 'disponible' o 'no_disponible'

    if (!['disponible', 'no_disponible'].includes(status)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    try {
        const [updated] = await Driver.update(
            { STATUS: status },
            { where: { ID_COND: driverId } }
            // **NOTA: Asumimos que el PK de la tabla CONDUCTORES es ID_COND**
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

// ... otras funciones como getTripHistory, acceptTrip, rejectTrip
