//  ../models/Driver.js
const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');
const Vehiculo = require('./Vehiculo');
const Driver = sequelizePostgres.define('Driver', {
    ID_COND: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ID_VEH: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    UBICACION_LAT: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    UBICACION_LON: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    STATUS: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    BEARING: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    VELOCIDAD: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    IS_ONLINE: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    PUNTAJE: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 5.00
    },
    COMENTARIOS: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    VIAJES: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // Este campo es el que controlamos para el flujo de bienvenida
    PERMISOS_ACEPTADOS: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null
    },
    // VITAL: Este campo lo usa el limpiador de server.js para el Time-out
    UPDATED_AT: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    // Campo auxiliar para auditoría interna
    LAST_UPDATED: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'CONDUCTORES',
    // Mantenemos false para controlar los nombres de columnas manualmente en mayúsculas
    timestamps: false
});
Driver.belongsTo(Vehiculo, { foreignKey: 'ID_VEH' });
module.exports = Driver;
