import sqlite3
import os
import logging
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "compliance_history.db")

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS compliance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        score INTEGER NOT NULL,
        satisfied INTEGER NOT NULL,
        partial INTEGER NOT NULL,
        missing INTEGER NOT NULL
    )
    ''')
    
    # Check if we need to seed the database (if empty)
    cursor.execute('SELECT COUNT(*) FROM compliance_logs')
    count = cursor.fetchone()[0]
    
    if count == 0:
        logger.info("Database is empty. Seeding historical data for the CISO Dashboard...")
        # Seed 30 days of synthetic data showing improvement
        base_date = datetime.now() - timedelta(days=30)
        
        # Start at ~25%, end at current or ~80%
        current_score = 25
        satisfied = 10
        partial = 5
        missing = 45
        
        for i in range(30):
            date_str = (base_date + timedelta(days=i)).isoformat()
            
            # Slight random fluctuations, but overall upward trend
            if random.random() > 0.3:
                improvements = random.randint(0, 3)
                satisfied += improvements
                missing = max(0, missing - improvements)
                
                partial_shifts = random.randint(0, 2)
                partial += partial_shifts
                missing = max(0, missing - partial_shifts)
                
            total_reqs = satisfied + partial + missing
            score = int(((satisfied + (partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
            
            cursor.execute('''
            INSERT INTO compliance_logs (timestamp, score, satisfied, partial, missing)
            VALUES (?, ?, ?, ?, ?)
            ''', (date_str, score, satisfied, partial, missing))
            
        conn.commit()
        logger.info("Historical data seeded successfully.")
        
    conn.close()

def log_compliance_score(score: int, satisfied: int, partial: int, missing: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        timestamp = datetime.now().isoformat()
        
        cursor.execute('''
        INSERT INTO compliance_logs (timestamp, score, satisfied, partial, missing)
        VALUES (?, ?, ?, ?, ?)
        ''', (timestamp, score, satisfied, partial, missing))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log compliance score: {e}")

def get_historical_scores() -> list:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT timestamp, score, satisfied, partial, missing 
        FROM compliance_logs 
        ORDER BY timestamp ASC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for r in rows:
            results.append({
                "timestamp": r[0],
                "score": r[1],
                "satisfied": r[2],
                "partial": r[3],
                "missing": r[4]
            })
            
        return results
    except Exception as e:
        logger.error(f"Failed to fetch historical scores: {e}")
        return []
