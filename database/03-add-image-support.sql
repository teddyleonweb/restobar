-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS PARA SOPORTE DE IMÁGENES
-- Agregar campos de imagen a restaurantes y crear tabla de galería
-- =====================================================

-- 1. AGREGAR CAMPOS DE IMAGEN A LA TABLA DE RESTAURANTES
ALTER TABLE kvq_tubarresto_restaurants 
ADD COLUMN logo_url VARCHAR(500) NULL COMMENT 'URL del logo del restaurante',
ADD COLUMN cover_image_url VARCHAR(500) NULL COMMENT 'URL de la imagen de portada',
ADD COLUMN images_updated_at TIMESTAMP NULL COMMENT 'Última actualización de imágenes';

-- 2. CREAR TABLA PARA GALERÍA DE IMÁGENES
CREATE TABLE IF NOT EXISTS kvq_tubarresto_restaurant_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Información de la imagen
    title VARCHAR(255) NOT NULL COMMENT 'Título de la imagen',
    description TEXT NULL COMMENT 'Descripción de la imagen',
    url VARCHAR(500) NOT NULL COMMENT 'URL de la imagen',
    
    -- Categorización
    category ENUM('logo', 'cover', 'interior', 'food', 'menu', 'other') DEFAULT 'other' COMMENT 'Categoría de la imagen',
    is_primary BOOLEAN DEFAULT FALSE COMMENT 'Si es la imagen principal de su categoría',
    
    -- Metadatos de archivo
    file_name VARCHAR(255) NULL COMMENT 'Nombre original del archivo',
    file_size INT NULL COMMENT 'Tamaño del archivo en bytes',
    mime_type VARCHAR(100) NULL COMMENT 'Tipo MIME del archivo',
    width INT NULL COMMENT 'Ancho de la imagen en píxeles',
    height INT NULL COMMENT 'Alto de la imagen en píxeles',
    
    -- Orden y estado
    sort_order INT DEFAULT 0 COMMENT 'Orden de visualización',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Si la imagen está activa',
    
    -- Fechas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_restaurant_id (restaurant_id),
    INDEX idx_category (category),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    INDEX idx_created_at (created_at),
    
    -- Llave foránea
    CONSTRAINT fk_restaurant_images_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES kvq_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Galería de imágenes de restaurantes';

-- 3. CREAR TABLA PARA CONFIGURACIÓN DE UPLOAD
CREATE TABLE IF NOT EXISTS kvq_tubarresto_upload_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Configuración por restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Límites de upload
    max_file_size INT DEFAULT 5242880 COMMENT 'Tamaño máximo en bytes (5MB por defecto)',
    allowed_formats JSON DEFAULT '["image/jpeg", "image/png", "image/webp"]' COMMENT 'Formatos permitidos',
    max_images_per_category INT DEFAULT 10 COMMENT 'Máximo de imágenes por categoría',
    
    -- Configuración de calidad
    image_quality INT DEFAULT 85 COMMENT 'Calidad de compresión (1-100)',
    auto_resize BOOLEAN DEFAULT TRUE COMMENT 'Redimensionar automáticamente',
    max_width INT DEFAULT 1920 COMMENT 'Ancho máximo en píxeles',
    max_height INT DEFAULT 1080 COMMENT 'Alto máximo en píxeles',
    
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
  COMMENT='Configuración de upload por restaurante';

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

-- 6. VERIFICAR LAS NUEVAS TABLAS
SHOW TABLES LIKE '%tubarresto%';

-- 7. VERIFICAR LA ESTRUCTURA ACTUALIZADA
DESCRIBE kvq_tubarresto_restaurants;
DESCRIBE kvq_tubarresto_restaurant_images;
DESCRIBE kvq_tubarresto_upload_settings;

-- 8. CONSULTAS DE EJEMPLO PARA VERIFICAR

-- Ver restaurantes con sus imágenes
/*
SELECT 
    r.id,
    r.name,
    r.logo_url,
    r.cover_image_url,
    COUNT(ri.id) as total_images
FROM kvq_tubarresto_restaurants r
LEFT JOIN kvq_tubarresto_restaurant_images ri ON r.id = ri.restaurant_id
GROUP BY r.id, r.name, r.logo_url, r.cover_image_url;
*/

-- Ver imágenes por categoría
/*
SELECT 
    category,
    COUNT(*) as total_images,
    SUM(CASE WHEN is_primary = 1 THEN 1 ELSE 0 END) as primary_images
FROM kvq_tubarresto_restaurant_images 
GROUP BY category;
*/

-- Ver configuración de upload
/*
SELECT 
    r.name,
    us.max_file_size,
    us.allowed_formats,
    us.max_images_per_category
FROM kvq_tubarresto_restaurants r
JOIN kvq_tubarresto_upload_settings us ON r.id = us.restaurant_id;
*/
