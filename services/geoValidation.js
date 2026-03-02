//   ../services/geoValidation.js

const { pool } = require('../config/databases');

/**
 * BLINDAJE PAISANOS: Valida si un punto GPS está dentro de los polígonos permitidos.
 * Optimizado para Mapbox (WGS84 EPSG:4326)
 */
const verSectorMapaGps = async (lat, lng) => {
  if (lat < 13 || lat > 19 || lng < -93 || lng > -87) {
    return { enZona: false, zona: null, mensaje: "Coordenadas fuera de Guatemala" };
  }
  // Validación de integridad de datos
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return { enZona: false, zona: null };
  }
  
  // Filtro de coordenadas "zero" (errores comunes de sensores GPS fríos)
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      return { enZona: false, zona: null };
  }
  
  try {
    /**
     * ST_Intersects es más rápido que ST_Contains para puntos.
     * ST_GeogFromText asegura que usemos geografía (esfera) y no solo geometría (plano),
     * aunque para áreas pequeñas como la Zona 12, ST_SetSRID funciona perfecto.
     */
    const query = `
      SELECT "ID_ZONAS", "NOMBRE", "NIVEL"
      FROM "ZONAS_SERVICIO" 
      WHERE ST_Intersects(
        "GEOMETRIA", 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      ) 
      AND "ACTIVO" = true 
      LIMIT 1;
    `;
    
    // Log de auditoría para Render
    console.log(`📍 [PAISANOS GPS] Validando -> Long: ${lng}, Lat: ${lat}`);

    // Ejecución de la consulta: $1 = Longitude (X), $2 = Latitude (Y)
    const res = await pool.query(query, [lng, lat]);

    if (res.rows.length > 0) {
      const zonaEncontrada = res.rows[0];
      console.log(`✅ [ZONA AUTORIZADA]: ${zonaEncontrada.NOMBRE}`);
      return { enZona: true, zona: zonaEncontrada };
    }

    console.log(`🚫 [FUERA DE RANGO]: El conductor no coincide con ninguna zona activa.`);
    return { enZona: false, zona: null };

  } catch (error) {
    console.error("❌ [ERROR CRÍTICO POSTGIS]:", error.message);
    // Por seguridad, si el motor de mapas falla, bloqueamos al conductor (Fail-Safe)
    return { enZona: false, error: true };
  }
};

/**
 * Recupera los polígonos para que el Frontend los cachee si es necesario
 */
const obtenerPoligonosActivos = async () => {
    try {
        const query = `
          SELECT "ID_ZONAS", "NOMBRE", "NIVEL", ST_AsGeoJSON("GEOMETRIA")::json as geojson 
          FROM "ZONAS_SERVICIO" 
          WHERE "ACTIVO" = true;
        `;
        const res = await pool.query(query);
        return res.rows;
    } catch (error) {
        console.error("❌ Error recuperando polígonos:", error);
        return [];
    }
};

module.exports = { verSectorMapaGps, obtenerPoligonosActivos };
