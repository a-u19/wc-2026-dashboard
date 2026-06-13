import asyncio
import os
import re
import time
import traceback
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import httpx
from dotenv import load_dotenv

import cards_fetcher

load_dotenv()

app = FastAPI(title="World Cup 2026 API")


@app.on_event("startup")
async def startup():
    asyncio.create_task(cards_fetcher.background_loop())

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"\n[ERROR] {request.url}\n{tb}")
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})


# ── Auth ──────────────────────────────────────────────────────────────────────
BASE        = "https://worldcup26.ir"
WC_EMAIL    = os.getenv("WC_EMAIL",    "wcdash2026x@gmail.com")
WC_PASSWORD = os.getenv("WC_PASSWORD", "Dashboard2026!")
WC_NAME     = os.getenv("WC_NAME",     "WC Dashboard")

_token: str | None = None
_token_ts: float   = 0
TOKEN_TTL  = 7_000_000  # ~81 days

_cache: dict = {}
CACHE_TTL   = 90


async def get_token() -> str:
    global _token, _token_ts
    if _token and (time.time() - _token_ts) < TOKEN_TTL:
        return _token

    print(f"[AUTH] Authenticating with {WC_EMAIL}…")
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(f"{BASE}/auth/authenticate",
                         json={"email": WC_EMAIL, "password": WC_PASSWORD})
        print(f"[AUTH] authenticate → {r.status_code}: {r.text[:300]}")

        if r.status_code not in (200, 201):
            print(f"[AUTH] Login failed, attempting registration…")
            reg = await c.post(f"{BASE}/auth/register",
                               json={"email": WC_EMAIL, "password": WC_PASSWORD, "name": WC_NAME})
            print(f"[AUTH] register → {reg.status_code}: {reg.text[:300]}")
            # 409 = already registered — fine
            if reg.status_code in (200, 201):
                # Register returns the token directly — use it immediately
                reg_payload = reg.json()
                tok = reg_payload.get("token")
                if tok:
                    _token = tok
                    _token_ts = time.time()
                    print("[AUTH] Registered and token acquired from register response ✓")
                    return _token
            elif reg.status_code != 409:
                raise HTTPException(500, f"Registration failed {reg.status_code}: {reg.text[:200]}")

            r = await c.post(f"{BASE}/auth/authenticate",
                             json={"email": WC_EMAIL, "password": WC_PASSWORD})
            print(f"[AUTH] re-authenticate → {r.status_code}: {r.text[:300]}")

        if r.status_code not in (200, 201):
            raise HTTPException(500, f"Auth failed {r.status_code}: {r.text[:200]}")

        payload = r.json()
        print(f"[AUTH] token payload keys: {list(payload.keys())}")

        tok = (payload.get("token")
               or payload.get("access_token")
               or payload.get("jwt")
               or payload.get("accessToken")
               or (payload.get("data") or {}).get("token"))

        if not tok:
            raise HTTPException(500, f"No token found in auth response: {payload}")

        _token = tok
        _token_ts = time.time()
        print("[AUTH] Token acquired ✓")

    return _token


async def wc_get(path: str) -> dict | list:
    url = f"{BASE}{path}"
    now = time.time()
    if url in _cache and now - _cache[url]["ts"] < CACHE_TTL:
        return _cache[url]["data"]

    token = await get_token()
    print(f"[API] GET {path}")
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(url, headers={"Authorization": f"Bearer {token}"})
        print(f"[API] {path} → {r.status_code}")

        if r.status_code == 401:
            global _token
            _token = None
            token = await get_token()
            r = await c.get(url, headers={"Authorization": f"Bearer {token}"})
            print(f"[API] retry {path} → {r.status_code}")

        if r.status_code == 429:
            raise HTTPException(429, "Rate limit — retry in 60s")
        r.raise_for_status()

        data = r.json()
        _cache[url] = {"data": data, "ts": now}

    return data


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_date(local_date: str) -> str:
    try:
        dt = datetime.strptime(local_date, "%m/%d/%Y %H:%M")
        return dt.replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return local_date


def map_status(game: dict) -> str:
    if str(game.get("finished", "")).upper() == "TRUE":
        return "FINISHED"
    te = str(game.get("time_elapsed", "notstarted")).strip().lower()
    if te == "notstarted":
        return "SCHEDULED"
    if te == "ht":
        return "PAUSED"
    if te.isdigit():
        return "IN_PLAY"
    return "SCHEDULED"


def map_stage(game: dict) -> str:
    return {
        "group": "GROUP_STAGE",
        "r32":   "ROUND_OF_32",
        "r16":   "ROUND_OF_16",
        "qf":    "QUARTER_FINALS",
        "sf":    "SEMI_FINALS",
        "third": "THIRD_PLACE",
        "final": "FINAL",
    }.get((game.get("type") or "").lower(), game.get("type", ""))


def parse_scorers(raw) -> list[tuple[str, str | None]]:
    """Return list of (player_name, minute_str) tuples.

    Handles MongoDB set notation: {"J. Quiñones 9'","F. Balogun 45'+"}.
    Minute string includes + for extra time (e.g. "45'+"). Returns None if no minute found.
    Own goals (OG) are excluded.
    """
    if not raw or str(raw).strip().lower() in ("null", "none", ""):
        return []

    s = str(raw).strip()
    # Strip outer delimiters: {…} or Unicode curly-quote wrappers “…”
    if s.startswith("{"):
        s = s[1:-1] if s.endswith("}") else s[1:]
    elif s.startswith("“") and s.endswith("”"):
        s = s[1:-1]

    # Normalise Unicode curly quotes to ASCII so splitting works uniformly
    s = s.replace("“", '"').replace("”", '"')

    parts = re.split(r'",\s*"', s) if '"' in s else s.split(",")

    result = []
    for part in parts:
        token = part.strip().strip('"').strip()
        if not token or re.search(r'\(OG\)', token, re.IGNORECASE):
            continue
        # Minute formats: "9'", "45'+5", "45'+5'" (API includes trailing prime on extra time)
        m = re.search(r"\s+(\d+'(?:\+\d+'?)?)\s*$", token)
        if m:
            minute = m.group(1)
            name = token[:m.start()].strip()
        else:
            minute = None
            name = token.strip()
        if name:
            result.append((name, minute))

    return result


def extract_list(data, *keys) -> list:
    """Try multiple keys to find the list inside an API response."""
    if isinstance(data, list):
        return data
    for key in keys:
        val = data.get(key)
        if isinstance(val, list):
            return val
    # Last resort: return first list value found
    for val in data.values():
        if isinstance(val, list):
            return val
    return []


async def load_teams() -> dict[str, dict]:
    data = await wc_get("/get/teams")
    teams_raw = extract_list(data, "teams", "data", "result")
    print(f"[DATA] loaded {len(teams_raw)} teams")
    return {
        str(t.get("id", t.get("_id", ""))): {
            "name":      t.get("name_en") or t.get("name", ""),
            "flag":      t.get("flag", ""),
            "fifa_code": t.get("fifa_code", ""),
        }
        for t in teams_raw
    }


async def load_games() -> list[dict]:
    data = await wc_get("/get/games")
    games = extract_list(data, "games", "data", "result", "matches")
    print(f"[DATA] loaded {len(games)} games")
    return games


def team_from(game: dict, side: str, teams: dict) -> dict:
    """side = 'home' or 'away'"""
    tid   = str(game.get(f"{side}_team_id", "0"))
    info  = teams.get(tid, {})
    name  = info.get("name") or game.get(f"{side}_team_name_en") or game.get(f"{side}_team_label", "TBD")
    return {"id": tid, "name": name, "shortName": name, "crest": info.get("flag", "")}


# ── /api/matches ──────────────────────────────────────────────────────────────

@app.get("/api/matches")
async def get_matches():
    teams = await load_teams()
    games = await load_games()

    result = []
    for g in games:
        home  = team_from(g, "home", teams)
        away  = team_from(g, "away", teams)
        status = map_status(g)

        hs_raw = g.get("home_score", "0")
        as_raw = g.get("away_score", "0")
        home_score = int(hs_raw) if str(hs_raw).lstrip("-").isdigit() else None
        away_score = int(as_raw) if str(as_raw).lstrip("-").isdigit() else None
        has_score  = status == "FINISHED" and home_score is not None

        result.append({
            "id":       g.get("id"),
            "utcDate":  parse_date(g.get("local_date", "")),
            "status":   status,
            "stage":    map_stage(g),
            "group":    g.get("group"),
            "homeTeam": home,
            "awayTeam": away,
            "score": {
                "fullTime": {"home": home_score if has_score else None,
                             "away": away_score if has_score else None},
                "halfTime": {"home": None, "away": None},
            },
        })

    return {"matches": result}


# ── /api/stats ────────────────────────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats():
    teams = await load_teams()
    games = await load_games()

    goals_by_team: dict[str, dict] = defaultdict(
        lambda: {"name": "", "crest": "", "scored": 0, "played": 0}
    )
    hat_tricks: list            = []
    hat_trick_race_entries: list = []
    most_goals_single: list     = []
    fastest_goals: list         = []

    def minute_to_int(m: str | None) -> float:
        """Convert '9'' → 9, '45'+5'' → 50, None → inf (so goals with no minute sort last)."""
        if not m:
            return float("inf")
        digits = re.findall(r"\d+", m)
        if not digits:
            return float("inf")
        base = int(digits[0])
        extra = int(digits[1]) if len(digits) > 1 else 0
        return base + extra

    for g in games:
        if map_status(g) != "FINISHED":
            continue

        home       = team_from(g, "home", teams)
        away       = team_from(g, "away", teams)
        home_name  = home["name"]
        away_name  = away["name"]
        home_crest = home["crest"]
        away_crest = away["crest"]
        match_date = parse_date(g.get("local_date", ""))

        hs_raw = g.get("home_score", "0")
        as_raw = g.get("away_score", "0")
        home_score = int(hs_raw) if str(hs_raw).lstrip("-").isdigit() else 0
        away_score = int(as_raw) if str(as_raw).lstrip("-").isdigit() else 0

        for tid, tname, tcrest, tsc in [
            (home["id"], home_name, home_crest, home_score),
            (away["id"], away_name, away_crest, away_score),
        ]:
            if not tid or tid == "0":
                continue
            goals_by_team[tid]["name"]    = tname
            goals_by_team[tid]["crest"]   = tcrest
            goals_by_team[tid]["scored"] += tsc
            goals_by_team[tid]["played"] += 1

        for raw_scorers, side_name, side_crest in [
            (g.get("home_scorers"), home_name, home_crest),
            (g.get("away_scorers"), away_name, away_crest),
        ]:
            if raw_scorers and str(raw_scorers).strip() not in ("null", "None", ""):
                print(f"[SCORERS] {side_name}: {raw_scorers!r}")
            pairs = parse_scorers(raw_scorers)
            if pairs:
                print(f"[PARSED]  {pairs}")
            player_minutes: dict[str, list] = defaultdict(list)
            for pname, minute in pairs:
                player_minutes[pname].append(minute)
                if minute:
                    fastest_goals.append({
                        "player":    pname,
                        "team":      side_name,
                        "crest":     side_crest,
                        "minute":    minute,
                        "minuteInt": minute_to_int(minute),
                        "home":      home_name,
                        "away":      away_name,
                        "matchDate": match_date,
                    })
            for player_name, minutes in player_minutes.items():
                count = len(minutes)
                entry = {
                    "player":    player_name,
                    "team":      side_name,
                    "crest":     side_crest,
                    "goals":     count,
                    "minutes":   [m for m in minutes if m],
                    "matchDate": match_date,
                    "home":      home_name,
                    "away":      away_name,
                }
                hat_trick_race_entries.append(entry)
                if count >= 3:
                    hat_tricks.append(entry)

        most_goals_single.append({
            "home": home_name, "homeCrest": home_crest, "homeScore": home_score,
            "away": away_name, "awayCrest": away_crest, "awayScore": away_score,
            "total": home_score + away_score,
            "date": match_date,
        })

    goals_list_least         = sorted([g for g in goals_by_team.values() if g["played"] > 0],
                                       key=lambda x: (x["scored"], -x["played"]))
    most_goals_single_sorted = sorted(most_goals_single, key=lambda x: x["total"], reverse=True)
    # Most goals first; ties broken by most recent match (stable two-pass sort)
    hat_trick_race_sorted    = sorted(hat_trick_race_entries, key=lambda x: x["matchDate"] or "", reverse=True)
    hat_trick_race_sorted    = sorted(hat_trick_race_sorted, key=lambda x: x["goals"], reverse=True)
    hat_trick_winner         = sorted(hat_tricks, key=lambda x: x["matchDate"])[0] if hat_tricks else None

    return {
        "mostCards":           cards_fetcher.get_cards_by_team()[:10],
        "leastGoals":          goals_list_least[:10],
        "fastestGoals":        sorted(fastest_goals, key=lambda x: x["minuteInt"])[:10],
        "hatTrick":            hat_trick_winner,
        "hatTrickRace":        hat_trick_race_sorted[:3],
        "mostGoalsSingleGame": most_goals_single_sorted[:5],
    }


# ── /api/cards/status ────────────────────────────────────────────────────────

@app.get("/api/cards/status")
async def cards_status():
    cache  = cards_fetcher._load()
    cards  = cache.get("cards", {})
    return {
        "matches_cached":  len(cards),
        "source":          "ESPN (no API key required)",
        "cards_by_team":   cards_fetcher.get_cards_by_team(cache)[:10],
    }


# ── /api/cards/fetch — trigger an immediate fetch cycle ──────────────────────

@app.post("/api/cards/fetch")
async def cards_fetch_now():
    """Fetch all pending card data immediately, bypassing daily limit and time window."""
    try:
        await cards_fetcher.fetch_all_now()
        return {"ok": True, "daily_used": cards_fetcher._daily_count}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── /api/debug — shows raw API responses to help diagnose issues ──────────────

@app.get("/api/debug")
async def debug():
    try:
        token = await get_token()
        games_raw = await wc_get("/get/games")
        teams_raw = await wc_get("/get/teams")
        games_sample = games_raw[:2] if isinstance(games_raw, list) else games_raw
        teams_sample = teams_raw[:2] if isinstance(teams_raw, list) else teams_raw
        return {
            "auth": "ok",
            "games_type": type(games_raw).__name__,
            "games_keys": list(games_raw.keys()) if isinstance(games_raw, dict) else "list",
            "games_count": len(games_raw) if isinstance(games_raw, list) else len(games_raw.get(next(iter(games_raw)), [])),
            "games_sample": games_sample,
            "teams_type": type(teams_raw).__name__,
            "teams_keys": list(teams_raw.keys()) if isinstance(teams_raw, dict) else "list",
            "teams_sample": teams_sample,
        }
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@app.get("/api/health")
async def health():
    return {"ok": True, "source": "worldcup26.ir"}


# ── Serve React frontend (must be last) ───────────────────────────────────────
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file = _dist / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(_dist / "index.html"))
