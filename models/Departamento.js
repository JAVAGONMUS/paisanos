// /app/models/Departamento.js
const { DataTypes } = require('sequelize');
const { sequelizeMySQL } = require('../config/databases'); 

const Departamento = sequelizeMySQL.define('Departamento', {
    ID_DEP: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_DEP',
    },
    ID_PAIS: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PAIS',
    },
    NOMBRE: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'NOMBRE',
    },
    CODIGO: {
        type: DataTypes.STRING(10),
        field: 'CODIGO',
    },    
}, {
    tableName: 'DEPARTAMENTOS', 
    timestamps: false,
    freezeTableName: true,
});

module.exports = Departamento;