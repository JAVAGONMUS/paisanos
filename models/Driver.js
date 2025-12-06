const { DataTypes } = require('sequelize');
// Asumo que tu conexión a PostgreSQL se llama sequelizePostgres
const { sequelizePostgres } = require('../config/databases'); 

// Definición del modelo para la tabla CONDUCTORES en PostgreSQL
const Driver = sequelizePostgres.define('Driver', {
    // LLAVE PRIMARIA: ID_COND
    ID_COND: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_COND',
    },
    // LLAVE FORÁNEA: ID_PERSO
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PERSO',
        unique: true,
    },
    // LLAVE FORÁNEA: ID_VEH (Nuevo campo)
    ID_VEH: {
        type: DataTypes.INTEGER,
        allowNull: true, 
        field: 'ID_VEH',
    },
    // Ubicación
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
    // STATUS (0 por defecto, Integer para control booleano/estado de aprobación)
    STATUS: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'STATUS',
        defaultValue: 0, // 0 = Inactivo/Pendiente
    },
    // BEARING (Nuevo campo)
    BEARING: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'BEARING',
    },
    // VELOCIDAD (Nuevo campo)
    VELOCIDAD: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'VELOCIDAD',
    },
    // LAST_UPDATED (Nuevo campo)
    LAST_UPDATED: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'LAST_UPDATED',
    },
    // IS_ONLINE (Nuevo campo - para disponibilidad inmediata)
    IS_ONLINE: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'IS_ONLINE',
        defaultValue: false,
    },
    // PUNTAJE (Nuevo campo)
    PUNTAJE: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'PUNTAJE',
    },
    // COMENTARIOS (Nuevo campo)
    COMENTARIOS: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'COMENTARIOS',
    },
    // VIAJES (Nuevo campo)
    VIAJES: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'VIAJES',
    },
    // CREATED_AT y UPDATED_AT se manejan automáticamente si timestamps es true
    // y se mapean con los nombres especificados.

}, {
    tableName: 'CONDUCTORES',
    timestamps: true, 
    createdAt: 'CREATED_AT',
    updatedAt: 'UPDATED_AT',
    freezeTableName: true,
});

module.exports = Driver;
