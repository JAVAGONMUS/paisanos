const { DataTypes } = require('sequelize');
// Asumiendo que esta ruta es correcta y trae la instancia de conexión PG
const { sequelizePostgres } = require('../config/databases'); 

// ... define el modelo Driver usando sequelizePostgres

const Driver = sequelizePostgres.define('Driver', {
  driver_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: { // Clave foránea a la tabla de Usuarios para el Login
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  // Estado: 'disponible', 'no_disponible', 'en_viaje'
  status: { 
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'no_disponible',
  },
  current_lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  current_lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  }
}, {
  // ✨ MODIFICACIÓN CLAVE: Usar el nombre exacto de la tabla en PostgreSQL ✨
  tableName: 'CONDUCTORES',
  timestamps: false,
});

module.exports = Driver;
