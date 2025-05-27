-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS PARA SOPORTE DE IMÁGENES
-- Script simplificado que funciona en cualquier versión de MySQL
-- =====================================================

-- 1. VERIFICAR QUÉ COLUMNAS YA EXISTEN
SELECT 
    'Verificando columnas existentes en kvq_tubarresto_restaurants...' as status;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME IN ('logo_url', 'cover_image_url', 'images_updated_at');

-- 2. AGREGAR COLUMNAS UNA POR UNA (ignorar errores si ya existen)

-- Agregar logo_url
SET @sql = 'ALTER TABLE kvq_tubarresto_restaurants ADD COLUMN logo_url VARCHAR(500) NULL COMMENT "URL del logo del restaurante"';
SET @sql_safe = CONCAT('SET @dummy = 0'); -- Fallback seguro

-- Intentar agregar logo_url
SELECT COUNT(*) INTO @logo_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME = 'logo_url';

-- Si no existe, preparar la consulta
SELECT IF(@logo_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar cover_image_url
SET @sql = 'ALTER TABLE kvq_tubarresto_restaurants ADD COLUMN cover_image_url VARCHAR(500) NULL COMMENT "URL de la imagen de portada"';

SELECT COUNT(*) INTO @cover_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME = 'cover_image_url';

SELECT IF(@cover_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar images_updated_at
SET @sql = 'ALTER TABLE kvq_tubarresto_restaurants ADD COLUMN images_updated_at TIMESTAMP NULL COMMENT "Última actualización de imágenes"';

SELECT COUNT(*) INTO @images_updated_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME = 'images_updated_at';

SELECT IF(@images_updated_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. AGREGAR ÍNDICES (ignorar errores si ya existen)

-- Índice para logo_url
SET @sql = 'ALTER TABLE kvq_tubarresto_restaurants ADD INDEX idx_logo_url (logo_url(100))';

SELECT COUNT(*) INTO @logo_index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND INDEX_NAME = 'idx_logo_url';

SELECT IF(@logo_index_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para cover_image_url
SET @sql = 'ALTER TABLE kvq_tubarresto_restaurants ADD INDEX idx_cover_image (cover_image_url(100))';

SELECT COUNT(*) INTO @cover_index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND INDEX_NAME = 'idx_cover_image';

SELECT IF(@cover_index_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. CREAR TABLA PARA GALERÍA DE IMÁGENES
CREATE TABLE IF NOT EXISTS kvq_tubarresto_restaurant_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Información del archivo
    file_name VARCHAR(255) NOT NULL COMMENT 'Nombre del archivo en el servidor',
    original_name VARCHAR(255) NOT NULL COMMENT 'Nombre original del archivo subido',
    file_path VARCHAR(500) NOT NULL COMMENT 'Ruta completa del archivo en el servidor',
    file_url VARCHAR(500) NOT NULL COMMENT 'URL pública para acceder al archivo',
    
    -- Información del archivo
    file_size INT UNSIGNED NOT NULL COMMENT 'Tamaño del archivo en bytes',
    mime_type VARCHAR(100) NOT NULL COMMENT 'Tipo MIME del archivo',
    width INT UNSIGNED NULL COMMENT 'Ancho de la imagen en píxeles',
    height INT UNSIGNED NULL COMMENT 'Alto de la imagen en píxeles',
    
    -- Información adicional de la imagen
    title VARCHAR(255) NOT NULL COMMENT 'Título de la imagen',
    description TEXT NULL COMMENT 'Descripción de la imagen',
    alt_text VARCHAR(255) NULL COMMENT 'Texto alternativo',
    
    -- Categorización específica del restaurante
    category ENUM('logo', 'cover', 'interior', 'food', 'menu', 'staff', 'events', 'other') DEFAULT 'other' COMMENT 'Categoría de la imagen',
    is_primary BOOLEAN DEFAULT FALSE COMMENT 'Si es la imagen principal de su categoría',
    
    -- Orden y estado
    sort_order INT DEFAULT 0 COMMENT 'Orden de visualización',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Si la imagen está activa',
    
    -- Metadatos adicionales
    display_settings JSON NULL COMMENT 'Configuraciones de visualización específicas',
    
    -- Fechas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_restaurant_id (restaurant_id),
    INDEX idx_file_name (file_name),
    INDEX idx_category (category),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    INDEX idx_created_at (created_at),
    INDEX idx_file_url (file_url(100)),
    
    -- Evitar duplicados de archivo por restaurante
    UNIQUE KEY unique_restaurant_file (restaurant_id, file_name)
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Galería de imágenes de restaurantes guardadas como archivos';

-- 5. CREAR TABLA PARA CONFIGURACIÓN DE UPLOAD
CREATE TABLE IF NOT EXISTS kvq_tubarresto_upload_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Configuración por restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Límites de upload
    max_file_size INT DEFAULT 5242880 COMMENT 'Tamaño máximo en bytes (5MB por defecto)',
    allowed_formats JSON DEFAULT '["image/jpeg", "image/png", "image/webp", "image/gif"]' COMMENT 'Formatos permitidos',
    max_images_per_category INT DEFAULT 10 COMMENT 'Máximo de imágenes por categoría',
    
    -- Configuración de calidad y tamaños
    image_quality INT DEFAULT 85 COMMENT 'Calidad de compresión (1-100)',
    generate_thumbnails BOOLEAN DEFAULT TRUE COMMENT 'Generar miniaturas automáticamente',
    thumbnail_sizes JSON DEFAULT '{"thumbnail": [150, 150], "medium": [300, 300], "large": [800, 800]}' COMMENT 'Tamaños de miniaturas',
    
    -- Configuración de directorios
    upload_subdir VARCHAR(100) DEFAULT 'tubarresto' COMMENT 'Subdirectorio en wp-content/uploads',
    organize_by_date BOOLEAN DEFAULT TRUE COMMENT 'Organizar por fecha',
    organize_by_restaurant BOOLEAN DEFAULT TRUE COMMENT 'Organizar por restaurante',
    
    -- Fechas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    UNIQUE KEY unique_restaurant_settings (restaurant_id)
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Configuración de upload de archivos';

-- 6. AGREGAR LLAVES FORÁNEAS (solo si las tablas no las tienen)

-- Para restaurant_images
SET @sql = 'ALTER TABLE kvq_tubarresto_restaurant_images ADD CONSTRAINT fk_restaurant_images_restaurant FOREIGN KEY (restaurant_id) REFERENCES kvq_tubarresto_restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE';

SELECT COUNT(*) INTO @fk_exists
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurant_images' 
AND CONSTRAINT_NAME = 'fk_restaurant_images_restaurant';

SELECT IF(@fk_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Para upload_settings
SET @sql = 'ALTER TABLE kvq_tubarresto_upload_settings ADD CONSTRAINT fk_upload_settings_restaurant FOREIGN KEY (restaurant_id) REFERENCES kvq_tubarresto_restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE';

SELECT COUNT(*) INTO @fk_upload_exists
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_upload_settings' 
AND CONSTRAINT_NAME = 'fk_upload_settings_restaurant';

SELECT IF(@fk_upload_exists = 0, @sql, @sql_safe) INTO @final_sql;
PREPARE stmt FROM @final_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. INSERTAR CONFIGURACIÓN POR DEFECTO PARA RESTAURANTES EXISTENTES
INSERT IGNORE INTO kvq_tubarresto_upload_settings (restaurant_id)
SELECT id FROM kvq_tubarresto_restaurants 
WHERE id NOT IN (SELECT restaurant_id FROM kvq_tubarresto_upload_settings);

-- 8. CREAR TRIGGER PARA CONFIGURACIÓN AUTOMÁTICA EN NUEVOS RESTAURANTES
DROP TRIGGER IF EXISTS tr_create_upload_settings_after_restaurant_insert;

DELIMITER $$

CREATE TRIGGER tr_create_upload_settings_after_restaurant_insert
    AFTER INSERT ON kvq_tubarresto_restaurants
    FOR EACH ROW
BEGIN
    INSERT IGNORE INTO kvq_tubarresto_upload_settings (restaurant_id)
    VALUES (NEW.id);
END$$

DELIMITER ;

-- 9. CREAR VISTA PARA CONSULTAS FÁCILES DE IMÁGENES
DROP VIEW IF EXISTS vw_restaurant_images_complete;

CREATE VIEW vw_restaurant_images_complete AS
SELECT 
    ri.id,
    ri.restaurant_id,
    ri.file_name,
    ri.original_name,
    ri.file_path,
    ri.file_url,
    ri.file_size,
    ri.mime_type,
    ri.width,
    ri.height,
    ri.title,
    ri.description,
    ri.alt_text,
    ri.category,
    ri.is_primary,
    ri.sort_order,
    ri.is_active,
    ri.display_settings,
    ri.created_at,
    ri.updated_at,
    
    -- Información del restaurante
    r.name as restaurant_name,
    r.slug as restaurant_slug,
    r.user_id,
    
    -- Configuración de upload
    us.thumbnail_sizes,
    us.image_quality

FROM kvq_tubarresto_restaurant_images ri
JOIN kvq_tubarresto_restaurants r ON ri.restaurant_id = r.id
LEFT JOIN kvq_tubarresto_upload_settings us ON ri.restaurant_id = us.restaurant_id

WHERE ri.is_active = 1
ORDER BY ri.restaurant_id, ri.category, ri.is_primary DESC, ri.sort_order ASC;

-- 10. VERIFICAR RESULTADOS FINALES
SELECT 'VERIFICACIÓN FINAL - Columnas en kvq_tubarresto_restaurants:' as status;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
ORDER BY ORDINAL_POSITION;

SELECT 'VERIFICACIÓN FINAL - Tablas creadas:' as status;

SHOW TABLES LIKE '%tubarresto%';

SELECT 'VERIFICACIÓN FINAL - Estadísticas:' as status;

SELECT 
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurants) as total_restaurants,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images) as total_images,
    (SELECT COUNT(*) FROM kvq_tubarresto_upload_settings) as total_upload_configs;

SELECT '✅ Script ejecutado exitosamente. Base de datos actualizada para soporte de imágenes.' as resultado_final;
