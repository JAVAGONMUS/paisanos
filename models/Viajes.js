// ../models/Viajes.js
const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');
const Viajes = sequelizePostgres.define('Viajes', {
    ID_VIAJE: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ID_SOL: { type: DataTypes.INTEGER, allowNull: false },
    STATUS: { 
            type: DataTypes.ENUM('PENDIENTE', 'ACEPTADA', 'ACTIVA', 'COMPLETADA', 'CANCELADA'),
            defaultValue: 'PENDIENTE' 
        },
    TARIFA: { type: DataTypes.DECIMAL(8, 2), allowNull: false }
}, { tableName: 'VIAJES_ACTIVOS', timestamps: false });

module.exports = Viajes;
