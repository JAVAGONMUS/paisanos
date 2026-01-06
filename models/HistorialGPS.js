const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const HistorialGPS = sequelizePostgres.define('HistorialGPS', {
    ID_GPS: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ID_COND: { type: DataTypes.INTEGER, allowNull: false },
    UBICACION_LAT: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    UBICACION_LON: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    CREATED_AT: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'HISTORIAL_GPS', timestamps: false });

module.exports = HistorialGPS;
