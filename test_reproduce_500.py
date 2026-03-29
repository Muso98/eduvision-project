import requests
import os

url = "http://localhost:8000/api/lessons/analyze-video/"
# Try with a tiny fake video if possible, or just hit it without auth to check 401 vs 500
try:
    # Use any small file as 'video'
    with open('test_video.mp4', 'wb') as f:
        f.write(b'fake content')
    
    with open('test_video.mp4', 'rb') as f:
        files = {'video': f}
        # No auth for now to see if it even reaches the view
        r = requests.post(url, files=files)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
except Exception as e:
    print(f"Request failed: {e}")
finally:
    if os.path.exists('test_video.mp4'):
        os.remove('test_video.mp4')
