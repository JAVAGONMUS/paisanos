const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const Cliente = sequelizePostgres.define('Cliente', {
    ID_CL: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_CL',
    },
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PERSO',
    },
    COMENTARIOS: {
        type: DataTypes.TEXT,
        field: 'COMENTARIOS',
    },
    PUNTAJE: {
        type: DataTypes.DECIMAL,
        field: 'PUNTAJE',
        defaultValue: 5.0 // Puntaje inicial por defecto
    },
    FECHA_ALTA: {
        type: DataTypes.DATEONLY,
        field: 'FECHA_ALTA',
    },
    HORA_ALTA: {
        type: DataTypes.TIME,
        field: 'HORA_ALTA',
    },
    USER_NEW_DATA: {
        type: DataTypes.INTEGER,
        field: 'USER_NEW_DATA',
    },
}, {
    tableName: 'CLIENTES',
    timestamps: false,
});

module.exports = Cliente;