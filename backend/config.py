import os
import pymysql
from dotenv import load_dotenv

# Load env variables from a .env file if it exists
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'gossips_secret_key_confidential_98765')
    
    # MySQL connection parameters
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_NAME = os.environ.get('DB_NAME', 'gossips_db')
    
    # Dynamically verify if MySQL is reachable
    mysql_available = False
    try:
        # Attempt connection with a short timeout
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=int(DB_PORT),
            connect_timeout=2
        )
        conn.close()
        mysql_available = True
    except Exception:
        pass

    if mysql_available:
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        IS_SQLITE = False
        print("[*] MySQL database connection established.")
    else:
        # SQLite fallback so the product runs instantly out-of-the-box
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gossips.db')
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        IS_SQLITE = True
        print("[!] MySQL offline. Activating SQLite database fallback (gossips.db).")
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload folder configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    
    # Upload limits: 500 MB
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024
