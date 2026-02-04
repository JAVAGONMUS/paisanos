const { pool } = require('../config/databases');

/**
 * BLINDAJE PAISANOS: Valida si un punto GPS está dentro de los polígonos permitidos.
 */
const verSectorMapaGps = async (lat, lng) => {
  if (!lat || !lng || lat === 0 || lng === 0) {
      return { enZona: false, zona: null };
  }
  
  try {
    const query = `
      SELECT "ID_ZONAS", "NOMBRE", "NIVEL"
      FROM "ZONAS_SERVICIO" 
      WHERE ST_Contains(
        "GEOMETRIA", 
        ST_SetSRID(ST_Point($1, $2), 4326)
      ) 
      AND "ACTIVO" = true 
      LIMIT 1;
    `;
    
    // 🚩 AGREGA ESTA LÍNEA AQUÍ PARA VER QUÉ RECIBE RAILWAY
    console.log(`📍 PostGIS Validando -> Long(X): ${lng}, Lat(Y): ${lat}`);

    // IMPORTANTE: $1 = Longitud, $2 = Latitud
    const res = await pool.query(query, [lng, lat]);

    // 🚩 AGREGA ESTA LÍNEA AQUÍ PARA VER EL RESULTADO
    console.log(`🔍 Resultado DB: ${res.rows.length} zonas encontradas.`);

    if (res.rows.length > 0) {
      return { enZona: true, zona: res.rows[0] };
    }
    return { enZona: false, zona: null };

  } catch (error) {
    console.error("❌ Error en validación PostGIS:", error);
    return { enZona: false, error: true };
  }
};

const obtenerPoligonosActivos = async () => {
    const query = `
      SELECT "ID_ZONAS", "NOMBRE", "NIVEL", ST_AsGeoJSON("GEOMETRIA")::json as geojson 
      FROM "ZONAS_SERVICIO" 
      WHERE "ACTIVO" = true;
    `;
    const res = await pool.query(query);
    return res.rows;
};

module.exports = { verSectorMapaGps, obtenerPoligonosActivos };
