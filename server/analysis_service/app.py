from flask import Flask, jsonify, request
import pandas as pd

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return ""