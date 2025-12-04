const { DataTypes } = require('sequelize');

// 🔑 CLAVE: Asegúrate de que esta variable coincida EXACTAMENTE con la exportación en databases.js
const { sequelizeMySQL } = require('../config/databases'); 

// Definición del modelo para la tabla PERSONAS en MySQL
const User = sequelizeMySQL.define('User', {
    // LLAVE PRIMARIA: ID_PERSO
    ID_PERSO: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_PERSO', // Columna en BD: ID_PERSO
    },
    // DATOS PERSONALES
    nombres: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'NOMBRE', // Columna en BD: NOMBRE
    },
    apellidos: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'APELLIDO', // Columna en BD: APELLIDO
    },
    // DOCUMENTOS E IDENTIFICACIÓN
    dpi: { 
        type: DataTypes.STRING, 
        field: 'DPI' 
    },
    vencimientoDPI: { 
        type: DataTypes.DATEONLY, 
        field: 'VENCE_DPI' // Columna en BD: VENCE_DPI
    },
    licencia: { 
        type: DataTypes.STRING, 
        field: 'LICENCIA' 
    },
    vencimientoLicencia: { 
        type: DataTypes.DATEONLY, 
        field: 'VENCE_LICENCIA' // Columna en BD: VENCE_LICENCIA
    },
    nit: { 
        type: DataTypes.STRING, 
        field: 'NIT' 
    },
    fechaNacimiento: { 
        type: DataTypes.DATEONLY, 
        field: 'NACIMIENTO' // Columna en BD: NACIMIENTO
    },
    // CONTACTO
    telefono: { 
        type: DataTypes.STRING, 
        field: 'TELEFONO' 
    },
    celular: { 
        type: DataTypes.STRING, 
        field: 'CELULAR' 
    },
    email1: { // Email principal para login/registro
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'CORREO1', // Columna en BD: CORREO1
    },
    email2: { 
        type: DataTypes.STRING, 
        field: 'CORREO2' // Columna en BD: CORREO2
    },
    // DIRECCIÓN
    numeralDireccion: { 
        type: DataTypes.STRING, 
        field: 'NUM_DIREC' // Columna en BD: NUM_DIREC
    },
    zonaDireccion: { 
        type: DataTypes.STRING, 
        field: 'ZONA_DIREC' 
    },
    coloniaDireccion: { 
        type: DataTypes.STRING, 
        field: 'COL_DIREC' 
    },
    departamentoDireccion: { 
        type: DataTypes.STRING, 
        field: 'DEP_DIREC' 
    },
    municipioDireccion: { 
        type: DataTypes.STRING, 
        field: 'MUN_DIREC' 
    },
    
    // Mapeo a ID de Departamento
    departamentoDireccion: { 
        type: DataTypes.INTEGER, // Tipo de dato que espera la BD
        field: 'DEP_DIREC' 
    },
    // Mapeo a ID de Municipio
    municipioDireccion: { 
        type: DataTypes.INTEGER, // Tipo de dato que espera la BD
        field: 'MUN_DIREC' 
    },    
}, {
    tableName: 'PERSONAS', 
    // Los campos 'FECHA_ALTA' y 'HORA_ALTA' sugieren que NO quieres que Sequelize maneje los timestamps automáticos.
    timestamps: false, 
    freezeTableName: true,
    // Si tu tabla usa snake_case (NOMBRE, APELLIDO) y quieres que Sequelize lo gestione por defecto
    // underscored: true,
});

module.exports = User;
