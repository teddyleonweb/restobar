-- =====================================================
-- VERIFICACIÓN DE BASE DE DATOS
-- Paso 1: Identificar las tablas existentes
-- =====================================================

-- Ver todas las tablas en la base de datos
SHOW TABLES;

-- Ver específicamente tablas que podrían ser de usuarios
SHOW TABLES LIKE '%users%';

-- Ver tablas que podrían ser de WordPress/CMS
SHOW TABLES LIKE '%user%';
SHOW TABLES LIKE '%meta%';
SHOW TABLES LIKE '%posts%';
SHOW TABLES LIKE '%options%';

-- Ver todas las tablas con diferentes prefijos comunes
SHOW TABLES LIKE 'wp_%';
SHOW TABLES LIKE 'kvq_%';
SHOW TABLES LIKE '%_users';

-- =====================================================
-- Una vez identifiques el prefijo correcto, 
-- ejecuta el comando correspondiente:
-- =====================================================

-- Ejemplo: Si el prefijo es diferente, reemplaza XXX con el prefijo real
-- DESCRIBE XXX_users;

-- =====================================================
-- VERIFICAR INFORMACIÓN DEL SCHEMA
-- =====================================================

-- Ver información de la base de datos actual
SELECT DATABASE() as current_database;

-- Ver todas las tablas con información detallada
SELECT 
    TABLE_NAME,
    TABLE_TYPE,
    ENGINE,
    TABLE_ROWS,
    CREATE_TIME
FROM 
    INFORMATION_SCHEMA.TABLES 
WHERE 
    TABLE_SCHEMA = DATABASE()
ORDER BY 
    TABLE_NAME;
