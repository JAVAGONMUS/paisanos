const { DataTypes } = require('sequelize'); 
const { sequelizePostgres } = require('../config/databases'); // 👈 Rectificado

const Municipio = sequelizePostgres.define('Municipio', {
    ID_MUN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_MUN',
    },
    ID_DEP: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_DEP',
    },
    NOMBRE: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'NOMBRE',
    },
}, {
    tableName: 'MUNICIPIOS', 
    timestamps: false,
    freezeTableName: true,
});

module.exports = Municipio;
