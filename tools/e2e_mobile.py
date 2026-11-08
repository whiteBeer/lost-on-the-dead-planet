#!/usr/bin/env python3
"""Проверка телефонного режима: e2e_mobile.py <адрес> <префикс скриншотов>. Касания идут через CDP."""
import json
import re
import sys
import time

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:10790/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/zb/mobile"
results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(("ok  " if ok else "FAIL"), name, detail, flush=True)


def run(p, label, width, height):
    browser = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1")
    page = context.new_page()
    errors, inputs = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))

    def on_ws(ws):
        def sent(payload):
            if isinstance(payload, str) and payload.startswith('42["input"'):
                inputs.append(json.loads(payload[2:])[1])
        ws.on("framesent", sent)
    page.on("websocket", on_ws)

    page.goto(URL)
    page.wait_for_selector("#nick")
    page.screenshot(path=f"{OUT}_{label}_menu.png")
    check(f"{label}: меню с подсказкой для телефона", "Левая половина" in page.inner_text("body"))
    page.fill("#nick", f"Тел{label}")
    page.tap("button[type=submit]")
    page.wait_for_function("document.body.innerText.includes('Перезарядка')", timeout=30000)
    time.sleep(1.5)
    cdp = context.new_cdp_session(page)

    def touch(kind, points):
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": points})

    # Левый стик: бег вправо-вниз, правый стик: прицел и огонь
    start = dict(inputs[-1])
    lx, ly = width * 0.2, height * 0.75
    rx, ry = width * 0.8, height * 0.75
    left = {"x": lx, "y": ly, "id": 1}
    right = {"x": rx, "y": ry, "id": 2}
    touch("touchStart", [left])
    touch("touchStart", [left, right])
    left2 = {"x": lx + 55, "y": ly + 5, "id": 1}
    right2 = {"x": rx - 50, "y": ry - 25, "id": 2}
    touch("touchMove", [left2, right2])
    time.sleep(1.5)
    page.screenshot(path=f"{OUT}_{label}_sticks.png")
    during = dict(inputs[-1])
    moved = during["x"] - start["x"]
    check(f"{label}: левый стик двигает персонажа", moved > 40, f"сдвиг {moved:.0f}")
    check(f"{label}: правый стик стреляет", during["f"] is True)
    expected = __import__("math").atan2(-25, -50)
    check(f"{label}: правый стик задаёт прицел", abs(abs(during["r"]) - abs(expected)) < 0.15, f"угол {during['r']:.2f}")
    touch("touchEnd", [])
    # Программная графика может задержать отправку на секунды: ждём кадр без огня
    deadline = time.time() + 10
    while inputs[-1]["f"] is not False and time.time() < deadline:
        page.wait_for_timeout(100)
    check(f"{label}: огонь прекращается, когда палец убран", inputs[-1]["f"] is False)

    # Карточка перка нажимается пальцем (только на площадке, где уровень дан сразу)
    text = page.inner_text("body")
    if "Выбери перк" in text:
        page.screenshot(path=f"{OUT}_{label}_perks.png")
        box = page.locator("[class*=perkCard]").first
        name = box.locator("span").nth(2).inner_text()
        box.tap()
        time.sleep(0.6)
        page.get_by_role("button", name="Перки", exact=True).tap()
        time.sleep(0.4)
        text = page.inner_text("body")
        check(f"{label}: перк выбирается касанием", "Мои перки: 1" in text and name in text, name)
        page.screenshot(path=f"{OUT}_{label}_panel.png")
        page.get_by_role("button", name="Закрыть").tap()
    # Панели не вылезают за экран
    overflow = page.evaluate("""() => [...document.querySelectorAll('section,button')].filter(e => {
        const r = e.getBoundingClientRect(); return !e.title?.includes('accessibility') && r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.outerHTML.slice(0, 160) + ' IN ' + e.parentElement.className + ' ' + Math.round(e.getBoundingClientRect().left) + '..' + Math.round(e.getBoundingClientRect().right))""")
    check(f"{label}: элементы интерфейса не выходят за экран", not overflow, str(overflow))
    page.screenshot(path=f"{OUT}_{label}_end.png")
    check(f"{label}: нет ошибок JS", not errors, str(errors[:2]))
    browser.close()


with sync_playwright() as p:
    run(p, "land", 844, 390)
    run(p, "port", 390, 844)
print("ИТОГ:", "все проверки прошли" if all(results) else f"провалено {results.count(False)}")
sys.exit(0 if all(results) else 1)
