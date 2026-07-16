import sqlite3

def check_db():
    conn = sqlite3.connect('erp.db')
    cursor = conn.cursor()
    
    tables = [
        "users", "customers", "products", "customer_prices", 
        "bills", "bill_items", "stock_transactions"
    ]
    
    print("Database Counts:")
    print("-" * 20)
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"{table.capitalize()}: {count}")

    conn.close()

if __name__ == "__main__":
    check_db()
