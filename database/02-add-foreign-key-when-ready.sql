-- =====================================================
-- AGREGAR LLAVE FORÁNEA A USUARIOS CUANDO SEPAS EL PREFIJO
-- =====================================================

-- PASO 1: Primero ejecuta esto para ver qué tablas tienes:
-- SHOW TABLES;

-- PASO 2: Una vez que identifiques la tabla de usuarios, 
-- reemplaza "TU_TABLA_USUARIOS" con el nombre real

-- Ejemplo si la tabla es kvq_users:
-- ALTER TABLE tubarresto_restaurants 
-- ADD CONSTRAINT fk_restaurant_user 
-- FOREIGN KEY (user_id) 
-- REFERENCES kvq_users(ID) 
-- ON DELETE CASCADE 
-- ON UPDATE CASCADE;

-- Ejemplo si la tabla es wp_users:
-- ALTER TABLE tubarresto_restaurants 
-- ADD CONSTRAINT fk_restaurant_user 
-- FOREIGN KEY (user_id) 
-- REFERENCES wp_users(ID) 
-- ON DELETE CASCADE 
-- ON UPDATE CASCADE;

-- Ejemplo si la tabla tiene otro nombre:
-- ALTER TABLE tubarresto_restaurants 
-- ADD CONSTRAINT fk_restaurant_user 
-- FOREIGN KEY (user_id) 
-- REFERENCES [NOMBRE_REAL_TABLA_USUARIOS](ID) 
-- ON DELETE CASCADE 
-- ON UPDATE CASCADE;

-- =====================================================
-- VERIFICAR LA LLAVE FORÁNEA DESPUÉS DE AGREGARLA
-- =====================================================

-- Ver todas las llaves foráneas
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE 
    REFERENCED_TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tubarresto_restaurants'
    AND REFERENCED_TABLE_NAME IS NOT NULL;
