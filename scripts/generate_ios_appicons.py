#!/usr/bin/env python3
import os
import json
from PIL import Image

def generate_ios_icons():
    source_icon = "/Users/sahilkhan/FlutterDev/speaxsa_web/speaxa_teacher/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
    iconset_dir = "/Users/sahilkhan/FlutterDev/speaxsa_web/speaxa_teacher/ios/Runner/Assets.xcassets/AppIcon.appiconset"
    contents_path = os.path.join(iconset_dir, "Contents.json")

    src = Image.open(source_icon).convert("RGBA")

    with open(contents_path, 'r') as f:
        contents = json.load(f)

    for item in contents['images']:
        filename = item['filename']
        size_str = item['size']
        scale_str = item['scale']

        w_base, h_base = [float(x) for x in size_str.split('x')]
        scale = float(scale_str.replace('x', ''))

        target_w = int(round(w_base * scale))
        target_h = int(round(h_base * scale))

        # Apple requires App Store 1024 icon to be RGB (no alpha) and solid background
        bg_color = (255, 255, 255, 255)
        out_img = Image.new("RGBA", (target_w, target_h), bg_color)

        # Scale logo to fit nicely with small padding (e.g. 85%)
        pad_factor = 0.85
        logo_max_w = int(target_w * pad_factor)
        logo_max_h = int(target_h * pad_factor)

        # Maintain aspect ratio
        aspect = src.width / src.height
        if aspect >= 1:
            new_w = logo_max_w
            new_h = int(new_w / aspect)
        else:
            new_h = logo_max_h
            new_w = int(new_h * aspect)

        scaled_logo = src.resize((new_w, new_h), Image.LANCZOS)

        pos_x = (target_w - new_w) // 2
        pos_y = (target_h - new_h) // 2

        out_img.paste(scaled_logo, (pos_x, pos_y), scaled_logo)

        out_file = os.path.join(iconset_dir, filename)
        if target_w == 1024:
            # 1024 icon MUST be RGB (no alpha)
            out_img.convert("RGB").save(out_file, "PNG")
        else:
            out_img.convert("RGB").save(out_file, "PNG")

        print(f"Generated {filename} ({target_w}x{target_h})")

    print("All iOS AppIcons generated from Android icon successfully!")

if __name__ == "__main__":
    generate_ios_icons()
