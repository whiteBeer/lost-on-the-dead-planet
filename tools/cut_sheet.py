#!/usr/bin/env python3
"""Вырезает спрайты из листа ChatGPT на пурпурном фоне.

Использование: cut_sheet.py лист.png папка_вывода строк имя1 имя2 ...
Имена перечисляются слева направо, сверху вниз. Спрайты ищутся по связным областям.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def find_regions(solid, step=4, gap_cells=3):
    """Связные области на уменьшенной маске. Детали ближе gap_cells клеток считаются одним спрайтом."""
    h, w = solid.shape
    small_h, small_w = h // step, w // step
    small = solid[:small_h * step, :small_w * step].reshape(small_h, step, small_w, step).any(axis=(1, 3))
    labels = np.zeros((small_h, small_w), dtype=np.int32)
    current = 0
    for sy, sx in zip(*np.nonzero(small)):
        if labels[sy, sx]:
            continue
        current += 1
        stack = [(sy, sx)]
        labels[sy, sx] = current
        while stack:
            y, x = stack.pop()
            y0, y1 = max(0, y - gap_cells), min(small_h, y + gap_cells + 1)
            x0, x1 = max(0, x - gap_cells), min(small_w, x + gap_cells + 1)
            near = np.argwhere(small[y0:y1, x0:x1] & (labels[y0:y1, x0:x1] == 0))
            for dy, dx in near:
                labels[y0 + dy, x0 + dx] = current
                stack.append((y0 + dy, x0 + dx))
    full = np.kron(labels, np.ones((step, step), dtype=np.int32))
    full = np.pad(full, ((0, h - full.shape[0]), (0, w - full.shape[1])), mode="edge")
    return full, current


def main():
    sheet, out, rows, names = sys.argv[1], Path(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
    out.mkdir(parents=True, exist_ok=True)
    rgb = np.asarray(Image.open(sheet).convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    # Насколько пиксель похож на пурпурный: высокие R и B при низком G
    magenta = np.minimum(r, b) - g
    alpha = 1 - np.clip((magenta - 35) / 90, 0, 1)

    # Убираем пурпурную кайму на границах
    spill = (alpha < 1) & (alpha > 0)
    rgb = rgb.copy()
    limit = np.maximum(g, 1)
    rgb[..., 0] = np.where(spill, np.minimum(r, limit + 30), r)
    rgb[..., 2] = np.where(spill, np.minimum(b, limit + 30), b)

    solid = alpha > 0.5
    labels, count = find_regions(solid)
    found = []
    for index in range(1, count + 1):
        ys, xs = np.nonzero((labels == index) & solid)
        if len(ys) > 800:
            found.append(((slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1)), index, len(ys)))
    if len(found) != len(names):
        print(f"ВНИМАНИЕ: найдено {len(found)} областей, ожидалось {len(names)}", file=sys.stderr)

    # Раскладываем по строкам по вертикальному центру
    height = rgb.shape[0]
    grouped = [[] for _ in range(rows)]
    for item in found:
        center = (item[0][0].start + item[0][0].stop) / 2
        grouped[min(rows - 1, int(center / height * rows))].append(item)
    ordered = [item for row in grouped for item in sorted(row, key=lambda el: el[0][1].start)]

    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    for name, (box, label, _) in zip(names, ordered):
        piece = rgba[box].copy()
        piece[..., 3] = np.where(labels[box] == label, piece[..., 3], 0)
        image = Image.fromarray(piece, "RGBA")
        image = image.crop(image.getbbox())
        limit_side = 256
        if max(image.size) > limit_side:
            image.thumbnail((limit_side, limit_side), Image.LANCZOS)
        image.save(out / f"{name}.png", optimize=True)
        print(name, image.size)


if __name__ == "__main__":
    main()
