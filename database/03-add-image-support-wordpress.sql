-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS PARA SOPORTE DE IMÁGENES
-- Usando sistema de archivos de WordPress
-- =====================================================

-- 1. AGREGAR CAMPOS DE IMAGEN A LA TABLA DE RESTAURANTES
ALTER TABLE kvq_tubarresto_restaurants 
ADD COLUMN logo_attachment_id BIGINT UNSIGNED NULL COMMENT 'ID del attachment de WordPress para el logo',
ADD COLUMN cover_attachment_id BIGINT UNSIGNED NULL COMMENT 'ID del attachment de WordPress para la portada',
ADD COLUMN images_updated_at TIMESTAMP NULL COMMENT 'Última actualización de imágenes',
ADD INDEX idx_logo_attachment (logo_attachment_id),
ADD INDEX idx_cover_attachment (cover_attachment_id);

-- 2. CREAR TABLA PARA GALERÍA DE IMÁGENES
CREATE TABLE IF NOT EXISTS kvq_tubarresto_restaurant_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Referencia al sistema de WordPress
    attachment_id BIGINT UNSIGNED NOT NULL COMMENT 'ID del attachment en wp_posts',
    
    -- Información adicional de la imagen
    title VARCHAR(255) NOT NULL COMMENT 'Título personalizado de la imagen',
    description TEXT NULL COMMENT 'Descripción personalizada de la imagen',
    alt_text VARCHAR(255) NULL COMMENT 'Texto alternativo personalizado',
    
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
    INDEX idx_attachment_id (attachment_id),
    INDEX idx_category (category),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    INDEX idx_created_at (created_at),
    
    -- Llave foránea con restaurantes
    CONSTRAINT fk_restaurant_images_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES kvq_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    -- Evitar duplicados de attachment por restaurante
    UNIQUE KEY unique_restaurant_attachment (restaurant_id, attachment_id)
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Galería de imágenes de restaurantes usando WordPress Media Library';

-- 3. CREAR TABLA PARA CONFIGURACIÓN DE UPLOAD
CREATE TABLE IF NOT EXISTS kvq_tubarresto_upload_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Configuración por restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Límites de upload
    max_file_size INT DEFAULT 5242880 COMMENT 'Tamaño máximo en bytes (5MB por defecto)',
    allowed_formats JSON DEFAULT '["image/jpeg", "image/png", "image/webp"]' COMMENT 'Formatos permitidos',
    max_images_per_category INT DEFAULT 10 COMMENT 'Máximo de imágenes por categoría',
    
    -- Configuración de calidad y tamaños
    image_quality INT DEFAULT 85 COMMENT 'Calidad de compresión (1-100)',
    generate_thumbnails BOOLEAN DEFAULT TRUE COMMENT 'Generar miniaturas automáticamente',
    thumbnail_sizes JSON DEFAULT '{"thumbnail": [150, 150], "medium": [300, 300], "large": [1024, 1024]}' COMMENT 'Tamaños de miniaturas',
    
    -- Configuración de WordPress
    wp_upload_subdir VARCHAR(100) DEFAULT 'tubarresto' COMMENT 'Subdirectorio en wp-content/uploads',
    organize_by_date BOOLEAN DEFAULT TRUE COMMENT 'Organizar por fecha como WordPress',
    
    -- Fechas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    UNIQUE KEY unique_restaurant_settings (restaurant_id),
    
    -- Llave foránea
    CONSTRAINT fk_upload_settings_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES kvq_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Configuración de upload usando WordPress Media Library';

-- 4. INSERTAR CONFIGURACIÓN POR DEFECTO PARA RESTAURANTES EXISTENTES
INSERT INTO kvq_tubarresto_upload_settings (restaurant_id)
SELECT id FROM kvq_tubarresto_restaurants 
WHERE id NOT IN (SELECT restaurant_id FROM kvq_tubarresto_upload_settings);

-- 5. CREAR TRIGGER PARA CONFIGURACIÓN AUTOMÁTICA EN NUEVOS RESTAURANTES
DELIMITER $$

CREATE TRIGGER tr_create_upload_settings_after_restaurant_insert
    AFTER INSERT ON kvq_tubarresto_restaurants
    FOR EACH ROW
BEGIN
    INSERT INTO kvq_tubarresto_upload_settings (restaurant_id)
    VALUES (NEW.id);
END$$

DELIMITER ;

-- 6. CREAR VISTA PARA CONSULTAS FÁCILES DE IMÁGENES CON DATOS DE WORDPRESS
CREATE VIEW vw_restaurant_images_with_wp_data AS
SELECT 
    ri.id,
    ri.restaurant_id,
    ri.attachment_id,
    ri.title as custom_title,
    ri.description as custom_description,
    ri.alt_text as custom_alt_text,
    ri.category,
    ri.is_primary,
    ri.sort_order,
    ri.is_active,
    ri.display_settings,
    ri.created_at,
    ri.updated_at,
    
    -- Datos del attachment de WordPress
    wp_posts.post_title as wp_title,
    wp_posts.post_content as wp_description,
    wp_posts.post_excerpt as wp_caption,
    wp_posts.post_date as wp_upload_date,
    wp_posts.guid as wp_url,
    
    -- Metadatos del attachment
    wp_postmeta_alt.meta_value as wp_alt_text,
    wp_postmeta_attached.meta_value as wp_attached_file,
    
    -- Información del restaurante
    r.name as restaurant_name,
    r.slug as restaurant_slug

FROM kvq_tubarresto_restaurant_images ri
JOIN kvq_tubarresto_restaurants r ON ri.restaurant_id = r.id
LEFT JOIN wp_posts ON ri.attachment_id = wp_posts.ID AND wp_posts.post_type = 'attachment'
LEFT JOIN wp_postmeta wp_postmeta_alt ON ri.attachment_id = wp_postmeta_alt.post_id AND wp_postmeta_alt.meta_key = '_wp_attachment_image_alt'
LEFT JOIN wp_postmeta wp_postmeta_attached ON ri.attachment_id = wp_postmeta_attached.post_id AND wp_postmeta_attached.meta_key = '_wp_attached_file'

WHERE ri.is_active = 1;

-- 7. FUNCIÓN PARA OBTENER URL COMPLETA DE IMAGEN
DELIMITER $$

CREATE FUNCTION get_restaurant_image_url(attachment_id BIGINT, size VARCHAR(50))
RETURNS VARCHAR(500)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE image_url VARCHAR(500) DEFAULT '';
    DECLARE upload_path VARCHAR(255);
    DECLARE upload_url VARCHAR(255);
    DECLARE attached_file VARCHAR(255);
    
    -- Obtener configuración de uploads de WordPress
    SELECT option_value INTO upload_path FROM wp_options WHERE option_name = 'upload_path' LIMIT 1;
    SELECT option_value INTO upload_url FROM wp_options WHERE option_name = 'upload_url_path' LIMIT 1;
    
    -- Si no hay configuración personalizada, usar la por defecto
    IF upload_url IS NULL OR upload_url = '' THEN
        SELECT CONCAT(option_value, '/wp-content/uploads') INTO upload_url 
        FROM wp_options WHERE option_name = 'siteurl' LIMIT 1;
    END IF;
    
    -- Obtener el archivo adjunto
    SELECT meta_value INTO attached_file 
    FROM wp_postmeta 
    WHERE post_id = attachment_id AND meta_key = '_wp_attached_file' 
    LIMIT 1;
    
    -- Construir URL
    IF attached_file IS NOT NULL THEN
        SET image_url = CONCAT(upload_url, '/', attached_file);
    END IF;
    
    RETURN image_url;
END$$

DELIMITER ;

-- 8. VERIFICAR LAS NUEVAS TABLAS Y VISTAS
SHOW TABLES LIKE '%tubarresto%';
SHOW CREATE VIEW vw_restaurant_images_with_wp_data;

-- 9. VERIFICAR LA ESTRUCTURA ACTUALIZADA
DESCRIBE kvq_tubarresto_restaurants;
DESCRIBE kvq_tubarresto_restaurant_images;
DESCRIBE kvq_tubarresto_upload_settings;

-- 10. CONSULTAS DE EJEMPLO PARA VERIFICAR

-- Ver restaurantes con sus imágenes y datos de WordPress
/*
SELECT 
    restaurant_name,
    category,
    custom_title,
    wp_title,
    wp_url,
    get_restaurant_image_url(attachment_id, 'medium') as image_url
FROM vw_restaurant_images_with_wp_data
ORDER BY restaurant_name, category, sort_order;
*/

-- Ver estadísticas de imágenes por restaurante
/*
SELECT 
    r.name,
    COUNT(ri.id) as total_images,
    SUM(CASE WHEN ri.category = 'logo' THEN 1 ELSE 0 END) as logos,
    SUM(CASE WHEN ri.category = 'food' THEN 1 ELSE 0 END) as food_images,
    SUM(CASE WHEN ri.category = 'interior' THEN 1 ELSE 0 END) as interior_images
FROM kvq_tubarresto_restaurants r
LEFT JOIN kvq_tubarresto_restaurant_images ri ON r.id = ri.restaurant_id AND ri.is_active = 1
GROUP BY r.id, r.name;
*/

-- Ver configuración de upload por restaurante
/*
SELECT 
    r.name,
    us.max_file_size,
    us.allowed_formats,
    us.max_images_per_category,
    us.wp_upload_subdir
FROM kvq_tubarresto_restaurants r
JOIN kvq_tubarresto_upload_settings us ON r.id = us.restaurant_id;
*/
