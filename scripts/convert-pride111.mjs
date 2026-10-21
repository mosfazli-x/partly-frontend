import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/convert-pride111.mjs <source.obj> [--inspect]')
const object = new OBJLoader().parse(await readFile(source, 'utf8'))
object.updateMatrixWorld(true)
const bounds = new THREE.Box3().setFromObject(object)
const size = bounds.getSize(new THREE.Vector3())
const meshes = []
object.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const summary = new Map()
for (const mesh of meshes) {
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    let item = summary.get(material.name)
    if (!item) { item = { name: material.name, meshes: [], vertices: 0, bounds: new THREE.Box3() }; summary.set(material.name, item) }
    item.meshes.push(mesh.name)
    item.vertices += mesh.geometry.attributes.position.count
    item.bounds.union(new THREE.Box3().setFromObject(mesh))
  }
}
if (process.argv.includes('--parts')) {
  for (const mesh of meshes) {
    const box = new THREE.Box3().setFromObject(mesh)
    console.log(JSON.stringify({ name: mesh.name, vertices: mesh.geometry.attributes.position.count, materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(item => item.name), min: box.min.toArray().map(n => +n.toFixed(2)), max: box.max.toArray().map(n => +n.toFixed(2)) }))
  }
  process.exit(0)
}
if (process.argv.includes('--inspect')) {
console.log(JSON.stringify({ bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray() }, meshCount: meshes.length, materials: [...summary.values()].map(item => ({ name: item.name, objects: item.meshes, vertices: item.vertices, min: item.bounds.min.toArray(), max: item.bounds.max.toArray() })) }, null, 2))
process.exit(0)
}

// The supplied OBJ has no MTL. These assignments are reconstructed from the
// named parts and inspected geometry, not recovered original material settings.
const parts = {
  paint: new Set(['Plane433', 'kaput', 'sandogh', 'Plane516', 'Plane485', 'Plane474']),
  glass: new Set(['Plane513', 'Plane543', 'Plane488', 'Plane477', 'Plane490', 'Plane479', 'Plane489', 'Plane478']),
  rubber: new Set(['tire004', 'tire005', 'tire007', 'tire008']),
  metal: new Set(['ghalpagh012', 'ghalpagh013', 'ghalpagh015', 'ghalpagh016', 'logo1', 'logo2', 'logo3', 'logo4', 'saipa_logo', 'saipa_logo2', 'Text005', 'Text006', 'headlight002', 'headlight003', 'Cylinder146', 'Cylinder147', 'Cylinder148', 'Cylinder149', 'Cylinder150', 'Cylinder151', 'Object082', 'Object083']),
  headlight: new Set(['heallight_glass002', 'heallight_glass003']),
  tail: new Set(['backlight_glass']),
  tailHousing: new Set(['right_backlight', 'Cylinder142', 'Cylinder143', 'Cylinder144', 'Cylinder152', 'Cylinder153', 'Cylinder154', 'Cylinder155']),
  seats: new Set(['Box141', 'Box142', 'Box143', 'Box144', 'Box145', 'Box148', 'Box149']),
  interior: new Set(['Plane451', 'Plane553', 'Plane453', 'Plane467', 'Plane466']),
}
const standard = (name, color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, side: THREE.DoubleSide })
const materials = {
  paint: new THREE.MeshPhysicalMaterial({ name: 'Pride 111 body paint', color: '#ced5db', metalness: 0.6, roughness: 0.27, clearcoat: 1, clearcoatRoughness: 0.17, side: THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ name: 'Pride 111 window glass', color: '#233540', metalness: 0.04, roughness: 0.12, clearcoat: 0.5, transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide }),
  rubber: standard('Tire rubber', '#141619', 0.91),
  metal: standard('Wheel covers and reflector metal', '#a6adb2', 0.3, 0.8),
  headlight: new THREE.MeshPhysicalMaterial({ name: 'Headlamp clear lens', color: '#e2e8ec', roughness: 0.13, transparent: true, opacity: 0.19, depthWrite: false, side: THREE.DoubleSide }),
  tail: new THREE.MeshStandardMaterial({ name: 'Rear lamp lens', color: '#d41e28', roughness: 0.25, metalness: 0.1, emissive: '#270102', emissiveIntensity: 0.2, side: THREE.DoubleSide }),
  tailHousing: standard('Rear lamp housing', '#56151c', 0.35, 0.3),
  seats: standard('Seat fabric', '#383b40', 0.96),
  interior: standard('Interior trim', '#303238', 0.88),
  trim: standard('Exterior black trim and hardware', '#171b20', 0.65, 0.08),
}
const groups = new Map()
const center = bounds.getCenter(new THREE.Vector3())
// Uniform scale preserves the source proportions. Meter-like scene units are for
// display only: the source carries no verified physical dimensional metadata.
const scale = 3.673 / size.x
const transform = new THREE.Matrix4().makeScale(scale, scale, scale)
transform.setPosition(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
let triangles = 0
for (const mesh of meshes) {
  const category = Object.entries(parts).find(([, names]) => names.has(mesh.name))?.[0] || 'trim'
  const geometry = mesh.geometry.clone()
  geometry.applyMatrix4(mesh.matrixWorld)
  geometry.applyMatrix4(transform)
  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2))
  for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(key)) geometry.deleteAttribute(key)
  geometry.clearGroups()
  const indexed = mergeVertices(geometry, 0.000001)
  geometry.dispose()
  triangles += indexed.index.count / 3
  if (!groups.has(category)) groups.set(category, [])
  groups.get(category).push(indexed)
}
const result = new THREE.Group()
result.name = 'Pride 111 - supplied source geometry'
result.userData = { model: 'Pride 111', geometrySource: 'User-supplied pride-111.obj', materials: 'Reconstructed; original MTL was not supplied', scale: 'Uniform display normalization; dimensions not certified', license: 'Source usage rights must be verified by the asset owner before public redistribution.' }
for (const [category, geometries] of groups) {
  const merged = mergeGeometries(geometries, false)
  if (!merged) throw new Error(`Could not merge ${category}`)
  const mesh = new THREE.Mesh(merged, materials[category])
  mesh.name = category
  result.add(mesh)
  geometries.forEach(geometry => geometry.dispose())
}

// GLTFExporter uses FileReader for its binary buffers. Node provides Blob but
// not FileReader; only the required buffer conversion is implemented here.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }).catch(error => this.onerror?.(error))
  }
}
const binary = await new GLTFExporter().parseAsync(result, { binary: true })
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const document = await io.readBinary(new Uint8Array(binary))
const rearLampMaterial = document.getRoot().listMaterials().find(material => material.getName() === 'Rear lamp lens')
if (rearLampMaterial) {
  // This filename and the dedicated rear-lamp mesh are the one unambiguous
  // color-map association; other texture mappings cannot be recovered safely.
  const texture = document.createTexture('Supplied rear lamp diffuse').setMimeType('image/jpeg').setImage(new Uint8Array(await readFile(resolve(dirname(source), 'backlight-deffuse.jpg'))))
  rearLampMaterial.setBaseColorTexture(texture).setBaseColorFactor([1, 1, 1, 1])
}
await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }))
const output = resolve('public/models/pride-111.glb')
await mkdir(dirname(output), { recursive: true })
const compressed = await io.writeBinary(document)
await writeFile(output, compressed)
console.log(JSON.stringify({ output, originalParts: meshes.length, triangles, renderMeshes: result.children.length, sourceBytes: binary.byteLength, compressedBytes: compressed.byteLength, materials: 'Reconstructed (MTL missing); supplied rear-lamp diffuse embedded', geometry: 'All source triangles retained; precision-quantized and Meshopt-compressed' }, null, 2))
