import os, glob, re

os.chdir('d:/CivicSolve/backend/adminpanel')
files = glob.glob('*_urls.py') + ['urls.py']

prefixes = ['problems/', 'assignments/', 'categories/', 'solutions/', 'complaints/', 'users/', 'analytics/', 'profile/']

for filename in files:
    with open(filename, 'r') as f:
        content = f.read()
    
    for prefix in prefixes:
        content = content.replace(f'"{prefix}"', '""')
        content = content.replace(f'"{prefix}', '"')
    
    with open(filename, 'w') as f:
        f.write(content)

print('Redundant URL prefixes removed.')
