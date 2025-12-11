// ../models/Vehiculo.js
const { DataTypes } = require('sequelize');

// 🔑 Asegúrate de usar la conexión de PostgreSQL
const { sequelizePostgreSQL } = require('../config/databases'); 

// Definición del modelo para la tabla VEHICULOS en PostgreSQL
const Vehiculo = sequelizePostgreSQL.define('Vehiculo', {
    // ID_VEH (Llave Primaria)
    ID_VEH: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_VEH', 
    },
    CODIGO: {
        type: DataTypes.STRING(255), // Usar STRING(255) para character varying
        allowNull: true,
        field: 'CODIGO',
    },
    PLACAS: {
        type: DataTypes.STRING(255),
        allowNull: false, // Asumimos que las placas son obligatorias
        field: 'PLACAS',
    },
    // El tipo ENUM en PostgreSQL debe definirse o Sequelize debe mapearlo como STRING.
    // Usaremos STRING(50) y haremos que el cliente envíe una de las opciones válidas.
    TIPO: {
        type: DataTypes.STRING(50), 
        allowNull: false,
        field: 'TIPO',
    },
    COLOR: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'COLOR',
    },
    ESTADO: {
        type: DataTypes.INTEGER, // Asumimos un estado inicial (ej. 0: Inactivo/Pendiente)
        allowNull: false,
        field: 'ESTADO',
        defaultValue: 0, // Por defecto al registrar
    },
    ASEGURADORA: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ASEGURADORA',
    },
    ID_SEGURO: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ID_SEGURO',
    },
    COMENTARIOS: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'COMENTARIOS',
    },
}, {
    tableName: 'VEHICULOS', 
    timestamps: false, 
    freezeTableName: true,
});

module.exports = Vehiculo;