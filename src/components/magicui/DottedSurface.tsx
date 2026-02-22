import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface DottedSurfaceProps {
  dark?: boolean
  className?: string
}

export function DottedSurface({ dark = false, className = '' }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const SEPARATION = 150
    const AMOUNTX = 40
    const AMOUNTY = 60

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xffffff, 2000, 10000)

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      1,
      10000,
    )
    camera.position.set(0, 355, 1220)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(scene.fog.color, 0)

    container.appendChild(renderer.domElement)

    const positions: number[] = []
    const colors: number[] = []
    const geometry = new THREE.BufferGeometry()

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        )
        if (dark) {
          colors.push(200, 200, 200)
        } else {
          colors.push(0, 0, 0)
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let count = 0
    let animationId: number

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const posAttr = geometry.attributes.position
      const pos = posAttr.array as Float32Array

      let i = 0
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50
          i++
        }
      }

      posAttr.needsUpdate = true
      renderer.render(scene, camera)
      count += 0.1
    }

    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)

      scene.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })

      renderer.dispose()
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [dark])

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
    />
  )
}
