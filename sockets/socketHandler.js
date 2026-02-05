const { pool } = require('../config/databases'); 
const geoService = require('../services/geoValidation'); 

// Mapa de conductores conectados
const connectedDrivers = {}; 

exports.initSocketIO = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 Conexión Segura Paisanos: ${socket.id}`);

        // 1. Registro del Conductor en Sala Privada
        socket.on('driverConnect', ({ driverId }) => {
            if (driverId) {
                socket.join(`driver_${driverId}`);
                connectedDrivers[driverId] = socket.id;
                console.log(`✅ Conductor ${driverId} encriptado en sala privada.`);
            }
        });

        // 2. Procesamiento de Ubicación con Blindaje Geográfico
        socket.on('updateLocation', async (data) => {
            const { driverId, lat, lon } = data;
            if (!driverId || !lat || !lon) return;

            try {
                // Validación contra el GeoJSON/PostGIS en el servicio
                const validacion = await geoService.verSectorMapaGps(lat, lon);

                if (!validacion.enZona) {
                    console.log(`⚠️ ALERTA: Driver ${driverId} ha abandonado la Zona Autorizada.`);
                    
                    // A. Bloqueo inmediato del Frontend (Activa el mapa DARK y el Modal)
                    socket.emit('forced_logout', { 
                        reason: 'OFFSIDE',
                        mensaje: 'Estás fuera del perímetro de Paisanos.' 
                    });

                    // B. Actualización de estado en base de datos para no asignarle viajes
                    await pool.query(
                        'UPDATE "CONDUCTORES" SET "IS_ONLINE" = false, "UBICACION_LAT" = $1, "UBICACION_LON" = $2 WHERE "ID_COND" = $3', 
                        [lat, lon, driverId]
                    );
                    return; 
                }

                // SI ESTÁ EN ZONA: Actualización normal y transparente
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    await client.query(
                        'UPDATE "CONDUCTORES" SET "UBICACION_LAT" = $1, "UBICACION_LON" = $2, "IS_ONLINE" = true, "UPDATED_AT" = NOW() WHERE "ID_COND" = $3',
                        [lat, lon, driverId]
                    );

                    await client.query(
                        'INSERT INTO "HISTORIAL_GPS" ("ID_COND", "UBICACION_LAT", "UBICACION_LON", "CREATED_AT") VALUES ($1, $2, $3, NOW())',
                        [driverId, lat, lon]
                    );

                    await client.query('COMMIT');

                    // Confirmación de "Zona Segura" (Cambia el mapa a LIGHT si estaba en DARK)
                    socket.emit('locationUpdateSuccess', { 
                        zona: validacion.zona.NOMBRE || 'Zona Activa' 
                    });

                    // Broadcast para Pasajeros
                    socket.broadcast.emit('driverLocationUpdate', { driverId, lat, lon });

                } catch (dbError) {
                    await client.query('ROLLBACK');
                    throw dbError;
                } finally {
                    client.release();
                }

            } catch (error) {
                console.error('❌ Error de Blindaje:', error);
            }
        });

        socket.on('disconnect', async () => {
            const driverId = Object.keys(connectedDrivers).find(key => connectedDrivers[key] === socket.id);
            if (driverId) {
                delete connectedDrivers[driverId];
                await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [driverId]);
                console.log(`🛑 Driver ${driverId} Offline.`);
            }
        });
    });
};

exports.sendTripRequest = (driverId, tripData) => {
    global.io.to(`driver_${driverId}`).emit('newTripRequest', tripData);
    return true;
};
