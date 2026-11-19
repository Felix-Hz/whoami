# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=13,<14", "boto3>=1.40,<2"]
# ///
"""uv run scripts/test_photos.py"""

import sys
import tempfile
import unittest
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageCms, TiffImagePlugin

sys.path.insert(0, str(Path(__file__).parent))
import photos  # noqa: E402

NIKON_XMP = """<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description>
<tiff:Make>NIKON CORPORATION</tiff:Make><tiff:Model>NIKON D7100</tiff:Model><tiff:Orientation>1</tiff:Orientation>
<xmp:CreatorTool>LightCraft</xmp:CreatorTool><exif:DateTimeOriginal>2020-01-22T08:21:53.800</exif:DateTimeOriginal>
<exif:ExposureTime>1/1250</exif:ExposureTime><exif:FNumber>13/1</exif:FNumber><exif:FocalLength>35/1</exif:FocalLength>
<exifEX:LensModel>35.0 mm f/1.8</exifEX:LensModel>
<exif:ISOSpeedRatings><rdf:Seq><rdf:li>250</rdf:li></rdf:Seq></exif:ISOSpeedRatings>
<exif:GPSLatitude>41,24.5N</exif:GPSLatitude>
</rdf:Description></rdf:RDF></x:xmpmeta>"""


class CameraDetails(unittest.TestCase):
    def test_nikon(self):
        self.assertEqual(
            photos.camera_details(NIKON_XMP),
            {"camera": "Nikon D7100", "lens": "35.0 mm f/1.8", "exposure": "35 mm · 1/1250 s · f/13 · ISO 250"},
        )

    def test_brand_not_repeated_in_model(self):
        xmp = "<tiff:Make>SONY</tiff:Make><tiff:Model>ILCE-6600</tiff:Model><exif:ExposureTime>1/60</exif:ExposureTime><exif:FNumber>28/10</exif:FNumber><exif:FocalLength>105/10</exif:FocalLength>"
        d = photos.camera_details(xmp)
        self.assertEqual(d["camera"], "Sony ILCE-6600")
        self.assertEqual(d["exposure"], "10.5 mm · 1/60 s · f/2.8")

    def test_long_exposure(self):
        self.assertIn("2.5 s", photos.camera_details("<exif:ExposureTime>5/2</exif:ExposureTime>")["exposure"])

    def test_scanner_is_not_a_camera(self):
        xmp = "<tiff:Make>NORITSU KOKI</tiff:Make><tiff:Model>Noritsu EZ Controller</tiff:Model>"
        self.assertEqual(photos.camera_details(xmp), {"camera": "", "lens": "", "exposure": ""})


class Slugify(unittest.TestCase):
    def test_ascii_and_unique(self):
        taken = {"sunrise-over-taupo"}
        self.assertEqual(photos.slugify("Sunrise over Taupō", taken), "sunrise-over-taupo-2")
        self.assertEqual(photos.slugify("Sunrise over Taupō", taken), "sunrise-over-taupo-3")

    def test_empty_title(self):
        self.assertEqual(photos.slugify("¿?", set()), "photo")


class Render(unittest.TestCase):
    def export(self, size=(3000, 2000), orientation="1") -> Path:
        """A TIFF carrying EXIF, XMP with GPS, and an ICC profile, like an editor export."""
        im = Image.linear_gradient("L").resize(size).convert("RGB")
        exif = Image.Exif()
        exif[0x010F] = "NIKON CORPORATION"
        exif[0x0110] = "NIKON D7100"
        info = TiffImagePlugin.ImageFileDirectory_v2()
        info[700] = NIKON_XMP.replace("<tiff:Orientation>1<", f"<tiff:Orientation>{orientation}<").encode()
        icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
        path = Path(self.tmp.name) / "export.tif"
        im.save(path, "TIFF", exif=exif, icc_profile=icc, tiffinfo=info, compression="tiff_deflate")
        return path

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def test_outputs_carry_no_metadata(self):
        rendered, details = photos.render(self.export())
        self.assertEqual(details["camera"], "Nikon D7100")
        self.assertEqual(rendered.edges, [640, 1024, 1600, 2048])
        self.assertEqual(set(rendered.files), {"640.avif", "1024.avif", "1600.avif", "2048.avif", "1600.jpg"})
        for name, (data, _) in rendered.files.items():
            with Image.open(BytesIO(data)) as im:
                self.assertFalse({"exif", "xmp", "icc_profile"} & set(im.info), name)
                self.assertLessEqual(max(im.size), 2048)
            for needle in (b"NIKON", b"LightCraft", b"GPS", b"Exif", b"ICC_PROFILE"):
                self.assertNotIn(needle, data, name)

    def test_small_source_is_not_upscaled(self):
        rendered, _ = photos.render(self.export(size=(1512, 1002)))
        self.assertEqual(rendered.edges, [640, 1024, 1512])
        self.assertEqual((rendered.width, rendered.height), (1512, 1002))
        self.assertIn("1512.jpg", rendered.files)

    def test_rotated_export_is_refused(self):
        with self.assertRaises(SystemExit):
            photos.render(self.export(orientation="6"))

    def test_leak_is_refused(self):
        exif = Image.Exif()
        exif[0x010F] = "NIKON CORPORATION"
        buf = BytesIO()
        Image.new("RGB", (8, 8)).save(buf, "JPEG", exif=exif)
        with self.assertRaises(SystemExit):
            photos.assert_clean(buf.getvalue(), "JPEG", [])


if __name__ == "__main__":
    unittest.main()
