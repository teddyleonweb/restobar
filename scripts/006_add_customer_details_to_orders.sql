ALTER TABLE kvq_tubarresto_orders
ADD COLUMN customer_first_name VARCHAR(255) NULL AFTER status,
ADD COLUMN customer_last_name VARCHAR(255) NULL AFTER customer_first_name;

ALTER TABLE kvq_tubarresto_order_items
ADD COLUMN item_notes TEXT NULL AFTER price_at_order;
