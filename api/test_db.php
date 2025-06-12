<?php
// Configuración de la base de datos (reemplaza con tus datos reales)
define('DB_NAME', 'tu_nombre_de_base_de_datos');
define('DB_USER', 'tu_usuario_de_base_de_datos');
define('DB_PASSWORD', 'tu_contraseña_de_base_de_datos');
define('DB_HOST', 'localhost'); // O la IP/dominio de tu servidor de base de datos

// Incluir WordPress para la función $wpdb (si estás en un entorno WP)
// Si no estás en un entorno WordPress, necesitarás una conexión MySQLi o PDO manual.
require_once('wp-load.php');

global $wpdb;

if ($wpdb->dbh) {
    echo "Conexión a la base de datos exitosa.<br>";

    // Intenta una consulta simple
    $result = $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_restaurants");
    if ($result !== null) {
        echo "Número de restaurantes: " . $result . "<br>";
    } else {
        echo "Error al ejecutar consulta: " . $wpdb->last_error . "<br>";
    }
} else {
    echo "Fallo en la conexión a la base de datos.<br>";
    echo "Error: " . $wpdb->last_error . "<br>";
}
?>
