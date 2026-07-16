import os
import glob
import re

files = glob.glob('frontend/src/app/**/*.tsx', recursive=True)
for filepath in files:
    if not os.path.isfile(filepath): continue
    
    with open(filepath, 'r') as f:
        content = f.read()
        
    original = content
    
    # Fix method: `DELETE", -> method: "DELETE",
    content = re.sub(r'method:\s*`([A-Z]+)",', r'method: "\1",', content)
    
    # Fix option value=`"> -> option value="">
    content = content.replace('value=`">', 'value="">')
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
