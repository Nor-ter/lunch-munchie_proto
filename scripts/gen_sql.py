# Phase 5 — drive_ingest.json → Supabase SQL Editor 용 시드 SQL
# 신규 식당은 최소 레코드 + needs_enrichment=true (좌표/평점은 Places 보강 전까지 플레이스홀더)
import json, re, hashlib

MEL = (-37.8136, 144.9631)  # 멜버른 CBD 중심 — 플레이스홀더 (needs_enrichment=true 로 표시)
q = lambda v: "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
jb = lambda v: "NULL" if v is None else "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
nm = lambda v: "NULL" if v is None else str(v)

CUISINE_KO = {
    "korean": "한식", "japanese": "일식", "chinese": "중식", "italian": "이탈리안",
    "thai": "타이", "vietnamese": "베트남", "cafe": "카페", "bakery": "베이커리",
    "dessert": "디저트", "western": "레스토랑", "bar": "바", "mexican": "멕시칸",
    "indian": "인도", "middle eastern": "중동", "malaysian": "말레이시안",
    "burger": "버거", "pizza": "이탈리안", "seafood": "해산물", "bubble tea": "카페",
}

d = json.load(open("drive_ingest.json"))
match = json.load(open("phase3_match.json"))
existing = {n: i for n, i in match["matched"] if i}

def rid(name):
    if name in existing: return existing[name]
    return "drv_" + hashlib.sha1(name.encode()).hexdigest()[:12]

def cat_of(c):
    c = (c or "").lower()
    for k, v in CUISINE_KO.items():
        if k in c: return v
    return "기타"

L = []
L.append("-- 드라이브 사진 인제스천 시드 (Phase 5)")
L.append("-- 선행: supabase/migrations/20260629000000_photo_ingest_and_features.sql 적용")
L.append("-- 생성: scratchpad/ingest/gen_sql.py · 메뉴 사진은 포함하지 않음(정보만)")
L.append("BEGIN;")
L.append("")

# ① 신규 식당 (최소 레코드) — 좌표/평점은 플레이스홀더, needs_enrichment=true
R = {r["name"]: r for r in d["restaurants"]}
L.append("-- ① 식당 (신규는 needs_enrichment=true · 좌표는 CBD 플레이스홀더)")
for name, r in R.items():
    if name in existing: continue
    L.append(
        "INSERT INTO restaurants (id,name,category,address,latitude,longitude,rating,review_count,price_level,source,needs_enrichment) "
        f"VALUES ({q(rid(name))},{q(name)},{q(cat_of(r['cuisine_guess']))},{q('Melbourne VIC (미확인)')},"
        f"{MEL[0]},{MEL[1]},0,0,2,'drive',true) ON CONFLICT (id) DO NOTHING;"
    )
L.append("")

# ② 사진 (kind=menu 없음)
L.append(f"-- ② 사진 {len(d['photos'])}건 (메뉴판 제외 — 요구사항)")
for p in d["photos"]:
    L.append(
        "INSERT INTO restaurant_photos (id,restaurant_id,drive_file_id,url,kind,dishes,vibe_tags,quality,source,created_at) "
        f"VALUES ({q(p['id'])},{q(rid(p['restaurant_name']))},{q(p['drive_file_id'])},{q(p['url'])},{q(p['kind'])},"
        f"{jb(p['dishes'])},{jb(p['vibe_tags'])},{nm(p['quality'])},'drive',now()) ON CONFLICT (id) DO NOTHING;"
    )
L.append("")

# ③ 메뉴
L.append(f"-- ③ 메뉴 {len(d['menu_items'])}건 (사진에서 텍스트만 추출)")
for m in d["menu_items"]:
    L.append(
        "INSERT INTO restaurant_menu_items (id,restaurant_id,name,normalized_name,price,currency,category,description,dietary,source,confidence,extracted_at) "
        f"VALUES ({q(m['id'])},{q(rid(m['restaurant_name']))},{q(m['name'])},{q(m['normalized_name'])},{nm(m['price'])},"
        f"{q(m['currency'])},{q(m['category'])},{q(m['description'])},{jb(m['dietary'])},'drive_photo',{nm(m['confidence'])},now()) "
        "ON CONFLICT (restaurant_id,normalized_name,source) DO NOTHING;"
    )
L.append("")

# ④ 피처 스토어 ★
L.append(f"-- ④ 피처 스토어 {len(d['features'])}건 ★ 콜드스타트 해소")
for f in d["features"]:
    L.append(
        "INSERT INTO restaurant_features (restaurant_id,taste,price_stats,signature_dishes,vibe_tags,photo_kinds,evidence,feature_version,updated_at) "
        f"VALUES ({q(rid(f['restaurant_name']))},{jb(f['taste'])},{jb(f['price_stats'])},{jb(f['signature_dishes'])},"
        f"{jb(f['vibe_tags'])},{jb(f['photo_kinds'])},{jb(f['evidence'])},'v1-photo',now()) "
        "ON CONFLICT (restaurant_id) DO UPDATE SET taste=EXCLUDED.taste, price_stats=EXCLUDED.price_stats, "
        "signature_dishes=EXCLUDED.signature_dishes, vibe_tags=EXCLUDED.vibe_tags, photo_kinds=EXCLUDED.photo_kinds, "
        "evidence=EXCLUDED.evidence, updated_at=now();"
    )
L.append("")
L.append("COMMIT;")

open("drive_seed.sql", "w", encoding="utf-8").write("\n".join(L))
print(f"SQL {len(L)}줄 · 식당 {len(R)}(신규 {len(R)-len(existing)}) · 사진 {len(d['photos'])} · 메뉴 {len(d['menu_items'])} · 피처 {len(d['features'])}")

# 앱 폴백용 JSON (restaurant_id 부여)
for p in d["photos"]: p["restaurant_id"] = rid(p["restaurant_name"])
for m in d["menu_items"]: m["restaurant_id"] = rid(m["restaurant_name"])
for f in d["features"]: f["restaurant_id"] = rid(f["restaurant_name"])
for r in d["restaurants"]: r["id"] = rid(r["name"]); r["category"] = cat_of(r["cuisine_guess"])
json.dump(d, open("drive_ingest.json", "w"), ensure_ascii=False, indent=1)
print("drive_ingest.json 에 restaurant_id 부여 완료")
