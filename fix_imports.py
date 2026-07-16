import os
import glob
import re

for filepath in glob.glob('backend/**/*.py', recursive=True):
    if 'venv' in filepath:
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # from . import schemas -> import schemas
    content = re.sub(r'^from \. import (.*)$', r'import \1', content, flags=re.MULTILINE)
    # from .. import schemas -> import schemas
    content = re.sub(r'^from \.\. import (.*)$', r'import \1', content, flags=re.MULTILINE)
    
    # from .database -> from database
    content = re.sub(r'^from \.([a-zA-Z0-9_]+) import (.*)$', r'from \1 import \2', content, flags=re.MULTILINE)
    # from ..database -> from database
    content = re.sub(r'^from \.\.([a-zA-Z0-9_]+) import (.*)$', r'from \1 import \2', content, flags=re.MULTILINE)

    with open(filepath, 'w') as f:
        f.write(content)

print("Imports fixed!")
