<?php
/**
 * Servidor WebSocket para Tu Bar Resto
 * Maneja conexiones en tiempo real para actualizaciones automáticas
 */

require_once 'vendor/autoload.php'; // Si usas Composer
require_once 'wp-load.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class TuBarRestoWebSocket implements MessageComponentInterface {
    protected $clients;
    protected $userConnections;
    protected $restaurantConnections;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->userConnections = [];
        $this->restaurantConnections = [];
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "Nueva conexión: ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!$data || !isset($data['type'])) {
            return;
        }

        switch ($data['type']) {
            case 'auth':
                $this->handleAuth($from, $data);
                break;
            case 'subscribe_restaurant':
                $this->handleRestaurantSubscription($from, $data);
                break;
            case 'ping':
                $from->send(json_encode(['type' => 'pong']));
                break;
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        
        // Remover de todas las suscripciones
        foreach ($this->userConnections as $userId => $connections) {
            if (($key = array_search($conn, $connections)) !== false) {
                unset($this->userConnections[$userId][$key]);
            }
        }
        
        foreach ($this->restaurantConnections as $restaurantId => $connections) {
            if (($key = array_search($conn, $connections)) !== false) {
                unset($this->restaurantConnections[$restaurantId][$key]);
            }
        }
        
        echo "Conexión cerrada: ({$conn->resourceId})\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }

    private function handleAuth($conn, $data) {
        if (!isset($data['token'])) {
            return;
        }

        $userData = $this->verifyToken($data['token']);
        if ($userData) {
            $userId = $userData['id'];
            
            if (!isset($this->userConnections[$userId])) {
                $this->userConnections[$userId] = [];
            }
            
            $this->userConnections[$userId][] = $conn;
            
            $conn->send(json_encode([
                'type' => 'auth_success',
                'user_id' => $userId
            ]));
            
            echo "Usuario autenticado: {$userId}\n";
        } else {
            $conn->send(json_encode([
                'type' => 'auth_error',
                'message' => 'Token inválido'
            ]));
        }
    }

    private function handleRestaurantSubscription($conn, $data) {
        if (!isset($data['restaurant_id'])) {
            return;
        }

        $restaurantId = $data['restaurant_id'];
        
        if (!isset($this->restaurantConnections[$restaurantId])) {
            $this->restaurantConnections[$restaurantId] = [];
        }
        
        $this->restaurantConnections[$restaurantId][] = $conn;
        
        $conn->send(json_encode([
            'type' => 'subscription_success',
            'restaurant_id' => $restaurantId
        ]));
        
        echo "Suscripción a restaurante: {$restaurantId}\n";
    }

    // Método para enviar actualizaciones a usuarios específicos
    public function sendToUser($userId, $message) {
        if (isset($this->userConnections[$userId])) {
            foreach ($this->userConnections[$userId] as $conn) {
                $conn->send(json_encode($message));
            }
        }
    }

    // Método para enviar actualizaciones a restaurante específico
    public function sendToRestaurant($restaurantId, $message) {
        if (isset($this->restaurantConnections[$restaurantId])) {
            foreach ($this->restaurantConnections[$restaurantId] as $conn) {
                $conn->send(json_encode($message));
            }
        }
    }

    // Método para broadcast a todos los clientes
    public function broadcast($message) {
        foreach ($this->clients as $client) {
            $client->send(json_encode($message));
        }
    }

    private function verifyToken($token) {
        if (empty($token)) return false;
        
        $parts = explode('.', $token);
        if (count($parts) != 3) return false;
        
        try {
            $payload_json = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
            $payload = json_decode($payload_json, true);
            
            if (!$payload || !isset($payload['id']) || !isset($payload['email'])) {
                return false;
            }
            
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
}

// Iniciar el servidor WebSocket
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new TuBarRestoWebSocket()
        )
    ),
    8080 // Puerto del WebSocket
);

echo "Servidor WebSocket iniciado en puerto 8080\n";
$server->run();
?>
