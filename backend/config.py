import os
from dotenv import load_dotenv

# Load env variables from a .env file if it exists (local dev only)
load_dotenv()

class Config:
    # ── Secret key ────────────────────────────────────────────────────────────
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-only-insecure-key-change-me'

    # ── Database ───────────────────────────────────────────────────────────────
    DB_USER     = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_HOST     = os.environ.get('DB_HOST', 'localhost')
    DB_PORT     = os.environ.get('DB_PORT', '3306')
    DB_NAME     = os.environ.get('DB_NAME', 'gossips_db')

    _database_url = os.environ.get('DATABASE_URL', '')
    if _database_url:
        if _database_url.startswith('postgres://'):
            _database_url = _database_url.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = _database_url
        IS_SQLITE = False
    elif os.environ.get('DB_HOST'):
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
        IS_SQLITE = False
    else:
        _db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gossips.db')
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{_db_path}"
        IS_SQLITE = True

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Session / Cookie ───────────────────────────────────────────────────────
    # IMPORTANT: We always set SameSite=None so the browser sends the cookie
    # on cross-origin requests (Vercel → Render).
    # Secure=True is required whenever SameSite=None is used — browsers reject
    # SameSite=None cookies without Secure.
    # ProxyFix in app.py makes Flask see the real HTTPS scheme from Render's
    # load balancer, so Secure cookies will be sent correctly.
    SESSION_COOKIE_SECURE   = True    # Always True (ProxyFix handles Render's proxy)
    SESSION_COOKIE_SAMESITE = 'None'  # Required for cross-origin (Vercel → Render)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_NAME     = 'gossips_session'

    # ── Upload config ──────────────────────────────────────────────────────────
    UPLOAD_FOLDER      = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024   # 500 MB
