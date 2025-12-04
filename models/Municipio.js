// /app/models/Municipio.js
const { DataTypes } = require = ('sequelize');
const { sequelizeMySQL } = require('../config/databases'); 

const Municipio = sequelizeMySQL.define('Municipio', {
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