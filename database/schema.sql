-- 1. Habilitar la extensión espacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Crear la tabla de zonas de servicio con nomenclatura estandarizada
CREATE TABLE IF NOT EXISTS "ZONAS_SERVICIO" (
    "ID_ZONAS" SERIAL PRIMARY KEY,
    "ID_PERSO" INT, -- Relación con el administrador que creó la zona
    "NOMBRE" VARCHAR(100) NOT NULL,
    "NIVEL" INT DEFAULT 1, -- 1:Ciudad, 2:Barrio, 3:Específico
    "GEOMETRIA" GEOMETRY(Polygon, 4326), 
    "ACTIVO" BOOLEAN DEFAULT TRUE,
    "MOTIVO" VARCHAR(200)
);

-- 3. Crear el índice GIST (Vital para que la búsqueda sea instantánea)
CREATE INDEX IF NOT EXISTS "IDX_ZONAS_GEOMETRIA" ON "ZONAS_SERVICIO" USING GIST ("GEOMETRIA");
