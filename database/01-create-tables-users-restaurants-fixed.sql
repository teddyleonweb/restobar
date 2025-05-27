-- =====================================================
-- Tu Bar Resto - Base de datos CORREGIDO
-- Tablas: Usuarios y Restaurantes
-- Prefijo: kvq_ (en lugar de wp_)
-- Relación: Un usuario puede tener 1 o muchos restaurantes
-- =====================================================

-- PRIMERO: Verificar que las tablas de WordPress existan
-- SELECT * FROM kvq_users LIMIT 1;
-- SELECT * FROM kvq_usermeta LIMIT 1;

-- =====================================================
-- TABLA: tubarresto_restaurants
-- Descripción: Información de los restaurantes
-- Relación: Muchos restaurantes pertenecen a un usuario (kvq_users)
-- =====================================================

CREATE TABLE IF NOT EXISTS kvq_tubarresto_restaurants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con usuario de WordPress
    user_id BIGINT(20) UNSIGNED NOT NULL,
    
    -- Información básica del restaurante
    name VARCHAR(255) NOT NULL COMMENT 'Nombre del restaurante',
    slug VARCHAR(255) NOT NULL UNIQUE COMMENT 'URL amigable única',
    description TEXT COMMENT 'Descripción del restaurante',
    
    -- Información de contacto
    address TEXT COMMENT 'Dirección completa',
    city VARCHAR(100) COMMENT 'Ciudad',
    postal_code VARCHAR(20) COMMENT 'Código postal',
    country VARCHAR(100) DEFAULT 'España' COMMENT 'País',
    phone VARCHAR(20) COMMENT 'Teléfono de contacto',
    email VARCHAR(100) COMMENT 'Email de contacto',
    website VARCHAR(255) COMMENT 'Sitio web',
    
    -- Imágenes y branding
    logo_url VARCHAR(500) COMMENT 'URL del logo',
    cover_image_url VARCHAR(500) COMMENT 'URL de imagen de portada',
    
    -- Configuración regional
    currency VARCHAR(3) DEFAULT 'EUR' COMMENT 'Moneda (ISO 4217)',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid' COMMENT 'Zona horaria',
    language VARCHAR(5) DEFAULT 'es_ES' COMMENT 'Idioma',
    
    -- Estado y suscripción
    status ENUM('active', 'inactive', 'trial', 'suspended', 'cancelled') DEFAULT 'trial' COMMENT 'Estado del restaurante',
    subscription_plan VARCHAR(50) DEFAULT 'trial' COMMENT 'Plan de suscripción',
    
    -- Fechas de prueba
    trial_start_date DATETIME COMMENT 'Inicio del periodo de prueba',
    trial_end_date DATETIME COMMENT 'Fin del periodo de prueba',
    
    -- Configuración de negocio
    tax_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Tasa de impuestos (%)',
    service_fee DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Tarifa de servicio (%)',
    
    -- Horarios (JSON para flexibilidad)
    business_hours JSON COMMENT 'Horarios de apertura por día',
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Restaurantes registrados en la plataforma';

-- =====================================================
-- CREAR ÍNDICES DESPUÉS DE LA TABLA
-- =====================================================

-- Índices básicos
CREATE INDEX idx_user_id ON kvq_tubarresto_restaurants(user_id);
CREATE INDEX idx_slug ON kvq_tubarresto_restaurants(slug);
CREATE INDEX idx_status ON kvq_tubarresto_restaurants(status);
CREATE INDEX idx_city ON kvq_tubarresto_restaurants(city);
CREATE INDEX idx_trial_dates ON kvq_tubarresto_restaurants(trial_start_date, trial_end_date);
CREATE INDEX idx_created_at ON kvq_tubarresto_restaurants(created_at);

-- Índices compuestos
CREATE INDEX idx_user_status ON kvq_tubarresto_restaurants(user_id, status);
CREATE INDEX idx_status_trial ON kvq_tubarresto_restaurants(status, trial_end_date);

-- =====================================================
-- AGREGAR LLAVE FORÁNEA DESPUÉS (para evitar errores)
-- =====================================================

-- Verificar que la tabla kvq_users existe y tiene la columna ID
-- DESCRIBE kvq_users;

-- Agregar la llave foránea
ALTER TABLE kvq_tubarresto_restaurants 
ADD CONSTRAINT fk_restaurant_user 
FOREIGN KEY (user_id) 
REFERENCES kvq_users(ID) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- =====================================================
-- TABLA: tubarresto_restaurant_meta
-- Descripción: Metadatos adicionales para restaurantes
-- Relación: Muchos metadatos pertenecen a un restaurante
-- =====================================================

CREATE TABLE IF NOT EXISTS kvq_tubarresto_restaurant_meta (
    meta_id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Clave y valor del metadato
    meta_key VARCHAR(255) NOT NULL COMMENT 'Clave del metadato',
    meta_value LONGTEXT COMMENT 'Valor del metadato',
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Metadatos adicionales para restaurantes';

-- =====================================================
-- CREAR ÍNDICES PARA LA TABLA META
-- =====================================================

CREATE INDEX idx_restaurant_id ON kvq_tubarresto_restaurant_meta(restaurant_id);
CREATE INDEX idx_meta_key ON kvq_tubarresto_restaurant_meta(meta_key);
CREATE INDEX idx_restaurant_meta_key ON kvq_tubarresto_restaurant_meta(restaurant_id, meta_key);

-- =====================================================
-- AGREGAR LLAVE FORÁNEA PARA META
-- =====================================================

ALTER TABLE kvq_tubarresto_restaurant_meta 
ADD CONSTRAINT fk_restaurant_meta_restaurant 
FOREIGN KEY (restaurant_id) 
REFERENCES kvq_tubarresto_restaurants(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- =====================================================
-- VERIFICAR QUE TODO ESTÉ CORRECTO
-- =====================================================

-- Verificar que las tablas se crearon
SHOW TABLES LIKE '%tubarresto%';

-- Verificar la estructura de las tablas
DESCRIBE kvq_tubarresto_restaurants;
DESCRIBE kvq_tubarresto_restaurant_meta;

-- Verificar las llaves foráneas
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
    AND TABLE_NAME LIKE '%tubarresto%'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- =====================================================
-- INSERTAR DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

-- Verificar que existe al menos un usuario
-- SELECT ID, user_login, user_email FROM kvq_users LIMIT 5;

-- Ejemplo de inserción de restaurante (descomenta para usar)
/*
INSERT INTO kvq_tubarresto_restaurants (
    user_id,
    name,
    slug,
    description,
    address,
    city,
    phone,
    email,
    currency,
    status,
    trial_start_date,
    trial_end_date,
    business_hours
) VALUES (
    1, -- Cambiar por un ID de usuario válido
    'Restaurante de Prueba',
    'restaurante-de-prueba',
    'Un restaurante de ejemplo para probar el sistema',
    'Calle Principal 123',
    'Madrid',
    '+34 123 456 789',
    'contacto@restauranteprueba.com',
    'EUR',
    'trial',
    NOW(),
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    '{"monday": {"open": "09:00", "close": "22:00", "closed": false}, "tuesday": {"open": "09:00", "close": "22:00", "closed": false}, "wednesday": {"open": "09:00", "close": "22:00", "closed": false}, "thursday": {"open": "09:00", "close": "22:00", "closed": false}, "friday": {"open": "09:00", "close": "23:00", "closed": false}, "saturday": {"open": "09:00", "close": "23:00", "closed": false}, "sunday": {"open": "10:00", "close": "22:00", "closed": false}}'
);
*/

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN
-- =====================================================

-- Contar usuarios existentes
SELECT COUNT(*) as total_users FROM kvq_users;

-- Contar restaurantes creados
SELECT COUNT(*) as total_restaurants FROM kvq_tubarresto_restaurants;

-- Ver restaurantes con información del usuario
/*
SELECT 
    r.id,
    r.name as restaurant_name,
    r.slug,
    r.status,
    u.user_login,
    u.user_email,
    r.created_at
FROM kvq_tubarresto_restaurants r
JOIN kvq_users u ON r.user_id = u.ID
ORDER BY r.created_at DESC;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
CAMBIOS REALIZADOS:
1. Cambiado prefijo de wp_ a kvq_
2. Separadas las llaves foráneas de la creación de tablas
3. Agregados los índices después de crear las tablas
4. Incluidas consultas de verificación

PARA SOLUCIONAR ERRORES DE LLAVES FORÁNEAS:
1. Verificar que kvq_users existe: SHOW TABLES LIKE 'kvq_users';
2. Verificar estructura: DESCRIBE kvq_users;
3. Verificar que la columna ID existe y es PRIMARY KEY
4. Verificar que no hay datos inconsistentes

SI SIGUEN LOS ERRORES:
- Ejecutar cada comando por separado
- Verificar que no hay datos existentes que violen las restricciones
- Comprobar que el motor de almacenamiento sea InnoDB en ambas tablas
*/
