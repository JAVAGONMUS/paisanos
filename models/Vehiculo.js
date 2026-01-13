const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases'); 

const Vehiculo = sequelizePostgres.define('Vehiculo', {
    // ID_VEH: Llave Primaria auto-incremental
    ID_VEH: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_VEH', 
    },
    // CODIGO: Identificador interno o número de unidad
    CODIGO: {
        type: DataTypes.STRING(255), 
        allowNull: true,
        field: 'CODIGO',
    },
    // PLACAS: Matrícula del vehículo (Obligatorio)
    PLACAS: {
        type: DataTypes.STRING(255),
        allowNull: false, 
        field: 'PLACAS',
    },
    // TIPO: Sedán, Hatchback, SUV, etc.
    TIPO: {
        type: DataTypes.STRING(50), 
        allowNull: false,
        field: 'TIPO',
    },
    // COLOR: Color comercial del vehículo
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
    // ASEGURADORA: Nombre de la compañía de seguros
    ASEGURADORA: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ASEGURADORA',
    },
    // ID_SEGURO: Número de póliza de seguro
    ID_SEGURO: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ID_SEGURO',
    },
    // COMENTARIOS: Observaciones adicionales sobre el vehículo
    COMENTARIOS: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'COMENTARIOS',
    },
}, {
    tableName: 'VEHICULOS', // Nombre exacto de la tabla en Postgres
    timestamps: false,      // No usamoscreatedAt/updatedAt automáticos de Sequelize
    freezeTableName: true,  // Evita que Sequelize cambie 'Vehiculo' a 'Vehiculos'
});

module.exports = Vehiculo;
