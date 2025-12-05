// /app/models/Dominio.js
const { DataTypes } = require('sequelize');
const { sequelizeMySQL } = require('../config/databases'); 

const Dominio = sequelizeMySQL.define('Dominio', {
    ID_DOM: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_DOM',
    },
    NOMBRE: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'NOMBRE',
    },
}, {
    tableName: 'DOMINIOS', 
    timestamps: false,
    freezeTableName: true,
});

module.exports = Dominio;