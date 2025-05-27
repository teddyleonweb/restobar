<?php
// Configuración de errores para producción
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Headers CORS y de contenido
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Función para enviar respuestas JSON
function sendResponse($success, $data = null, $message = '', $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'server_info' => [
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Función para logging de errores
function logError($message, $context = []) {
    $log = [
        'timestamp' => date('Y-m-d H:i:s'),
        'message' => $message,
        'context' => $context,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
    ];
    error_log('TuBarResto API Error: ' . json_encode($log));
}

try {
    // Obtener la acción solicitada
    $action = $_GET['action'] ?? $_POST['action'] ?? 'status';
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Log de la petición
    logError('API Request', [
        'action' => $action,
        'method' => $method,
        'get_params' => $_GET,
        'post_data' => $method === 'POST' ? 'Present' : 'None'
    ]);
    
    switch ($action) {
        case 'status':
        case '':
            sendResponse(true, [
                'status' => 'API funcionando correctamente',
                'version' => '1.0.0',
                'endpoints' => [
                    'status' => 'GET /api.php?action=status',
                    'test' => 'GET /api.php?action=test',
                    'register' => 'POST /api.php?action=register',
                    'login' => 'POST /api.php?action=login'
                ],
                'server_time' => date('Y-m-d H:i:s'),
                'request_info' => [
                    'method' => $method,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
                ]
            ], 'API está funcionando correctamente');
            break;
            
        case 'test':
            sendResponse(true, [
                'test_result' => 'success',
                'database_connection' => 'simulated',
                'php_extensions' => [
                    'pdo' => extension_loaded('pdo'),
                    'pdo_mysql' => extension_loaded('pdo_mysql'),
                    'json' => extension_loaded('json'),
                    'curl' => extension_loaded('curl')
                ],
                'server_vars' => [
                    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
                    'server_name' => $_SERVER['SERVER_NAME'] ?? 'Unknown',
                    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown'
                ]
            ], 'Test completado exitosamente');
            break;
            
        case 'register':
            if ($method !== 'POST') {
                sendResponse(false, null, 'Método no permitido. Use POST.', 405);
            }
            
            // Obtener datos del POST
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                sendResponse(false, null, 'Datos JSON inválidos', 400);
            }
            
            // Validar campos requeridos
            $required_fields = ['nombre', 'apellido', 'email', 'telefono', 'nombreRestaurante', 'direccion', 'ciudad'];
            $missing_fields = [];
            
            foreach ($required_fields as $field) {
                if (empty($input[$field])) {
                    $missing_fields[] = $field;
                }
            }
            
            if (!empty($missing_fields)) {
                sendResponse(false, null, 'Campos requeridos faltantes: ' . implode(', ', $missing_fields), 400);
            }
            
            // Validar email
            if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                sendResponse(false, null, 'Email inválido', 400);
            }
            
            // Simular registro exitoso (aquí iría la lógica de base de datos)
            $user_id = rand(1000, 9999);
            $temp_password = 'temp' . rand(1000, 9999);
            
            sendResponse(true, [
                'user_id' => $user_id,
                'email' => $input['email'],
                'temp_password' => $temp_password,
                'trial_days' => 30,
                'restaurant_name' => $input['nombreRestaurante']
            ], 'Registro exitoso. Credenciales enviadas por email.');
            break;
            
        case 'login':
            if ($method !== 'POST') {
                sendResponse(false, null, 'Método no permitido. Use POST.', 405);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || empty($input['email']) || empty($input['password'])) {
                sendResponse(false, null, 'Email y contraseña son requeridos', 400);
            }
            
            // Simular login exitoso
            $session_token = bin2hex(random_bytes(32));
            
            sendResponse(true, [
                'user' => [
                    'id' => 1234,
                    'email' => $input['email'],
                    'display_name' => 'Usuario Demo',
                    'restaurant_name' => 'Restaurante Demo',
                    'account_status' => 'trial',
                    'trial_expired' => false
                ],
                'token' => $session_token
            ], 'Login exitoso');
            break;
            
        default:
            sendResponse(false, null, "Endpoint '{$action}' no encontrado", 404);
    }
    
} catch (Exception $e) {
    logError('Exception caught', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    sendResponse(false, null, 'Error interno del servidor: ' . $e->getMessage(), 500);
    
} catch (Error $e) {
    logError('Fatal error caught', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    sendResponse(false, null, 'Error fatal del servidor', 500);
}
?>
