import os
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

_allowed_origins = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')]
CORS(app, supports_credentials=True, origins=_allowed_origins)


@app.route('/', methods=['GET'])
def index():
    return ""


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)