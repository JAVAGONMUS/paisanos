const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver'); // Modelo del conductor
const User = require('../models/User'); // Modelo del Usuario (asumiendo que existe)
require('dotenv').config();

// Función de Login del Conductor
exports.loginDriver = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar el usuario por email (usando consultas preparadas implícitas de Sequelize)
    const user = await User.findOne({ where: { email } }); 

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // Opcional: Verificar que el usuario sea un conductor
    const driver = await Driver.findOne({ where: { user_id: user.user_id } });
    if (!driver) {
        return res.status(403).json({ message: 'Usuario no es un conductor registrado.' });
    }

    // 2. Generar Token JWT
    const token = jwt.sign(
      { userId: user.user_id, driverId: driver.driver_id, role: 'driver' }, 
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
    const { driverId } = req.user; 
    const { status } = req.body; // 'disponible' o 'no_disponible'

    if (!['disponible', 'no_disponible'].includes(status)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    try {
        const [updated] = await Driver.update(
            { status: status },
            { where: { driver_id: driverId } }
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

exports.registerDriver = async (req, res) => {
    const { 
        nombres, apellidos, dpi, vencimientoDPI, licencia, 
        vencimientoLicencia, nit, fechaNacimiento, telefono, 
        celular, numeralDireccion, zonaDireccion, coloniaDireccion,
        departamentoDireccion, municipioDireccion, email1, password 
    } = req.body;
    
    // Asignación de variables para el backend
    const email = email1; // Usamos email1 como el email principal

    try {
        // 1. Verificar si el usuario/email ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            // Devolver un error JSON claro
            return res.status(409).json({ message: 'El Email Principal ya está registrado.' });
        }

        // 2. Hash de la Contraseña y creación del Usuario
        const hashedPassword = await bcrypt.hash(password, 10);

        // NOTA: Asumo que debes crear una entrada en 'User' primero (para auth)
        const newUser = await User.create({
            email: email, 
            password: hashedPassword,
            role: 'driver' // O el rol que manejes
        });

        // 3. Crear el Conductor y asociarlo con el nuevo Usuario
        await Driver.create({
            user_id: newUser.user_id, // Usar el ID del nuevo usuario
            nombres, 
            apellidos, 
            dpi, 
            vencimiento_dpi: vencimientoDPI, // Usar snake_case si tu modelo lo requiere
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
            // Inicializar como pendiente de aprobación
            status: 'pendiente_aprobacion', 
        });

        // 4. Respuesta exitosa (JSON)
        // El frontend espera esta respuesta JSON.
        res.status(201).json({ 
            message: 'Registro de conductor exitoso. Esperando aprobación.' 
        });

    } catch (error) {
        console.error('Error en Registro de Conductor:', error);
        // Devolver un error JSON en caso de fallo
        res.status(500).json({ message: 'Error interno al procesar el registro.' });
    }
};

// ... otras funciones como getTripHistory, acceptTrip, rejectTrip
