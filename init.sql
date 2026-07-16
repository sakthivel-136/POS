CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- For customer portal login
    customer_name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    place VARCHAR(255),
    phone_number VARCHAR(20),
    gst VARCHAR(50),
    address TEXT,
    credit_limit DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    tamil_name VARCHAR(255),
    category VARCHAR(100),
    default_selling_price DECIMAL(10, 2) NOT NULL,
    purchase_price DECIMAL(10, 2),
    current_stock DECIMAL(10, 2) DEFAULT 0.00,
    minimum_stock DECIMAL(10, 2) DEFAULT 0.00,
    unit VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_prices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    custom_price DECIMAL(10, 2) NOT NULL,
    UNIQUE(customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    pending_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid', -- paid, partially_paid, unpaid
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10, 2) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, converted_to_bill, rejected
    total_amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10, 2) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50), -- cash, upi, bank
    notes TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    transaction_type VARCHAR(50) NOT NULL, -- purchase, sale, adjustment, damage, return, opening
    quantity DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    remarks TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Seed an admin user for initial login (if 'SAKTHI' logic is purely app-level, we might not need this, but good to have a default root)
-- Actually, the app logic will handle creating 'SAKTHI' on first login.
