const { DataTypes } = require('sequelize');

// 🔑 CLAVE 1: Debe importar y usar la conexión de MySQL
const { sequelizeMysql } = require('../config/databases'); 

// Renombrar el modelo a 'Persona' puede ser más claro, pero lo dejamos como 'User' 
// para no tener que cambiar las importaciones en el DriverController.js.
const User = sequelizeMysql.define('User', {
    // 🔑 CLAVE 2: La llave primaria de la tabla PERSONAS en MySQL
    ID_PERSO: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // Mapeo de los campos del formulario a la tabla PERSONAS (MySQL)
    NOMBRES: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    APELLIDOS: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // Asumiendo que el campo para email principal es EMAIL1
    EMAIL1: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    PASSWORD: { // Para el login
        type: DataTypes.STRING,
        allowNull: false,
    },
    // Mapeo del resto de campos de la tabla PERSONAS
    DPI: { type: DataTypes.STRING },
    VENCIMIENTO_DPI: { type: DataTypes.DATEONLY },
    LICENCIA: { type: DataTypes.STRING },
    VENCIMIENTO_LICENCIA: { type: DataTypes.DATEONLY },
    NIT: { type: DataTypes.STRING },
    FECHA_NACIMIENTO: { type: DataTypes.DATEONLY },
    TELEFONO: { type: DataTypes.STRING },
    CELULAR: { type: DataTypes.STRING },
    NUMERAL_DIRECCION: { type: DataTypes.STRING },
    ZONA_DIRECCION: { type: DataTypes.STRING },
    COLONIA_DIRECCION: { type: DataTypes.STRING },
    DEPARTAMENTO_DIRECCION: { type: DataTypes.STRING },
    MUNICIPIO_DIRECCION: { type: DataTypes.STRING },
    EMAIL2: { type: DataTypes.STRING }, // Si la tabla PERSONAS lo tiene
    // Otros campos si existen en la tabla PERSONAS...
}, {
    // 🔑 CLAVE 3: Mapear al nombre de la tabla correcto en MySQL
    tableName: 'PERSONAS', 
    timestamps: true, // Asume que la tabla PERSONAS usa los timestamps por defecto de Sequelize
    freezeTableName: true, 
});

module.exports = User;
