// Asumiendo que usas el pool de 'pg' para tu conexión a Postgres en Railway
const db = require('../config/databases'); 

/**
 * Verifica si una coordenada GPS pertenece a una zona de servicio activa.
 * @param {number} lat - Latitud del usuario/conductor
 * @param {number} lng - Longitud del usuario/conductor
 * @returns {Object|null} - Retorna los datos de la zona si es válida, o null si está fuera de rango.
 */
const verSectorMapaGps = async (lat, lng) => {
  try {
    // IMPORTANTE: ST_Point recibe (Longitud, Latitud) en ese orden específico para SRID 4326
    const query = `
      SELECT 
        "ID_ZONAS", 
        "NOMBRE", 
        "NIVEL"
      FROM "ZONAS_SERVICIO" 
      WHERE ST_Contains(
        "GEOMETRIA", 
        ST_SetSRID(ST_Point($1, $2), 4326)
      ) 
      AND "ACTIVO" = true 
      LIMIT 1;
    `;

    // Ejecutamos la consulta pasando Longitud ($1) y luego Latitud ($2)
    const res = await db.query(query, [lng, lat]);

    if (res.rows.length > 0) {
      // El punto está DENTRO de una geocerca permitida
      return {
        enZona: true,
        zona: res.rows[0]
      };
    } else {
      // El punto está FUERA de todas las geocercas activas
      return {
        enZona: false,
        zona: null
      };
    }
  } catch (error) {
    console.error("Error en validación de geocerca PostGIS:", error);
    // En caso de error técnico, por seguridad bloqueamos la disponibilidad
    throw new Error("Error al validar ubicación geográfica");
  }
};

/**
 * Función extra para obtener todas las zonas (útil para dibujar en el frontend de administración)
 */
const obtenerPoligonosActivos = async () => {
    const query = `
      SELECT "ID_ZONAS", "NOMBRE", ST_AsGeoJSON("GEOMETRIA")::json as geojson 
      FROM "ZONAS_SERVICIO" 
      WHERE "ACTIVO" = true;
    `;
    const res = await db.query(query);
    return res.rows;
};

module.exports = {
  verSectorMapaGps,
  obtenerPoligonosActivos
};
