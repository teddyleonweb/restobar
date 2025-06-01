<?php
/**
 * API Actualizada para Tu Bar Resto con soporte completo de imágenes y menús PDF/Imagen
 * Funciones: Registro, Login, Restaurantes, Imágenes y Menús como archivos
 * Actualizada para trabajar con la base de datos existente
 * VERSIÓN COMPLETA CON TODOS LOS ENDPOINTS
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
    'https://www.tubarresto.com',
    'https://tubarresto.somediave.com',
    'https://somediave.com',
    'https://v0-tubarresto-git-inicio-teddyleonwebs-projects.vercel.app/',
    'https://v0-tubarresto.vercel.app'

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
if (!isset($_GET['action']) || ($_GET['action'] !== 'upload-image' && $_GET['action'] !== 'upload-menu-file')) {
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

// --- MODIFICACIÓN: Función upload_and_process_file para manejar imágenes y PDFs ---
function upload_and_process_file($file, $restaurant_id, $category = 'other', $allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
    global $wpdb;
    
    // Validar archivo
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('Tipo de archivo no permitido: ' . $file['type']);
    }
    
    // Obtener configuración de upload (usar valores por defecto si no existe)
    $settings = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM kvq_tubarresto_upload_settings WHERE restaurant_id = %d",
        $restaurant_id
    ));
    
    // Valores por defecto si no hay configuración
    if (!$settings) {
        $max_file_size = 5 * 1024 * 1024; // 5MB
        $generate_thumbnails = true;
        $thumbnail_sizes = 'small:150x150,medium:300x300,large:600x600';
        $image_quality = 85;
    } else {
        $max_file_size = $settings->max_file_size;
        $generate_thumbnails = (bool) $settings->generate_thumbnails;
        $thumbnail_sizes = $settings->thumbnail_sizes;
        $image_quality = $settings->image_quality;
    }
    
    // Validar tamaño
    if ($file['size'] > $max_file_size) {
        throw new Exception('El archivo es demasiado grande. Máximo: ' . round($max_file_size / 1024 / 1024, 2) . 'MB');
    }
    
    // Crear directorio
    $upload_dir = create_restaurant_directory($restaurant_id);
    
    // Verificar que el directorio existe y es escribible
    if (!file_exists($upload_dir)) {
        throw new Exception('Error al crear directorio de subida: ' . $upload_dir);
    }
    
    if (!is_writable($upload_dir)) {
        throw new Exception('El directorio de subida no tiene permisos de escritura: ' . $upload_dir);
    }
    
    // Generar nombre único
    $unique_filename = generate_unique_filename($restaurant_id, $category, $file['name']);
    $file_path = $upload_dir . '/' . $unique_filename;
    
    // Mover archivo subido
    if (!move_uploaded_file($file['tmp_name'], $file_path)) {
        throw new Exception('Error al mover el archivo subido. Verifique permisos y espacio en disco.');
    }
    
    $width = null;
    $height = null;
    $thumbnails = [];

    // Procesar solo si es una imagen
    if (strpos($file['type'], 'image/') === 0) {
        $image_info = getimagesize($file_path);
        $width = $image_info ? $image_info[0] : null;
        $height = $image_info ? $image_info[1] : null;
        
        // Generar thumbnails si está habilitado
        if ($generate_thumbnails && $image_info) {
            $thumbnail_pairs = explode(',', $thumbnail_sizes);
            
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
                        
                        $thumb_result = resize_image($file_path, $thumb_path, $thumb_width, $thumb_height, $image_quality);
                        
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
// --- FIN MODIFICACIÓN ---

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
    
    // LOGIN DE USUARIO (actualizado para incluir imágenes y menús)
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
        
        // Obtener restaurantes del usuario con imágenes y menús
        $restaurants = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, 
                    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images ri WHERE ri.restaurant_id = r.id AND ri.is_active = 1) as total_images
             FROM kvq_tubarresto_restaurants r 
             WHERE r.user_id = %d 
             ORDER BY r.created_at DESC",
            $user->id
        ));
        
        // Para cada restaurante, obtener sus imágenes y menús
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
                    'url' => $img->url,
                    'category' => $img->category,
                    'isPrimary' => (bool) $img->is_primary,
                    'width' => $img->width,
                    'height' => $img->height,
                    'fileSize' => $img->file_size,
                    'createdAt' => $img->created_at
                ];
            }, $images);

            // --- NUEVA FUNCIONALIDAD: Obtener menús del restaurante ---
            $menus = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurant_menus
                 WHERE restaurant_id = %d AND is_active = 1
                 ORDER BY sort_order ASC, created_at DESC",
                $restaurant->id
            ));

            $restaurant->menus = array_map(function($menu) {
                return [
                    'id' => $menu->id,
                    'title' => $menu->title,
                    'description' => $menu->description,
                    'url' => $menu->url,
                    'fileType' => $menu->file_type,
                    'fileName' => $menu->file_name,
                    'fileSize' => $menu->file_size,
                    'mimeType' => $menu->mime_type,
                    'width' => $menu->width,
                    'height' => $menu->height,
                    'sortOrder' => $menu->sort_order,
                    'createdAt' => $menu->created_at
                ];
            }, $menus);
            // --- FIN NUEVA FUNCIONALIDAD ---
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
                    'created_at' => $r->created_at,
                    'logo_url' => $r->logo_url,
                    'cover_image_url' => $r->cover_image_url,
                    'images' => $r->images,
                    'menus' => $r->menus, // --- NUEVA FUNCIONALIDAD: Incluir menús ---
                    'total_images' => (int) $r->total_images
                ];
            }, $restaurants),
            'token' => $token
        ]);
        break;
    
    // AGREGAR RESTAURANTE (NUEVO ENDPOINT)
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
                'description' => isset($data['description']) ? $data['description'] : null,
                'address' => $data['address'],
                'city' => $data['city'],
                'phone' => isset($data['phone']) ? $data['phone'] : null,
                'email' => isset($data['email']) ? $data['email'] : null,
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
                'created_at' => $restaurant->created_at,
                'logo_url' => $restaurant->logo_url,
                'cover_image_url' => $restaurant->cover_image_url,
                'images' => [],
                'menus' => [], // --- NUEVA FUNCIONALIDAD: Incluir menús vacíos ---
                'total_images' => 0
            ]
        ], 201);
        break;
    
    // ACTUALIZAR RESTAURANTE (NUEVO ENDPOINT)
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
            send_error('ID del restaurante es requerido');
        }
        
        $restaurant_id = (int)$data['id'];
        
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
        
        // Preparar datos para actualizar
        $update_data = [];
        $update_format = [];
        
        if (isset($data['name']) && !empty($data['name'])) {
            $update_data['name'] = $data['name'];
            $update_format[] = '%s';
        }
        
        if (isset($data['description'])) {
            $update_data['description'] = $data['description'];
            $update_format[] = '%s';
        }
        
        if (isset($data['address']) && !empty($data['address'])) {
            $update_data['address'] = $data['address'];
            $update_format[] = '%s';
        }
        
        if (isset($data['city']) && !empty($data['city'])) {
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
        
        if (isset($data['logo_url'])) {
            $update_data['logo_url'] = $data['logo_url'];
            $update_format[] = '%s';
        }
        
        if (isset($data['cover_image_url'])) {
            $update_data['cover_image_url'] = $data['cover_image_url'];
            $update_format[] = '%s';
        }
        
        // Agregar timestamp de actualización
        $update_data['updated_at'] = current_time('mysql');
        $update_format[] = '%s';
        
        // Actualizar restaurante
        $result = $wpdb->update(
            'kvq_tubarresto_restaurants',
            $update_data,
            ['id' => $restaurant_id],
            $update_format,
            ['%d']
        );
        
        if ($result === false) {
            send_error('Error al actualizar restaurante', 500);
        }
        
        // Obtener el restaurante actualizado con imágenes y menús
        $updated_restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT r.*, 
                    (SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images ri WHERE ri.restaurant_id = r.id AND ri.is_active = 1) as total_images
             FROM kvq_tubarresto_restaurants r 
             WHERE r.id = %d",
            $restaurant_id
        ));
        
        // Obtener galería de imágenes
        $images = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images 
             WHERE restaurant_id = %d AND is_active = 1 
             ORDER BY category, is_primary DESC, sort_order ASC",
            $restaurant_id
        ));
        
        $restaurant_images = array_map(function($img) {
            return [
                'id' => $img->id,
                'title' => $img->title,
                'description' => $img->description,
                'url' => $img->url,
                'category' => $img->category,
                'isPrimary' => (bool) $img->is_primary,
                'width' => $img->width,
                'height' => $img->height,
                'fileSize' => $img->file_size,
                'createdAt' => $img->created_at
            ];
        }, $images);

        // --- NUEVA FUNCIONALIDAD: Obtener menús del restaurante ---
        $menus = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_menus
             WHERE restaurant_id = %d AND is_active = 1
             ORDER BY sort_order ASC, created_at DESC",
            $restaurant_id
        ));

        $restaurant_menus = array_map(function($menu) { // Corrected variable name
            return [
                'id' => $menu->id,
                'title' => $menu->title,
                'description' => $menu->description,
                'url' => $menu->url,
                'fileType' => $menu->file_type,
                'fileName' => $menu->file_name,
                'fileSize' => $menu->file_size,
                'mimeType' => $menu->mime_type,
                'width' => $menu->width,
                'height' => $menu->height,
                'sortOrder' => $menu->sort_order,
                'createdAt' => $menu->created_at
            ];
        }, $menus);
        // --- FIN NUEVA FUNCIONALIDAD ---
        
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
                'created_at' => $updated_restaurant->created_at,
                'logo_url' => $updated_restaurant->logo_url,
                'cover_image_url' => $updated_restaurant->cover_image_url,
                'images' => $restaurant_images,
                'menus' => $restaurant_menus, // --- NUEVA FUNCIONALIDAD: Incluir menús ---
                'total_images' => (int) $updated_restaurant->total_images
            ]
        ]);
        break;
    
    // SUBIR IMAGEN COMO ARCHIVO Y GUARDAR EN BASE DE DATOS
    // Modificar el endpoint upload-image para mejorar el manejo de errores
    case 'upload-image':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
    
    // Habilitar errores para depuración
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    
    // Verificar autenticación
    $user_data = verify_token($token);
    if (!$user_data) {
        send_error('No autorizado', 401);
    }
    
    // Verificar que se subió un archivo
    if (!isset($_FILES['image'])) {
        send_error('No se envió ningún archivo');
    }
    
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $upload_errors = [
            UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido por PHP',
            UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo permitido por el formulario',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
            UPLOAD_ERR_NO_FILE => 'No se subió ningún archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal',
            UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo en el disco',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida'
        ];
        $error_message = isset($upload_errors[$_FILES['image']['error']]) 
            ? $upload_errors[$_FILES['image']['error']] 
            : 'Error desconocido al subir el archivo';
        send_error($error_message);
    }
    
    $file = $_FILES['image'];
    $restaurant_id = isset($_POST['restaurant_id']) ? (int)$_POST['restaurant_id'] : 0;
    $category = isset($_POST['category']) ? $_POST['category'] : 'gallery';
    $title = isset($_POST['title']) ? $_POST['title'] : pathinfo($file['name'], PATHINFO_FILENAME);
    $description = isset($_POST['description']) ? $_POST['description'] : null;
    $is_primary = isset($_POST['is_primary']) ? (bool)$_POST['is_primary'] : false;
    $sort_order = isset($_POST['sort_order']) ? (int)$_POST['sort_order'] : 0;
    
    // Validar restaurant_id
    if (!$restaurant_id || $restaurant_id <= 0) {
        send_error('ID de restaurante inválido: ' . $restaurant_id);
    }
    
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
        // Subir y procesar imagen (usando la función modificada)
        $upload_result = upload_and_process_file($file, $restaurant_id, $category, ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
        
        // Si es imagen principal, desmarcar otras de la misma categoría
        if ($is_primary) {
            $wpdb->update(
                'kvq_tubarresto_restaurant_images',
                ['is_primary' => 0],
                [
                    'restaurant_id' => $restaurant_id,
                    'category' => $category
                ],
                ['%d'],
                ['%d', '%s']
            );
        }
        
        // Guardar información de la imagen en la base de datos
        $result = $wpdb->insert(
            'kvq_tubarresto_restaurant_images',
            [
                'restaurant_id' => $restaurant_id,
                'title' => $title,
                'description' => $description,
                'url' => $upload_result['file_url'],
                'category' => $category,
                'is_primary' => $is_primary ? 1 : 0,
                'file_name' => $upload_result['file_name'],
                'file_size' => $upload_result['file_size'],
                'mime_type' => $upload_result['mime_type'],
                'width' => $upload_result['width'],
                'height' => $upload_result['height'],
                'sort_order' => $sort_order,
                'is_active' => 1
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%s', '%d', '%d', '%d', '%d']
        );
        
        if ($result === false) {
            // Si falla guardar en BD, eliminar archivo subido
            if (file_exists($upload_result['file_path'])) {
                unlink($upload_result['file_path']);
            }
            
            // Obtener el error de la base de datos
            $db_error = $wpdb->last_error;
            throw new Exception('Error al guardar en la base de datos: ' . $db_error);
        }
        
        $image_id = $wpdb->insert_id;
        
        // Obtener la imagen guardada para confirmar
        $saved_image = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images WHERE id = %d",
            $image_id
        ));
        
        if (!$saved_image) {
            throw new Exception('No se pudo recuperar la imagen guardada');
        }
        
        send_success([
            'message' => 'Imagen subida y guardada exitosamente',
            'image' => [
                'id' => $saved_image->id,
                'file_name' => $saved_image->file_name,
                'title' => $saved_image->title,
                'description' => $saved_image->description,
                'url' => $saved_image->url,
                'file_size' => $saved_image->file_size,
                'mime_type' => $saved_image->mime_type,
                'width' => $saved_image->width,
                'height' => $saved_image->height,
                'category' => $saved_image->category,
                'isPrimary' => (bool) $saved_image->is_primary,
                'sortOrder' => $saved_image->sort_order,
                'restaurant_id' => $saved_image->restaurant_id,
                'thumbnails' => $upload_result['thumbnails'],
                'createdAt' => $saved_image->created_at
            ]
        ], 201);
        
    } catch (Exception $e) {
        // Registrar el error para depuración
        error_log('Error en upload-image: ' . $e->getMessage());
        send_error('Error al subir imagen: ' . $e->getMessage(), 500);
    }
    break;
    
    // --- NUEVA FUNCIONALIDAD: SUBIR ARCHIVO DE MENÚ (IMAGEN O PDF) ---
    case 'upload-menu-file':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
    
        ini_set('display_errors', 1);
        error_reporting(E_ALL);
    
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
    
        // Verificar que se subió un archivo
        if (!isset($_FILES['menu_file'])) {
            send_error('No se envió ningún archivo de menú');
        }
    
        if ($_FILES['menu_file']['error'] !== UPLOAD_ERR_OK) {
            $upload_errors = [
                UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido por PHP',
                UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo permitido por el formulario',
                UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
                UPLOAD_ERR_NO_FILE => 'No se subió ningún archivo',
                UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal',
                UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo en el disco',
                UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida'
            ];
            $error_message = isset($upload_errors[$_FILES['menu_file']['error']]) 
                ? $upload_errors[$_FILES['menu_file']['error']] 
                : 'Error desconocido al subir el archivo';
            send_error($error_message);
        }
    
        $file = $_FILES['menu_file'];
        $restaurant_id = isset($_POST['restaurant_id']) ? (int)$_POST['restaurant_id'] : 0;
        $title = isset($_POST['title']) ? $_POST['title'] : pathinfo($file['name'], PATHINFO_FILENAME);
        $description = isset($_POST['description']) ? $_POST['description'] : null;
        $sort_order = isset($_POST['sort_order']) ? (int)$_POST['sort_order'] : 0;
        
        // Validar restaurant_id
        if (!$restaurant_id || $restaurant_id <= 0) {
            send_error('ID de restaurante inválido: ' . $restaurant_id);
        }
    
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
            $allowed_menu_types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            $upload_result = upload_and_process_file($file, $restaurant_id, 'menu', $allowed_menu_types);
            
            $file_type = (strpos($upload_result['mime_type'], 'image/') === 0) ? 'image' : 'pdf';

            // Guardar información del menú en la base de datos
            $result = $wpdb->insert(
                'kvq_tubarresto_restaurant_menus',
                [
                    'restaurant_id' => $restaurant_id,
                    'title' => $title,
                    'description' => $description,
                    'url' => $upload_result['file_url'],
                    'file_type' => $file_type,
                    'file_name' => $upload_result['file_name'],
                    'file_size' => $upload_result['file_size'],
                    'mime_type' => $upload_result['mime_type'],
                    'width' => $upload_result['width'],
                    'height' => $upload_result['height'],
                    'sort_order' => $sort_order,
                    'is_active' => 1
                ],
                ['%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%d', '%d']
            );
            
            if ($result === false) {
                // Si falla guardar en BD, eliminar archivo subido
                if (file_exists($upload_result['file_path'])) {
                    unlink($upload_result['file_path']);
                }
                $db_error = $wpdb->last_error;
                throw new Exception('Error al guardar en la base de datos: ' . $db_error);
            }
            
            $menu_id = $wpdb->insert_id;
            
            $saved_menu = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurant_menus WHERE id = %d",
                $menu_id
            ));
            
            if (!$saved_menu) {
                throw new Exception('No se pudo recuperar el menú guardado');
            }
            
            send_success([
                'message' => 'Menú subido y guardado exitosamente',
                'menu' => [
                    'id' => $saved_menu->id,
                    'title' => $saved_menu->title,
                    'description' => $saved_menu->description,
                    'url' => $saved_menu->url,
                    'fileType' => $saved_menu->file_type,
                    'fileName' => $saved_menu->file_name,
                    'fileSize' => $saved_menu->file_size,
                    'mimeType' => $saved_menu->mime_type,
                    'width' => $saved_menu->width,
                    'height' => $saved_menu->height,
                    'sortOrder' => $saved_menu->sort_order,
                    'restaurant_id' => $saved_menu->restaurant_id,
                    'createdAt' => $saved_menu->created_at
                ]
            ], 201);
            
        } catch (Exception $e) {
            error_log('Error en upload-menu-file: ' . $e->getMessage());
            send_error('Error al subir menú: ' . $e->getMessage(), 500);
        }
        break;
    // --- FIN NUEVA FUNCIONALIDAD: SUBIR ARCHIVO DE MENÚ ---

    // AGREGAR IMAGEN A GALERÍA (sin cambios, usa la función upload_and_process_file)
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
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'url' => $data['file_url'],
                'category' => $data['category'] ?? 'other',
                'is_primary' => isset($data['is_primary']) ? (bool)$data['is_primary'] : false,
                'file_name' => $data['file_name'],
                'file_size' => $data['file_size'] ?? 0,
                'mime_type' => $data['mime_type'] ?? 'image/jpeg',
                'width' => $data['width'] ?? null,
                'height' => $data['height'] ?? null,
                'sort_order' => $data['sort_order'] ?? 0,
                'is_active' => 1
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%s', '%d', '%d', '%d', '%d']
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
        
        // Obtener imágenes de la galería
        $images = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images 
             WHERE restaurant_id = %d AND is_active = 1 
             ORDER BY category, is_primary DESC, sort_order ASC",
            $restaurant_id
        ));
        
        $images_data = array_map(function($img) {
            return [
                'id' => $img->id,
                'fileName' => $img->file_name,
                'title' => $img->title,
                'description' => $img->description,
                'url' => $img->url,
                'category' => $img->category,
                'isPrimary' => (bool) $img->is_primary,
                'sortOrder' => $img->sort_order,
                'width' => $img->width,
                'height' => $img->height,
                'fileSize' => $img->file_size,
                'mimeType' => $img->mime_type,
                'createdAt' => $img->created_at
            ];
        }, $images);
        
        // Obtener imágenes principales (logo y portada)
        $main_images = [
            'logo' => $restaurant->logo_url,
            'cover' => $restaurant->cover_image_url
        ];
        
        send_success([
            'main_images' => $main_images,
            'gallery_images' => $images_data,
            'total_images' => count($images_data)
        ]);
        break;

    // --- NUEVA FUNCIONALIDAD: OBTENER MENÚS DE RESTAURANTE ---
    case 'get-restaurant-menus':
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
        
        // Obtener menús del restaurante
        $menus = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_menus
             WHERE restaurant_id = %d AND is_active = 1
             ORDER BY sort_order ASC, created_at DESC",
            $restaurant_id
        ));
        
        $menus_data = array_map(function($menu) {
            return [
                'id' => $menu->id,
                'title' => $menu->title,
                'description' => $menu->description,
                'url' => $menu->url,
                'fileType' => $menu->file_type,
                'fileName' => $menu->file_name,
                'fileSize' => $menu->file_size,
                'mimeType' => $menu->mime_type,
                'width' => $menu->width,
                'height' => $menu->height,
                'sortOrder' => $menu->sort_order,
                'createdAt' => $menu->created_at
            ];
        }, $menus);
        
        send_success([
            'menus' => $menus_data,
            'total_menus' => count($menus_data)
        ]);
        break;
    // --- FIN NUEVA FUNCIONALIDAD: OBTENER MENÚS DE RESTAURANTE ---

    // --- NUEVA FUNCIONALIDAD: ELIMINAR MENÚ DE RESTAURANTE ---
    case 'delete-restaurant-menu':
        if ($method !== 'POST') { // Usamos POST para consistencia con otras eliminaciones
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        $menu_id = isset($data['id']) ? (int)$data['id'] : 0;
        
        // Verificar que el menú pertenece a un restaurante del usuario
        global $wpdb;
        $menu = $wpdb->get_row($wpdb->prepare(
            "SELECT rm.*, r.user_id 
             FROM kvq_tubarresto_restaurant_menus rm
             JOIN kvq_tubarresto_restaurants r ON rm.restaurant_id = r.id
             WHERE rm.id = %d AND r.user_id = %d",
            $menu_id,
            $user_data['id']
        ));
        
        if (!$menu) {
            send_error('Menú no encontrado o no autorizado', 404);
        }
        
        // Eliminar archivo físico
        if (file_exists($menu->file_path)) { // Asumiendo que file_path está disponible o se puede reconstruir
            unlink($menu->file_path);
            // Para PDFs o imágenes grandes, no hay thumbnails por defecto, pero si se generaran, se eliminarían aquí.
        }
        
        // Eliminar registro de la base de datos
        $result = $wpdb->delete(
            'kvq_tubarresto_restaurant_menus',
            ['id' => $menu_id],
            ['%d']
        );
        
        if (!$result) {
            send_error('Error al eliminar menú', 500);
        }
        
        send_success([
            'message' => 'Menú eliminado exitosamente',
            'menu_id' => $menu_id
        ]);
        break;
    // --- FIN NUEVA FUNCIONALIDAD: ELIMINAR MENÚ DE RESTAURANTE ---

    // ELIMINAR RESTAURANTE
    case 'delete-restaurant':
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
            send_error('ID del restaurante es requerido');
        }
        
        $restaurant_id = (int)$data['id'];
        
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
        
        // Eliminar imágenes asociadas (opcional: también eliminar archivos físicos)
        $images = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images WHERE restaurant_id = %d",
            $restaurant_id
        ));
        
        // Eliminar archivos físicos de imágenes
        foreach ($images as $image) {
            if (file_exists($image->file_path)) {
                unlink($image->file_path);
                
                // También eliminar thumbnails si existen
                $file_info = pathinfo($image->file_path);
                $thumbnail_pattern = $file_info['dirname'] . '/' . $file_info['filename'] . '_*.' . $file_info['extension'];
                $thumbnails = glob($thumbnail_pattern);
                foreach ($thumbnails as $thumbnail) {
                    if (file_exists($thumbnail)) {
                        unlink($thumbnail);
                    }
                }
            }
        }
        
        // Eliminar registros de imágenes
        $wpdb->delete(
            'kvq_tubarresto_restaurant_images',
            ['restaurant_id' => $restaurant_id],
            ['%d']
        );

        // --- NUEVA FUNCIONALIDAD: Eliminar menús asociados ---
        $menus_to_delete = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_menus WHERE restaurant_id = %d",
            $restaurant_id
        ));

        foreach ($menus_to_delete as $menu_file) {
            // Asumiendo que file_path está disponible o se puede reconstruir
            // Para simplificar, si el URL es un path local, lo eliminamos.
            // En un entorno real, necesitarías la ruta física completa.
            $local_path = str_replace($base_upload_url, $base_upload_dir, $menu_file->url);
            if (file_exists($local_path)) {
                unlink($local_path);
            }
        }

        $wpdb->delete(
            'kvq_tubarresto_restaurant_menus',
            ['restaurant_id' => $restaurant_id],
            ['%d']
        );
        // --- FIN NUEVA FUNCIONALIDAD ---
        
        // Eliminar configuración de upload si existe
        $wpdb->delete(
            'kvq_tubarresto_upload_settings',
            ['restaurant_id' => $restaurant_id],
            ['%d']
        );
        
        // Eliminar el restaurante
        $result = $wpdb->delete(
            'kvq_tubarresto_restaurants',
            ['id' => $restaurant_id],
            ['%d']
        );
        
        if (!$result) {
            send_error('Error al eliminar restaurante', 500);
        }
        
        send_success([
            'message' => 'Restaurante eliminado exitosamente',
            'restaurant_id' => $restaurant_id,
            'deleted_images' => count($images),
            'deleted_menus' => count($menus_to_delete) // --- NUEVA FUNCIONALIDAD: Conteo de menús eliminados ---
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
        $delete_file = isset($_GET['delete_file']) ? (bool)$_GET['delete_file'] : false;
        
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
        
        // Eliminar archivo físico si se solicita
        if ($delete_file && file_exists($image->file_path)) {
            unlink($image->file_path);
            
            // También eliminar thumbnails si existen
            $file_info = pathinfo($image->file_path);
            $thumbnail_pattern = $file_info['dirname'] . '/' . $file_info['filename'] . '_*.' . $file_info['extension'];
            $thumbnails = glob($thumbnail_pattern);
            foreach ($thumbnails as $thumbnail) {
                if (file_exists($thumbnail)) {
                    unlink($thumbnail);
                }
            }
        }
        
        // Eliminar registro de la galería
        $result = $wpdb->delete(
            'kvq_tubarresto_restaurant_images',
            ['id' => $image_id],
            ['%d']
        );
        
        if (!$result) {
            send_error('Error al eliminar imagen', 500);
        }
        
        send_success([
            'message' => 'Imagen eliminada exitosamente',
            'deleted_file' => $delete_file
        ]);
        break;
    
    // ESTADO DE LA API (actualizado)
    case 'status':
        if ($method !== 'GET') {
            send_error('Método no permitido', 405);
        }
        
        global $wpdb, $base_upload_dir, $base_upload_url;
        
        // Verificar que las tablas existen
        $users_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_users'") === 'kvq_tubarresto_users';
        $restaurants_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_restaurants'") === 'kvq_tubarresto_restaurants';
        $images_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_restaurant_images'") === 'kvq_tubarresto_restaurant_images';
        $upload_settings_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_upload_settings'") === 'kvq_tubarresto_upload_settings';
        
        // Nuevas tablas de menú
        $menu_categories_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_menu_categories'") === 'kvq_tubarresto_menu_categories';
        $menu_items_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_menu_items'") === 'kvq_tubarresto_menu_items';
        $restaurant_menus_table_exists = $wpdb->get_var("SHOW TABLES LIKE 'kvq_tubarresto_restaurant_menus'") === 'kvq_tubarresto_restaurant_menus'; // --- NUEVA FUNCIONALIDAD: Tabla de menús ---

        $users_count = $users_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_users") : 0;
        $restaurants_count = $restaurants_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_restaurants") : 0;
        $images_count = $images_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_restaurant_images WHERE is_active = 1") : 0;
        
        // Conteo de elementos de menú
        $menu_categories_count = $menu_categories_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_menu_categories WHERE is_active = 1") : 0;
        $menu_items_count = $menu_items_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_menu_items") : 0;
        $restaurant_menus_count = $restaurant_menus_table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM kvq_tubarresto_restaurant_menus WHERE is_active = 1") : 0; // --- NUEVA FUNCIONALIDAD: Conteo de menús ---

        // Verificar directorios de upload
        $upload_dir_exists = file_exists($base_upload_dir);
        $upload_dir_writable = is_writable($base_upload_dir);
        
        // Calcular espacio usado
        $total_size = 0;
        if ($upload_dir_exists) {
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base_upload_dir));
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $total_size += $file->getSize();
                }
            }
        }
        
        send_success([
            'status' => 'ok',
            'message' => 'Tu Bar Resto API con almacenamiento de archivos y gestión de menú funcionando correctamente',
            'endpoints' => [
                'register' => 'POST - Registro de usuarios',
                'login' => 'POST - Autenticación de usuarios',
                'add-restaurant' => 'POST - Agregar restaurante',
                'update-restaurant' => 'POST - Actualizar restaurante',
                'delete-restaurant' => 'POST - Eliminar restaurante',
                'upload-image' => 'POST - Subir imagen de galería',
                'upload-menu-file' => 'POST - Subir archivo de menú (imagen/PDF)', // --- NUEVA FUNCIONALIDAD: Endpoint de subida de menú ---
                'add-restaurant-image' => 'POST - Agregar imagen a galería',
                'update-restaurant-main-image' => 'POST - Actualizar logo/portada',
                'get-restaurant-images' => 'GET - Obtener imágenes de galería',
                'get-restaurant-menus' => 'GET - Obtener menús de restaurante', // --- NUEVA FUNCIONALIDAD: Endpoint de obtención de menú ---
                'delete-restaurant-image' => 'DELETE - Eliminar imagen de galería',
                'delete-restaurant-menu' => 'POST - Eliminar menú de restaurante', // --- NUEVA FUNCIONALIDAD: Endpoint de eliminación de menú ---
                'get-menu-items' => 'GET - Obtener platos y bebidas',
                'add-menu-item' => 'POST - Agregar plato/bebida',
                'update-menu-item' => 'POST - Actualizar plato/bebida',
                'delete-menu-item' => 'POST - Eliminar plato/bebida',
                'get-menu-categories' => 'GET - Obtener categorías de menú',
                'add-menu-category' => 'POST - Agregar categoría de menú',
                'delete-menu-category' => 'POST - Eliminar categoría de menú', // --- NUEVA FUNCIONALIDAD: Endpoint de eliminación de categoría ---
                'status' => 'GET - Estado de la API'
            ],
            'database' => [
                'users_table_exists' => $users_table_exists,
                'restaurants_table_exists' => $restaurants_table_exists,
                'images_table_exists' => $images_table_exists,
                'upload_settings_table_exists' => $upload_settings_table_exists,
                'menu_categories_table_exists' => $menu_categories_table_exists,
                'menu_items_table_exists' => $menu_items_table_exists,
                'restaurant_menus_table_exists' => $restaurant_menus_table_exists, // --- NUEVA FUNCIONALIDAD: Estado de tabla de menús ---
                'users_count' => (int) $users_count,
                'restaurants_count' => (int) $restaurants_count,
                'images_count' => (int) $images_count,
                'menu_categories_count' => (int) $menu_categories_count,
                'menu_items_count' => (int) $menu_items_count,
                'restaurant_menus_count' => (int) $restaurant_menus_count // --- NUEVA FUNCIONALIDAD: Conteo de menús ---
            ],
            'file_storage' => [
                'upload_dir_exists' => $upload_dir_exists,
                'upload_dir_writable' => $upload_dir_writable,
                'upload_dir' => $base_upload_dir,
                'upload_url' => $base_upload_url,
                'total_size_mb' => round($total_size / 1024 / 1024, 2)
            ],
            'timestamp' => current_time('mysql')
        ]);
        break;
    
    // OBTENER PLATOS Y BEBIDAS DE UN RESTAURANTE (actualizado para incluir descuento)
    case 'get-menu-items':
        if ($method !== 'GET') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        $restaurant_id = isset($_GET['restaurant_id']) ? (int)$_GET['restaurant_id'] : 0;
        $type = isset($_GET['type']) ? $_GET['type'] : null; // 'food' o 'drink'
        $category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id, // Corregido: Usar $restaurant_id de $_GET
            $user_data['id']
        ));
        
        if (!$restaurant) {
            send_error('Restaurante no encontrado o no autorizado', 404);
        }
        
        // Construir query
        $where_conditions = ["mi.restaurant_id = %d"];
        $query_params = [$restaurant_id];
        
        if ($type) {
            $where_conditions[] = "mi.type = %s";
            $query_params[] = $type;
        }
        
        if ($category_id) {
            $where_conditions[] = "mi.category_id = %d";
            $query_params[] = $category_id;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Obtener platos/bebidas
        $menu_items = $wpdb->get_results($wpdb->prepare(
            "SELECT mi.*, mc.name as category_name 
            FROM kvq_tubarresto_menu_items mi
            LEFT JOIN kvq_tubarresto_menu_categories mc ON mi.category_id = mc.id
            WHERE {$where_clause}
            ORDER BY mi.type, mc.sort_order, mi.sort_order, mi.name",
            ...$query_params
        ));
        
        // Obtener categorías
        $categories = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_menu_categories 
            WHERE restaurant_id = %d AND is_active = 1 
            ORDER BY sort_order, name",
            $restaurant_id
        ));
        
        $items_data = array_map(function($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description,
                'price' => (float) $item->price,
                'image_url' => $item->image_url,
                'type' => $item->type,
                'category_id' => $item->category_id,
                'category_name' => $item->category_name,
                'is_available' => (bool) $item->is_available,
                'is_featured' => (bool) $item->is_featured,
                'dietary' => [
                    'is_vegetarian' => (bool) $item->is_vegetarian,
                    'is_vegan' => (bool) $item->is_vegan,
                    'is_gluten_free' => (bool) $item->is_gluten_free,
                    'is_lactose_free' => (bool) $item->is_lactose_free,
                    'is_spicy' => (bool) $item->is_spicy
                ],
                'calories' => $item->calories,
                'preparation_time' => $item->preparation_time,
                'ingredients' => $item->ingredients,
                'allergens' => $item->allergens,
                'sort_order' => $item->sort_order,
                'created_at' => $item->created_at,
                // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
                'discount_percentage' => $item->discount_percentage ? (float) $item->discount_percentage : null,
                'discount_start_date' => $item->discount_start_date,
                'discount_end_date' => $item->discount_end_date
                // --- FIN NUEVA FUNCIONALIDAD ---
            ];
        }, $menu_items);
        
        send_success([
            'menu_items' => $items_data,
            'categories' => array_map(function($cat) {
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'description' => $cat->description,
                    'type' => $cat->type,
                    'sort_order' => $cat->sort_order
                ];
            }, $categories),
            'total_items' => count($items_data)
        ]);
        break;

    // AGREGAR PLATO O BEBIDA (actualizado para incluir descuento)
    case 'add-menu-item':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['restaurant_id']) || empty($data['name']) || empty($data['type']) || !isset($data['price'])) {
            send_error('restaurant_id, name, type y price son requeridos');
        }
        
        if (!in_array($data['type'], ['food', 'drink'])) {
            send_error('type debe ser "food" o "drink"');
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
        
        // Insertar plato/bebida
        $result = $wpdb->insert(
            'kvq_tubarresto_menu_items',
            [
                'restaurant_id' => $data['restaurant_id'],
                'category_id' => isset($data['category_id']) ? $data['category_id'] : null,
                'name' => $data['name'],
                'description' => isset($data['description']) ? $data['description'] : null,
                'price' => (float) $data['price'],
                'image_url' => isset($data['image_url']) ? $data['image_url'] : null,
                'type' => $data['type'],
                'is_available' => isset($data['is_available']) ? (bool) $data['is_available'] : true,
                'is_featured' => isset($data['is_featured']) ? (bool) $data['is_featured'] : false,
                'is_vegetarian' => isset($data['is_vegetarian']) ? (bool) $data['is_vegetarian'] : false,
                'is_vegan' => isset($data['is_vegan']) ? (bool) $data['is_vegan'] : false,
                'is_gluten_free' => isset($data['is_gluten_free']) ? (bool) $data['is_gluten_free'] : false,
                'is_lactose_free' => isset($data['is_lactose_free']) ? (bool) $data['is_lactose_free'] : false,
                'is_spicy' => isset($data['is_spicy']) ? (bool) $data['is_spicy'] : false,
                'calories' => isset($data['calories']) ? (int) $data['calories'] : null,
                'preparation_time' => isset($data['preparation_time']) ? (int) $data['preparation_time'] : null,
                'ingredients' => isset($data['ingredients']) ? $data['ingredients'] : null,
                'allergens' => isset($data['allergens']) ? $data['allergens'] : null,
                'sort_order' => isset($data['sort_order']) ? (int) $data['sort_order'] : 0,
                // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
                'discount_percentage' => isset($data['discount_percentage']) ? (float) $data['discount_percentage'] : null,
                'discount_start_date' => isset($data['discount_start_date']) ? $data['discount_start_date'] : null,
                'discount_end_date' => isset($data['discount_end_date']) ? $data['discount_end_date'] : null
                // --- FIN NUEVA FUNCIONALIDAD ---
            ],
            ['%d', '%d', '%s', '%s', '%f', '%s', '%s', '%d', '%d', '%d', '%d', '%d', '%d', '%d', '%d', '%d', '%s', '%s', '%d', '%f', '%s', '%s']
        );
        
        if (!$result) {
            send_error('Error al agregar plato/bebida', 500);
        }
        
        $item_id = $wpdb->insert_id;
        
        // Obtener el item creado
        $item = $wpdb->get_row($wpdb->prepare(
            "SELECT mi.*, mc.name as category_name 
            FROM kvq_tubarresto_menu_items mi
            LEFT JOIN kvq_tubarresto_menu_categories mc ON mi.category_id = mc.id
            WHERE mi.id = %d",
            $item_id
        ));
        
        send_success([
            'message' => ucfirst($data['type'] === 'food' ? 'Plato' : 'Bebida') . ' agregado exitosamente',
            'menu_item' => [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description,
                'price' => (float) $item->price,
                'image_url' => $item->image_url,
                'type' => $item->type,
                'category_id' => $item->category_id,
                'category_name' => $item->category_name,
                'is_available' => (bool) $item->is_available,
                'is_featured' => (bool) $item->is_featured,
                'dietary' => [
                    'is_vegetarian' => (bool) $item->is_vegetarian,
                    'is_vegan' => (bool) $item->is_vegan,
                    'is_gluten_free' => (bool) $item->is_gluten_free,
                    'is_lactose_free' => (bool) $item->is_lactose_free,
                    'is_spicy' => (bool) $item->is_spicy
                ],
                'calories' => $item->calories,
                'preparation_time' => $item->preparation_time,
                'ingredients' => $item->ingredients,
                'allergens' => $item->allergens,
                'sort_order' => $item->sort_order,
                'created_at' => $item->created_at,
                // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
                'discount_percentage' => $item->discount_percentage ? (float) $item->discount_percentage : null,
                'discount_start_date' => $item->discount_start_date,
                'discount_end_date' => $item->discount_end_date
                // --- FIN NUEVA FUNCIONALIDAD ---
            ]
        ], 201);
        break;

    // ACTUALIZAR PLATO O BEBIDA (actualizado para incluir descuento)
    case 'update-menu-item':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['id']) || !is_numeric($data['id']) || (int)$data['id'] <= 0) {
            send_error('ID del plato/bebida inválido o faltante.');
        }
        
        $item_id = (int) $data['id'];
        
        // Verificar que el item pertenece a un restaurante del usuario
        global $wpdb;
        $item = $wpdb->get_row($wpdb->prepare(
            "SELECT mi.*, r.user_id 
            FROM kvq_tubarresto_menu_items mi
            JOIN kvq_tubarresto_restaurants r ON mi.restaurant_id = r.id
            WHERE mi.id = %d AND r.user_id = %d",
            $item_id,
            $user_data['id']
        ));
        
        if (!$item) {
            error_log("DEBUG: Failed to find or authorize menu item during update. Item ID: " . $item_id . ", User ID from token: " . $user_data['id']);
            send_error('Plato/bebida no encontrado o no autorizado', 404);
        }
        
        // Preparar datos para actualizar
        $update_data = [];
        $update_format = [];
        
        $fields = [
            'name' => '%s',
            'description' => '%s',
            'price' => '%f',
            'image_url' => '%s',
            'category_id' => '%d',
            'is_available' => '%d',
            'is_featured' => '%d',
            'is_vegetarian' => '%d',
            'is_vegan' => '%d',
            'is_gluten_free' => '%d',
            'is_lactose_free' => '%d',
            'is_spicy' => '%d',
            'calories' => '%d',
            'preparation_time' => '%d',
            'ingredients' => '%s',
            'allergens' => '%s',
            'sort_order' => '%d',
            // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
            'discount_percentage' => '%f',
            'discount_start_date' => '%s',
            'discount_end_date' => '%s'
            // --- FIN NUEVA FUNCIONALIDAD ---
        ];
        
        foreach ($fields as $field => $format) {
            if (isset($data[$field])) {
                $update_data[$field] = $data[$field];
                $update_format[] = $format;
            }
        }
        
        if (empty($update_data)) {
            send_error('No hay datos para actualizar');
        }
        
        // Agregar timestamp de actualización
        $update_data['updated_at'] = current_time('mysql');
        $update_format[] = '%s';
        
        // Actualizar item
        $result = $wpdb->update(
            'kvq_tubarresto_menu_items',
            $update_data,
            ['id' => $item_id],
            $update_format,
            ['%d']
        );
        
        if ($result === false) {
            send_error('Error al actualizar plato/bebida', 500);
        }
        
        // Obtener el item actualizado
        $updated_item = $wpdb->get_row($wpdb->prepare(
            "SELECT mi.*, mc.name as category_name 
            FROM kvq_tubarresto_menu_items mi
            LEFT JOIN kvq_tubarresto_menu_categories mc ON mi.category_id = mc.id
            WHERE mi.id = %d",
            $item_id
        ));
        
        send_success([
            'message' => 'Plato/bebida actualizado exitosamente',
            'menu_item' => [
                'id' => $updated_item->id,
                'name' => $updated_item->name,
                'description' => $updated_item->description,
                'price' => (float) $updated_item->price,
                'image_url' => $updated_item->image_url,
                'type' => $updated_item->type,
                'category_id' => $updated_item->category_id,
                'category_name' => $updated_item->category_name,
                'is_available' => (bool) $updated_item->is_available,
                'is_featured' => (bool) $updated_item->is_featured,
                'dietary' => [
                    'is_vegetarian' => (bool) $updated_item->is_vegetarian,
                    'is_vegan' => (bool) $updated_item->is_vegan,
                    'is_gluten_free' => (bool) $updated_item->is_gluten_free,
                    'is_lactose_free' => (bool) $updated_item->is_lactose_free,
                    'is_spicy' => (bool) $updated_item->is_spicy
                ],
                'calories' => $updated_item->calories,
                'preparation_time' => $updated_item->preparation_time,
                'ingredients' => $updated_item->ingredients,
                'allergens' => $updated_item->allergens,
                'sort_order' => $updated_item->sort_order,
                'created_at' => $updated_item->created_at,
                // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
                'discount_percentage' => $updated_item->discount_percentage ? (float) $updated_item->discount_percentage : null,
                'discount_start_date' => $updated_item->discount_start_date,
                'discount_end_date' => $updated_item->discount_end_date
                // --- FIN NUEVA FUNCIONALIDAD ---
            ]
        ]);
        break;

    // ELIMINAR PLATO O BEBIDA
    case 'delete-menu-item':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['id']) || !is_numeric($data['id']) || (int)$data['id'] <= 0) {
            send_error('ID del plato/bebida inválido o faltante.');
        }
        
        $item_id = (int) $data['id'];
        
        // Verificar que el item pertenece a un restaurante del usuario
        global $wpdb;
        $query = $wpdb->prepare(
            "SELECT mi.*, r.user_id 
            FROM kvq_tubarresto_menu_items mi
            JOIN kvq_tubarresto_restaurants r ON mi.restaurant_id = r.id
            WHERE mi.id = %d AND r.user_id = %d",
            $item_id,
            $user_data['id']
        );
        error_log("DEBUG: delete-menu-item query: " . $query); // Log the actual query
        $item = $wpdb->get_row($query);
        error_log("DEBUG: delete-menu-item query result (item): " . print_r($item, true)); // Log the result

        if (!$item) {
            error_log("DEBUG: Failed to find or authorize menu item during delete. Item ID: " . $item_id . ", User ID from token: " . $user_data['id']);
            send_error('Plato/bebida no encontrado o no autorizado', 404);
        }
        
        // Eliminar el item
        $result = $wpdb->delete(
            'kvq_tubarresto_menu_items',
            ['id' => $item_id],
            ['%d']
        );
        
        // --- NUEVOS LOGS PARA DIAGNÓSTICO ---
        error_log("DEBUG: wpdb->delete result for item ID " . $item_id . ": " . print_r($result, true));
        error_log("DEBUG: wpdb->last_error after delete: " . $wpdb->last_error);
        // --- FIN NUEVOS LOGS ---

        if ($result === false) { // Check for false (error)
            send_error('Error al eliminar plato/bebida: ' . $wpdb->last_error, 500);
        } elseif ($result === 0) { // Check for 0 affected rows (not found or already deleted)
            send_error('El plato/bebida no fue encontrado para eliminar o ya ha sido eliminado.', 404);
        }
        
        send_success([
            'message' => 'Plato/bebida eliminado exitosamente',
            'item_id' => $item_id
        ]);
        break;

    // OBTENER CATEGORÍAS DE MENÚ
    case 'get-menu-categories':
        if ($method !== 'GET') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        $restaurant_id = isset($_GET['restaurant_id']) ? (int)$_GET['restaurant_id'] : 0;
        $type = isset($_GET['type']) ? $_GET['type'] : null; // 'food' o 'drink'
        
        // Verificar que el restaurante pertenece al usuario
        global $wpdb;
        $restaurant = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
            $restaurant_id, // Corregido: Usar $restaurant_id de $_GET
            $user_data['id']
        ));
        
        if (!$restaurant) {
            send_error('Restaurante no encontrado o no autorizado', 404);
        }
        
        // Construir query para categorías
        $where_conditions = ["restaurant_id = %d", "is_active = 1"];
        $query_params = [$restaurant_id];
        
        if ($type) {
            $where_conditions[] = "type = %s";
            $query_params[] = $type;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Obtener categorías
        $categories = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_menu_categories 
            WHERE {$where_clause}
            ORDER BY sort_order, name",
            ...$query_params
        ));
        
        send_success([
            'categories' => array_map(function($cat) {
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'description' => $cat->description,
                    'type' => $cat->type,
                    'sort_order' => $cat->sort_order,
                    'is_active' => (bool) $cat->is_active,
                    'created_at' => $cat->created_at
                ];
            }, $categories),
            'total_categories' => count($categories)
        ]);
        break;

    // AGREGAR CATEGORÍA DE MENÚ
    case 'add-menu-category':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['restaurant_id']) || empty($data['name']) || empty($data['type'])) {
            send_error('restaurant_id, name y type son requeridos');
        }
        
        if (!in_array($data['type'], ['food', 'drink', 'both'])) {
            send_error('type debe ser "food", "drink" o "both"');
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
        
        // Insertar categoría
        $result = $wpdb->insert(
            'kvq_tubarresto_menu_categories',
            [
                'restaurant_id' => $data['restaurant_id'],
                'name' => $data['name'],
                'description' => isset($data['description']) ? $data['description'] : null,
                'type' => $data['type'],
                'sort_order' => isset($data['sort_order']) ? (int) $data['sort_order'] : 0,
                'is_active' => 1
            ],
            ['%d', '%s', '%s', '%s', '%d', '%d']
        );
        
        if (!$result) {
            send_error('Error al agregar categoría', 500);
        }
        
        $category_id = $wpdb->insert_id;
        
        // Obtener la categoría creada
        $category = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_menu_categories WHERE id = %d",
            $category_id
        ));
        
        send_success([
            'message' => 'Categoría agregada exitosamente',
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'type' => $category->type,
                'sort_order' => $category->sort_order,
                'is_active' => (bool) $category->is_active,
                'created_at' => $category->created_at
            ]
        ], 201);
        break;

    // --- NUEVA FUNCIONALIDAD: ELIMINAR CATEGORÍA DE MENÚ ---
    case 'delete-menu-category':
        if ($method !== 'POST') {
            send_error('Método no permitido', 405);
        }
        
        // Verificar autenticación
        $user_data = verify_token($token);
        if (!$user_data) {
            send_error('No autorizado', 401);
        }
        
        // Validar campos requeridos
        if (empty($data['id']) || !is_numeric($data['id']) || (int)$data['id'] <= 0) {
            send_error('ID de la categoría inválido o faltante.');
        }
        
        $category_id = (int) $data['id'];
        
        // Verificar que la categoría pertenece a un restaurante del usuario
        global $wpdb;
        $category = $wpdb->get_row($wpdb->prepare(
            "SELECT mc.*, r.user_id 
            FROM kvq_tubarresto_menu_categories mc
            JOIN kvq_tubarresto_restaurants r ON mc.restaurant_id = r.id
            WHERE mc.id = %d AND r.user_id = %d",
            $category_id,
            $user_data['id']
        ));
        
        if (!$category) {
            send_error('Categoría no encontrada o no autorizada', 404);
        }
        
        // Antes de eliminar la categoría, desvincular los elementos del menú asociados
        // Establecer category_id a NULL para los items que pertenecen a esta categoría
        $wpdb->update(
            'kvq_tubarresto_menu_items',
            ['category_id' => null],
            ['category_id' => $category_id],
            ['%d'],
            ['%d']
        );

        // Eliminar la categoría
        $result = $wpdb->delete(
            'kvq_tubarresto_menu_categories',
            ['id' => $category_id],
            ['%d']
        );
        
        if ($result === false) {
            send_error('Error al eliminar categoría: ' . $wpdb->last_error, 500);
        } elseif ($result === 0) {
            send_error('La categoría no fue encontrada para eliminar o ya ha sido eliminada.', 404);
        }
        
        send_success([
            'message' => 'Categoría eliminada exitosamente',
            'category_id' => $category_id
        ]);
        break;
    // --- FIN NUEVA FUNCIONALIDAD: ELIMINAR CATEGORÍA DE MENÚ ---
    
    default:
        send_error('Endpoint no encontrado', 404);
        break;
}
?>
