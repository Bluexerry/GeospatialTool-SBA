import os
import bcrypt
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

    Expects JSON body: {"username": "...", "password": "<plaintext>"}
    Returns: {"message": [user_id, access_token]}
    """
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, password FROM users WHERE username = %s",
            (username,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"msg": f"Database error: {str(e)}"}), 500

    if row is None or not bcrypt.checkpw(password.encode('utf-8'), row[1].encode('utf-8')):
        return jsonify({"msg": "Credenciales incorrectas"}), 401

    user_id = row[0]
    access_token = create_access_token(identity=str(user_id))
    return jsonify({"message": [user_id, access_token]}), 200


@app.route('/register', methods=['POST'])
def register():
    """Register a new user.

    Expects JSON body: {"username": "...", "password": "<plaintext>", "email": "..."}
    """
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip() or None

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password, email) VALUES (%s, %s, %s) RETURNING id",
            (username, hashed, email)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Username already exists"}), 409
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    return jsonify({"message": f"User {username} registered", "id": new_id}), 201


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)