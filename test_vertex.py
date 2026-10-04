import urllib.request
import json
import subprocess

def get_local_token():
    try:
        result = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception as e:
        print(f"Failed to get gcloud token: {e}")
        return None

token = get_local_token()
if not token:
    print("No token")
    exit(1)

model = 'gemini-1.5-flash'
url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/alva-epr-510301/locations/us-central1/publishers/google/models/{model}:generateContent"

data = {
    "contents": [{"role": "user", "parts": [{"text": "Hello, Vertex AI!"}]}]
}
req = urllib.request.Request(
    url,
    data=json.dumps(data).encode('utf-8'),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as res:
        print(res.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
