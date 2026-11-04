#!/usr/bin/env python3
"""Сквозная проверка клиента на локальной площадке (backend/tests/playground.js) в отдельном Chromium."""
import re
import sys
import time

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:10790/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/zb/e2e"
results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(("ok  " if ok else "FAIL"), name, detail, flush=True)


def fps(page, seconds=3):
    return page.evaluate("""(s) => new Promise(res => { let n=0; const t0=performance.now();
        const f=()=>{ n++; if(performance.now()-t0 < s*1000) requestAnimationFrame(f); else res(n/s); };
        requestAnimationFrame(f); })""", seconds)


def enter(context, name):
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.fill("#nick", name)
    page.click("button[type=submit]")
    page.wait_for_selector("canvas", timeout=20000)
    page.wait_for_function("document.body.innerText.includes('Рейтинг')", timeout=20000)
    return page, errors


def hud(page):
    return page.evaluate("document.body.innerText")


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    a_ctx = browser.new_context(viewport={"width": 1600, "height": 900})
    b_ctx = browser.new_context(viewport={"width": 1600, "height": 900})
    a, a_errors = enter(a_ctx, "Алиса")
    b, b_errors = enter(b_ctx, "Борис")
    time.sleep(2)

    text = hud(a)
    check("оба игрока в рейтинге", "Алиса" in text and "Борис" in text)
    check("рейтинг показывает текущее оружие", a.locator("section img").count() >= 3)
    check("предложено 3 перка", "Выбери перк" in text)
    a.screenshot(path=f"{OUT}_1_start.png")

    print("FPS, программная графика, игра:", round(fps(a), 1), flush=True)

    # Перк клавишей и список перков с названиями
    a.keyboard.press("Digit1")
    a.keyboard.press("Digit2")
    time.sleep(0.4)
    a.keyboard.press("KeyP")
    time.sleep(0.4)
    text = hud(a)
    check("список перков показывает названия, а не id", "Мои перки: 2" in text and not re.search(r"\b(deal|pure)_", text), text[text.find("Мои перки"):][:160].replace("\n", " | "))
    a.keyboard.press("KeyP")

    # Подбор оружия: идём к кольцу оружия вокруг точки появления
    found = False
    for key, hold in [("KeyS", 0.9), ("KeyD", 0.5), ("KeyW", 0.9), ("KeyD", 0.5), ("KeyS", 0.9), ("KeyA", 2.0)]:
        a.keyboard.down(key)
        end = time.time() + hold
        while time.time() < end and "взять" not in hud(a):
            time.sleep(0.05)
        a.keyboard.up(key)
        if "взять" in hud(a):
            found = True
            break
    check("при подходе к оружию появляется подсказка", found)
    a.keyboard.press("KeyE")
    time.sleep(0.5)
    panel = a.locator("section").first.inner_text()
    check("оружие подобрано и сменилось в панели рейтинга", found and "Пистолет\n" not in panel.split("Опыт")[-1][-60:], panel[-40:].replace("\n", " | "))
    a.screenshot(path=f"{OUT}_2_weapon.png")

    # Команда: Алиса зовёт Бориса через панель, Борис принимает клавишей Y
    a.keyboard.press("KeyT")
    time.sleep(0.3)
    a.get_by_role("button", name="Позвать").first.click()
    time.sleep(0.5)
    check("второй игрок получил приглашение", "зовёт тебя в команду" in hud(b))
    b.screenshot(path=f"{OUT}_3_invite.png")
    b.keyboard.press("KeyY")
    time.sleep(1.5)
    check("команда создана у обоих", "Отряд" in hud(a))
    a.screenshot(path=f"{OUT}_4_team.png")
    a.keyboard.press("KeyT")

    # Стрельба по монстрам: опыт растёт
    before = int(re.search(r"Опыт (\d+)", hud(a)).group(1))
    a.mouse.move(800, 300)
    a.mouse.down()
    a.keyboard.press("Digit1")
    for x, y in [(800, 200), (1100, 450), (800, 700), (500, 450)] * 4:
        a.mouse.move(x, y)
        time.sleep(0.5)
    a.mouse.up()
    text = hud(a)
    match = re.search(r"Опыт (\d+)", text)
    after = int(match.group(1)) if match else -1
    a.screenshot(path=f"{OUT}_5_fight.png")
    check("стрельба даёт опыт или игрок погиб в бою", after > before or "Ты погиб" in text, f"{before} -> {after}")

    # Смерть и возвращение
    deadline = time.time() + 90
    while "Ты погиб" not in hud(b) and time.time() < deadline:
        time.sleep(0.5)
    b_dead = "Ты погиб" in hud(b)
    check("игрок без защиты погибает от монстров", b_dead)
    if b_dead:
        b.screenshot(path=f"{OUT}_6_dead.png")
        time.sleep(3)
        b.keyboard.press("Enter")
        time.sleep(1)
        text = hud(b)
        check("после возвращения уровень и оружие сброшены", "Ты погиб" not in text and "Пистолет" in text)

    check("в браузере нет ошибок JS", not a_errors and not b_errors, str((a_errors + b_errors)[:2]))
    browser.close()

print("ИТОГ:", "все проверки прошли" if all(results) else f"провалено {results.count(False)}")
sys.exit(0 if all(results) else 1)
