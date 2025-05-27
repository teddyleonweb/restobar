<?php
/**
 * Script de configuración de base de datos para Tu Bar Resto
 * Este archivo crea todas las tablas necesarias para el sistema
 */

// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_NAME', 'tubarresto_wp');
define('DB_USER', 'tu_usuario_db');
define('DB_PASS', 'tu_password_db');
define('DB_PREFIX', 'wp_');

class DatabaseSetup {
    private $pdo;
    private $errors = [];
    private $success = [];
    
    public function __construct() {
        try {
            $this->pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
            $this->success[] = "Conexión a la base de datos establecida correctamente";
        } catch (PDOException $e) {
            $this->errors[] = "Error de conexión: " . $e->getMessage();
            die("No se pudo conectar a la base de datos");
        }
    }
    
    public function setupDatabase() {
        echo "<h1>Configuración de Base de Datos - Tu Bar Resto</h1>";
        
        // Verificar si WordPress está instalado
        $this->checkWordPressInstallation();
        
        // Crear tablas personalizadas
        $this->createRestaurantsTable();
        $this->createMenuCategoriesTable();
        $this->createMenuItemsTable();
        $this->createTablesTable();
        $this->createOrdersTable();
        $this->createOrderItemsTable();
        $this->createPaymentsTable();
        $this->createQRCodesTable();
        $this->createSettingsTable();
        $this->createReportsTable();
        
        // Insertar datos iniciales
        $this->insertInitialData();
        
        // Mostrar resultados
        $this->showResults();
    }
    
    private function checkWordPressInstallation() {
        try {
            // Verificar si las tablas de WordPress existen
            $tables = [
                DB_PREFIX . 'users',
                DB_PREFIX . 'usermeta',
                DB_PREFIX . 'posts',
                DB_PREFIX . 'postmeta'
            ];
            
            foreach ($tables as $table) {
                $stmt = $this->pdo->query("SHOW TABLES LIKE '$table'");
                if ($stmt->rowCount() == 0) {
                    $this->errors[] = "Tabla de WordPress no encontrada: $table";
                }
            }
            
            if (empty($this->errors)) {
                $this->success[] = "Instalación de WordPress verificada correctamente";
            }
            
        } catch (Exception $e) {
            $this->errors[] = "Error verificando WordPress: " . $e->getMessage();
        }
    }
    
    private function createRestaurantsTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_restaurants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT(20) UNSIGNED NOT NULL,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                address TEXT,
                city VARCHAR(100),
                phone VARCHAR(20),
                email VARCHAR(100),
                logo_url VARCHAR(500),
                cover_image_url VARCHAR(500),
                currency VARCHAR(3) DEFAULT 'EUR',
                timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
                status ENUM('active', 'inactive', 'trial', 'suspended') DEFAULT 'trial',
                trial_start_date DATETIME,
                trial_end_date DATETIME,
                subscription_plan VARCHAR(50) DEFAULT 'trial',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES " . DB_PREFIX . "users(ID) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_slug (slug),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'restaurants' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla restaurants: " . $e->getMessage();
        }
    }
    
    private function createMenuCategoriesTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_menu_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_sort_order (sort_order),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'menu_categories' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla menu_categories: " . $e->getMessage();
        }
    }
    
    private function createMenuItemsTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                category_id INT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                image_url VARCHAR(500),
                ingredients TEXT,
                allergens TEXT,
                calories INT,
                preparation_time INT COMMENT 'Tiempo en minutos',
                is_available BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES " . DB_PREFIX . "tubarresto_menu_categories(id) ON DELETE SET NULL,
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_category_id (category_id),
                INDEX idx_available (is_available),
                INDEX idx_featured (is_featured),
                INDEX idx_price (price)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'menu_items' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla menu_items: " . $e->getMessage();
        }
    }
    
    private function createTablesTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_tables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                table_number VARCHAR(20) NOT NULL,
                table_name VARCHAR(100),
                capacity INT DEFAULT 4,
                qr_code VARCHAR(255) UNIQUE,
                qr_image_url VARCHAR(500),
                location VARCHAR(100) COMMENT 'Terraza, Interior, etc.',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_table_restaurant (restaurant_id, table_number),
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_qr_code (qr_code),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'tables' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla tables: " . $e->getMessage();
        }
    }
    
    private function createOrdersTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                table_id INT,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(20),
                customer_email VARCHAR(100),
                total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                tax_amount DECIMAL(10,2) DEFAULT 0,
                discount_amount DECIMAL(10,2) DEFAULT 0,
                status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50),
                notes TEXT,
                estimated_time INT COMMENT 'Tiempo estimado en minutos',
                order_type ENUM('dine_in', 'takeaway', 'delivery') DEFAULT 'dine_in',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                FOREIGN KEY (table_id) REFERENCES " . DB_PREFIX . "tubarresto_tables(id) ON DELETE SET NULL,
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_table_id (table_id),
                INDEX idx_order_number (order_number),
                INDEX idx_status (status),
                INDEX idx_payment_status (payment_status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'orders' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla orders: " . $e->getMessage();
        }
    }
    
    private function createOrderItemsTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                special_instructions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES " . DB_PREFIX . "tubarresto_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES " . DB_PREFIX . "tubarresto_menu_items(id) ON DELETE CASCADE,
                INDEX idx_order_id (order_id),
                INDEX idx_menu_item_id (menu_item_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'order_items' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla order_items: " . $e->getMessage();
        }
    }
    
    private function createPaymentsTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                payment_provider VARCHAR(50),
                transaction_id VARCHAR(255),
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'EUR',
                status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
                gateway_response TEXT,
                processed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES " . DB_PREFIX . "tubarresto_orders(id) ON DELETE CASCADE,
                INDEX idx_order_id (order_id),
                INDEX idx_transaction_id (transaction_id),
                INDEX idx_status (status),
                INDEX idx_processed_at (processed_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'payments' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla payments: " . $e->getMessage();
        }
    }
    
    private function createQRCodesTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_qr_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                table_id INT,
                qr_code VARCHAR(255) UNIQUE NOT NULL,
                qr_image_url VARCHAR(500),
                menu_url VARCHAR(500),
                scan_count INT DEFAULT 0,
                last_scanned_at TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                FOREIGN KEY (table_id) REFERENCES " . DB_PREFIX . "tubarresto_tables(id) ON DELETE CASCADE,
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_table_id (table_id),
                INDEX idx_qr_code (qr_code),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'qr_codes' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla qr_codes: " . $e->getMessage();
        }
    }
    
    private function createSettingsTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT,
                setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                UNIQUE KEY unique_setting_restaurant (restaurant_id, setting_key),
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_setting_key (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'settings' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla settings: " . $e->getMessage();
        }
    }
    
    private function createReportsTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS " . DB_PREFIX . "tubarresto_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                report_date DATE NOT NULL,
                total_orders INT DEFAULT 0,
                total_revenue DECIMAL(10,2) DEFAULT 0,
                total_items_sold INT DEFAULT 0,
                average_order_value DECIMAL(10,2) DEFAULT 0,
                most_popular_item_id INT,
                peak_hour VARCHAR(5),
                payment_methods_breakdown JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES " . DB_PREFIX . "tubarresto_restaurants(id) ON DELETE CASCADE,
                FOREIGN KEY (most_popular_item_id) REFERENCES " . DB_PREFIX . "tubarresto_menu_items(id) ON DELETE SET NULL,
                UNIQUE KEY unique_report_date (restaurant_id, report_date),
                INDEX idx_restaurant_id (restaurant_id),
                INDEX idx_report_date (report_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            $this->pdo->exec($sql);
            $this->success[] = "Tabla 'reports' creada correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error creando tabla reports: " . $e->getMessage();
        }
    }
    
    private function insertInitialData() {
        try {
            // Insertar configuraciones por defecto
            $this->insertDefaultSettings();
            $this->success[] = "Datos iniciales insertados correctamente";
            
        } catch (Exception $e) {
            $this->errors[] = "Error insertando datos iniciales: " . $e->getMessage();
        }
    }
    
    private function insertDefaultSettings() {
        // Esta función se ejecutará cuando se cree un restaurante
        // Por ahora solo preparamos la estructura
    }
    
    private function showResults() {
        echo "<div style='font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px;'>";
        
        if (!empty($this->success)) {
            echo "<div style='background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px;'>";
            echo "<h3>✅ Operaciones Exitosas:</h3>";
            echo "<ul>";
            foreach ($this->success as $message) {
                echo "<li>$message</li>";
            }
            echo "</ul>";
            echo "</div>";
        }
        
        if (!empty($this->errors)) {
            echo "<div style='background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;'>";
            echo "<h3>❌ Errores Encontrados:</h3>";
            echo "<ul>";
            foreach ($this->errors as $error) {
                echo "<li>$error</li>";
            }
            echo "</ul>";
            echo "</div>";
        }
        
        echo "<div style='background-color: #e2e3e5; border: 1px solid #d6d8db; color: #383d41; padding: 15px; border-radius: 5px;'>";
        echo "<h3>📊 Resumen de Tablas Creadas:</h3>";
        echo "<ul>";
        echo "<li><strong>tubarresto_restaurants</strong> - Información de restaurantes</li>";
        echo "<li><strong>tubarresto_menu_categories</strong> - Categorías del menú</li>";
        echo "<li><strong>tubarresto_menu_items</strong> - Productos del menú</li>";
        echo "<li><strong>tubarresto_tables</strong> - Mesas del restaurante</li>";
        echo "<li><strong>tubarresto_orders</strong> - Pedidos realizados</li>";
        echo "<li><strong>tubarresto_order_items</strong> - Detalles de pedidos</li>";
        echo "<li><strong>tubarresto_payments</strong> - Información de pagos</li>";
        echo "<li><strong>tubarresto_qr_codes</strong> - Códigos QR generados</li>";
        echo "<li><strong>tubarresto_settings</strong> - Configuraciones del restaurante</li>";
        echo "<li><strong>tubarresto_reports</strong> - Reportes diarios</li>";
        echo "</ul>";
        echo "</div>";
        
        echo "</div>";
    }
    
    public function dropAllTables() {
        echo "<h2>🗑️ Eliminando todas las tablas de Tu Bar Resto...</h2>";
        
        $tables = [
            DB_PREFIX . 'tubarresto_reports',
            DB_PREFIX . 'tubarresto_settings',
            DB_PREFIX . 'tubarresto_qr_codes',
            DB_PREFIX . 'tubarresto_payments',
            DB_PREFIX . 'tubarresto_order_items',
            DB_PREFIX . 'tubarresto_orders',
            DB_PREFIX . 'tubarresto_tables',
            DB_PREFIX . 'tubarresto_menu_items',
            DB_PREFIX . 'tubarresto_menu_categories',
            DB_PREFIX . 'tubarresto_restaurants'
        ];
        
        foreach ($tables as $table) {
            try {
                $this->pdo->exec("DROP TABLE IF EXISTS $table");
                $this->success[] = "Tabla $table eliminada";
            } catch (Exception $e) {
                $this->errors[] = "Error eliminando tabla $table: " . $e->getMessage();
            }
        }
        
        $this->showResults();
    }
}

// Ejecutar el script
if (isset($_GET['action'])) {
    $setup = new DatabaseSetup();
    
    switch ($_GET['action']) {
        case 'create':
            $setup->setupDatabase();
            break;
        case 'drop':
            $setup->dropAllTables();
            break;
        default:
            echo "<h1>Acción no válida</h1>";
    }
} else {
    echo "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; border: 1px solid #ddd; border-radius: 10px;'>
        <h1 style='color: #E94B4F; text-align: center;'>🍽️ Tu Bar Resto - Setup Database</h1>
        <p style='text-align: center; color: #666;'>Selecciona una acción para continuar:</p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='?action=create' style='background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block;'>
                ✅ Crear Tablas
            </a>
            <a href='?action=drop' style='background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block;' onclick='return confirm(\"¿Estás seguro de que quieres eliminar todas las tablas?\")'>
                🗑️ Eliminar Tablas
            </a>
        </div>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px;'>
            <strong>⚠️ Importante:</strong>
            <ul style='margin: 10px 0;'>
                <li>Asegúrate de tener WordPress instalado</li>
                <li>Configura las credenciales de la base de datos en la parte superior del archivo</li>
                <li>Haz una copia de seguridad antes de ejecutar</li>
            </ul>
        </div>
    </div>
    ";
}
?>
