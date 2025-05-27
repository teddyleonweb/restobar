<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuración de la base de datos WordPress
define('DB_HOST', 'localhost');
define('DB_NAME', 'tubarresto_wp');
define('DB_USER', 'tu_usuario_db');
define('DB_PASS', 'tu_password_db');
define('DB_PREFIX', 'wp_');

// URL base de WordPress
define('WP_BASE_URL', 'https://tubarresto.somediave.com');

class TuBarRestoAPI {
    private $pdo;
    
    public function __construct() {
        try {
            $this->pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            $this->sendError('Error de conexión a la base de datos', 500);
        }
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_GET['action'] ?? '';
        
        switch ($path) {
            case 'register':
                if ($method === 'POST') {
                    $this->register();
                } else {
                    $this->sendError('Método no permitido', 405);
                }
                break;
                
            case 'login':
                if ($method === 'POST') {
                    $this->login();
                } else {
                    $this->sendError('Método no permitido', 405);
                }
                break;
                
            case 'add-restaurant':
                if ($method === 'POST') {
                    $this->addRestaurant();
                } else {
                    $this->sendError('Método no permitido', 405);
                }
                break;
                
            case 'update-restaurant':
                if ($method === 'POST') {
                    $this->updateRestaurant();
                } else {
                    $this->sendError('Método no permitido', 405);
                }
                break;
                
            case 'delete-restaurant':
                if ($method === 'POST') {
                    $this->deleteRestaurant();
                } else {
                    $this->sendError('Método no permitido', 405);
                }
                break;
                
            case 'get-restaurants':
                if ($method === 'GET') {
                    $this->getRestaurants();
                } else {
                    $this->sendError('Método no permitido', 405);
                }
                break;
                
            default:
                $this->sendError('Endpoint no encontrado', 404);
        }
    }
    
    private function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validar datos requeridos
        $required = ['nombre', 'apellido', 'email', 'telefono', 'nombreRestaurante', 'direccion', 'ciudad'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                $this->sendError("El campo {$field} es requerido", 400);
                return;
            }
        }
        
        // Validar email
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            $this->sendError('Email inválido', 400);
            return;
        }
        
        // Verificar si el email ya existe
        if ($this->emailExists($input['email'])) {
            $this->sendError('El email ya está registrado', 409);
            return;
        }
        
        try {
            $this->pdo->beginTransaction();
            
            // Generar contraseña temporal
            $temp_password = wp_generate_password(8, false);
            $hashed_password = wp_hash_password($temp_password);
            
            // Crear usuario en wp_users
            $user_login = sanitize_user($input['email']);
            $display_name = $input['nombre'] . ' ' . $input['apellido'];
            
            $stmt = $this->pdo->prepare("
                INSERT INTO " . DB_PREFIX . "users 
                (user_login, user_pass, user_nicename, user_email, user_registered, display_name, user_status) 
                VALUES (?, ?, ?, ?, NOW(), ?, 0)
            ");
            
            $stmt->execute([
                $user_login,
                $hashed_password,
                sanitize_title($display_name),
                $input['email'],
                $display_name
            ]);
            
            $user_id = $this->pdo->lastInsertId();
            
            // Agregar metadatos del usuario
            $this->addUserMeta($user_id, 'first_name', $input['nombre']);
            $this->addUserMeta($user_id, 'last_name', $input['apellido']);
            $this->addUserMeta($user_id, 'phone', $input['telefono']);
            $this->addUserMeta($user_id, 'restaurant_name', $input['nombreRestaurante']);
            $this->addUserMeta($user_id, 'restaurant_address', $input['direccion']);
            $this->addUserMeta($user_id, 'restaurant_city', $input['ciudad']);
            $this->addUserMeta($user_id, 'account_status', 'trial');
            $this->addUserMeta($user_id, 'trial_start_date', date('Y-m-d H:i:s'));
            $this->addUserMeta($user_id, 'trial_end_date', date('Y-m-d H:i:s', strtotime('+30 days')));
            $this->addUserMeta($user_id, 'account_active', '1');
            
            // Asignar rol de restaurante
            $this->addUserMeta($user_id, DB_PREFIX . 'capabilities', serialize(['restaurant_owner' => true]));
            $this->addUserMeta($user_id, DB_PREFIX . 'user_level', '0');
            
            $this->pdo->commit();
            
            // Enviar email con credenciales
            $this->sendWelcomeEmail($input['email'], $temp_password, $display_name, $input['nombreRestaurante']);
            
            $this->sendSuccess([
                'message' => 'Registro exitoso. Se han enviado tus credenciales por email.',
                'user_id' => $user_id,
                'trial_days' => 30,
                'email' => $input['email'],
                'temp_password' => $temp_password // Solo para desarrollo, remover en producción
            ]);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->sendError('Error al registrar usuario: ' . $e->getMessage(), 500);
        }
    }
    
    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['email']) || empty($input['password'])) {
            $this->sendError('Email y contraseña son requeridos', 400);
            return;
        }
        
        try {
            // Buscar usuario por email
            $stmt = $this->pdo->prepare("
                SELECT u.*, um.meta_value as account_active 
                FROM " . DB_PREFIX . "users u
                LEFT JOIN " . DB_PREFIX . "usermeta um ON u.ID = um.user_id AND um.meta_key = 'account_active'
                WHERE u.user_email = ? AND u.user_status = 0
            ");
            $stmt->execute([$input['email']]);
            $user = $stmt->fetch();
            
            if (!$user) {
                $this->sendError('Credenciales inválidas', 401);
                return;
            }
            
            // Verificar contraseña
            if (!wp_check_password($input['password'], $user['user_pass'])) {
                $this->sendError('Credenciales inválidas', 401);
                return;
            }
            
            // Verificar si la cuenta está activa
            if ($user['account_active'] !== '1') {
                $this->sendError('Cuenta inactiva. Contacta al soporte.', 403);
                return;
            }
            
            // Obtener información adicional del usuario
            $user_meta = $this->getUserMeta($user['ID']);
            
            // Generar token de sesión
            $session_token = bin2hex(random_bytes(32));
            $this->addUserMeta($user['ID'], 'session_token', $session_token);
            $this->addUserMeta($user['ID'], 'last_login', date('Y-m-d H:i:s'));
            
            // Verificar si el trial ha expirado
            $trial_end = $user_meta['trial_end_date'] ?? null;
            $trial_expired = false;
            if ($trial_end && strtotime($trial_end) < time()) {
                $trial_expired = true;
            }
            
            $this->sendSuccess([
                'message' => 'Login exitoso',
                'user' => [
                    'id' => $user['ID'],
                    'email' => $user['user_email'],
                    'display_name' => $user['display_name'],
                    'first_name' => $user_meta['first_name'] ?? '',
                    'last_name' => $user_meta['last_name'] ?? '',
                    'phone' => $user_meta['phone'] ?? '',
                    'restaurant_name' => $user_meta['restaurant_name'] ?? '',
                    'restaurant_address' => $user_meta['restaurant_address'] ?? '',
                    'restaurant_city' => $user_meta['restaurant_city'] ?? '',
                    'account_status' => $user_meta['account_status'] ?? 'trial',
                    'trial_start_date' => $user_meta['trial_start_date'] ?? null,
                    'trial_end_date' => $user_meta['trial_end_date'] ?? null,
                    'trial_expired' => $trial_expired
                ],
                'token' => $session_token
            ]);
            
        } catch (Exception $e) {
            $this->sendError('Error al iniciar sesión: ' . $e->getMessage(), 500);
        }
    }
    
    private function addRestaurant() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $this->getBearerToken();
        
        if (!$token) {
            $this->sendError('Token requerido', 401);
            return;
        }
        
        $user_id = $this->validateToken($token);
        if (!$user_id) {
            $this->sendError('Token inválido', 401);
            return;
        }
        
        // Validar datos requeridos
        $required = ['name', 'address', 'city'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                $this->sendError("El campo {$field} es requerido", 400);
                return;
            }
        }
        
        try {
            // Generar slug único
            $slug = $this->generateSlug($input['name']);
            
            $stmt = $this->pdo->prepare("
                INSERT INTO " . DB_PREFIX . "restaurants 
                (user_id, name, slug, description, address, city, phone, email, status, trial_start_date, trial_end_date, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
            ");
            
            $stmt->execute([
                $user_id,
                $input['name'],
                $slug,
                $input['description'] ?? '',
                $input['address'],
                $input['city'],
                $input['phone'] ?? '',
                $input['email'] ?? ''
            ]);
            
            $restaurant_id = $this->pdo->lastInsertId();
            
            // Obtener el restaurante creado
            $restaurant = $this->getRestaurantById($restaurant_id);
            
            $this->sendSuccess([
                'message' => 'Restaurante agregado exitosamente',
                'restaurant' => $restaurant
            ]);
            
        } catch (Exception $e) {
            $this->sendError('Error al agregar restaurante: ' . $e->getMessage(), 500);
        }
    }

    private function updateRestaurant() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $this->getBearerToken();
        
        if (!$token) {
            $this->sendError('Token requerido', 401);
            return;
        }
        
        $user_id = $this->validateToken($token);
        if (!$user_id) {
            $this->sendError('Token inválido', 401);
            return;
        }
        
        if (empty($input['id'])) {
            $this->sendError('ID del restaurante es requerido', 400);
            return;
        }
        
        try {
            // Verificar que el restaurante pertenece al usuario
            $stmt = $this->pdo->prepare("
                SELECT id FROM " . DB_PREFIX . "restaurants 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$input['id'], $user_id]);
            
            if (!$stmt->fetch()) {
                $this->sendError('Restaurante no encontrado', 404);
                return;
            }
            
            // Actualizar restaurante
            $stmt = $this->pdo->prepare("
                UPDATE " . DB_PREFIX . "restaurants 
                SET name = ?, description = ?, address = ?, city = ?, phone = ?, email = ?, 
                    logo_url = ?, cover_image_url = ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            ");
            
            $stmt->execute([
                $input['name'],
                $input['description'] ?? '',
                $input['address'],
                $input['city'],
                $input['phone'] ?? '',
                $input['email'] ?? '',
                $input['logo_url'] ?? null,
                $input['cover_image_url'] ?? null,
                $input['id'],
                $user_id
            ]);
            
            // Obtener el restaurante actualizado
            $restaurant = $this->getRestaurantById($input['id']);
            
            $this->sendSuccess([
                'message' => 'Restaurante actualizado exitosamente',
                'restaurant' => $restaurant
            ]);
            
        } catch (Exception $e) {
            $this->sendError('Error al actualizar restaurante: ' . $e->getMessage(), 500);
        }
    }

    private function deleteRestaurant() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $this->getBearerToken();
        
        if (!$token) {
            $this->sendError('Token requerido', 401);
            return;
        }
        
        $user_id = $this->validateToken($token);
        if (!$user_id) {
            $this->sendError('Token inválido', 401);
            return;
        }
        
        if (empty($input['id'])) {
            $this->sendError('ID del restaurante es requerido', 400);
            return;
        }
        
        try {
            // Verificar que el restaurante pertenece al usuario
            $stmt = $this->pdo->prepare("
                SELECT id FROM " . DB_PREFIX . "restaurants 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$input['id'], $user_id]);
            
            if (!$stmt->fetch()) {
                $this->sendError('Restaurante no encontrado', 404);
                return;
            }
            
            // Eliminar restaurante
            $stmt = $this->pdo->prepare("
                DELETE FROM " . DB_PREFIX . "restaurants 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$input['id'], $user_id]);
            
            $this->sendSuccess([
                'message' => 'Restaurante eliminado exitosamente'
            ]);
            
        } catch (Exception $e) {
            $this->sendError('Error al eliminar restaurante: ' . $e->getMessage(), 500);
        }
    }

    private function getRestaurants() {
        $token = $this->getBearerToken();
        
        if (!$token) {
            $this->sendError('Token requerido', 401);
            return;
        }
        
        $user_id = $this->validateToken($token);
        if (!$user_id) {
            $this->sendError('Token inválido', 401);
            return;
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM " . DB_PREFIX . "restaurants 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            ");
            $stmt->execute([$user_id]);
            $restaurants = $stmt->fetchAll();
            
            $this->sendSuccess([
                'restaurants' => $restaurants
            ]);
            
        } catch (Exception $e) {
            $this->sendError('Error al obtener restaurantes: ' . $e->getMessage(), 500);
        }
    }

    private function getBearerToken() {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
                return $matches[1];
            }
        }
        return null;
    }

    private function validateToken($token) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT user_id FROM " . DB_PREFIX . "usermeta 
                WHERE meta_key = 'session_token' AND meta_value = ?
            ");
            $stmt->execute([$token]);
            $result = $stmt->fetch();
            
            return $result ? $result['user_id'] : false;
        } catch (Exception $e) {
            return false;
        }
    }

    private function generateSlug($name) {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
        
        // Verificar si el slug ya existe
        $counter = 1;
        $original_slug = $slug;
        
        while ($this->slugExists($slug)) {
            $slug = $original_slug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }

    private function slugExists($slug) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM " . DB_PREFIX . "restaurants WHERE slug = ?");
        $stmt->execute([$slug]);
        return $stmt->fetchColumn() > 0;
    }

    private function getRestaurantById($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM " . DB_PREFIX . "restaurants WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    // Métodos auxiliares
    private function emailExists($email) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM " . DB_PREFIX . "users WHERE user_email = ?");
        $stmt->execute([$email]);
        return $stmt->fetchColumn() > 0;
    }
    
    private function addUserMeta($user_id, $meta_key, $meta_value) {
        $stmt = $this->pdo->prepare("
            INSERT INTO " . DB_PREFIX . "usermeta (user_id, meta_key, meta_value) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$user_id, $meta_key, $meta_value]);
    }
    
    private function updateUserMeta($user_id, $meta_key, $meta_value) {
        $stmt = $this->pdo->prepare("
            UPDATE " . DB_PREFIX . "usermeta 
            SET meta_value = ? 
            WHERE user_id = ? AND meta_key = ?
        ");
        $stmt->execute([$meta_value, $user_id, $meta_key]);
    }
    
    private function getUserMeta($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT meta_key, meta_value 
            FROM " . DB_PREFIX . "usermeta 
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        $meta = [];
        while ($row = $stmt->fetch()) {
            $meta[$row['meta_key']] = $row['meta_value'];
        }
        return $meta;
    }
    
    private function sendWelcomeEmail($email, $password, $name, $restaurant_name) {
        $login_url = WP_BASE_URL . "/login";
        
        $subject = "¡Bienvenido a Tu Bar Resto! - Credenciales de acceso";
        $message = "
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <div style='text-align: center; margin-bottom: 30px;'>
                    <h1 style='color: #E94B4F; margin-bottom: 10px;'>¡Bienvenido a Tu Bar Resto!</h1>
                    <p style='color: #666; font-size: 18px;'>Tu cuenta ha sido creada exitosamente</p>
                </div>
                
                <div style='background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;'>
                    <h2 style='color: #E94B4F; margin-top: 0;'>Hola {$name},</h2>
                    <p>¡Gracias por registrar <strong>{$restaurant_name}</strong> en Tu Bar Resto!</p>
                    <p>Tu periodo de prueba gratuito de <strong>30 días</strong> ha comenzado. Aquí están tus credenciales de acceso:</p>
                </div>
                
                <div style='background-color: #fff; border: 2px solid #E94B4F; padding: 20px; border-radius: 8px; margin-bottom: 25px;'>
                    <h3 style='margin-top: 0; color: #E94B4F;'>Credenciales de acceso:</h3>
                    <p><strong>Email:</strong> {$email}</p>
                    <p><strong>Contraseña:</strong> {$password}</p>
                    <p style='color: #666; font-size: 14px; margin-bottom: 0;'><em>Te recomendamos cambiar tu contraseña después del primer inicio de sesión.</em></p>
                </div>
                
                <div style='text-align: center; margin-bottom: 25px;'>
                    <a href='{$login_url}' style='background-color: #E94B4F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>Iniciar Sesión Ahora</a>
                </div>
                
                <div style='background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;'>
                    <h3 style='color: #28a745; margin-top: 0;'>¿Qué puedes hacer durante tu prueba gratuita?</h3>
                    <ul style='margin: 0; padding-left: 20px;'>
                        <li>Crear tu menú digital con hasta 10 productos</li>
                        <li>Generar códigos QR para tus mesas</li>
                        <li>Recibir pedidos en tiempo real</li>
                        <li>Acceder a reportes básicos de ventas</li>
                        <li>Configurar métodos de pago</li>
                    </ul>
                </div>
                
                <div style='border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666;'>
                    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                    <p><strong>El equipo de Tu Bar Resto</strong></p>
                    <p style='font-size: 12px;'>Este email fue enviado a {$email}</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: Tu Bar Resto <noreply@tubarresto.com>',
            'Reply-To: support@tubarresto.com'
        ];
        
        mail($email, $subject, $message, implode("\r\n", $headers));
    }
    
    private function sendSuccess($data, $code = 200) {
        http_response_code($code);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
}

// Funciones auxiliares de WordPress (simplificadas)
function wp_hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function wp_check_password($password, $hash) {
    return password_verify($password, $hash);
}

function wp_generate_password($length = 8, $special_chars = false) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if ($special_chars) {
        $chars .= '!@#$%^&*()';
    }
    return substr(str_shuffle($chars), 0, $length);
}

function sanitize_user($username) {
    return preg_replace('/[^a-zA-Z0-9._@-]/', '', $username);
}

function sanitize_title($title) {
    return strtolower(preg_replace('/[^a-zA-Z0-9-]/', '-', $title));
}

// Inicializar API
$api = new TuBarRestoAPI();
$api->handleRequest();
?>
