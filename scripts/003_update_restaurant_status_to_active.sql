-- Actualiza el estado del restaurante con ID 7 (o el ID de tu restaurante deseado) a 'active'
UPDATE `kvq_tubarresto_restaurants`
SET `status` = 'active'
WHERE `id` = 7;

-- Opcional: Si quieres actualizar otro restaurante, cambia el ID y el slug
-- UPDATE `kvq_tubarresto_restaurants`
-- SET `status` = 'active'
-- WHERE `slug` = 'el-sabor-de-la-negra';
