CREATE TABLE IF NOT EXISTS kvq_tubarresto_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT UNSIGNED NOT NULL, -- ¡CORREGIDO: Añadido UNSIGNED para que coincida con kvq_tubarresto_restaurants.id!
    table_number VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    location_description VARCHAR(255),
    qr_code_data TEXT NOT NULL,
    qr_code_url VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES kvq_tubarresto_restaurants(id) ON DELETE CASCADE,
    UNIQUE (restaurant_id, table_number)
) ENGINE=InnoDB; -- Asegura que la tabla use InnoDB
