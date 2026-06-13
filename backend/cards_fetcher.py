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
DAILY_LIMIT   = 90        # stay under API-Football's 100 req/day free tier
CYCLE_SECONDS = 5 * 60   # attempt one request every 5 minutes

_daily_count  = 0
_daily_date   = None      # tracks which UTC date the counter belongs to


def _load() -> dict:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"fixtures": {}, "events": {}}


def _save(cache: dict):
    CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _in_window() -> bool:
    """True between 20:00 and 08:00 BST (UTC+1)."""
    hour = datetime.now(BST).hour
    return hour >= 20 or hour < 8


def get_cards_by_team(cache: dict | None = None) -> list[dict]:
    """Aggregate cached card events into a per-team sorted list."""
    if cache is None:
        cache = _load()

    teams: dict[str, dict] = {}
    for events in cache.get("events", {}).values():
        for ev in events:
            if ev.get("type") != "Card":
                continue
            team_name = (ev.get("team") or {}).get("name", "")
            if not team_name:
                continue
            detail = ev.get("detail", "")
            if team_name not in teams:
                teams[team_name] = {"name": team_name, "yellow": 0, "red": 0, "total": 0}
            if "Yellow" in detail:
                teams[team_name]["yellow"] += 1
                teams[team_name]["total"]  += 1
            elif "Red" in detail:
                teams[team_name]["red"]   += 1
                teams[team_name]["total"] += 1

    # Sort: most total cards → most red cards as tiebreak
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

        # ── Priority 2: fetch events for the next uncached finished fixture ──
        pending = [
            f for f in cache.get("fixtures", {}).values()
            if f.get("status") in ("FT", "AET", "PEN")
            and str(f["id"]) not in cache.get("events", {})
        ]

        if not pending:
            print(f"[CARDS] All finished fixtures cached. Daily used: {_daily_count}/{DAILY_LIMIT}")
            return

        fix = pending[0]
        fid = str(fix["id"])
        r = await client.get("/fixtures/events", params={"fixture": fid, "type": "Card"})
        if r.status_code == 200:
            cache.setdefault("events", {})[fid] = r.json().get("response", [])
            _save(cache)
            print(f"[CARDS] {fix['home']} vs {fix['away']} cached. {len(pending)-1} remaining. Daily: {_daily_count}/{DAILY_LIMIT}")
        else:
            print(f"[CARDS] Events failed for fixture {fid}: {r.status_code}")


async def background_loop():
    """Runs forever; fetches card data every 5 min during the 20:00–08:00 BST window.
    Also runs once immediately on startup regardless of window to populate the fixture list."""
    print("[CARDS] Background fetcher started.")
    await asyncio.sleep(10)  # let the app finish starting up

    # Always attempt one fetch on startup so the fixture list is populated immediately
    try:
        await _fetch_cycle()
    except Exception as e:
        print(f"[CARDS] Startup fetch error: {e}")

    while True:
        await asyncio.sleep(CYCLE_SECONDS)
        if _in_window():
            try:
                await _fetch_cycle()
            except Exception as e:
                print(f"[CARDS] Fetch cycle error: {e}")
        else:
            print("[CARDS] Outside 20:00–08:00 BST window, sleeping.")
