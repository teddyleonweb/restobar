<?php
/**
 * API para Tu Bar Resto - CORREGIDA
 * Este archivo actúa como un proxy entre la aplicación Next.js y la base de datos de WordPress
 */

// Evitar que WordPress muestre errores o advertencias que puedan afectar a los encabezados
@ini_set('display_errors', 0);
error_reporting(0);

// Configuración CORS mejorada
$allowed_origins = [
    'http://localhost:3000',
    'http://tubarresto.somediave.com',
    'https://tubarresto.somediave.com',
    'https://tubarresto.vercel.app',
    'https://www.tubarresto.com',
    'https://v0-tubarresto.vercel.app'
];

// Obtener el origen de la solicitud
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Permitir el origen si está en la lista o usar * como comodín
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

// Resto de encabezados CORS
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400"); // 24 horas

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Incluir WordPress
require_once('wp-load.php');

// Obtener la ruta de la solicitud
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/api.php';
$path = str_replace($base_path, '', parse_url($request_uri, PHP_URL_PATH));

// Obtener el método de la solicitud
$method = $_SERVER['REQUEST_METHOD'];

// Obtener los datos de la solicitud
$data = json_decode(file_get_contents('php://input'), true) ?: [];

// Obtener el token de autorización
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = '';

if (strpos($auth_header, 'Bearer ') === 0) {
    $token = substr($auth_header, 7);
}

// Función para registrar mensajes en un archivo de log
function log_to_file($message, $data = null) {
    $log_file = __DIR__ . '/tubarresto_api_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[{$timestamp}] {$message}";
    
    if ($data !== null) {
        $log_message .= " - Data: " . json_encode($data);
    }
    
    file_put_contents($log_file, $log_message . PHP_EOL, FILE_APPEND);
}

// Función para verificar el token y obtener el usuario
function verify_token($token) {
    if (empty($token)) {
        log_to_file("Token vacío");
        return false;
    }
    
    // Decodificar el token JWT (implementación simple)
    $parts = explode('.', $token);
    
    if (count($parts) != 3) {
        log_to_file("Token con formato incorrecto: " . count($parts) . " partes");
        return false;
    }
    
    try {
        $payload_json = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        if (!$payload_json) {
            log_to_file("Error al decodificar base64 del payload");
            return false;
        }
        
        $payload = json_decode($payload_json, true);
        
        if (!$payload) {
            log_to_file("Error al decodificar JSON del payload");
            return false;
        }
        
        if (!isset($payload['id']) || !isset($payload['email'])) {
            log_to_file("Payload incompleto", $payload);
            return false;
        }
        
        // Verificar que el usuario existe en la base de datos
        global $wpdb;
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_users WHERE id = %d AND email = %s",
            $payload['id'],
            $payload['email']
        ));
        
        if (!$user) {
            log_to_file("Usuario no encontrado en la base de datos: ID=" . $payload['id'] . ", Email=" . $payload['email']);
            return false;
        }
        
        log_to_file("Token verificado correctamente para usuario: " . $user->name);
        return $payload;
    } catch (Exception $e) {
        log_to_file("Excepción al verificar token: " . $e->getMessage());
        return false;
    }
}

// Función para generar un token JWT
function generate_token($user_id, $email, $name) {
    $header = [
        'alg' => 'HS256',
        'typ' => 'JWT'
    ];
    
    $payload = [
        'id' => $user_id,
        'email' => $email,
        'name' => $name,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 días
    ];
    
    $secret = 'TuBarResto2025SecretKeyForJWTTokenGeneration!@#$%^&*()';
    
    $base64_header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($header)));
    $base64_payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    
    $signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);
    $base64_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64_header . '.' . $base64_payload . '.' . $base64_signature;
}

// Función para guardar imágenes en base64
function save_base64_image($base64_string) {
    // Verificar si es una cadena base64 válida
    if (strpos($base64_string, 'data:image/') !== 0) {
        return $base64_string; // Devolver la cadena original si no es una imagen base64
    }
    
    // Extraer el tipo de imagen y los datos
    $image_parts = explode(";base64,", $base64_string);
    $image_type_aux = explode("image/", $image_parts[0]);
    $image_type = $image_type_aux[1];
    $image_base64 = base64_decode($image_parts[1]);
    
    // Crear un nombre de archivo único
    $file_name = 'tubarresto_' . uniqid() . '.' . $image_type;
    
    // Definir la ruta de carga
    $upload_dir = wp_upload_dir();
    $upload_path = $upload_dir['path'] . '/' . $file_name;
    $upload_url = $upload_dir['url'] . '/' . $file_name;
    
    // Guardar la imagen
    file_put_contents($upload_path, $image_base64);
    
    return $upload_url;
}

// Función para obtener imágenes de un restaurante - CORREGIDA
function get_restaurant_images($restaurant_id) {
    global $wpdb;
    
    $images = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}tubarresto_restaurant_images WHERE restaurant_id = %d ORDER BY created_at DESC",
        $restaurant_id
    ));
    
    $formatted_images = [];
    foreach ($images as $image) {
        $formatted_images[] = [
            'id' => $image->id,
            'url' => $image->image_url,
            'image_url' => $image->image_url, // Agregar ambos formatos
            'caption' => $image->alt_text,
            'alt_text' => $image->alt_text,
            'image_type' => $image->image_type,
            'sort_order' => $image->sort_order,
            'createdAt' => $image->created_at
        ];
    }
    
    return $formatted_images;
}

// Función para obtener imágenes de un plato
function get_dish_images($dish_id) {
    global $wpdb;
    
    $images = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}tubarresto_dish_images WHERE dish_id = %d ORDER BY created_at DESC",
        $dish_id
    ));
    
    $formatted_images = [];
    foreach ($images as $image) {
        $formatted_images[] = [
            'id' => $image->id,
            'url' => $image->image_url,
            'image_url' => $image->image_url,
            'caption' => $image->alt_text,
            'alt_text' => $image->alt_text,
            'createdAt' => $image->created_at
        ];
    }
    
    return $formatted_images;
}

// Función para obtener mesas de un restaurante - CORREGIDA
function get_restaurant_tables($restaurant_id) {
    global $wpdb;
    
    $tables = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE restaurant_id = %d ORDER BY table_number",
        $restaurant_id
    ));
    
    $formatted_tables = [];
    foreach ($tables as $table) {
        $formatted_tables[] = [
            'id' => $table->id,
            'table_number' => $table->table_number,
            'tableNumber' => $table->table_number, // Agregar ambos formatos
            'seats' => (int) $table->seats,
            'location_description' => $table->location_description,
            'location' => $table->location_description, // Agregar ambos formatos
            'is_available' => (bool) $table->is_available,
            'isAvailable' => (bool) $table->is_available, // Agregar ambos formatos
            'createdAt' => $table->created_at
        ];
    }
    
    return $formatted_tables;
}

// Función para obtener los datos del usuario (restaurantes y platos) - CORREGIDA
function get_user_data($user_id) {
    global $wpdb;
    
    // Obtener restaurantes del usuario
    $restaurants = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE user_id = %d ORDER BY created_at DESC",
        $user_id
    ));
    
    $formatted_restaurants = [];
    foreach ($restaurants as $restaurant) {
        $formatted_restaurants[] = [
            'id' => $restaurant->id,
            'name' => $restaurant->name,
            'description' => $restaurant->description,
            'address' => $restaurant->address,
            'city' => $restaurant->city,
            'phone' => $restaurant->phone,
            'email' => $restaurant->email,
            'logo' => $restaurant->logo,
            'cover_image' => $restaurant->cover_image,
            'coverImage' => $restaurant->cover_image, // Mantener ambos para compatibilidad
            'qr_code' => $restaurant->qr_code,
            'is_active' => (bool) $restaurant->is_active,
            'images' => get_restaurant_images($restaurant->id),
            'tables' => get_restaurant_tables($restaurant->id),
            'createdAt' => $restaurant->created_at
        ];
    }
    
    // Obtener platos con sus restaurantes asociados
    $dishes = $wpdb->get_results($wpdb->prepare(
        "SELECT d.*, r.name as restaurant_name 
         FROM {$wpdb->prefix}tubarresto_dishes d
         LEFT JOIN {$wpdb->prefix}tubarresto_restaurants r ON d.restaurant_id = r.id
         WHERE d.user_id = %d 
         ORDER BY d.created_at DESC",
        $user_id
    ));
    
    $formatted_dishes = [];
    foreach ($dishes as $dish) {
        $formatted_dishes[] = [
            'id' => $dish->id,
            'name' => $dish->name,
            'description' => $dish->description,
            'price' => (float) $dish->price,
            'category' => $dish->category,
            'image' => $dish->image,
            'is_available' => (bool) $dish->is_available,
            'restaurantId' => $dish->restaurant_id,
            'restaurantName' => $dish->restaurant_name,
            'images' => get_dish_images($dish->id),
            'createdAt' => $dish->created_at
        ];
    }
    
    return [
        'restaurants' => $formatted_restaurants,
        'dishes' => $formatted_dishes
    ];
}

// Manejar las rutas de la API
switch (true) {
    // Ruta de estado
    case $path === '/status' && $method === 'GET':
        echo json_encode(['status' => 'ok', 'message' => 'Tu Bar Resto API funcionando correctamente']);
        break;
        
    // Rutas de autenticación
    case $path === '/auth/register' && $method === 'POST':
        // Validar datos
        if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre, email y contraseña son requeridos']);
            exit;
        }
        
        // Validar campos adicionales del formulario de registro
        if (empty($data['apellido']) || empty($data['telefono']) || empty($data['nombreRestaurante']) || 
            empty($data['direccion']) || empty($data['ciudad'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Todos los campos del formulario son requeridos']);
            exit;
        }
        
        // Verificar si el usuario ya existe
        global $wpdb;
        $existing_user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_users WHERE email = %s",
            $data['email']
        ));
        
        if ($existing_user) {
            http_response_code(400);
            echo json_encode(['error' => 'El correo electrónico ya está registrado']);
            exit;
        }
        
        // Hashear la contraseña
        $hashed_password = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Insertar el usuario
        $result = $wpdb->insert(
            $wpdb->prefix . 'tubarresto_users',
            [
                'name' => $data['name'],
                'apellido' => $data['apellido'],
                'email' => $data['email'],
                'telefono' => $data['telefono'],
                'password' => $hashed_password,
                'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+30 days'))
            ],
            ['%s', '%s', '%s', '%s', '%s', '%s']
        );
        
        if (!$result) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al registrar usuario']);
            exit;
        }
        
        $user_id = $wpdb->insert_id;
        
        // Crear restaurante por defecto
        $qr_code = 'QR_' . $user_id . '_' . uniqid();
        $wpdb->insert(
            $wpdb->prefix . 'tubarresto_restaurants',
            [
                'user_id' => $user_id,
                'name' => $data['nombreRestaurante'],
                'address' => $data['direccion'],
                'city' => $data['ciudad'],
                'qr_code' => $qr_code,
                'is_active' => 1
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d']
        );
        
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Usuario registrado correctamente']);
        break;
        
    case $path === '/auth/login' && $method === 'POST':
        // Validar datos
        if (empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Correo electrónico y contraseña son requeridos']);
            exit;
        }
        
        // Buscar el usuario
        global $wpdb;
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_users WHERE email = %s",
            $data['email']
        ));
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Credenciales incorrectas']);
            exit;
        }
        
        // Verificar la contraseña
        if (!password_verify($data['password'], $user->password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Credenciales incorrectas']);
            exit;
        }
        
        // Generar token JWT
        $token = generate_token($user->id, $user->email, $user->name);
        
        echo json_encode([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'apellido' => $user->apellido,
                'email' => $user->email,
                'telefono' => $user->telefono,
                'trialEndsAt' => $user->trial_ends_at
            ]
        ]);
        break;
        
    case $path === '/auth/user' && $method === 'GET':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        // Obtener datos del usuario
        $user_data = get_user_data($user['id']);
        
        echo json_encode($user_data);
        break;
        
    // Rutas de restaurantes
    case preg_match('#^/restaurants$#', $path) && $method === 'GET':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        // Obtener restaurantes del usuario
        global $wpdb;
        $restaurants = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE user_id = %d ORDER BY created_at DESC",
            $user['id']
        ));
        
        $formatted_restaurants = [];
        foreach ($restaurants as $restaurant) {
            $formatted_restaurants[] = [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'description' => $restaurant->description,
                'address' => $restaurant->address,
                'city' => $restaurant->city,
                'phone' => $restaurant->phone,
                'email' => $restaurant->email,
                'logo' => $restaurant->logo,
                'cover_image' => $restaurant->cover_image,
                'coverImage' => $restaurant->cover_image,
                'qr_code' => $restaurant->qr_code,
                'is_active' => (bool) $restaurant->is_active,
                'images' => get_restaurant_images($restaurant->id),
                'tables' => get_restaurant_tables($restaurant->id),
                'createdAt' => $restaurant->created_at
            ];
        }
        
        echo json_encode($formatted_restaurants);
        break;
        
    case preg_match('#^/restaurants$#', $path) && $method === 'POST':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        // Validar datos
        if (empty($data['name']) || empty($data['address']) || empty($data['city'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre, dirección y ciudad son requeridos']);
            exit;
        }
        
        // Procesar logo si existe
        $logo = null;
        if (!empty($data['logo'])) {
            $logo = save_base64_image($data['logo']);
        }
        
        // Procesar imagen de portada si existe
        $cover_image = null;
        if (!empty($data['coverImage'])) {
            $cover_image = save_base64_image($data['coverImage']);
        }
        
        // Generar código QR único
        $qr_code = 'QR_' . $user['id'] . '_' . uniqid();
        
        // Insertar restaurante
        global $wpdb;
        $result = $wpdb->insert(
            $wpdb->prefix . 'tubarresto_restaurants',
            [
                'user_id' => $user['id'],
                'name' => $data['name'],
                'description' => isset($data['description']) ? $data['description'] : null,
                'address' => $data['address'],
                'city' => $data['city'],
                'phone' => isset($data['phone']) ? $data['phone'] : null,
                'email' => isset($data['email']) ? $data['email'] : null,
                'logo' => $logo,
                'cover_image' => $cover_image,
                'qr_code' => $qr_code,
                'is_active' => 1
            ],
            ['%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d']
        );
        
        if (!$result) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al crear restaurante']);
            exit;
        }
        
        $restaurant_id = $wpdb->insert_id;
        
        // Procesar imágenes adicionales si existen
        if (!empty($data['images']) && is_array($data['images'])) {
            foreach ($data['images'] as $image_data) {
                if (!empty($image_data['url']) || !empty($image_data['image_url'])) {
                    $image_url = save_base64_image($image_data['url'] ?? $image_data['image_url']);
                    $wpdb->insert(
                        $wpdb->prefix . 'tubarresto_restaurant_images',
                        [
                            'restaurant_id' => $restaurant_id,
                            'image_url' => $image_url,
                            'image_type' => 'gallery',
                            'alt_text' => isset($image_data['caption']) ? $image_data['caption'] : null,
                            'sort_order' => isset($image_data['sort_order']) ? $image_data['sort_order'] : 0
                        ],
                        ['%d', '%s', '%s', '%s', '%d']
                    );
                }
            }
        }
        
        // Obtener el restaurante creado con sus imágenes
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d",
            $restaurant_id
        ));
        
        http_response_code(201);
        echo json_encode([
            'id' => $restaurant->id,
            'name' => $restaurant->name,
            'description' => $restaurant->description,
            'address' => $restaurant->address,
            'city' => $restaurant->city,
            'phone' => $restaurant->phone,
            'email' => $restaurant->email,
            'logo' => $restaurant->logo,
            'coverImage' => $restaurant->cover_image,
            'qr_code' => $restaurant->qr_code,
            'is_active' => (bool) $restaurant->is_active,
            'images' => get_restaurant_images($restaurant_id),
            'tables' => [],
            'createdAt' => $restaurant->created_at
        ]);
        break;
        
    case preg_match('#^/restaurants/(\d+)$#', $path, $matches) && $method === 'PUT':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        $restaurant_id = $matches[1];
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user['id']
        ));
        
        if (!$restaurant) {
            http_response_code(404);
            echo json_encode(['error' => 'Restaurante no encontrado']);
            exit;
        }
        
        // Preparar datos para actualizar
        $update_data = [];
        $update_format = [];
        
        if (isset($data['name'])) {
            $update_data['name'] = $data['name'];
            $update_format[] = '%s';
        }
        
        if (isset($data['description'])) {
            $update_data['description'] = $data['description'];
            $update_format[] = '%s';
        }
        
        if (isset($data['address'])) {
            $update_data['address'] = $data['address'];
            $update_format[] = '%s';
        }
        
        if (isset($data['city'])) {
            $update_data['city'] = $data['city'];
            $update_format[] = '%s';
        }
        
        if (isset($data['phone'])) {
            $update_data['phone'] = $data['phone'];
            $update_format[] = '%s';
        }
        
        if (isset($data['email'])) {
            $update_data['email'] = $data['email'];
            $update_format[] = '%s';
        }
        
        if (isset($data['logo'])) {
            $update_data['logo'] = save_base64_image($data['logo']);
            $update_format[] = '%s';
        }
        
        if (isset($data['coverImage'])) {
            $update_data['cover_image'] = save_base64_image($data['coverImage']);
            $update_format[] = '%s';
        }
        
        if (isset($data['is_active'])) {
            $update_data['is_active'] = $data['is_active'] ? 1 : 0;
            $update_format[] = '%d';
        }
        
        // Actualizar restaurante
        if (!empty($update_data)) {
            $result = $wpdb->update(
                $wpdb->prefix . 'tubarresto_restaurants',
                $update_data,
                ['id' => $restaurant_id],
                $update_format,
                ['%d']
            );
            
            if ($result === false) {
                http_response_code(500);
                echo json_encode(['error' => 'Error al actualizar restaurante']);
                exit;
            }
        }
        
        // Manejar imágenes adicionales
        if (isset($data['images']) && is_array($data['images'])) {
            // Eliminar imágenes existentes de galería
            $wpdb->delete(
                $wpdb->prefix . 'tubarresto_restaurant_images',
                ['restaurant_id' => $restaurant_id, 'image_type' => 'gallery'],
                ['%d', '%s']
            );
            
            // Agregar nuevas imágenes
            foreach ($data['images'] as $image_data) {
                if (!empty($image_data['url']) || !empty($image_data['image_url'])) {
                    $image_url = save_base64_image($image_data['url'] ?? $image_data['image_url']);
                    $wpdb->insert(
                        $wpdb->prefix . 'tubarresto_restaurant_images',
                        [
                            'restaurant_id' => $restaurant_id,
                            'image_url' => $image_url,
                            'image_type' => 'gallery',
                            'alt_text' => isset($image_data['caption']) ? $image_data['caption'] : (isset($image_data['alt_text']) ? $image_data['alt_text'] : null),
                            'sort_order' => isset($image_data['sort_order']) ? $image_data['sort_order'] : 0
                        ],
                        ['%d', '%s', '%s', '%s', '%d']
                    );
                }
            }
        }
        
        // Obtener restaurante actualizado
        $updated_restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d",
            $restaurant_id
        ));
        
        echo json_encode([
            'id' => $updated_restaurant->id,
            'name' => $updated_restaurant->name,
            'description' => $updated_restaurant->description,
            'address' => $updated_restaurant->address,
            'city' => $updated_restaurant->city,
            'phone' => $updated_restaurant->phone,
            'email' => $updated_restaurant->email,
            'logo' => $updated_restaurant->logo,
            'cover_image' => $updated_restaurant->cover_image,
            'coverImage' => $updated_restaurant->cover_image,
            'qr_code' => $updated_restaurant->qr_code,
            'is_active' => (bool) $updated_restaurant->is_active,
            'images' => get_restaurant_images($restaurant_id),
            'tables' => get_restaurant_tables($restaurant_id),
            'createdAt' => $updated_restaurant->created_at
        ]);
        break;
        
    case preg_match('#^/restaurants/(\d+)$#', $path, $matches) && $method === 'DELETE':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        $restaurant_id = $matches[1];
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user['id']
        ));
        
        if (!$restaurant) {
            http_response_code(404);
            echo json_encode(['error' => 'Restaurante no encontrado']);
            exit;
        }
        
        // Eliminar imágenes del restaurante
        $wpdb->delete(
            $wpdb->prefix . 'tubarresto_restaurant_images',
            ['restaurant_id' => $restaurant_id],
            ['%d']
        );
        
        // Eliminar mesas del restaurante
        $wpdb->delete(
            $wpdb->prefix . 'tubarresto_tables',
            ['restaurant_id' => $restaurant_id],
            ['%d']
        );
        
        // Eliminar platos del restaurante
        $wpdb->delete(
            $wpdb->prefix . 'tubarresto_dishes',
            ['restaurant_id' => $restaurant_id],
            ['%d']
        );
        
        // Eliminar restaurante
        $result = $wpdb->delete(
            $wpdb->prefix . 'tubarresto_restaurants',
            ['id' => $restaurant_id],
            ['%d']
        );
        
        if (!$result) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al eliminar restaurante']);
            exit;
        }
        
        echo json_encode(['success' => true]);
        break;
        
    // Rutas de mesas - CORREGIDAS
    case preg_match('#^/restaurants/(\d+)/tables$#', $path, $matches) && $method === 'GET':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        $restaurant_id = $matches[1];
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user['id']
        ));
        
        if (!$restaurant) {
            http_response_code(404);
            echo json_encode(['error' => 'Restaurante no encontrado']);
            exit;
        }
        
        echo json_encode(get_restaurant_tables($restaurant_id));
        break;
        
    case preg_match('#^/restaurants/(\d+)/tables$#', $path, $matches) && $method === 'POST':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        $restaurant_id = $matches[1];
        
        // Log para debugging
        log_to_file("POST /restaurants/$restaurant_id/tables - Datos recibidos", $data);
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user['id']
        ));
        
        if (!$restaurant) {
            http_response_code(404);
            echo json_encode(['error' => 'Restaurante no encontrado']);
            exit;
        }
        
        // Validar datos - CORREGIDO: aceptar ambos formatos
        $table_number = $data['tableNumber'] ?? $data['table_number'] ?? null;
        $seats = $data['seats'] ?? null;
        $location = $data['location'] ?? $data['location_description'] ?? null;
        $is_available = $data['isAvailable'] ?? $data['is_available'] ?? true;
        
        if (!$table_number || !$seats) {
            log_to_file("Error: Faltan datos requeridos", $data);
            http_response_code(400);
            echo json_encode(['error' => 'Número de mesa y asientos son requeridos']);
            exit;
        }
        
        // Verificar que el número de mesa no exista
        $existing_table = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE restaurant_id = %d AND table_number = %s",
            $restaurant_id,
            $table_number
        ));
        
        if ($existing_table) {
            log_to_file("Error: Mesa ya existe", ['tableNumber' => $table_number]);
            http_response_code(400);
            echo json_encode(['error' => 'Ya existe una mesa con ese número']);
            exit;
        }
        
        // Insertar mesa
        $insert_data = [
            'restaurant_id' => $restaurant_id,
            'table_number' => $table_number,
            'seats' => $seats,
            'location_description' => $location,
            'is_available' => $is_available ? 1 : 0
        ];
        
        log_to_file("Insertando mesa con datos", $insert_data);
        
        $result = $wpdb->insert(
            $wpdb->prefix . 'tubarresto_tables',
            $insert_data,
            ['%d', '%s', '%d', '%s', '%d']
        );
        
        if (!$result) {
            $error = $wpdb->last_error;
            log_to_file("Error al insertar mesa", ['error' => $error, 'data' => $insert_data]);
            http_response_code(500);
            echo json_encode(['error' => 'Error al crear mesa: ' . $error]);
            exit;
        }
        
        $table_id = $wpdb->insert_id;
        log_to_file("Mesa creada exitosamente", ['table_id' => $table_id]);
        
        // Obtener la mesa creada
        $table = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE id = %d",
            $table_id
        ));
        
        http_response_code(201);
        echo json_encode([
            'id' => $table->id,
            'table_number' => $table->table_number,
            'tableNumber' => $table->table_number,
            'seats' => (int) $table->seats,
            'location_description' => $table->location_description,
            'location' => $table->location_description,
            'is_available' => (bool) $table->is_available,
            'isAvailable' => (bool) $table->is_available,
            'createdAt' => $table->created_at
        ]);
        break;
        
    case preg_match('#^/restaurants/(\d+)/tables/(\d+)$#', $path, $matches) && $method === 'PUT':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        $restaurant_id = $matches[1];
        $table_id = $matches[2];
        
        // Log para debugging
        log_to_file("PUT /restaurants/$restaurant_id/tables/$table_id - Datos recibidos", $data);
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user['id']
        ));
        
        if (!$restaurant) {
            http_response_code(404);
            echo json_encode(['error' => 'Restaurante no encontrado']);
            exit;
        }
        
        // Verificar que la mesa pertenece al restaurante
        $table = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE id = %d AND restaurant_id = %d",
            $table_id,
            $restaurant_id
        ));
        
        if (!$table) {
            http_response_code(404);
            echo json_encode(['error' => 'Mesa no encontrada']);
            exit;
        }
        
        log_to_file("Mesa actual en BD", [
            'id' => $table->id,
            'table_number' => $table->table_number,
            'seats' => $table->seats,
            'location_description' => $table->location_description,
            'is_available' => $table->is_available
        ]);
        
        // Preparar datos para actualizar - CORREGIDO: aceptar ambos formatos
        $update_data = [];
        $update_format = [];
        
        $table_number = $data['tableNumber'] ?? $data['table_number'] ?? null;
        if ($table_number !== null && $table_number !== '') {
            // Solo verificar duplicados si realmente cambió el número
            if ($table_number !== $table->table_number) {
                log_to_file("Verificando duplicados para nuevo número", [
                    'old_number' => $table->table_number,
                    'new_number' => $table_number,
                    'table_id' => $table_id,
                    'restaurant_id' => $restaurant_id
                ]);
                
                // Verificar que el número de mesa no exista en otra mesa
                $existing_table = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE restaurant_id = %d AND table_number = %s AND id != %d",
                    $restaurant_id,
                    $table_number,
                    $table_id
                ));
                
                if ($existing_table) {
                    log_to_file("Error: Mesa duplicada al actualizar", [
                        'restaurant_id' => $restaurant_id,
                        'table_id' => $table_id,
                        'new_number' => $table_number,
                        'existing_table_id' => $existing_table->id,
                        'existing_table_number' => $existing_table->table_number
                    ]);
                    http_response_code(400);
                    echo json_encode(['error' => "Ya existe una mesa con el número '$table_number' (ID: {$existing_table->id})"]);
                    exit;
                }
                
                log_to_file("No se encontraron duplicados, procediendo con actualización");
            } else {
                log_to_file("Número de mesa no cambió, omitiendo verificación de duplicados");
            }
            
            $update_data['table_number'] = $table_number;
            $update_format[] = '%s';
        }
        
        if (isset($data['seats']) && $data['seats'] !== '') {
            $update_data['seats'] = $data['seats'];
            $update_format[] = '%d';
        }
        
        $location = $data['location'] ?? $data['location_description'] ?? null;
        if ($location !== null) {
            $update_data['location_description'] = $location;
            $update_format[] = '%s';
        }
        
        $is_available = $data['isAvailable'] ?? $data['is_available'] ?? null;
        if ($is_available !== null) {
            $update_data['is_available'] = $is_available ? 1 : 0;
            $update_format[] = '%d';
        }
        
        // Actualizar mesa solo si hay datos para actualizar
        if (!empty($update_data)) {
            log_to_file("Actualizando mesa con datos", $update_data);
            
            $result = $wpdb->update(
                $wpdb->prefix . 'tubarresto_tables',
                $update_data,
                ['id' => $table_id],
                $update_format,
                ['%d']
            );
            
            if ($result === false) {
                $error = $wpdb->last_error;
                log_to_file("Error al actualizar mesa", ['error' => $error, 'data' => $update_data]);
                http_response_code(500);
                echo json_encode(['error' => 'Error al actualizar mesa: ' . $error]);
                exit;
            }
            
            log_to_file("Mesa actualizada exitosamente", ['affected_rows' => $result]);
        } else {
            log_to_file("No hay datos para actualizar, omitiendo actualización");
        }
        
        // Obtener mesa actualizada
        $updated_table = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE id = %d",
            $table_id
        ));
        
        echo json_encode([
            'id' => $updated_table->id,
            'table_number' => $updated_table->table_number,
            'tableNumber' => $updated_table->table_number,
            'seats' => (int) $updated_table->seats,
            'location_description' => $updated_table->location_description,
            'location' => $updated_table->location_description,
            'is_available' => (bool) $updated_table->is_available,
            'isAvailable' => (bool) $updated_table->is_available,
            'createdAt' => $updated_table->created_at
        ]);
        break;
        
    case preg_match('#^/restaurants/(\d+)/tables/(\d+)$#', $path, $matches) && $method === 'DELETE':
        // Verificar autenticación
        $user = verify_token($token);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'No autorizado']);
            exit;
        }
        
        $restaurant_id = $matches[1];
        $table_id = $matches[2];
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user['id']
        ));
        
        if (!$restaurant) {
            http_response_code(404);
            echo json_encode(['error' => 'Restaurante no encontrado']);
            exit;
        }
        
        // Verificar que la mesa pertenece al restaurante
        $table = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE id = %d AND restaurant_id = %d",
            $table_id,
            $restaurant_id
        ));
        
        if (!$table) {
            http_response_code(404);
            echo json_encode(['error' => 'Mesa no encontrada']);
            exit;
        }
        
        // Eliminar mesa
        $result = $wpdb->delete(
            $wpdb->prefix . 'tubarresto_tables',
            ['id' => $table_id],
            ['%d']
        );
        
        if (!$result) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al eliminar mesa']);
            exit;
        }
        
        echo json_encode(['success' => true]);
        break;
        
    // Endpoint de debug para mesas - NUEVO
    case preg_match('#^/debug/restaurants/(\d+)/tables$#', $path, $matches) && $method === 'GET':
        $restaurant_id = $matches[1];
        
        global $wpdb;
        
        // Obtener mesas directamente de la base de datos
        $tables_raw = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}tubarresto_tables WHERE restaurant_id = %d",
            $restaurant_id
        ));
        
        // Obtener información de la tabla
        $table_structure = $wpdb->get_results("DESCRIBE {$wpdb->prefix}tubarresto_tables");
        
        echo json_encode([
            'restaurant_id' => $restaurant_id,
            'table_name' => $wpdb->prefix . 'tubarresto_tables',
            'raw_data' => $tables_raw,
            'table_structure' => $table_structure,
            'count' => count($tables_raw),
            'formatted_data' => get_restaurant_tables($restaurant_id)
        ]);
        break;
        
    // Resto de endpoints (dishes, menu, debug) sin cambios...
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Ruta no encontrada']);
        break;
}
?>
