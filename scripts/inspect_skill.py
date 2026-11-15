import urllib.request
import json
import os

def fetch_contents(path=""):
    url = f"https://api.github.com/repos/memex-lab/product-launch-video-skill/contents/{path}".rstrip("/")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def download_file(download_url, dest_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    req = urllib.request.Request(download_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
    with open(dest_path, "wb") as f:
        f.write(content)
    print(f"Downloaded {dest_path} ({len(content)} bytes)")

def walk_repo(path=""):
    items = fetch_contents(path)
    for item in items:
        if item["type"] == "dir":
            walk_repo(item["path"])
        else:
            print(f"File: {item['path']} -> {item['download_url']}")

if __name__ == "__main__":
    walk_repo()
