import os, re
directory = r'f:\APLIKASI GUDANG\frontend\src'
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace single quotes, double quotes, and backticks containing the URL
            new_content = re.sub(r'[\'\"\`]http://localhost:5000/api([^\'\"\`]*)[\'\"\`]', r'`${import.meta.env.VITE_API_URL}/api\1`', content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Updated {file}')
