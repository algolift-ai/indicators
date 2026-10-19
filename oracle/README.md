# The oracle

The fixtures in `../fixtures` are the libraries' own output, written by this folder's `generate.py`. Nothing in a fixture is typed by hand.

- `requirements.txt`: the pinned environment (TA-Lib 0.8.1 with its bundled C library, pandas-ta-classic 0.8.32, pandas-ta 0.4.71b0, numpy 2.2.6, pandas 3.0.6). `generate.py` refuses to run on any other version, so every fixture records exactly these.
- `oraclelib.py`: the machinery: the fixed bars, the `source` setting written in the same order of operations as the TypeScript, the calls into each library, the fixture format.
- `families/<family>.py`: each indicator's oracle: which library function, how the settings map to its arguments, and three or more cases (the first is always the defaults).
- `catalog.json`: the package's indicators and their families.

## Run it

Python 3.12, wheels only, in a virtual environment outside the repo:

```bash
python3.12 -m venv ~/.venvs/indicator-oracle
~/.venvs/indicator-oracle/bin/python -I -m pip install --only-binary=:all: -r oracle/requirements.txt
```

Then, from the repo root:

```bash
~/.venvs/indicator-oracle/bin/python -I oracle/generate.py --check --all   # recompute every fixture, compare byte for byte
~/.venvs/indicator-oracle/bin/python -I oracle/generate.py --list          # every declared oracle
~/.venvs/indicator-oracle/bin/python -I oracle/generate.py wma             # rewrite one fixture
~/.venvs/indicator-oracle/bin/python -I oracle/families/candlestick_patterns.py   # rewrite the candlestick stress bars
```

`-I` keeps Python from importing anything from the current folder or your user site-packages.

## Two notes

- **The Tweezers** (`cdl_tweezer_bottom`, `cdl_tweezer_top`) are ported from technicalindicators 3.1.0, a JavaScript library no Python package computes. Their fixtures are an independent numpy implementation of the library's rule, written from its definition, not from the TypeScript (`families/candlestick_patterns_a.py`).
- **The candlestick stress bars** (`fixtures/candlestick_stress.json`): the shared 400 bars move in small steps and rarely form a multi-candle pattern, so every TA-Lib pattern is also checked, exactly, on 8,000 seeded bars built to form them all.
