import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { stat } from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { getVehicleModelAsset, getShowroomVehicles, getShowroomModelAsset } from '../utils/vehicleModels.ts'
import { execFileSync } from 'node:child_process'
import { getBounds } from '@gltf-transform/functions'

test('Pride 111 is matched by stable vehicle slugs, never by generic body class', () => {
  assert.equal(getVehicleModelAsset('pride', '111')?.url, '/models/pride-111.glb')
  assert.equal(getVehicleModelAsset('saipa', 'pride', 'pride-111')?.url, '/models/pride-111.glb')
  assert.equal(getVehicleModelAsset('pride', '131'), undefined)
  assert.equal(getVehicleModelAsset('pride', '132'), undefined)
  assert.equal(getVehicleModelAsset('peugeot', '111'), undefined)
  assert.equal(getVehicleModelAsset('saipa', 'pride', 'pride-132'), undefined)
  assert.equal(getVehicleModelAsset(), undefined)
})

test('Pride 111 GLB decodes with all source triangles and reconstructed materials', async () => {
  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  const document = await io.read(fileURLToPath(new URL('../public/models/pride-111.glb', import.meta.url)))
  const root = document.getRoot()
  assert.equal(root.listScenes().length, 1)
  assert.ok(root.listExtensionsRequired().some(extension => extension.extensionName === 'EXT_meshopt_compression'))
  const primitives = root.listMeshes().flatMap(mesh => mesh.listPrimitives())
  assert.equal(primitives.reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0), 658106)
  assert.equal(primitives.length, 10)
  for (const primitive of primitives) {
    assert.equal(primitive.getMode(), 4, 'all surfaces remain triangulated')
    assert.ok(primitive.getAttribute('POSITION').getCount() > 0)
    assert.ok(primitive.getAttribute('NORMAL'))
    assert.ok(primitive.getMaterial())
  }
  const materials = root.listMaterials()
  assert.ok(materials.some(material => material.getName() === 'Pride 111 body paint'))
  assert.ok(materials.some(material => material.getName() === 'Pride 111 window glass' && material.getAlphaMode() === 'BLEND'))
  assert.ok(materials.some(material => material.getName() === 'Tire rubber'))
  const rearLamp = materials.find(material => material.getName() === 'Rear lamp lens')
  assert.equal(rearLamp.getBaseColorTexture()?.getMimeType(), 'image/jpeg')
  assert.ok(rearLamp.getBaseColorTexture().getImage().byteLength > 0)
})

test('207 SW is a separate showroom asset, never a 207 hatchback fitment', () => {
  assert.equal(getVehicleModelAsset('peugeot', '207'), undefined)
  assert.equal(getVehicleModelAsset('peugeot', '207', 'tu5p-manual'), undefined)
  assert.equal(getVehicleModelAsset('peugeot', '207-sw'), undefined)
  assert.deepEqual(getShowroomVehicles('pride'), [])
  const [vehicle] = getShowroomVehicles('peugeot')
  assert.equal(vehicle.showroomOnly, true)
  assert.equal(vehicle.id, 'showroom:peugeot-207-sw')
  assert.equal(vehicle.body, 'WAGON')
  assert.equal(vehicle.variants, undefined)
  assert.equal(getShowroomModelAsset(vehicle.assetId)?.url, '/models/peugeot-207-sw.glb')
  assert.equal(getShowroomModelAsset(vehicle.assetId)?.poster, '/models/peugeot-207-sw.webp')
  assert.equal(getShowroomModelAsset('207'), undefined)
})

test('207 SW GLB retains geometry, embedded textures, orientation, and paint scope', async () => {
  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  const document = await io.read(fileURLToPath(new URL('../public/models/peugeot-207-sw.glb', import.meta.url)))
  const root = document.getRoot()
  const primitives = root.listMeshes().flatMap(mesh => mesh.listPrimitives())
  assert.equal(primitives.reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0), 131841)
  const paint = primitives.filter(primitive => primitive.getMaterial().getName() === 'Vehicle body paint')
  assert.equal(paint.length, 1)
  assert.equal(paint[0].getIndices().getCount() / 3, 13319, 'only six explicitly identified body panels are paintable')
  const paintNode = root.listNodes().find(node => node.getMesh()?.listPrimitives().some(primitive => primitive.getMaterial()?.getName() === 'Vehicle body paint'))
  assert.equal(paintNode.getExtras().sourceParts.length, 6)
  assert.ok(paintNode.getExtras().sourceParts.every(part => part.name.endsWith('_Cor')))
  assert.equal(root.listTextures().length, 20)
  for (const texture of root.listTextures()) {
    assert.equal(texture.getMimeType(), 'image/png')
    assert.ok(texture.getImage().byteLength > 0)
    assert.equal(texture.getURI(), '')
  }
  assert.ok(root.listNodes().some(node => node.getExtras().vehicle === '207SW'))
  const bounds = getBounds(root.listScenes()[0])
  assert.ok(Math.abs(bounds.max[0] - bounds.min[0] - 4.15) < 0.001)
  assert.ok(Math.abs(bounds.max[1] - bounds.min[1] - 1.79068) < 0.001, 'Z-up source was converted to Y-up')
  assert.ok(Math.abs(bounds.min[1]) < 0.001, 'vehicle rests on the ground')
})

test('vehicle posters are present and not empty showroom placeholders', async () => {
  for (const name of ['pride-111', 'peugeot-207-sw']) {
    const file = await stat(new URL(`../public/models/${name}.webp`, import.meta.url))
    assert.ok(file.size > 5000, `${name} must contain a rendered vehicle, not just the empty gradient`)
  }
})

test('DDS conversion validates compressed blocks and PNG pixels without source assets', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/convert-peugeot207sw.mjs', import.meta.url)), '--self-test'], { encoding: 'utf8' })
  assert.match(output, /checks passed/)
})
