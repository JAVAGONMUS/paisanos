// ../models/Vehiculo.js
const { DataTypes } = require('sequelize');

const { sequelizePostgres } = require('../config/databases'); 

const Vehiculo = sequelizePostgres.define('Vehiculo', {
    // ID_VEH (Llave Primaria)
    ID_VEH: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        autoIncrementIdentity: true,
        field: 'ID_VEH', 
    },
    CODIGO: {
        type: DataTypes.STRING(255), 
        allowNull: true,
        field: 'CODIGO',
    },
    PLACAS: {
        type: DataTypes.STRING(255),
        allowNull: false, 
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
        type: DataTypes.INTEGER, 
        allowNull: false,
        field: 'ESTADO',
        defaultValue: 0, 
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
