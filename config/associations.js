//    ../config/associations.js

const User = require('../models/User');
const Usuario = require('../models/Usuario');
const Driver = require('../models/Driver');
const Vehiculo = require('../models/Vehiculo');
const Pais = require('../models/Pais');
const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 
const Cliente = require('../models/Cliente');
exports.setupAssociations = () => {
    // 1. Relación Usuario <-> Persona
    Usuario.belongsTo(User, { foreignKey: 'ID_PERSO', as: 'persona' });
    User.hasOne(Usuario, { foreignKey: 'ID_PERSO', as: 'cuenta' });

    // 2. Relación Driver <-> Persona
    Driver.belongsTo(User, { foreignKey: 'ID_PERSO', as: 'datosPersonales' });
    User.hasOne(Driver, { foreignKey: 'ID_PERSO', as: 'perfilConductor' });

    // 3. Relación Driver <-> Vehiculo (Corregida)
    Driver.belongsTo(Vehiculo, { foreignKey: 'ID_VEH', as: 'vehiculoAsignado' });
    Vehiculo.hasOne(Driver, { foreignKey: 'ID_VEH', as: 'conductorActual' });

    // 4. Catálogos Geográficos y Moneda
    Pais.hasMany(Departamento, { foreignKey: 'ID_PAIS', as: 'departamentos' });
    Departamento.belongsTo(Pais, { foreignKey: 'ID_PAIS', as: 'pais' });

    Departamento.hasMany(Municipio, { foreignKey: 'ID_DEP', as: 'municipios' });
    Municipio.belongsTo(Departamento, { foreignKey: 'ID_DEP', as: 'departamento' });

    // Pais -> Driver (Para saber el símbolo de moneda automáticamente)
    // SPais.hasMany(Driver, { foreignKey: 'ID_PAIS' });
    // Driver.belongsTo(Pais, { foreignKey: 'ID_PAIS', as: 'paisOrigen' });
    
    Cliente.belongsTo(User, { foreignKey: 'ID_PERSO', as: 'datosPersonalesCliente' });
    User.hasOne(Cliente, { foreignKey: 'ID_PERSO', as: 'perfilCliente' });

    return { User, Usuario, Driver, Vehiculo, Pais, Departamento, Municipio, Cliente };
};
