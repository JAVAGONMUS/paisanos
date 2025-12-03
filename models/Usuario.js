// /app/models/Usuario.js

const { DataTypes } = require('sequelize');

// Usamos la conexión de MySQL
const { sequelizeMySQL } = require('../config/databases'); 

const Usuario = sequelizeMySQL.define('Usuario', {
    // LLAVE PRIMARIA: ID_USS
    ID_USS: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_USS',
    },
    // LLAVE FORÁNEA: ID_PERSO
    ID_PERSO: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PERSO',
    },
    // ID_PER (Perfil/Rol)
    ID_PER: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ID_PER',
    },
    // ESTADO
    ESTADO: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'ESTADO',
    },
    // CREDENCIALES
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
    // AUDITORÍA
    FECHA_ALTA: {
        type: DataTypes.DATEONLY,
        field: 'FECHA_ALTA',
    },
    HORA_ALTA: {
        type: DataTypes.TIME,
        field: 'HORA_ALTA',
    },
    USER_NEW_DATA: {
        type: DataTypes.STRING,
        field: 'USER_NEW_DATA',
    },
}, {
    tableName: 'USUARIOS', 
    timestamps: false,
    freezeTableName: true,
});

module.exports = Usuario;