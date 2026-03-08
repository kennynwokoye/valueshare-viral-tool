import zipfile, re

zip_path = r'C:\Users\HP\valueshare\valueshare\.netlify\functions\___netlify-server-handler.zip'
z = zipfile.ZipFile(zip_path, 'r')

handler = z.read('___netlify-server-handler.mjs').decode('utf-8')

# Find all backslashes
for i, char in enumerate(handler):
    if char == '\\':
        context = handler[max(0,i-60):i+60]
        print(f'Backslash at {i}:')
        print(f'  Context: {repr(context)}')
        print()

# Also check what's around the dynamic import
idx = handler.find('await import')
if idx >= 0:
    print('Dynamic import context:')
    print(repr(handler[max(0,idx-10):idx+100]))
