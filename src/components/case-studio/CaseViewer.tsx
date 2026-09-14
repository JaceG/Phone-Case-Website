'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export type View = 'artwork' | 'angle' | 'inside'
export type ViewerHandle = { snapshot: () => Promise<Blob | null> }

const CaseViewer = forwardRef<
  ViewerHandle,
  {
    canvas: HTMLCanvasElement | null
    revision: number
    silicone: string
    view: View
  }
>(({ canvas, revision, silicone, view }, ref) => {
  const host = useRef<HTMLDivElement>(null)
  const render = useRef<(() => void) | null>(null)
  const renderer = useRef<THREE.WebGLRenderer | null>(null)
  const texture = useRef<THREE.CanvasTexture | null>(null)
  const inner = useRef<THREE.MeshStandardMaterial[]>([])
  const modelReady = useRef(false)
  const moveCamera = useRef<((view: View) => void) | null>(null)
  const [status, setStatus] = useState('Loading your case…')

  useImperativeHandle(ref, () => ({
    snapshot: () =>
      new Promise((resolve) => {
        render.current?.()
        if (!renderer.current || !modelReady.current) resolve(null)
        else renderer.current.domElement.toBlob(resolve, 'image/png')
      }),
  }))

  useEffect(() => {
    if (!canvas || !host.current) return
    const container = host.current
    let webgl: THREE.WebGLRenderer
    try {
      webgl = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      })
    } catch {
      setStatus(
        '3D is unavailable in this browser. You can still place artwork and export the layout.',
      )
      return
    }
    renderer.current = webgl
    webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    webgl.outputColorSpace = THREE.SRGBColorSpace
    // Neutral preview lighting keeps dark artwork dark, without a filmic lift.
    webgl.toneMapping = THREE.NoToneMapping
    webgl.setClearColor('#e5e5e1')
    container.appendChild(webgl.domElement)
    webgl.domElement.setAttribute(
      'aria-label',
      'Interactive 3D phone case. Drag to rotate; scroll to zoom.',
    )
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.001, 10)
    const controls = new OrbitControls(camera, webgl.domElement)
    controls.enablePan = false
    controls.minDistance = 0.18
    controls.maxDistance = 0.7
    controls.target.set(0, 0, 0)
    const frame = () => webgl.render(scene, camera)
    render.current = frame
    controls.addEventListener('change', frame)
    moveCamera.current = (next) => {
      const position: [number, number, number] =
        next === 'artwork'
          ? [0, 0, 0.39]
          : next === 'inside'
            ? [0.18, 0.09, -0.33]
            : [0.18, 0.065, 0.34]
      camera.position.set(position[0], position[1], position[2])
      camera.up.set(0, 1, 0)
      controls.update()
      frame()
    }
    moveCamera.current('artwork')
    const environment = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(webgl)
    const env = pmrem.fromScene(environment, 0.04)
    scene.environment = env.texture
    scene.environmentIntensity = 0.15
    environment.dispose()
    pmrem.dispose()
    const key = new THREE.DirectionalLight(0xffffff, 2.3)
    key.position.set(-0.2, 0.25, 0.35)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xe6ebff, 0.8)
    fill.position.set(0.3, -0.05, -0.2)
    scene.add(fill)
    // Transparent, unprinted areas expose the solid case color, not a hole in
    // the mesh. Keep this composite separate from the transparent print PNG.
    const surface = document.createElement('canvas')
    surface.width = canvas.width
    surface.height = canvas.height
    const map = new THREE.CanvasTexture(surface)
    // GLTFLoader converts Blender's V coordinate for top-down web images.
    map.flipY = false
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = Math.min(8, webgl.capabilities.getMaxAnisotropy())
    texture.current = map
    let disposed = false
    let model: THREE.Group | null = null
    const releaseModel = (root: THREE.Group) => {
      const materials = new Set<THREE.Material>()
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          ;(Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) =>
            materials.add(m),
          )
        }
      })
      materials.forEach((m) => m.dispose())
    }
    new GLTFLoader().load(
      '/models/iphone-17-pro-max.glb',
      (gltf) => {
        if (disposed) {
          releaseModel(gltf.scene)
          return
        }
        model = gltf.scene
        inner.current = []
        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return
          for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue
            material.roughness = 0.62
            material.metalness = 0
            material.envMapIntensity = 0.12
            if (material.name === 'case_print') {
              material.map = map
              material.color.set('#ffffff')
            } else inner.current.push(material)
            material.needsUpdate = true
          }
        })
        scene.add(model)
        modelReady.current = true
        setStatus('')
        frame()
      },
      undefined,
      () => {
        if (!disposed)
          setStatus('The case could not load. Refresh to try again; your flat layout still works.')
      },
    )
    const resize = new ResizeObserver(() => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (!width || !height) return
      webgl.setSize(width, height)
      camera.aspect = width / height
      // Fit the complete case in narrow panes, with space for its perspective.
      camera.fov = width / height < 0.6 ? 38 : 30
      camera.updateProjectionMatrix()
      frame()
    })
    resize.observe(container)
    return () => {
      disposed = true
      resize.disconnect()
      controls.dispose()
      if (model) releaseModel(model)
      map.dispose()
      env.dispose()
      webgl.dispose()
      webgl.domElement.remove()
      renderer.current = null
      modelReady.current = false
      render.current = null
      moveCamera.current = null
      texture.current = null
      inner.current = []
    }
  }, [canvas])

  useEffect(() => {
    if (texture.current && canvas) {
      const surface = texture.current.image as HTMLCanvasElement
      const ctx = surface.getContext('2d')!
      ctx.fillStyle = silicone
      ctx.fillRect(0, 0, surface.width, surface.height)
      ctx.drawImage(canvas, 0, 0)
      texture.current.needsUpdate = true
    }
    inner.current.forEach((material) => material.color.set(silicone))
    render.current?.()
  }, [revision, silicone, status, canvas])

  useEffect(() => {
    moveCamera.current?.(view)
  }, [view, canvas])

  return (
    <div className="cs-viewer">
      <div className="cs-webgl-surface" ref={host} />
      {status && (
        <p className="cs-viewer-status" role="status">
          {status}
        </p>
      )}
    </div>
  )
})

CaseViewer.displayName = 'CaseViewer'
export default CaseViewer
