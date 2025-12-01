#!/usr/bin/env python3
"""
Script to convert relative imports to absolute imports in the src directory.
This allows pytest to properly import modules for testing.
"""

import os
import re
from pathlib import Path

def fix_imports_in_file(filepath):
    """Convert relative imports to absolute imports in a single file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match: from ..module import something
    # or: from ..package.module import something
    pattern = r'from \.\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)'
    replacement = r'from \1'
    
    content = re.sub(pattern, replacement, content)
    
    # Only write if changed
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    """Fix all Python files in src directory"""
    src_dir = Path('src')
    fixed_count = 0
    
    for py_file in src_dir.rglob('*.py'):
        if fix_imports_in_file(py_file):
            print(f"Fixed: {py_file}")
            fixed_count += 1
    
    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == '__main__':
    main()
