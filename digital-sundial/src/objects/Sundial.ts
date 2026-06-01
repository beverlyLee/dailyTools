import * as THREE from 'three'

const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

export class Sundial {
  public group: THREE.Group
  public gnomon: THREE.Group
  public dialFace: THREE.Mesh
  public hourMarkers: THREE.Group
  public shadowLine: THREE.Line
  public highlightRing: THREE.Mesh
  private hourMeshes: THREE.Mesh[] = []
  public latitude: number

  constructor(latitude: number = 39.9042) {
    this.latitude = latitude
    this.group = new THREE.Group()

    this.dialFace = this.createDialFace()
    this.group.add(this.dialFace)

    this.hourMarkers = this.createHourMarkers()
    this.group.add(this.hourMarkers)

    this.gnomon = this.createGnomon()
    this.group.add(this.gnomon)

    this.shadowLine = this.createShadowLine()
    this.group.add(this.shadowLine)

    this.highlightRing = this.createHighlightRing()
    this.group.add(this.highlightRing)
  }

  private createDialFace(): THREE.Mesh {
    const dialGeometry = new THREE.CylinderGeometry(5, 5, 0.3, 128)
    const dialMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc,
      roughness: 0.8,
      metalness: 0.1
    })
    const dial = new THREE.Mesh(dialGeometry, dialMaterial)
    dial.receiveShadow = true
    dial.position.y = -0.15

    const ringGeometry = new THREE.TorusGeometry(5, 0.15, 16, 128)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
      metalness: 0.3
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.01
    dial.add(ring)

    const northMarker = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x8b0000 })
    )
    northMarker.position.set(0, 0.1, 4.7)
    northMarker.rotation.x = -Math.PI / 2
    dial.add(northMarker)

    return dial
  }

  private createHourMarkers(): THREE.Group {
    const markersGroup = new THREE.Group()
    const radius = 4.2

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2

      const x = Math.sin(angle) * radius
      const z = Math.cos(angle) * radius

      const markerGroup = new THREE.Group()
      markerGroup.position.set(x, 0.02, z)

      const lineGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.6)
      const lineMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        roughness: 0.5
      })
      const line = new THREE.Mesh(lineGeometry, lineMaterial)
      line.rotation.y = angle
      markerGroup.add(line)

      const textCanvas = this.createTextCanvas(ROMAN_NUMERALS[i])
      const textTexture = new THREE.CanvasTexture(textCanvas)
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
      })
      const textGeometry = new THREE.PlaneGeometry(0.8, 0.4)
      const textMesh = new THREE.Mesh(textGeometry, textMaterial)
      textMesh.position.set(0, 0.03, 0.5)
      textMesh.rotation.y = angle
      markerGroup.add(textMesh)

      const hitGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32)
      const hitMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0
      })
      const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial)
      hitMesh.position.set(0, 0.05, 0)
      hitMesh.userData = { hourIndex: i, hour: i === 0 ? 12 : i }
      markerGroup.add(hitMesh)
      this.hourMeshes.push(hitMesh)

      markersGroup.add(markerGroup)
    }

    const innerCircleGeometry = new THREE.TorusGeometry(1.5, 0.05, 16, 128)
    const innerCircleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6
    })
    const innerCircle = new THREE.Mesh(innerCircleGeometry, innerCircleMaterial)
    innerCircle.rotation.x = Math.PI / 2
    innerCircle.position.y = 0.02
    markersGroup.add(innerCircle)

    return markersGroup
  }

  private createTextCanvas(text: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.font = 'bold 72px "Times New Roman", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#2c1810'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    return canvas
  }

  private createGnomon(): THREE.Group {
    const gnomonGroup = new THREE.Group()

    const gnomonLength = 4.5
    const latitudeRad = THREE.MathUtils.degToRad(this.latitude)

    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.6,
      metalness: 0.3
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.position.y = 0.15
    base.castShadow = true
    gnomonGroup.add(base)

    const needleGeometry = new THREE.CylinderGeometry(0.06, 0.06, gnomonLength, 12)
    const needleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c1810,
      roughness: 0.4,
      metalness: 0.6
    })
    const needle = new THREE.Mesh(needleGeometry, needleMaterial)

    needle.rotation.x = -(Math.PI / 2 - latitudeRad)
    needle.position.z = gnomonLength / 2 * Math.sin(latitudeRad)
    needle.position.y = gnomonLength / 2 * Math.cos(latitudeRad)

    needle.castShadow = true
    gnomonGroup.add(needle)

    const tipGeometry = new THREE.SphereGeometry(0.1, 16, 16)
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.2,
      metalness: 0.9
    })
    const tip = new THREE.Mesh(tipGeometry, tipMaterial)

    const tipY = gnomonLength * Math.cos(latitudeRad)
    const tipZ = gnomonLength * Math.sin(latitudeRad)
    tip.position.set(0, tipY, tipZ)
    tip.castShadow = true
    gnomonGroup.add(tip)

    return gnomonGroup
  }

  public getGnomonTipWorld(): THREE.Vector3 {
    const gnomonLength = 4.5
    const latitudeRad = THREE.MathUtils.degToRad(this.latitude)
    const tipY = gnomonLength * Math.cos(latitudeRad)
    const tipZ = gnomonLength * Math.sin(latitudeRad)

    return new THREE.Vector3(0, tipY, tipZ)
  }

  public getGnomonBaseWorld(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0)
  }

  private createShadowLine(): THREE.Line {
    const points = [
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(0, 0.01, 0)
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    })
    const line = new THREE.Line(geometry, material)
    line.visible = false
    return line
  }

  private createHighlightRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.6, 0.8, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.position.y = 0.03
    return ring
  }

  public updateShadow(shadowEndX: number, shadowEndZ: number, hourIndex: number | null): void {
    const positions = this.shadowLine.geometry.attributes.position.array as Float32Array
    positions[3] = shadowEndX
    positions[5] = shadowEndZ
    this.shadowLine.geometry.attributes.position.needsUpdate = true
    this.shadowLine.visible = true

    this.hourMeshes.forEach((mesh, i) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (i === hourIndex) {
        material.opacity = 0.3
        material.color.setHex(0xffd700)
      } else {
        material.opacity = 0
      }
    })

    if (hourIndex !== null) {
      const radius = 4.2
      const angle = (hourIndex / 12) * Math.PI * 2
      const x = Math.sin(angle) * radius
      const z = Math.cos(angle) * radius

      this.highlightRing.position.set(x, 0.05, z)
      const highlightMaterial = this.highlightRing.material as THREE.MeshBasicMaterial
      highlightMaterial.opacity = 0.8
    } else {
      const highlightMaterial = this.highlightRing.material as THREE.MeshBasicMaterial
      highlightMaterial.opacity = 0
    }
  }

  public hideShadow(): void {
    this.shadowLine.visible = false
    const highlightMaterial = this.highlightRing.material as THREE.MeshBasicMaterial
    highlightMaterial.opacity = 0

    this.hourMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = 0
    })
  }

  public getHourIndexFromShadow(shadowX: number, shadowZ: number): { hourIndex: number | null; minutes: number } {
    const distFromCenter = Math.sqrt(shadowX * shadowX + shadowZ * shadowZ)
    if (distFromCenter < 1.0 || distFromCenter > 5.5) {
      return { hourIndex: null, minutes: 0 }
    }

    let angle = Math.atan2(shadowX, shadowZ)
    if (angle < 0) angle += Math.PI * 2

    const rawIndex = (angle / (Math.PI * 2)) * 12
    const hourIndex = Math.round(rawIndex) % 12
    const minutes = Math.round((rawIndex % 1) * 60)

    return { hourIndex, minutes }
  }

  public getRomanNumeral(index: number): string {
    return ROMAN_NUMERALS[index]
  }

  public getHourFromIndex(index: number): number {
    return index
  }
}
