-- Eliminar las tablas si existen para recrearlas con la definición corregida
DROP TABLE IF EXISTS kvq_tubarresto_order_items;
DROP TABLE IF EXISTS kvq_tubarresto_orders;

-- Tabla para almacenar los pedidos
CREATE TABLE IF NOT EXISTS kvq_tubarresto_orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- CORREGIDO: Cambiado a INT UNSIGNED para coincidir con order_id en kvq_tubarresto_order_items
    restaurant_id INT UNSIGNED NOT NULL,
    table_id INT NOT NULL, -- CORREGIDO: Cambiado a INT para coincidir con id en kvq_tubarresto_tables
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    customer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES kvq_tubarresto_restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES kvq_tubarresto_tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para almacenar los ítems de cada pedido
CREATE TABLE IF NOT EXISTS kvq_tubarresto_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    menu_item_id INT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    price_at_order DECIMAL(10, 2) NOT NULL, -- Precio del ítem en el momento del pedido
    item_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES kvq_tubarresto_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES kvq_tubarresto_menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
