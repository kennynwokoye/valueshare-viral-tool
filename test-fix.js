// Test the fix-windows-paths regex against the actual problematic content
const input = `await import('/var/task/valueshare/valueshare/.netlify/dist\\run\\handlers\\server.js')`

console.log('Input backslashes:', (input.match(/\\/g) || []).length)
console.log('Input:', input)

let out = input
// Apply the exact same replacements from the plugin
// Double backslash replacements
for (let i = 0; i < 3; i++) {
  const before = out
  out = out.replace(/(\/var\/task\/[^'"`\n]*?)\\\\([^'"`\n]*?)/g, (m, p1, p2) => p1 + '/' + p2)
  if (out !== before) console.log(`Double-backslash round ${i+1}:`, out.slice(0, 120))
}
// Single backslash replacements
for (let i = 0; i < 3; i++) {
  const before = out
  out = out.replace(/(\/var\/task\/[^'"`\n]*?)\\([^'"`\n]*?)/g, (m, p1, p2) => p1 + '/' + p2)
  if (out !== before) console.log(`Single-backslash round ${i+1}:`, out.slice(0, 120))
}
console.log('Final:', out)
console.log('Remaining backslashes:', (out.match(/\\/g) || []).length)
