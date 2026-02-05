const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases'); // 👈 Rectificado

const Pais = sequelizePostgres.define('Pais', {
    ID_PAIS: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_PAIS',
    },
    NOMBRE: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'NOMBRE',
    },
}, {
    tableName: 'PAISES', 
    timestamps: false,
    freezeTableName: true,
});

module.exports = Pais;
