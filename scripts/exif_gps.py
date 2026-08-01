# 사진 EXIF GPS → 식당 좌표. 원본에만 EXIF가 있으므로 식당당 소수만 원본 다운로드.
# 키·과금 0. 사진은 그 식당에서 찍은 것이라 가장 정확한 출처.
import json, os, math, sys, time, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

PER_RESTAURANT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
OUT = "orig"
os.makedirs(OUT, exist_ok=True)
manifest = json.load(open("manifest.json"))
by_r = defaultdict(list)
for m in manifest:
    by_r[m["restaurant"]].append(m)

safe = lambda s: "".join(c if c.isalnum() or c in " ._-&()'" else "_" for c in s)


def fetch(item):
    d = os.path.join(OUT, safe(item["restaurant"]))
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, safe(item["filename"]))
    if os.path.exists(p) and os.path.getsize(p) > 10000:
        return p
    url = f"https://drive.google.com/uc?export=download&id={item['file_id']}"
    for a in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=60).read()
            if len(data) < 10000 or data[:15].lower().startswith(b"<!doctype"):
                raise ValueError("not an image")
            open(p, "wb").write(data)
            return p
        except Exception:
            time.sleep(1.5 * (a + 1))
    return None


def gps_of(path):
    try:
        ex = Image.open(path)._getexif() or {}
        tags = {TAGS.get(k, k): v for k, v in ex.items()}
        g = tags.get("GPSInfo")
        if not g:
            return None
        gg = {GPSTAGS.get(k, k): v for k, v in g.items()}
        def dec(vals, ref):
            if not vals or len(vals) != 3:
                return None
            d, m, s = [float(x) for x in vals]
            if any(math.isnan(x) for x in (d, m, s)):
                return None
            v = d + m / 60 + s / 3600
            return -v if str(ref).upper().startswith(("S", "W")) else v
        lat = dec(gg.get("GPSLatitude"), gg.get("GPSLatitudeRef"))
        lng = dec(gg.get("GPSLongitude"), gg.get("GPSLongitudeRef"))
        if lat is None or lng is None or (abs(lat) < 0.01 and abs(lng) < 0.01):
            return None
        return (lat, lng)
    except Exception:
        return None


targets = []
for r, items in by_r.items():
    targets.extend(items[:PER_RESTAURANT])
print(f"식당 {len(by_r)}곳 · 원본 대상 {len(targets)}장 (식당당 최대 {PER_RESTAURANT}장)")

paths = {}
with ThreadPoolExecutor(max_workers=4) as ex:
    for item, p in zip(targets, ex.map(fetch, targets)):
        if p:
            paths.setdefault(item["restaurant"], []).append(p)

coords, nogps = {}, []
for r, ps in paths.items():
    pts = [g for g in (gps_of(p) for p in ps) if g]
    if not pts:
        nogps.append(r); continue
    # 여러 장이면 중앙값(이상치 방지)
    lat = sorted(p[0] for p in pts)[len(pts) // 2]
    lng = sorted(p[1] for p in pts)[len(pts) // 2]
    coords[r] = {"lat": round(lat, 6), "lng": round(lng, 6), "n": len(pts)}

json.dump(coords, open("exif_coords.json", "w"), ensure_ascii=False, indent=1)
print(f"다운로드 성공 {len(paths)}곳 · GPS 확보 {len(coords)}곳 · GPS 없음 {len(nogps)}곳")
mel = [r for r, c in coords.items() if -38.6 < c["lat"] < -37.2 and 144.3 < c["lng"] < 145.6]
print(f"멜버른 권역 좌표: {len(mel)}곳 / {len(coords)}곳")
for r, c in list(coords.items())[:5]:
    print(f"   {r[:28]:30} {c['lat']}, {c['lng']} (사진 {c['n']}장)")
