'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { HERO_LEAN, HERO_TILT, heroPhaseAt } from './heroMotion'

type Props = { geometry: string; texture: string; still: string | null; alt: string }

/** One approved geometry + one public preview texture; no private artwork downloads. */
export function ModelHero({ geometry, texture, still, alt }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    let disposed = false,
      raf = 0,
      elapsed = 0,
      last = performance.now(),
      visible = true
    let root: THREE.Group | null = null
    let map: THREE.Texture | null = null
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping
    renderer.setClearColor(0, 0)
    renderer.domElement.className = 'absolute inset-0 h-full w-full'
    renderer.domElement.style.opacity = '0'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(25.36, 1, 0.001, 10)
    camera.position.set(0, 0.05, 0.5)
    camera.lookAt(0, 0, 0)
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(room, 0.04)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.15
    room.dispose()
    pmrem.dispose()
    const key = new THREE.DirectionalLight(0xffffff, 2.3)
    key.position.set(-0.2, 0.25, 0.35)
    const fill = new THREE.DirectionalLight(0xe6ebff, 0.8)
    fill.position.set(0.3, -0.05, -0.2)
    scene.add(key, fill)
    const axis = new THREE.Vector3(0, Math.cos(HERO_TILT), Math.sin(HERO_TILT))
    const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), HERO_LEAN)
    const spin = new THREE.Quaternion()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const release = (model: THREE.Group) => {
      const materials = new Set<THREE.Material>()
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material)
      })
      materials.forEach((material) => material.dispose())
    }
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      if (root) renderer.render(scene, camera)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    intersection.observe(container)
    resize()
    const animate = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!root || !visible || document.hidden) return
      if (!paused.current && !reduced.matches) elapsed += dt
      root.quaternion
        .copy(spin.setFromAxisAngle(axis, heroPhaseAt(reduced.matches ? 0 : elapsed) * Math.PI * 2))
        .multiply(lean)
      renderer.render(scene, camera)
    }
    // Keep the model-specific still visible until BOTH assets are ready.
    new GLTFLoader().load(
      geometry,
      (gltf) => {
        if (disposed) {
          release(gltf.scene)
          return
        }
        root = gltf.scene
        root.scale.multiplyScalar(1.2)
        map = new THREE.TextureLoader().load(
          texture,
          () => {
            if (disposed) return
            root!.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return
              for (const material of Array.isArray(object.material)
                ? object.material
                : [object.material]) {
                if (!(material instanceof THREE.MeshStandardMaterial)) continue
                material.roughness = 0.62
                material.metalness = 0
                material.envMapIntensity = 0.12
                if (material.name === 'case_print') {
                  material.map = map
                  material.color.set('#ffffff')
                }
                material.needsUpdate = true
              }
            })
            scene.add(root!)
            last = performance.now()
            animate(last)
            renderer.domElement.style.opacity = '1'
            setReady(true)
          },
          undefined,
          () => {
            /* the exact-model still remains visible */
          },
        )
        map.flipY = false
        map.colorSpace = THREE.SRGBColorSpace
        map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      },
      undefined,
      () => {
        /* the exact-model still remains visible */
      },
    )
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      intersection.disconnect()
      if (root) release(root)
      map?.dispose()
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [geometry, texture])
  return (
    <div
      className="relative h-[760px] w-[704px] drop-shadow-[30px_50px_60px_rgba(20,22,30,0.45)]"
      role="img"
      aria-label={alt}
      data-case-geometry={geometry}
      onPointerEnter={() => {
        paused.current = true
      }}
      onPointerLeave={() => {
        paused.current = false
      }}
    >
      {!ready && still && (
        <img src={still} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}
      <div ref={host} className="absolute left-0 top-1/2 h-[704px] w-full -translate-y-1/2" />
    </div>
  )
}
