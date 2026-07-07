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
        user_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        score INTEGER NOT NULL,
        satisfied INTEGER NOT NULL,
        partial INTEGER NOT NULL,
        missing INTEGER NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        last_login TEXT,
        docs_uploaded INTEGER DEFAULT 0
    )
    ''')
    
    conn.commit()
    conn.close()

def log_compliance_score(user_id: str, score: int, satisfied: int, partial: int, missing: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        timestamp = datetime.now().isoformat()
        
        cursor.execute('''
        INSERT INTO compliance_logs (user_id, timestamp, score, satisfied, partial, missing)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, timestamp, score, satisfied, partial, missing))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log compliance score: {e}")

def get_historical_scores(user_id: str) -> list:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT timestamp, score, satisfied, partial, missing 
        FROM compliance_logs 
        WHERE user_id = ?
        ORDER BY timestamp ASC
        ''', (user_id,))
        
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

def upsert_user_login(user_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        
        cursor.execute('SELECT user_id FROM users WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        
        if row:
            cursor.execute('UPDATE users SET last_login = ? WHERE user_id = ?', (timestamp, user_id))
        else:
            cursor.execute('INSERT INTO users (user_id, last_login, docs_uploaded) VALUES (?, ?, 0)', (user_id, timestamp))
            
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to upsert user login: {e}")

def increment_docs_uploaded(user_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Ensure user exists before incrementing
        cursor.execute('SELECT user_id FROM users WHERE user_id = ?', (user_id,))
        if not cursor.fetchone():
            timestamp = datetime.now().isoformat()
            cursor.execute('INSERT INTO users (user_id, last_login, docs_uploaded) VALUES (?, ?, 0)', (user_id, timestamp))
            
        cursor.execute('UPDATE users SET docs_uploaded = docs_uploaded + 1 WHERE user_id = ?', (user_id,))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to increment docs uploaded: {e}")

def get_user_stats(user_id: str) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT last_login, docs_uploaded FROM users WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "last_login": row[0],
                "docs_uploaded": row[1]
            }
        return {
            "last_login": None,
            "docs_uploaded": 0
        }
    except Exception as e:
        logger.error(f"Failed to get user stats: {e}")
        return {
            "last_login": None,
            "docs_uploaded": 0
        }
