const { DataTypes } = require('sequelize');

// ✅ USAMOS DESESTRUCTURACIÓN: Accede directamente a la propiedad 'sequelizePostgres' 
// exportada desde el objeto en databases.js
const { sequelizePostgres } = require('../config/databases'); 

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
  // Nombre de tabla corregido
  tableName: 'CONDUCTORES',
  timestamps: false,
});

module.exports = Driver;
