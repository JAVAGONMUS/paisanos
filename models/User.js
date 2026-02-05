const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases'); // 👈 Cambiado a Postgres

const User = sequelizePostgres.define('User', {
    ID_PERSO: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID_PERSO',
    },
    nombres: { type: DataTypes.STRING, allowNull: false, field: 'NOMBRE' },
    apellidos: { type: DataTypes.STRING, allowNull: false, field: 'APELLIDO' },
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
    departamentoDireccion: { type: DataTypes.INTEGER, field: 'DEP_DIREC' },
    municipioDireccion: { type: DataTypes.INTEGER, field: 'MUN_DIREC' },    
    FECHA_ALTA: { type: DataTypes.DATEONLY, field: 'FECHA_ALTA' },
    HORA_ALTA: { type: DataTypes.TIME, field: 'HORA_ALTA' },
    USER_NEW_DATA: { type: DataTypes.INTEGER, field: 'USER_NEW_DATA' },
}, {
    tableName: 'PERSONAS', 
    timestamps: false,
});

module.exports = User;
