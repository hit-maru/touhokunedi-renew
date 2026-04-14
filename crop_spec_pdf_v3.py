"""
東北ネヂ製造 spec-pdf 一括クロップスクリプト v3
図面枠（罫線）ぴったりにトリミング。タイトル・規格表をすべて除去。

使い方:
  1. このスクリプトを touhokunedi-renew/ 直下に置く
  2. source venv/bin/activate
  3. python3 crop_spec_pdf_v3.py
  4. git add / git commit / git push
"""

import fitz  # PyMuPDF
import os
import shutil
from pathlib import Path

# ============================================================
# 設定
# ============================================================
PDF_DIR = Path(__file__).parent / "public" / "data" / "spec-pdf"

# 図面枠の座標（全PDF共通）
CLIP_X0 = 20
CLIP_Y0 = 142
CLIP_X1 = 580
CLIP_Y1 = 483   # 下罫線 y=482 + 1px

OUT_W = CLIP_X1 - CLIP_X0  # 560pt
OUT_H = CLIP_Y1 - CLIP_Y0  # 341pt

# バックアップを作るか（既存の _original があればスキップ）
BACKUP = True

# ============================================================
# 処理
# ============================================================
def crop_pdf(src_path: Path) -> bool:
    doc = fitz.open(str(src_path))
    out = fitz.open()

    skipped_pages = []
    for i in range(doc.page_count):
        page = doc[i]
        paths = page.get_drawings()
        has_frame = any(
            abs(p['rect'].y0 - 142) < 8 or abs(p['rect'].y1 - 482) < 8
            for p in paths if p.get('rect')
        )
        if not has_frame:
            skipped_pages.append(i + 1)
            continue

        clip = fitz.Rect(CLIP_X0, CLIP_Y0, CLIP_X1, CLIP_Y1)
        new_page = out.new_page(width=OUT_W, height=OUT_H)
        new_page.show_pdf_page(fitz.Rect(0, 0, OUT_W, OUT_H), doc, i, clip=clip)

    doc.close()

    if out.page_count == 0:
        print(f"  SKIP (図面枠なし): {src_path.name}")
        out.close()
        return False

    if BACKUP:
        backup_path = src_path.with_suffix("._original.pdf")
        if not backup_path.exists():
            shutil.copy2(src_path, backup_path)

    out_page_count = out.page_count
    tmp_path = src_path.with_suffix(".tmp.pdf")
    out.save(str(tmp_path), garbage=4, deflate=True)
    out.close()
    os.replace(tmp_path, src_path)

    if skipped_pages:
        print(f"  OK ({out_page_count}p, p{skipped_pages}をスキップ): {src_path.name}")
    else:
        print(f"  OK ({out_page_count}p): {src_path.name}")
    return True


def main():
    if not PDF_DIR.exists():
        print(f"[ERROR] フォルダが見つかりません: {PDF_DIR}")
        return

    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"[ERROR] PDFファイルが見つかりません: {PDF_DIR}")
        return

    # バックアップファイルと tottal.pdf は対象外
    targets = [f for f in pdf_files
               if "_original" not in f.name and f.name != "tottal.pdf"]

    print(f"対象: {len(targets)} ファイル ({PDF_DIR})\n")

    ok = 0
    for pdf_path in targets:
        if crop_pdf(pdf_path):
            ok += 1

    print(f"\n完了: {ok}/{len(targets)} ファイル処理")
    if BACKUP:
        print("バックアップ: *._original.pdf として保存済み")
        print("不要になったら: find public/data/spec-pdf -name '*._original.pdf' -delete")


if __name__ == "__main__":
    main()
