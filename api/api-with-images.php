<?php
/**
 * API Completa para Tu Bar Resto con soporte de imágenes
 * Funciones: Registro, Login, Restaurantes e Imágenes
 */

// Evitar errores que afecten los headers
@ini_set('display_errors', 0);
error_reporting(0);

// Configuración CORS
$allowed_origins = [
    'http://localhost:3000',
    'http://tubarresto.somediave.com',
    'https://tubarresto.somediave.com',
    'https://tubarresto.vercel.app',
    'https://www.tubarresto.com'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Solo establecer Content-Type para respuestas JSON
if (!isset($_GET['action']) || $_GET['action'] !== 'upload-image') {
    header("Content-Type: application/json");
}

// Incluir WordPress
require_once('wp-load.php');

// Configuración de upload
define('UPLOAD_DIR', wp_upload_dir()['basedir'] . '/tubarresto/');
define('UPLOAD_URL', wp_upload_dir()['baseurl'] . '/tubarresto/');

// Crear directorio de upload si no existe
if (!file_exists(UPLOAD_DIR)) {
    wp_mkdir_p(UPLOAD_DIR);
}

// Obtener datos de la petición
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$data = json_decode(file_get_contents('php://input'), true) ?: [];

// Función para generar token JWT simple
function generate_token($user_id, $email, $name) {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = [
        'id' => $user_id,
        'email' => $email,
        'name' => $name,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 días
    ];
    
    $secret = 'TuBarResto2025SecretKey';
    
    $base64_header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($header)));
    $base64_payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    
    $signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);
    $base64_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64_header . '.' . $base64_payload . '.' . $base64_signature;
}

// Función para verificar token
function verify_token($token) {
    if (empty($token)) return false;
    
    $parts = explode('.', $token);
    if (count($parts) != 3) return false;
    
    try {
        $payload_json = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $payload = json_decode($payload_json, true);
        
        if (!$payload || !isset($payload['id']) || !isset($payload['email'])) {
            return false;
        }
        
        // Verificar que el usuario existe
        global $wpdb;
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_users WHERE id = %d AND email = %s",
            $payload['id'],
            $payload['email']
        ));
        
        return $user ? $payload : false;
    } catch (Exception $e) {
        return false;
    }
}

// Función para respuesta exitosa
function send_success($data, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

// Función para respuesta de error
function send_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// Función para procesar imagen
function process_image($file_path, $max_width = 1920, $max_height = 1080, $quality = 85) {
    $image_info = getimagesize($file_path);
    if (!$image_info) return false;
    
    $width = $image_info[0];
    $height = $image_info[1];
    $mime_type = $image_info['mime'];
    
    // Si la imagen ya es del tamaño correcto, no hacer nada
    if ($width <= $max_width && $height <= $max_height) {
        return [
            'width' => $width,
            'height' => $height,
            'processed' => false
        ];
    }
    
    // Calcular nuevas dimensiones manteniendo proporción
    $ratio = min($max_width / $width, $max_height / $height);
    $new_width = round($width * $ratio);
    $new_height = round($height * $ratio);
    
    // Crear imagen desde archivo
    switch ($mime_type) {
        case 'image/jpeg':
            $source = imagecreatefromjpeg($file_path);
            break;
        case 'image/png':
            $source = imagecreatefrompng($file_path);
            break;
        case 'image/webp':
            $source = imagecreatefromwebp($file_path);
            break;
        default:
            return false;
    }
    
    if (!$source) return false;
    
    // Crear nueva imagen redimensionada
    $destination = imagecreatetruecolor($new_width, $new_height);
    
    // Preservar transparencia para PNG
    if ($mime_type === 'image/png') {
        imagealphablending($destination, false);
        imagesavealpha($destination, true);
        $transparent = imagecolorallocatealpha($destination, 255, 255, 255, 127);
        imagefilledrectangle($destination, 0, 0, $new_width, $new_height, $transparent);
    }
    
    // Redimensionar
    imagecopyresampled($destination, $source, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
    
    // Guardar imagen procesada
    switch ($mime_type) {
        case 'image/jpeg':
            imagejpeg($destination, $file_path, $quality);
            break;
        case 'image/png':
            imagepng($destination, $file_path, round(9 * (100 - $quality) / 100));
            break;
        case 'image/webp':
            imagewebp($destination, $file_path, $quality);
            break;
    }
    
    // Limpiar memoria
    imagedestroy($source);
    imagedestroy($destination);
    
    return [
        'width' => $new_width,
        'height' => $new_height,
        'processed' => true
    ];
}

// Obtener token de autorización
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = '';

if (strpos($auth_header, 'Bearer ') === 0) {
    $token = substr($auth_header, 7);
}

// Manejar las rutas
switch ($action) {
    
    // REGISTRO DE USUARIO (sin cambios)
    case 'register':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Validar campos requeridos
        $required_fields = ['nombre', 'apellido', 'email', 'telefono', 'nombreRestaurante', 'direccion', 'ciudad'];
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                send_error("El campo {$field} es requerido");
            }
        }
        
        // Validar email
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            send_error('Email inválido');
        }
        
        // Verificar si el email ya existe
        global $wpdb;
        $existing_user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_users WHERE email = %s",
            $data['email']
        ));
        
        if ($existing_user) {
            send_error('El email ya está registrado', 409);
        }
        
        // Generar contraseña temporal
        $temp_password = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);
        $hashed_password = password_hash($temp_password, PASSWORD_DEFAULT);
        
        // Insertar usuario
        $result = $wpdb->insert(
            'kvq_tubarresto_users',
            [
                'email' => $data['email'],
                'password' => $hashed_password,
                'first_name' => $data['nombre'],
                'last_name' => $data['apellido'],
                'phone' => $data['telefono'],
                'status' => 'active',
                'email_verified' => true
            ],
            ['%s', '%s', '%s', '%s', '%s', '%s', '%d']
        );
        
        if (!$result) {
            send_error('Error al registrar usuario', 500);
        }
        
        $user_id = $wpdb->insert_id;
        
        // Crear slug único para el restaurante
        $slug = strtolower(str_replace(' ', '-', $data['nombreRestaurante']));
        $slug = preg_replace('/[^a-z0-9-]/', '', $slug);
        
        // Verificar que el slug sea único
        $slug_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM kvq_tubarresto_restaurants WHERE slug = %s",
            $slug
        ));
        
        if ($slug_count > 0) {
            $slug .= '-' . $user_id;
        }
        
        // Crear restaurante por defecto
        $restaurant_result = $wpdb->insert(
            'kvq_tubarresto_restaurants',
            [
                'user_id' => $user_id,
                'name' => $data['nombreRestaurante'],
                'slug' => $slug,
                'address' => $data['direccion'],
                'city' => $data['ciudad'],
                'phone' => $data['telefono'],
                'email' => $data['email'],
                'status' => 'trial',
                'trial_start_date' => current_time('mysql'),
                'trial_end_date' => date('Y-m-d H:i:s', strtotime('+30 days'))
            ],
            ['%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s']
        );
        
        if (!$restaurant_result) {
            // Si falla crear el restaurante, eliminar el usuario
            $wpdb->delete('kvq_tubarresto_users', ['id' => $user_id], ['%d']);
            send_error('Error al crear restaurante', 500);
        }
        
        send_success([
            'message' => 'Registro exitoso',
            'user_id' => $user_id,
            'email' => $data['email'],
            'temp_password' => $temp_password,
            'trial_days' => 30
        ], 201);
        break;
    
    // LOGIN DE USUARIO (actualizado para incluir imágenes)
    case 'login':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Validar campos
        if (empty($data['email']) || empty($data['password'])) {
            send_error('Email y contraseña son requeridos');
        }
        
        // Buscar usuario
        global $wpdb;
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_users WHERE email = %s",
            $data['email']
        ));
        
        if (!$user) {
            send_error('Credenciales incorrectas', 401);
        }
        
        // Verificar contraseña
        if (!password_verify($data['password'], $user->password)) {
            send_error('Credenciales incorrectas', 401);
        }
        
        // Verificar estado de la cuenta
        if ($user->status !== 'active') {
            send_error('Cuenta inactiva', 403);
        }
        
        // Actualizar último login
        $wpdb->update(
            'kvq_tubarresto_users',
            ['last_login' => current_time('mysql')],
            ['id' => $user->id],
            ['%s'],
            ['%d']
        );
        
        // Generar token
        $token = generate_token($user->id, $user->email, $user->first_name . ' ' . $user->last_name);
        
        // Obtener restaurantes del usuario con imágenes
        $restaurants = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, 
                    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images ri WHERE ri.restaurant_id = r.id AND ri.is_active = 1) as total_images
             FROM kvq_tubarresto_restaurants r 
             WHERE r.user_id = %d 
             ORDER BY r.created_at DESC",
            $user->id
        ));
        
        // Para cada restaurante, obtener sus imágenes
        foreach ($restaurants as &$restaurant) {
            $images = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurant_images 
                 WHERE restaurant_id = %d AND is_active = 1 
                 ORDER BY category, is_primary DESC, sort_order ASC",
                $restaurant->id
            ));
            
            $restaurant->images = array_map(function($img) {
                return [
                    'id' => $img->id,
                    'title' => $img->title,
                    'description' => $img->description,
                    'url' => $img->url,
                    'category' => $img->category,
                    'isPrimary' => (bool) $img->is_primary,
                    'createdAt' => $img->created_at
                ];
            }, $images);
        }
        
        send_success([
            'message' => 'Login exitoso',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'phone' => $user->phone,
                'status' => $user->status,
                'email_verified' => (bool) $user->email_verified
            ],
            'restaurants' => array_map(function($r) {
                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'slug' => $r->slug,
                    'description' => $r->description,
                    'address' => $r->address,
                    'city' => $r->city,
                    'phone' => $r->phone,
                    'email' => $r->email,
                    'status' => $r->status,
                    'trial_start_date' => $r->trial_start_date,
                    'trial_end_date' => $r->trial_end_date,
                    'logo_url' => $r->logo_url,
                    'cover_image_url' => $r->cover_image_url,
                    'images' => $r->images,
                    'total_images' => (int) $r->total_images
                ];
            }, $restaurants),
            'token' => $token
        ]);
        break;
    
    // ACTUALIZAR RESTAURANTE (actualizado para incluir imágenes)
    case 'update-restaurant':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['id']) || empty($data['name']) || empty($data['address']) || empty($data['city'])) {
            send_error('ID, nombre, dirección y ciudad son requeridos');
        }
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $data['id'],
            $user_data['id']
        ));
        
        if (!$restaurant) {
            send_error('Restaurante no encontrado o no autorizado', 404);
        }
        
        // Preparar datos para actualizar
        $update_data = [
            'name' => $data['name'],
            'description' => isset($data['description']) ? $data['description'] : null,
            'address' => $data['address'],
            'city' => $data['city'],
            'phone' => isset($data['phone']) ? $data['phone'] : null,
            'email' => isset($data['email']) ? $data['email'] : null,
            'updated_at' => current_time('mysql')
        ];
        
        // Agregar URLs de imágenes si están presentes
        if (isset($data['logo_url'])) {
            $update_data['logo_url'] = $data['logo_url'];
            $update_data['images_updated_at'] = current_time('mysql');
        }
        
        if (isset($data['cover_image_url'])) {
            $update_data['cover_image_url'] = $data['cover_image_url'];
            $update_data['images_updated_at'] = current_time('mysql');
        }
        
        // Actualizar restaurante
        $result = $wpdb->update(
            'kvq_tubarresto_restaurants',
            $update_data,
            ['id' => $data['id']],
            array_fill(0, count($update_data), '%s'),
            ['%d']
        );
        
        if ($result === false) {
            send_error('Error al actualizar restaurante', 500);
        }
        
        // Obtener el restaurante actualizado
        $updated_restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d",
            $data['id']
        ));
        
        send_success([
            'message' => 'Restaurante actualizado exitosamente',
            'restaurant' => [
                'id' => $updated_restaurant->id,
                'name' => $updated_restaurant->name,
                'slug' => $updated_restaurant->slug,
                'description' => $updated_restaurant->description,
                'address' => $updated_restaurant->address,
                'city' => $updated_restaurant->city,
                'phone' => $updated_restaurant->phone,
                'email' => $updated_restaurant->email,
                'status' => $updated_restaurant->status,
                'trial_start_date' => $updated_restaurant->trial_start_date,
                'trial_end_date' => $updated_restaurant->trial_end_date,
                'logo_url' => $updated_restaurant->logo_url,
                'cover_image_url' => $updated_restaurant->cover_image_url,
                'created_at' => $updated_restaurant->created_at,
                'updated_at' => $updated_restaurant->updated_at
            ]
        ]);
        break;
    
    // SUBIR IMAGEN
    case 'upload-image':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Verificar que se subió un archivo
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            send_error('No se subió ningún archivo o hubo un error');
        }
        
        $file = $_FILES['image'];
        $restaurant_id = isset($_POST['restaurant_id']) ? (int)$_POST['restaurant_id'] : 0;
        $category = isset($_POST['category']) ? $_POST['category'] : 'other';
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user_data['id']
        ));
        
        if (!$restaurant) {
            send_error('Restaurante no encontrado o no autorizado', 404);
        }
        
        // Obtener configuración de upload
        $upload_settings = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_upload_settings WHERE restaurant_id = %d",
            $restaurant_id
        ));
        
        if (!$upload_settings) {
            // Crear configuración por defecto
            $wpdb->insert(
                'kvq_tubarresto_upload_settings',
                ['restaurant_id' => $restaurant_id],
                ['%d']
            );
            $upload_settings = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_upload_settings WHERE restaurant_id = %d",
                $restaurant_id
            ));
        }
        
        // Validar archivo
        $allowed_types = json_decode($upload_settings->allowed_formats, true);
        if (!in_array($file['type'], $allowed_types)) {
            send_error('Tipo de archivo no permitido');
        }
        
        if ($file['size'] > $upload_settings->max_file_size) {
            send_error('El archivo es muy grande. Máximo: ' . round($upload_settings->max_file_size / 1024 / 1024, 1) . 'MB');
        }
        
        // Generar nombre único
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'restaurant_' . $restaurant_id . '_' . time() . '_' . uniqid() . '.' . $extension;
        $file_path = UPLOAD_DIR . $filename;
        
        // Mover archivo
        if (!move_uploaded_file($file['tmp_name'], $file_path)) {
            send_error('Error al guardar el archivo', 500);
        }
        
        // Procesar imagen
        $image_info = process_image(
            $file_path, 
            $upload_settings->max_width, 
            $upload_settings->max_height, 
            $upload_settings->image_quality
        );
        
        if (!$image_info) {
            unlink($file_path);
            send_error('Error al procesar la imagen', 500);
        }
        
        $file_url = UPLOAD_URL . $filename;
        
        send_success([
            'message' => 'Imagen subida exitosamente',
            'image' => [
                'url' => $file_url,
                'filename' => $filename,
                'original_name' => $file['name'],
                'size' => filesize($file_path),
                'mime_type' => $file['type'],
                'width' => $image_info['width'],
                'height' => $image_info['height'],
                'processed' => $image_info['processed']
            ]
        ], 201);
        break;
    
    // AGREGAR IMAGEN A GALERÍA
    case 'add-restaurant-image':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['restaurant_id']) || empty($data['url']) || empty($data['title'])) {
            send_error('restaurant_id, url y title son requeridos');
        }
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $data['restaurant_id'],
            $user_data['id']
        ));
        
        if (!$restaurant) {
            send_error('Restaurante no encontrado o no autorizado', 404);
        }
        
        // Si es imagen principal, desmarcar otras de la misma categoría
        if (isset($data['is_primary']) && $data['is_primary']) {
            $wpdb->update(
                'kvq_tubarresto_restaurant_images',
                ['is_primary' => 0],
                [
                    'restaurant_id' => $data['restaurant_id'],
                    'category' => $data['category'] ?? 'other'
                ],
                ['%d'],
                ['%d', '%s']
            );
        }
        
        // Insertar imagen
        $result = $wpdb->insert(
            'kvq_tubarresto_restaurant_images',
            [
                'restaurant_id' => $data['restaurant_id'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'url' => $data['url'],
                'category' => $data['category'] ?? 'other',
                'is_primary' => isset($data['is_primary']) ? (bool)$data['is_primary'] : false,
                'file_name' => $data['file_name'] ?? null,
                'file_size' => $data['file_size'] ?? null,
                'mime_type' => $data['mime_type'] ?? null,
                'width' => $data['width'] ?? null,
                'height' => $data['height'] ?? null,
                'sort_order' => $data['sort_order'] ?? 0
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%s', '%d', '%d', '%d']
        );
        
        if (!$result) {
            send_error('Error al agregar imagen', 500);
        }
        
        $image_id = $wpdb->insert_id;
        
        // Obtener la imagen creada
        $image = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images WHERE id = %d",
            $image_id
        ));
        
        send_success([
            'message' => 'Imagen agregada exitosamente',
            'image' => [
                'id' => $image->id,
                'title' => $image->title,
                'description' => $image->description,
                'url' => $image->url,
                'category' => $image->category,
                'isPrimary' => (bool) $image->is_primary,
                'createdAt' => $image->created_at
            ]
        ], 201);
        break;
    
    // OBTENER IMÁGENES DE RESTAURANTE
    case 'get-restaurant-images':
        if ($method !== 'GET') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        $restaurant_id = isset($_GET['restaurant_id']) ? (int)$_GET['restaurant_id'] : 0;
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id,
            $user_data['id']
        ));
        
        if (!$restaurant) {
            send_error('Restaurante no encontrado o no autorizado', 404);
        }
        
        // Obtener imágenes
        $images = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images 
             WHERE restaurant_id = %d AND is_active = 1 
             ORDER BY category, is_primary DESC, sort_order ASC",
            $restaurant_id
        ));
        
        send_success([
            'images' => array_map(function($img) {
                return [
                    'id' => $img->id,
                    'title' => $img->title,
                    'description' => $img->description,
                    'url' => $img->url,
                    'category' => $img->category,
                    'isPrimary' => (bool) $img->is_primary,
                    'fileSize' => $img->file_size,
                    'mimeType' => $img->mime_type,
                    'width' => $img->width,
                    'height' => $img->height,
                    'createdAt' => $img->created_at
                ];
            }, $images)
        ]);
        break;
    
    // ACTUALIZAR IMAGEN
    case 'update-restaurant-image':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['id'])) {
            send_error('ID de imagen es requerido');
        }
        
        // Verificar que la imagen pertenece a un restaurante del usuario
        global $wpdb;
        $image = $wpdb->get_row($wpdb->prepare(
            "SELECT ri.*, r.user_id 
             FROM kvq_tubarresto_restaurant_images ri
             JOIN kvq_tubarresto_restaurants r ON ri.restaurant_id = r.id
             WHERE ri.id = %d AND r.user_id = %d",
            $data['id'],
            $user_data['id']
        ));
        
        if (!$image) {
            send_error('Imagen no encontrada o no autorizada', 404);
        }
        
        // Si se marca como principal, desmarcar otras de la misma categoría
        if (isset($data['is_primary']) && $data['is_primary']) {
            $wpdb->update(
                'kvq_tubarresto_restaurant_images',
                ['is_primary' => 0],
                [
                    'restaurant_id' => $image->restaurant_id,
                    'category' => $data['category'] ?? $image->category
                ],
                ['%d'],
                ['%d', '%s']
            );
        }
        
        // Actualizar imagen
        $update_data = [];
        if (isset($data['title'])) $update_data['title'] = $data['title'];
        if (isset($data['description'])) $update_data['description'] = $data['description'];
        if (isset($data['category'])) $update_data['category'] = $data['category'];
        if (isset($data['is_primary'])) $update_data['is_primary'] = (bool)$data['is_primary'];
        if (isset($data['sort_order'])) $update_data['sort_order'] = (int)$data['sort_order'];
        
        if (!empty($update_data)) {
            $update_data['updated_at'] = current_time('mysql');
            
            $result = $wpdb->update(
                'kvq_tubarresto_restaurant_images',
                $update_data,
                ['id' => $data['id']],
                array_fill(0, count($update_data), '%s'),
                ['%d']
            );
            
            if ($result === false) {
                send_error('Error al actualizar imagen', 500);
            }
        }
        
        // Obtener imagen actualizada
        $updated_image = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images WHERE id = %d",
            $data['id']
        ));
        
        send_success([
            'message' => 'Imagen actualizada exitosamente',
            'image' => [
                'id' => $updated_image->id,
                'title' => $updated_image->title,
                'description' => $updated_image->description,
                'url' => $updated_image->url,
                'category' => $updated_image->category,
                'isPrimary' => (bool) $updated_image->is_primary,
                'createdAt' => $updated_image->created_at,
                'updatedAt' => $updated_image->updated_at
            ]
        ]);
        break;
    
    // ELIMINAR IMAGEN
    case 'delete-restaurant-image':
        if ($method !== 'DELETE') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        $image_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        // Verificar que la imagen pertenece a un restaurante del usuario
        global $wpdb;
        $image = $wpdb->get_row($wpdb->prepare(
            "SELECT ri.*, r.user_id 
             FROM kvq_tubarresto_restaurant_images ri
             JOIN kvq_tubarresto_restaurants r ON ri.restaurant_id = r.id
             WHERE ri.id = %d AND r.user_id = %d",
            $image_id,
            $user_data['id']
        ));
        
        if (!$image) {
            send_error('Imagen no encontrada o no autorizada', 404);
        }
        
        // Eliminar archivo físico si existe
        $filename = basename($image->url);
        $file_path = UPLOAD_DIR . $filename;
        if (file_exists($file_path)) {
            unlink($file_path);
        }
        
        // Eliminar registro de la base de datos
        $result = $wpdb->delete(
            'kvq_tubarresto_restaurant_images',
            ['id' => $image_id],
            ['%d']
        );
        
        if (!$result) {
            send_error('Error al eliminar imagen', 500);
        }
        
        send_success([
            'message' => 'Imagen eliminada exitosamente'
        ]);
        break;
    
    // ESTADO DE LA API (actualizado)
    case 'status':
        if ($method !== 'GET') {
            send_error('Método no permitido', 405);
        }
        
        global $wpdb;
        
        // Verificar que las tablas existen
        $users_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_users'") === 'kvq_tubarresto_users';
        $restaurants_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_restaurants'") === 'kvq_tubarresto_restaurants';
        $images_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_restaurant_images'") === 'kvq_tubarresto_restaurant_images';
        $upload_settings_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_upload_settings'") === 'kvq_tubarresto_upload_settings';
        
        $users_count = $users_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_users") : 0;
        $restaurants_count = $restaurants_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_restaurants") : 0;
        $images_count = $images_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images WHERE is_active = 1") : 0;
        
        // Verificar directorio de upload
        $upload_dir_exists = file_exists(UPLOAD_DIR);
        $upload_dir_writable = is_writable(UPLOAD_DIR);
        
        send_success([
            'status' => 'ok',
            'message' => 'Tu Bar Resto API con soporte de imágenes funcionando correctamente',
            'database' => [
                'users_table_exists' => $users_table_exists,
                'restaurants_table_exists' => $restaurants_table_exists,
                'images_table_exists' => $images_table_exists,
                'upload_settings_table_exists' => $upload_settings_table_exists,
                'users_count' => (int) $users_count,
                'restaurants_count' => (int) $restaurants_count,
                'images_count' => (int) $images_count
            ],
            'upload' => [
                'directory_exists' => $upload_dir_exists,
                'directory_writable' => $upload_dir_writable,
                'upload_dir' => UPLOAD_DIR,
                'upload_url' => UPLOAD_URL
            ],
            'timestamp' => current_time('mysql')
        ]);
        break;
    
    default:
        send_error('Endpoint no encontrado', 404);
        break;
}
?>
