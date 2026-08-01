# 드라이브 인제스천 결과를 '실제 서빙 풀'(melbourne_osm.json) id로 재매핑.
#
# 왜: 인제스천은 폴더명(구글맵 이름) 기준인데, 서빙은 OSM id 기준이다.
#     키가 다르면 피처 스토어가 로드돼도 조회가 0건이 된다(실제로 그랬음).
# 매칭: ① 정규화 완전일치 ② 접미/접두 잡음 제거 후 일치 ③ 토큰 포함관계(양방향, 2토큰 이상)
# 미매칭은 drv_* 유지 = 신규 식당(needs_enrichment).
import json, re, sys, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OSM = os.path.join(ROOT, "server", "data", "melbourne_osm.json")
ING = os.path.join(ROOT, "server", "data", "drive_ingest.json")

# 상호명에서 의미 없는 장식어 (도시/지점/업태) — 매칭 잡음 제거용
NOISE = {"melbourne", "cbd", "carlton", "brunswick", "fitzroy", "southbank", "richmond",
         "city", "the", "co", "restaurant", "cafe", "coffee", "bar", "kitchen", "roasters",
         "and", "&", "eatery", "house", "shop", "store", "univ", "university"}

norm = lambda s: re.sub(r"[^a-z0-9가-힣 ]", " ", (s or "").lower())
tight = lambda s: re.sub(r"\s+", "", norm(s))


def tokens(s):
    return [t for t in norm(s).split() if t and t not in NOISE]


def build_index(osm):
    exact, tok = {}, []
    for r in osm:
        n = r.get("name")
        if not n:
            continue
        exact.setdefault(tight(n), r)
        ts = tokens(n)
        if ts:
            tok.append((set(ts), r))
    return exact, tok


def match(name, exact, tok):
    t = tight(name)
    if t in exact:
        return exact[t], "exact"
    ts = set(tokens(name))
    if not ts:
        return None, None
    best, score = None, 0
    for cand, r in tok:
        if not cand:
            continue
        inter = ts & cand
        # 양방향 포함관계: 한쪽이 다른쪽을 거의 포함하고, 의미 토큰이 2개 이상 겹칠 때만
        if len(inter) >= 2 and (inter == ts or inter == cand):
            s = len(inter) / max(len(ts), len(cand))
            if s > score:
                best, score = r, s
    return (best, "fuzzy") if best else (None, None)


def main():
    osm = json.load(open(OSM, encoding="utf-8"))
    d = json.load(open(ING, encoding="utf-8"))
    exact, tok = build_index(osm)

    remap, stats = {}, {"exact": 0, "fuzzy": 0, "new": 0}
    for r in d["restaurants"]:
        m, how = match(r["name"], exact, tok)
        if m:
            remap[r["id"]] = m["id"]
            r["matched_osm_id"] = m["id"]
            r["match_type"] = how
            stats[how] += 1
        else:
            r["match_type"] = "new"
            stats["new"] += 1

    for key in ("photos", "menu_items", "features"):
        for row in d[key]:
            old = row.get("restaurant_id")
            if old in remap:
                row["restaurant_id"] = remap[old]
    for r in d["restaurants"]:
        if r["id"] in remap:
            r["id"] = remap[r["id"]]

    json.dump(d, open(ING, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fk = {f["restaurant_id"] for f in d["features"]}
    oids = {r["id"] for r in osm}
    print(f"매칭: exact {stats['exact']} · fuzzy {stats['fuzzy']} · 신규 {stats['new']}")
    print(f"피처 ∩ 서빙풀 = {len(fk & oids)}곳  (이전 0곳)")


if __name__ == "__main__":
    main()
