-- =====================================================
-- Tu Bar Resto - Tablas básicas con prefijo kvq_
-- Solo: Usuarios y Restaurantes
-- =====================================================

-- TABLA 1: Usuarios (independiente de WordPress)
CREATE TABLE IF NOT EXISTS kvq_tubarresto_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Información básica del usuario
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    
    -- Estado de la cuenta
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Fechas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    -- Índices
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Usuarios del sistema Tu Bar Resto';

-- TABLA 2: Restaurantes
CREATE TABLE IF NOT EXISTS kvq_tubarresto_restaurants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con usuario
    user_id INT UNSIGNED NOT NULL,
    
    -- Información básica del restaurante
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    
    -- Información de contacto
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- Estado y suscripción
    status ENUM('active', 'inactive', 'trial', 'suspended') DEFAULT 'trial',
    
    -- Fechas de prueba
    trial_start_date DATETIME,
    trial_end_date DATETIME,
    
    -- Fechas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_city (city),
    
    -- Llave foránea
    CONSTRAINT fk_restaurant_user 
        FOREIGN KEY (user_id) 
        REFERENCES kvq_tubarresto_users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Restaurantes registrados en la plataforma';

-- Verificar que las tablas se crearon
SHOW TABLES LIKE 'kvq_tubarresto_%';

-- Ver estructura
DESCRIBE kvq_tubarresto_users;
DESCRIBE kvq_tubarresto_restaurants;
