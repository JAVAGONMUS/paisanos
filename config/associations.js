const User = require('../models/User');
const Usuario = require('../models/Usuario');
const Driver = require('../models/Driver');
const Vehiculo = require('../models/Vehiculo');
const Pais = require('../models/Pais');
const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 

exports.setupAssociations = () => {
    // 1. Relación Usuario <-> Persona
    // Un Usuario pertenece a una Persona (ID_PERSO)
    Usuario.belongsTo(User, { foreignKey: 'ID_PERSO', as: 'persona' });
    User.hasOne(Usuario, { foreignKey: 'ID_PERSO', as: 'cuenta' });

    // 2. Relación Driver <-> Persona
    // Un Conductor es una Persona
    Driver.belongsTo(User, { foreignKey: 'ID_PERSO', as: 'datosPersonales' });
    User.hasOne(Driver, { foreignKey: 'ID_PERSO' });

    // 3. Relación Driver <-> Vehiculo
    // Un Conductor tiene un Vehículo asignado
    Driver.belongsTo(Vehiculo, { foreignKey: 'ID_VEH' });
    Vehiculo.hasOne(Driver, { foreignKey: 'ID_VEH' });

    // 4. Catálogos Geográficos
    Pais.hasMany(Departamento, { foreignKey: 'ID_PAIS', as: 'departamentos' });
    Departamento.belongsTo(Pais, { foreignKey: 'ID_PAIS' });

    Departamento.hasMany(Municipio, { foreignKey: 'ID_DEP', as: 'municipios' });
    Municipio.belongsTo(Departamento, { foreignKey: 'ID_DEP' });
    
    return { User, Usuario, Driver, Vehiculo, Pais, Departamento, Municipio };
};
