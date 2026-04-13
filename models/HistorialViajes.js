// ../models/HistorialViajes.js

const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const HistorialViajes = sequelizePostgres.define('HistorialViajes', {
    ID_SOL: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ID_CL: { type: DataTypes.INTEGER, allowNull: false },
    ID_COND: { type: DataTypes.INTEGER, allowNull: true },
    ESPERA_CHOFER: { type: DataTypes.STRING, allowNull: true },
    ESPERA_CLIENTE: { type: DataTypes.STRING, allowNull: true },
    INICIO_LAT: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    INICIO_LON: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    FINAL_LAT: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    FINAL_LON: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    STATUS: { 
        type: DataTypes.STRING, // 👈 Cambiado de ENUM a STRING
        defaultValue: 'PENDIENTE',
        validate: {
            isIn: [['PENDIENTE', 'ACEPTADA', 'ACTIVA', 'COMPLETADA', 'CANCELADA']]
        }
    },
    DISTANCIA_VIAJE: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    TIEMPO_VIAJE: { type: DataTypes.STRING, allowNull: true },
    TARIFA_ESTIMADA: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    TARIFA_COBRADA: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    FECHA_SOLICITUD: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    HORA_SOLICITUD: { type: DataTypes.TIME, defaultValue: DataTypes.NOW },
    FECHA_VIAJE: { type: DataTypes.DATEONLY, allowNull: true },
    HORA_VIAJE: { type: DataTypes.TIME, allowNull: true },
    ID_FAC: { type: DataTypes.INTEGER, allowNull: true },
    REQUESTED_AT: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ACCEPTED_AT: { type: DataTypes.DATE, allowNull: true },
    STARTED_AT: { type: DataTypes.DATE, allowNull: true },
    COMPLETED_AT: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'HISTORIAL_VIAJES', timestamps: false });

module.exports = HistorialViajes;
