<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type * as Three from 'three'
import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js'

const props = withDefaults(defineProps<{
  body?: string
  color?: string
  rotating?: boolean
  vehicleKey?: string
  modelUrl?: string
  posterUrl?: string
  view?: 'orbit' | 'side' | 'front'
}>(), {
  body: 'SEDAN',
  color: '#d9e3e8',
  rotating: true,
  view: 'orbit',
})
type ModelState = 'loading' | 'ready' | 'error' | 'generic'
const emit = defineEmits<{ ready: []; unavailable: []; modelState: [state: ModelState] }>()
const modelState = ref<ModelState>(props.modelUrl ? 'loading' : 'generic')
let loadCurrentModel: (() => Promise<void>) | undefined
function retryModel() { void loadCurrentModel?.() }
const host = ref<HTMLDivElement>()
const unavailable = ref(false)
const loaded = ref(false)
let disposed = false
let cleanup: (() => void) | undefined
let rebuild: (() => void) | undefined
let repaint: (() => void) | undefined
let setView: (() => void) | undefined
let wake: (() => void) | undefined

watch(() => props.modelUrl, () => { void loadCurrentModel?.() }, { flush: 'sync' })
watch(() => [props.body, props.vehicleKey], () => rebuild?.())
watch(() => props.color, () => repaint?.())
watch(() => props.view, () => setView?.())
watch(() => props.rotating, () => wake?.())

onBeforeUnmount(() => {
  disposed = true
  cleanup?.()
})

onMounted(async () => {
  try {
    const [T, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ])
    if (disposed || !host.value) return

    const root = host.value
    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 70)
    let renderer: Three.WebGLRenderer | undefined
    let controls: OrbitControlsType | undefined
    let environmentTarget: Three.WebGLRenderTarget | undefined
    let car: Three.Group | undefined
    let paint: Three.MeshPhysicalMaterial | undefined
    const assetPaints = new Set<Three.MeshStandardMaterial>()
    let assetRoots: Three.Object3D[] | undefined
    let assetHeight = 0
    let requestToken = 0
    let modelAbort: AbortController | undefined
    let resizeObserver: ResizeObserver | undefined
    let intersectionObserver: IntersectionObserver | undefined
    let frame = 0
    let visible = true
    let width = 0
    let height = 0
    let lastTime = 0
    let interacting = false
    let resumeAt = 0
    let readyEmitted = false
    let failed = false
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = motion.matches
    const target = new T.Vector3(0, 0.92, 0)

    // Every car owns its resources; shared resources within it are disposed only once.
    function disposeObject(object: Three.Object3D | Three.Object3D[]) {
      const geometries = new Set<Three.BufferGeometry>()
      const materials = new Set<Three.Material>()
      const textures = new Set<Three.Texture>()
      for (const root of Array.isArray(object) ? object : [object]) root.traverse((child: Three.Object3D) => {
        const shadowLight = child as Three.DirectionalLight
        shadowLight.shadow?.dispose()
        const mesh = child as Three.Mesh
        if (mesh.geometry) geometries.add(mesh.geometry)
        if (mesh.material) {
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            materials.add(material)
            for (const value of Object.values(material)) {
              if (value instanceof T.Texture) textures.add(value)
            }
          }
        }
      })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      textures.forEach(texture => {
        texture.dispose()
        // GLTFLoader may use ImageBitmapLoader; GPU disposal does not close bitmaps.
        const image: unknown = texture.source.data
        if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close()
      })
    }

    function clearCar() {
      if (car) {
        scene.remove(car)
        disposeObject(assetRoots ?? car)
      }
      car = undefined
      paint = undefined
      assetRoots = undefined
      assetPaints.clear()
      assetHeight = 0
    }

    function updateModelState(state: ModelState) {
      modelState.value = state
      emit('modelState', state)
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      lastTime = 0
    }

    function fail() {
      if (disposed || failed) return
      failed = true
      cleanup?.()
      unavailable.value = true
      emit('unavailable')
    }

    function onContextLost(event: Event) {
      event.preventDefault()
      fail()
    }

    let tornDown = false
    function teardown() {
      if (tornDown) return
      tornDown = true
      ++requestToken
      modelAbort?.abort()
      modelAbort = undefined
      loadCurrentModel = undefined
      clearCar()
      stop()
      rebuild = repaint = setView = wake = undefined
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      motion.removeEventListener('change', onMotion)
      controls?.removeEventListener('start', onStart)
      controls?.removeEventListener('end', onEnd)
      controls?.removeEventListener('change', requestFrame)
      controls?.dispose()
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
        renderer.domElement.removeEventListener('pointerdown', onPointerDown, true)
        renderer.domElement.removeEventListener('pointermove', onPointerMove, true)
        renderer.domElement.removeEventListener('pointerup', onPointerUp, true)
        renderer.domElement.removeEventListener('pointercancel', onPointerUp, true)
      }
      scene.environment = null
      disposeObject(scene)
      environmentTarget?.dispose()
      renderer?.renderLists.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
      renderer?.domElement.remove()
      scene.clear()
      car = undefined
    }
    cleanup = teardown

    function requestFrame() {
      if (disposed || failed || !visible || document.hidden || !width || !height || frame) return
      frame = requestAnimationFrame(render)
    }

    function render(time: number) {
      frame = 0
      if (disposed || failed || !renderer || !controls) return
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
      lastTime = time
      const autoRotate = props.rotating && props.view === 'orbit' && !reducedMotion
      controls.autoRotate = autoRotate && !interacting && time > resumeAt
      // Delta-based rotation remains consistent across high-refresh-rate displays.
      controls.update(delta)
      try {
        renderer.render(scene, camera)
      } catch {
        fail()
        return
      }
      if (!readyEmitted) {
        readyEmitted = true
        loaded.value = true
        emit('ready')
      }
      if (autoRotate || interacting) requestFrame()
    }

    function onStart() { interacting = true; requestFrame() }
    function onEnd() { interacting = false; resumeAt = performance.now() + 1800; requestFrame() }
    function onVisibility() { if (document.hidden) stop(); else requestFrame() }
    function onMotion(event: MediaQueryListEvent) { reducedMotion = event.matches; requestFrame() }

    // OrbitControls normally sets touch-action:none. Only horizontal single-finger
    // drags orbit here; native vertical panning remains available to the page.
    let touchStart: { x: number; y: number; id: number; direction: 'pending' | 'x' | 'y' } | undefined
    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'touch') return
      if (touchStart) { event.stopImmediatePropagation(); return }
      touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId, direction: 'pending' }
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== 'touch' || !touchStart) return
      if (event.pointerId !== touchStart.id) { event.stopImmediatePropagation(); return }
      const dx = Math.abs(event.clientX - touchStart.x)
      const dy = Math.abs(event.clientY - touchStart.y)
      if (touchStart.direction === 'pending' && Math.max(dx, dy) > 5) {
        touchStart.direction = dy > dx ? 'y' : 'x'
      }
      if (touchStart.direction !== 'x') event.stopImmediatePropagation()
    }
    function onPointerUp(event: PointerEvent) {
      if (touchStart?.id === event.pointerId) touchStart = undefined
    }

    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
      renderer.setClearColor(0x101419, 0)
      renderer.outputColorSpace = T.SRGBColorSpace
      renderer.toneMapping = T.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.12
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = T.PCFShadowMap
      const canvas = renderer.domElement
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', 'پیش‌نمایش سه‌بعدی خودرو؛ برای چرخاندن، به چپ یا راست بکشید')
      canvas.addEventListener('webglcontextlost', onContextLost)
      // Capture listeners precede the control's bubbling listeners.
      canvas.addEventListener('pointerdown', onPointerDown, { capture: true })
      canvas.addEventListener('pointermove', onPointerMove, { capture: true })
      canvas.addEventListener('pointerup', onPointerUp, { capture: true })
      canvas.addEventListener('pointercancel', onPointerUp, { capture: true })
      root.prepend(canvas)

      const generator = new T.PMREMGenerator(renderer)
      const room = new RoomEnvironment()
      try {
        environmentTarget = generator.fromScene(room, 0.04)
        scene.environment = environmentTarget.texture
        scene.environmentIntensity = 0.9
      } finally {
        room.dispose()
        generator.dispose()
      }

      controls = new OrbitControls(camera, canvas)
      controls.enableZoom = false
      controls.enablePan = false
      // No damping means idle views can sleep completely, including reduced motion.
      controls.enableDamping = false
      controls.rotateSpeed = 0.55
      controls.autoRotateSpeed = 0.38
      controls.minDistance = 5.5
      controls.maxDistance = 18
      controls.minPolarAngle = Math.PI * 0.25
      controls.maxPolarAngle = Math.PI * 0.48
      controls.target.copy(target)
      controls.touches.ONE = T.TOUCH.ROTATE
      controls.touches.TWO = T.TOUCH.PAN
      canvas.style.touchAction = 'pan-y'
      controls.addEventListener('start', onStart)
      controls.addEventListener('end', onEnd)
      controls.addEventListener('change', requestFrame)

      const hemisphere = new T.HemisphereLight(0xc5dfff, 0x29211d, 1.35)
      scene.add(hemisphere)
      const key = new T.DirectionalLight(0xfff3df, 4.2)
      key.position.set(3, 7, 4)
      key.castShadow = true
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.camera.left = key.shadow.camera.bottom = -4.5
      key.shadow.camera.right = key.shadow.camera.top = 4.5
      key.shadow.camera.near = 0.5
      key.shadow.camera.far = 18
      key.shadow.normalBias = 0.025
      key.shadow.bias = -0.0002
      key.shadow.radius = 3
      scene.add(key)
      const rim = new T.DirectionalLight(0x8dbbff, 3)
      rim.position.set(-4, 3.5, -4)
      scene.add(rim)
      const fill = new T.DirectionalLight(0xffffff, 1.1)
      fill.position.set(0, 2, 5)
      scene.add(fill)
      const warm = new T.PointLight(0xff722d, 12, 9, 2)
      warm.position.set(-2.8, 0.7, 2.4)
      scene.add(warm)

      const platform = new T.Mesh(
        new T.CylinderGeometry(3.1, 3.18, 0.12, 128),
        new T.MeshStandardMaterial({ color: 0x20272e, roughness: 0.32, metalness: 0.65 }),
      )
      platform.position.y = -0.075
      platform.receiveShadow = true
      scene.add(platform)
      const platformTop = new T.Mesh(
        new T.CircleGeometry(3.05, 128),
        new T.MeshStandardMaterial({ color: 0x171d24, metalness: 0.4, roughness: 0.48 }),
      )
      platformTop.rotation.x = -Math.PI / 2
      platformTop.position.y = -0.012
      platformTop.receiveShadow = true
      scene.add(platformTop)
      const ringMaterial = new T.MeshStandardMaterial({
        color: 0xff7431, emissive: 0xff5417, emissiveIntensity: 3, roughness: 0.3, metalness: 0.3,
      })
      for (const [radius, tube, y] of [[3.08, 0.013, -0.008], [3.17, 0.008, -0.08]]) {
        const ring = new T.Mesh(new T.TorusGeometry(radius!, tube!, 8, 160), ringMaterial)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = y!
        scene.add(ring)
      }
      // Inlaid radial marks provide a machined turntable, without labels or overlays.
      const markMaterial = new T.MeshStandardMaterial({ color: 0x4c555e, metalness: 0.7, roughness: 0.45 })
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2
        const mark = new T.Mesh(new T.BoxGeometry(i % 4 ? 0.07 : 0.13, 0.002, 0.012), markMaterial)
        mark.position.set(Math.cos(a) * 2.94, -0.009, Math.sin(a) * 2.94)
        mark.rotation.y = -a
        scene.add(mark)
      }
      const floor = new T.Mesh(new T.PlaneGeometry(100, 100), new T.ShadowMaterial({ opacity: 0.25 }))
      floor.rotation.x = -Math.PI / 2
      floor.position.y = -0.145
      floor.receiveShadow = true
      scene.add(floor)

      function paintColor() {
        return /^#[\da-f]{6}$/i.test(props.color) ? props.color : '#d9e3e8'
      }

      function buildCar() {
        if (disposed || failed || props.modelUrl) return
        clearCar()
        car = new T.Group()
        scene.add(car)
        const kind = props.body.toUpperCase().replace(/[\s_-]/g, '')
        const suv = kind === 'SUV' || kind === 'CROSSOVER'
        const van = kind === 'VAN' || kind === 'MINIVAN'
        const pickup = kind === 'PICKUP' || kind === 'TRUCK'
        const hatch = kind === 'HATCHBACK' || kind === 'HATCH'
        const coupe = kind === 'COUPE'
        const length = van ? 4.95 : pickup ? 5.1 : hatch ? 4.15 : 4.7
        const half = length / 2
        const wide = suv || pickup || van ? 0.97 : 0.9
        const wheelbase = hatch ? 1.3 : pickup ? 1.65 : 1.48
        const wheelY = 0.46
        const radius = suv || pickup ? 0.455 : 0.425
        const belt = suv || van || pickup ? 1.2 : 1.08
        const roof = van ? 2.08 : suv ? 1.91 : pickup ? 1.86 : hatch ? 1.73 : coupe ? 1.53 : 1.63
        const rearFoot = pickup ? -0.65 : van ? -half + 0.17 : hatch || suv ? -half + 0.22 : -1.48
        const rearRoof = pickup ? -0.58 : van ? -half + 0.25 : hatch || suv ? -half + 0.55 : coupe ? -0.68 : -0.93
        const frontRoof = van ? 0.92 : pickup ? 0.72 : 0.5
        const frontFoot = van ? 1.53 : 1.2
        const roofWidth = wide - (van ? 0.12 : 0.2)
        paint = new T.MeshPhysicalMaterial({
          color: paintColor(), metalness: 0.72, roughness: 0.24, clearcoat: 1,
          clearcoatRoughness: 0.13, envMapIntensity: 1.35, side: T.DoubleSide,
        })
        const dark = new T.MeshStandardMaterial({ color: 0x10151b, roughness: 0.38, metalness: 0.3 })
        const rubber = new T.MeshStandardMaterial({ color: 0x101215, roughness: 0.87, metalness: 0.02 })
        const alloy = new T.MeshStandardMaterial({ color: 0xb6c1ca, metalness: 0.94, roughness: 0.22 })
        const rimDark = new T.MeshStandardMaterial({ color: 0x303943, metalness: 0.8, roughness: 0.3 })
        const brake = new T.MeshStandardMaterial({ color: 0x69747c, metalness: 0.9, roughness: 0.42 })
        const caliper = new T.MeshStandardMaterial({ color: 0xe65c28, metalness: 0.45, roughness: 0.35 })
        const glass = new T.MeshPhysicalMaterial({
          color: 0x102331, metalness: 0.08, roughness: 0.22, clearcoat: 0.4,
          clearcoatRoughness: 0.16, envMapIntensity: 0.45, side: T.DoubleSide,
        })
        const light = new T.MeshStandardMaterial({ color: 0xe4f6ff, emissive: 0xb9e5ff, emissiveIntensity: 3.5 })
        const red = new T.MeshStandardMaterial({ color: 0xff2635, emissive: 0xf00b1c, emissiveIntensity: 2.5 })
        const seam = new T.LineBasicMaterial({ color: 0x27313a, transparent: true, opacity: 0.65 })

        function mesh(geometry: Three.BufferGeometry, material: Three.Material, x = 0, y = 0, z = 0) {
          const object = new T.Mesh(geometry, material)
          object.position.set(x, y, z)
          object.castShadow = true
          object.receiveShadow = true
          car!.add(object)
          return object
        }
        function box(x: number, y: number, z: number, sx: number, sy: number, sz: number, material: Three.Material = paint!) {
          return mesh(new T.BoxGeometry(sx, sy, sz), material, x, y, z)
        }
        function panel(points: number[][], material: Three.Material) {
          const geometry = new T.BufferGeometry()
          geometry.setAttribute('position', new T.Float32BufferAttribute(points.flat(), 3))
          geometry.setIndex([0, 1, 2, 0, 2, 3])
          geometry.computeVertexNormals()
          return mesh(geometry, material)
        }
        function line(points: number[][], material: Three.LineBasicMaterial = seam) {
          const geometry = new T.BufferGeometry().setFromPoints(points.map(p => new T.Vector3(p[0]!, p[1]!, p[2]!)))
          car!.add(new T.Line(geometry, material))
        }
        function rod(a: number[], b: number[], thickness: number, material: Three.Material) {
          const start = new T.Vector3(a[0]!, a[1]!, a[2]!)
          const end = new T.Vector3(b[0]!, b[1]!, b[2]!)
          const object = mesh(new T.CylinderGeometry(thickness, thickness, start.distanceTo(end), 8), material)
          object.position.copy(start.clone().add(end).multiplyScalar(0.5))
          object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize())
        }

        // A bevelled extruded silhouette has real open wheel wells, not black circles
        // pasted onto a box. The front of every body class is positive X.
        const shape = new T.Shape()
        shape.moveTo(-half, 0.59)
        shape.lineTo(-half, belt - 0.16)
        shape.quadraticCurveTo(-half + 0.06, belt - 0.02, -half + 0.26, belt)
        shape.lineTo(half - 0.4, belt)
        shape.quadraticCurveTo(half - 0.05, belt - 0.04, half, belt - 0.19)
        shape.lineTo(half, 0.59)
        const arch = radius + 0.075
        for (const center of [wheelbase, -wheelbase]) {
          shape.lineTo(center + arch, 0.59)
          shape.lineTo(center + arch, wheelY)
          shape.absarc(center, wheelY, arch, 0, Math.PI, false)
          shape.lineTo(center - arch, 0.59)
        }
        shape.lineTo(-half, 0.59)
        const bodyGeometry = new T.ExtrudeGeometry(shape, {
          depth: wide * 2 - 0.07, bevelEnabled: true, bevelThickness: 0.035,
          bevelSize: 0.035, bevelSegments: 3, steps: 1, curveSegments: 20,
        })
        bodyGeometry.translate(0, 0, -wide + 0.035)
        mesh(bodyGeometry, paint)
        box(0, 0.55, 0, length - 0.25, 0.13, wide * 1.65, dark)
        for (const side of [-1, 1]) {
          box(0, 0.59, side * (wide + 0.015), wheelbase * 2 - 0.98, 0.09, 0.07, suv || pickup ? dark : paint)
          for (const x of [-wheelbase, wheelbase]) {
            const fender = mesh(new T.TorusGeometry(arch + 0.012, suv || pickup ? 0.035 : 0.017, 7, 40, Math.PI), suv || pickup ? dark : paint, x, wheelY, side * (wide + 0.012))
            fender.castShadow = false
          }
        }

        // The cabin is a tapered four-station volume; glazing follows its actual planes.
        const stations = [
          [rearFoot, belt + 0.015, wide - 0.035],
          [rearRoof, roof, roofWidth],
          [frontRoof, roof - 0.015, roofWidth],
          [frontFoot, belt + 0.015, wide - 0.035],
        ]
        for (let i = 0; i < stations.length - 1; i++) {
          const a = stations[i]!, b = stations[i + 1]!
          panel([[a[0]!, a[1]!, -a[2]!], [b[0]!, b[1]!, -b[2]!], [b[0]!, b[1]!, b[2]!], [a[0]!, a[1]!, a[2]!]], paint)
        }
        for (const side of [-1, 1]) {
          // Side faces are built explicitly so their width tapers toward the roof.
          panel([[rearFoot, belt, side * (wide - 0.035)], [rearRoof, roof, side * roofWidth], [frontRoof, roof - 0.015, side * roofWidth], [frontFoot, belt, side * (wide - 0.035)]], paint)
          const windowBottom = belt + 0.075
          const windowTop = roof - 0.075
          function sideZ(y: number) {
            return side * (wide - 0.035 - (y - belt) / (roof - belt) * (wide - 0.035 - roofWidth) + 0.008)
          }
          const backBottom = rearFoot + 0.13
          const backTop = rearRoof + 0.055
          const frontTop = frontRoof - 0.045
          const frontBottom = frontFoot - 0.14
          const pillar = pickup ? 0.01 : coupe ? -0.2 : -0.18
          panel([[backBottom, windowBottom, sideZ(windowBottom)], [backTop, windowTop, sideZ(windowTop)], [pillar - 0.045, windowTop, sideZ(windowTop)], [pillar - 0.045, windowBottom, sideZ(windowBottom)]], glass)
          panel([[pillar + 0.045, windowBottom, sideZ(windowBottom)], [pillar + 0.045, windowTop, sideZ(windowTop)], [frontTop, windowTop - 0.01, sideZ(windowTop - 0.01)], [frontBottom, windowBottom, sideZ(windowBottom)]], glass)
          line([[backBottom, windowBottom - 0.025, sideZ(windowBottom)], [frontBottom, windowBottom - 0.025, sideZ(windowBottom)]], new T.LineBasicMaterial({ color: 0x99a5ad }))
          // Flush handles, shut lines and the subtle stamped shoulder crease.
          const doorXs = coupe || pickup ? [0.65] : [0.67, -0.75]
          for (const x of doorXs) {
            box(x, belt - 0.13, side * (wide + 0.039), 0.21, 0.035, 0.025, alloy)
          }
          line([[frontFoot - 0.12, belt - 0.02, side * (wide + 0.037)], [frontFoot - 0.21, 0.75, side * (wide + 0.037)], [frontFoot - 0.36, 0.65, side * (wide + 0.037)], [rearFoot + 0.15, 0.65, side * (wide + 0.037)], [rearFoot + 0.09, belt - 0.04, side * (wide + 0.037)]])
          if (!coupe && !pickup) line([[pillar, belt - 0.01, side * (wide + 0.038)], [pillar - 0.04, 0.66, side * (wide + 0.038)]])
          line([[-half + 0.2, belt - 0.065, side * (wide + 0.032)], [half - 0.3, belt - 0.09, side * (wide + 0.032)]])
          rod([0.89, belt + 0.12, side * (wide - 0.02)], [0.85, belt + 0.13, side * (wide + 0.2)], 0.025, dark)
          const mirror = mesh(new T.SphereGeometry(1, 16, 10), paint, 0.84, belt + 0.17, side * (wide + 0.23))
          mirror.scale.set(0.17, 0.075, 0.1)
          box(0.72, belt + 0.17, side * (wide + 0.23), 0.012, 0.09, 0.13, alloy)
          box(0.88, belt + 0.165, side * (wide + 0.31), 0.16, 0.012, 0.009, light)
        }

        function slopeWindow(bottomX: number, topX: number, topY: number, back: boolean) {
          const bottomY = belt + 0.015
          const low = 0.1, high = 0.89
          const point = (t: number, side: number) => [
            T.MathUtils.lerp(bottomX, topX, t) + (back ? -0.006 : 0.006),
            T.MathUtils.lerp(bottomY, topY, t) + 0.008,
            side * T.MathUtils.lerp(wide - 0.1, roofWidth - 0.065, t),
          ]
          panel([point(low, -1), point(high, -1), point(high, 1), point(low, 1)], glass)
          if (!back) {
            for (const side of [-1, 1]) {
              rod([bottomX - 0.02, belt + 0.09, side * 0.1], [bottomX - 0.13, belt + 0.15, side * 0.63], 0.012, dark)
            }
          }
        }
        slopeWindow(frontFoot, frontRoof, roof - 0.015, false)
        slopeWindow(rearFoot, rearRoof, roof, true)
        if (suv || van) {
          for (const side of [-1, 1]) rod([rearRoof + 0.12, roof + 0.06, side * (roofWidth - 0.09)], [frontRoof - 0.06, roof + 0.045, side * (roofWidth - 0.09)], 0.025, rimDark)
        }
        if (pickup) {
          // Open cargo bed with ribbed liner and a separate tailgate.
          const bedLength = rearFoot + half - 0.13
          box(-half + bedLength / 2 + 0.06, belt + 0.012, 0, bedLength, 0.035, wide * 1.68, dark)
          for (let i = -4; i <= 4; i++) box(-half + bedLength / 2 + 0.06, belt + 0.04, i * 0.17, bedLength - 0.08, 0.025, 0.025, rimDark)
          for (const side of [-1, 1]) box(-half + bedLength / 2, belt + 0.1, side * (wide - 0.06), bedLength + 0.05, 0.19, 0.1, paint)
          box(-half + 0.04, belt + 0.1, 0, 0.1, 0.19, wide * 2, paint)
          box(-half - 0.005, belt - 0.09, 0, 0.015, 0.045, 0.25, dark)
        }

        // Hood and deck shut lines, grille slats, splitters and inset lamp housings.
        line([[frontFoot + 0.08, belt + 0.039, -wide + 0.13], [half - 0.36, belt + 0.015, -wide + 0.13], [half - 0.26, belt - 0.015, wide - 0.13], [frontFoot + 0.08, belt + 0.039, wide - 0.13]])
        if (!pickup) line([[-half + 0.2, belt + 0.01, -wide + 0.1], [rearFoot - 0.05, belt + 0.04, -wide + 0.1], [rearFoot - 0.05, belt + 0.04, wide - 0.1], [-half + 0.2, belt + 0.01, wide - 0.1]])
        box(half + 0.02, 0.77, 0, 0.055, 0.22, wide * 1.1, dark)
        for (let i = 0; i < 6; i++) box(half + 0.052, 0.685 + i * 0.031, 0, 0.014, 0.01, wide * 1.03, rimDark)
        box(half + 0.052, 0.59, 0, 0.09, 0.055, wide * 1.89, dark)
        box(-half - 0.025, 0.63, 0, 0.08, 0.15, wide * 1.86, dark)
        for (const side of [-1, 1]) {
          const lampZ = side * wide * 0.72
          box(half - 0.005, belt - 0.165, lampZ, 0.075, 0.14, wide * 0.49, dark)
          box(half + 0.038, belt - 0.13, lampZ, 0.017, 0.027, wide * 0.43, light)
          box(half + 0.039, belt - 0.19, side * wide * 0.9, 0.017, 0.095, 0.026, light)
          for (const z of [0.62, 0.76]) box(half + 0.04, belt - 0.18, side * wide * z, 0.02, 0.035, 0.06, alloy)
          box(-half - 0.015, belt - 0.14, lampZ, 0.06, 0.13, wide * 0.5, dark)
          box(-half - 0.049, belt - 0.115, lampZ, 0.012, 0.034, wide * 0.46, red)
          box(-half - 0.05, belt - 0.17, side * wide * 0.91, 0.012, 0.1, 0.027, red)
          const exhaust = mesh(new T.CylinderGeometry(0.065, 0.065, 0.16, 16, 1, true), alloy, -half - 0.05, 0.57, side * 0.57)
          exhaust.rotation.z = Math.PI / 2
          const pipe = mesh(new T.CircleGeometry(0.049, 16), dark, -half - 0.132, 0.57, side * 0.57)
          pipe.rotation.y = -Math.PI / 2
        }
        box(-half - 0.047, 0.82, 0, 0.014, 0.12, 0.33, rimDark)
        box(half + 0.064, 0.79, 0, 0.015, 0.12, 0.3, rimDark)
        box(-half - 0.05, belt - 0.02, 0, 0.02, 0.025, 0.16, alloy)
        if (!pickup && !van) {
          const aerial = mesh(new T.ConeGeometry(0.04, 0.13, 4), dark, rearRoof + 0.28, roof + 0.06, 0)
          aerial.scale.x = 1.9
        }

        // Four fully volumetric wheels: tire shoulder, tread, recessed barrel,
        // ventilated rotor, coloured caliper, ten swept alloy spokes and lug nuts.
        for (const x of [-wheelbase, wheelbase]) {
          for (const side of [-1, 1]) {
            const z = side * (wide - 0.035)
            const cylinder = (r: number, depth: number, material: Three.Material, offset = 0) => {
              const object = mesh(new T.CylinderGeometry(r, r, depth, 48), material, x, wheelY, z + side * offset)
              object.rotation.x = Math.PI / 2
              return object
            }
            cylinder(radius - 0.045, 0.24, rubber)
            for (const shoulder of [-0.082, 0.082]) {
              mesh(new T.TorusGeometry(radius - 0.09, 0.09, 12, 48), rubber, x, wheelY, z + shoulder)
            }
            for (let i = 0; i < 40; i++) {
              const a = i / 40 * Math.PI * 2
              const tread = box(x + Math.sin(a) * (radius - 0.006), wheelY + Math.cos(a) * (radius - 0.006), z, 0.018, 0.01, 0.17, rimDark)
              tread.rotation.z = -a
              tread.rotation.y = 0.2
            }
            cylinder(radius * 0.735, 0.18, rimDark, 0.035)
            cylinder(radius * 0.62, 0.015, brake, 0.139)
            const outerZ = z + side * 0.17
            const lip = mesh(new T.TorusGeometry(radius * 0.72, 0.018, 8, 48), alloy, x, wheelY, outerZ)
            lip.castShadow = false
            box(x + 0.16, wheelY + 0.03, z + side * 0.151, 0.09, 0.23, 0.035, caliper)
            for (let i = 0; i < 10; i++) {
              const angle = i / 10 * Math.PI * 2
              const a = [x + Math.cos(angle) * 0.07, wheelY + Math.sin(angle) * 0.07, outerZ]
              const b = [x + Math.cos(angle + 0.15) * radius * 0.68, wheelY + Math.sin(angle + 0.15) * radius * 0.68, outerZ - side * 0.012]
              rod(a, b, 0.019, alloy)
            }
            cylinder(0.072, 0.035, alloy, 0.176)
            cylinder(0.033, 0.039, dark, 0.18)
            for (let i = 0; i < 5; i++) {
              const a = i / 5 * Math.PI * 2
              const lug = mesh(new T.SphereGeometry(0.011, 6, 4), alloy, x + Math.cos(a) * 0.052, wheelY + Math.sin(a) * 0.052, z + side * 0.197)
              lug.scale.z = 0.5
            }
            for (let i = 0; i < 18; i++) {
              const a = i / 18 * Math.PI * 2
              const hole = mesh(new T.CircleGeometry(0.009, 5), dark, x + Math.cos(a) * radius * 0.51, wheelY + Math.sin(a) * radius * 0.51, z + side * 0.149)
              if (side < 0) hole.rotation.y = Math.PI
            }
          }
        }
        requestFrame()
      }

      async function loadModel() {
        if (disposed || failed) return
        const token = ++requestToken
        modelAbort?.abort()
        modelAbort = undefined
        clearCar()
        requestFrame()
        const source = props.modelUrl
        if (!source) {
          buildCar()
          updateModelState('generic')
          cameraPreset()
          return
        }

        updateModelState('loading')
        const controller = new AbortController()
        modelAbort = controller
        const stale = () => disposed || failed || tornDown || token !== requestToken
        let parsedRoots: Three.Object3D[] | undefined
        try {
          // Only the parent's same-origin local GLB URL is accepted, never a remote asset.
          const url = new URL(source, document.baseURI)
          if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)
            || url.username || url.password || !/\.glb$/i.test(url.pathname)) {
            throw new Error('Expected a local GLB URL')
          }
          const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
            import('three/addons/loaders/GLTFLoader.js'),
            import('three/addons/libs/meshopt_decoder.module.js'),
          ])
          if (stale()) return
          const response = await fetch(url.href, { signal: controller.signal, mode: 'same-origin', redirect: 'error' })
          if (!response.ok) throw new Error(`Model request failed: ${response.status}`)
          const buffer = await response.arrayBuffer()
          if (stale()) return
          const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
          const gltf = await loader.parseAsync(buffer, new URL('.', url).href)
          parsedRoots = [...new Set([gltf.scene, ...gltf.scenes])]
          if (stale()) return

          // Keep source geometry and its +X front / +Y up unchanged. Only the
          // wrapper is uniformly scaled; the authored center and ground stay at zero.
          const group = new T.Group()
          group.add(gltf.scene)
          const bounds = new T.Box3().setFromObject(group)
          const size = bounds.getSize(new T.Vector3())
          if (!Number.isFinite(size.x) || size.x <= 0 || !Number.isFinite(size.y) || size.y <= 0) {
            throw new Error('Empty or invalid vehicle geometry')
          }
          const scale = 4.45 / size.x
          group.scale.setScalar(scale)
          assetHeight = size.y * scale
          gltf.scene.traverse((child) => {
            const mesh = child as Three.Mesh
            if (!mesh.isMesh) return
            mesh.castShadow = true
            // Dense authored panels sit very close together. Receiving the low-
            // resolution showroom shadow map causes acne; keep ground shadows.
            mesh.receiveShadow = false
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
              if (['Pride 111 body paint', 'Vehicle body paint'].includes(material.name) && material instanceof T.MeshStandardMaterial) {
                assetPaints.add(material)
              }
            }
          })
          assetRoots = parsedRoots
          parsedRoots = undefined // Ownership passes to clearCar()/teardown().
          car = group
          scene.add(group)
          repaint?.()
          cameraPreset()
          requestFrame()
          updateModelState('ready')
        } catch {
          if (!stale()) {
            clearCar()
            updateModelState('error')
            requestFrame()
          }
        } finally {
          // Parsing cannot be aborted; any late result must still release its resources.
          if (parsedRoots) disposeObject(parsedRoots)
          if (token === requestToken) modelAbort = undefined
        }
      }

      function cameraPreset() {
        if (!controls || !width || !height) return
        camera.aspect = width / height
        // Fit both the long side and roof with a comfortable platform margin.
        const horizontalFov = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)
        const front = props.view === 'front'
        const side = props.view === 'side'
        const fitWidth = front ? 2.75 : side ? 5.65 : 5.75
        // Include the authored antenna (about 2.21 showroom units tall), while
        // retaining the existing target and platform framing for generic previews.
        const fitHeight = Math.max(2.7, 2 * (assetHeight - target.y) + 0.3)
        const verticalFit = fitHeight / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * 0.84)
        const distance = Math.max(5.4, verticalFit, fitWidth / (2 * Math.tan(horizontalFov / 2)) / 0.78)
        const direction = front ? new T.Vector3(1, 0.14, 0.001) : side ? new T.Vector3(0.001, 0.13, 1) : new T.Vector3(1.12, 0.53, 1.5)
        camera.position.copy(target).add(direction.normalize().multiplyScalar(distance))
        controls.target.copy(target)
        controls.minDistance = Math.min(5.5, distance)
        controls.maxDistance = Math.max(18, distance + 1)
        camera.far = Math.max(70, distance + 35)
        camera.updateProjectionMatrix()
        controls.update()
        requestFrame()
      }
      function resize() {
        if (!renderer || disposed || failed) return
        const bounds = root.getBoundingClientRect()
        width = Math.round(bounds.width)
        height = Math.round(bounds.height)
        if (!width || !height) { stop(); return }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
        renderer.setSize(width, height)
        cameraPreset()
      }
      rebuild = () => { if (!props.modelUrl) { buildCar(); cameraPreset() } }
      repaint = () => {
        paint?.color.set(paintColor())
        assetPaints.forEach(material => material.color.set(paintColor()))
        requestFrame()
      }
      setView = cameraPreset
      wake = requestFrame
      loadCurrentModel = loadModel
      void loadCurrentModel()
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(root)
      intersectionObserver = new IntersectionObserver((entries) => {
        visible = entries.some(entry => entry.isIntersecting)
        if (visible) requestFrame(); else stop()
      }, { rootMargin: '0px' })
      intersectionObserver.observe(root)
      document.addEventListener('visibilitychange', onVisibility)
      motion.addEventListener('change', onMotion)
      resize()
    } catch {
      fail()
    }
  } catch {
    if (!disposed) {
      cleanup?.()
      unavailable.value = true
      emit('unavailable')
    }
  }
})
</script>

<template>
  <div
    ref="host"
    class="vehicle-scene"
    :class="{ 'is-ready': loaded }"
    :data-model-state="modelState"
    :data-model-url="modelUrl || ''"
    :aria-busy="!unavailable && (!loaded || modelState === 'loading')"
  >
    <div v-if="!unavailable && modelState === 'loading'" class="vehicle-scene__status" role="status" aria-live="polite">
      در حال بارگذاری مدل سه‌بعدی خودرو…
    </div>
    <div v-else-if="!unavailable && modelState === 'error'" class="vehicle-scene__status" role="status" aria-live="polite">
      <span>بارگذاری مدل سه‌بعدی این خودرو انجام نشد. لطفاً دوباره تلاش کنید.</span>
      <button type="button" @click="retryModel">تلاش دوباره</button>
    </div>
    <div v-if="unavailable" class="vehicle-scene__fallback" role="group" aria-label="نمای سه‌بعدی در این دستگاه در دسترس نیست">
      <img v-if="modelUrl && posterUrl" :src="posterUrl" alt="تصویر مدل اختصاصی خودرو به‌جای نمای تعاملی" class="vehicle-scene__poster">
      <svg v-else-if="!modelUrl" viewBox="0 0 640 300" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="vehicle-fallback-paint" x2="0.2" y2="1">
            <stop :stop-color="/^#[\da-f]{6}$/i.test(color) ? color : '#d9e3e8'" />
            <stop offset="1" stop-color="#596674" />
          </linearGradient>
        </defs>
        <ellipse cx="320" cy="241" rx="266" ry="25" fill="#181f27" stroke="#fa762e" stroke-width="1.5" />
        <path d="M86 198 99 163 206 145 259 94 381 94 445 148 530 165 551 199 539 214 91 214Z" fill="url(#vehicle-fallback-paint)" />
        <path d="m225 146 42-42h105l51 43Z" fill="#142b3b" />
        <path d="M327 102v44M105 174l64-10M482 169l47 12" fill="none" stroke="#d9efff" stroke-width="5" />
        <path d="M213 158v45h211v-45M337 155v49" fill="none" stroke="#35424e" stroke-width="1.5" />
        <g v-for="x in [184, 456]" :key="x">
          <circle :cx="x" cy="208" r="37" fill="#0c1015" />
          <circle :cx="x" cy="208" r="24" fill="#8996a3" stroke="#35414c" stroke-width="6" />
          <circle :cx="x" cy="208" r="8" fill="#27323e" />
        </g>
      </svg>
      <span>نمای سه‌بعدی در این دستگاه در دسترس نیست</span>
    </div>
  </div>
</template>

<style scoped>
.vehicle-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  isolation: isolate;
  background: radial-gradient(ellipse at 50% 62%, rgba(53, 66, 81, 0.22), transparent 67%);
}
.vehicle-scene :deep(canvas) {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
  cursor: grab;
  opacity: 0;
  transition: opacity 450ms ease;
}
.vehicle-scene.is-ready :deep(canvas) { opacity: 1; }
.vehicle-scene :deep(canvas:active) { cursor: grabbing; }
.vehicle-scene__status {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  color: #d9e3e8;
  background: rgba(16, 20, 25, 0.7);
  font-size: 0.875rem;
  text-align: center;
  direction: rtl;
}
.vehicle-scene__status button {
  border: 1px solid #fa762e;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  background: #20272e;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
.vehicle-scene__status button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.vehicle-scene__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #98a7b8;
  font-size: 0.75rem;
  gap: 1rem;
  padding: 1rem;
  direction: rtl;
}
.vehicle-scene__poster { width: min(100%, 680px); max-height: 78%; object-fit: contain; border-radius: 8px; }
.vehicle-scene__fallback svg { width: min(90%, 680px); max-height: 75%; }
@media (prefers-reduced-motion: reduce) {
  .vehicle-scene :deep(canvas) { transition: none; }
}
</style>
