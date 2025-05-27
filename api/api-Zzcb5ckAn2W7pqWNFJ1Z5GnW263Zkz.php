<?php
/**
 * API Actualizada para Tu Bar Resto con soporte completo de imágenes
 * Funciones: Registro, Login, Restaurantes e Imágenes como archivos
 * Actualizada para trabajar con la base de datos existente
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

// Incluir WordPress para configuración
require_once('wp-load.php');

// Configuración de directorios
$wp_upload_dir = wp_upload_dir();
$base_upload_dir = $wp_upload_dir['basedir'] . '/tubarresto';
$base_upload_url = $wp_upload_dir['baseurl'] . '/tubarresto';

// Crear directorio base si no existe
if (!file_exists($base_upload_dir)) {
    wp_mkdir_p($base_upload_dir);
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

// Función para generar nombre de archivo único
function generate_unique_filename($restaurant_id, $category, $original_name) {
    $file_extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
    $base_name = 'tubarresto_' . $restaurant_id . '_' . $category . '_' . time() . '_' . uniqid();
    
    return $base_name . '.' . $file_extension;
}

// Función para crear directorio de restaurante
function create_restaurant_directory($restaurant_id) {
    global $base_upload_dir;
    
    $restaurant_dir = $base_upload_dir . '/restaurant_' . $restaurant_id;
    $year_month = date('Y/m');
    $full_dir = $restaurant_dir . '/' . $year_month;
    
    if (!file_exists($full_dir)) {
        wp_mkdir_p($full_dir);
    }
    
    return $full_dir;
}

// Función para obtener URL del archivo
function get_file_url($file_path) {
    global $base_upload_dir, $base_upload_url;
    
    return str_replace($base_upload_dir, $base_upload_url, $file_path);
}

// Función para redimensionar imagen
function resize_image($source_path, $destination_path, $max_width, $max_height, $quality = 85) {
    $image_info = getimagesize($source_path);
    if (!$image_info) return false;
    
    $mime_type = $image_info['mime'];
    $original_width = $image_info[0];
    $original_height = $image_info[1];
    
    // Calcular nuevas dimensiones manteniendo proporción
    $ratio = min($max_width / $original_width, $max_height / $original_height);
    $new_width = round($original_width * $ratio);
    $new_height = round($original_height * $ratio);
    
    // Crear imagen desde el archivo fuente
    switch ($mime_type) {
        case 'image/jpeg':
            $source_image = imagecreatefromjpeg($source_path);
            break;
        case 'image/png':
            $source_image = imagecreatefrompng($source_path);
            break;
        case 'image/webp':
            $source_image = imagecreatefromwebp($source_path);
            break;
        case 'image/gif':
            $source_image = imagecreatefromgif($source_path);
            break;
        default:
            return false;
    }
    
    if (!$source_image) return false;
    
    // Crear nueva imagen redimensionada
    $new_image = imagecreatetruecolor($new_width, $new_height);
    
    // Preservar transparencia para PNG y GIF
    if ($mime_type == 'image/png' || $mime_type == 'image/gif') {
        imagealphablending($new_image, false);
        imagesavealpha($new_image, true);
        $transparent = imagecolorallocatealpha($new_image, 255, 255, 255, 127);
        imagefilledrectangle($new_image, 0, 0, $new_width, $new_height, $transparent);
    }
    
    // Redimensionar
    imagecopyresampled($new_image, $source_image, 0, 0, 0, 0, $new_width, $new_height, $original_width, $original_height);
    
    // Guardar imagen redimensionada
    $result = false;
    switch ($mime_type) {
        case 'image/jpeg':
            $result = imagejpeg($new_image, $destination_path, $quality);
            break;
        case 'image/png':
            $result = imagepng($new_image, $destination_path, round(9 * (100 - $quality) / 100));
            break;
        case 'image/webp':
            $result = imagewebp($new_image, $destination_path, $quality);
            break;
        case 'image/gif':
            $result = imagegif($new_image, $destination_path);
            break;
    }
    
    // Limpiar memoria
    imagedestroy($source_image);
    imagedestroy($new_image);
    
    return $result ? ['width' => $new_width, 'height' => $new_height] : false;
}

// Función para subir y procesar imagen
function upload_and_process_image($file, $restaurant_id, $category = 'other') {
    global $wpdb;
    
    // Validar archivo
    $allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('Tipo de archivo no permitido');
    }
    
    // Obtener configuración de upload
    $settings = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM kvq_tubarresto_upload_settings WHERE restaurant_id = %d",
        $restaurant_id
    ));
    
    if (!$settings) {
        throw new Exception('Configuración de upload no encontrada');
    }
    
    // Validar tamaño
    if ($file['size'] > $settings->max_file_size) {
        throw new Exception('El archivo es demasiado grande. Máximo: ' . round($settings->max_file_size / 1024 / 1024, 2) . 'MB');
    }
    
    // Validar formato
    $allowed_formats = explode(',', $settings->allowed_formats);
    if (!in_array($file['type'], $allowed_formats)) {
        throw new Exception('Formato no permitido');
    }
    
    // Crear directorio
    $upload_dir = create_restaurant_directory($restaurant_id);
    
    // Generar nombre único
    $unique_filename = generate_unique_filename($restaurant_id, $category, $file['name']);
    $file_path = $upload_dir . '/' . $unique_filename;
    
    // Mover archivo subido
    if (!move_uploaded_file($file['tmp_name'], $file_path)) {
        throw new Exception('Error al mover el archivo');
    }
    
    // Obtener dimensiones de la imagen
    $image_info = getimagesize($file_path);
    $width = $image_info ? $image_info[0] : null;
    $height = $image_info ? $image_info[1] : null;
    
    // Generar thumbnails si está habilitado
    $thumbnails = [];
    if ($settings->generate_thumbnails && $image_info) {
        $thumbnail_sizes_str = $settings->thumbnail_sizes;
        $thumbnail_pairs = explode(',', $thumbnail_sizes_str);
        
        foreach ($thumbnail_pairs as $pair) {
            $parts = explode(':', $pair);
            if (count($parts) == 2) {
                $size_name = trim($parts[0]);
                $dimensions_str = trim($parts[1]);
                $dimensions = explode('x', $dimensions_str);
                
                if (count($dimensions) == 2) {
                    $thumb_width = (int)$dimensions[0];
                    $thumb_height = (int)$dimensions[1];
                    
                    $thumb_filename = pathinfo($unique_filename, PATHINFO_FILENAME) . '_' . $size_name . '.' . pathinfo($unique_filename, PATHINFO_EXTENSION);
                    $thumb_path = $upload_dir . '/' . $thumb_filename;
                    
                    $thumb_result = resize_image($file_path, $thumb_path, $thumb_width, $thumb_height, $settings->image_quality);
                    
                    if ($thumb_result) {
                        $thumbnails[$size_name] = [
                            'file_path' => $thumb_path,
                            'file_url' => get_file_url($thumb_path),
                            'width' => $thumb_result['width'],
                            'height' => $thumb_result['height']
                        ];
                    }
                }
            }
        }
    }
    
    return [
        'file_name' => $unique_filename,
        'original_name' => $file['name'],
        'file_path' => $file_path,
        'file_url' => get_file_url($file_path),
        'file_size' => filesize($file_path),
        'mime_type' => $file['type'],
        'width' => $width,
        'height' => $height,
        'thumbnails' => $thumbnails
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
    
    // REGISTRO DE USUARIO (sin cambios - mantiene compatibilidad)
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
            // Obtener galería de imágenes
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
                    'url' => $img->file_url,
                    'category' => $img->category,
                    'isPrimary' => (bool) $img->is_primary,
                    'width' => $img->width,
                    'height' => $img->height,
                    'fileSize' => $img->file_size,
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
    
    // AGREGAR RESTAURANTE
    case 'add-restaurant':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['name']) || empty($data['address']) || empty($data['city'])) {
            send_error('Nombre, dirección y ciudad son requeridos');
        }
        
        global $wpdb;
        
        // Crear slug único para el restaurante
        $slug = strtolower(str_replace(' ', '-', $data['name']));
        $slug = preg_replace('/[^a-z0-9-]/', '', $slug);
        
        // Verificar que el slug sea único
        $slug_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM kvq_tubarresto_restaurants WHERE slug = %s",
            $slug
        ));
        
        if ($slug_count > 0) {
            $slug .= '-' . $user_data['id'] . '-' . time();
        }
        
        // Insertar restaurante
        $result = $wpdb->insert(
            'kvq_tubarresto_restaurants',
            [
                'user_id' => $user_data['id'],
                'name' => $data['name'],
                'slug' => $slug,
                'description' => $data['description'] ?? null,
                'address' => $data['address'],
                'city' => $data['city'],
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'status' => 'trial',
                'trial_start_date' => current_time('mysql'),
                'trial_end_date' => date('Y-m-d H:i:s', strtotime('+30 days'))
            ],
            ['%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s']
        );
        
        if (!$result) {
            send_error('Error al crear restaurante', 500);
        }
        
        $restaurant_id = $wpdb->insert_id;
        
        // Obtener el restaurante creado
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d",
            $restaurant_id
        ));
        
        send_success([
            'message' => 'Restaurante creado exitosamente',
            'restaurant' => [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'slug' => $restaurant->slug,
                'description' => $restaurant->description,
                'address' => $restaurant->address,
                'city' => $restaurant->city,
                'phone' => $restaurant->phone,
                'email' => $restaurant->email,
                'status' => $restaurant->status,
                'trial_start_date' => $restaurant->trial_start_date,
                'trial_end_date' => $restaurant->trial_end_date,
                'logo_url' => $restaurant->logo_url,
                'cover_image_url' => $restaurant->cover_image_url,
                'images' => [],
                'total_images' => 0
            ]
        ], 201);
        break;
    
    // SUBIR IMAGEN COMO ARCHIVO
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
        
        try {
            // Subir y procesar imagen
            $upload_result = upload_and_process_image($file, $restaurant_id, $category);
            
            send_success([
                'message' => 'Imagen subida exitosamente',
                'image' => [
                    'file_name' => $upload_result['file_name'],
                    'original_name' => $upload_result['original_name'],
                    'url' => $upload_result['file_url'],
                    'file_size' => $upload_result['file_size'],
                    'mime_type' => $upload_result['mime_type'],
                    'width' => $upload_result['width'],
                    'height' => $upload_result['height'],
                    'category' => $category,
                    'restaurant_id' => $restaurant_id,
                    'thumbnails' => $upload_result['thumbnails']
                ]
            ], 201);
            
        } catch (Exception $e) {
            send_error('Error al subir imagen: ' . $e->getMessage(), 500);
        }
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
        if (empty($data['restaurant_id']) || empty($data['file_name']) || empty($data['title'])) {
            send_error('restaurant_id, file_name y title son requeridos');
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
        
        // Insertar imagen en galería
        $result = $wpdb->insert(
            'kvq_tubarresto_restaurant_images',
            [
                'restaurant_id' => $data['restaurant_id'],
                'file_name' => $data['file_name'],
                'original_name' => $data['original_name'] ?? $data['file_name'],
                'file_path' => $data['file_path'],
                'file_url' => $data['file_url'],
                'file_size' => $data['file_size'] ?? 0,
                'mime_type' => $data['mime_type'] ?? 'image/jpeg',
                'width' => $data['width'] ?? null,
                'height' => $data['height'] ?? null,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'alt_text' => $data['alt_text'] ?? null,
                'category' => $data['category'] ?? 'other',
                'is_primary' => isset($data['is_primary']) ? (bool)$data['is_primary'] : false,
                'sort_order' => $data['sort_order'] ?? 0,
                'display_settings' => isset($data['display_settings']) ? json_encode($data['display_settings']) : null
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s']
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
                'url' => $image->file_url,
                'category' => $image->category,
                'isPrimary' => (bool) $image->is_primary,
                'width' => $image->width,
                'height' => $image->height,
                'fileSize' => $image->file_size,
                'createdAt' => $image->created_at
            ]
        ], 201);
        break;
    
    // ACTUALIZAR LOGO O IMAGEN DE PORTADA
    case 'update-restaurant-main-image':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['restaurant_id']) || empty($data['image_url']) || empty($data['type'])) {
            send_error('restaurant_id, image_url y type son requeridos');
        }
        
        if (!in_array($data['type'], ['logo', 'cover'])) {
            send_error('type debe ser "logo" o "cover"');
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
        
        // Actualizar el campo correspondiente
        $field = $data['type'] === 'logo' ? 'logo_url' : 'cover_image_url';
        
        $result = $wpdb->update(
            'kvq_tubarresto_restaurants',
            [
                $field => $data['image_url'],
                'images_updated_at' => current_time('mysql')
            ],
            ['id' => $data['restaurant_id']],
            ['%s', '%s'],
            ['%d']
        );
        
        if ($result === false) {
            send_error('Error al actualizar imagen', 500);
        }
        
        send_success([
            'message' => ucfirst($data['type']) . ' actualizado exitosamente',
            'image' => [
                'type' => $data['type'],
                'url' => $data['image_url']
            ]
        ]);
        break;
    
    // ACTUALIZAR RESTAURANTE
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
        if (empty($data['id'])) {
            send_error('El ID del restaurante es requerido');
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
            'description' => $data['description'] ?? null,
            'address' => $data['address'],
            'city' => $data['city'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'logo_url' => $data['logo_url'] ?? null,
            'cover_image_url' => $data['cover_image_url'] ?? null,
            'updated_at' => current_time('mysql')
        ];
    
        // Filtrar campos vacíos
        $update_data = array_filter($update_data, function($value) {
            return $value !== '';
        });
    
        // Formatos
        $formats = ['%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s'];
    
        // Actualizar restaurante
        $result = $wpdb->update(
            'kvq_tubarresto_restaurants',
            $update_data,
            ['id' => $data['id']],
            $formats,
            ['%d']
        );
    
        if ($result === false) {
            send_error('Error al actualizar restaurante', 500);
        }
    
        // Obtener el restaurante actualizado
        $updated_restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT r.*, 
                    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images ri WHERE ri.restaurant_id = r.id AND ri.is_active = 1) as total_images
             FROM kvq_tubarresto_restaurants r 
             WHERE r.id = %d",
            $data['id']
        ));
    
        // Para cada restaurante, obtener sus imágenes
        $images = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images 
             WHERE restaurant_id = %d AND is_active = 1 
             ORDER BY category, is_primary DESC, sort_order ASC",
            $updated_restaurant->id
        ));
    
        $updated_restaurant->images = array_map(function($img) {
            return [
                'id' => $img->id,
                'title' => $img->title,
                'description' => $img->description,
                'url' => $img->file_url,
                'category' => $img->category,
                'isPrimary' => (bool) $img->is_primary,
                'width' => $img->width,
                'height' => $img->height,
                'fileSize' => $img->file_size,
                'createdAt' => $img->created_at
            ];
        }, $images);
    
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
                'images' => $updated_restaurant->images,
                'total_images' => (int) $updated_restaurant->total_images
            ]
        ]);
        break;
}
