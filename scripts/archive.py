"""Deterministic, standard ZIP archive using only the Python standard library."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

source, output = map(Path, sys.argv[1:])
names = ["main.js", "manifest.json", "packages/douyin_control.js"]
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for name in names:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (source / name).read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    manifest = json.loads(archive.read("manifest.json"))
    assert manifest["main"] in archive.namelist()
    for package in manifest["subpackages"]:
        assert package["entry"] in archive.namelist()
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix(".sha256").write_text(f"{digest}  {output.name}\n", encoding="utf-8")
