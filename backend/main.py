import os
import asyncio
from collections import defaultdict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="World Cup 2026 API")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("FOOTBALL_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
COMPETITION = "WC"

HEADERS = {"X-Auth-Token": API_KEY}

_cache: dict = {}
CACHE_TTL = 120  # seconds

import time

async def fetch(path: str) -> dict:
    url = f"{BASE_URL}{path}"
    now = time.time()
    if url in _cache and now - _cache[url]["ts"] < CACHE_TTL:
        return _cache[url]["data"]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, headers=HEADERS)
        if r.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit hit — try again in a minute")
        r.raise_for_status()
        data = r.json()
        _cache[url] = {"data": data, "ts": now}
        return data


@app.get("/api/matches")
async def get_matches():
    data = await fetch(f"/competitions/{COMPETITION}/matches")
    matches = data.get("matches", [])
    result = []
    for m in matches:
        result.append({
            "id": m["id"],
            "utcDate": m["utcDate"],
            "status": m["status"],
            "stage": m.get("stage"),
            "group": m.get("group"),
            "homeTeam": m["homeTeam"],
            "awayTeam": m["awayTeam"],
            "score": m["score"],
            "goals": m.get("goals", []),
            "bookings": m.get("bookings", []),
        })
    return {"matches": result}


@app.get("/api/stats")
async def get_stats():
    data = await fetch(f"/competitions/{COMPETITION}/matches")
    matches = data.get("matches", [])

    cards_by_team: dict[str, dict] = defaultdict(lambda: {"name": "", "crest": "", "red": 0, "yellow": 0, "total": 0, "played": 0})
    goals_by_team: dict[str, dict] = defaultdict(lambda: {"name": "", "crest": "", "scored": 0, "played": 0})
    fastest_goals: list = []
    hat_tricks: list = []
    hat_trick_race_entries: list = []
    most_goals_single: list = []

    for m in matches:
        if m["status"] not in ("FINISHED",):
            continue

        home_id = str(m["homeTeam"]["id"])
        away_id = str(m["awayTeam"]["id"])
        home_name = m["homeTeam"].get("shortName") or m["homeTeam"].get("name", "")
        away_name = m["awayTeam"].get("shortName") or m["awayTeam"].get("name", "")
        home_crest = m["homeTeam"].get("crest", "")
        away_crest = m["awayTeam"].get("crest", "")

        # Goals per team
        for tid, tname, tcrest in [(home_id, home_name, home_crest), (away_id, away_name, away_crest)]:
            goals_by_team[tid]["name"] = tname
            goals_by_team[tid]["crest"] = tcrest
            goals_by_team[tid]["played"] += 1
        home_score = (m["score"].get("fullTime") or {}).get("home") or 0
        away_score = (m["score"].get("fullTime") or {}).get("away") or 0
        goals_by_team[home_id]["scored"] += home_score
        goals_by_team[away_id]["scored"] += away_score

        # Cards per team
        for booking in m.get("bookings", []):
            team_id = str((booking.get("team") or {}).get("id", ""))
            if not team_id:
                continue
            team_name = (booking.get("team") or {}).get("shortName") or (booking.get("team") or {}).get("name", "")
            team_crest = (booking.get("team") or {}).get("crest", "")
            cards_by_team[team_id]["name"] = team_name
            cards_by_team[team_id]["crest"] = team_crest
            card_type = booking.get("card", "")
            if "RED" in card_type:
                cards_by_team[team_id]["red"] += 1
            else:
                cards_by_team[team_id]["yellow"] += 1
            cards_by_team[team_id]["total"] += 1

        # Fastest goals and hat-tricks from goals list
        goals = m.get("goals", [])
        player_goals: dict[str, dict] = defaultdict(lambda: {"count": 0, "name": "", "team": "", "crest": "", "minutes": []})
        for g in goals:
            minute = g.get("minute")
            player = g.get("scorer", {})
            player_id = str(player.get("id", ""))
            player_name = player.get("name", "Unknown")
            team = g.get("team", {})
            team_name = team.get("shortName") or team.get("name", "")
            team_crest = team.get("crest", "")
            team_id_g = str(team.get("id", ""))

            if minute is not None:
                fastest_goals.append({
                    "player": player_name,
                    "team": team_name,
                    "teamId": team_id_g,
                    "crest": team_crest,
                    "minute": minute,
                    "matchDate": m["utcDate"],
                    "home": home_name,
                    "away": away_name,
                })

            if player_id:
                player_goals[player_id]["count"] += 1
                player_goals[player_id]["name"] = player_name
                player_goals[player_id]["team"] = team_name
                player_goals[player_id]["crest"] = team_crest
                player_goals[player_id]["minutes"].append(minute)

        for pid, pg in player_goals.items():
            if pg["count"] >= 3:
                hat_tricks.append({
                    "player": pg["name"],
                    "team": pg["team"],
                    "crest": pg["crest"],
                    "goals": pg["count"],
                    "matchDate": m["utcDate"],
                    "home": home_name,
                    "away": away_name,
                })
            # Track each player's best single-game tally for the hat-trick race
            key = f"{pid}_{m['id']}"
            hat_trick_race_entries.append({
                "player": pg["name"],
                "team": pg["team"],
                "crest": pg["crest"],
                "goals": pg["count"],
                "matchDate": m["utcDate"],
                "home": home_name,
                "away": away_name,
            })

        total_goals = home_score + away_score
        most_goals_single.append({
            "home": home_name,
            "homeCrest": home_crest,
            "homeScore": home_score,
            "away": away_name,
            "awayCrest": away_crest,
            "awayScore": away_score,
            "total": total_goals,
            "date": m["utcDate"],
        })

    # Sort
    cards_list = sorted(cards_by_team.values(), key=lambda x: x["total"], reverse=True)
    goals_list = [g for g in goals_by_team.values() if g["played"] > 0]
    goals_list_least = sorted(goals_list, key=lambda x: (x["scored"], -x["played"]))
    fastest_goals_sorted = sorted(fastest_goals, key=lambda x: x["minute"])
    most_goals_single_sorted = sorted(most_goals_single, key=lambda x: x["total"], reverse=True)

    # Hat-trick winner: first one chronologically
    hat_trick_winner = None
    if hat_tricks:
        hat_trick_winner = sorted(hat_tricks, key=lambda x: x["matchDate"])[0]

    # Hat-trick race: best single-game tally per player, sorted desc, top 10
    hat_trick_race_sorted = sorted(hat_trick_race_entries, key=lambda x: (-x["goals"], x["matchDate"]))

    return {
        "mostCards": cards_list[:10],
        "leastGoals": goals_list_least[:10],
        "fastestGoals": fastest_goals_sorted[:10],
        "hatTrick": hat_trick_winner,
        "hatTrickRace": hat_trick_race_sorted[:10],
        "mostGoalsSingleGame": most_goals_single_sorted[:5],
    }


@app.get("/api/health")
async def health():
    return {"ok": True, "apiKeySet": bool(API_KEY)}
