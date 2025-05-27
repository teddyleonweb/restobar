-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS EXISTENTE PARA SOPORTE DE IMÁGENES
-- (AJUSTADO PARA BASE DE DATOS CON CAMBIOS PREVIOS APLICADOS)
-- Aplicar sobre la base de datos actual de TuBarResto
-- =====================================================

-- 1. CREAR TRIGGER PARA CONFIGURACIÓN AUTOMÁTICA EN NUEVOS RESTAURANTES
DELIMITER $$

CREATE TRIGGER tr_create_upload_settings_after_restaurant_insert
    AFTER INSERT ON kvq_tubarresto_restaurants
    FOR EACH ROW
BEGIN
    INSERT IGNORE INTO kvq_tubarresto_upload_settings (restaurant_id)
    VALUES (NEW.id);
END$$

DELIMITER ;

-- 2. CREAR VISTA PARA CONSULTAS FÁCILES DE IMÁGENES
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

-- 3. FUNCIÓN PARA OBTENER FORMATOS PERMITIDOS
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

-- 4. FUNCIÓN PARA OBTENER TAMAÑOS DE THUMBNAILS
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

-- 5. VERIFICAR LAS NUEVAS ESTRUCTURAS
SELECT 'Verificando nuevas columnas en restaurants...' as status;
DESCRIBE kvq_tubarresto_restaurants;

SELECT 'Verificando nueva tabla restaurant_images...' as status;
DESCRIBE kvq_tubarresto_restaurant_images;

SELECT 'Verificando nueva tabla upload_settings...' as status;
DESCRIBE kvq_tubarresto_upload_settings;

-- 6. MOSTRAR ESTADÍSTICAS FINALES
SELECT 
    'Estadísticas de la actualización' as status,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurants) as total_restaurants,
    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images) as total_images,
    (SELECT COUNT(*) FROM kvq_tubarresto_upload_settings) as total_upload_configs;

-- 7. CONSULTAS DE EJEMPLO PARA VERIFICAR FUNCIONAMIENTO

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
