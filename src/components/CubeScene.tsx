import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MOVE_SPECS, type Move, type MoveBase } from '../lib/notation'

export type CubeSceneHandle = {
  execute: (move: Move, duration?: number) => Promise<void>
  reset: () => void
}

const stickerColors = {
  right: 0xf05238,
  left: 0xff9e2b,
  top: 0xf7f3df,
  bottom: 0xf4cf3d,
  front: 0x36a769,
  back: 0x4c6ee8,
}

export const CubeScene = forwardRef<CubeSceneHandle>(function CubeScene(_, ref) {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<CubeSceneHandle | null>(null)

  useImperativeHandle(ref, () => ({
    execute: (move, duration) => apiRef.current?.execute(move, duration) ?? Promise.resolve(),
    reset: () => apiRef.current?.reset(),
  }), [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const host = mount

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(6.2, 5.1, 7.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 6
    controls.maxDistance = 13
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.55
    controls.target.set(0, 0, 0)

    scene.add(new THREE.HemisphereLight(0xfff8e9, 0x1c2641, 2.6))
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.1)
    keyLight.position.set(4, 8, 7)
    keyLight.castShadow = true
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x738bff, 2.8)
    rimLight.position.set(-6, 1, -5)
    scene.add(rimLight)

    const cubeRoot = new THREE.Group()
    scene.add(cubeRoot)
    const cubies: THREE.Group[] = []
    const bodyGeometry = new THREE.BoxGeometry(0.94, 0.94, 0.94, 2, 2, 2)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.36, metalness: 0.02 })
    const stickerGeometry = new THREE.PlaneGeometry(0.76, 0.76)
    const stickerMaterials = Object.fromEntries(
      Object.entries(stickerColors).map(([key, color]) => [key, new THREE.MeshStandardMaterial({ color, roughness: 0.52 })]),
    ) as Record<keyof typeof stickerColors, THREE.MeshStandardMaterial>

    function addSticker(cubie: THREE.Group, side: keyof typeof stickerColors, position: THREE.Vector3, rotation: THREE.Euler) {
      const sticker = new THREE.Mesh(stickerGeometry, stickerMaterials[side])
      sticker.position.copy(position)
      sticker.rotation.copy(rotation)
      cubie.add(sticker)
    }

    function buildCube() {
      cubies.splice(0).forEach((cubie) => cubeRoot.remove(cubie))
      for (let x = -1; x <= 1; x += 1) {
        for (let y = -1; y <= 1; y += 1) {
          for (let z = -1; z <= 1; z += 1) {
            if (x === 0 && y === 0 && z === 0) continue
            const cubie = new THREE.Group()
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
            body.castShadow = true
            body.receiveShadow = true
            cubie.add(body)
            if (x === 1) addSticker(cubie, 'right', new THREE.Vector3(0.476, 0, 0), new THREE.Euler(0, Math.PI / 2, 0))
            if (x === -1) addSticker(cubie, 'left', new THREE.Vector3(-0.476, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0))
            if (y === 1) addSticker(cubie, 'top', new THREE.Vector3(0, 0.476, 0), new THREE.Euler(-Math.PI / 2, 0, 0))
            if (y === -1) addSticker(cubie, 'bottom', new THREE.Vector3(0, -0.476, 0), new THREE.Euler(Math.PI / 2, 0, 0))
            if (z === 1) addSticker(cubie, 'front', new THREE.Vector3(0, 0, 0.476), new THREE.Euler(0, 0, 0))
            if (z === -1) addSticker(cubie, 'back', new THREE.Vector3(0, 0, -0.476), new THREE.Euler(0, Math.PI, 0))
            cubie.position.set(x, y, z)
            cubie.userData.grid = new THREE.Vector3(x, y, z)
            cubeRoot.add(cubie)
            cubies.push(cubie)
          }
        }
      }
    }

    let running = false
    async function execute(move: Move, duration = 300) {
      if (running) return
      running = true
      controls.autoRotate = false
      const base = move.replace(/[2']/g, '') as MoveBase
      const definition = MOVE_SPECS[base]
      const turns = move.endsWith('2') ? 2 : 1
      const prime = move.endsWith("'") ? -1 : 1

      for (let turn = 0; turn < turns; turn += 1) {
        await new Promise<void>((resolve) => {
          const pivot = new THREE.Group()
          cubeRoot.add(pivot)
          const selected = cubies.filter((cubie) => definition.layers.includes(Math.round(cubie.userData.grid[definition.axis])))
          selected.forEach((cubie) => pivot.attach(cubie))
          const start = performance.now()
          const targetAngle = definition.quarter * Math.PI / 2 * prime
          const axisVector = new THREE.Vector3(
            definition.axis === 'x' ? 1 : 0,
            definition.axis === 'y' ? 1 : 0,
            definition.axis === 'z' ? 1 : 0,
          )

          function animateTurn(now: number) {
            const progress = Math.min((now - start) / Math.max(duration, 1), 1)
            const eased = 1 - Math.pow(1 - progress, 4)
            pivot.rotation[definition.axis] = targetAngle * eased
            if (progress < 1) {
              requestAnimationFrame(animateTurn)
              return
            }
            pivot.updateMatrixWorld(true)
            selected.forEach((cubie) => {
              cubeRoot.attach(cubie)
              const grid = cubie.userData.grid as THREE.Vector3
              grid.applyAxisAngle(axisVector, targetAngle)
              grid.set(Math.round(grid.x), Math.round(grid.y), Math.round(grid.z))
              cubie.position.set(Math.round(cubie.position.x), Math.round(cubie.position.y), Math.round(cubie.position.z))
              cubie.quaternion.x = Math.round(cubie.quaternion.x * 1e6) / 1e6
              cubie.quaternion.y = Math.round(cubie.quaternion.y * 1e6) / 1e6
              cubie.quaternion.z = Math.round(cubie.quaternion.z * 1e6) / 1e6
              cubie.quaternion.w = Math.round(cubie.quaternion.w * 1e6) / 1e6
            })
            cubeRoot.remove(pivot)
            resolve()
          }
          requestAnimationFrame(animateTurn)
        })
      }
      running = false
    }

    buildCube()
    apiRef.current = { execute, reset: buildCube }

    function resize() {
      const { clientWidth, clientHeight } = host
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let frame = 0
    function render() {
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    render()

    return () => {
      apiRef.current = null
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      bodyGeometry.dispose()
      stickerGeometry.dispose()
      bodyMaterial.dispose()
      Object.values(stickerMaterials).forEach((material) => material.dispose())
      renderer.domElement.remove()
    }
  }, [])

  return <div className="cube-scene" ref={mountRef} aria-label="Interactive 3D Rubik's Cube. Drag to rotate the view." />
})
