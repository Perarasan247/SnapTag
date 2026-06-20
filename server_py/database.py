import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="snaptag",
            pool_size=10,
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "snaptag"),
            connection_timeout=10,
            connect_timeout=10,
        )
    return _pool

def get_conn():
    return get_pool().get_connection()

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id           VARCHAR(60)  PRIMARY KEY,
                user_id      INT          NOT NULL,
                name         VARCHAR(255) NOT NULL,
                slug         VARCHAR(255) NOT NULL,
                checklist_template_ids JSON,
                capture_count INT DEFAULT 0,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS captures (
                id              VARCHAR(100) PRIMARY KEY,
                file_id         VARCHAR(60)  NOT NULL,
                user_id         INT          NOT NULL,
                filename        VARCHAR(255),
                media_type      VARCHAR(20),
                tag             VARCHAR(100),
                notes           TEXT,
                gps_lat         DOUBLE,
                gps_lng         DOUBLE,
                gps_alt         DOUBLE,
                s3_data_key     VARCHAR(500),
                s3_metadata_key VARCHAR(500),
                file_slug       VARCHAR(255),
                file_name       VARCHAR(255),
                upload_status   VARCHAR(50) DEFAULT 'local',
                local_uri       TEXT,
                captured_at     TIMESTAMP NULL,
                uploaded_at     TIMESTAMP NULL,
                device_id       VARCHAR(100),
                FOREIGN KEY (file_id)  REFERENCES files(id)  ON DELETE CASCADE,
                FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS checklists (
                file_id       VARCHAR(60) PRIMARY KEY,
                user_id       INT NOT NULL,
                template_ids  JSON,
                custom_items  JSON,
                progress_data JSON,
                completed_at  TIMESTAMP NULL,
                FOREIGN KEY (file_id) REFERENCES files(id)  ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE
            )
        """)
        # Widen media_type column to fit 'measurement' (was VARCHAR(10))
        cur.execute("ALTER TABLE captures MODIFY COLUMN media_type VARCHAR(20)")
        # Add new capture columns if they don't exist yet (compatible with older MySQL)
        db_name = os.getenv("DB_NAME", "snaptag")
        cur.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='captures' AND COLUMN_NAME='content'",
            (db_name,)
        )
        if cur.fetchone()[0] == 0:
            cur.execute("ALTER TABLE captures ADD COLUMN content TEXT")
        cur.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='captures' AND COLUMN_NAME='unit'",
            (db_name,)
        )
        if cur.fetchone()[0] == 0:
            cur.execute("ALTER TABLE captures ADD COLUMN unit VARCHAR(20)")
        # Add deleted_at for soft-delete / recycle bin
        cur.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='files' AND COLUMN_NAME='deleted_at'",
            (db_name,)
        )
        if cur.fetchone()[0] == 0:
            cur.execute("ALTER TABLE files ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL")
        conn.commit()
        print("[DB] Tables ready")
    finally:
        cur.close()
        conn.close()
