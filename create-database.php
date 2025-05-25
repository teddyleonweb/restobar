<?php
/**
 * Script para crear las tablas de Tu Bar Resto
 * Ejecutar una sola vez para configurar la base de datos
 */

// Incluir WordPress
require_once('wp-load.php');

global $wpdb;

// Función para ejecutar SQL y mostrar resultados
function execute_sql($sql, $description) {
    global $wpdb;
    
    echo "<h3>$description</h3>\n";
    echo "<pre>$sql</pre>\n";
    
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
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Configuración de Base de Datos - Tu Bar Resto</h1>
    
    <?php
    
    // Tabla de usuarios
    $sql_users = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}tubarresto_users (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        apellido varchar(100) NOT NULL,
        email varchar(100) NOT NULL UNIQUE,
        telefono varchar(20) NOT NULL,
        password varchar(255) NOT NULL,
        trial_ends_at datetime DEFAULT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    execute_sql($sql_users, "Creando tabla de usuarios");
    
    // Tabla de restaurantes
    $sql_restaurants = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}tubarresto_restaurants (
        id int(11) NOT NULL AUTO_INCREMENT,
        user_id int(11) NOT NULL,
        name varchar(200) NOT NULL,
        description text,
        address varchar(255) NOT NULL,
        city varchar(100) NOT NULL,
        phone varchar(20),
        email varchar(100),
        logo varchar(500),
        qr_code varchar(100) NOT NULL UNIQUE,
        is_active tinyint(1) DEFAULT 1,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY qr_code (qr_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    execute_sql($sql_restaurants, "Creando tabla de restaurantes");
    
    // Tabla de platos
    $sql_dishes = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}tubarresto_dishes (
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
        KEY user_id (user_id),
        KEY restaurant_id (restaurant_id),
        KEY category (category)
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
        } else {
            echo "<p class='error'>❌ $table NO existe</p>";
        }
    }
    
    echo "<h2>Estado de la configuración:</h2>";
    echo "<p>Si todas las tablas se crearon correctamente, ya puedes usar la API.</p>";
    echo "<p><strong>Importante:</strong> Elimina este archivo (create-database.php) después de ejecutarlo por seguridad.</p>";
    
    ?>
    
</body>
</html>
