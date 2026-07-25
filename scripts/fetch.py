import json, os, sys, hashlib, time
from concurrent.futures import ThreadPoolExecutor
import urllib.request

SZ = sys.argv[1] if len(sys.argv) > 1 else "w512"
OUT = sys.argv[2] if len(sys.argv) > 2 else "thumb"
only = set(json.load(open(sys.argv[3])) ) if len(sys.argv) > 3 else None  # optional file_id whitelist

files = json.load(open("manifest.json"))
if only: files = [f for f in files if f["file_id"] in only]
os.makedirs(OUT, exist_ok=True)
ok = fail = skip = 0

def safe(s): return "".join(c if c.isalnum() or c in " ._-&()'" else "_" for c in s)

def get(f):
    global ok, fail, skip
    d = os.path.join(OUT, safe(f["restaurant"])); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, safe(os.path.splitext(f["filename"])[0]) + ".jpg")
    if os.path.exists(p) and os.path.getsize(p) > 1000:
        skip += 1; return
    url = f"https://drive.google.com/thumbnail?id={f['file_id']}&sz={SZ}"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=45).read()
            if len(data) < 1000: raise ValueError(f"too small {len(data)}")
            open(p, "wb").write(data); ok += 1; return
        except Exception as e:
            if attempt == 2: fail += 1; print(f"  FAIL {f['restaurant']}/{f['filename']}: {e}", flush=True)
            else: time.sleep(1.5 * (attempt + 1))

with ThreadPoolExecutor(max_workers=8) as ex:
    list(ex.map(get, files))
print(f"{SZ} → {OUT}: ok={ok} skip={skip} fail={fail} / {len(files)}")
