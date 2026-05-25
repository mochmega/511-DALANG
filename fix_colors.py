import os
import re

# Peta penggantian
# #060b14 -> diganti ke slate-950
# #0f172a -> diganti ke slate-900

replacements = [
    (re.compile(r'bg-\[\#060b14\]/?(\d+)?'), lambda m: f"bg-slate-950/{m.group(1)}" if m.group(1) else "bg-slate-950"),
    (re.compile(r'bg-\[\#0f172a\]/?(\d+)?'), lambda m: f"bg-slate-900/{m.group(1)}" if m.group(1) else "bg-slate-900"),
    (re.compile(r'text-\[\#060b14\]'), lambda m: "text-slate-950"),
    (re.compile(r'text-\[\#0f172a\]'), lambda m: "text-slate-900"),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for pattern, repl in replacements:
        new_content = pattern.sub(repl, new_content)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    src_dir = r"f:\APLIKASI GUDANG\frontend\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.jsx'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
