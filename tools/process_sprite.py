#!/usr/bin/env python3
"""モンスター画像をゲーム用の透過64x64 PNGに整形する。
使い方:
  python3 tools/process_sprite.py <入力画像> <出力先.png> [--size 64] [--content 58] [--tol 42]
処理: 四隅の背景色を flood fill で透過（目などの内側の白は保持）→ 余白トリミング
      → 縦横比を保って content×content に収め、target×target の中央下に配置。
"""
import argparse
from PIL import Image

def process(src, dst, target=64, content=58, tol=42):
    img = Image.open(src).convert('RGBA')
    w, h = img.size
    px = img.load()
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
    br = sum(c[0] for c in corners)//4
    bgc = sum(c[1] for c in corners)//4
    bb = sum(c[2] for c in corners)//4
    def isbg(c):
        return abs(c[0]-br)<=tol and abs(c[1]-bgc)<=tol and abs(c[2]-bb)<=tol
    visited = bytearray(w*h)
    stack = [(x,0) for x in range(w)] + [(x,h-1) for x in range(w)] \
          + [(0,y) for y in range(h)] + [(w-1,y) for y in range(h)]
    while stack:
        x,y = stack.pop()
        if x<0 or y<0 or x>=w or y>=h: continue
        i = y*w+x
        if visited[i]: continue
        visited[i] = 1
        c = px[x,y]
        if not isbg(c): continue
        px[x,y] = (c[0],c[1],c[2],0)
        stack += [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]
    bbox = img.getchannel('A').getbbox()
    if bbox: img = img.crop(bbox)
    cw, ch = img.size
    scale = min(content/cw, content/ch)
    nw, nh = max(1,round(cw*scale)), max(1,round(ch*scale))
    img = img.resize((nw,nh), Image.LANCZOS)
    canvas = Image.new('RGBA',(target,target),(0,0,0,0))
    canvas.paste(img, ((target-nw)//2, max(0,target-nh-2)), img)
    canvas.save(dst)
    print('saved', dst, 'placed', (nw,nh))

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--size', type=int, default=64)
    ap.add_argument('--content', type=int, default=58)
    ap.add_argument('--tol', type=int, default=42)
    a = ap.parse_args()
    process(a.src, a.dst, a.size, a.content, a.tol)
