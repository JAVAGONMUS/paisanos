const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 

const { pool } = require('../config/databases'); // Asumiendo que usas un pool de conexión a Postgres

// Obtener el ID de país por defecto de la variable de entorno
const DEFAULT_COUNTRY_ID = process.env.DEFAULT_COUNTRY_ID; 

exports.getUbicaciones = async (req, res) => {
    if (!DEFAULT_COUNTRY_ID) {
        return res.status(500).json({ message: 'Error: DEFAULT_COUNTRY_ID no está configurado.' });
    }

    try {        
        const departamentos = await Departamento.findAll({
            where: { ID_PAIS: DEFAULT_COUNTRY_ID },
            attributes: ['ID_DEP', 'NOMBRE', 'CODIGO'], 
            include: [{
                model: Municipio,
                as: 'municipios', 
                attributes: ['ID_MUN', 'NOMBRE'],
            }],
            order: [['NOMBRE', 'ASC']],
        });

        res.status(200).json(departamentos);

    } catch (error) {
        console.error('Error al cargar catálogo de ubicaciones desde DB:', error);
        res.status(500).json({ message: 'Error interno al obtener el catálogo.' });
    }
};

const actualizarUbicacionConductor = async (req, res) => {
    const { lat, lon, id_cond } = req.body; // Estos datos vienen del frontend
    const client = await pool.connect(); // Iniciamos conexión para la transacción

    try {
        await client.query('BEGIN'); // 🚀 INICIA LA TRANSACCIÓN

        // 1. Actualizar la ubicación actual del conductor
        const updateQuery = `
            UPDATE CONDUCTORES 
            SET UBICACION_LAT = $1, UBICACION_LON = $2, UPDATED_AT = NOW()
            WHERE ID_COND = $3;
        `;
        await client.query(updateQuery, [lat, lon, id_cond]);

        // 2. Insertar en el historial de GPS
        const insertHistorialQuery = `
            INSERT INTO HISTORIAL_GPS (ID_COND, UBICACION_LAT, UBICACION_LON, CREATED_AT)
            VALUES ($1, $2, $3, NOW());
        `;
        await client.query(insertHistorialQuery, [id_cond, lat, lon]);

        await client.query('COMMIT'); // ✅ TODO BIEN: Confirmamos los cambios
        
        res.status(200).json({ success: true, message: "Ubicación actualizada correctamente" });

    } catch (error) {
        await client.query('ROLLBACK'); // ❌ ERROR: Se deshacen todos los cambios (Integridad Total)
        console.error("Error en transacción GPS:", error);
        res.status(500).json({ success: false, message: "Error crítico al registrar ubicación" });
    } finally {
        client.release(); // Liberamos la conexión
    }
};

module.exports = { actualizarUbicacionConductor };
