const Dominio = require('../models/Dominio');

/**
 * Obtiene la lista de dominios de correo electrónico permitidos.
 */
exports.getDomains = async (req, res) => {
    try {
        const dominios = await Dominio.findAll({
            attributes: ['ID_DOM', 'NOMBRE_DOMINIO']
        });
        
        // Mapeamos para el formato que espera el Dropdown de React Native
        const formattedDomains = dominios.map(d => ({
            label: d.NOMBRE_DOMINIO,
            value: d.NOMBRE_DOMINIO // Enviamos el string del dominio como valor
        }));

        res.status(200).json(formattedDomains);
    } catch (error) {
        console.error('Error al obtener dominios:', error);
        res.status(500).json({ message: 'Error interno al cargar la lista de dominios.' });
    }
};

/**
 * Nota: Asume que esta función se agregará a tu archivo de rutas (e.g., server/routes/catalogs.js o server/routes/index.js)
 * con un endpoint como GET /api/dominios.
 */
