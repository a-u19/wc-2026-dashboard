"""
Scrapes yellow/red card data from ESPN's unofficial sports API — no key required.
Scheduled at 22:00, 00:00, 02:00, 04:00, 06:00, 08:00 BST.
Results cached permanently in cards_cache.json (finished matches never change).

ESPN endpoints used:
  /scoreboard?dates=YYYYMMDD  → event IDs for each date
  /summary?event=ID           → boxscore with yellowCards / redCards per team
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta, date
from pathlib import Path

import httpx

CACHE_FILE   = Path(__file__).parent / "cards_cache.json"
ESPN_BASE    = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
BST          = timezone(timedelta(hours=1))
SCHEDULE_BST = [(22, 0), (0, 0), (2, 0), (4, 0), (6, 0), (8, 0)]

# WC2026 runs Jun 11 – Jul 19 2026
WC_START = date(2026, 6, 11)
WC_END   = date(2026, 7, 19)


def _load() -> dict:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"events": {}, "cards": {}}


def _save(cache: dict):
    CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _seconds_until_next_scheduled() -> float:
    now      = datetime.now(BST)
    today    = now.date()
    tomorrow = today + timedelta(days=1)
    candidates = []
    for h, m in SCHEDULE_BST:
        for d in (today, tomorrow):
            dt = datetime(d.year, d.month, d.day, h, m, tzinfo=BST)
            if dt > now:
                candidates.append(dt)
    candidates.sort()
    return (candidates[0] - now).total_seconds()


def get_cards_by_team(cache: dict | None = None) -> list[dict]:
    """Aggregate cached card data into a per-team sorted list."""
    if cache is None:
        cache = _load()
    teams: dict[str, dict] = {}
    for entry in cache.get("cards", {}).values():
        for side in entry.get("teams", []):
            name   = side.get("name", "")
            crest  = side.get("crest", "")
            yellow = side.get("yellow", 0)
            red    = side.get("red", 0)
            if not name:
                continue
            if name not in teams:
                teams[name] = {"name": name, "crest": crest, "yellow": 0, "red": 0, "total": 0}
            teams[name]["yellow"] += yellow
            teams[name]["red"]    += red
            teams[name]["total"]  += yellow + red
    return sorted(teams.values(), key=lambda t: (-t["total"], -t["red"]))


async def _fetch_event_ids(client: httpx.AsyncClient, day: date) -> list[str]:
    """Get ESPN event IDs for a given date."""
    r = await client.get(f"{ESPN_BASE}/scoreboard", params={"dates": day.strftime("%Y%m%d")})
    if r.status_code != 200:
        return []
    ids = []
    for event in r.json().get("events", []):
        status = event.get("status", {}).get("type", {}).get("name", "")
        if status == "STATUS_FULL_TIME":
            ids.append(str(event["id"]))
    return ids


async def _fetch_cards_for_event(client: httpx.AsyncClient, event_id: str) -> dict | None:
    """Fetch yellow/red card counts per team for one completed match."""
    r = await client.get(f"{ESPN_BASE}/summary", params={"event": event_id})
    if r.status_code != 200:
        return None
    data = r.json()
    bs_teams = data.get("boxscore", {}).get("teams", [])
    if not bs_teams:
        return None

    teams_out = []
    for t in bs_teams:
        team_info = t.get("team", {})
        stats     = {s["name"]: s.get("displayValue", "0") for s in t.get("statistics", [])}
        teams_out.append({
            "name":   team_info.get("displayName", ""),
            "crest":  f"https://a.espncdn.com/i/teamlogos/soccer/500/{team_info.get('id','')}.png",
            "yellow": int(stats.get("yellowCards", 0) or 0),
            "red":    int(stats.get("redCards", 0) or 0),
        })

    # Pull match name from header
    header_comp = (data.get("header", {}).get("competitions") or [{}])[0]
    competitors = header_comp.get("competitors", [])
    home = next((c for c in competitors if c.get("homeAway") == "home"), {})
    away = next((c for c in competitors if c.get("homeAway") == "away"), {})

    return {
        "eventId": event_id,
        "home":    (home.get("team") or {}).get("displayName", ""),
        "away":    (away.get("team") or {}).get("displayName", ""),
        "teams":   teams_out,
    }


async def _do_fetch(bypass_schedule: bool = False):
    """Scan all WC2026 match dates, fetch card data for any completed uncached matches."""
    cache = _load()
    already_cached = set(cache.get("cards", {}).keys())

    async with httpx.AsyncClient(timeout=15) as client:
        # Walk every WC match date and collect completed event IDs
        today_bst = datetime.now(BST).date()
        check_end = min(today_bst, WC_END)
        current   = WC_START
        all_event_ids: list[str] = []

        while current <= check_end:
            ids = await _fetch_event_ids(client, current)
            all_event_ids.extend(ids)
            current += timedelta(days=1)

        pending = [eid for eid in all_event_ids if eid not in already_cached]
        print(f"[CARDS] {len(all_event_ids)} completed matches found, {len(pending)} uncached.")

        for eid in pending:
            result = await _fetch_cards_for_event(client, eid)
            if result:
                cache.setdefault("cards", {})[eid] = result
                _save(cache)
                y = sum(t["yellow"] for t in result["teams"])
                r = sum(t["red"]    for t in result["teams"])
                print(f"[CARDS] {result['home']} vs {result['away']}: {y}Y {r}R cached.")
            else:
                print(f"[CARDS] No card data for event {eid}.")

    print(f"[CARDS] Done. {len(cache.get('cards', {}))} matches in cache.")


async def fetch_all_now():
    """Bypass schedule — fetch everything immediately. For testing/manual use."""
    print("[CARDS] Running full fetch (schedule bypassed)…")
    await _do_fetch(bypass_schedule=True)


async def background_loop():
    print("[CARDS] ESPN card scraper started (schedule: 22:00, 00:00, 02:00, 04:00, 06:00, 08:00 BST).")
    await asyncio.sleep(10)

    # Always attempt one fetch on startup
    try:
        await _do_fetch()
    except Exception as e:
        print(f"[CARDS] Startup fetch error: {e}")

    while True:
        secs    = _seconds_until_next_scheduled()
        next_dt = datetime.now(BST) + timedelta(seconds=secs)
        print(f"[CARDS] Next fetch at {next_dt.strftime('%H:%M BST')} (in {int(secs // 60)}m)")
        await asyncio.sleep(secs)
        try:
            await _do_fetch()
        except Exception as e:
            print(f"[CARDS] Fetch cycle error: {e}")
