-- Crear tablas para gestión de menú
-- Ejecutar después de las tablas principales

-- Tabla de categorías de menú
CREATE TABLE IF NOT EXISTS kvq_tubarresto_menu_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('food', 'drink', 'both') DEFAULT 'both',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES kvq_tubarresto_restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant_type (restaurant_id, type),
    INDEX idx_sort_order (sort_order)
);

-- Tabla de elementos del menú (platos y bebidas)
CREATE TABLE IF NOT EXISTS kvq_tubarresto_menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    category_id INT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    type ENUM('food', 'drink') NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_lactose_free BOOLEAN DEFAULT FALSE,
    is_spicy BOOLEAN DEFAULT FALSE,
    calories INT NULL,
    preparation_time INT NULL COMMENT 'Tiempo en minutos',
    ingredients TEXT,
    allergens TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES kvq_tubarresto_restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES kvq_tubarresto_menu_categories(id) ON DELETE SET NULL,
    INDEX idx_restaurant_type (restaurant_id, type),
    INDEX idx_category (category_id),
    INDEX idx_featured (is_featured),
    INDEX idx_available (is_available),
    INDEX idx_sort_order (sort_order)
);

-- Insertar categorías por defecto para restaurantes existentes
INSERT IGNORE INTO kvq_tubarresto_menu_categories (restaurant_id, name, description, type, sort_order)
SELECT 
    id as restaurant_id,
    'Entrantes' as name,
    'Aperitivos y entrantes' as description,
    'food' as type,
    1 as sort_order
FROM kvq_tubarresto_restaurants
WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM kvq_tubarresto_menu_categories WHERE name = 'Entrantes');

INSERT IGNORE INTO kvq_tubarresto_menu_categories (restaurant_id, name, description, type, sort_order)
SELECT 
    id as restaurant_id,
    'Platos Principales' as name,
    'Platos principales y especialidades' as description,
    'food' as type,
    2 as sort_order
FROM kvq_tubarresto_restaurants
WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM kvq_tubarresto_menu_categories WHERE name = 'Platos Principales');

INSERT IGNORE INTO kvq_tubarresto_menu_categories (restaurant_id, name, description, type, sort_order)
SELECT 
    id as restaurant_id,
    'Postres' as name,
    'Postres y dulces' as description,
    'food' as type,
    3 as sort_order
FROM kvq_tubarresto_restaurants
WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM kvq_tubarresto_menu_categories WHERE name = 'Postres');

INSERT IGNORE INTO kvq_tubarresto_menu_categories (restaurant_id, name, description, type, sort_order)
SELECT 
    id as restaurant_id,
    'Bebidas' as name,
    'Bebidas y refrescos' as description,
    'drink' as type,
    4 as sort_order
FROM kvq_tubarresto_restaurants
WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM kvq_tubarresto_menu_categories WHERE name = 'Bebidas');

INSERT IGNORE INTO kvq_tubarresto_menu_categories (restaurant_id, name, description, type, sort_order)
SELECT 
    id as restaurant_id,
    'Vinos y Licores' as name,
    'Carta de vinos y licores' as description,
    'drink' as type,
    5 as sort_order
FROM kvq_tubarresto_restaurants
WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM kvq_tubarresto_menu_categories WHERE name = 'Vinos y Licores');

-- Verificar que las tablas se crearon correctamente
SELECT 'Tablas de menú creadas correctamente' as status;
SELECT COUNT(*) as categorias_creadas FROM kvq_tubarresto_menu_categories;
SELECT COUNT(*) as items_menu FROM kvq_tubarresto_menu_items;
