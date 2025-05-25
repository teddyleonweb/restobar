<?php
/**
 * API simplificada para Tu Bar Resto - Para testing inicial
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

// Extraer la ruta después de api-simple.php
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
        
    default:
        http_response_code(404);
        echo json_encode([
            'error' => 'Ruta no encontrada',
            'path' => $path_info,
            'method' => $method,
            'available_routes' => [
                'GET /status',
                'POST /auth/register', 
                'POST /auth/login'
            ]
        ]);
        break;
}
?>
