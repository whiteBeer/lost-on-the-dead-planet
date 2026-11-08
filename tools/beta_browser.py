#!/usr/bin/env python3
"""Бета-тестер в настоящем браузере: играет через интерфейс (клавиатура/мышь или касания), ищет ошибки.
beta_browser.py <адрес с ?bot> <desktop|mobile> <минут> <папка отчёта>"""
import json
import math
import random
import sys
import time

from playwright.sync_api import sync_playwright

URL, MODE, MINUTES, OUT = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
MOBILE = MODE == "mobile"
report = {"mode": MODE, "levels": {}, "deaths": 0, "errors": [], "overflow": [], "events": [], "actions": {}}


def note(kind):
    report["actions"][kind] = report["actions"].get(kind, 0) + 1


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    if MOBILE:
        ctx = browser.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1")
    else:
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: report["errors"].append(str(e)[:200]))
    page.on("console", lambda m: report["errors"].append("console: " + m.text[:200]) if m.type == "error" else None)
    page.goto(URL)
    page.fill("#nick", "Бета-тел" if MOBILE else "Бета-ПК")
    (page.tap if MOBILE else page.click)("button[type=submit]")
    page.wait_for_function("document.body.innerText.includes('Опыт') && window.__lpt", timeout=40000)
    time.sleep(1)
    cdp = ctx.new_cdp_session(page) if MOBILE else None
    W, H = (844, 390) if MOBILE else (1600, 900)
    keys = set()
    sticks = {}

    def touches():
        return [{"x": v[0], "y": v[1], "id": k} for k, v in sticks.items()]

    def stick(sid, ox, oy, dx, dy):
        """sid 1 — бег (левая половина), 2 — прицел (правая). dx,dy — направление или None, чтобы отпустить."""
        if dx is None:
            if sid in sticks:
                del sticks[sid]
                cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd" if not sticks else "touchMove", "touchPoints": touches()})
            return
        new = sid not in sticks
        sticks[sid] = (ox + dx * 50, oy + dy * 50)
        if new:
            sticks[sid] = (ox, oy)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": touches()})
            sticks[sid] = (ox + dx * 50, oy + dy * 50)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": touches()})

    def hold(dirs):
        for k in ["KeyW", "KeyA", "KeyS", "KeyD"]:
            if k in dirs and k not in keys:
                page.keyboard.down(k)
                keys.add(k)
            elif k not in dirs and k in keys:
                page.keyboard.up(k)
                keys.discard(k)

    def walk(angle):
        if angle is None:
            if MOBILE:
                stick(1, W * 0.2, H * 0.7, None, None)
            else:
                hold(set())
            return
        if MOBILE:
            stick(1, W * 0.2, H * 0.7, math.cos(angle), math.sin(angle))
        else:
            dirs = set()
            if math.cos(angle) > 0.38: dirs.add("KeyD")
            if math.cos(angle) < -0.38: dirs.add("KeyA")
            if math.sin(angle) > 0.38: dirs.add("KeyS")
            if math.sin(angle) < -0.38: dirs.add("KeyW")
            hold(dirs)

    def click_text(selector, text=None):
        loc = page.locator(selector, has_text=text) if text else page.locator(selector)
        if loc.count():
            try:
                (loc.first.tap if MOBILE else loc.first.click)(timeout=1500)
                return True
            except Exception:
                return False
        return False

    start = time.time()
    explore = random.random() * math.pi * 2
    explore_at = 0
    shooting = False
    last_inv = start
    last_check = start
    max_level = 1
    was_dead = False
    while time.time() - start < MINUTES * 60:
        try:
            st = page.evaluate("window.__lpt.botState()")
        except Exception as exc:
            report["errors"].append("state: " + str(exc)[:120])
            time.sleep(1)
            continue
        me = st["me"]
        now = time.time()
        if me["level"] > max_level:
            for l in range(max_level + 1, me["level"] + 1):
                report["levels"][l] = round((now - start) / 60, 1)
            max_level = me["level"]
        if me["dead"]:
            if not was_dead:
                report["deaths"] += 1
                report["events"].append(f"{round((now - start) / 60, 1)} мин: смерть на уровне {max_level}")
                page.screenshot(path=f"{OUT}/{MODE}_death{report['deaths']}.png")
            was_dead = True
            walk(None)
            if me["canRespawn"]:
                if MOBILE:
                    click_text("button", "Вернуться")
                else:
                    page.keyboard.press("Enter")
                note("respawn")
            time.sleep(0.5)
            continue
        if was_dead:
            max_level = 1
        was_dead = False
        # Перк
        if me["offer"]:
            if MOBILE:
                click_text("[class*=perkCard]")
            else:
                page.keyboard.press(f"Control+Digit{random.randint(1, 3)}")
            note("perk")
        # Нужды через быструю панель
        if me["hp"] < me["maxHp"] * 0.45:
            if MOBILE: click_text("button", "Лечиться")
            else: page.keyboard.press("KeyH")
            note("heal")
        if me["food"] < 40:
            if MOBILE: click_text("[class*=quick] button[title*='Съесть']")
            else: page.keyboard.press("KeyF")
            note("eat")
        if me["water"] < 40:
            if MOBILE: click_text("[class*=quick] button[title*='Выпить']")
            else: page.keyboard.press("KeyV")
            note("drink")
        x, y = st["x"], st["y"]
        scale = st["screen"]["scale"]
        foes = [e for e in st["enemies"] if e["type"] not in ("guard", "trader", "merc", "hunter")]
        foe = min(foes, key=lambda e: (e["x"] - x) ** 2 + (e["y"] - y) ** 2, default=None)
        foe_d = math.hypot(foe["x"] - x, foe["y"] - y) if foe else 1e9
        gun = me["gun"] and (me["gunAmmo"] + me["reserve"]) > 0
        if foe and foe_d < (450 if gun else 260):
            if gun and me["weapon"] != me["gun"]:
                if MOBILE: click_text("[class*=swapButton]")
                else: page.keyboard.press("Digit2")
                note("swap")
            angle = math.atan2(foe["y"] - y, foe["x"] - x)
            melee = me["weapon"] == me["tool"]
            if MOBILE:
                stick(2, W * 0.8, H * 0.7, math.cos(angle), math.sin(angle))
            else:
                page.mouse.move(W / 2 + math.cos(angle) * min(foe_d * scale, 300), H / 2 + math.sin(angle) * min(foe_d * scale, 300))
                if not shooting:
                    page.mouse.down()
            shooting = True
            note("fight")
            if melee:
                walk(angle)
            elif foe_d < 170:
                walk(angle + math.pi)
                if random.random() < 0.05:
                    if MOBILE: click_text("[class*=dashButton]")
                    else: page.keyboard.press("Space")
                    note("dash")
            else:
                walk(None)
        else:
            if shooting:
                if MOBILE: stick(2, 0, 0, None, None)
                else: page.mouse.up()
                shooting = False
            near = st["near"]
            if near and near != "trader":
                if MOBILE:
                    click_text("[class*=pickupHint]")
                else:
                    page.keyboard.press("KeyE")
                note("pickup:" + near.split(":")[0])
            # Цель: оружие и полки рядом, иначе деревья, иначе разведка
            goals = [(pk["x"], pk["y"]) for pk in st["pickups"] if pk["kind"] in ("weapon", "bag", "drop") and math.hypot(pk["x"] - x, pk["y"] - y) < 400]
            goals += [(s["x"], s["y"]) for s in st["shelves"]]
            if not goals and me["level"] < 3:
                goals += [(t["x"], t["y"]) for t in st["trees"]]
            if goals:
                gx, gy = min(goals, key=lambda g: (g[0] - x) ** 2 + (g[1] - y) ** 2)
                walk(math.atan2(gy - y, gx - x))
            else:
                if now > explore_at:
                    explore = random.random() * math.pi * 2
                    explore_at = now + 8
                walk(explore)
                if not MOBILE:
                    page.keyboard.down("ShiftLeft") if random.random() < 0.3 else page.keyboard.up("ShiftLeft")
        # Раз в минуту: рюкзак, крафт, проверка интерфейса
        if now - last_inv > 60:
            last_inv = now
            walk(None)
            if MOBILE: click_text("button", "Рюкзак")
            else: page.keyboard.press("KeyI")
            time.sleep(0.4)
            if click_text("button:not([disabled])", "Создать"):
                note("craft")
            page.screenshot(path=f"{OUT}/{MODE}_inv_{int((now - start) / 60)}.png")
            if MOBILE: click_text("button", "Закрыть")
            else: page.keyboard.press("KeyI")
            overflow = page.evaluate("""() => [...document.querySelectorAll('section,button')].filter(e => {
                const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1); })
                .map(e => (e.className || '').toString().slice(0, 40) + ' ' + e.innerText.slice(0, 30))""")
            if overflow:
                report["overflow"].append(overflow[:5])
            page.screenshot(path=f"{OUT}/{MODE}_play_{int((now - start) / 60)}.png")
        time.sleep(0.12)
    report["finalLevel"] = max_level
    report["minutes"] = MINUTES
    json.dump(report, open(f"{OUT}/{MODE}_report.json", "w"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != "events"}, ensure_ascii=False)[:1500])
    browser.close()
