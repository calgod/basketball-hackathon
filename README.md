> Note from the editor: 
The code in this repository was generated with assistance from OpenAI GPT-5.3-Codex with GitHub Copilot in VS Code.

# March Madness Strudel Tracker

A live-coding interactive web app that synchronizes NCAA March Madness score events with Strudel algorithmic music patterns. Every score triggers evolving hi-hat rhythms, and a final game event plays a dramatic closing cue.

## Features

- **Live Score Tracking**: Real-time game state display with home/away teams and scores.
- **Reactive Audio**: Strudel patterns mutate on each score event—hi-hat complexity increases with each scoring play.
- **Live Code Display**: Watch the actual Strudel code change in real-time as score events accumulate.
- **Event Log**: See every score and final event with timestamps.
- **Configurable Simulation**: Control game length, update frequency, and final event timing via environment variables.
- **Firewall-Safe**: Strudel runs locally from `node_modules`, no external CDN required.

## How It Works

1. **Base Beat**: A customizable drum pattern loops continuously via Strudel.
2. **Score Events**: Each time a team scores, the hi-hat layer evolves through patterns:
   - `hh*2` → `hh*4` → `hh*8` → `hh*12` → complex polyrhythms → etc.
3. **Final Event**: When the game ends, a dramatic multi-layer cue plays (gong + bass kick with reverb).
4. **Live Mutation**: All pattern changes are re-evaluated on the next Strudel cycle (no hard cutoffs).

## Setup

### Requirements

- Node.js 18+
- npm
- Browser with Web Audio API support

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

### First Run

1. Click **Start Audio** (browser gesture-unlock required).
2. Watch scores arrive every ~6 seconds (simulation mode).
3. Listen and watch the "Current Rendered Code" panel update as scores change.
4. When the game ends (~96–180 seconds), hear the final cue.

## Configuration

Create a `.env` file in the project root to customize behavior:

```env
PORT=3000
POLL_INTERVAL_MS=6000
DATA_MODE=simulation
MIN_TICKS_BEFORE_FINAL=16
MAX_TICKS_BEFORE_FINAL=30
```

**Options:**

- `PORT`: Server port (default: `3000`).
- `POLL_INTERVAL_MS`: Milliseconds between score ticks (default: `6000` = 6 seconds).
- `DATA_MODE`: `simulation` or future real provider (default: `simulation`).
- `MIN_TICKS_BEFORE_FINAL`: Minimum ticks before game can end (default: `16`).
- `MAX_TICKS_BEFORE_FINAL`: Maximum ticks; game must end by this point (default: `30`).

Tweak these for shorter/longer games or faster/slower score updates.

## Project Structure

```
.
├── server.js              # Node backend, SSE stream, score simulation
├── package.json           # Dependencies
├── .env.example           # Configuration template
├── public/
│   ├── index.html         # UI shell and Strudel loader
│   ├── styles.css         # Styling
│   ├── audio.js           # Strudel audio engine + live code renderer
│   └── client.js          # SSE listener, UI updates, event routing
└── README.md              # This file
```

## Strudel Patterns

The default base pattern is:

```
stack(
  s("bd ~ sd ~").gain(0.9),
  s("cp ~ cp ~").gain(0.55)
)
```

You can edit this in the **Live Strudel Code** textarea and click **Apply Base Code** to change the drum foundation. Score events then layer hi-hats and finals on top.

## Future Enhancements

- Real March Madness data provider integration (swap simulation in `server.js`).
- Custom team instruments per team (e.g., Kansas = snare, Duke = cowbell).
- Multi-game tracking.
- Advanced Strudel effects (filters, reverb, granulation).
- Persistent game state/replays.

## License

AGPL-3.0 (due to Strudel's AGPL license).

## Notes

- **Strudel Runtime**: Served locally from `node_modules/@strudel/web/dist/` to avoid firewall/CDN issues. Falls back to CDN if local fails.
- **Samples**: All drum sounds come from the [Dirt Samples](https://github.com/tidalcycles/dirt-samples) library.
- **Browser Support**: Chrome, Firefox, Safari (Web Audio API required).
- **Demo Mode**: Simulation mode is deterministic and can run indefinitely; scores happen randomly every 6–9 seconds.
