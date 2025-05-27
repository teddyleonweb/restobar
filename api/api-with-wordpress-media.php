<?php
/**
 * API Completa para Tu Bar Resto con WordPress Media Library
 * Funciones: Registro, Login, Restaurantes e Imágenes usando WP
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

// Incluir funciones necesarias de WordPress
require_once(ABSPATH . 'wp-admin/includes/image.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');

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

// Función para subir imagen usando WordPress Media Library
function upload_image_to_wordpress($file, $restaurant_id, $category = 'other') {
    // Validar archivo
    $allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('Tipo de archivo no permitido');
    }
    
    // Configurar el upload
    $upload_overrides = [
        'test_form' => false,
        'unique_filename_callback' => function($dir, $name, $ext) use ($restaurant_id, $category) {
            return 'tubarresto_' . $restaurant_id . '_' . $category . '_' . time() . '_' . uniqid() . $ext;
        }
    ];
    
    // Crear subdirectorio para TuBarResto
    add_filter('upload_dir', function($upload_dir) use ($restaurant_id) {
        $upload_dir['subdir'] = '/tubarresto/' . date('Y/m');
        $upload_dir['path'] = $upload_dir['basedir'] . $upload_dir['subdir'];
        $upload_dir['url'] = $upload_dir['baseurl'] . $upload_dir['subdir'];
        
        // Crear directorio si no existe
        if (!file_exists($upload_dir['path'])) {
            wp_mkdir_p($upload_dir['path']);
        }
        
        return $upload_dir;
    });
    
    // Subir archivo
    $uploaded_file = wp_handle_upload($file, $upload_overrides);
    
    // Remover filtro
    remove_all_filters('upload_dir');
    
    if (isset($uploaded_file['error'])) {
        throw new Exception($uploaded_file['error']);
    }
    
    // Preparar datos del attachment
    $attachment_data = [
        'post_mime_type' => $uploaded_file['type'],
        'post_title' => sanitize_file_name(pathinfo($uploaded_file['file'], PATHINFO_FILENAME)),
        'post_content' => '',
        'post_status' => 'inherit',
        'post_author' => 1, // Usuario admin por defecto
        'meta_input' => [
            '_tubarresto_restaurant_id' => $restaurant_id,
            '_tubarresto_category' => $category,
            '_tubarresto_upload_date' => current_time('mysql')
        ]
    ];
    
    // Insertar attachment en WordPress
    $attachment_id = wp_insert_attachment($attachment_data, $uploaded_file['file']);
    
    if (is_wp_error($attachment_id)) {
        throw new Exception('Error al crear attachment: ' . $attachment_id->get_error_message());
    }
    
    // Generar metadatos de imagen
    $attachment_metadata = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
    wp_update_attachment_metadata($attachment_id, $attachment_metadata);
    
    return [
        'attachment_id' => $attachment_id,
        'url' => $uploaded_file['url'],
        'file' => $uploaded_file['file'],
        'type' => $uploaded_file['type'],
        'metadata' => $attachment_metadata
    ];
}

// Función para obtener información completa de imagen
function get_image_info($attachment_id) {
    $attachment = get_post($attachment_id);
    if (!$attachment || $attachment->post_type !== 'attachment') {
        return null;
    }
    
    $metadata = wp_get_attachment_metadata($attachment_id);
    $url = wp_get_attachment_url($attachment_id);
    
    return [
        'id' => $attachment_id,
        'title' => $attachment->post_title,
        'description' => $attachment->post_content,
        'caption' => $attachment->post_excerpt,
        'alt_text' => get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
        'url' => $url,
        'file' => get_attached_file($attachment_id),
        'mime_type' => $attachment->post_mime_type,
        'width' => isset($metadata['width']) ? $metadata['width'] : null,
        'height' => isset($metadata['height']) ? $metadata['height'] : null,
        'file_size' => filesize(get_attached_file($attachment_id)),
        'upload_date' => $attachment->post_date,
        'sizes' => isset($metadata['sizes']) ? $metadata['sizes'] : [],
        'restaurant_id' => get_post_meta($attachment_id, '_tubarresto_restaurant_id', true),
        'category' => get_post_meta($attachment_id, '_tubarresto_category', true)
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
    
    // LOGIN DE USUARIO (actualizado para incluir imágenes con WordPress)
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
        
        // Para cada restaurante, obtener sus imágenes con datos de WordPress
        foreach ($restaurants as &$restaurant) {
            // Obtener logo
            if ($restaurant->logo_attachment_id) {
                $logo_info = get_image_info($restaurant->logo_attachment_id);
                $restaurant->logo_url = $logo_info ? $logo_info['url'] : null;
            } else {
                $restaurant->logo_url = null;
            }
            
            // Obtener imagen de portada
            if ($restaurant->cover_attachment_id) {
                $cover_info = get_image_info($restaurant->cover_attachment_id);
                $restaurant->cover_image_url = $cover_info ? $cover_info['url'] : null;
            } else {
                $restaurant->cover_image_url = null;
            }
            
            // Obtener galería de imágenes
            $images = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurant_images 
                 WHERE restaurant_id = %d AND is_active = 1 
                 ORDER BY category, is_primary DESC, sort_order ASC",
                $restaurant->id
            ));
            
            $restaurant->images = array_map(function($img) {
                $wp_info = get_image_info($img->attachment_id);
                return [
                    'id' => $img->id,
                    'attachment_id' => $img->attachment_id,
                    'title' => $img->title,
                    'description' => $img->description,
                    'url' => $wp_info ? $wp_info['url'] : null,
                    'category' => $img->category,
                    'isPrimary' => (bool) $img->is_primary,
                    'createdAt' => $img->created_at,
                    'wp_data' => $wp_info
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
    
    // SUBIR IMAGEN USANDO WORDPRESS MEDIA LIBRARY
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
            // Subir imagen usando WordPress
            $upload_result = upload_image_to_wordpress($file, $restaurant_id, $category);
            $image_info = get_image_info($upload_result['attachment_id']);
            
            send_success([
                'message' => 'Imagen subida exitosamente',
                'image' => [
                    'attachment_id' => $upload_result['attachment_id'],
                    'url' => $upload_result['url'],
                    'filename' => basename($upload_result['file']),
                    'original_name' => $file['name'],
                    'size' => $image_info['file_size'],
                    'mime_type' => $upload_result['type'],
                    'width' => $image_info['width'],
                    'height' => $image_info['height'],
                    'category' => $category,
                    'restaurant_id' => $restaurant_id,
                    'wp_data' => $image_info
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
        if (empty($data['restaurant_id']) || empty($data['attachment_id']) || empty($data['title'])) {
            send_error('restaurant_id, attachment_id y title son requeridos');
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
        
        // Verificar que el attachment existe
        $attachment = get_post($data['attachment_id']);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            send_error('Attachment no encontrado', 404);
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
                'attachment_id' => $data['attachment_id'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'alt_text' => $data['alt_text'] ?? null,
                'category' => $data['category'] ?? 'other',
                'is_primary' => isset($data['is_primary']) ? (bool)$data['is_primary'] : false,
                'sort_order' => $data['sort_order'] ?? 0,
                'display_settings' => isset($data['display_settings']) ? json_encode($data['display_settings']) : null
            ],
            ['%d', '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s']
        );
        
        if (!$result) {
            send_error('Error al agregar imagen', 500);
        }
        
        $image_id = $wpdb->insert_id;
        
        // Obtener la imagen creada con datos de WordPress
        $image = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM kvq_tubarresto_restaurant_images WHERE id = %d",
            $image_id
        ));
        
        $wp_info = get_image_info($image->attachment_id);
        
        send_success([
            'message' => 'Imagen agregada exitosamente',
            'image' => [
                'id' => $image->id,
                'attachment_id' => $image->attachment_id,
                'title' => $image->title,
                'description' => $image->description,
                'url' => $wp_info ? $wp_info['url'] : null,
                'category' => $image->category,
                'isPrimary' => (bool) $image->is_primary,
                'createdAt' => $image->created_at,
                'wp_data' => $wp_info
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
        if (empty($data['restaurant_id']) || empty($data['attachment_id']) || empty($data['type'])) {
            send_error('restaurant_id, attachment_id y type son requeridos');
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
        
        // Verificar que el attachment existe
        $attachment = get_post($data['attachment_id']);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            send_error('Attachment no encontrado', 404);
        }
        
        // Actualizar el campo correspondiente
        $field = $data['type'] === 'logo' ? 'logo_attachment_id' : 'cover_attachment_id';
        
        $result = $wpdb->update(
            'kvq_tubarresto_restaurants',
            [
                $field => $data['attachment_id'],
                'images_updated_at' => current_time('mysql')
            ],
            ['id' => $data['restaurant_id']],
            ['%d', '%s'],
            ['%d']
        );
        
        if ($result === false) {
            send_error('Error al actualizar imagen', 500);
        }
        
        $image_info = get_image_info($data['attachment_id']);
        
        send_success([
            'message' => ucfirst($data['type']) . ' actualizado exitosamente',
            'image' => [
                'attachment_id' => $data['attachment_id'],
                'type' => $data['type'],
                'url' => $image_info ? $image_info['url'] : null,
                'wp_data' => $image_info
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
        
        // Obtener información de WordPress para cada imagen
        $images_with_wp_data = array_map(function($img) {
            $wp_info = get_image_info($img->attachment_id);
            return [
                'id' => $img->id,
                'attachment_id' => $img->attachment_id,
                'title' => $img->title,
                'description' => $img->description,
                'alt_text' => $img->alt_text,
                'url' => $wp_info ? $wp_info['url'] : null,
                'category' => $img->category,
                'isPrimary' => (bool) $img->is_primary,
                'sortOrder' => $img->sort_order,
                'displaySettings' => $img->display_settings ? json_decode($img->display_settings, true) : null,
                'createdAt' => $img->created_at,
                'wp_data' => $wp_info
            ];
        }, $images);
        
        // Obtener imágenes principales (logo y portada)
        $main_images = [
            'logo' => null,
            'cover' => null
        ];
        
        if ($restaurant->logo_attachment_id) {
            $logo_info = get_image_info($restaurant->logo_attachment_id);
            $main_images['logo'] = [
                'attachment_id' => $restaurant->logo_attachment_id,
                'url' => $logo_info ? $logo_info['url'] : null,
                'wp_data' => $logo_info
            ];
        }
        
        if ($restaurant->cover_attachment_id) {
            $cover_info = get_image_info($restaurant->cover_attachment_id);
            $main_images['cover'] = [
                'attachment_id' => $restaurant->cover_attachment_id,
                'url' => $cover_info ? $cover_info['url'] : null,
                'wp_data' => $cover_info
            ];
        }
        
        send_success([
            'main_images' => $main_images,
            'gallery_images' => $images_with_wp_data,
            'total_images' => count($images_with_wp_data)
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
        $delete_attachment = isset($_GET['delete_attachment']) ? (bool)$_GET['delete_attachment'] : false;
        
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
        
        // Eliminar attachment de WordPress si se solicita
        if ($delete_attachment) {
            wp_delete_attachment($image->attachment_id, true);
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
            'deleted_attachment' => $delete_attachment
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
        
        // Verificar WordPress uploads
        $upload_dir = wp_upload_dir();
        $tubarresto_dir = $upload_dir['basedir'] . '/tubarresto';
        $upload_dir_exists = file_exists($tubarresto_dir);
        $upload_dir_writable = is_writable($upload_dir['basedir']);
        
        // Contar attachments de TuBarResto
        $wp_attachments_count = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->postmeta} pm 
             JOIN {$wpdb->posts} p ON pm.post_id = p.ID 
             WHERE pm.meta_key = '_tubarresto_restaurant_id' 
             AND p.post_type = 'attachment'"
        );
        
        send_success([
            'status' => 'ok',
            'message' => 'Tu Bar Resto API con WordPress Media Library funcionando correctamente',
            'database' => [
                'users_table_exists' => $users_table_exists,
                'restaurants_table_exists' => $restaurants_table_exists,
                'images_table_exists' => $images_table_exists,
                'upload_settings_table_exists' => $upload_settings_table_exists,
                'users_count' => (int) $users_count,
                'restaurants_count' => (int) $restaurants_count,
                'images_count' => (int) $images_count
            ],
            'wordpress' => [
                'upload_dir_exists' => $upload_dir_exists,
                'upload_dir_writable' => $upload_dir_writable,
                'upload_dir' => $upload_dir['basedir'],
                'upload_url' => $upload_dir['baseurl'],
                'tubarresto_dir' => $tubarresto_dir,
                'wp_attachments_count' => (int) $wp_attachments_count
            ],
            'timestamp' => current_time('mysql')
        ]);
        break;
    
    default:
        send_error('Endpoint no encontrado', 404);
        break;
}
?>
