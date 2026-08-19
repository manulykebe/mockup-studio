import os
import json
import re

base_path = r"d:\Github\mockup-studio\signals-investigate\extension"
cjk_re = re.compile(r"[\u4e00-\u9fff]")

results = []

for root, dirs, files in os.walk(base_path):
    for file in files:
        if not file.endswith(('.js', '.html', '.json', '.css', '.md', '.txt')):
            continue
        
        file_path = os.path.join(root, file)
        rel_path = os.path.relpath(file_path, base_path)
        
        # Check if it's minified vendor files under lib
        is_lib_vendor = "lib\\" in rel_path or "lib/" in rel_path
        is_minified = ".min." in file
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception:
            try:
                with open(file_path, "r", encoding="gbk") as f:
                    lines = f.readlines()
            except Exception:
                continue
        
        has_handwritten_chinese_comment = False
        file_hits = []
        
        for idx, line in enumerate(lines):
            if cjk_re.search(line):
                file_hits.append({
                    "line_num": idx + 1,
                    "text": line.strip()
                })
        
        if is_lib_vendor and is_minified:
            # Only keep if they contain handwritten Chinese comments. Let's see if there are CJK characters.
            # Vendor libraries under lib like prettier / codemirror might have some CJK, but if they are minified
            # let's be careful. Let's write them all to a list or check them.
            if len(file_hits) > 0:
                # Let's inspect them
                results.append({
                    "path": rel_path,
                    "hits": file_hits,
                    "is_vendor": True
                })
        else:
            if len(file_hits) > 0:
                results.append({
                    "path": rel_path,
                    "hits": file_hits,
                    "is_vendor": False
                })

with open("scan_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Scanned {len(results)} files with CJK characters.")
