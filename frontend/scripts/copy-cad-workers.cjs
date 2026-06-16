const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const dest = path.join(root, 'public', 'assets')

fs.mkdirSync(dest, { recursive: true })

let copied = 0

function copyIfExists(src) {
  if (fs.existsSync(src)) {
    const name = path.basename(src)
    fs.copyFileSync(src, path.join(dest, name))
    console.log(`  ✓ ${name}`)
    copied++
  } else {
    console.warn(`  ⚠ not found: ${src}`)
  }
}

console.log('Copying CAD worker files → public/assets/')

copyIfExists(
  path.join(root, 'node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js'),
)

const cvDist = path.join(root, 'node_modules/@mlightcad/cad-simple-viewer/dist')
if (fs.existsSync(cvDist)) {
  fs.readdirSync(cvDist)
    .filter(f => f.endsWith('-worker.js') || f.endsWith('-worker.wasm'))
    .forEach(f => copyIfExists(path.join(cvDist, f)))
}

console.log(`Done — ${copied} file(s) copied to public/assets/`)
