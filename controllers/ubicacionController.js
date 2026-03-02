//../controllers/ubicacionController.js

const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 
const { pool } = require('../config/databases'); 
const { QueryTypes } = require('sequelize');

const DEFAULT_COUNTRY_ID = process.env.DEFAULT_COUNTRY_ID; 

/**
 * Obtiene el catálogo de departamentos y municipios
 */
const getUbicaciones = async (req, res) => {
    if (!DEFAULT_COUNTRY_ID) {
        return res.status(500).json({ message: 'Error: DEFAULT_COUNTRY_ID no configurado.' });
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
        console.error('Error al cargar catálogo:', error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

/**
 * Actualiza la ubicación actual UNICAMENTE en Postgres
 * Esta función corre cada 5 segundos.
 */
const actualizarUbicacionConductor = async (req, res) => {
    const { 
        lat, lon, 
        id_cond, 
        velocidad 
    } = req.body;

    // Log de monitoreo limpio (Ya no imprimimos ID_USS porque no es necesario aquí)
    console.log(`📡 Rastreo -> Lat: ${lat}, Lon: ${lon}, ID_COND: ${id_cond}`);

    if (!lat || !lon || !id_cond) {
        return res.status(400).json({ message: "Faltan parámetros", recibido: req.body });
    }

    let client;

    try {
        client = await pool.connect();

        // --- UNICA RESPONSABILIDAD: POSTGRESQL (Estado en Tiempo Real) ---
        const updateQuery = `
            UPDATE "CONDUCTORES" 
            SET "UBICACION_LAT" = $1, 
                "UBICACION_LON" = $2, 
                "VELOCIDAD" = $3, 
                "IS_ONLINE" = true, 
                "UPDATED_AT" = NOW()
            WHERE "ID_COND" = $4
        `;
        
        await client.query(updateQuery, [
            parseFloat(lat), 
            parseFloat(lon), 
            parseFloat(velocidad || 0), 
            id_cond
        ]);

        // Ya no insertamos en HISTORIAL_LOGIN aquí. 
        // Eso se hace en driverController.js al momento del Login y Logout.

        res.status(200).json({ 
            success: true, 
            message: "Ubicación actualizada en Postgres" 
        });

    } catch (error) {
        console.error("❌ ERROR EN RASTREO POSTGRES:", error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    getUbicaciones,
    actualizarUbicacionConductor
};
