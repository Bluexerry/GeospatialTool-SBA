import os
import io
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)

_allowed_origins = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')]
CORS(app, supports_credentials=True, origins=_allowed_origins)

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    raise RuntimeError("DATABASE_URL environment variable is not set.")
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# ── Models ────────────────────────────────────────────────────────────────────
class Folder(db.Model):
    __tablename__ = 'folders'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True)
    files = db.relationship('File', backref='folder', cascade="all, delete-orphan")
    subfolders = db.relationship(
        'Folder',
        backref=db.backref('parent', remote_side=[id]),
        cascade="all, delete-orphan"
    )


class File(db.Model):
    __tablename__ = 'files'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True)
    content = db.Column(db.LargeBinary, nullable=False)


with app.app_context():
    db.create_all()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/', methods=['GET'])
def index():
    return ""


@app.route('/api/folders', methods=['GET'])
def get_folders():
    parent_id = request.args.get('parentId')
    parent_id = int(parent_id) if parent_id is not None else None

    folders = Folder.query.filter_by(parent_id=parent_id).all()
    files = File.query.filter_by(folder_id=parent_id).all()
    current_folder = db.session.get(Folder, parent_id) if parent_id is not None else None

    return jsonify({
        'folders': [{'id': f.id, 'name': f.name, 'isDir': True} for f in folders],
        'files': [{'id': f.id, 'name': f.name, 'isDir': False} for f in files],
        'current_folder': {
            'id': current_folder.id,
            'name': current_folder.name,
            'parent_id': current_folder.parent_id
        } if current_folder else None
    })


@app.route('/api/folders', methods=['POST'])
def create_folder():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    parent_id = data.get('parentId')

    if not name:
        return jsonify({'error': 'name is required'}), 400

    folder = Folder(name=name, parent_id=parent_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify({'id': folder.id, 'name': folder.name, 'isDir': True}), 201


@app.route('/api/folders', methods=['DELETE'])
def delete_folders():
    folder_ids = (request.get_json(silent=True) or {}).get('folderIds', [])
    if not folder_ids:
        return jsonify({'error': 'No folder IDs provided'}), 400
    try:
        for fid in folder_ids:
            folder = db.session.get(Folder, fid)
            if folder:
                db.session.delete(folder)
        db.session.commit()
        return jsonify({'message': 'Folders deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/files', methods=['POST'])
def upload_files():
    uploaded = request.files.getlist('files')
    folder_id = request.form.get('folderId')
    try:
        for f in uploaded:
            new_file = File(name=f.filename, folder_id=folder_id, content=f.read())
            db.session.add(new_file)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    return jsonify({'message': 'Files uploaded successfully'}), 201


@app.route('/api/files/<int:file_id>', methods=['GET'])
def get_file(file_id):
    file = db.session.get(File, file_id)
    if file is None:
        return jsonify({'error': 'File not found'}), 404
    return send_file(
        io.BytesIO(file.content),
        download_name=file.name,
        as_attachment=True
    )


@app.route('/api/files', methods=['DELETE'])
def delete_files():
    file_ids = (request.get_json(silent=True) or {}).get('fileIds', [])
    if not file_ids:
        return jsonify({'error': 'No file IDs provided'}), 400
    try:
        for fid in file_ids:
            f = db.session.get(File, fid)
            if f:
                db.session.delete(f)
        db.session.commit()
        return jsonify({'message': 'Files deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/search', methods=['GET'])
def search_files():
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify([]), 200
    results = File.query.filter(File.name.ilike(f'%{query}%')).all()
    return jsonify([{'id': f.id, 'name': f.name, 'isDir': False} for f in results])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
