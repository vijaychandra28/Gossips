import os
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from config import Config
from database import db
from routes import api


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── ProxyFix ───────────────────────────────────────────────────────────────
    # Render (and most PaaS hosts) terminate TLS at a load balancer and forward
    # plain HTTP to the container.  Without ProxyFix, Flask sees http:// and
    # silently drops Set-Cookie headers that have the Secure flag, so the
    # session cookie NEVER reaches the browser even though login returns 200.
    # x_for=1, x_proto=1 trusts exactly one hop of Render's proxy headers.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # ── CORS ───────────────────────────────────────────────────────────────────
    # supports_credentials=True is required so the browser sends the session
    # cookie on cross-origin requests (Vercel frontend → Render backend).
    CORS(app,
         supports_credentials=True,
         origins=[
             "http://localhost:5173",
             "http://127.0.0.1:5173",
             "http://localhost:5174",
             "http://127.0.0.1:5174",
             "http://localhost:5175",
             "http://127.0.0.1:5175",
             "https://gossipshub.vercel.app",
         ])

    # ── Upload directory ───────────────────────────────────────────────────────
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # ── Database ───────────────────────────────────────────────────────────────
    db.init_app(app)

    # ── Blueprints ─────────────────────────────────────────────────────────────
    app.register_blueprint(api, url_prefix='/api')

    # ── Error handlers ─────────────────────────────────────────────────────────
    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({'error': 'File is too large. Maximum size allowed is 500MB.'}), 413

    # ── Create DB tables ───────────────────────────────────────────────────────
    with app.app_context():
        try:
            db.create_all()
            print("[*] Database tables verified/created.")
        except Exception as e:
            print(f"[!] Error creating tables: {e}")

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
