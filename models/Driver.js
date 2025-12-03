const { DataTypes } = require('sequelize');

// ✅ Importación por desestructuración. Esto ya no causará un error circular.
const { sequelizePostgres } = require('../config/databases'); 

const Driver = sequelizePostgres.define('Driver', {
  driver_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
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
  // Nombre de tabla en PostgreSQL
  tableName: 'CONDUCTORES',
  timestamps: false,
});

module.exports = Driver;
