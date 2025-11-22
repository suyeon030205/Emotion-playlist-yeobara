import os
from googleapiclient.discovery import build

API_KEY = os.environ.get("YT_API_KEY")
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

def search_youtube_videos(keyword: str, max_results: int = 3):     
    if not API_KEY:
        return {
            "success": False,
            "error": "YT_API_KEY 환경변수가 설정되어 있지 않습니다."
        }
    
    youtube = build(
        YOUTUBE_API_SERVICE_NAME,
        YOUTUBE_API_VERSION,
        developerKey=API_KEY
    )

    search_response = youtube.search().list(
        q = keyword,
        part = "snippet",
        maxResults = max_results,
        type = "video"  # 동영상만
    ).execute()

    videos = []
    for item in search_response.get("items", []):
        video_id = item["id"]["videoId"]
        snippet = item["snippet"]
        videos.append({
            "videoId": video_id,
            "title": snippet["title"],
            "channelTitle": snippet["channelTitle"],
            "thumbnail": snippet["thumbnails"]["high"]["url"],
            "url": f"https://www.youtube.com/watch?v={video_id}",
        })

    return {
        "success": True,
        "keyword": keyword,
        "count": len(videos),
        "videos": videos
    }
