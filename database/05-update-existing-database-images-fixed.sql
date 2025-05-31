-- =====================================================
-- ACTUALIZACIÓN DE BASE DE DATOS EXISTENTE PARA SOPORTE DE IMÁGENES
-- (CORREGIDO PARA MANEJAR ELEMENTOS EXISTENTES)
-- Aplicar sobre la base de datos actual de TuBarResto
-- =====================================================

-- 1. ELIMINAR Y RECREAR TRIGGER PARA CONFIGURACIÓN AUTOMÁTICA
DROP TRIGGER IF EXISTS tr_create_upload_settings_after_restaurant_insert;

DELIMITER $$

CREATE TRIGGER tr_create_upload_settings_after_restaurant_insert
    AFTER INSERT ON kvq_tubarresto_restaurants
    FOR EACH ROW
BEGIN
    INSERT IGNORE INTO kvq_tubarresto_upload_settings (
        restaurant_id,
        allowed_formats,
        thumbnail_sizes
    )
    VALUES (
        NEW.id,
        'image/jpeg,image/png,image/webp,image/gif',
        'thumbnail:150x150,medium:300x300,large:800x800'
    );
END$$

DELIMITER ;

-- 2. CREAR VISTA PARA CONSULTAS FÁCILES DE IMÁGENES (eliminar si existe)
DROP VIEW IF EXISTS vw_restaurant_images_complete;

CREATE VIEW vw_restaurant_images_complete AS
SELECT 
    ri.id,
    ri.restaurant_id,
    ri.title,
    ri.description,
    ri.url,
    ri.category,
    ri.is_primary,
    ri.file_name,
    ri.file_size,
    ri.mime_type,
    ri.width,
    ri.height,
    ri.sort_order,
    ri.is_active,
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

-- 3. CREAR FUNCIONES (eliminar si existen)
DROP FUNCTION IF EXISTS get_allowed_formats;

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

DROP FUNCTION IF EXISTS get_thumbnail_sizes;

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

-- 4. ASEGURAR QUE TODOS LOS RESTAURANTES TENGAN CONFIGURACIÓN DE UPLOAD
INSERT IGNORE INTO kvq_tubarresto_upload_settings (
    restaurant_id,
    allowed_formats,
    thumbnail_sizes
)
SELECT 
    id,
    'image/jpeg,image/png,image/webp,image/gif',
    'thumbnail:150x150,medium:300x300,large:800x800'
FROM kvq_tubarresto_restaurants 
WHERE id NOT IN (
    SELECT restaurant_id 
    FROM kvq_tubarresto_upload_settings
);

-- 5. VERIFICAR LAS ESTRUCTURAS
SELECT 'Verificando trigger...' as status;
SHOW TRIGGERS LIKE 'kvq_tubarresto_restaurants';

SELECT 'Verificando vista...' as status;
SHOW CREATE VIEW vw_restaurant_images_complete;

SELECT 'Verificando funciones...' as status;
SHOW FUNCTION STATUS WHERE Name IN ('get_allowed_formats', 'get_thumbnail_sizes');

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

-- Ver configuraciones de upload
SELECT 
    r.name as restaurant_name,
    CONCAT(ROUND(us.max_file_size/1024/1024, 2), ' MB') as max_file_size,
    us.allowed_formats,
    us.max_images_per_category,
    us.upload_subdir
FROM kvq_tubarresto_restaurants r
JOIN kvq_tubarresto_upload_settings us ON r.id = us.restaurant_id;

-- Probar las funciones
SELECT 
    id,
    name,
    get_allowed_formats(id) as formatos_permitidos,
    get_thumbnail_sizes(id) as tamaños_thumbnails
FROM kvq_tubarresto_restaurants
LIMIT 3;

SELECT 'Base de datos actualizada exitosamente para soporte de imágenes.' as resultado_final;
