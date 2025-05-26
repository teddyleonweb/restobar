-- =====================================================
-- Tu Bar Resto - Base de datos
-- Tablas: Usuarios y Restaurantes
-- Relación: Un usuario puede tener 1 o muchos restaurantes
-- =====================================================

-- Verificar que WordPress esté instalado
-- Las siguientes tablas deben existir: wp_users, wp_usermeta

-- =====================================================
-- TABLA: tubarresto_restaurants
-- Descripción: Información de los restaurantes
-- Relación: Muchos restaurantes pertenecen a un usuario (wp_users)
-- =====================================================

CREATE TABLE IF NOT EXISTS wp_tubarresto_restaurants (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para optimización
    INDEX idx_user_id (user_id),
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_city (city),
    INDEX idx_trial_dates (trial_start_date, trial_end_date),
    INDEX idx_created_at (created_at),
    
    -- Llave foránea con WordPress
    CONSTRAINT fk_restaurant_user 
        FOREIGN KEY (user_id) 
        REFERENCES wp_users(ID) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE

) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Restaurantes registrados en la plataforma';

-- =====================================================
-- TABLA: tubarresto_restaurant_meta
-- Descripción: Metadatos adicionales para restaurantes
-- Relación: Muchos metadatos pertenecen a un restaurante
-- =====================================================

CREATE TABLE IF NOT EXISTS wp_tubarresto_restaurant_meta (
    meta_id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Clave y valor del metadato
    meta_key VARCHAR(255) NOT NULL COMMENT 'Clave del metadato',
    meta_value LONGTEXT COMMENT 'Valor del metadato',
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_restaurant_id (restaurant_id),
    INDEX idx_meta_key (meta_key),
    INDEX idx_restaurant_meta_key (restaurant_id, meta_key),
    
    -- Llave foránea
    CONSTRAINT fk_restaurant_meta_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES wp_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE

) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Metadatos adicionales para restaurantes';

-- =====================================================
-- INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar configuraciones por defecto para nuevos restaurantes
-- Estas se aplicarán cuando se cree un restaurante

-- Ejemplo de horarios de negocio por defecto (JSON)
-- {
--   "monday": {"open": "09:00", "close": "22:00", "closed": false},
--   "tuesday": {"open": "09:00", "close": "22:00", "closed": false},
--   "wednesday": {"open": "09:00", "close": "22:00", "closed": false},
--   "thursday": {"open": "09:00", "close": "22:00", "closed": false},
--   "friday": {"open": "09:00", "close": "23:00", "closed": false},
--   "saturday": {"open": "09:00", "close": "23:00", "closed": false},
--   "sunday": {"open": "10:00", "close": "22:00", "closed": false}
-- }

-- =====================================================
-- VERIFICAR INTEGRIDAD DE LAS TABLAS
-- =====================================================

-- Verificar que las llaves foráneas estén correctamente configuradas
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
-- CONSULTAS DE EJEMPLO PARA VERIFICAR RELACIONES
-- =====================================================

-- Obtener todos los restaurantes de un usuario
-- SELECT r.*, u.display_name as owner_name 
-- FROM wp_tubarresto_restaurants r
-- JOIN wp_users u ON r.user_id = u.ID
-- WHERE r.user_id = 1;

-- Obtener usuario propietario de un restaurante
-- SELECT u.*, r.name as restaurant_name
-- FROM wp_users u
-- JOIN wp_tubarresto_restaurants r ON u.ID = r.user_id
-- WHERE r.id = 1;

-- Contar restaurantes por usuario
-- SELECT u.display_name, COUNT(r.id) as total_restaurants
-- FROM wp_users u
-- LEFT JOIN wp_tubarresto_restaurants r ON u.ID = r.user_id
-- GROUP BY u.ID, u.display_name;

-- =====================================================
-- TRIGGERS PARA AUTOMATIZACIÓN (OPCIONAL)
-- =====================================================

-- Trigger para generar slug automáticamente si no se proporciona
DELIMITER $$

CREATE TRIGGER tr_restaurant_slug_before_insert
    BEFORE INSERT ON wp_tubarresto_restaurants
    FOR EACH ROW
BEGIN
    -- Si no se proporciona slug, generarlo desde el nombre
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        SET NEW.slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            NEW.name, ' ', '-'), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'));
        SET NEW.slug = REPLACE(NEW.slug, 'ú', 'u');
        
        -- Asegurar que el slug sea único
        WHILE (SELECT COUNT(*) FROM wp_tubarresto_restaurants WHERE slug = NEW.slug) > 0 DO
            SET NEW.slug = CONCAT(NEW.slug, '-', FLOOR(RAND() * 1000));
        END WHILE;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX idx_user_status ON wp_tubarresto_restaurants(user_id, status);
CREATE INDEX idx_status_trial ON wp_tubarresto_restaurants(status, trial_end_date);

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

/*
ESTRUCTURA DE RELACIONES:

wp_users (WordPress)
    |
    └── wp_tubarresto_restaurants (1:N)
            |
            └── wp_tubarresto_restaurant_meta (1:N)

REGLAS DE NEGOCIO:
- Un usuario puede tener múltiples restaurantes
- Un restaurante pertenece a un solo usuario
- Al eliminar un usuario, se eliminan todos sus restaurantes (CASCADE)
- Al eliminar un restaurante, se eliminan todos sus metadatos (CASCADE)
- El slug debe ser único en toda la plataforma
- El periodo de prueba es de 30 días por defecto
- El estado por defecto es 'trial'

CAMPOS IMPORTANTES:
- user_id: Relación con wp_users.ID
- slug: URL amigable única para el restaurante
- status: Estado actual del restaurante
- trial_start_date/trial_end_date: Control del periodo de prueba
- business_hours: Horarios en formato JSON para flexibilidad
*/
