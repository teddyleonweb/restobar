<?php
/**
 * API con soporte para WebSocket
 * Envía notificaciones en tiempo real cuando ocurren cambios
 */

// Incluir la API original
require_once 'api-simplified.php';

class WebSocketNotifier {
    private $websocket_url;
    
    public function __construct($websocket_url = 'ws://localhost:8080') {
        $this->websocket_url = $websocket_url;
    }
    
    public function sendNotification($type, $data, $user_id = null, $restaurant_id = null) {
        // En un entorno de producción, aquí enviarías la notificación al servidor WebSocket
        // Por ahora, solo registramos en logs para desarrollo
        
        $notification = [
            'type' => $type,
            'data' => $data,
            'user_id' => $user_id,
            'restaurant_id' => $restaurant_id,
            'timestamp' => time()
        ];
        
        // Log para desarrollo
        error_log("WebSocket Notification: " . json_encode($notification));
        
        // Aquí implementarías el envío real al servidor WebSocket
        // Ejemplo usando cURL para enviar a un endpoint del servidor WebSocket:
        /*
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->websocket_url . '/notify');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($notification));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        curl_close($ch);
        */
    }
    
    public function notifyRestaurantUpdate($restaurant_data, $user_id) {
        $this->sendNotification('restaurant_updated', $restaurant_data, $user_id, $restaurant_data['id']);
    }
    
    public function notifyNewOrder($order_data, $restaurant_id) {
        $this->sendNotification('new_order', $order_data, null, $restaurant_id);
    }
    
    public function notifyOrderUpdate($order_data, $restaurant_id) {
        $this->sendNotification('order_updated', $order_data, null, $restaurant_id);
    }
    
    public function notifyMenuUpdate($menu_data, $restaurant_id) {
        $this->sendNotification('menu_item_updated', $menu_data, null, $restaurant_id);
    }
}

// Instancia del notificador
$notifier = new WebSocketNotifier();

// Ejemplo de uso en el endpoint de agregar restaurante
// (Esto se integraría en la API existente)

/*
// En el caso 'add-restaurant':
if ($result) {
    $restaurant_id = $wpdb->insert_id;
    
    // Obtener el restaurante creado
    $restaurant = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM kvq_tubarresto_restaurants WHERE id = %d",
        $restaurant_id
    ));
    
    // Enviar notificación WebSocket
    $notifier->notifyRestaurantUpdate([
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
        'created_at' => $restaurant->created_at
    ], $user_data['id']);
    
    send_success([
        'message' => 'Restaurante creado exitosamente',
        'restaurant' => $restaurant_data
    ], 201);
}
*/
?>
