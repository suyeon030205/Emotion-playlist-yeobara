from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable= False)
    password = db.Column(db.String(150), nullable= False)

class EmotionRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # 어떤 유저의 기록인지
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # 감정 분석 결과 (ex: happy, sad, angry...)
    emotion = db.Column(db.String(50), nullable=False)

    # 추천된 유튜브 영상 정보
    video_title = db.Column(db.String(200))
    video_url = db.Column(db.String(200))

    # 기록 시각
    created_at = db.Column(db.DateTime, default=datetime.now)

    # User 모델과 관계 연결
    user = db.relationship("User", backref=db.backref("emotion_records", lazy=True))