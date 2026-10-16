"""Subset the source fonts to woff2 and write the @font-face block into index.html.

Run after changing a font or the glyph set:
    uv run --with fonttools --with brotli scripts/subset-fonts.py

Sources live in fonts/source (never bundled); outputs go to src/assets/fonts.
"""

import re
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "fonts" / "source"
OUT = ROOT / "src" / "assets" / "fonts"
INDEX = ROOT / "index.html"
SUPPLEMENTAL = Path("/System/Library/Fonts/Supplemental")

# Local faces the metric-matched fallbacks are measured against, and the local() names they load
FALLBACKS = {
    "serif": ("Georgia.ttf", ['local("Georgia")', 'local("Times New Roman")']),
    "serif-bold": ("Georgia Bold.ttf", ['local("Georgia Bold")', 'local("Georgia-Bold")', 'local("Times New Roman Bold")']),
    "serif-italic": ("Georgia Italic.ttf", ['local("Georgia Italic")', 'local("Georgia-Italic")', 'local("Times New Roman Italic")']),
    "mono": ("Courier New.ttf", ['local("Courier New")', 'local("Courier")']),
}

# Basic Latin + Latin-1 (covers Spanish and most Western European accents), punctuation,
# currency, arrows, and the box-drawing / block / geometric ranges the ASCII art relies on.
# Latin Extended-A (ą, ł, ő…) is left out: ~30 KB per pixel face for letters no post uses yet.
TEXT_UNICODES = [
    *range(0x20, 0x7F),
    *range(0xA0, 0x100),
    *range(0x2000, 0x2070),
    0x20AC,
    0x2122,
    *range(0x2190, 0x2200),
    *range(0x2500, 0x2600),
    0x30C4,  # ツ, for the ¯\_(ツ)_/¯ shrug
]

# Departure Mono only sets the wordmark and the ASCII portrait: ASCII, the cursor blocks and the link arrows
PIXEL_UNICODES = [*range(0x20, 0x7F), 0x2190, 0x2192, 0x2197, 0x2588, 0x258C]

FONTS = [
    # family, source, output, axis pins, style, weight range it answers to, font-display, fallback, preload
    # Newsreader ships as static cuts: the full variable font is ~200 KB, each pinned instance ~42 KB.
    # Text cut (optical size 16) for running copy, display cut (optical size 72) for headlines.
    ("newsreader", "Newsreader[opsz,wght].ttf", "newsreader.woff2", {"opsz": 16, "wght": 400}, "normal", "300 500", "swap", "serif", True),
    ("newsreader-display", "Newsreader[opsz,wght].ttf", "newsreader-display.woff2", {"opsz": 72, "wght": 350}, "normal", "300 500", "swap", "serif", True),
    # Bold and italic only appear inside running text, so they load on demand and are never preloaded
    ("newsreader", "Newsreader[opsz,wght].ttf", "newsreader-semibold.woff2", {"opsz": 16, "wght": 600}, "normal", "600 700", "swap", "serif-bold", False),
    ("newsreader", "Newsreader-Italic[opsz,wght].ttf", "newsreader-italic.woff2", {"opsz": 16, "wght": 400}, "italic", "300 500", "swap", "serif-italic", False),
    # Metadata and code: swaps in behind its metric-matched fallback, so it isn't worth a preload slot
    ("jetbrains-mono", "JetBrainsMono[wght].ttf", "jetbrains-mono.woff2", {"wght": (400, 500)}, "normal", "400 500", "swap", "mono", False),
    ("departure-mono", "DepartureMono-Regular.otf", "departure-mono.woff2", None, "normal", "400", "swap", "mono", True),
]

# Rough English letter frequencies (space included) for the average-width estimate
FREQ = {
    " ": 18.3, "e": 10.2, "t": 7.5, "a": 6.5, "o": 6.2, "n": 5.7, "i": 5.7, "s": 5.3, "r": 5.0, "h": 4.9,
    "l": 3.3, "d": 3.3, "u": 2.3, "c": 2.2, "m": 2.0, "f": 1.8, "w": 1.7, "g": 1.6, "y": 1.6, "p": 1.5,
    "b": 1.2, "v": 0.8, "k": 0.6, "x": 0.2, "j": 0.1, "q": 0.1, "z": 0.1,
}


def avg_width(font: TTFont) -> float:
    cmap, hmtx, upm = font.getBestCmap(), font["hmtx"], font["head"].unitsPerEm
    total = sum(f * hmtx[cmap[ord(c)]][0] for c, f in FREQ.items() if ord(c) in cmap)
    weight = sum(f for c, f in FREQ.items() if ord(c) in cmap)
    return total / weight / upm


def build(src: str, out: str, limits: dict | None, unicodes: list[int]) -> TTFont:
    font = TTFont(SOURCE / src, lazy=False)
    if limits:
        font = instancer.instantiateVariableFont(font, limits)
        # Round-trip so the subsetter sees plain tables (it trips over a partially instanced gvar)
        buffer = BytesIO()
        font.save(buffer)
        buffer.seek(0)
        font = TTFont(buffer, lazy=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern", "liga"]
    # Hints are ignored by modern rasterizers and roughly double the size of the files
    options.hinting = False
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font.save(OUT / out)
    return font


def fallback_rule(family: str, font: TTFont, kind: str, style: str, weight: str) -> str:
    base_file, sources = FALLBACKS[kind]
    base = TTFont(SUPPLEMENTAL / base_file)
    upm, hhea = font["head"].unitsPerEm, font["hhea"]
    adjust = avg_width(font) / avg_width(base)
    pct = lambda v: f"{v / upm / adjust * 100:.2f}%"  # noqa: E731
    return (
        "@font-face {\n"
        f'  font-family: "{family}-fallback";\n'
        f"  src: {', '.join(sources)};\n"
        # Same style and weight as the face it stands in for, so bold and italic runs get their own metrics
        f"  font-style: {style};\n"
        f"  font-weight: {weight};\n"
        f"  size-adjust: {adjust * 100:.2f}%;\n"
        f"  ascent-override: {pct(hhea.ascent)};\n"
        f"  descent-override: {pct(abs(hhea.descent))};\n"
        f"  line-gap-override: {pct(hhea.lineGap)};\n"
        "}"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob("*.woff2"):
        stale.unlink()
    rules, preloads = [], []
    for family, src, out, limits, style, weight, display, fallback, preload in FONTS:
        font = build(src, out, limits, PIXEL_UNICODES if family == "departure-mono" else TEXT_UNICODES)
        size = (OUT / out).stat().st_size
        print(f"{out}: {size / 1024:.1f} KB ({len(font.getBestCmap())} glyphs)")
        rules.append(
            "@font-face {\n"
            f'  font-family: "{family}";\n'
            f'  src: url("/src/assets/fonts/{out}") format("woff2");\n'
            f"  font-style: {style};\n"
            f"  font-weight: {weight};\n"
            f"  font-display: {display};\n"
            "}"
        )
        if fallback:
            # Measured on the instance itself, so the display cut gets its own (narrower) metrics
            rules.append(fallback_rule(family, font, fallback, style, weight))
        if preload:
            preloads.append(f'<link rel="preload" href="/src/assets/fonts/{out}" as="font" type="font/woff2" crossorigin />')

    indent = "\n        "
    style = "\n".join(rules).replace("\n", "\n            ")
    block = (
        "<!-- fonts:start (generated by scripts/subset-fonts.py) -->"
        + indent
        + indent.join(preloads)
        + f"{indent}<style>\n            {style}\n        </style>{indent}<!-- fonts:end -->"
    )
    html = INDEX.read_text()
    html, count = re.subn(r"<!-- fonts:start.*?<!-- fonts:end -->", block, html, flags=re.S)
    if count != 1:
        raise SystemExit("index.html needs one <!-- fonts:start --> ... <!-- fonts:end --> block")
    INDEX.write_text(html)
    print("Updated the preloads and @font-face block in index.html")


if __name__ == "__main__":
    main()
