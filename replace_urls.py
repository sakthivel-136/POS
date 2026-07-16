import os
import glob

# Search all tsx files in frontend
pattern = 'frontend/src/app/**/*.tsx'
files = glob.glob(pattern, recursive=True)

for filepath in files:
    if not os.path.isfile(filepath): continue
    
    with open(filepath, 'r') as f:
        content = f.read()
        
    original = content
    
    # 1. Replace double-quoted URLs: "http://localhost:8000/path" -> `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/path`
    content = content.replace('"http://localhost:8000/', '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:8000\'}/')
    # Fix the trailing double quotes for simple strings
    # But wait! A string like "http://localhost:8000/products" would become `${process.env...}/products"
    # We need to change the closing double quote to a backtick.
    
    # It's safer to use regex
    import re
    # Replace "http://localhost:8000/..."
    content = re.sub(r'"http://localhost:8000/([^"]*)"', r'`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:8000\'}/\1`', content)
    
    # Replace `http://localhost:8000/...`
    content = re.sub(r'`http://localhost:8000/([^`]*)`', r'`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:8000\'}/\1`', content)

    # Some might not have trailing slashes like "http://localhost:8000/token" -> captured as token
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
