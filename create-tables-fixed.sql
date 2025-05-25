-- Crear tablas para Tu Bar Resto (Versión corregida)

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS wp_tubarresto_users (
    id int(11) NOT NULL AUTO_INCREMENT,
    name varchar(100) NOT NULL,
    apellido varchar(100) NOT NULL,
    email varchar(100) NOT NULL,
    telefono varchar(20) NOT NULL,
    password varchar(255) NOT NULL,
    trial_ends_at datetime DEFAULT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_email (email),
    KEY idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de restaurantes
CREATE TABLE IF NOT EXISTS wp_tubarresto_restaurants (
    id int(11) NOT NULL AUTO_INCREMENT,
    user_id int(11) NOT NULL,
    name varchar(200) NOT NULL,
    description text,
    address varchar(255) NOT NULL,
    city varchar(100) NOT NULL,
    phone varchar(20),
    email varchar(100),
    logo varchar(500),
    qr_code varchar(100) NOT NULL,
    is_active tinyint(1) DEFAULT 1,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_qr_code (qr_code),
    KEY idx_user_id (user_id),
    KEY idx_qr_code (qr_code),
    KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de platos
CREATE TABLE IF NOT EXISTS wp_tubarresto_dishes (
    id int(11) NOT NULL AUTO_INCREMENT,
    user_id int(11) NOT NULL,
    restaurant_id int(11) NOT NULL,
    name varchar(200) NOT NULL,
    description text,
    price decimal(10,2) NOT NULL,
    category varchar(100) DEFAULT 'General',
    image varchar(500),
    is_available tinyint(1) DEFAULT 1,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_restaurant_id (restaurant_id),
    KEY idx_category (category),
    KEY idx_is_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
