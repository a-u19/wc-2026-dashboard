# FIFA World Cup 2026 Dashboard

Live, animated dashboard for the 2026 World Cup.

## Setup

### 1. Get a free API key
Sign up at https://www.football-data.org/ (free tier — no credit card needed).

### 2. Configure the backend
```
cd backend
copy .env.example .env
# Edit .env and paste your key: FOOTBALL_API_KEY=your_key_here
pip install -r requirements.txt
```

### 3. Install frontend deps
```
cd frontend
npm install
```

### 4. Run everything
```powershell
.\start.ps1
```
Or manually:
- **Backend:** `cd backend && uvicorn main:app --reload --port 8000`
- **Frontend:** `cd frontend && npm run dev`

Open http://localhost:5173

## Tiles
| Tile | Description |
|------|-------------|
| Matches | Upcoming fixtures + results; live banner when in play |
| Most Cards | Top 3 teams by total yellow + red cards |
| Fewest Goals | Top 3 teams with fewest goals scored (played ≥1 match) |
| Fastest Goals | Top 3 quickest goals by minute |
| First Hat-Trick | Winner shown with confetti + 🔒 locked badge |
| Most Goals in a Game | Top 3 highest-scoring matches |
