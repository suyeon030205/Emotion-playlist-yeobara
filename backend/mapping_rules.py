VALENCE_WEIGHTS= {
    'sadness': -1.0,
    'anger': -0.6,
    'surprise': 0.4, 
    'disgust': -0.8, 
    'fear':-0.8, 
    'happiness': 1.0, 
    'neutral': 0
}

AROUSAL_WEIGHTS= {
    'sadness': -0.6,
    'anger': 0.8,
    'surprise': 0.9, 
    'disgust': 0.5, 
    'fear': 0.9, 
    'happiness': 0.4, 
    'neutral': 0
}

def get_recommendation_keyword(dominant_emotion, average_emotions):
    valence_score = 0
    arousal_score = 0
    keywords = ""

    for k, v in average_emotions.items():
        valence_score += VALENCE_WEIGHTS.get(k,0)*v
        arousal_score += AROUSAL_WEIGHTS.get(k, 0)*v
    
    if dominant_emotion == "fear":
        arousal_score = -1.0

    if arousal_score >= 0.4:
        if valence_score < -0.1:
            keywords = "강렬한 스트레스해소 기분전환"
        else:
            keywords = "댄스곡 노동요 신나는 밝은 재밌는"
    elif 0<= arousal_score:
        keywords = "힐링 어쿠스틱 휴식 알앤비 수면 잔잔한"
    else:
        keywords = "발라드 위로 새벽감성 우울한"

    dominant_emotionk = ""

    if dominant_emotion == "sadness":
        dominant_emotionk = "슬픈"

    elif dominant_emotion == "anger":
        dominant_emotionk = "분노해소"

    elif dominant_emotion == "surprise":
        dominant_emotionk = "톡톡튀는"

    elif dominant_emotion == "disgust":
        dominant_emotionk = "사이다 속시원한"

    elif dominant_emotion == "fear":
        dominant_emotionk = "심신안정 마음의평화"

    elif dominant_emotion == "happiness":
        dominant_emotionk = "행복한 즐거운"

    elif dominant_emotion == "neutral":
        dominant_emotionk = "차분한 평온한"

    final_keyword = f"{dominant_emotionk} {keywords} 플레이리스트"

    return final_keyword.strip().replace("  ", " ")