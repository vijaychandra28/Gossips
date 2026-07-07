import datetime
import uuid
from database import db

# Helper function to get timezone-naive UTC datetime (to avoid Python 3.12 deprecation warnings)
def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    last_login = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_name = db.Column(db.String(100), nullable=True)
    room_password_hash = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'room_name': self.room_name,
            'has_password': self.room_password_hash is not None and self.room_password_hash != "",
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = db.Column(db.String(36), db.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False)
    encrypted_filename = db.Column(db.Text, nullable=False)
    stored_filename = db.Column(db.String(255), unique=True, nullable=False)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size = db.Column(db.BigInteger, nullable=False)
    iv = db.Column(db.String(255), nullable=False)  # Initialization vector for E2EE (Base64)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'encrypted_filename': self.encrypted_filename,
            'stored_filename': self.stored_filename,
            'mime_type': self.mime_type,
            'file_size': self.file_size,
            'iv': self.iv,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.String(36), db.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    encrypted_text = db.Column(db.Text, nullable=False)
    iv = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'encrypted_text': self.encrypted_text,
            'iv': self.iv,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
