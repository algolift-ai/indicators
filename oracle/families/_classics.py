"""TA-Lib oracles for the classic indicators (OS-R9, 2026-10-16).

The classic indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR and the
rest TA-Lib also computes) were written for the platform before the
catalogue existed: they are strategy nodes, their numbers are what saved
strategies and the engine run on, and their defaults are the node's, never
changed. Each is compared here with TA-Lib's own output on the catalogue
bars. Where the two agree to the default tolerance the formula moves into
@algolift/indicators with this fixture as its own; where they differ by a
convention (a seed, a warmup, a zero range) the app's numbers stay as they
are, TA-Lib's output is kept beside them as `talib/<id>.json`
(`compare_only=True`), and the indicator's own fixture is the node's formula
on the same cases (scripts/indicators/classics/fixtures.mts), each convention
stated in `src/lib/indicators/catalog/classics.ts`.

So a classic oracle differs from a port's in one way: case 0 is the NODE's
defaults (SMA 20, Bollinger 20 and 2), not TA-Lib's (30, and 5), because
the node's defaults are what the formula is offered with. Each family file
says TA-Lib's default beside case 0, and the fixture's note says so too.
"""

from __future__ import annotations

from typing import Callable, Mapping, Sequence

from oraclelib import Oracle, source


def _talib():
    import talib  # noqa: PLC0415
    import talib.abstract  # noqa: F401, PLC0415

    return talib


# One TA-Lib call: the function, spec parameter -> TA-Lib argument(s), fixed
# TA-Lib arguments, and spec output -> TA-Lib output name.
Call = tuple[str, Mapping[str, str | Sequence[str]], Mapping[str, object], Mapping[str, str]]


def classic_oracle(
    calls: Sequence[Call] | Callable[[dict], Sequence[Call]],
    *,
    cases: Sequence[dict],
    talib_defaults: str,
    compare_only: bool = False,
    note: str = "",
) -> Oracle:
    """An oracle calling one or more TA-Lib functions per case and merging
    their outputs (ADX with PLUS_DI, MINUS_DI and DX; AROON with AROONOSC).

    - `calls`: the TA-Lib calls, or a function of the case's settings
      choosing them (the Stochastic's type picks STOCH or STOCHF).
    - `cases`: in the node's parameter names; cases[0] is the node's defaults.
    - `talib_defaults`: TA-Lib's own defaults in words, recorded in the note.
    - `compare_only`: the indicator differs from TA-Lib by a convention, so
      TA-Lib's output is a comparison, written to talib/<id>.json.
    A function whose input is one price series reads close (the classic
    nodes have no source setting; the formula reads `series`, close by default).
    """

    def calls_of(s: dict) -> Sequence[Call]:
        return calls(s) if callable(calls) else calls

    def run(bars, s: dict):
        talib = _talib()
        entries, call_record, inputs, outputs = [], {}, [], {}
        for name, params, fixed, outs in calls_of(s):
            info = talib.abstract.Function(name).info
            call: dict = dict(fixed)
            for p, args in params.items():
                if p in s:
                    for a in [args] if isinstance(args, str) else args:
                        call[a] = s[p]
            arrays = []
            for key, val in info["input_names"].items():
                if key in ("price", "real"):
                    arrays.append(source(bars, "close"))
                    cols = ["close"]
                else:
                    cols = list(val) if isinstance(val, (list, tuple)) else [val]
                    arrays.extend(bars[c] for c in cols)
                for c in cols:
                    if c not in inputs:
                        inputs.append(c)
            res = getattr(talib, name)(*arrays, **call)
            res = res if isinstance(res, tuple) else (res,)
            by_name = dict(zip(info["output_names"], res))
            for spec_out, lib_out in outs.items():
                outputs[spec_out] = by_name[lib_out]
            entries.append(name)
            call_record[name] = call
        entry = entries[0] if len(entries) == 1 else "+".join(entries)
        return entry, call_record if len(entries) > 1 else call_record[entries[0]], inputs, outputs

    def check(s: dict):
        # Every TA-Lib argument a call takes must be set, by the case or as
        # fixed, so the fixture records the whole call and TA-Lib's own
        # default never decides a number silently.
        talib = _talib()
        for name, params, fixed, _outs in calls_of(s):
            lib = dict(talib.abstract.Function(name).info["parameters"])
            given = set(fixed)
            for p, args in params.items():
                if p in s:
                    given.update([args] if isinstance(args, str) else args)
            missing = [a for a in lib if a not in given]
            if missing:
                raise ValueError(f"{name}: cases[0] leaves {missing} to TA-Lib's defaults; set them")

    full = f"Case 0 is the AlgoLift node's defaults; TA-Lib's own defaults are {talib_defaults}." + (f" {note}" if note else "")
    return Oracle("TA-Lib", run, cases, check, full, "talib" if compare_only else "")
