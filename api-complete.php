<?php
/**
 * API completa para Tu Bar Resto
 */

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Manejar OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Incluir WordPress
if (!file_exists('wp-load.php')) {
    echo json_encode(['error' => 'WordPress no encontrado']);
    exit;
}

require_once('wp-load.php');

// Obtener la ruta
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Extraer la ruta después de api-complete.php
$script_name = basename($_SERVER['SCRIPT_NAME']);
$path_info = str_replace('/' . $script_name, '', parse_url($request_uri, PHP_URL_PATH));

// Si no hay path, usar PATH_INFO
if (empty($path_info) && isset($_SERVER['PATH_INFO'])) {
    $path_info = $_SERVER['PATH_INFO'];
}

// Log para debugging
error_log("API Request: Method=$method, URI=$request_uri, Path=$path_info");

// Obtener datos del body
$input = file_get_contents('php://input');
$data = json_decode($input, true) ?: [];

// Función para generar token simple
function generate_simple_token($user_id, $email) {
    $payload = [
        'id' => $user_id,
        'email' => $email,
        'exp' => time() + (7 * 24 * 60 * 60)
    ];
    return base64_encode(json_encode($payload));
}

// Función para verificar token simple
function verify_simple_token($token) {
    if (empty($token)) return false;
    
    $token = str_replace('Bearer ', '', $token);
    $payload = json_decode(base64_decode($token), true);
    
    if (!$payload || !isset($payload['id']) || $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

// Función para obtener usuario autenticado
function get_authenticated_user() {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token_data = verify_simple_token($auth_header);
    
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido o expirado']);
        exit;
    }
    
    return $token_data;
}

// Routing
switch ($path_info) {
    case '/status':
        if ($method === 'GET') {
            echo json_encode([
                'status' => 'ok', 
                'message' => 'API funcionando',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }
        break;
        
    case '/auth/register':
        if ($method === 'POST') {
            global $wpdb;
            
            // Validar datos
            $required = ['name', 'apellido', 'email', 'telefono', 'nombreRestaurante', 'direccion', 'ciudad', 'password'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo requerido: $field"]);
                    exit;
                }
            }
            
            // Verificar si existe el usuario
            $exists = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM kvq_tubarresto_users WHERE email = %s",
                $data['email']
            ));
            
            if ($exists) {
                http_response_code(400);
                echo json_encode(['error' => 'El email ya está registrado']);
                exit;
            }
            
            // Crear usuario
            $result = $wpdb->insert(
                'kvq_tubarresto_users',
                [
                    'name' => $data['name'],
                    'apellido' => $data['apellido'],
                    'email' => $data['email'],
                    'telefono' => $data['telefono'],
                    'password' => password_hash($data['password'], PASSWORD_DEFAULT),
                    'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+30 days'))
                ]
            );
            
            if ($result) {
                $user_id = $wpdb->insert_id;
                
                // Crear restaurante por defecto
                $wpdb->insert(
                    'kvq_tubarresto_restaurants',
                    [
                        'user_id' => $user_id,
                        'name' => $data['nombreRestaurante'],
                        'address' => $data['direccion'],
                        'city' => $data['ciudad'],
                        'qr_code' => 'QR_' . $user_id . '_' . uniqid(),
                        'is_active' => 1
                    ]
                );
                
                echo json_encode(['success' => true, 'message' => 'Usuario registrado correctamente']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al crear usuario: ' . $wpdb->last_error]);
            }
        }
        break;
        
    case '/auth/login':
        if ($method === 'POST') {
            global $wpdb;
            
            if (empty($data['email']) || empty($data['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email y contraseña requeridos']);
                exit;
            }
            
            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_users WHERE email = %s",
                $data['email']
            ));
            
            if (!$user || !password_verify($data['password'], $user->password)) {
                http_response_code(401);
                echo json_encode(['error' => 'Credenciales incorrectas']);
                exit;
            }
            
            $token = generate_simple_token($user->id, $user->email);
            
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
        }
        break;
        
    case '/auth/user':
        if ($method === 'GET') {
            global $wpdb;
            $user = get_authenticated_user();
            
            // Obtener restaurantes del usuario
            $restaurants = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurants WHERE user_id = %d ORDER BY created_at DESC",
                $user['id']
            ));
            
            // Obtener platos del usuario
            $dishes = $wpdb->get_results($wpdb->prepare(
                "SELECT d.*, r.name as restaurantName 
                 FROM kvq_tubarresto_dishes d 
                 LEFT JOIN kvq_tubarresto_restaurants r ON d.restaurant_id = r.id 
                 WHERE d.user_id = %d 
                 ORDER BY d.created_at DESC",
                $user['id']
            ));
            
            echo json_encode([
                'restaurants' => $restaurants,
                'dishes' => $dishes
            ]);
        }
        break;
        
    case '/restaurants':
        if ($method === 'GET') {
            global $wpdb;
            $user = get_authenticated_user();
            
            $restaurants = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurants WHERE user_id = %d ORDER BY created_at DESC",
                $user['id']
            ));
            
            echo json_encode(['restaurants' => $restaurants]);
        }
        
        if ($method === 'POST') {
            global $wpdb;
            $user = get_authenticated_user();
            
            $required = ['name', 'address', 'city'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo requerido: $field"]);
                    exit;
                }
            }
            
            $result = $wpdb->insert(
                'kvq_tubarresto_restaurants',
                [
                    'user_id' => $user['id'],
                    'name' => $data['name'],
                    'description' => $data['description'] ?? '',
                    'address' => $data['address'],
                    'city' => $data['city'],
                    'phone' => $data['phone'] ?? '',
                    'email' => $data['email'] ?? '',
                    'logo' => $data['logo'] ?? '',
                    'qr_code' => 'QR_' . $user['id'] . '_' . uniqid(),
                    'is_active' => 1
                ]
            );
            
            if ($result) {
                $restaurant_id = $wpdb->insert_id;
                $restaurant = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d",
                    $restaurant_id
                ));
                echo json_encode(['success' => true, 'restaurant' => $restaurant]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al crear restaurante: ' . $wpdb->last_error]);
            }
        }
        break;
        
    case (preg_match('/^\/restaurants\/(\d+)$/', $path_info, $matches) ? true : false):
        $restaurant_id = $matches[1];
        
        if ($method === 'PUT') {
            global $wpdb;
            $user = get_authenticated_user();
            
            // Verificar que el restaurante pertenece al usuario
            $restaurant = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
                $restaurant_id, $user['id']
            ));
            
            if (!$restaurant) {
                http_response_code(404);
                echo json_encode(['error' => 'Restaurante no encontrado']);
                exit;
            }
            
            $update_data = [];
            $allowed_fields = ['name', 'description', 'address', 'city', 'phone', 'email', 'logo', 'is_active'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    $update_data[$field] = $data[$field];
                }
            }
            
            if (!empty($update_data)) {
                $result = $wpdb->update(
                    'kvq_tubarresto_restaurants',
                    $update_data,
                    ['id' => $restaurant_id]
                );
                
                if ($result !== false) {
                    echo json_encode(['success' => true, 'message' => 'Restaurante actualizado']);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Error al actualizar restaurante']);
                }
            } else {
                echo json_encode(['success' => true, 'message' => 'No hay cambios']);
            }
        }
        
        if ($method === 'DELETE') {
            global $wpdb;
            $user = get_authenticated_user();
            
            // Verificar que el restaurante pertenece al usuario
            $restaurant = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
                $restaurant_id, $user['id']
            ));
            
            if (!$restaurant) {
                http_response_code(404);
                echo json_encode(['error' => 'Restaurante no encontrado']);
                exit;
            }
            
            $result = $wpdb->delete(
                'kvq_tubarresto_restaurants',
                ['id' => $restaurant_id]
            );
            
            if ($result) {
                echo json_encode(['success' => true, 'message' => 'Restaurante eliminado']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al eliminar restaurante']);
            }
        }
        break;
        
    case '/dishes':
        if ($method === 'GET') {
            global $wpdb;
            $user = get_authenticated_user();
            
            $restaurant_id = $_GET['restaurant_id'] ?? null;
            
            if ($restaurant_id) {
                $dishes = $wpdb->get_results($wpdb->prepare(
                    "SELECT d.*, r.name as restaurantName 
                     FROM kvq_tubarresto_dishes d 
                     LEFT JOIN kvq_tubarresto_restaurants r ON d.restaurant_id = r.id 
                     WHERE d.user_id = %d AND d.restaurant_id = %d 
                     ORDER BY d.created_at DESC",
                    $user['id'], $restaurant_id
                ));
            } else {
                $dishes = $wpdb->get_results($wpdb->prepare(
                    "SELECT d.*, r.name as restaurantName 
                     FROM kvq_tubarresto_dishes d 
                     LEFT JOIN kvq_tubarresto_restaurants r ON d.restaurant_id = r.id 
                     WHERE d.user_id = %d 
                     ORDER BY d.created_at DESC",
                    $user['id']
                ));
            }
            
            echo json_encode(['dishes' => $dishes]);
        }
        
        if ($method === 'POST') {
            global $wpdb;
            $user = get_authenticated_user();
            
            $required = ['name', 'price', 'restaurant_id'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo requerido: $field"]);
                    exit;
                }
            }
            
            // Verificar que el restaurante pertenece al usuario
            $restaurant = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d AND user_id = %d",
                $data['restaurant_id'], $user['id']
            ));
            
            if (!$restaurant) {
                http_response_code(400);
                echo json_encode(['error' => 'Restaurante no válido']);
                exit;
            }
            
            $result = $wpdb->insert(
                'kvq_tubarresto_dishes',
                [
                    'user_id' => $user['id'],
                    'restaurant_id' => $data['restaurant_id'],
                    'name' => $data['name'],
                    'description' => $data['description'] ?? '',
                    'price' => $data['price'],
                    'category' => $data['category'] ?? 'General',
                    'image' => $data['image'] ?? '',
                    'is_available' => $data['is_available'] ?? 1
                ]
            );
            
            if ($result) {
                $dish_id = $wpdb->insert_id;
                $dish = $wpdb->get_row($wpdb->prepare(
                    "SELECT d.*, r.name as restaurantName 
                     FROM kvq_tubarresto_dishes d 
                     LEFT JOIN kvq_tubarresto_restaurants r ON d.restaurant_id = r.id 
                     WHERE d.id = %d",
                    $dish_id
                ));
                echo json_encode(['success' => true, 'dish' => $dish]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al crear plato: ' . $wpdb->last_error]);
            }
        }
        break;
        
    case (preg_match('/^\/dishes\/(\d+)$/', $path_info, $matches) ? true : false):
        $dish_id = $matches[1];
        
        if ($method === 'PUT') {
            global $wpdb;
            $user = get_authenticated_user();
            
            // Verificar que el plato pertenece al usuario
            $dish = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_dishes WHERE id = %d AND user_id = %d",
                $dish_id, $user['id']
            ));
            
            if (!$dish) {
                http_response_code(404);
                echo json_encode(['error' => 'Plato no encontrado']);
                exit;
            }
            
            $update_data = [];
            $allowed_fields = ['name', 'description', 'price', 'category', 'image', 'is_available'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    $update_data[$field] = $data[$field];
                }
            }
            
            if (!empty($update_data)) {
                $result = $wpdb->update(
                    'kvq_tubarresto_dishes',
                    $update_data,
                    ['id' => $dish_id]
                );
                
                if ($result !== false) {
                    echo json_encode(['success' => true, 'message' => 'Plato actualizado']);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Error al actualizar plato']);
                }
            } else {
                echo json_encode(['success' => true, 'message' => 'No hay cambios']);
            }
        }
        
        if ($method === 'DELETE') {
            global $wpdb;
            $user = get_authenticated_user();
            
            // Verificar que el plato pertenece al usuario
            $dish = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_dishes WHERE id = %d AND user_id = %d",
                $dish_id, $user['id']
            ));
            
            if (!$dish) {
                http_response_code(404);
                echo json_encode(['error' => 'Plato no encontrado']);
                exit;
            }
            
            $result = $wpdb->delete(
                'kvq_tubarresto_dishes',
                ['id' => $dish_id]
            );
            
            if ($result) {
                echo json_encode(['success' => true, 'message' => 'Plato eliminado']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al eliminar plato']);
            }
        }
        break;
        
    case (preg_match('/^\/menu\/(.+)$/', $path_info, $matches) ? true : false):
        if ($method === 'GET') {
            global $wpdb;
            $qr_code = $matches[1];
            
            // Obtener restaurante por QR
            $restaurant = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_restaurants WHERE qr_code = %s AND is_active = 1",
                $qr_code
            ));
            
            if (!$restaurant) {
                http_response_code(404);
                echo json_encode(['error' => 'Restaurante no encontrado']);
                exit;
            }
            
            // Obtener platos del restaurante
            $dishes = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM kvq_tubarresto_dishes WHERE restaurant_id = %d AND is_available = 1 ORDER BY category, name",
                $restaurant->id
            ));
            
            echo json_encode([
                'restaurant' => $restaurant,
                'dishes' => $dishes
            ]);
        }
        break;
        
    default:
        http_response_code(404);
        echo json_encode([
            'error' => 'Ruta no encontrada',
            'path' => $path_info,
            'method' => $method,
            'available_routes' => [
                'GET /status',
                'POST /auth/register', 
                'POST /auth/login',
                'GET /auth/user',
                'GET /restaurants',
                'POST /restaurants',
                'PUT /restaurants/{id}',
                'DELETE /restaurants/{id}',
                'GET /dishes',
                'POST /dishes',
                'PUT /dishes/{id}',
                'DELETE /dishes/{id}',
                'GET /menu/{qr_code}'
            ]
        ]);
        break;
}
?>
