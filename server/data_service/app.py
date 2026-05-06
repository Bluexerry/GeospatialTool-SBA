import os
import psycopg2
import psycopg2.extras
from flask import Flask, jsonify, request
from flask_cors import CORS
from flasgger import Swagger

app = Flask(__name__)
Swagger(app)

_allowed_origins = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')]
CORS(app, supports_credentials=True, origins=_allowed_origins)


# ── Database helpers ─────────────────────────────────────────────────────────
def get_db():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(db_url)


# ── Routes ───────────────────────────────────────────────────────────────────
@app.route('/', methods=['GET'])
def index():
    return ""


@app.route('/users/<int:user_id>/parcels', methods=['GET'])
def get_user_parcels(user_id):
    """Return all parcels belonging to a user.
    ---
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: List of parcel objects
      500:
        description: Database error
    """
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, catastral_ref, geojson_data FROM parcels WHERE user_id = %s ORDER BY id",
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify([dict(r) for r in rows]), 200


@app.route('/users', methods=['POST'])
def create_user():
    """Register a new user.
    ---
    parameters:
      - in: body
        name: body
        schema:
          required: [username, password]
          properties:
            username:
              type: string
            password:
              type: string
              description: MD5 hex digest of the plaintext password
            email:
              type: string
    responses:
      201:
        description: User created
      409:
        description: Username already exists
    """
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip() or None

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password, email) VALUES (%s, %s, %s) RETURNING id",
            (username, password, email)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Username already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"id": new_id, "username": username}), 201


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)