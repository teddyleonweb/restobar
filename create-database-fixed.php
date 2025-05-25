<?php
/**
 * Script corregido para crear las tablas de Tu Bar Resto
 * Ejecutar una sola vez para configurar la base de datos
 */

// Incluir WordPress
require_once('wp-load.php');

global $wpdb;

// Función para ejecutar SQL y mostrar resultados
function execute_sql($sql, $description) {
    global $wpdb;
    
    echo "<h3>$description</h3>\n";
    echo "<pre>" . htmlspecialchars($sql) . "</pre>\n";
    
    $result = $wpdb->query($sql);
    
    if ($result === false) {
        echo "<p style='color: red;'>❌ Error: " . $wpdb->last_error . "</p>\n";
        return false;
    } else {
        echo "<p style='color: green;'>✅ Ejecutado correctamente</p>\n";
        return true;
    }
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Crear Base de Datos - Tu Bar Resto</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .container { max-width: 1200px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Configuración de Base de Datos - Tu Bar Resto</h1>
        
        <?php
        
        // Primero, eliminar tablas si existen (para evitar conflictos)
        echo "<h2>Limpiando tablas existentes (si existen):</h2>";
        
        $drop_tables = [
            "DROP TABLE IF EXISTS {$wpdb->prefix}tubarresto_dishes",
            "DROP TABLE IF EXISTS {$wpdb->prefix}tubarresto_restaurants", 
            "DROP TABLE IF EXISTS {$wpdb->prefix}tubarresto_users"
        ];
        
        foreach ($drop_tables as $sql) {
            $wpdb->query($sql);
        }
        echo "<p class='success'>✅ Tablas anteriores eliminadas</p>";
        
        // Tabla de usuarios
        $sql_users = "CREATE TABLE {$wpdb->prefix}tubarresto_users (
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
            UNIQUE KEY unique_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        execute_sql($sql_users, "Creando tabla de usuarios");
        
        // Tabla de restaurantes
        $sql_restaurants = "CREATE TABLE {$wpdb->prefix}tubarresto_restaurants (
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
            KEY idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        execute_sql($sql_restaurants, "Creando tabla de restaurantes");
        
        // Tabla de platos
        $sql_dishes = "CREATE TABLE {$wpdb->prefix}tubarresto_dishes (
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
            KEY idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        execute_sql($sql_dishes, "Creando tabla de platos");
        
        // Verificar que las tablas se crearon correctamente
        echo "<h2>Verificación de tablas creadas:</h2>";
        
        $tables = [
            $wpdb->prefix . 'tubarresto_users',
            $wpdb->prefix . 'tubarresto_restaurants', 
            $wpdb->prefix . 'tubarresto_dishes'
        ];
        
        foreach ($tables as $table) {
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table'");
            if ($exists) {
                $count = $wpdb->get_var("SELECT COUNT(*) FROM $table");
                echo "<p class='success'>✅ $table existe (registros: $count)</p>";
                
                // Mostrar estructura de la tabla
                $columns = $wpdb->get_results("DESCRIBE $table");
                echo "<details><summary>Ver estructura de $table</summary>";
                echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
                echo "<tr><th>Campo</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
                foreach ($columns as $column) {
                    echo "<tr>";
                    echo "<td>{$column->Field}</td>";
                    echo "<td>{$column->Type}</td>";
                    echo "<td>{$column->Null}</td>";
                    echo "<td>{$column->Key}</td>";
                    echo "<td>{$column->Default}</td>";
                    echo "</tr>";
                }
                echo "</table></details>";
            } else {
                echo "<p class='error'>❌ $table NO existe</p>";
            }
        }
        
        // Crear un usuario de prueba
        echo "<h2>Creando usuario de prueba:</h2>";
        
        $test_user_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}tubarresto_users WHERE email = %s",
            'test@tubarresto.com'
        ));
        
        if (!$test_user_exists) {
            $test_result = $wpdb->insert(
                $wpdb->prefix . 'tubarresto_users',
                [
                    'name' => 'Usuario',
                    'apellido' => 'Prueba',
                    'email' => 'test@tubarresto.com',
                    'telefono' => '123456789',
                    'password' => password_hash('123456', PASSWORD_DEFAULT),
                    'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+30 days'))
                ]
            );
            
            if ($test_result) {
                $user_id = $wpdb->insert_id;
                echo "<p class='success'>✅ Usuario de prueba creado (ID: $user_id)</p>";
                echo "<p><strong>Email:</strong> test@tubarresto.com</p>";
                echo "<p><strong>Contraseña:</strong> 123456</p>";
                
                // Crear restaurante de prueba
                $restaurant_result = $wpdb->insert(
                    $wpdb->prefix . 'tubarresto_restaurants',
                    [
                        'user_id' => $user_id,
                        'name' => 'Restaurante de Prueba',
                        'address' => 'Calle Falsa 123',
                        'city' => 'Ciudad de Prueba',
                        'qr_code' => 'QR_' . $user_id . '_' . uniqid(),
                        'is_active' => 1
                    ]
                );
                
                if ($restaurant_result) {
                    echo "<p class='success'>✅ Restaurante de prueba creado</p>";
                } else {
                    echo "<p class='error'>❌ Error creando restaurante: " . $wpdb->last_error . "</p>";
                }
            } else {
                echo "<p class='error'>❌ Error creando usuario de prueba: " . $wpdb->last_error . "</p>";
            }
        } else {
            echo "<p class='success'>✅ Usuario de prueba ya existe</p>";
        }
        
        echo "<h2>Estado de la configuración:</h2>";
        echo "<p class='success'>✅ Base de datos configurada correctamente</p>";
        echo "<p><strong>Próximos pasos:</strong></p>";
        echo "<ul>";
        echo "<li>Probar el registro en la aplicación</li>";
        echo "<li>Probar el login con el usuario de prueba</li>";
        echo "<li>Eliminar este archivo por seguridad</li>";
        echo "</ul>";
        
        ?>
    </div>
</body>
</html>
