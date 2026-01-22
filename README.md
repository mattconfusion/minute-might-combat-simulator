# Minute Might Combat Simulator

A Monte Carlo combat probability simulator for the SCRUD (Simple Combat Resolution Using Dice) system.

## GitHub Pages

**[https://mattconfusion.github.io/minute-might-combat-simulator/](https://mattconfusion.github.io/minute-might-combat-simulator/)**

## Overview

Minute Might Balancer simulates thousands of combat encounters to calculate win probabilities, expected casualties, and statistical distributions for tabletop wargame combat resolution.

## Features

- **Melee Combat Simulation** - Both sides roll dice pools and compare results using SCRUD
- **Missile Fire Simulation** - Attacker hits on 5+, defender dodges
- **Dice Notation Parser** - Supports `NdF/Mf` (per-figure) and `NdF` (flat) formats
- **Bonus Dice** - 50% or 100% bonus dice with automatic substitution
- **Artillery** - 2x casualties per hit
- **Indirect Fire** - Converts d8 → d6
- **Statistical Analysis** - Mean, standard deviation, sigma ranges
- **Visual Histograms** - Casualty distribution charts
- **Simulation History** - Track and compare previous runs
- **Game Rules** - Built-in rules reference

## Dice Notation

| Format | Example | Description |
|--------|---------|-------------|
| `NdF/Mf` | `2d6/1f` | 2 dice of d6 per 1 figure |
| `NdF` | `1d8` | Flat bonus dice (not per-figure) |
| Combined | `1d6/1f + 1d8` | Mix of per-figure and flat |

## File Structure

```
minute-might-balancer/
├── index.html      # Main application
├── styles.css      # Styling
├── script.js       # Simulation logic
├── game-rules.md   # SCRUD rules reference
├── tests.html      # Test runner
├── tests.js        # Unit tests
└── README.md       # This file
```

## Local Development

Open `index.html` directly in a browser. Note: The "Game Rules" modal requires a web server to load the markdown file.

To run with a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve
```

Then open `http://localhost:8000`

## Running Tests

Open `tests.html` in a browser and click "Run All Tests".

## License

MIT
