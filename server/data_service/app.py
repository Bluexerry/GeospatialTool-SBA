import psycopg2
from flask import Flask, jsonify, request, make_response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from flasgger import Swagger, swag_from


app = Flask(__name__)
Swagger(app)

@app.route('/', methods=['GET'])
def index():
    return ""
  
if __name__ == '__main__':
    app.run(port=5002)