// /app/controllers/ubicacionController.js

const { setupAssociations } = require('../config/associations');
const { Departamento, Municipio } = setupAssociations(); // Usamos los modelos relacionados

// Obtener el ID de país por defecto de la variable de entorno
const DEFAULT_COUNTRY_ID = process.env.DEFAULT_COUNTRY_ID; 

exports.getUbicaciones = async (req, res) => {
    if (!DEFAULT_COUNTRY_ID) {
        return res.status(500).json({ message: 'Error: DEFAULT_COUNTRY_ID no está configurado.' });
    }

    try {
        // Consulta: Trae DEPARTAMENTOS donde ID_PAIS sea el por defecto,
        // e INCLUYE todos sus MUNICIPIOS relacionados.
        const departamentos = await Departamento.findAll({
            where: { ID_PAIS: DEFAULT_COUNTRY_ID },
            attributes: ['ID_DEP', 'NOMBRE', 'CODIGO'], // Campos necesarios para el frontend/registro
            include: [{
                model: Municipio,
                as: 'municipios',
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