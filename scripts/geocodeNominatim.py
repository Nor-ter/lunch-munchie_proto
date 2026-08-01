# 남은 식당 좌표 — OSM Nominatim (무료·무키). 정책 준수: UA 명시 + 1req/s.
import json, time, urllib.parse, urllib.request
R="/Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/data/drive_ingest.json"
UA="lunchie-munchie-ingest/0.1 (prototype; contact: dev)"
d=json.load(open(R,encoding='utf-8'))
todo=[r for r in d["restaurants"] if r.get("coord_source")!="exif"]
print(f"대상 {len(todo)}곳")
def q(name):
    url="https://nominatim.openstreetmap.org/search?"+urllib.parse.urlencode(
        {"q":f"{name}, Melbourne, Victoria, Australia","format":"json","limit":1})
    try:
        req=urllib.request.Request(url,headers={"User-Agent":UA})
        j=json.loads(urllib.request.urlopen(req,timeout=25).read())
        if not j: return None
        lat,lon=float(j[0]["lat"]),float(j[0]["lon"])
        if not(-38.6<lat<-37.2 and 144.3<lon<145.6): return None
        return lat,lon,j[0].get("display_name","")
    except Exception: return None
hit=0
for i,r in enumerate(todo,1):
    res=q(r["name"])
    if res:
        r["lat"],r["lng"]=round(res[0],6),round(res[1],6)
        r["coord_source"]="nominatim"; r["resolved_address"]=res[2][:120]; hit+=1
    if i%20==0: print(f"  {i}/{len(todo)} · 확보 {hit}", flush=True)
    time.sleep(1.1)
json.dump(d,open(R,"w",encoding='utf-8'),ensure_ascii=False,indent=1)
from collections import Counter
print("좌표 출처:", Counter(r.get("coord_source") for r in d["restaurants"]))
