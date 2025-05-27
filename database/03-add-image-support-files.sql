-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS PARA SOPORTE DE IMÁGENES
-- Verificando columnas existentes antes de agregar
-- =====================================================

-- 1. VERIFICAR Y AGREGAR CAMPOS DE IMAGEN A LA TABLA DE RESTAURANTES
-- Primero verificamos qué columnas ya existen
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME IN ('logo_url', 'cover_image_url', 'images_updated_at');

-- Agregar solo las columnas que no existen
SET @sql = '';

-- Verificar y agregar logo_url
SELECT COUNT(*) INTO @logo_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME = 'logo_url';

IF @logo_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN logo_url VARCHAR(500) NULL COMMENT ''URL del logo del restaurante'', ');
END IF;

-- Verificar y agregar cover_image_url
SELECT COUNT(*) INTO @cover_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME = 'cover_image_url';

IF @cover_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN cover_image_url VARCHAR(500) NULL COMMENT ''URL de la imagen de portada'', ');
END IF;

-- Verificar y agregar images_updated_at
SELECT COUNT(*) INTO @images_updated_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND COLUMN_NAME = 'images_updated_at';

IF @images_updated_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN images_updated_at TIMESTAMP NULL COMMENT ''Última actualización de imágenes'', ');
END IF;

-- Ejecutar ALTER TABLE solo si hay columnas que agregar
IF LENGTH(@sql) > 0 THEN
    SET @sql = TRIM(TRAILING ', ' FROM @sql);
    SET @sql = CONCAT('ALTER TABLE kvq_tubarresto_restaurants ', @sql);
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    SELECT 'Columnas agregadas exitosamente' as resultado;
ELSE
    SELECT 'Todas las columnas ya existen' as resultado;
END IF;

-- Agregar índices solo si no existen
SET @index_sql = '';

-- Verificar índice logo_url
SELECT COUNT(*) INTO @logo_index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND INDEX_NAME = 'idx_logo_url';

IF @logo_index_exists = 0 THEN
    SET @index_sql = CONCAT(@index_sql, 'ADD INDEX idx_logo_url (logo_url(100)), ');
END IF;

-- Verificar índice cover_image
SELECT COUNT(*) INTO @cover_index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurants' 
AND INDEX_NAME = 'idx_cover_image';

IF @cover_index_exists = 0 THEN
    SET @index_sql = CONCAT(@index_sql, 'ADD INDEX idx_cover_image (cover_image_url(100)), ');
END IF;

-- Ejecutar índices solo si hay que agregar
IF LENGTH(@index_sql) > 0 THEN
    SET @index_sql = TRIM(TRAILING ', ' FROM @index_sql);
    SET @index_sql = CONCAT('ALTER TABLE kvq_tubarresto_restaurants ', @index_sql);
    
    PREPARE stmt FROM @index_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    SELECT 'Índices agregados exitosamente' as resultado_indices;
ELSE
    SELECT 'Todos los índices ya existen' as resultado_indices;
END IF;

-- 2. CREAR TABLA PARA GALERÍA DE IMÁGENES (solo si no existe)
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

-- Agregar llave foránea solo si no existe
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_restaurant_images' 
AND CONSTRAINT_NAME = 'fk_restaurant_images_restaurant';

IF @fk_exists = 0 THEN
    ALTER TABLE kvq_tubarresto_restaurant_images
    ADD CONSTRAINT fk_restaurant_images_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES kvq_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    
    SELECT 'Llave foránea agregada a restaurant_images' as resultado_fk;
ELSE
    SELECT 'Llave foránea ya existe en restaurant_images' as resultado_fk;
END IF;

-- 3. CREAR TABLA PARA CONFIGURACIÓN DE UPLOAD (solo si no existe)
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

-- Agregar llave foránea para upload_settings solo si no existe
SET @fk_upload_exists = 0;
SELECT COUNT(*) INTO @fk_upload_exists
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'kvq_tubarresto_upload_settings' 
AND CONSTRAINT_NAME = 'fk_upload_settings_restaurant';

IF @fk_upload_exists = 0 THEN
    ALTER TABLE kvq_tubarresto_upload_settings
    ADD CONSTRAINT fk_upload_settings_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES kvq_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    
    SELECT 'Llave foránea agregada a upload_settings' as resultado_fk_upload;
ELSE
    SELECT 'Llave foránea ya existe en upload_settings' as resultado_fk_upload;
END IF;

-- 4. INSERTAR CONFIGURACIÓN POR DEFECTO PARA RESTAURANTES EXISTENTES
INSERT IGNORE INTO kvq_tubarresto_upload_settings (restaurant_id)
SELECT id FROM kvq_tubarresto_restaurants 
WHERE id NOT IN (SELECT restaurant_id FROM kvq_tubarresto_upload_settings);

-- 5. CREAR TRIGGER PARA CONFIGURACIÓN AUTOMÁTICA EN NUEVOS RESTAURANTES (solo si no existe)
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

-- 6. CREAR VISTA PARA CONSULTAS FÁCILES DE IMÁGENES (reemplazar si existe)
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

-- 7. FUNCIÓN PARA GENERAR NOMBRE DE ARCHIVO ÚNICO (reemplazar si existe)
DROP FUNCTION IF EXISTS generate_unique_filename;

DELIMITER $$

CREATE FUNCTION generate_unique_filename(restaurant_id INT, category VARCHAR(50), original_name VARCHAR(255))
RETURNS VARCHAR(255)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE file_extension VARCHAR(10);
    DECLARE base_name VARCHAR(200);
    DECLARE unique_name VARCHAR(255);
    DECLARE counter INT DEFAULT 1;
    DECLARE file_exists INT DEFAULT 1;
    
    -- Obtener extensión del archivo
    SET file_extension = SUBSTRING_INDEX(original_name, '.', -1);
    
    -- Crear nombre base
    SET base_name = CONCAT('tubarresto_', restaurant_id, '_', category, '_', UNIX_TIMESTAMP());
    
    -- Generar nombre único
    SET unique_name = CONCAT(base_name, '.', file_extension);
    
    -- Verificar si existe y agregar contador si es necesario
    WHILE file_exists > 0 DO
        SELECT COUNT(*) INTO file_exists 
        FROM kvq_tubarresto_restaurant_images 
        WHERE file_name = unique_name;
        
        IF file_exists > 0 THEN
            SET unique_name = CONCAT(base_name, '_', counter, '.', file_extension);
            SET counter = counter + 1;
        END IF;
    END WHILE;
    
    RETURN unique_name;
END$$

DELIMITER ;

-- 8. VERIFICAR LAS NUEVAS TABLAS Y VISTAS
SELECT 'Verificando tablas creadas...' as status;
SHOW TABLES LIKE '%tubarresto%';

-- 9. VERIFICAR LA ESTRUCTURA ACTUALIZADA
SELECT 'Verificando estructura de restaurants...' as status;
DESCRIBE kvq_tubarresto_restaurants;

SELECT 'Verificando estructura de restaurant_images...' as status;
DESCRIBE kvq_tubarresto_restaurant_images;

SELECT 'Verificando estructura de upload_settings...' as status;
DESCRIBE kvq_tubarresto_upload_settings;

-- 10. MOSTRAR ESTADÍSTICAS FINALES
SELECT 
    'Estadísticas finales' as status,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurants) as total_restaurants,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images) as total_images,
    (SELECT COUNT(*) FROM kvq_tubarresto_upload_settings) as total_upload_configs;

SELECT 'Script ejecutado exitosamente. Base de datos actualizada para soporte de imágenes.' as resultado_final;
