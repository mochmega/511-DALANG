import os
import re

replacements = [
    (r'shadow-\[0_0_15px_rgba\(245,158,11,0\.1\)\]', 'shadow-lg shadow-amber-500/10'),
    (r'shadow-\[0_4px_15px_rgba\(16,185,129,0\.3\)\]', 'shadow-lg shadow-emerald-500/30'),
    (r'hover:shadow-\[0_6px_20px_rgba\(16,185,129,0\.4\)\]', 'hover:shadow-xl hover:shadow-emerald-500/40'),
    (r'shadow-\[0_4px_15px_rgba\(79,70,229,0\.3\)\]', 'shadow-lg shadow-indigo-500/30'),
    (r'hover:shadow-\[0_6px_20px_rgba\(79,70,229,0\.4\)\]', 'hover:shadow-xl hover:shadow-indigo-500/40'),
    (r'shadow-\[0_4px_20px_rgba\(0,0,0,0\.3\)\]', 'shadow-2xl'),
    (r'shadow-\[0_0_15px_rgba\(244,63,94,0\.1\)\]', 'shadow-lg shadow-rose-500/10'),
    (r'shadow-\[0_0_40px_rgba\(244,63,94,0\.15\)\]', 'shadow-2xl shadow-rose-500/15'),
    (r'shadow-\[0_0_15px_rgba\(16,185,129,0\.1\)\]', 'shadow-lg shadow-emerald-500/10'),
    (r'drop-shadow-\[0_0_8px_rgba\(16,185,129,0\.5\)\]', 'drop-shadow-lg'),
    (r'drop-shadow-\[0_0_8px_rgba\(244,63,94,0\.5\)\]', 'drop-shadow-lg'),
    (r'shadow-\[0_0_40px_rgba\(0,0,0,0\.5\)\]', 'shadow-2xl'),
    (r'drop-shadow-\[0_0_12px_rgba\(14,165,233,0\.4\)\]', 'drop-shadow-lg'),
    (r'shadow-\[0_0_15px_rgba\(14,165,233,0\.15\)\]', 'shadow-lg shadow-theme-500/15'),
    (r'drop-shadow-\[0_0_12px_rgba\(14,165,233,0\.6\)\]', 'drop-shadow-xl'),
    (r'shadow-\[0_0_20px_rgba\(14,165,233,0\.2\)\]', 'shadow-xl shadow-theme-500/20'),
    (r'hover:shadow-\[0_0_30px_rgba\(14,165,233,0\.5\)\]', 'hover:shadow-2xl hover:shadow-theme-500/50')
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content)

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
