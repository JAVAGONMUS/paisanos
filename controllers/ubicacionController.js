// /app/controllers/ubicacionController.js

// 🔑 IMPORTAR MODELOS DIRECTAMENTE, NO EJECUTAR setupAssociations aquí.
const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 

// Obtener el ID de país por defecto de la variable de entorno
const DEFAULT_COUNTRY_ID = process.env.DEFAULT_COUNTRY_ID; 

exports.getUbicaciones = async (req, res) => {
    if (!DEFAULT_COUNTRY_ID) {
        return res.status(500).json({ message: 'Error: DEFAULT_COUNTRY_ID no está configurado.' });
    }

    try {
        // Consulta: Trae DEPARTAMENTOS donde ID_PAIS sea el por defecto.
        // Las asociaciones ('municipios') ya están cargadas globalmente por server.js.
        const departamentos = await Departamento.findAll({
            where: { ID_PAIS: DEFAULT_COUNTRY_ID },
            attributes: ['ID_DEP', 'NOMBRE', 'CODIGO'], 
            include: [{
                model: Municipio,
                as: 'municipios', // Usamos el alias definido en associations.js
                attributes: ['ID_MUN', 'NOMBRE'],
            }],
            order: [['NOMBRE', 'ASC']],
        });

        // Respuesta para el dispositivo: lista de departamentos con municipios anidados
        res.status(200).json(departamentos);

    } catch (error) {
        console.error('Error al cargar catálogo de ubicaciones desde DB:', error);
        res.status(500).json({ message: 'Error interno al obtener el catálogo.' });
    }
};
