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
    // 💥 CORRECCIÓN CRÍTICA: ESTADO debe ser INTEGER para aceptar 0/1
    ESTADO: {
        type: DataTypes.INTEGER, // ¡Cambiado de STRING a INTEGER!
        allowNull: false,
        field: 'ESTADO',
        defaultValue: 0, // Por defecto al crear: Inactivo (0)
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
    // 💡 Tipo cambiado a INTEGER, ya que guarda una referencia ID_PERSO
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
