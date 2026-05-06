import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token

app = Flask(__name__)

# ── Configuration ────────────────────────────────────────────────────────────
jwt_secret = os.environ.get('JWT_SECRET_KEY')
if not jwt_secret:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set.")

app.config['JWT_SECRET_KEY'] = jwt_secret
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_TYPE'] = 'Bearer'

jwt = JWTManager(app)

_allowed_origins = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')]
CORS(app, supports_credentials=True, origins=_allowed_origins)

# ── Database helpers ─────────────────────────────────────────────────────────
def get_db():
    """Return a new psycopg2 connection using DATABASE_URL env var."""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(db_url)


# ── Routes ───────────────────────────────────────────────────────────────────
@app.route('/', methods=['GET'])
def index():
    return ""


@app.route('/login', methods=['POST'])
def login():
    """Authenticate a user.

    Expects JSON body: {"username": "...", "password": "<md5-hex>"}
    Returns: {"message": [user_id, access_token]}
    """
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()   # MD5 hex digest from frontend

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM users WHERE username = %s AND password = %s",
            (username, password)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"msg": f"Database error: {str(e)}"}), 500

    if row is None:
        return jsonify({"msg": "Credenciales incorrectas"}), 401

    user_id = row[0]
    access_token = create_access_token(identity=str(user_id))
    return jsonify({"message": [user_id, access_token]}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)