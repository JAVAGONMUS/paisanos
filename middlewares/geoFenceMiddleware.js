const geoService = require('../services/geoValidation');
const Driver = require('../models/Driver');

const geoFenceGuard = async (req, res, next) => {
    // 1. Extraer coordenadas del body (o de donde las envíe tu app)
    const { lat, lng, driverId } = req.body;
    const id = req.user?.id || driverId;

    if (!lat || !lng) return next(); // Si no hay GPS, pasamos al siguiente (o puedes bloquear)

    try {
        const validacion = await geoService.verSectorMapaGps(lat, lng);

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