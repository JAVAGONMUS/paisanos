const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases'); 

const Driver = sequelizePostgres.define('Driver', {
    // 1. ID_COND (LLAVE PRIMARIA)
    ID_COND: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_COND',
    },
    // Relación con la tabla Personas de MySQL (ID_PERSO)
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PERSO',
        unique: true,
    },
    ID_VEH: {
        type: DataTypes.INTEGER,
        allowNull: true, 
        field: 'ID_VEH',
    },
    UBICACION_LAT: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        field: 'UBICACION_LAT',
    },
    UBICACION_LON: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        field: 'UBICACION_LON',
    },
    STATUS: {
        type: DataTypes.BOOLEAN, 
        allowNull: false,
        field: 'STATUS',
        defaultValue: false, 
    },
    BEARING: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'BEARING',
    },
    VELOCIDAD: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'VELOCIDAD',
    },
    LAST_UPDATED: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'LAST_UPDATED',
    },
    IS_ONLINE: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'IS_ONLINE',
        defaultValue: false,
    },
    PUNTAJE: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'PUNTAJE',
    },
    COMENTARIOS: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'COMENTARIOS',
    },
    VIAJES: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'VIAJES',
    },
}, {
    tableName: 'CONDUCTORES',
    timestamps: true, 
    createdAt: 'CREATED_AT',
    updatedAt: 'UPDATED_AT',
    freezeTableName: true,
});

module.exports = Driver;
