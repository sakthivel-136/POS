import os
import glob
import re

files = glob.glob('frontend/src/app/**/*.tsx', recursive=True)
for filepath in files:
    if not os.path.isfile(filepath): continue
    
    with open(filepath, 'r') as f:
        content = f.read()
        
    original = content
    
    # Fix escaped single quotes inside the template literal
    content = content.replace("\\'http://localhost:8000\\'", '"http://localhost:8000"')
    content = content.replace("'http://localhost:8000'", '"http://localhost:8000"')
    
    # Fix trailing double quotes where a backtick should be:
    # `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/somepath"
    # -> `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/somepath`
    content = re.sub(r'(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http://localhost:8000"}[^"]*)"', r'\1`', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
