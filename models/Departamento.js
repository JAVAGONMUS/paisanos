const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases'); // 👈 Rectificado

const Departamento = sequelizePostgres.define('Departamento', {
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
