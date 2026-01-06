const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const HistorialViajes = sequelizePostgres.define('HistorialViajes', {
    ID_SOL: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ID_CL: { type: DataTypes.INTEGER, allowNull: false },
    ID_COND: { type: DataTypes.INTEGER, allowNull: true },
    ESPERA_CHOFER: { type: DataTypes.STRING, allowNull: true },
    ESPERA_CLIENTE: { type: DataTypes.STRING, allowNull: true },
    INICIO_LAT: { type: DataTypes.DECIMAL(10, 8) },
    INICIO_LON: { type: DataTypes.DECIMAL(11, 8) },
    FINAL_LAT: { type: DataTypes.DECIMAL(10, 8) },
    FINAL_LON: { type: DataTypes.DECIMAL(11, 8) },
    STATUS: { 
        type: DataTypes.ENUM('PENDIENTE', 'ACEPTADA', 'ACTIVA', 'COMPLETADA', 'CANCELADA'),
        defaultValue: 'PENDIENTE'
    },
    DISTANCIA_VIAJE: { type: DataTypes.DECIMAL(10, 2) },
    TIEMPO_VIAJE: { type: DataTypes.STRING },
    TARIFA_ESTIMADA: { type: DataTypes.DECIMAL(10, 2) },
    TARIFA_COBRADA: { type: DataTypes.DECIMAL(10, 2) },
    FECHA_SOLICITUD: { type: DataTypes.DATEONLY },
    HORA_SOLICITUD: { type: DataTypes.TIME },
    FECHA_VIAJE: { type: DataTypes.DATEONLY },
    HORA_VIAJE: { type: DataTypes.TIME },
    ID_FAC: { type: DataTypes.INTEGER, allowNull: true },
    REQUESTED_AT: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ACCEPTED_AT: { type: DataTypes.DATE },
    STARTED_AT: { type: DataTypes.DATE },
    COMPLETED_AT: { type: DataTypes.DATE }
}, { tableName: 'HISTORIAL_VIAJES', timestamps: false });

module.exports = HistorialViajes;
