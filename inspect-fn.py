import zipfile, os, sys

zip_path = r'C:\Users\HP\valueshare\valueshare\.netlify\functions\___netlify-server-handler.zip'
z = zipfile.ZipFile(zip_path, 'r')
names = z.namelist()

print('Total files:', len(names))
print('First 20 files:')
for n in names[:20]:
    print(' ', n)
print('...')
print('Total size:', sum(z.getinfo(n).file_size for n in names), 'bytes')

# Check for Windows paths
win_paths = [n for n in names if '\\' in n or n.startswith('C:')]
print('Windows paths in zip:', len(win_paths))
if win_paths:
    for n in win_paths[:10]:
        print('  ', n)

# Check for the main entry point
entry = [n for n in names if 'server-handler' in n.lower()]
print('Entry points:', entry[:5])

# Read the main handler file
main_file = next((n for n in names if n.endswith('___netlify-server-handler.mjs')), None)
if main_file:
    content = z.read(main_file).decode('utf-8', errors='replace')
    print(f'\nMain handler ({main_file}): {len(content)} chars')
    print('First 500 chars:')
    print(content[:500])
    # Check for Windows paths in content
    if 'Users\\HP' in content or 'C:\\\\' in content:
        print('\nWARNING: Windows paths found in handler content!')
        # Find the first occurrence
        idx = content.find('Users\\HP')
        if idx == -1:
            idx = content.find('C:\\\\')
        print('Context:', content[max(0,idx-50):idx+100])
