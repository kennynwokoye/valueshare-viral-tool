import zipfile

zip_path = r'C:\Users\HP\valueshare\valueshare\.netlify\functions\___netlify-server-handler.zip'
z = zipfile.ZipFile(zip_path, 'r')
names = set(z.namelist())

# Check key paths referenced in the handler
key_paths = [
    'valueshare/valueshare/.netlify/dist/run/handlers/request-context.cjs',
    'valueshare/valueshare/.netlify/dist/run/handlers/tracer.cjs',
    'valueshare/valueshare/server.js',
    'valueshare/valueshare/.next/server',
]

print('Checking key paths:')
for p in key_paths:
    exists = p in names
    print(f'  {p}: {"OK" if exists else "MISSING"}')

# Read the run-config.json to understand the app root
try:
    rc = z.read('valueshare/valueshare/run-config.json').decode()
    import json
    cfg = json.loads(rc)
    print('\nrun-config.json:', json.dumps(cfg, indent=2)[:500])
except Exception as e:
    print('run-config.json error:', e)

# Check the main server.js
try:
    sjs = z.read('valueshare/valueshare/server.js').decode()
    print('\nserver.js first 300 chars:')
    print(sjs[:300])
except Exception as e:
    print('server.js error:', e)

# Check for any NEXT_PRIVATE_STANDALONE references
try:
    handler = z.read('___netlify-server-handler.mjs').decode()
    print('\nFull handler:')
    print(handler)
except Exception as e:
    print('handler error:', e)
