import os
import glob

directory = 'frontend/src'
old_str = 'http://127.0.0.1:5000'
new_str = 'https://sumukh25-echomood-api.hf.space'

for filepath in glob.iglob(directory + '/**/*.jsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {filepath}")
