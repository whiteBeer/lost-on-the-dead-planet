#!/usr/bin/env python3
"""Рюкзак на телефоне: e2e_inventory.py <адрес>. Тап по предмету, перекладывание, кнопка действия на экране, прокрутка пальцем."""
import time
from playwright.sync_api import sync_playwright
import sys
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:7790/"
def inview(pg,sel):
    return pg.evaluate("""(s)=>{const e=document.querySelector(s);if(!e)return 'none';const r=e.getBoundingClientRect();return (r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth)?'ok':'out '+JSON.stringify([r.top,r.bottom,innerHeight])}""",sel)
with sync_playwright() as p:
    for label,(w,h) in {"portrait":(390,664),"landscape":(780,360)}.items():
        b=p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        c=b.new_context(viewport={"width":w,"height":h},device_scale_factor=2,is_mobile=True,has_touch=True,user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1")
        pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(URL); pg.wait_for_selector("#nick"); pg.fill("#nick","Inv"+label[0]); pg.tap("button[type=submit]")
        pg.wait_for_function("document.body.innerText.includes('Перезарядка')",timeout=30000); time.sleep(1.5)
        pg.get_by_role("button",name="Рюкзак").tap(); time.sleep(0.6)
        pg.screenshot(path=f"/tmp/zb_inv_{label}_inv.png")
        slots=pg.locator("[class*=Inventory_slot__]")
        print(label,"slots",slots.count(),"first slot",inview(pg,"[class*=Inventory_slot__]"),"close",inview(pg,"[class*=Inventory_close]"))
        # вода в 3-й ячейке: тап -> «Выпить»
        slots.nth(2).tap(); time.sleep(0.4)
        print(" details/action", inview(pg,"[class*=Inventory_primary]"), pg.inner_text("[class*=Inventory_details]")[:60].replace("\n"," "))
        pg.screenshot(path=f"/tmp/zb_inv_{label}_sel.png")
        # переложить бинт в ячейку 8
        slots.nth(0).tap(); time.sleep(0.2); slots.nth(7).tap(); time.sleep(0.6)
        has=pg.evaluate("()=>[...document.querySelectorAll('[class*=Inventory_slot__]')].map(e=>!!e.querySelector('img'))")
        print(" move ok", has[7] and not has[0])
        pg.locator("[class*=Inventory_primary]").tap() if pg.locator("[class*=Inventory_primary]").count() else None
        # прокрутка крафта касанием
        right=pg.locator("[class*=Inventory_right]").bounding_box() if label=="landscape" else pg.locator("section[class*=Inventory_panel]").bounding_box()
        x=right["x"]+right["width"]/2; y=right["y"]+right["height"]*0.8
        cdp=c.new_cdp_session(pg)
        before=pg.evaluate("()=>[document.querySelector('[class*=Inventory_right]').scrollTop,document.querySelector('section[class*=Inventory_panel]').scrollTop]")
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y}]})
        for i in range(1,13):
            cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x,"y":y-i*15}]}); time.sleep(0.016)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); time.sleep(0.6)
        after=pg.evaluate("()=>[document.querySelector('[class*=Inventory_right]').scrollTop,document.querySelector('section[class*=Inventory_panel]').scrollTop]")
        print(" scroll",before,"->",after)
        pg.screenshot(path=f"/tmp/zb_inv_{label}_scroll.png")
        print(" errors",errs[:2]); b.close()
