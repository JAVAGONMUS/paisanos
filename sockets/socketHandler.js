const { pool } = require('../config/databases'); 
const geoService = require('../services/geoValidation'); // Importamos el blindaje

// Mapas en memoria para rapidez de respuesta
const connectedDrivers = {}; 

exports.initSocketIO = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 Cliente conectado al Socket: ${socket.id}`);

        // 1. Identificación del Conductor
        socket.on('driverConnect', ({ driverId }) => {
            if (driverId) {
                // Unimos al conductor a su "Sala Privada" (Inviolable para alertas directas)
                socket.join(`driver_${driverId}`);
                connectedDrivers[driverId] = socket.id;
                console.log(`✅ Conductor ${driverId} enlazado a sala privada.`);
            }
        });

        // 2. ACTUALIZACIÓN GPS CON BLINDAJE GEOGRÁFICO
        socket.on('updateLocation', async (data) => {
            const { driverId, lat, lon } = data;
            
            if (!driverId || !lat || !lon) return;

            // --- INICIO DEL BLINDAJE PAISANOS ---
            try {
                const validacion = await geoService.verSectorMapaGps(lat, lon);

                if (!validacion.enZona) {
                    console.log(`⚠️ BLOQUEO: Conductor ${driverId} fuera de zona.`);
                    
                    // A. Notificar al APP para que bloquee la interfaz
                    socket.emit('forced_logout', { 
                        reason: 'FUERA_DE_RANGO',
                        mensaje: 'Estás fuera del área de servicio autorizada.' 
                    });

                    // B. Forzar estado Offline en DB
                    await pool.query(
                        'UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', 
                        [driverId]
                    );
                    
                    return; // Cortamos la ejecución aquí
                }

                // --- SI ESTÁ EN ZONA, PROCEDEMOS CON LA TRANSACCIÓN ---
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    // A. Actualizar ubicación actual
                    const updateDriverQuery = `
                        UPDATE "CONDUCTORES" 
                        SET "UBICACION_LAT" = $1, "UBICACION_LON" = $2, "IS_ONLINE" = true, "UPDATED_AT" = NOW()
                        WHERE "ID_COND" = $3
                    `;
                    await client.query(updateDriverQuery, [lat, lon, driverId]);

                    // B. Insertar en HISTORIAL_GPS
                    const insertHistoryQuery = `
                        INSERT INTO "HISTORIAL_GPS" ("ID_COND", "UBICACION_LAT", "UBICACION_LON", "CREATED_AT")
                        VALUES ($1, $2, $3, NOW())
                    `;
                    await client.query(insertHistoryQuery, [driverId, lat, lon]);

                    await client.query('COMMIT');

                    // Confirmación al conductor
                    socket.emit('locationUpdateSuccess', { 
                        status: 'En línea',
                        zona: validacion.zona.NOMBRE 
                    });

                    // Notificar a pasajeros (Broadcast optimizado)
                    socket.broadcast.emit('driverLocationUpdate', { driverId, lat, lon });

                } catch (dbError) {
                    await client.query('ROLLBACK');
                    throw dbError;
                } finally {
                    client.release();
                }

            } catch (error) {
                console.error('⚠️ ERROR CRÍTICO GPS/GEO:', error);
                socket.emit('location_update_error', { 
                    message: 'Error de validación de sistema.' 
                });
            }
        });

        // 3. Respuesta a Solicitudes de Viaje
        socket.on('tripResponse', (data) => {
            const { tripId, driverId, response } = data;
            io.emit('driverResponse', { tripId, driverId, response });
        });

        // 4. Desconexión
        socket.on('disconnect', () => {
            const driverId = Object.keys(connectedDrivers).find(key => connectedDrivers[key] === socket.id);
            if (driverId) {
                delete connectedDrivers[driverId];
                console.log(`🛑 Conductor ${driverId} offline.`);
            }
        });
    });
};

/**
 * Envío Quirúrgico de Viajes (Usa la sala privada)
 */
exports.sendTripRequest = (driverId, tripData) => {
    // En lugar de socketId, enviamos a la ROOM del conductor
    // Esto es más seguro si el conductor cambió de red y tiene nuevo socketId
    global.io.to(`driver_${driverId}`).emit('newTripRequest', tripData);
    return true;
};
