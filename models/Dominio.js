const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases'); // 👈 Rectificado

const Dominio = sequelizePostgres.define('Dominio', {
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
