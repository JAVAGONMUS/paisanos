const db = require('../config/databases'); 

/**
 * BLINDAJE PAISANOS: Valida si un punto GPS está dentro de los polígonos permitidos.
 */
const verSectorMapaGps = async (lat, lng) => {
  try {
    // Validamos que vengan coordenadas válidas
    if (!lat || !lng) return { enZona: false, zona: null };

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

    // IMPORTANTE: $1 = Longitud, $2 = Latitud
    const res = await db.query(query, [lng, lat]);

    if (res.rows.length > 0) {
      return {
        enZona: true,
        zona: res.rows[0]
      };
    }

    return { enZona: false, zona: null };

  } catch (error) {
    console.error("❌ Error en validación PostGIS:", error);
    // Por seguridad (Fail-Safe), si falla el servicio, denegamos el acceso
    return { enZona: false, error: true };
  }
};

const obtenerPoligonosActivos = async () => {
    const query = `
      SELECT "ID_ZONAS", "NOMBRE", "NIVEL", ST_AsGeoJSON("GEOMETRIA")::json as geojson 
      FROM "ZONAS_SERVICIO" 
      WHERE "ACTIVO" = true;
    `;
    const res = await db.query(query);
    return res.rows;
};

module.exports = { verSectorMapaGps, obtenerPoligonosActivos };
