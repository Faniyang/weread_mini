"""Generate a small original book icon using only Python's standard library."""

from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def inside_polygon(x, y, points):
    inside = False
    previous = points[-1]
    for current in points:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y):
            crossing = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < crossing:
                inside = not inside
        previous = current
    return inside


def color_at(x, y):
    dx = abs(x - 0.5)
    dy = abs(y - 0.5)
    radius = 0.16
    if max(dx - (0.45 - radius), 0) ** 2 + max(dy - (0.45 - radius), 0) ** 2 > radius ** 2:
        return (0, 0, 0, 0)
    left = [(0.18, 0.29), (0.47, 0.34), (0.47, 0.75), (0.18, 0.69)]
    right = [(0.53, 0.34), (0.82, 0.29), (0.82, 0.69), (0.53, 0.75)]
    if inside_polygon(x, y, left) or inside_polygon(x, y, right):
        return (240, 247, 243, 255)
    if 0.48 <= x <= 0.52 and 0.35 <= y <= 0.75:
        return (165, 197, 180, 255)
    return (48, 88, 75, 255)


def png_chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)


def make_png(size):
    rows = []
    samples = 3 if size >= 48 else 4
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            rgba = [0, 0, 0, 0]
            for sy in range(samples):
                for sx in range(samples):
                    px = (x + (sx + 0.5) / samples) / size
                    py = (y + (sy + 0.5) / samples) / size
                    color = color_at(px, py)
                    for channel in range(4):
                        rgba[channel] += color[channel]
            row.extend(round(value / (samples * samples)) for value in rgba)
        rows.append(row)
    raw = b"".join(rows)
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header) + png_chunk(b"IDAT", zlib.compress(raw, 9)) + png_chunk(b"IEND", b"")


def main():
    ASSETS.mkdir(exist_ok=True)
    images = [(size, make_png(size)) for size in (16, 32, 48, 256)]
    (ASSETS / "icon.png").write_bytes(images[-1][1])
    offset = 6 + 16 * len(images)
    directory = bytearray(struct.pack("<HHH", 0, 1, len(images)))
    for size, data in images:
        icon_size = 0 if size == 256 else size
        directory.extend(struct.pack("<BBBBHHII", icon_size, icon_size, 0, 0, 1, 32, len(data), offset))
        offset += len(data)
    (ASSETS / "icon.ico").write_bytes(bytes(directory) + b"".join(data for _, data in images))


if __name__ == "__main__":
    main()
