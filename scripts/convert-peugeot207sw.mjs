import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, getBounds } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'

// No network or MTL-provided filesystem paths are used. Only basenames found
// directly in the supplied maps directory are eligible for resolution.
const defaultSource = String.raw`C:\Users\Admin\Downloads\Compressed\peugeot 207 sw (www.geogta.ir)\peugeot 207 sw (www.geogta.ir)\PUG_SW.obj`
const output = fileURLToPath(new URL('../public/models/peugeot-207-sw.glb', import.meta.url))
const paintParts = new Map([
  ['Peugeot_207_SW_Cor', 'Material__35'], ['Peugeot_207_SW_Porta_Malas_Cor', 'Material__49'],
  ['Peugeot_207_SW_Porta_E_F_Cor', 'Material__43'], ['Peugeot_207_SW_Porta_D_F_Cor', 'Material__37'],
  ['Peugeot_207_SW_Porta_E_T_Cor', 'Material__42'], ['Peugeot_207_SW_Porta_D_T_Cor', 'Material__36'],
])
const windowParts = new Set([
  'Peugeot_207_SW_Porta_Malas_Window', 'Peugeot_207_SW_Porta_E_F_Window',
  'Peugeot_207_SW_Porta_D_F_Window', 'Peugeot_207_SW_Porta_E_T_Window',
  // This HB token is in the supplied SW OBJ; retain the original part name.
  'Peugeot_207_HB_Porta_D_T_Window', 'Peugeot_207_SW_Window', 'Peugeot_207_SW_Window_rear',
])
const lampParts = new Set(['Peugeot_207_SW_Transparentes', 'Peugeot_207_SW_Porta_Malas_Transparentes'])
const localName = path => path.replaceAll('\\', '/').split('/').at(-1)

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const name = Buffer.from(type)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length)
  name.copy(result, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8)
  return result
}
function encodePNG(width, height, rgba) {
  assert.equal(rgba.length, width * height * 4)
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6 // RGBA, no interlace; DDS row order is retained.
  const rows = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) rows.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))])
}
function decodeBlocks(data, width, height, fourCC) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  const stride = fourCC === 'DXT1' ? 8 : 16
  assert.equal(bytes.length, Math.ceil(width / 4) * Math.ceil(height / 4) * stride, 'Truncated DDS mip')
  const rgba = new Uint8Array(width * height * 4)
  const rgb565 = n => [Math.round(((n >>> 11) & 31) * 255 / 31), Math.round(((n >>> 5) & 63) * 255 / 63), Math.round((n & 31) * 255 / 31)]
  let offset = 0
  for (let by = 0; by < height; by += 4) for (let bx = 0; bx < width; bx += 4) {
    const colorOffset = offset + (fourCC === 'DXT1' ? 0 : 8)
    const c0 = bytes.readUInt16LE(colorOffset), c1 = bytes.readUInt16LE(colorOffset + 2)
    const a = rgb565(c0), b = rgb565(c1)
    const colors = [[...a, 255], [...b, 255]]
    if (c0 > c1 || fourCC !== 'DXT1') {
      colors.push(a.map((v, i) => Math.round((2 * v + b[i]) / 3)).concat(255))
      colors.push(a.map((v, i) => Math.round((v + 2 * b[i]) / 3)).concat(255))
    } else {
      colors.push(a.map((v, i) => Math.round((v + b[i]) / 2)).concat(255), [0, 0, 0, 0])
    }
    const indices = bytes.readUInt32LE(colorOffset + 4)
    let alphaTable, alphaIndices
    if (fourCC === 'DXT5') {
      const a0 = bytes[offset], a1 = bytes[offset + 1]
      alphaTable = [a0, a1]
      if (a0 > a1) for (let i = 1; i <= 6; i++) alphaTable.push(Math.floor(((7 - i) * a0 + i * a1) / 7))
      else {
        for (let i = 1; i <= 4; i++) alphaTable.push(Math.floor(((5 - i) * a0 + i * a1) / 5))
        alphaTable.push(0, 255)
      }
      alphaIndices = 0n
      for (let i = 0; i < 6; i++) alphaIndices |= BigInt(bytes[offset + 2 + i]) << BigInt(8 * i)
    }
    for (let pixel = 0; pixel < 16; pixel++) {
      const x = bx + pixel % 4, y = by + Math.floor(pixel / 4)
      if (x >= width || y >= height) continue
      const color = [...colors[(indices >>> (pixel * 2)) & 3]]
      if (fourCC === 'DXT3') color[3] = ((bytes[offset + (pixel >>> 1)] >>> ((pixel & 1) * 4)) & 15) * 17
      if (fourCC === 'DXT5') color[3] = alphaTable[Number((alphaIndices >> BigInt(pixel * 3)) & 7n)]
      rgba.set(color, (y * width + x) * 4)
    }
    offset += stride
  }
  return rgba
}
function decodeDDS(buffer) {
  assert(buffer.length >= 128 && buffer.readUInt32LE(0) === 0x20534444, 'Invalid DDS header')
  const code = buffer.toString('ascii', 84, 88)
  const compressed = Boolean(buffer.readUInt32LE(80) & 4)
  assert(!compressed || ['DXT1', 'DXT3', 'DXT5'].includes(code), `Unsupported DDS format: ${JSON.stringify(code)}`)
  const fourCC = compressed ? code : `RGB${buffer.readUInt32LE(88)}`
  const dds = new DDSLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), false)
  assert(!dds.isCubemap && dds.mipmaps.length === 1 && dds.width > 0 && dds.height > 0, 'Expected a single 2D base mip')
  assert(compressed || dds.format === THREE.RGBAFormat, 'Unsupported uncompressed DDS masks')
  const rgba = compressed ? decodeBlocks(dds.mipmaps[0].data, dds.width, dds.height, fourCC) : dds.mipmaps[0].data
  assert.equal(rgba.length, dds.width * dds.height * 4)
  let minAlpha = 255, maxAlpha = 0, nonOpaquePixels = 0
  for (let i = 3; i < rgba.length; i += 4) {
    minAlpha = Math.min(minAlpha, rgba[i]); maxAlpha = Math.max(maxAlpha, rgba[i])
    if (rgba[i] !== 255) nonOpaquePixels++
  }
  return { width: dds.width, height: dds.height, fourCC, minAlpha, maxAlpha, nonOpaquePixels, png: encodePNG(dds.width, dds.height, rgba) }
}
function selfTest() {
  const block = Buffer.alloc(8)
  block.writeUInt16LE(0xf800, 0); block.writeUInt16LE(0x07e0, 2)
  block.writeUInt32LE(0xe4e4e4e4, 4)
  assert.deepEqual([...decodeBlocks(block, 4, 4, 'DXT1').slice(0, 16)], [255, 0, 0, 255, 0, 255, 0, 255, 170, 85, 0, 255, 85, 170, 0, 255])
  const transparent = Buffer.alloc(8, 255); transparent.writeUInt16LE(0, 0); transparent.writeUInt16LE(0xffff, 2)
  assert.deepEqual([...decodeBlocks(transparent, 1, 1, 'DXT1')], [0, 0, 0, 0])
  const dxt3 = Buffer.alloc(16, 0x88); block.copy(dxt3, 8)
  assert.equal(decodeBlocks(dxt3, 4, 4, 'DXT3')[3], 136)
  for (const [a0, a1, expected] of [[255, 0, [255, 0, 218, 182, 145, 109, 72, 36]], [0, 255, [0, 255, 51, 102, 153, 204, 0, 255]]]) {
    const dxt5 = Buffer.alloc(16); dxt5[0] = a0; dxt5[1] = a1; block.copy(dxt5, 8)
    let indices = 0n
    for (let i = 0; i < 16; i++) indices |= BigInt(i % 8) << BigInt(i * 3)
    for (let i = 0; i < 6; i++) dxt5[2 + i] = Number((indices >> BigInt(i * 8)) & 255n)
    const decoded = decodeBlocks(dxt5, 4, 4, 'DXT5')
    assert.deepEqual(Array.from({ length: 8 }, (_, i) => decoded[i * 4 + 3]), expected)
  }
  // Exercise DDSLoader's uncompressed BGR/BGRA paths, row order and alpha,
  // as well as the block decoder above. Entire fixtures remain in memory.
  for (const bits of [24, 32]) {
    const header = Buffer.alloc(128)
    header.writeUInt32LE(0x20534444, 0); header.writeUInt32LE(124, 4)
    header.writeUInt32LE(0x100f, 8); header.writeUInt32LE(2, 12); header.writeUInt32LE(2, 16)
    header.writeUInt32LE(32, 76); header.writeUInt32LE(bits === 32 ? 0x41 : 0x40, 80)
    header.writeUInt32LE(bits, 88)
    for (const [offset, mask] of [[92, 0xff0000], [96, 0xff00], [100, 0xff], [104, bits === 32 ? 0xff000000 : 0]]) header.writeUInt32LE(mask, offset)
    const payload = bits === 32 ? [0, 0, 255, 128, 0, 255, 0, 255, 255, 0, 0, 0, 255, 255, 255, 255] : [0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255]
    const decoded = decodeDDS(Buffer.concat([header, Buffer.from(payload)]))
    const png = decoded.png
    assert.equal(decoded.fourCC, `RGB${bits}`)
    const idatSize = png.readUInt32BE(33)
    const rows = inflateSync(png.subarray(41, 41 + idatSize))
    assert.deepEqual([...rows], [0, 255, 0, 0, bits === 32 ? 128 : 255, 0, 255, 0, 255, 0, 0, 0, 255, bits === 32 ? 0 : 255, 255, 255, 255, 255])
  }
  const pixels = decodeBlocks(block, 4, 4, 'DXT1'), png = encodePNG(4, 4, pixels)
  let offset = 8, compressed = []
  while (offset < png.length) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8)
    assert.equal(crc32(png.subarray(offset + 4, offset + 8 + length)), png.readUInt32BE(offset + 8 + length))
    if (type === 'IDAT') compressed.push(png.subarray(offset + 8, offset + 8 + length))
    offset += length + 12
  }
  const rows = inflateSync(Buffer.concat(compressed))
  for (let y = 0; y < 4; y++) assert.deepEqual(rows.subarray(y * 17 + 1, y * 17 + 17), Buffer.from(pixels.subarray(y * 16, y * 16 + 16)))
}
selfTest()
if (process.argv.includes('--self-test')) { console.log('DDS DXT1/3/5 and PNG CRC/pixel round-trip checks passed.'); process.exit(0) }
const source = resolve(process.argv.slice(2).find(arg => !arg.startsWith('--')) || defaultSource)
const sourceDirectory = dirname(source)
const [objBytes, mtlBytes, files] = await Promise.all([readFile(source), readFile(resolve(sourceDirectory, 'PUG_SW.mtl')), readdir(resolve(sourceDirectory, 'maps'))])
const maps = new Map()
for (const file of files) {
  const key = file.toLowerCase()
  assert(!maps.has(key), `Ambiguous case-insensitive map: ${file}`)
  maps.set(key, file)
}
const mtl = new Map()
let current
for (const line of mtlBytes.toString('utf8').split(/\r?\n/)) {
  const match = line.trim().match(/^(\S+)\s+(.*)$/)
  if (!match || match[1].startsWith('#')) continue
  const [, key, value] = match
  if (key === 'newmtl') { current = { name: value }; mtl.set(value, current) }
  else if (current) current[key] = ['Kd', 'Ks', 'Ke'].includes(key) ? value.trim().split(/\s+/).map(Number) : value
}
const textures = new Map()
let ddsBytes = 0
for (const file of files.filter(file => /\.dds$/i.test(file)).sort()) {
  const bytes = await readFile(resolve(sourceDirectory, 'maps', file))
  textures.set(file.toLowerCase(), { file, sourceBytes: bytes.length, ...decodeDDS(bytes) })
  ddsBytes += bytes.length
}
function resolveMap(path) {
  if (!path) return null
  const name = localName(path).toLowerCase()
  assert(maps.has(name) && textures.has(name), `Missing local DDS map: ${name}`)
  return textures.get(name)
}
for (const material of mtl.values()) for (const key of ['map_Ka', 'map_Kd', 'map_d']) if (material[key]) resolveMap(material[key])
const object = new OBJLoader().parse(objBytes.toString('utf8'))
object.updateMatrixWorld(true)
const meshes = []
object.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3())
const sourceTriangles = meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0)
assert.equal(meshes.length, 86, 'Unexpected source mesh count')
assert.equal(sourceTriangles, 131841, 'Unexpected source triangle count')
assert.equal(mtl.size, 38, 'Unexpected source material count')
for (const [name, material] of paintParts) {
  const mesh = meshes.find(mesh => mesh.name === name)
  assert(mesh && !Array.isArray(mesh.material) && mesh.material.name === material, `Unexpected paint source: ${name}`)
}
if (process.argv.includes('--inspect')) {
  console.log(JSON.stringify({ source: basename(source), meshes: meshes.length, triangles: sourceTriangles, materials: mtl.size, textures: textures.size, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray() } }))
  for (const mesh of meshes) console.log(JSON.stringify({ part: mesh.name, triangles: (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, groups: mesh.geometry.groups, materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => m.name) }))
  for (const m of mtl.values()) console.log(JSON.stringify({ material: m.name, Kd: m.Kd, diffuse: localName(m.map_Kd || ''), opacityMap: localName(m.map_d || '') }))
  for (const { png, ...info } of textures.values()) console.log(JSON.stringify({ texture: info }))
  process.exit(0)
}

const rotation = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
const orientedBounds = bounds.clone().applyMatrix4(rotation)
const center = orientedBounds.getCenter(new THREE.Vector3())
const scale = 4.15 / size.x
const normalization = new THREE.Matrix4().makeScale(scale, scale, scale)
normalization.setPosition(-center.x * scale, -orientedBounds.min.y * scale, -center.z * scale)
const transform = normalization.multiply(rotation)
const result = new THREE.Group()
result.name = 'Peugeot 207 SW estate - supplied geometry'
result.userData = {
  vehicle: '207SW', model: 'Peugeot 207 SW estate', integration: 'Showroom-only asset; not the 207 hatchback',
  sourceOBJ: basename(source), sourceMTL: 'PUG_SW.mtl', reconstructedPBR: true,
  materials: 'Original Kd, diffuse DDS atlas and UV associations retained; PBR and glazing reconstructed, not exact original shaders. map_d does not imply glass.',
  orientation: 'Source +X front, +Z up, +Y left; rotated -PI/2 about X to +Y up',
  scale: 'Uniform display normalization to length 4.15 scene units; not measured or certified physical scale',
  geometry: 'All 131841 source triangles retained; position16/normal12/texcoord14 requested precision quantization, no decimation',
  rights: 'Unverified. Asset owner must verify source usage rights before public redistribution.',
}
const groups = new Map(), assignments = new Map(), seenPaint = new Set()
function materialFor(mesh, sourceMaterial) {
  const original = mtl.get(sourceMaterial.name)
  assert(original, `Unknown MTL material: ${sourceMaterial.name}`)
  const paint = paintParts.has(mesh.name)
  const glass = windowParts.has(mesh.name)
  const lamp = lampParts.has(mesh.name)
  const category = paint ? 'paint' : glass ? 'glass' : lamp ? 'lamp' : 'opaque'
  const key = paint ? 'Vehicle body paint' : `${original.name} [${category}]`
  if (paint) seenPaint.add(mesh.name)
  if (assignments.has(key)) {
    const existing = assignments.get(key)
    assert.deepEqual(existing.original.Kd, original.Kd)
    assert.equal(existing.original.map_Kd, original.map_Kd)
    if (!existing.sourceMaterials.includes(original.name)) existing.sourceMaterials.push(original.name)
    return key
  }
  const kd = original.Kd || [1, 1, 1]
  const reflective = /refl|cromo/i.test(original.name)
  const roughness = paint ? 0.27 : glass ? 0.12 : lamp ? 0.18 : reflective ? 0.32 : Math.min(0.95, Math.max(0.45, Math.sqrt(2 / (Number(original.Ns || 0) + 2))))
  const params = { name: key, color: new THREE.Color().setRGB(...kd, THREE.LinearSRGBColorSpace), metalness: paint ? 0.55 : reflective ? 0.65 : 0, roughness, side: THREE.DoubleSide }
  let material
  if (paint || glass || lamp) material = new THREE.MeshPhysicalMaterial({ ...params, ...(glass ? { color: new THREE.Color('#233540'), transparent: true, opacity: 0.48, depthWrite: false } : lamp ? { transparent: true, opacity: 0.72, depthWrite: false } : {}), clearcoat: paint ? 1 : 0.5, clearcoatRoughness: 0.17 })
  else material = new THREE.MeshStandardMaterial(params)
  assignments.set(key, { original, category, material, sourceMaterials: [original.name], parts: [], triangles: 0 })
  return key
}
for (const mesh of meshes) {
  const sourceGeometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const ranges = sourceGeometry.groups.length ? sourceGeometry.groups : [{ start: 0, count: sourceGeometry.attributes.position.count, materialIndex: 0 }]
  const coverage = new Uint8Array(sourceGeometry.attributes.position.count / 3)
  for (const range of ranges) {
    assert(range.start % 3 === 0 && range.count % 3 === 0 && range.start + range.count <= sourceGeometry.attributes.position.count, `Invalid group: ${mesh.name}`)
    for (let i = range.start / 3; i < (range.start + range.count) / 3; i++) { assert.equal(coverage[i], 0, `Overlapping group: ${mesh.name}`); coverage[i] = 1 }
    const key = materialFor(mesh, materials[range.materialIndex])
    const geometry = new THREE.BufferGeometry()
    for (const semantic of ['position', 'normal', 'uv']) {
      const attribute = sourceGeometry.getAttribute(semantic)
      assert(attribute, `Missing ${semantic}: ${mesh.name}`)
      geometry.setAttribute(semantic, new THREE.BufferAttribute(attribute.array.slice(range.start * attribute.itemSize, (range.start + range.count) * attribute.itemSize), attribute.itemSize))
    }
    geometry.applyMatrix4(mesh.matrixWorld).applyMatrix4(transform)
    // OBJ V=0 is bottom; PNG/glTF V=0 is top. DDS decoded rows are top-first.
    // No image is passed to GLTFExporter, so it cannot perform this flip for us.
    const uv = geometry.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i))
    const indexed = mergeVertices(geometry, 0.000001)
    geometry.dispose()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(indexed)
    const assignment = assignments.get(key)
    assignment.parts.push({ name: mesh.name, material: materials[range.materialIndex].name, triangles: range.count / 3 })
    assignment.triangles += range.count / 3
  }
  assert(coverage.every(value => value === 1), `Uncovered triangles: ${mesh.name}`)
}
assert.equal(seenPaint.size, 6)
for (const [key, geometries] of groups) {
  const assignment = assignments.get(key)
  const merged = mergeGeometries(geometries, false)
  assert(merged, `Unable to merge ${key}`)
  assert.equal(merged.index.count / 3, assignment.triangles)
  const mesh = new THREE.Mesh(merged, assignment.material)
  mesh.name = key === 'Vehicle body paint' ? 'Body paint - six Cor parts only' : key
  mesh.userData = { sourceParts: assignment.parts, semantic: assignment.category }
  result.add(mesh)
  geometries.forEach(g => g.dispose())
}
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }).catch(error => this.onerror?.(error))
  }
}
const binary = await new GLTFExporter().parseAsync(result, { binary: true })
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const document = await io.readBinary(new Uint8Array(binary))
const embedded = new Map()
for (const material of document.getRoot().listMaterials()) {
  const assignment = assignments.get(material.getName())
  assert(assignment, `Unknown exported material: ${material.getName()}`)
  const { original, category, sourceMaterials } = assignment
  const texture = category === 'glass' ? null : resolveMap(original.map_Kd)
  if (texture) {
    if (!embedded.has(texture.file)) embedded.set(texture.file, document.createTexture(texture.file).setMimeType('image/png').setImage(texture.png).setExtras({ sourceDDS: texture.file, sourceFormat: texture.fourCC, alpha: [texture.minAlpha, texture.maxAlpha] }))
    material.setBaseColorTexture(embedded.get(texture.file))
    material.getBaseColorTextureInfo().setWrapS(10497).setWrapT(10497)
  }
  material.setExtras({ sourceMaterials, sourceKd: original.Kd, sourceDiffuse: localName(original.map_Kd || ''), sourceOpacityMap: localName(original.map_d || ''), reconstructedPBR: true, semantic: category, opacityPolicy: category === 'glass' ? 'Plain reconstructed dark physical glazing; original atlas intentionally not used' : category === 'lamp' ? 'Reconstructed lamp lens blend using original atlas alpha' : 'Opaque: source map_d is not evidence of glazing' })
}
await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }))
const compressed = await io.writeBinary(document)

// Decode the exact bytes that will be written, including Meshopt. Check counts
// per semantic/material, not just a total that might hide a dropped group.
async function verify(bytes) {
  const packed = Buffer.from(bytes)
  const json = JSON.parse(packed.toString('utf8', 20, 20 + packed.readUInt32LE(12)))
  assert(json.extensionsRequired.includes('EXT_meshopt_compression'))
  assert(json.buffers.every(buffer => !buffer.uri), 'External buffer URI')
  assert(json.images.every(image => image.bufferView !== undefined && !image.uri && image.mimeType === 'image/png'), 'Expected embedded PNG images only')
  const decoded = await io.readBinary(bytes)
  const root = decoded.getRoot(), counts = new Map()
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    assert.equal(primitive.getMode(), 4)
    const count = (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3
    const name = primitive.getMaterial().getName()
    counts.set(name, (counts.get(name) || 0) + count)
    for (const semantic of ['POSITION', 'NORMAL', 'TEXCOORD_0']) {
      const attribute = primitive.getAttribute(semantic)
      assert(attribute && attribute.getCount() === primitive.getAttribute('POSITION').getCount())
      assert(attribute.getArray().every(Number.isFinite), `Nonfinite ${semantic}`)
    }
  }
  assert.equal([...counts.values()].reduce((a, b) => a + b, 0), sourceTriangles)
  for (const [key, assignment] of assignments) assert.equal(counts.get(key), assignment.triangles, `Changed material triangle count: ${key}`)
  assert.equal(root.listMaterials().filter(m => m.getName() === 'Vehicle body paint').length, 1)
  for (const material of root.listMaterials()) {
    const assignment = assignments.get(material.getName())
    assert.equal(material.getAlphaMode(), ['glass', 'lamp'].includes(assignment.category) ? 'BLEND' : 'OPAQUE')
    if (assignment.category !== 'glass' && assignment.original.map_Kd) assert.equal(material.getBaseColorTexture().getName(), resolveMap(assignment.original.map_Kd).file)
  }
  assert.equal(root.listTextures().length, embedded.size)
  for (const texture of root.listTextures()) {
    assert.equal(texture.getMimeType(), 'image/png')
    assert.deepEqual(Buffer.from(texture.getImage()), textures.get(texture.getName().toLowerCase()).png)
  }
  const box = getBounds(root.listScenes()[0]), dimensions = box.max.map((value, i) => value - box.min[i])
  assert(Math.abs(dimensions[0] - 4.15) < 0.001)
  assert(Math.abs(dimensions[1] - size.z * scale) < 0.001 && Math.abs(dimensions[2] - size.y * scale) < 0.001, 'Changed source proportions')
  const paintNode = root.listNodes().find(node => node.getMesh()?.listPrimitives().some(primitive => primitive.getMaterial()?.getName() === 'Vehicle body paint'))
  assert.deepEqual(paintNode.getExtras().sourceParts.map(part => part.name).sort(), [...paintParts.keys()].sort())
  assert(root.listNodes().some(node => node.getExtras().vehicle === '207SW' && node.getExtras().reconstructedPBR === true), 'Missing provenance extras')
  assert(Math.abs(box.min[1]) < 0.001)
  assert(Math.abs(box.max[0] + box.min[0]) < 0.001 && Math.abs(box.max[2] + box.min[2]) < 0.001)
  return { decodedTriangles: [...counts.values()].reduce((a, b) => a + b, 0), renderMeshes: root.listMeshes().length, materials: root.listMaterials().length, embeddedPNGTextures: root.listTextures().length, bounds: box, dimensions }
}
await verify(compressed)
assert((await stat(dirname(output))).isDirectory(), 'Output models directory must already exist')
await writeFile(output, compressed)
const verification = await verify(new Uint8Array(await readFile(output)))
console.log(JSON.stringify({ output, sourceOBJBytes: objBytes.length, sourceMTLBytes: mtlBytes.length, sourceDDSBytes: ddsBytes, sourceTotalBytes: objBytes.length + mtlBytes.length + ddsBytes, uncompressedGeometryGLBBytes: binary.byteLength, outputGLBBytes: compressed.byteLength, originalParts: meshes.length, sourceTriangles, ...verification, materialAssignments: [...assignments].map(([name, a]) => ({ name, semantic: a.category, sourceMaterials: a.sourceMaterials, triangles: a.triangles, parts: a.parts.map(p => p.name), texture: a.category === 'glass' ? null : localName(a.original.map_Kd || '') })), textureAlpha: [...embedded.keys()].map(name => { const t = textures.get(name.toLowerCase()); return { name, format: t.fourCC, width: t.width, height: t.height, alpha: [t.minAlpha, t.maxAlpha], nonOpaquePixels: t.nonOpaquePixels } }), geometry: 'No decimation; all source triangles retained; precision quantization only', risks: ['Rights unverified; public redistribution requires owner verification.', 'PBR, lamp blending and plain dark glazing reconstructed, not exact source shader recovery.', 'DDS alpha retained in PNG; only exact window parts and transparentes lamp groups blend. Opaque interior and Refl parts ignore atlas alpha.', 'Out-of-range tiled UVs may remain floating point rather than 14-bit quantized, preserving tiling.'] }, null, 2))
