const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 
const { pool, sequelizeMySQL } = require('../config/databases'); // Importamos ambas bases de datos
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
 * Actualiza la ubicación actual (Postgres) y registra auditoría de inicio (MySQL)
 */
const actualizarUbicacionConductor = async (req, res) => {
    const { 
        lat, lon, 
        id_cond, id_uss, // Recibimos ambos IDs
        velocidad, 
        esInicioSesion,
        intento // Recibimos el número de intento desde el frontend
    } = req.body;

    // Log de monitoreo
    console.log(`🔍 Validando -> Lat: ${lat}, Lon: ${lon}, ID_COND: ${id_cond}, ID_USS: ${id_uss}`);

    if (!lat || !lon || !id_cond) {
        return res.status(400).json({ message: "Faltan parámetros", recibido: req.body });
    }

    const client = await pool.connect();

    try {
        // --- PARTE 1: POSTGRESQL (Estado en Tiempo Real) ---
        // Solo actualizamos la posición actual del conductor para el mapa
        const updateQuery = `
            UPDATE "CONDUCTORES" 
            SET "UBICACION_LAT" = $1, 
                "UBICACION_LON" = $2, 
                "VELOCIDAD" = $3, 
                "IS_ONLINE" = true, 
                "UPDATED_AT" = NOW()
            WHERE "ID_COND" = $4
        `;
        
        const result = await client.query(updateQuery, [
            parseFloat(lat), 
            parseFloat(lon), 
            parseFloat(velocidad || 0), 
            id_cond
        ]);

        // --- PARTE 2: MYSQL (Auditoría en HISTORIAL_LOGIN) ---
        // Si el frontend marca que es el primer tracking tras el login:
        if (esInicioSesion === true || esInicioSesion === 'true') {
            
            // Formato de cadena solicitado: (ID_COND+"//"+LATITUD+"//"+LONGITUD)
            const lugarFormateado = `${id_cond}//${lat}//${lon}`;
            const numIntento = intento || 1;

            await sequelizeMySQL.query(`
                INSERT INTO HISTORIAL_LOGIN 
                (ID_USS, ID_AGEN, CAJA, TIPO, INTENTO, LUGAR, FECHA_ALTA, HORA_ALTA)
                VALUES (?, 0, 0, 1, ?, ?, CURDATE(), CURTIME())
            `, {
                replacements: [id_uss, numIntento, lugarFormateado],
                type: QueryTypes.INSERT
            });

            console.log(`📊 Registro de Inicio (TIPO 1) guardado en MySQL para ID_USS: ${id_uss}`);
        }

        res.status(200).json({ 
            success: true, 
            message: "Ubicación actualizada y auditoría registrada" 
        });

    } catch (error) {
        console.error("❌ ERROR EN SINCRONIZACIÓN:", error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    getUbicaciones,
    actualizarUbicacionConductor
};
