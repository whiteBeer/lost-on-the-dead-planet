#!/usr/bin/env python3
"""Делает текстуру бесшовной: сдвигает на полразмера и смешивает края. make_tile.py вход.png выход.png [размер]"""
import sys

import numpy as np
from PIL import Image

src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 512
image = Image.open(src).convert("RGB")
side = min(image.size)
image = image.crop((0, 0, side, side)).resize((size, size), Image.LANCZOS)
a = np.asarray(image).astype(np.float32)
b = np.roll(a, (size // 2, size // 2), axis=(0, 1))
# Вес: у края тайла берём сдвинутую копию (она там непрерывна), в центре — оригинал
ramp = np.minimum(np.arange(size), size - 1 - np.arange(size)) / (size * 0.18)
ramp = np.clip(ramp, 0, 1)
weight = (ramp[:, None] * ramp[None, :])[..., None]
Image.fromarray((a * weight + b * (1 - weight)).astype(np.uint8)).save(dst, optimize=True)
