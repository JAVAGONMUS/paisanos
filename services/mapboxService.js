const axios = require('axios');

/**
 * Calcula el tiempo real de llegada usando tráfico de Mapbox
 */
const obtenerTiempoRealLlegada = async (latOrigen, lngOrigen, latDestino, lngDestino) => {
    // Extraemos el token desde las variables de entorno
    const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
    
    if (!MAPBOX_TOKEN) {
        console.error("❌ ERROR: MAPBOX_ACCESS_TOKEN no definido en .env");
        return null;
    }

    // Usamos 'driving-traffic' para la mayor precisión posible en tiempo real
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${lngOrigen},${latOrigen};${lngDestino},${latDestino}?access_token=${MAPBOX_TOKEN}`;
    
    try {
        const response = await axios.get(url);
        
        if (!response.data.routes || response.data.routes.length === 0) {
            console.warn("⚠️ No se encontró una ruta viable entre los puntos.");
            return null; 
        }

        const duracionSegundos = response.data.routes[0].duration;
        const distanciaMetros = response.data.routes[0].distance;

        return {
            minutos: Math.round(duracionSegundos / 60),
            km: parseFloat((distanciaMetros / 1000).toFixed(2)),
            resumen: response.data.routes[0].legs[0].summary // Nombre de la vía principal
        }; 
    } catch (error) {
        console.error("❌ Error Mapbox API:", error.response ? error.response.data : error.message);
        return null;
    }
};

module.exports = { obtenerTiempoRealLlegada };