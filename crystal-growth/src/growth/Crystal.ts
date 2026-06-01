import * as THREE from 'three'
import { GlowShaderMaterial, OuterGlowMaterial } from '../shaders/GlowShader'

interface CrystalSegment {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  depth: number
  color: THREE.Color
  direction: THREE.Vector3
}

interface BranchSpec {
  direction: THREE.Vector3
  length: number
  radius: number
  rotJitterX: number
  rotJitterY: number
  rotJitterZ: number
  color: THREE.Color
  seed: number
}

export class Crystal {
  private scene: THREE.Scene
  private segments: CrystalSegment[] = []
  private instancedMeshes: THREE.InstancedMesh[] = []
  private glowMeshes: THREE.InstancedMesh[] = []
  private outerGlowMeshes: THREE.InstancedMesh[] = []
  private coreMesh!: THREE.Mesh
  private coreGlowMesh!: THREE.Mesh
  private coreOuterGlowMesh!: THREE.Mesh

  private maxDepth = 7
  private baseSize = 1.0
  private sizeDecay = 0.72
  private growthProgress = 0
  private targetSegments = 0
  private dummy = new THREE.Object3D()
  private globalSeed: number = 0
  private prismGeometry: THREE.CylinderGeometry | null = null

  private readonly depthGroupCount = 4
  private segmentGroups: CrystalSegment[][]

  private crystalColors = [
    new THREE.Color(0x64c8ff),
    new THREE.Color(0x9678ff),
    new THREE.Color(0x64ffe1),
    new THREE.Color(0xff96d2),
    new THREE.Color(0xffc864),
    new THREE.Color(0xc8ff64),
  ]

  private depthMaterialPresets = [
    { transmission: 0.7, roughness: 0.05, thickness: 0.8, clearcoat: 1.0, ior: 1.5, opacity: 0.92 },
    { transmission: 0.6, roughness: 0.08, thickness: 0.65, clearcoat: 0.9, ior: 1.45, opacity: 0.88 },
    { transmission: 0.45, roughness: 0.12, thickness: 0.5, clearcoat: 0.7, ior: 1.4, opacity: 0.82 },
    { transmission: 0.3, roughness: 0.18, thickness: 0.4, clearcoat: 0.5, ior: 1.35, opacity: 0.75 },
  ]

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.segmentGroups = []
    for (let i = 0; i < this.depthGroupCount; i++) {
      this.segmentGroups.push([])
    }
    this.generateSegments()
    this.createMeshes()
  }

  private hash(seed: number, salt: number = 0): number {
    let x = Math.sin(seed + salt * 127.1) * 43758.5453123
    return x - Math.floor(x)
  }

  private hashInt(seed: number, salt: number, min: number, max: number): number {
    return Math.floor(this.hash(seed, salt) * (max - min + 1)) + min
  }

  private hashFloat(seed: number, salt: number, min: number, max: number): number {
    return this.hash(seed, salt) * (max - min) + min
  }

  private generateSegments() {
    this.segments = []
    for (let i = 0; i < this.depthGroupCount; i++) {
      this.segmentGroups[i] = []
    }
    this.globalSeed = Math.random() * 100000
    this.growFromCore(new THREE.Vector3(0, 0, 0), this.baseSize, this.globalSeed)
    this.targetSegments = this.segments.length
  }

  private growFromCore(corePos: THREE.Vector3, coreSize: number, seed: number) {
    const axisDirs: THREE.Vector3[] = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ]

    for (let i = 0; i < 3; i++) {
      const pairSeed = seed + i * 10000
      const spec = this.computeBranchSpec(pairSeed, 0, 0.75, 1.15, 0.6, 0.9, 0.5, 0.05)

      this.createBranchPair(corePos, coreSize, axisDirs[i], spec, pairSeed)
    }

    const numDiag = this.hashInt(seed, 999, 1, 2)
    for (let i = 0; i < numDiag; i++) {
      const diagSeed = seed + 50000 + i * 10000
      const sx = i === 0 ? 1 : -1
      const sy = 1
      const sz = 1
      const diagDir = new THREE.Vector3(sx, sy, sz).normalize()
      const spec = this.computeBranchSpec(diagSeed, 0, 0.5, 0.8, 0.4, 0.7, 0.3, 0.035)

      this.createBranchPair(corePos, coreSize, diagDir, spec, diagSeed)
    }
  }

  private computeBranchSpec(
    seed: number,
    depth: number,
    lenMin: number,
    lenMax: number,
    radMin: number,
    radMax: number,
    jitterScale: number,
    rotJitterScale: number
  ): BranchSpec {
    const sizeFactor = Math.pow(this.sizeDecay, depth + 1)
    const depthFactor = 1 - depth / this.maxDepth * 0.35

    const length = this.baseSize * sizeFactor * this.hashFloat(seed, 1, lenMin, lenMax) * depthFactor
    const radius = this.baseSize * sizeFactor * 0.6 * this.hashFloat(seed, 2, radMin, radMax) * depthFactor

    const angleJitter = 0.18
    const jitterX = this.hashFloat(seed, 3, -1, 1) * angleJitter * jitterScale
    const jitterY = this.hashFloat(seed, 4, -1, 1) * angleJitter * jitterScale
    const jitterZ = this.hashFloat(seed, 5, -1, 1) * angleJitter * jitterScale

    const direction = new THREE.Vector3(jitterX, jitterY, jitterZ)

    const rotJitterX = this.hashFloat(seed, 6, -1, 1) * rotJitterScale
    const rotJitterY = this.hashFloat(seed, 7, -1, 1) * rotJitterScale
    const rotJitterZ = this.hashFloat(seed, 8, -1, 1) * rotJitterScale

    const colorIndex = depth % this.crystalColors.length
    const baseColor = this.crystalColors[colorIndex].clone()
    const hueShift = this.hashFloat(seed, 9, -0.03, 0.03)
    const lightShift = this.hashFloat(seed, 10, -0.08, 0.08)
    baseColor.offsetHSL(hueShift, 0, lightShift)

    return {
      direction,
      length,
      radius,
      rotJitterX,
      rotJitterY,
      rotJitterZ,
      color: baseColor,
      seed,
    }
  }

  private createBranchPair(
    parentPos: THREE.Vector3,
    parentLength: number,
    canonicalDir: THREE.Vector3,
    spec: BranchSpec,
    seed: number
  ) {
    const dirA = canonicalDir.clone().add(spec.direction).normalize()
    const dirB = canonicalDir.clone().negate().add(spec.direction.clone().negate()).normalize()

    this.createBranch(parentPos, parentLength, dirA, spec.length, spec.radius,
      spec.rotJitterX, spec.rotJitterY, spec.rotJitterZ, spec.color, 0, seed)
    this.createBranch(parentPos, parentLength, dirB, spec.length, spec.radius,
      -spec.rotJitterX, -spec.rotJitterY, -spec.rotJitterZ, spec.color, 0, seed)
  }

  private createBranch(
    parentPos: THREE.Vector3,
    parentLength: number,
    direction: THREE.Vector3,
    length: number,
    radius: number,
    rotJitterX: number,
    rotJitterY: number,
    rotJitterZ: number,
    color: THREE.Color,
    depth: number,
    seed: number
  ) {
    const offsetDistance = parentLength * 0.5 + length * 0.5 + 0.05
    const position = parentPos
      .clone()
      .add(direction.clone().multiplyScalar(offsetDistance))

    const scale = new THREE.Vector3(radius, length, radius)

    const rotation = new THREE.Euler()
    rotation.setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      )
    )
    rotation.x += rotJitterX
    rotation.y += rotJitterY
    rotation.z += rotJitterZ

    const segment: CrystalSegment = {
      position,
      rotation,
      scale,
      depth: depth + 1,
      color: color.clone(),
      direction: direction.clone(),
    }
    this.segments.push(segment)

    const groupIndex = Math.min(
      this.depthGroupCount - 1,
      Math.floor((segment.depth / (this.maxDepth + 1)) * this.depthGroupCount)
    )
    this.segmentGroups[groupIndex].push(segment)

    if (depth + 1 >= this.maxDepth) return

    const growthChance = Math.max(0.35, 0.82 - depth * 0.085)
    if (this.hash(seed, depth * 50 + 100) < growthChance) {
      this.growBranchChildren(segment, seed)
    }
  }

  private growBranchChildren(parent: CrystalSegment, seed: number) {
    const depth = parent.depth
    const endPos = parent.position
      .clone()
      .add(parent.direction.clone().multiplyScalar(parent.scale.y * 0.5))

    const numEndBranches = this.hashInt(seed, 100, 1, 2)

    for (let i = 0; i < numEndBranches; i++) {
      const childSeed = seed + depth * 10000 + i * 500
      this.createChildBranchPair(parent, endPos, parent.scale.y, childSeed, false)
    }

    if (depth >= 2) {
      const numSideBranches = this.hashInt(seed, 200, 0, 1)
      for (let i = 0; i < numSideBranches; i++) {
        const sideSeed = seed + 77000 + i * 300
        const t = this.hashFloat(sideSeed, 3, 0.35, 0.75)
        const sideOrigin = parent.position
          .clone()
          .add(parent.direction.clone().multiplyScalar(parent.scale.y * (t - 0.5)))

        this.createChildBranchPair(parent, sideOrigin, parent.scale.y * 0.6, sideSeed, true)
      }
    }
  }

  private createChildBranchPair(
    parent: CrystalSegment,
    origin: THREE.Vector3,
    parentLen: number,
    seed: number,
    isSide: boolean
  ) {
    const depth = parent.depth
    const baseDir = parent.direction.clone()

    const polarMin = isSide ? 0.6 : 0.3
    const polarMax = isSide ? 0.95 : 0.7
    const polarAngle = this.hashFloat(seed, 1, polarMin, polarMax) * Math.PI
    const azimuthAngle = this.hashFloat(seed, 2, 0, 2 * Math.PI)

    const tangent = new THREE.Vector3()
    if (Math.abs(baseDir.y) < 0.99) {
      tangent.crossVectors(baseDir, new THREE.Vector3(0, 1, 0)).normalize()
    } else {
      tangent.crossVectors(baseDir, new THREE.Vector3(1, 0, 0)).normalize()
    }
    const bitangent = new THREE.Vector3().crossVectors(baseDir, tangent).normalize()

    const localDir = new THREE.Vector3()
    localDir.copy(baseDir).multiplyScalar(Math.cos(polarAngle))
    localDir.add(tangent.clone().multiplyScalar(Math.sin(polarAngle) * Math.cos(azimuthAngle)))
    localDir.add(bitangent.clone().multiplyScalar(Math.sin(polarAngle) * Math.sin(azimuthAngle)))
    localDir.normalize()

    const sizeFactor = Math.pow(this.sizeDecay, depth + 1)
    const depthFactor = 1 - depth / this.maxDepth * 0.4

    const lenVar = isSide ? 0.45 : 0.7
    const lenVarMax = isSide ? 0.8 : 1.1
    const length = this.baseSize * sizeFactor * this.hashFloat(seed, 3, lenVar, lenVarMax) * depthFactor
    const radius = this.baseSize * sizeFactor * 0.55 * this.hashFloat(seed, 4, 0.55, 0.9) * depthFactor

    const rotJitterX = this.hashFloat(seed, 5, -1, 1) * 0.06
    const rotJitterY = this.hashFloat(seed, 6, -1, 1) * 0.06
    const rotJitterZ = this.hashFloat(seed, 7, -1, 1) * 0.06

    const colorIndex = (depth + (isSide ? 1 : 0)) % this.crystalColors.length
    const baseColor = this.crystalColors[colorIndex].clone()
    const hueShift = this.hashFloat(seed, 8, -0.04, 0.04)
    const lightShift = this.hashFloat(seed, 9, -0.1, 0.1)
    baseColor.offsetHSL(hueShift, 0, lightShift)

    this.createBranch(
      origin, parentLen, localDir, length, radius,
      rotJitterX, rotJitterY, rotJitterZ, baseColor, depth, seed
    )

    const mirrorDir = localDir.clone().negate()
    this.createBranch(
      origin, parentLen, mirrorDir, length, radius,
      -rotJitterX, -rotJitterY, -rotJitterZ, baseColor, depth, seed
    )
  }

  private createMeshes() {
    const coreGeometry = new THREE.BoxGeometry(
      this.baseSize,
      this.baseSize,
      this.baseSize
    )
    const coreMat = this.depthMaterialPresets[0]
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: coreMat.opacity,
      roughness: coreMat.roughness,
      metalness: 0.15,
      transmission: coreMat.transmission,
      thickness: coreMat.thickness,
      clearcoat: coreMat.clearcoat,
      clearcoatRoughness: 0.05,
      ior: coreMat.ior,
      attenuationColor: new THREE.Color(0x88ccff),
      attenuationDistance: 3.0,
      side: THREE.DoubleSide,
      color: this.crystalColors[0],
    })
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial)
    this.scene.add(this.coreMesh)

    const coreGlowMaterial = new GlowShaderMaterial()
    this.coreGlowMesh = new THREE.Mesh(coreGeometry.clone(), coreGlowMaterial)
    this.coreGlowMesh.scale.set(1.3, 1.3, 1.3)
    this.scene.add(this.coreGlowMesh)

    const coreOuterGlowMaterial = new OuterGlowMaterial()
    this.coreOuterGlowMesh = new THREE.Mesh(coreGeometry.clone(), coreOuterGlowMaterial)
    this.coreOuterGlowMesh.scale.set(1.8, 1.8, 1.8)
    this.scene.add(this.coreOuterGlowMesh)

    this.prismGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, false)

    for (let g = 0; g < this.depthGroupCount; g++) {
      const preset = this.depthMaterialPresets[g]
      const prismMaterial = new THREE.MeshPhysicalMaterial({
        transparent: true,
        opacity: preset.opacity,
        roughness: preset.roughness,
        metalness: 0.1,
        transmission: preset.transmission,
        thickness: preset.thickness,
        clearcoat: preset.clearcoat,
        clearcoatRoughness: 0.05,
        ior: preset.ior,
        attenuationColor: this.crystalColors[g % this.crystalColors.length],
        attenuationDistance: 2.0 + g * 1.0,
        side: THREE.DoubleSide,
      })

      const count = Math.max(this.segmentGroups[g].length, 1)
      const im = new THREE.InstancedMesh(this.prismGeometry, prismMaterial, count)
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.scene.add(im)
      this.instancedMeshes.push(im)

      const glowMaterial = new GlowShaderMaterial()
      const gm = new THREE.InstancedMesh(this.prismGeometry, glowMaterial, count)
      gm.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.scene.add(gm)
      this.glowMeshes.push(gm)

      const outerGlowMaterial = new OuterGlowMaterial()
      const ogm = new THREE.InstancedMesh(this.prismGeometry, outerGlowMaterial, count)
      ogm.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.scene.add(ogm)
      this.outerGlowMeshes.push(ogm)
    }

    this.updateInstancedMeshes(0)
  }

  private updateInstancedMeshes(progress: number) {
    const visibleTotal = Math.floor(this.segments.length * progress)

    let visibleSoFar = 0
    for (let g = 0; g < this.depthGroupCount; g++) {
      const group = this.segmentGroups[g]
      const groupVisible = Math.max(0, Math.min(group.length, visibleTotal - visibleSoFar))

      for (let i = 0; i < groupVisible; i++) {
        const segment = group[i]
        this.dummy.position.copy(segment.position)
        this.dummy.rotation.copy(segment.rotation)
        this.dummy.scale.copy(segment.scale)
        this.dummy.updateMatrix()

        this.instancedMeshes[g].setMatrixAt(i, this.dummy.matrix)
        this.instancedMeshes[g].setColorAt(i, segment.color)

        const glowScale = segment.scale.clone().multiplyScalar(1.35)
        this.dummy.scale.copy(glowScale)
        this.dummy.updateMatrix()
        this.glowMeshes[g].setMatrixAt(i, this.dummy.matrix)
        this.glowMeshes[g].setColorAt(i, segment.color)

        const outerGlowScale = segment.scale.clone().multiplyScalar(1.85)
        this.dummy.scale.copy(outerGlowScale)
        this.dummy.updateMatrix()
        this.outerGlowMeshes[g].setMatrixAt(i, this.dummy.matrix)
        this.outerGlowMeshes[g].setColorAt(i, segment.color)
      }

      const im = this.instancedMeshes[g]
      const gm = this.glowMeshes[g]
      const ogm = this.outerGlowMeshes[g]

      im.count = groupVisible
      im.instanceMatrix.needsUpdate = true
      const imColor = im.instanceColor
      if (imColor) imColor.needsUpdate = true

      gm.count = groupVisible
      gm.instanceMatrix.needsUpdate = true
      const gmColor = gm.instanceColor
      if (gmColor) gmColor.needsUpdate = true

      ogm.count = groupVisible
      ogm.instanceMatrix.needsUpdate = true
      const ogmColor = ogm.instanceColor
      if (ogmColor) ogmColor.needsUpdate = true

      visibleSoFar += group.length
    }
  }

  public update(deltaTime: number) {
    if (this.growthProgress < 1) {
      this.growthProgress = Math.min(1, this.growthProgress + deltaTime * 0.1)
      this.updateInstancedMeshes(this.growthProgress)
    }
  }

  public rotate(angleX: number, angleY: number) {
    for (let g = 0; g < this.depthGroupCount; g++) {
      this.instancedMeshes[g].rotation.x = angleX
      this.instancedMeshes[g].rotation.y = angleY
      this.glowMeshes[g].rotation.x = angleX
      this.glowMeshes[g].rotation.y = angleY
      this.outerGlowMeshes[g].rotation.x = angleX
      this.outerGlowMeshes[g].rotation.y = angleY
    }
    this.coreMesh.rotation.x = angleX
    this.coreMesh.rotation.y = angleY
    this.coreGlowMesh.rotation.x = angleX
    this.coreGlowMesh.rotation.y = angleY
    this.coreOuterGlowMesh.rotation.x = angleX
    this.coreOuterGlowMesh.rotation.y = angleY
  }

  public updateGlowCamera(cameraPos: THREE.Vector3) {
    for (let g = 0; g < this.depthGroupCount; g++) {
      const innerMat = this.glowMeshes[g].material as GlowShaderMaterial
      if (innerMat.uniforms && innerMat.uniforms.uCameraPos) {
        innerMat.uniforms.uCameraPos.value.copy(cameraPos)
      }
      const outerMat = this.outerGlowMeshes[g].material as OuterGlowMaterial
      if (outerMat.uniforms && outerMat.uniforms.uCameraPos) {
        outerMat.uniforms.uCameraPos.value.copy(cameraPos)
      }
    }
    const innerCoreMat = this.coreGlowMesh.material as GlowShaderMaterial
    if (innerCoreMat.uniforms && innerCoreMat.uniforms.uCameraPos) {
      innerCoreMat.uniforms.uCameraPos.value.copy(cameraPos)
    }
    const outerCoreMat = this.coreOuterGlowMesh.material as OuterGlowMaterial
    if (outerCoreMat.uniforms && outerCoreMat.uniforms.uCameraPos) {
      outerCoreMat.uniforms.uCameraPos.value.copy(cameraPos)
    }
  }

  public reset() {
    for (let g = 0; g < this.depthGroupCount; g++) {
      this.scene.remove(this.instancedMeshes[g])
      this.scene.remove(this.glowMeshes[g])
      this.scene.remove(this.outerGlowMeshes[g])
      this.instancedMeshes[g].geometry.dispose()
      const mm = this.instancedMeshes[g].material
      if (Array.isArray(mm)) mm.forEach(m => m.dispose()); else mm.dispose()
      this.glowMeshes[g].geometry.dispose()
      const gm = this.glowMeshes[g].material
      if (Array.isArray(gm)) gm.forEach(m => m.dispose()); else gm.dispose()
      this.outerGlowMeshes[g].geometry.dispose()
      const og = this.outerGlowMeshes[g].material
      if (Array.isArray(og)) og.forEach(m => m.dispose()); else og.dispose()
    }
    this.instancedMeshes = []
    this.glowMeshes = []
    this.outerGlowMeshes = []

    this.scene.remove(this.coreMesh)
    this.scene.remove(this.coreGlowMesh)
    this.scene.remove(this.coreOuterGlowMesh)
    this.coreMesh.geometry.dispose()
    ;(this.coreMesh.material as THREE.Material).dispose()
    this.coreGlowMesh.geometry.dispose()
    ;(this.coreGlowMesh.material as THREE.Material).dispose()
    this.coreOuterGlowMesh.geometry.dispose()
    ;(this.coreOuterGlowMesh.material as THREE.Material).dispose()

    this.growthProgress = 0
    this.generateSegments()
    this.createMeshes()
  }

  public getGrowthProgress(): number {
    return this.growthProgress
  }

  public getSegmentCount(): number {
    return this.targetSegments
  }
}
