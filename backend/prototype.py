from __future__ import annotations

from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from .analysis import SUPPORTED_EXTENSIONS
from .models import Blueprint


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _fit_crop(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return ImageOps.fit(image, size=size, method=Image.Resampling.LANCZOS)


def _draw_dashed_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    dash: int = 8,
    gap: int = 7,
    fill: tuple[int, int, int] = (72, 92, 106),
    width: int = 2,
) -> None:
    x1, y1 = start
    x2, y2 = end
    dx = x2 - x1
    dy = y2 - y1
    dist = (dx * dx + dy * dy) ** 0.5
    if dist <= 1e-6:
        return

    ux = dx / dist
    uy = dy / dist

    pos = 0.0
    while pos < dist:
        seg_start = pos
        seg_end = min(pos + dash, dist)
        sx = x1 + ux * seg_start
        sy = y1 + uy * seg_start
        ex = x1 + ux * seg_end
        ey = y1 + uy * seg_end
        draw.line((sx, sy, ex, ey), fill=fill, width=width)
        pos += dash + gap


def _draw_dimension(
    draw: ImageDraw.ImageDraw,
    p1: tuple[float, float],
    p2: tuple[float, float],
    label: str,
    font: ImageFont.ImageFont,
    text_offset: tuple[int, int] = (6, -18),
) -> None:
    draw.line((*p1, *p2), fill=(26, 82, 100), width=2)
    for px, py in (p1, p2):
        draw.line((px - 6, py - 6, px + 6, py + 6), fill=(26, 82, 100), width=2)

    tx = (p1[0] + p2[0]) * 0.5 + text_offset[0]
    ty = (p1[1] + p2[1]) * 0.5 + text_offset[1]
    draw.text((tx, ty), label, fill=(15, 95, 113), font=font)


def _draw_prototype_views(
    canvas: Image.Image,
    blueprint: Blueprint,
    origin_side: tuple[int, int],
    top_center: tuple[int, int],
    font_small: ImageFont.ImageFont,
    font_med: ImageFont.ImageFont,
) -> None:
    draw = ImageDraw.Draw(canvas)
    d = blueprint.dimensions

    max_width = max(d.head_top_diameter_mm, d.body_max_diameter_mm)
    scale = min(2.2, 340 / max_width, 420 / max(d.overall_height_mm, 1.0))

    side_ox, side_oy = origin_side

    body_h = d.body_height_mm
    overall_h = d.overall_height_mm

    r_bottom = d.body_bottom_diameter_mm * 0.5
    r_max = d.body_max_diameter_mm * 0.5
    r_neck = d.neck_diameter_mm * 0.5
    r_head = d.head_top_diameter_mm * 0.5

    right = [
        (r_bottom, 0.0),
        (r_max, body_h * 0.30),
        (r_max * 0.98, body_h * 0.68),
        (r_neck, body_h),
        (r_neck * 1.18, body_h + (overall_h - body_h) * 0.45),
        (r_head, overall_h),
    ]

    def m(x_mm: float, y_mm: float) -> tuple[float, float]:
        return (side_ox + x_mm * scale, side_oy - y_mm * scale)

    polygon = [m(x, y) for x, y in right]
    polygon += [m(-x, y) for x, y in reversed(right)]

    draw.polygon(polygon, fill=(227, 237, 241), outline=(13, 84, 103), width=4)

    center_top = m(0, overall_h + 6)
    center_bottom = m(0, -10)
    _draw_dashed_line(draw, center_top, center_bottom, dash=10, gap=8, fill=(94, 112, 124), width=2)

    _draw_dimension(
        draw,
        (m(-r_head - 22, 0)[0], m(-r_head - 22, 0)[1]),
        (m(-r_head - 22, overall_h)[0], m(-r_head - 22, overall_h)[1]),
        f"H {overall_h:.1f} mm",
        font=font_small,
        text_offset=(6, -20),
    )

    _draw_dimension(
        draw,
        (m(-r_max, -14)[0], m(-r_max, -14)[1]),
        (m(r_max, -14)[0], m(r_max, -14)[1]),
        f"Body Dia {d.body_max_diameter_mm:.1f} mm",
        font=font_small,
        text_offset=(8, -20),
    )

    _draw_dimension(
        draw,
        (m(-r_head, overall_h + 14)[0], m(-r_head, overall_h + 14)[1]),
        (m(r_head, overall_h + 14)[0], m(r_head, overall_h + 14)[1]),
        f"Head Dia {d.head_top_diameter_mm:.1f} mm",
        font=font_small,
        text_offset=(8, -20),
    )

    top_cx, top_cy = top_center

    def draw_circle(radius_mm: float, color: tuple[int, int, int], width: int = 4) -> None:
        r = radius_mm * scale
        draw.ellipse((top_cx - r, top_cy - r, top_cx + r, top_cy + r), outline=color, width=width)

    draw_circle(r_head, (13, 84, 103), 4)
    draw_circle(r_neck, (51, 100, 116), 3)
    draw_circle(d.insert_outer_diameter_mm * 0.5, (80, 123, 138), 3)
    draw_circle(d.insert_inner_diameter_mm * 0.5, (109, 145, 157), 2)

    draw.text((top_cx - 52, top_cy + r_head * scale + 20), "Top View", fill=(17, 62, 79), font=font_med)
    draw.text((side_ox - 54, side_oy - overall_h * scale - 30), "Side View", fill=(17, 62, 79), font=font_med)


def render_prototype_v1(
    blueprint: Blueprint,
    image_paths: list[Path],
    save_dir: Path,
) -> tuple[bytes, Path]:
    width, height = 1860, 1120

    canvas = Image.new("RGB", (width, height), (238, 243, 245))
    draw = ImageDraw.Draw(canvas)
    font_title = ImageFont.load_default(size=30)
    font_sub = ImageFont.load_default(size=18)
    font_med = ImageFont.load_default(size=17)
    font_body = ImageFont.load_default(size=15)
    font_small = ImageFont.load_default(size=14)

    # Background accents
    draw.rectangle((0, 0, width, 190), fill=(20, 76, 96))
    draw.rectangle((0, 190, width, 200), fill=(216, 227, 232))

    draw.text((38, 34), "Curved-Head Teapot Prototype v1", fill=(245, 250, 252), font=font_title)
    draw.text(
        (38, 78),
        "Auto-generated from source image set + editable blueprint geometry",
        fill=(224, 238, 243),
        font=font_sub,
    )

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    draw.text((38, 118), f"Generated: {timestamp}", fill=(208, 230, 236), font=font_sub)

    # Left column: source image board
    draw.rounded_rectangle((28, 232, 560, 1080), radius=18, fill=(250, 252, 253), outline=(194, 208, 216), width=2)
    draw.text((52, 250), "Reference Images", fill=(28, 67, 82), font=font_med)

    supported = [path for path in image_paths if path.suffix.lower() in SUPPORTED_EXTENSIONS]
    shown = supported[:6]

    thumb_w, thumb_h = 236, 156
    x0, y0 = 52, 284
    col_gap, row_gap = 20, 18

    for idx, path in enumerate(shown):
        row = idx // 2
        col = idx % 2
        x = x0 + col * (thumb_w + col_gap)
        y = y0 + row * (thumb_h + row_gap)
        thumb = _fit_crop(path, (thumb_w, thumb_h))
        canvas.paste(thumb, (x, y))
        draw.rounded_rectangle((x - 1, y - 1, x + thumb_w + 1, y + thumb_h + 1), radius=9, outline=(162, 184, 195), width=2)

    draw.text((52, 1020), f"Images used: {len(supported)}", fill=(60, 92, 106), font=font_small)

    # Right board for prototype views + notes
    draw.rounded_rectangle((590, 232, 1828, 1080), radius=18, fill=(250, 252, 253), outline=(194, 208, 216), width=2)

    _draw_prototype_views(
        canvas,
        blueprint,
        origin_side=(1220, 860),
        top_center=(1490, 610),
        font_small=font_small,
        font_med=font_med,
    )

    # Material summary
    draw.text((622, 268), "Prototype Materials", fill=(26, 73, 90), font=font_med)

    y = 302
    for mat in blueprint.materials[:6]:
        selected = mat.selected or mat.recommended
        pct = int(_clamp(mat.confidence * 100, 0, 100))
        line = f"- {mat.part_name}: {selected}"
        conf_line = f"  confidence: {pct}%"
        draw.text((622, y), line, fill=(47, 78, 92), font=font_body)
        draw.text((622, y + 18), conf_line, fill=(81, 111, 124), font=font_small)
        y += 44

    d = blueprint.dimensions
    draw.text((622, 580), "Target Specs", fill=(26, 73, 90), font=font_med)
    draw.text(
        (622, 614),
        f"- Capacity target: {d.capacity_target_ml:.1f} ml ({d.cups_target:.2f} cups)",
        fill=(47, 78, 92),
        font=font_body,
    )
    draw.text((622, 644), f"- Estimated capacity: {d.estimated_capacity_ml:.1f} ml", fill=(47, 78, 92), font=font_body)
    draw.text((622, 674), f"- Overall height: {d.overall_height_mm:.1f} mm", fill=(47, 78, 92), font=font_body)
    draw.text((622, 704), f"- Wall thickness: {d.wall_thickness_mm:.2f} mm", fill=(47, 78, 92), font=font_body)
    draw.text(
        (622, 734),
        f"- Tolerance baseline: +/- {d.manufacturing_tolerance_mm:.2f} mm",
        fill=(47, 78, 92),
        font=font_body,
    )

    draw.text((622, 790), "Assembly Note", fill=(26, 73, 90), font=font_med)
    draw.text(
        (622, 824),
        "- Body shell and curved head are separate formed stainless parts.",
        fill=(47, 78, 92),
        font=font_body,
    )
    draw.text(
        (622, 854),
        "- Silicone gasket seats at neck interface before final locking.",
        fill=(47, 78, 92),
        font=font_body,
    )
    draw.text(
        (622, 884),
        "- Center insert/filter collar retained at top opening.",
        fill=(47, 78, 92),
        font=font_body,
    )

    if blueprint.analysis_notes:
        draw.text((622, 934), "Analysis Notes", fill=(26, 73, 90), font=font_med)
        ny = 964
        for note in blueprint.analysis_notes[:4]:
            draw.text((622, ny), f"- {note}", fill=(47, 78, 92), font=font_body)
            ny += 30

    save_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = save_dir / f"prototype_v1_{ts}.png"
    canvas.save(output_path, format="PNG")

    latest = save_dir / "prototype_v1_latest.png"
    canvas.save(latest, format="PNG")

    return output_path.read_bytes(), output_path
