-- =====================================================
-- Tu Bar Resto - VERSIÓN GENÉRICA
-- SIN LLAVES FORÁNEAS INICIALMENTE
-- =====================================================

-- PASO 1: Crear tabla de restaurantes SIN llave foránea
CREATE TABLE IF NOT EXISTS tubarresto_restaurants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con usuario (SIN FOREIGN KEY por ahora)
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
    
    -- Horarios (como TEXT por compatibilidad)
    business_hours TEXT COMMENT 'Horarios de apertura por día (JSON)',
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Restaurantes registrados en la plataforma';

-- PASO 2: Crear índices básicos
CREATE INDEX idx_user_id ON tubarresto_restaurants(user_id);
CREATE INDEX idx_slug ON tubarresto_restaurants(slug);
CREATE INDEX idx_status ON tubarresto_restaurants(status);
CREATE INDEX idx_city ON tubarresto_restaurants(city);
CREATE INDEX idx_created_at ON tubarresto_restaurants(created_at);

-- PASO 3: Crear tabla de metadatos
CREATE TABLE IF NOT EXISTS tubarresto_restaurant_meta (
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

-- PASO 4: Crear índices para metadatos
CREATE INDEX idx_restaurant_id ON tubarresto_restaurant_meta(restaurant_id);
CREATE INDEX idx_meta_key ON tubarresto_restaurant_meta(meta_key);
CREATE INDEX idx_restaurant_meta_key ON tubarresto_restaurant_meta(restaurant_id, meta_key);

-- PASO 5: Agregar llave foránea entre nuestras tablas (esto debería funcionar)
ALTER TABLE tubarresto_restaurant_meta 
ADD CONSTRAINT fk_restaurant_meta_restaurant 
FOREIGN KEY (restaurant_id) 
REFERENCES tubarresto_restaurants(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- =====================================================
-- VERIFICACIONES
-- =====================================================

-- Verificar que las tablas se crearon
SHOW TABLES LIKE '%tubarresto%';

-- Ver estructura de las tablas
DESCRIBE tubarresto_restaurants;
DESCRIBE tubarresto_restaurant_meta;

-- Verificar las llaves foráneas creadas
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
-- INSERTAR DATOS DE PRUEBA
-- =====================================================

-- Insertar un restaurante de prueba (ajusta el user_id según tu sistema)
INSERT INTO tubarresto_restaurants (
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
    1, -- Cambia este ID por uno que exista en tu sistema
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

-- Insertar algunos metadatos de ejemplo
INSERT INTO tubarresto_restaurant_meta (restaurant_id, meta_key, meta_value) VALUES
(1, 'max_tables', '20'),
(1, 'accepts_reservations', 'true'),
(1, 'delivery_available', 'false'),
(1, 'payment_methods', '["cash", "card", "digital"]');

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN FINAL
-- =====================================================

-- Ver los restaurantes creados
SELECT * FROM tubarresto_restaurants;

-- Ver los metadatos
SELECT * FROM tubarresto_restaurant_meta;

-- Ver restaurantes con sus metadatos
SELECT 
    r.id,
    r.name,
    r.slug,
    r.status,
    rm.meta_key,
    rm.meta_value
FROM tubarresto_restaurants r
LEFT JOIN tubarresto_restaurant_meta rm ON r.id = rm.restaurant_id
ORDER BY r.id, rm.meta_key;
