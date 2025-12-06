// models/Dominio.js
const { DataTypes } = require('sequelize');
const { sequelizeMySQL } = require('../config/databases'); 

const Dominio = sequelizeMySQL.define('Dominio', {
    // Llave primaria
    ID_DOM: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_DOM',
    },
    
    NOMBRE_DOMINIO: { 
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
