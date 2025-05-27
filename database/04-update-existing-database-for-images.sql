-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS EXISTENTE PARA SOPORTE DE IMÁGENES
-- Aplicar sobre la base de datos actual de TuBarResto
-- =====================================================

-- 1. AGREGAR CAMPOS DE IMAGEN A LA TABLA EXISTENTE DE RESTAURANTES
ALTER TABLE kvq_tubarresto_restaurants 
ADD COLUMN logo_url VARCHAR(500) NULL COMMENT 'URL del logo del restaurante' AFTER email,
ADD COLUMN cover_image_url VARCHAR(500) NULL COMMENT 'URL de la imagen de portada' AFTER logo_url,
ADD COLUMN images_updated_at TIMESTAMP NULL COMMENT 'Última actualización de imágenes' AFTER cover_image_url;

-- Agregar índices para las nuevas columnas
ALTER TABLE kvq_tubarresto_restaurants 
ADD INDEX idx_logo_url (logo_url(100)),
ADD INDEX idx_cover_image (cover_image_url(100));

-- 2. CREAR TABLA PARA GALERÍA DE IMÁGENES DE RESTAURANTES
CREATE TABLE kvq_tubarresto_restaurant_images (
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
    display_settings TEXT NULL COMMENT 'Configuraciones de visualización en formato JSON',
    
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
    UNIQUE KEY unique_restaurant_file (restaurant_id, file_name),
    
    -- Llave foránea con restaurantes existentes
    CONSTRAINT fk_restaurant_images_restaurant 
        FOREIGN KEY (restaurant_id) 
        REFERENCES kvq_tubarresto_restaurants(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Galería de imágenes de restaurantes guardadas como archivos';

-- 3. CREAR TABLA PARA CONFIGURACIÓN DE UPLOAD
CREATE TABLE kvq_tubarresto_upload_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Configuración por restaurante
    restaurant_id INT UNSIGNED NOT NULL,
    
    -- Límites de upload
    max_file_size INT DEFAULT 5242880 COMMENT 'Tamaño máximo en bytes (5MB por defecto)',
    allowed_formats TEXT DEFAULT 'image/jpeg,image/png,image/webp,image/gif' COMMENT 'Formatos permitidos separados por comas',
    max_images_per_category INT DEFAULT 10 COMMENT 'Máximo de imágenes por categoría',
    
    -- Configuración de calidad y tamaños
    image_quality INT DEFAULT 85 COMMENT 'Calidad de compresión (1-100)',
    generate_thumbnails BOOLEAN DEFAULT TRUE COMMENT 'Generar miniaturas automáticamente',
    thumbnail_sizes TEXT DEFAULT 'thumbnail:150x150,medium:300x300,large:800x800' COMMENT 'Tamaños de miniaturas',
    
    -- Configuración de directorios
    upload_subdir VARCHAR(100) DEFAULT 'tubarresto' COMMENT 'Subdirectorio en wp-content/uploads',
    organize_by_date BOOLEAN DEFAULT TRUE COMMENT 'Organizar por fecha',
    organize_by_restaurant BOOLEAN DEFAULT TRUE COMMENT 'Organizar por restaurante',
    
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
  COMMENT='Configuración de upload de archivos';

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

-- 6. CREAR VISTA PARA CONSULTAS FÁCILES DE IMÁGENES
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

-- 7. FUNCIÓN PARA OBTENER FORMATOS PERMITIDOS
DELIMITER $$

CREATE FUNCTION get_allowed_formats(restaurant_id INT)
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE formats TEXT DEFAULT 'image/jpeg,image/png,image/webp,image/gif';
    
    SELECT allowed_formats INTO formats
    FROM kvq_tubarresto_upload_settings 
    WHERE kvq_tubarresto_upload_settings.restaurant_id = restaurant_id
    LIMIT 1;
    
    RETURN IFNULL(formats, 'image/jpeg,image/png,image/webp,image/gif');
END$$

DELIMITER ;

-- 8. FUNCIÓN PARA OBTENER TAMAÑOS DE THUMBNAILS
DELIMITER $$

CREATE FUNCTION get_thumbnail_sizes(restaurant_id INT)
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE sizes TEXT DEFAULT 'thumbnail:150x150,medium:300x300,large:800x800';
    
    SELECT thumbnail_sizes INTO sizes
    FROM kvq_tubarresto_upload_settings 
    WHERE kvq_tubarresto_upload_settings.restaurant_id = restaurant_id
    LIMIT 1;
    
    RETURN IFNULL(sizes, 'thumbnail:150x150,medium:300x300,large:800x800');
END$$

DELIMITER ;

-- 9. VERIFICAR LAS NUEVAS ESTRUCTURAS
SELECT 'Verificando nuevas columnas en restaurants...' as status;
DESCRIBE kvq_tubarresto_restaurants;

SELECT 'Verificando nueva tabla restaurant_images...' as status;
DESCRIBE kvq_tubarresto_restaurant_images;

SELECT 'Verificando nueva tabla upload_settings...' as status;
DESCRIBE kvq_tubarresto_upload_settings;

-- 10. MOSTRAR ESTADÍSTICAS FINALES
SELECT 
    'Estadísticas de la actualización' as status,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurants) as total_restaurants,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images) as total_images,
    (SELECT COUNT(*) FROM kvq_tubarresto_upload_settings) as total_upload_configs;

-- 11. CONSULTAS DE EJEMPLO PARA VERIFICAR FUNCIONAMIENTO

-- Ver restaurantes existentes con sus nuevos campos
SELECT 
    id,
    name,
    slug,
    logo_url,
    cover_image_url,
    images_updated_at
FROM kvq_tubarresto_restaurants;

-- Ver configuraciones de upload creadas
SELECT 
    r.name as restaurant_name,
    CONCAT(ROUND(us.max_file_size/1024/1024, 2), ' MB') as max_file_size,
    us.allowed_formats,
    us.max_images_per_category,
    us.upload_subdir
FROM kvq_tubarresto_restaurants r
JOIN kvq_tubarresto_upload_settings us ON r.id = us.restaurant_id;

SELECT 'Base de datos actualizada exitosamente para soporte de imágenes.' as resultado_final;
