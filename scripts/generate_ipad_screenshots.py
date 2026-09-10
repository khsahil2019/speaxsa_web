#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw

def create_ipad_screenshot(filename, title, subtitle, bg_color1, bg_color2, feature_badge):
    width, height = 2048, 2732
    img = Image.new("RGBA", (width, height), bg_color1)
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        r = int(bg_color1[0] * (1 - ratio) + bg_color2[0] * ratio)
        g = int(bg_color1[1] * (1 - ratio) + bg_color2[1] * ratio)
        b = int(bg_color1[2] * (1 - ratio) + bg_color2[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    card_margin = 120
    card_top = 180
    card_bottom = 750
    draw.rounded_rectangle(
        [(card_margin, card_top), (width - card_margin, card_bottom)],
        radius=40,
        fill=(255, 255, 255, 30),
        outline=(255, 255, 255, 80),
        width=3
    )

    badge_w, badge_h = 500, 70
    badge_x = (width - badge_w) // 2
    badge_y = card_top + 60
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=35,
        fill=(13, 122, 109, 230)
    )
    draw.text((width // 2, badge_y + 35), feature_badge, fill=(255, 255, 255, 255), anchor="mm")

    draw.text((width // 2, card_top + 250), title, fill=(255, 255, 255, 255), anchor="mm")
    draw.text((width // 2, card_top + 400), subtitle, fill=(220, 240, 235, 240), anchor="mm")

    mockup_top = 850
    mockup_bottom = height - 120
    draw.rounded_rectangle(
        [(card_margin, mockup_top), (width - card_margin, mockup_bottom)],
        radius=50,
        fill=(255, 255, 255, 245),
        outline=(255, 255, 255, 255),
        width=4
    )

    bar_h = 160
    draw.rounded_rectangle(
        [(card_margin + 4, mockup_top + 4), (width - card_margin - 4, mockup_top + bar_h)],
        radius=46,
        fill=(13, 122, 109, 255)
    )
    draw.text((card_margin + 100, mockup_top + 80), "Speaxa Teacher Dashboard", fill=(255, 255, 255, 255), anchor="lm")

    stats = [
        ("Active Batches", "12"),
        ("Total Students", "148"),
        ("Wallet Balance", "Rs 24,500")
    ]
    card_w = (width - 2 * card_margin - 120) // 3
    for i, (label, val) in enumerate(stats):
        cx = card_margin + 40 + i * (card_w + 20)
        cy = mockup_top + bar_h + 60
        draw.rounded_rectangle(
            [(cx, cy), (cx + card_w, cy + 240)],
            radius=25,
            fill=(240, 248, 245, 255),
            outline=(13, 122, 109, 60),
            width=2
        )
        draw.text((cx + card_w // 2, cy + 80), label, fill=(80, 100, 95, 255), anchor="mm")
        draw.text((cx + card_w // 2, cy + 160), val, fill=(13, 122, 109, 255), anchor="mm")

    list_top = mockup_top + bar_h + 360
    for j in range(4):
        ly = list_top + j * 240
        draw.rounded_rectangle(
            [(card_margin + 40, ly), (width - card_margin - 40, ly + 200)],
            radius=25,
            fill=(248, 250, 250, 255),
            outline=(220, 230, 228, 255),
            width=2
        )
        draw.rounded_rectangle(
            [(card_margin + 70, ly + 40), (card_margin + 190, ly + 160)],
            radius=20,
            fill=(13, 122, 109, 200)
        )
        draw.text((card_margin + 230, ly + 80), f"Live Class Batch #{j + 1} - English Fluency", fill=(20, 40, 35, 255), anchor="lm")
        draw.text((card_margin + 230, ly + 130), "Scheduled • 24 Students enrolled", fill=(100, 120, 115, 255), anchor="lm")

    out_dir = "/Users/sahilkhan/FlutterDev/speaxsa_web/ipad_screenshots"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename)
    img.convert("RGB").save(out_path, "PNG")
    print(f"Saved iPad screenshot: {out_path}")

if __name__ == "__main__":
    create_ipad_screenshot("ipad_13_inch_screenshot_1.png", "Live Online Teaching", "Connect with students across live interactive batches", (10, 40, 36), (13, 122, 109), "SPEAXA TEACHER")
    create_ipad_screenshot("ipad_13_inch_screenshot_2.png", "Manage Batches & Attendance", "Keep track of classes, student progress and assignments", (15, 60, 55), (20, 140, 125), "STUDENT MANAGEMENT")
    create_ipad_screenshot("ipad_13_inch_screenshot_3.png", "Real-Time Earnings & Wallet", "Transparent payout tracking and instant withdrawal insights", (10, 50, 45), (10, 95, 85), "WALLET & PAYOUTS")
