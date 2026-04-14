"""
東北ネヂ製造 spec-pdf 一括クロップスクリプト
図面＋規格表が1ページに入っているPDFから、図面部分のみを抽出して上書きする

使い方:
  1. pip install pymupdf
  2. このスクリプトを touhokunedi-renew/ 直下に置く
  3. python crop_spec_pdf.py
  4. git add / git commit / git push

処理内容:
  - public/data/spec-pdf/ 内の全 .pdf を対象
  - 各ページを y=492pt でクロップ（図面枠下端＋余白）
  - 規格表エリア（y=492〜822）を除去
  - 元ファイルを _original.pdf にバックアップしてから上書き
"""

import fitz  # PyMuPDF
import os
import shutil
from pathlib import Path

# ============================================================
# 設定
# ============================================================
# spec-pdfフォルダのパス（このスクリプトの置き場所から相対指定）
PDF_DIR = Path(__file__).parent / "public" / "data" / "spec-pdf"

# クロップするy座標（図面枠下端 482pt + 余白 10pt）
CROP_Y_BOTTOM = 492

# バックアップを作るか（True推奨）
BACKUP = True

# ============================================================
# 処理
# ============================================================
def crop_pdf(src_path: Path) -> bool:
    """1ファイルを処理。成功したらTrue"""
    doc = fitz.open(str(src_path))
    out = fitz.open()

    skipped_pages = []
    for i in range(doc.page_count):
        page = doc[i]
        w = page.rect.width
        h = page.rect.height

        # 図面エリアが存在するか確認（drawing pathsのy座標で判定）
        paths = page.get_drawings()
        has_drawing_frame = any(
            abs(p['rect'].y1 - 482) < 5  # y=482 ±5pt の罫線があるか
            for p in paths if p.get('rect')
        )

        if not has_drawing_frame:
            # 図面枠がない（規格表のみページ等）→ スキップ（出力に含めない）
            skipped_pages.append(i + 1)
            continue

        crop_h = min(CROP_Y_BOTTOM, h)
        new_page = out.new_page(width=w, height=crop_h)
        clip = fitz.Rect(0, 0, w, crop_h)
        new_page.show_pdf_page(clip, doc, i, clip=clip)

    doc.close()

    if out.page_count == 0:
        print(f"  SKIP (全ページに図面枠なし): {src_path.name}")
        out.close()
        return False

    # バックアップ
    if BACKUP:
        backup_path = src_path.with_suffix("._original.pdf")
        if not backup_path.exists():
            shutil.copy2(src_path, backup_path)

    # 上書き保存
    tmp_path = src_path.with_suffix(".tmp.pdf")
    out_page_count = out.page_count
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
        print("スクリプトを touhokunedi-renew/ 直下に置いて実行してください。")
        return

    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"[ERROR] PDFファイルが見つかりません: {PDF_DIR}")
        return

    print(f"対象: {len(pdf_files)} ファイル ({PDF_DIR})\n")

    ok = 0
    for pdf_path in pdf_files:
        if "_original" in pdf_path.name:
            continue  # バックアップファイルは除外
        if crop_pdf(pdf_path):
            ok += 1

    print(f"\n完了: {ok}/{len(pdf_files)} ファイル処理")
    if BACKUP:
        print("バックアップ: 各PDFと同じフォルダに *._original.pdf として保存済み")
        print("不要になったら: find public/data/spec-pdf -name '*._original.pdf' -delete")


if __name__ == "__main__":
    main()
