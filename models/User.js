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
    // ... (El resto de campos de datos personales/contacto/dirección se mantienen) ...
    dpi: { type: DataTypes.STRING, field: 'DPI' },
    vencimientoDPI: { type: DataTypes.DATEONLY, field: 'VENCE_DPI' },
    licencia: { type: DataTypes.STRING, field: 'LICENCIA' },
    vencimientoLicencia: { type: DataTypes.DATEONLY, field: 'VENCE_LICENCIA' },
    nit: { type: DataTypes.STRING, field: 'NIT' },
    fechaNacimiento: { type: DataTypes.DATEONLY, field: 'NACIMIENTO' },
    telefono: { type: DataTypes.STRING, field: 'TELEFONO' },
    celular: { type: DataTypes.STRING, field: 'CELULAR' },
    email1: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'CORREO1' },
    email2: { type: DataTypes.STRING, field: 'CORREO2' },
    numeralDireccion: { type: DataTypes.STRING, field: 'NUM_DIREC' },
    zonaDireccion: { type: DataTypes.STRING, field: 'ZONA_DIREC' },
    coloniaDireccion: { type: DataTypes.STRING, field: 'COL_DIREC' },
    // Mapeo a ID de Departamento
    departamentoDireccion: { 
        type: DataTypes.INTEGER, 
        field: 'DEP_DIREC' 
    },
    // Mapeo a ID de Municipio
    municipioDireccion: { 
        type: DataTypes.INTEGER, 
        field: 'MUN_DIREC' 
    },    
    // AUDITORÍA
    FECHA_ALTA: {
        type: DataTypes.DATEONLY, // Usar DATEONLY para YYYY-MM-DD
        field: 'FECHA_ALTA',
    },
    HORA_ALTA: {
        type: DataTypes.TIME, // Usar TIME para HH:MM:SS
        field: 'HORA_ALTA',
    },
    USER_NEW_DATA: {
        // 💡 Tipo cambiado a INTEGER, ya que hace referencia a un ID_PERSO (que es INTEGER)
        type: DataTypes.INTEGER, 
        field: 'USER_NEW_DATA',
    },
}, {
    tableName: 'PERSONAS', 
    timestamps: false, 
    freezeTableName: true,
});

module.exports = User;
