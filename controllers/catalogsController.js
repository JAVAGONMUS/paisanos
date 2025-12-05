const Dominio = require('../models/Dominio');

exports.getDomains = async (req, res) => {
    try {
        const dominios = await Dominio.findAll({
            attributes: ['ID_DOM', 'NOMBRE']
        });
        
        // Mapeamos para el formato que espera el Dropdown de React Native
        const formattedDomains = dominios.map(d => ({
            label: d.NOMBRE,
            value: d.NOMBRE // Enviamos el string del dominio como valor
        }));

        res.status(200).json(formattedDomains);
    } catch (error) {
        console.error('Error al obtener dominios:', error);
        res.status(500).json({ message: 'Error interno al cargar la lista de dominios.' });
    }
};
