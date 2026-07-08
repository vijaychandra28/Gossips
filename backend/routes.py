import os
import uuid
import bcrypt
import datetime
from functools import wraps
from flask import Blueprint, request, jsonify, session, send_from_directory, current_app
from database import db
from models import User, Room, File, Message

api = Blueprint('api', __name__)

# Helper to hash passwords
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Helper to verify passwords
def verify_password(password, hashed):
    if not hashed:
        return False
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Decorator to require login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Decorator to check room access
def room_access_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Room ID can come from kwargs (e.g., room_id in URL) or POST data
        room_id = kwargs.get('room_id')
        if not room_id:
            if request.is_json:
                room_id = request.json.get('room_id')
            else:
                room_id = request.form.get('room_id')
                
        if not room_id:
            return jsonify({'error': 'Room ID is required.'}), 400
            
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'error': 'Room not found.'}), 404
            
        # Check if room is password protected
        if room.room_password_hash:
            authorized_rooms = session.get('authorized_rooms', [])
            if room_id not in authorized_rooms:
                return jsonify({
                    'error': 'Access denied. Password authentication required for this room.',
                    'password_required': True
                }), 403
                
        return f(*args, **kwargs)
    return decorated_function

# ----------------- AUTHENTICATION ROUTES -----------------

@api.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    if len(username) < 3 or len(username) > 50:
        return jsonify({'error': 'Username must be between 3 and 50 characters.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username is already taken.'}), 409

    hashed = hash_password(password)
    new_user = User(username=username, password_hash=hashed)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully. You can now log in.'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create user. Please try again.'}), 500


@api.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid username or password.'}), 401

    # Update last login time
    user.last_login = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    db.session.commit()

    # Set user session
    session.clear()                         # wipe any stale data first
    session['user_id'] = user.id
    session['username'] = user.username
    session['authorized_rooms'] = []
    session.modified = True                 # force Flask to issue Set-Cookie
    session.permanent = True                # honour PERMANENT_SESSION_LIFETIME

    return jsonify({
        'message': 'Login successful.',
        'user': user.to_dict()
    }), 200


@api.route('/auth/logout', methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully.'}), 200


@api.route('/auth/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'logged_in': False}), 200
        
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'logged_in': False}), 200
        
    return jsonify({
        'logged_in': True,
        'user': user.to_dict()
    }), 200

# ----------------- ROOM ROUTES -----------------

@api.route('/rooms/create', methods=['POST'])
@login_required
def create_room():
    data = request.get_json() or {}
    room_name = data.get('room_name', '').strip()
    password = data.get('password', '')

    if not room_name:
        return jsonify({'error': 'Room name is required.'}), 400

    room_id = str(uuid.uuid4())[:8]  # Simple readable 8-character ID
    # Ensure ID is unique
    while Room.query.get(room_id) is not None:
        room_id = str(uuid.uuid4())[:8]

    hashed_pw = None
    if password:
        if len(password) < 4:
            return jsonify({'error': 'Room password must be at least 4 characters.'}), 400
        hashed_pw = hash_password(password)

    new_room = Room(
        id=room_id,
        room_name=room_name,
        room_password_hash=hashed_pw,
        created_by=session['user_id']
    )

    try:
        db.session.add(new_room)
        # Authorize the creator automatically
        authorized = session.get('authorized_rooms', [])
        if room_id not in authorized:
            authorized.append(room_id)
            session['authorized_rooms'] = authorized
            
        db.session.commit()
        return jsonify({
            'message': 'Room created successfully.',
            'room': new_room.to_dict()
        }), 201
    except Exception as e:
        print("[!] Error in create_room:", e)
        db.session.rollback()
        return jsonify({'error': f'Failed to create room: {str(e)}'}), 500


@api.route('/rooms/join', methods=['POST'])
@login_required
def join_room():
    data = request.get_json() or {}
    room_id = data.get('room_id', '').strip()
    password = data.get('password', '')

    if not room_id:
        return jsonify({'error': 'Room ID is required.'}), 400

    room = Room.query.get(room_id)
    if not room:
        return jsonify({'error': 'Room not found.'}), 404

    # If the room has a password, verify it
    if room.room_password_hash:
        if not password:
            return jsonify({
                'error': 'Password required for this room.',
                'password_required': True
            }), 401
        if not verify_password(password, room.room_password_hash):
            return jsonify({'error': 'Incorrect room password.'}), 401

    # Mark as authorized in session
    authorized = session.get('authorized_rooms', [])
    if room_id not in authorized:
        authorized.append(room_id)
        session['authorized_rooms'] = authorized
        session.modified = True

    return jsonify({
        'message': 'Successfully joined room.',
        'room': room.to_dict()
    }), 200

# ----------------- FILE ROUTES -----------------

@api.route('/rooms/<room_id>/files', methods=['GET'])
@login_required
@room_access_required
def list_files(room_id):
    files = File.query.filter_by(room_id=room_id).order_by(File.uploaded_at.desc()).all()
    # Join with User to get username who uploaded
    result = []
    for f in files:
        uploader = User.query.get(f.uploaded_by)
        uploader_name = uploader.username if uploader else "Deleted User"
        file_dict = f.to_dict()
        file_dict['uploader_name'] = uploader_name
        result.append(file_dict)
        
    return jsonify({'files': result}), 200


@api.route('/files/upload', methods=['POST'])
@login_required
def upload_file():
    # Because files are uploaded as multipart/form-data, parameters are in request.form
    room_id = request.form.get('room_id')
    encrypted_filename = request.form.get('encrypted_filename')
    iv = request.form.get('iv')
    mime_type = request.form.get('mime_type')
    
    if not room_id or not encrypted_filename or not iv:
        return jsonify({'error': 'Missing required parameters (room_id, encrypted_filename, iv).'}), 400

    # Room access validation
    room = Room.query.get(room_id)
    if not room:
        return jsonify({'error': 'Room not found.'}), 404
        
    if room.room_password_hash:
        authorized_rooms = session.get('authorized_rooms', [])
        if room_id not in authorized_rooms:
            return jsonify({'error': 'Unauthorized room access. Please rejoin.'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file file detected in the request.'}), 400
        
    uploaded_file = request.files['file']
    if uploaded_file.filename == '':
        return jsonify({'error': 'Empty filename.'}), 400

    # Ensure uploads directory exists
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Calculate file size of the stream
    uploaded_file.seek(0, os.SEEK_END)
    file_size = uploaded_file.tell()
    uploaded_file.seek(0) # Reset stream pointer

    # Limit check: 500MB
    if file_size > current_app.config['MAX_CONTENT_LENGTH']:
        return jsonify({'error': 'File size exceeds limit of 500MB.'}), 400

    # Generate distinct stored filename
    file_uuid = str(uuid.uuid4())
    extension = os.path.splitext(uploaded_file.filename)[1]
    stored_name = f"{file_uuid}{extension}"
    save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)

    try:
        # Save file to disk
        uploaded_file.save(save_path)
        
        # Save metadata to DB
        new_file = File(
            id=file_uuid,
            room_id=room_id,
            encrypted_filename=encrypted_filename,
            stored_filename=stored_name,
            mime_type=mime_type or 'application/octet-stream',
            file_size=file_size,
            iv=iv,
            uploaded_by=session['user_id']
        )
        
        db.session.add(new_file)
        db.session.commit()

        uploader_name = session['username']
        file_dict = new_file.to_dict()
        file_dict['uploader_name'] = uploader_name

        return jsonify({
            'message': 'File uploaded and secured successfully.',
            'file': file_dict
        }), 201

    except Exception as e:
        db.session.rollback()
        # Clean up file from disk if DB fails
        if os.path.exists(save_path):
            os.remove(save_path)
        return jsonify({'error': f'Failed to upload file. Error: {str(e)}'}), 500


@api.route('/files/<file_id>/download', methods=['GET'])
@login_required
def download_file(file_id):
    file_entry = File.query.get(file_id)
    if not file_entry:
        return jsonify({'error': 'File not found.'}), 404

    # Verify access to the room this file belongs to
    room = Room.query.get(file_entry.room_id)
    if room and room.room_password_hash:
        authorized_rooms = session.get('authorized_rooms', [])
        if file_entry.room_id not in authorized_rooms:
            return jsonify({'error': 'Unauthorized. Please authenticate room access.'}), 403

    # Send the raw encrypted file
    return send_from_directory(
        current_app.config['UPLOAD_FOLDER'],
        file_entry.stored_filename,
        as_attachment=True,
        download_name=file_entry.stored_filename
    )


@api.route('/files/<file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id):
    file_entry = File.query.get(file_id)
    if not file_entry:
        return jsonify({'error': 'File not found.'}), 404

    # Verify room access
    room = Room.query.get(file_entry.room_id)
    if room and room.room_password_hash:
        authorized_rooms = session.get('authorized_rooms', [])
        if file_entry.room_id not in authorized_rooms:
            return jsonify({'error': 'Unauthorized.'}), 403

    # Users can delete their own uploaded files OR the room creator can delete any file in the room
    is_uploader = file_entry.uploaded_by == session['user_id']
    is_room_creator = room.created_by == session['user_id']

    if not (is_uploader or is_room_creator):
        return jsonify({'error': 'Permission denied. You can only delete your own uploaded files.'}), 403

    try:
        # Delete file from disk
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_entry.stored_filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        # Delete database row
        db.session.delete(file_entry)
        db.session.commit()
        return jsonify({'message': 'File deleted successfully.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete file.'}), 500

# ----------------- CHAT MESSAGE ROUTES -----------------

@api.route('/rooms/<room_id>/messages', methods=['GET'])
@login_required
@room_access_required
def list_messages(room_id):
    messages = Message.query.filter_by(room_id=room_id).order_by(Message.created_at.asc()).all()
    result = []
    for m in messages:
        sender = User.query.get(m.user_id)
        sender_name = sender.username if sender else "Deleted User"
        msg_dict = m.to_dict()
        msg_dict['sender_name'] = sender_name
        result.append(msg_dict)
        
    return jsonify({'messages': result}), 200


@api.route('/messages', methods=['POST'])
@login_required
def send_message():
    data = request.get_json() or {}
    room_id = data.get('room_id')
    encrypted_text = data.get('encrypted_text')
    iv = data.get('iv')

    if not room_id or not encrypted_text or not iv:
        return jsonify({'error': 'Missing required parameters (room_id, encrypted_text, iv).'}), 400

    # Room access validation
    room = Room.query.get(room_id)
    if not room:
        return jsonify({'error': 'Room not found.'}), 404
        
    if room.room_password_hash:
        authorized_rooms = session.get('authorized_rooms', [])
        if room_id not in authorized_rooms:
            return jsonify({'error': 'Unauthorized room access. Please rejoin.'}), 403

    new_message = Message(
        room_id=room_id,
        user_id=session['user_id'],
        encrypted_text=encrypted_text,
        iv=iv
    )

    try:
        db.session.add(new_message)
        db.session.commit()
        
        sender_name = session['username']
        msg_dict = new_message.to_dict()
        msg_dict['sender_name'] = sender_name
        
        return jsonify({
            'message': 'Message sent and encrypted successfully.',
            'chat_message': msg_dict
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to send message. Error: {str(e)}'}), 500
