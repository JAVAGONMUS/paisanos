const { pool } = require('../config/databases');

/**
 * BLINDAJE PAISANOS: Valida si un punto GPS está dentro de los polígonos permitidos.
 */
const verSectorMapaGps = async (lat, lng) => {
  // Blindaje contra coordenadas inválidas
  if (!lat || !lng || lat === 0 || lng === 0) {
      console.log("⚠️ Validación saltada: Coordenadas inválidas recibidas:", { lat, lng });
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

    // Ejecutamos la consulta usando el pool
    const res = await pool.query(query, [lng, lat]);

    // --- EL LOG DE DEPURACIÓN AQUÍ ---
    console.log(`📍 [PostGIS Check] Lng: ${lng}, Lat: ${lat} | Encontrados: ${res.rows.length}`);
    if (res.rows.length > 0) {
        console.log(`✅ Zona detectada: ${res.rows[0].NOMBRE}`);
    } else {
        console.log(`❌ Fuera de zona de cobertura`);
    }
    // ---------------------------------

    if (res.rows.length > 0) {
      return { enZona: true, zona: res.rows[0] };
    }

    return { enZona: false, zona: null };

  } catch (error) {
    console.error("❌ Error crítico en validación PostGIS:", error);
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
