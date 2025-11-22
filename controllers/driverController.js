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

// ... otras funciones como getTripHistory, acceptTrip, rejectTrip
