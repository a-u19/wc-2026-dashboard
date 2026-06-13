"""
Fetches card (yellow/red) data from API-Football during the 20:00–08:00 BST window.
Makes at most 20 requests per cycle, spread every 36 minutes across the window.
Results are cached in cards_cache.json indefinitely (finished matches don't change).
"""

import asyncio
import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

import httpx

CACHE_FILE    = Path(__file__).parent / "cards_cache.json"
API_BASE      = "https://v3.football.api-sports.io"
WC_LEAGUE_ID  = 1       # FIFA World Cup on API-Football
WC_SEASON     = 2026
BST           = timezone(timedelta(hours=1))
DAILY_LIMIT    = 90   # stay comfortably under API-Football's 100 req/day free tier
# Scheduled fetch times in BST (hour, minute)
SCHEDULE_BST   = [(22, 0), (0, 0), (2, 0), (4, 0), (6, 0), (8, 0)]

_daily_count   = 0
_daily_date    = None


def _load() -> dict:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"fixtures": {}, "events": {}}


def _save(cache: dict):
    CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _seconds_until_next_scheduled() -> float:
    """Returns seconds until the next scheduled fetch time."""
    now = datetime.now(BST)
    today = now.date()
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
    """Aggregate cached fixture statistics into a per-team sorted card list."""
    if cache is None:
        cache = _load()

    teams: dict[str, dict] = {}
    for team_stats_list in cache.get("statistics", {}).values():
        # Each entry is the response array: [{team, statistics}, {team, statistics}]
        for entry in team_stats_list:
            team_name = (entry.get("team") or {}).get("name", "")
            crest     = (entry.get("team") or {}).get("logo", "")
            if not team_name:
                continue
            stats = {s["type"]: (s["value"] or 0) for s in entry.get("statistics", [])}
            yellow = int(stats.get("Yellow Cards") or 0)
            red    = int(stats.get("Red Cards") or 0)
            if team_name not in teams:
                teams[team_name] = {"name": team_name, "crest": crest, "yellow": 0, "red": 0, "total": 0}
            teams[team_name]["yellow"] += yellow
            teams[team_name]["red"]    += red
            teams[team_name]["total"]  += yellow + red

    # Most cards first; tiebreak by most red cards
    return sorted(teams.values(), key=lambda t: (-t["total"], -t["red"]))


def _check_and_increment_daily() -> bool:
    """Returns True if we're under the daily limit and increments the counter."""
    global _daily_count, _daily_date
    today = datetime.now(timezone.utc).date()
    if _daily_date != today:
        _daily_count = 0
        _daily_date  = today
    if _daily_count >= DAILY_LIMIT:
        return False
    _daily_count += 1
    return True


async def _fetch_cycle():
    api_key = os.getenv("APIFOOTBALL_KEY", "").strip()
    if not api_key:
        return

    if not _check_and_increment_daily():
        print(f"[CARDS] Daily limit of {DAILY_LIMIT} reached, skipping.")
        return

    cache = _load()

    async with httpx.AsyncClient(
        base_url=API_BASE,
        headers={"x-apisports-key": api_key},
        timeout=15,
    ) as client:

        # ── Priority 1: get fixture list if we don't have it yet ──
        if not cache.get("fixtures"):
            print("[CARDS] Fetching WC2026 fixture list from API-Football…")
            r = await client.get("/fixtures", params={"league": WC_LEAGUE_ID, "season": WC_SEASON})
            if r.status_code == 200:
                for f in r.json().get("response", []):
                    fid = str(f["fixture"]["id"])
                    cache["fixtures"][fid] = {
                        "id":     fid,
                        "date":   f["fixture"]["date"],
                        "home":   f["teams"]["home"]["name"],
                        "away":   f["teams"]["away"]["name"],
                        "status": f["fixture"]["status"]["short"],
                    }
                _save(cache)
                print(f"[CARDS] Cached {len(cache['fixtures'])} WC2026 fixtures.")
            else:
                print(f"[CARDS] Fixture list failed {r.status_code}: {r.text[:200]}")
            return  # one request per cycle

        # ── Priority 2: fetch statistics for ALL uncached finished fixtures ──
        pending = [
            f for f in cache.get("fixtures", {}).values()
            if f.get("status") in ("FT", "AET", "PEN")
            and str(f["id"]) not in cache.get("statistics", {})
        ]

        if not pending:
            print(f"[CARDS] All finished fixtures already cached. Daily: {_daily_count}/{DAILY_LIMIT}")
            return

        print(f"[CARDS] {len(pending)} fixtures need statistics.")
        for fix in pending:
            if not _check_and_increment_daily():
                print(f"[CARDS] Daily limit hit, stopping. {len(pending)} fixture(s) deferred.")
                break
            fid = str(fix["id"])
            r = await client.get("/fixtures/statistics", params={"fixture": fid})
            if r.status_code == 200:
                cache.setdefault("statistics", {})[fid] = r.json().get("response", [])
                _save(cache)
                print(f"[CARDS] {fix['home']} vs {fix['away']} done. Daily: {_daily_count}/{DAILY_LIMIT}")
            else:
                print(f"[CARDS] Statistics failed for fixture {fid}: {r.status_code}")


async def background_loop():
    """Fetches card data at 22:00, 00:00, 02:00, 04:00, 06:00, 08:00 BST.
    Also runs once on startup to populate the fixture list."""
    print("[CARDS] Background fetcher started.")
    await asyncio.sleep(10)

    # Startup: fetch fixture list (and any pending events) immediately
    try:
        await _fetch_cycle()
    except Exception as e:
        print(f"[CARDS] Startup fetch error: {e}")

    while True:
        secs = _seconds_until_next_scheduled()
        next_dt = datetime.now(BST) + timedelta(seconds=secs)
        print(f"[CARDS] Next fetch at {next_dt.strftime('%H:%M BST')} (in {int(secs//60)}m)")
        await asyncio.sleep(secs)
        try:
            await _fetch_cycle()
        except Exception as e:
            print(f"[CARDS] Fetch cycle error: {e}")
