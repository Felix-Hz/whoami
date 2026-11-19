# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=13,<14", "boto3>=1.40,<2"]
# ///
"""Publish gallery photos: web sizes to S3, details to Sanity.

    uv run scripts/photos.py template ~/Pictures/fav/edits gallery.csv
    # fill in titles, and locations where known (camera, lens and exposure are prefilled from the export)
    SANITY_WRITE_TOKEN=... uv run scripts/photos.py publish gallery.csv
    uv run scripts/photos.py publish gallery.csv --out public   # local preview: no upload, no Sanity

`template` appends a row per new file and never touches rows already there. `publish` handles rows
that have a title but no id yet (location is optional), then writes the id and slug back, so a rerun skips them.

`--out public` is a local preview: files go to public/img (served at /img by `vite`, gitignored) and the
gallery data to src/generated/photos.json in the shape the site's query returns. The CSV is not touched.

Published files carry pixels only: no EXIF, XMP, IPTC or ICC. Colour is converted to sRGB first,
which browsers assume for untagged images. Each file is checked for metadata before upload.
"""

import argparse
import csv
import json
import os
import re
import secrets
import sys
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import dataclass
from fractions import Fraction
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageCms, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "felix-hzv-dev-photos"
REGION = "ap-southeast-2"
AUTHOR = "Felix Hernandez Vieyra"
# Long edges published. The cap keeps prints from the site to roughly 17 cm at 300 dpi.
LONG_EDGES = (640, 1024, 1600, 2048)
FALLBACK_EDGE = 1600
AVIF_QUALITY = 70
JPEG_QUALITY = 84
IMMUTABLE = "public, max-age=31536000, immutable"
SANITY_API = "2025-02-06"
COLUMNS = ["file", "title", "location", "camera", "lens", "exposure", "id", "slug"]
EXTENSIONS = {".tif", ".tiff", ".jpg", ".jpeg", ".png"}

Image.MAX_IMAGE_PIXELS = 200_000_000


# ── Reading the export ──


def xmp_text(im: Image.Image) -> str:
    raw = im.info.get("xmp") or b""
    return raw.decode("utf-8", "ignore") if isinstance(raw, bytes) else str(raw)


def xmp_field(xmp: str, name: str) -> str:
    # Element form, with or without an rdf:Seq wrapper, then attribute form
    m = re.search(rf"<{name}>\s*(?:<rdf:Seq>\s*<rdf:li>)?([^<]+)<", xmp) or re.search(rf'{name}="([^"]*)"', xmp)
    return m.group(1).strip() if m else ""


def rational(value: str) -> Fraction | None:
    try:
        return Fraction(value) if value else None
    except (ValueError, ZeroDivisionError):
        return None


def number(f: Fraction) -> str:
    return f"{float(f):g}"


def camera_details(xmp: str) -> dict[str, str]:
    """Camera, lens and exposure as display text. Empty where the export does not say (scans, re-saves)."""
    make, model = xmp_field(xmp, "tiff:Make"), xmp_field(xmp, "tiff:Model")
    camera = ""
    # Film scans name the lab scanner as Make and Model but carry no exposure; that is not the camera
    if make and model and xmp_field(xmp, "exif:ExposureTime"):
        brand = make.split()[0].capitalize()
        rest = model[len(make.split()[0]) :].strip() if model.upper().startswith(make.split()[0].upper()) else model
        camera = f"{brand} {rest}".strip()

    parts = []
    if (focal := rational(xmp_field(xmp, "exif:FocalLength"))) is not None:
        parts.append(f"{number(focal)} mm")
    if (shutter := rational(xmp_field(xmp, "exif:ExposureTime"))) is not None and shutter > 0:
        parts.append(f"1/{round(1 / shutter)} s" if shutter < 1 else f"{number(shutter)} s")
    if (aperture := rational(xmp_field(xmp, "exif:FNumber"))) is not None:
        parts.append(f"f/{number(aperture)}")
    if iso := xmp_field(xmp, "exif:ISOSpeedRatings"):
        parts.append(f"ISO {iso}")

    return {"camera": camera, "lens": xmp_field(xmp, "exifEX:LensModel"), "exposure": " · ".join(parts)}


def identifying_strings(xmp: str) -> list[bytes]:
    """Values from the export that must not survive into any published file."""
    names = ("tiff:Make", "tiff:Model", "exifEX:LensModel", "xmp:CreatorTool", "exif:DateTimeOriginal")
    return [v.encode() for n in names if len(v := xmp_field(xmp, n)) >= 4]


# ── Rendering ──

SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))


def to_srgb(im: Image.Image) -> Image.Image:
    icc = im.info.get("icc_profile")
    rgb = im.convert("RGB")
    if icc:
        rgb = ImageCms.profileToProfile(
            rgb,
            ImageCms.ImageCmsProfile(BytesIO(icc)),
            SRGB,
            renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC,
            outputMode="RGB",
            flags=ImageCms.Flags.BLACKPOINTCOMPENSATION,
        )
    else:
        print("  no ICC profile; treating as sRGB", file=sys.stderr)
    # Pillow's encoders fall back to im.info for exif, xmp and icc_profile; nothing may carry over
    rgb.info = {}
    return rgb


def scaled(im: Image.Image, long_edge: int) -> Image.Image:
    w, h = im.size
    k = long_edge / max(w, h)
    if k >= 1:
        out = im.copy()
    else:
        out = im.resize((round(w * k), round(h * k)), Image.Resampling.LANCZOS, reducing_gap=3.0)
        # Downscaling softens; a light unsharp mask restores the edge contrast of the master
        out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=40, threshold=1))
    out.info = {}
    return out


def encode(im: Image.Image, fmt: str) -> bytes:
    buf = BytesIO()
    if fmt == "AVIF":
        im.save(buf, "AVIF", quality=AVIF_QUALITY, speed=4, subsampling="4:2:0")
    else:
        im.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True, subsampling="4:2:0")
    return buf.getvalue()


# Markers of metadata segments and boxes: JPEG APP1 Exif and XMP, APP2 ICC, APP13 IPTC, and an
# ICC-carrying colr box in AVIF. The AVIF nclx colr box only names the colour space and is allowed.
MARKERS = (b"Exif\x00\x00", b"http://ns.adobe.com/xap/1.0/", b"<x:xmpmeta", b"ICC_PROFILE", b"Photoshop 3.0", b"colrprof", b"colrrICC")


def assert_clean(data: bytes, fmt: str, forbidden: list[bytes]) -> None:
    im = Image.open(BytesIO(data))
    leaked = sorted(k for k in ("exif", "xmp", "icc_profile", "photoshop", "XML:com.adobe.xmp") if im.info.get(k))
    leaked += [m.decode("latin1") for m in MARKERS if m in data]
    leaked += [f"source value {v.decode(errors='replace')!r}" for v in forbidden if v in data]
    if im.format != fmt:
        leaked.append(f"format {im.format}")
    if leaked:
        raise SystemExit(f"refusing to publish: metadata in output ({', '.join(leaked)})")


@dataclass
class Rendered:
    width: int
    height: int
    color: str
    files: dict[str, tuple[bytes, str]]  # key suffix -> (bytes, content type)
    edges: list[int]


def render(path: Path) -> tuple[Rendered, dict[str, str]]:
    with Image.open(path) as src:
        xmp = xmp_text(src)
        orientation = xmp_field(xmp, "tiff:Orientation") or "1"
        if orientation != "1":
            raise SystemExit(f"{path.name}: orientation {orientation}; export it upright")
        forbidden = identifying_strings(xmp)
        details = camera_details(xmp)
        srgb = to_srgb(src)

    long_side = max(srgb.size)
    edges = [e for e in LONG_EDGES if e < long_side] + [min(long_side, LONG_EDGES[-1])]
    edges = sorted(set(edges))
    files: dict[str, tuple[bytes, str]] = {}
    largest = None
    for edge in edges:
        im = scaled(srgb, edge)
        largest = im
        files[f"{edge}.avif"] = (encode(im, "AVIF"), "image/avif")
    fallback_edge = min(FALLBACK_EDGE, long_side)
    files[f"{fallback_edge}.jpg"] = (encode(scaled(srgb, fallback_edge), "JPEG"), "image/jpeg")

    for name, (data, _) in files.items():
        assert_clean(data, "AVIF" if name.endswith(".avif") else "JPEG", forbidden)

    r, g, b = srgb.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    assert largest is not None
    return Rendered(largest.width, largest.height, f"#{r:02x}{g:02x}{b:02x}", files, edges), details


# ── Sanity ──


@dataclass
class Sanity:
    project: str
    dataset: str
    token: str

    def _request(self, path: str, body: dict | None = None) -> dict:
        url = f"https://{self.project}.api.sanity.io/v{SANITY_API}/data/{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.load(res)

    def max_sort_order(self) -> float:
        q = urllib.parse.quote('math::max(*[_type == "photo" && defined(sortOrder)].sortOrder)')
        return self._request(f"query/{self.dataset}?query={q}&perspective=raw")["result"] or 0

    def slugs(self) -> set[str]:
        q = urllib.parse.quote('*[_type == "photo" && defined(slug.current)].slug.current')
        return set(self._request(f"query/{self.dataset}?query={q}&perspective=raw")["result"])

    def create(self, doc: dict) -> None:
        self._request(f"mutate/{self.dataset}?returnIds=true&visibility=sync", {"mutations": [{"createIfNotExists": doc}]})


def slugify(title: str, taken: set[str]) -> str:
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")[:80] or "photo"
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    taken.add(slug)
    return slug


# ── Commands ──


def read_rows(csv_path: Path) -> list[dict[str, str]]:
    if not csv_path.exists():
        return []
    with csv_path.open(newline="", encoding="utf-8") as f:
        return [{c: (row.get(c) or "").strip() for c in COLUMNS} for row in csv.DictReader(f)]


def write_rows(csv_path: Path, rows: list[dict[str, str]]) -> None:
    tmp = csv_path.with_suffix(".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    tmp.replace(csv_path)


def cmd_template(folder: Path, csv_path: Path) -> None:
    rows = read_rows(csv_path)
    known = {r["file"] for r in rows}
    added = 0
    for path in sorted(p for p in folder.iterdir() if p.suffix.lower() in EXTENSIONS):
        file = str(path.resolve())
        if file in known:
            continue
        with Image.open(path) as im:
            details = camera_details(xmp_text(im))
        rows.append({"file": file, "title": "", "location": "", **details, "id": "", "slug": ""})
        added += 1
    write_rows(csv_path, rows)
    print(f"{added} new rows in {csv_path}; fill in titles (and locations where known), then run publish")


def cmd_publish(csv_path: Path, out: Path | None, profile: str | None) -> None:
    rows = read_rows(csv_path)
    pending = [r for r in rows if r["title"] and not r["id"]]
    skipped = sum(1 for r in rows if not r["id"] and not r["title"])
    if not pending:
        print(f"nothing to publish ({skipped} rows still need a title)")
        return

    sanity = s3 = None
    taken: set[str] = set()
    start = 0
    if out is None:
        token = os.environ.get("SANITY_WRITE_TOKEN")
        if not token:
            raise SystemExit("SANITY_WRITE_TOKEN is not set (use --out for a local preview)")
        sanity = Sanity(os.environ.get("SANITY_PROJECT_ID", "4qw0kd9q"), os.environ.get("SANITY_DATASET", "production"), token)
        taken = sanity.slugs()
        # New photos go after the current last one; reorder them in Studio afterwards
        start = int(sanity.max_sort_order())
        import boto3

        s3 = boto3.Session(profile_name=profile, region_name=REGION).client("s3")
    taken |= {r["slug"] for r in rows if r["slug"]}

    manifest = []
    for n, row in enumerate(pending, start=start + 1):
        path = Path(row["file"])
        print(f"{path.name}: rendering")
        rendered, _ = render(path)
        image_id = secrets.token_hex(16)
        slug = slugify(row["title"], taken)

        for name, (data, content_type) in rendered.files.items():
            key = f"img/{image_id}/{name}"
            if out is not None:
                (out / key).parent.mkdir(parents=True, exist_ok=True)
                (out / key).write_bytes(data)
            else:
                s3.put_object(Bucket=BUCKET, Key=key, Body=data, ContentType=content_type, CacheControl=IMMUTABLE)

        doc = {
            "_id": f"photo-{image_id}",
            "_type": "photo",
            "title": row["title"],
            "slug": {"_type": "slug", "current": slug},
            "sortOrder": n,
            "display": True,
            "location": row["location"] or None,
            "author": AUTHOR,
            "camera": row["camera"] or None,
            "lens": row["lens"] or None,
            "exposure": row["exposure"] or None,
            "imageId": image_id,
            "width": rendered.width,
            "height": rendered.height,
            "edges": rendered.edges,
            "color": rendered.color,
        }
        doc = {k: v for k, v in doc.items() if v is not None}
        if sanity is not None:
            sanity.create(doc)
        else:
            # The fields and order PHOTOS_QUERY returns (src/queries.ts)
            manifest.append(
                {
                    "_id": doc["_id"],
                    "title": doc["title"],
                    "slug": slug,
                    "sortOrder": n,
                    "location": doc.get("location"),
                    "author": AUTHOR,
                    **{k: doc.get(k) for k in ("camera", "lens", "exposure")},
                    **{k: doc[k] for k in ("imageId", "width", "height", "edges", "color")},
                }
            )

        row["id"], row["slug"] = image_id, slug
        if out is None:
            # Written after each photo so an interrupted run resumes where it stopped
            write_rows(csv_path, rows)
        kb = sum(len(d) for d, _ in rendered.files.values()) // 1024
        print(f"  {slug} -> img/{image_id}/ ({len(rendered.files)} files, {kb} KB)")

    if out is not None:
        site_json = ROOT / "src" / "generated" / "photos.json"
        site_json.parent.mkdir(parents=True, exist_ok=True)
        site_json.write_text(json.dumps(manifest), encoding="utf-8")
        print(f"preview: files in {out / 'img'}, data in {site_json}; the CSV is unchanged")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    t = sub.add_parser("template", help="append a CSV row per new export in a folder")
    t.add_argument("folder", type=Path)
    t.add_argument("csv", type=Path)
    p = sub.add_parser("publish", help="render, upload and record the rows that are ready")
    p.add_argument("csv", type=Path)
    p.add_argument("--out", type=Path, help="local preview: write files under OUT/img instead of uploading (use: public)")
    p.add_argument("--profile", default=os.environ.get("AWS_PROFILE", "whoami"), help="AWS profile (default: whoami)")
    args = parser.parse_args()

    if args.command == "template":
        cmd_template(args.folder, args.csv)
    else:
        cmd_publish(args.csv, args.out, args.profile)


if __name__ == "__main__":
    main()
