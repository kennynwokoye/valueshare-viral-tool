"""Patch the backslash import path in the Netlify function ZIP."""
import zipfile, io, os, re

zip_path = r'C:\Users\HP\valueshare\valueshare\.netlify\functions\___netlify-server-handler.zip'
handler_name = '___netlify-server-handler.mjs'

# Read the ZIP
with zipfile.ZipFile(zip_path, 'r') as z:
    names = z.namelist()
    contents = {}
    for name in names:
        contents[name] = z.read(name)

# Fix the handler
original = contents[handler_name].decode('utf-8')
print('Before fix:')
for line in original.splitlines():
    if '\\' in line:
        print(' ', repr(line))

# Apply fix: replace all backslashes in /var/task/... paths
fixed = original
for _ in range(6):
    new = re.sub(r'(/var/task/[^\'"\n]*?)\\([^\'"\n]*?)', lambda m: m.group(1) + '/' + m.group(2), fixed)
    if new == fixed:
        break
    fixed = new

print('\nAfter fix:')
remaining = [line for line in fixed.splitlines() if '\\' in line]
if remaining:
    for line in remaining:
        print(' ', repr(line))
else:
    print('  No backslashes remaining')

if fixed == original:
    print('\nNo changes needed')
else:
    # Rewrite the ZIP with the fixed handler
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            if name == handler_name:
                zout.writestr(name, fixed.encode('utf-8'))
            else:
                zout.writestr(name, contents[name])

    buf.seek(0)
    with open(zip_path, 'wb') as f:
        f.write(buf.read())
    print(f'\nZIP patched: {zip_path}')
    print('Size:', os.path.getsize(zip_path), 'bytes')
