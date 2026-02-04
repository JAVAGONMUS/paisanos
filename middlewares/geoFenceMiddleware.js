const geoService = require('../services/geoValidation');
const Driver = require('../models/Driver');

const geoFenceGuard = async (req, res, next) => {
    const { lat, lng, lon, driverId } = req.body;
    const longitude = lng || lon; // Usa el que venga definido
    const id = req.user?.id || driverId;

    if (!lat || !longitude) {
        console.log("⚠️ Middleware: GPS faltante en la petición body:", req.body);
        return next(); 
    }

    try {
        const validacion = await geoService.verSectorMapaGps(lat, longitude);

        if (!validacion.enZona) {
            // A. Cambiar estado en base de datos inmediatamente
            await Driver.update(
                { IS_ONLINE: false, STATUS_DETAIL: 'FUERA_DE_RANGO' },
                { where: { ID_COND: id } }
            );

            // B. CORTAR SOCKET: Si tienes acceso al objeto global io
            if (global.io) {
                // Buscamos el socket del conductor y lo desconectamos
                const socketId = `driver_${id}`; 
                global.io.to(socketId).emit('forced_logout', { 
                    reason: 'FUERA_DE_RANGO',
                    mensaje: 'Has salido del área de servicio de PAISANOS.' 
                });
            }

            return res.status(403).json({
                status: "OFFSIDE",
                mensaje: "FUERA DEL ALCANCE DEL SERVICIO"
            });
        }

        // Si todo está bien, pasamos al controlador
        next();
    } catch (error) {
        console.error("Error en Middleware Geofence:", error);
        res.status(500).json({ message: "Error de validación geográfica" });
    }
};

module.exports = geoFenceGuard;
