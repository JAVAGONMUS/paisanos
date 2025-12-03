const { DataTypes } = require('sequelize');

// Asegúrate de que esta importación sea la conexión a PostgreSQL
const { sequelizePostgres } = require('../config/databases'); 

const Driver = sequelizePostgres.define('Driver', {
    // La llave primaria en la tabla CONDUCTORES
    ID_COND: { 
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // La llave foránea a la tabla PERSONAS de MySQL
    ID_PERSO: { 
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    // Campo STATUS para la disponibilidad
    STATUS: { 
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'no_disponible',
    },
    // Campo de latitud actual
    UBICACION_LAT: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
    },
    // Campo de longitud actual
    UBICACION_LON: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
    },
    // Otros campos que definiste en CONDUCTORES:
    // UBICACION_LON, UPDATED_AT, BEARING, VELOCIDAD, LAST_UPDATED, IS_ONLINE, PUNTAJE, COMENTARIOS, VIAJES, CREATED_AT
    // Si usas Sequelize para gestionar todos los campos:
    BEARING: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    VELOCIDAD: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    IS_ONLINE: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
    // Si la tabla CONDUCTORES maneja las marcas de tiempo (timestamps) manualmente:
    // CREATED_AT, UPDATED_AT, LAST_UPDATED, etc.
}, {
    // 🔑 CLAVE 1: Mapear al nombre de la tabla correcto
    tableName: 'CONDUCTORES',
    // 🔑 CLAVE 2: Desactivar los timestamps automáticos si la tabla los maneja manualmente
    timestamps: false, 
    // Opcional: Esto ayuda a que Sequelize no intente pluralizar
    freezeTableName: true, 
});

module.exports = Driver;
