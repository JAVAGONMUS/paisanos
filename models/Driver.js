const { DataTypes } = require('sequelize');
const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const Driver = sequelizePostgres.define('Driver', {
    ID_COND: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ID_PERSO: { type: DataTypes.INTEGER, allowNull: false },
    ID_VEH: { type: DataTypes.INTEGER, allowNull: true },
    UBICACION_LAT: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    UBICACION_LON: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    STATUS: { type: DataTypes.BOOLEAN, defaultValue: false },
    BEARING: { type: DataTypes.FLOAT, defaultValue: 0 },
    VELOCIDAD: { type: DataTypes.FLOAT, defaultValue: 0 },
    IS_ONLINE: { type: DataTypes.BOOLEAN, defaultValue: false },
    PUNTAJE: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.00 },
    COMENTARIOS: { type: DataTypes.TEXT, allowNull: true },
    VIAJES: { type: DataTypes.INTEGER, defaultValue: 0 },
    UPDATED_AT: { type: DataTypes.DATE },
    LAST_UPDATED: { type: DataTypes.DATE },
    CREATED_AT: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'CONDUCTORES', timestamps: false });

module.exports = Driver;
