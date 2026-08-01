# Phase 4 — 분류 + 메뉴 → restaurant_features 집계 (토큰 0, 결정적)
# 입력: phase1_classified.json, phase2_menus.json
# 출력: drive_ingest.json  (photos / menu_items / features / restaurants)
import json, re, statistics, hashlib
from collections import Counter, defaultdict

# 요리 종류 → 기본 맛 프로파일 [spicy, salty, sweet, oily, light]
# server/engine/features.ts 의 TASTE_PROFILES 와 같은 축.
CUISINE = {
    "korean": [.7, .65, .35, .55, .3], "japanese": [.2, .5, .3, .3, .7],
    "chinese": [.5, .7, .4, .8, .2], "italian": [.2, .6, .3, .6, .3],
    "thai": [.8, .6, .5, .5, .4], "vietnamese": [.3, .5, .3, .3, .75],
    "cafe": [.05, .25, .6, .3, .7], "bakery": [.02, .3, .8, .5, .5],
    "dessert": [.0, .2, .95, .5, .4], "western": [.25, .6, .35, .6, .35],
    "bar": [.3, .7, .3, .6, .3], "mexican": [.7, .6, .3, .6, .35],
    "indian": [.75, .6, .35, .6, .3], "middle eastern": [.4, .6, .35, .5, .45],
    "malaysian": [.6, .6, .4, .6, .35], "burger": [.25, .7, .3, .8, .15],
    "pizza": [.2, .65, .3, .65, .25], "seafood": [.2, .55, .25, .35, .65],
    "hotpot": [.7, .65, .3, .6, .35], "bubble tea": [.0, .15, .9, .25, .6],
}
NEUTRAL = [.4, .4, .4, .4, .5]

# 음식명 키워드 → 맛 보정 (가산). 메뉴·dish 태그에서 신호를 뽑는다.
DISH_HINT = [
    (r"spicy|매운|매콤|칠리|chilli|chili|hot sauce|buldak|tteokbokki|떡볶이|kimchi|김치|mala|마라|tom yum|curry|카레", [.35, .05, 0, 0, -.05]),
    (r"fried|튀김|치킨|chicken|katsu|돈까스|karaage|tempura|chips|fries|감자튀김", [0, .1, 0, .35, -.25]),
    (r"cake|케이크|dessert|디저트|ice cream|아이스크림|gelato|tiramisu|티라미수|waffle|와플|pancake|croissant|pastry|빵|bread|donut|cookie|tart|cheesecake|bingsu|빙수|kakigori", [-.05, -.1, .45, .05, .05]),
    (r"coffee|커피|latte|espresso|americano|cappuccino|tea|차 |matcha|말차", [0, -.1, .1, -.1, .25]),
    (r"salad|샐러드|vegan|비건|vegetable|야채|greens|tofu|두부|soup|국|탕|pho|쌀국수|udon|우동|noodle soup", [0, 0, -.05, -.25, .35]),
    (r"steak|스테이크|beef|소고기|pork belly|삼겹|bbq|구이|lamb|ribs|갈비|galbi|bulgogi|불고기", [0, .15, 0, .3, -.3]),
    (r"cheese|치즈|cream|크림|butter|버터|mayo|carbonara", [0, .1, .1, .3, -.25]),
    (r"sushi|스시|sashimi|회|raw fish|초밥|oyster|굴", [-.1, .05, -.05, -.2, .4]),
    (r"burger|버거|pizza|피자|pasta|파스타", [0, .15, 0, .25, -.2]),
    (r"soju|소주|beer|맥주|wine|와인|cocktail|칵테일|highball", [0, .1, .1, 0, .1]),
]
CLAMP = lambda x: max(0.0, min(1.0, x))
NORM = lambda s: re.sub(r"\s+", " ", re.sub(r"[^\w가-힣\s&']", " ", (s or "").lower())).strip()


def taste_for(cuisine, texts):
    """cuisine 기본값 + 음식/메뉴 키워드 보정 → 5축 맛 프로파일."""
    c = NORM(cuisine)
    base = None
    for k, v in CUISINE.items():
        if k in c:
            base = list(v); break
    base = base or list(NEUTRAL)
    blob = " ".join(NORM(t) for t in texts)
    if blob:
        hits = 0
        acc = [0.0] * 5
        for pat, delta in DISH_HINT:
            n = len(re.findall(pat, blob))
            if n:
                w = min(3, n) / 3.0
                hits += 1
                for i in range(5):
                    acc[i] += delta[i] * w
        if hits:
            base = [base[i] + acc[i] / max(1, hits ** 0.5) for i in range(5)]
    return dict(zip(["spicy", "salty", "sweet", "oily", "light"], [round(CLAMP(x), 3) for x in base]))


def sid(*parts):
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]


def main():
    cls = json.load(open("phase1_classified.json"))
    try:
        menus = {m["restaurant"]: m for m in json.load(open("phase2_menus.json"))}
    except FileNotFoundError:
        menus = {}
    manifest = json.load(open("manifest.json"))
    fid = {(m["restaurant"], m["filename"].rsplit(".", 1)[0]): m["file_id"] for m in manifest}

    photos_out, menu_out, feats_out, rest_out = [], [], [], []
    for r in cls:
        name = r["restaurant"]
        ph = r.get("photos") or []
        menu = menus.get(name, {})
        mitems = menu.get("items") or []

        # 사진: kind=menu 는 저장하지 않는다 (요구사항 — 메뉴 정보만 남기고 이미지는 폐기)
        kept = [p for p in ph if p.get("kind") != "menu"]
        for p in kept:
            stem = p["file"].rsplit(".", 1)[0]
            f = fid.get((name, stem))
            photos_out.append({
                "id": sid(name, p["file"]), "restaurant_name": name,
                "drive_file_id": f,
                "url": f"https://drive.google.com/thumbnail?id={f}&sz=w1400" if f else None,
                "kind": p["kind"], "dishes": p.get("dishes") or [],
                "vibe_tags": p.get("vibe_tags") or [], "quality": p.get("quality"),
                "source": "drive",
            })

        seen = set()
        for it in mitems:
            nn = NORM(it.get("name"))
            if not nn or nn in seen:
                continue
            seen.add(nn)
            menu_out.append({
                "id": sid(name, nn), "restaurant_name": name, "name": it.get("name"),
                "normalized_name": nn, "price": it.get("price"),
                "currency": menu.get("currency") or "AUD", "category": it.get("category"),
                "description": it.get("description"), "dietary": it.get("dietary") or [],
                "source": "drive_photo", "confidence": menu.get("confidence"),
            })

        # 피처 집계
        dish_names = [d for p in kept for d in (p.get("dishes") or [])]
        texts = dish_names + [i.get("name", "") for i in mitems] + [i.get("description") or "" for i in mitems]
        prices = sorted(p for p in (i.get("price") for i in mitems) if isinstance(p, (int, float)) and p > 0)
        vibes = Counter(v for p in kept for v in (p.get("vibe_tags") or []))
        kinds = Counter(p["kind"] for p in kept)
        sig = [d for d, _ in Counter(NORM(d) for d in dish_names).most_common(5) if d]

        feats_out.append({
            "restaurant_name": name,
            "taste": taste_for(r.get("cuisine_guess"), texts),
            "price_stats": ({"min": prices[0], "max": prices[-1],
                             "median": round(statistics.median(prices), 2), "n": len(prices)} if prices else None),
            "signature_dishes": sig,
            "vibe_tags": [v for v, _ in vibes.most_common(6)],
            "photo_kinds": dict(kinds),
            "evidence": {"photos": len(kept), "menu_items": len(mitems),
                         "menu_legible": bool(menu.get("legible"))},
            "feature_version": "v1-photo",
        })
        rest_out.append({"name": name, "cuisine_guess": r.get("cuisine_guess"),
                         "photo_count": len(kept), "menu_item_count": len(mitems)})

    out = {"restaurants": rest_out, "photos": photos_out, "menu_items": menu_out, "features": feats_out}
    json.dump(out, open("drive_ingest.json", "w"), ensure_ascii=False, indent=1)

    # 검증: 메뉴 사진이 photos 에 하나도 없어야 한다
    assert not [p for p in photos_out if p["kind"] == "menu"], "메뉴 사진이 photos 에 포함됨!"
    print(f"식당 {len(rest_out)} · 사진 {len(photos_out)}(메뉴 제외) · 메뉴 {len(menu_out)} · 피처 {len(feats_out)}")
    print(f"가격 있는 식당: {sum(1 for f in feats_out if f['price_stats'])}")
    print("✅ assert 통과: photos 에 kind=menu 0건")


if __name__ == "__main__":
    main()
