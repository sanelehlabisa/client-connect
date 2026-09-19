-- Extend the product types after the original proof-of-concept schema.

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE products
    ADD CONSTRAINT products_product_type_check
    CHECK (product_type IN ('GOAL', 'INSURANCE', 'INVESTMENT'));
