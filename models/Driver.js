const { DataTypes } = require('sequelize');
// Asumo que tu conexión a PostgreSQL se llama sequelizePostgres
const { sequelizePostgres } = require('../config/databases'); 

// Definición del modelo para la tabla CONDUCTORES en PostgreSQL
const Driver = sequelizePostgres.define('Driver', {
    // 1. ID_COND (LLAVE PRIMARIA)
    ID_COND: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_COND',
    },
    // 2. ID_PERSO (LLAVE FORÁNEA PERSONAS)
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PERSO',
        unique: true,
    },
    // 3. ID_VEH (LLAVE FORÁNEA VEHICULOS)
    ID_VEH: {
        type: DataTypes.INTEGER,
        allowNull: true, 
        field: 'ID_VEH',
    },
    // 4. UBICACION_LAT
    UBICACION_LAT: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        field: 'UBICACION_LAT',
    },
    // 5. UBICACION_LON
    UBICACION_LON: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        field: 'UBICACION_LON',
    },
    // 6. STATUS (BOOLEAN: false por defecto. Indica si el conductor está aprobado para operar)
    STATUS: {
        type: DataTypes.BOOLEAN, // <-- CORRECCIÓN: Tipo BOOLEAN
        allowNull: false,
        field: 'STATUS',
        defaultValue: false, // <-- CORRECCIÓN: Valor FALSE por defecto
    },
    // 7. BEARING
    BEARING: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'BEARING',
    },
    // 8. VELOCIDAD
    VELOCIDAD: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'VELOCIDAD',
    },
    // 9. LAST_UPDATED
    LAST_UPDATED: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'LAST_UPDATED',
    },
    // 10. IS_ONLINE (BOOLEAN: false por defecto. Indica si está conectado/disponible)
    IS_ONLINE: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'IS_ONLINE',
        defaultValue: false,
    },
    // 11. PUNTAJE
    PUNTAJE: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'PUNTAJE',
    },
    // 12. COMENTARIOS
    COMENTARIOS: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'COMENTARIOS',
    },
    // 13. VIAJES
    VIAJES: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'VIAJES',
    },
    // 14. CREATED_AT, 15. UPDATED_AT se configuran en el objeto de opciones
}, {
    tableName: 'CONDUCTORES',
    timestamps: true, 
    createdAt: 'CREATED_AT',
    updatedAt: 'UPDATED_AT', // Mapea a UPDATED_AT
    freezeTableName: true,
});

module.exports = Driver;
