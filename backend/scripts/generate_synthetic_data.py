import os
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "compliance_history.db")

def generate_data():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all users
    try:
        cursor.execute("SELECT user_id FROM users")
        users = cursor.fetchall()
    except sqlite3.OperationalError:
        print("users table does not exist. No users to seed data for.")
        return

    if not users:
        print("No users found in database. Please log in first.")
        return

    print(f"Found {len(users)} users. Generating 30 days of data for each...")

    for (user_id,) in users:
        # Clear existing logs for this user to avoid duplicates if run multiple times
        cursor.execute("DELETE FROM compliance_logs WHERE user_id = ?", (user_id,))
        
        # Generate 30 days of historical data
        now = datetime.now()
        base_score = random.randint(40, 60) # Start with a lower score
        
        for i in range(30):
            days_ago = 29 - i
            timestamp = (now - timedelta(days=days_ago)).isoformat()
            
            # Score trends upwards with some randomness
            base_score = min(100, base_score + random.randint(-2, 5))
            
            total_reqs = random.randint(30, 50)
            score_factor = base_score / 100.0
            
            satisfied = int(total_reqs * score_factor)
            partial = int((total_reqs - satisfied) * random.random())
            missing = total_reqs - satisfied - partial
            
            cursor.execute('''
                INSERT INTO compliance_logs (user_id, timestamp, score, satisfied, partial, missing)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, timestamp, base_score, satisfied, partial, missing))
            
        cursor.execute("UPDATE users SET docs_uploaded = 30 WHERE user_id = ?", (user_id,))
        print(f"Seeded 30 days of compliance logs for user {user_id}")

    conn.commit()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    generate_data()
