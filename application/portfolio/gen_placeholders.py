"""Generate gray placeholder PNGs for the portfolio. Vladimir replaces them with real screenshots."""
from PIL import Image, ImageDraw

SPECS = [
    ("talknative-1.png", 1170, 2532, "TalkNative\nscreenshot 1"),
    ("talknative-2.png", 1170, 2532, "TalkNative\nscreenshot 2"),
    ("indonesian-1.png", 1170, 2532, "Indonesian bot\nscreenshot 1"),
    ("indonesian-2.png", 1170, 2532, "Indonesian bot\nscreenshot 2"),
    ("claudebar-1.png", 1600, 1000, "ClaudeBar\nmenu bar screenshot"),
    ("symplast-1.png", 1242, 2208, "Symplast\nApp Store screenshot 1"),
    ("symplast-2.png", 1242, 2208, "Symplast\nApp Store screenshot 2"),
]

for name, w, h, label in SPECS:
    img = Image.new("RGB", (w, h), "#e8e8ed")
    d = ImageDraw.Draw(img)
    d.multiline_text((w / 2, h / 2), label + "\n(replace me)", fill="#6e6e73",
                     anchor="mm", align="center", font_size=int(w / 16))
    img.save(f"images/{name}")
    print(f"images/{name}  {w}x{h}")
