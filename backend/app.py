import os
import pymysql
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import db
from routes import api

# Auto-create MySQL database if it doesn't exist yet
def init_database_schema():
    if Config.IS_SQLITE:
        print("[*] Using local SQLite database file. Auto-creation skipped.")
        return
        
    try:
        # Establish connection without a specific database
        connection = pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            port=int(Config.DB_PORT)
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        connection.commit()
        connection.close()
        print(f"[*] MySQL database '{Config.DB_NAME}' verified/created.")
    except Exception as e:
        print(f"[!] Warning: Could not auto-create MySQL database '{Config.DB_NAME}'. Details: {e}")
        print("[!] Ensure MySQL is running and your DB credentials in config.py are correct.")

def create_app():
    # Attempt to create schema if MySQL is active
    init_database_schema()

    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS. Vite dev server runs on http://localhost:5173 by default.
    # We allow credentials so session cookies can be sent back/forth.
    CORS(app, supports_credentials=True, origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175"
    ])

    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize SQLAlchemy database
    db.init_app(app)

    # Register API blueprint
    app.register_blueprint(api, url_prefix='/api')

    # Global error handlers
    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({'error': 'File is too large. Maximum size allowed is 500MB.'}), 413

    # Create tables
    with app.app_context():
        try:
            db.create_all()
            print("[*] Database tables created successfully.")
        except Exception as e:
            print(f"[!] Error: Could not create tables in database: {e}")

    return app

app = create_app()

if __name__ == '__main__':
    # Run server locally on port 5050
    app.run(host='0.0.0.0', port=5050, debug=True)
