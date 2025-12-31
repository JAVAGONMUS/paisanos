const { DataTypes } = require('sequelize');
const { sequelizeMySQL } = require('../config/databases'); 

const Usuario = sequelizeMySQL.define('Usuario', {
    // LLAVE PRIMARIA
    ID_USS: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_USS',
    },
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PERSO',
    },
    ID_PER: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PER',
    },
    ESTADO: {
        type: DataTypes.INTEGER, 
        allowNull: false,
        field: 'ESTADO',
        defaultValue: 0, 
    },
    USUARIO: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'USUARIO',
    },
    PASSWORD: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'PASSWORD',
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
    tableName: 'USUARIOS', 
    timestamps: false,
    freezeTableName: true,
});

module.exports = Usuario;
