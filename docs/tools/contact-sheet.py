"""QA helper: tile .preview/slide-*.jpg into 2x2 sheets (.preview/sheet-N.jpg)."""
import glob, os, sys
from PIL import Image
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".preview")
files = sorted(glob.glob(os.path.join(here, "slide-*.jpg")))
for old in glob.glob(os.path.join(here, "sheet-*.jpg")): os.remove(old)
for i in range(0, len(files), 4):
    imgs = [Image.open(f) for f in files[i:i+4]]
    w, h = imgs[0].size
    sheet = Image.new("RGB", (w*2+10, h*2+10), "#888888")
    for k, im in enumerate(imgs):
        sheet.paste(im, ((k % 2)*(w+10), (k//2)*(h+10)))
    sheet.save(os.path.join(here, f"sheet-{i//4+1:02d}.jpg"), quality=88)
print(len(files), "slides")
