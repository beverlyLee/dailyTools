import * as THREE from 'three'

export interface FaceData {
  indices: number[]
  normal: THREE.Vector3
  center: THREE.Vector3
  vertices: THREE.Vector3[]
  color: THREE.Color
  area: number
}

export interface UnfoldedFace {
  face: FaceData
  faceIndex: number
  vertices2D: THREE.Vector2[]
  isFoldEdge: boolean[]
  isCutEdge: boolean[]
  parentEdge: number | null
  parentFace: number | null
  children: { faceIndex: number; sharedEdge: number }[]
  bounds: { min: THREE.Vector2; max: THREE.Vector2 }
  labelSize: number
}

export interface LabelData {
  text: string
  position: THREE.Vector2
  index: number
  size: number
}

export interface UnfoldResult {
  geometries: THREE.BufferGeometry[]
  cutLines: THREE.LineSegments
  foldLines: THREE.LineSegments
  labels: LabelData[]
  totalBounds: { min: THREE.Vector2; max: THREE.Vector2 }
  maxLabelSize: number
  lineWidth: number
}

export class Unfolder {
  private geometry: THREE.BufferGeometry
  private faces: FaceData[] = []
  private edgeToFaces: Map<string, { faceIndex: number; edgeIndex: number }[]> =
    new Map()
  private faceAdjacency: Map<number, { neighbor: number; sharedEdge: number; neighborEdge: number }[]> =
    new Map()
  private readonly LINE_WIDTH = 0.05

  constructor(geometry: THREE.BufferGeometry) {
    this.geometry = geometry.clone()
    this.extractFaces()
    this.buildEdgeMap()
    this.buildFaceAdjacency()
  }

  private extractFaces(): void {
    const positions = this.geometry.getAttribute('position')
    const colors = this.geometry.getAttribute('color')
    const indices = this.geometry.getIndex()

    if (!indices) return

    for (let i = 0; i < indices.count; i += 3) {
      const idx0 = indices.getX(i)
      const idx1 = indices.getX(i + 1)
      const idx2 = indices.getX(i + 2)

      const v0 = new THREE.Vector3(
        positions.getX(idx0),
        positions.getY(idx0),
        positions.getZ(idx0)
      )
      const v1 = new THREE.Vector3(
        positions.getX(idx1),
        positions.getY(idx1),
        positions.getZ(idx1)
      )
      const v2 = new THREE.Vector3(
        positions.getX(idx2),
        positions.getY(idx2),
        positions.getZ(idx2)
      )

      const edge1 = new THREE.Vector3().subVectors(v1, v0)
      const edge2 = new THREE.Vector3().subVectors(v2, v0)
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
      const area = edge1.cross(edge2).length() / 2

      const center = new THREE.Vector3()
        .add(v0)
        .add(v1)
        .add(v2)
        .divideScalar(3)

      const color = new THREE.Color(
        colors ? colors.getX(idx0) : 0.8,
        colors ? colors.getY(idx0) : 0.6,
        colors ? colors.getZ(idx0) : 0.4
      )

      this.faces.push({
        indices: [idx0, idx1, idx2],
        normal,
        center,
        vertices: [v0, v1, v2],
        color,
        area,
      })
    }
  }

  private buildEdgeMap(): void {
    this.edgeToFaces.clear()

    for (let faceIdx = 0; faceIdx < this.faces.length; faceIdx++) {
      const face = this.faces[faceIdx]

      for (let e = 0; e < 3; e++) {
        const v1 = face.indices[e]
        const v2 = face.indices[(e + 1) % 3]
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join('-')

        if (!this.edgeToFaces.has(edgeKey)) {
          this.edgeToFaces.set(edgeKey, [])
        }
        this.edgeToFaces.get(edgeKey)!.push({ faceIndex: faceIdx, edgeIndex: e })
      }
    }
  }

  private buildFaceAdjacency(): void {
    this.faceAdjacency.clear()

    for (let faceIdx = 0; faceIdx < this.faces.length; faceIdx++) {
      this.faceAdjacency.set(faceIdx, [])
    }

    for (const [, faceInfos] of this.edgeToFaces) {
      for (let i = 0; i < faceInfos.length; i++) {
        for (let j = i + 1; j < faceInfos.length; j++) {
          const info1 = faceInfos[i]
          const info2 = faceInfos[j]

          this.faceAdjacency.get(info1.faceIndex)!.push({
            neighbor: info2.faceIndex,
            sharedEdge: info1.edgeIndex,
            neighborEdge: info2.edgeIndex,
          })

          this.faceAdjacency.get(info2.faceIndex)!.push({
            neighbor: info1.faceIndex,
            sharedEdge: info2.edgeIndex,
            neighborEdge: info1.edgeIndex,
          })
        }
      }
    }
  }

  private getEdgeVertices2D(vertices: THREE.Vector2[], edgeIdx: number): [THREE.Vector2, THREE.Vector2] {
    const v0 = vertices[edgeIdx]
    const v1 = vertices[(edgeIdx + 1) % 3]
    return [v0, v1]
  }

  private flattenFaceTo2D(face: FaceData): THREE.Vector2[] {
    const v0 = face.vertices[0]
    const v1 = face.vertices[1]
    const v2 = face.vertices[2]

    const edge1 = new THREE.Vector3().subVectors(v1, v0)
    const edge2 = new THREE.Vector3().subVectors(v2, v0)

    const len1 = edge1.length()
    const len2 = edge2.length()

    edge1.normalize()
    edge2.normalize()

    const dot = edge1.dot(edge2)
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)))

    const p0 = new THREE.Vector2(0, 0)
    const p1 = new THREE.Vector2(len1, 0)
    const p2 = new THREE.Vector2(
      len2 * Math.cos(angle),
      len2 * Math.sin(angle)
    )

    return [p0, p1, p2]
  }

  private rotatePoint2D(
    point: THREE.Vector2,
    center: THREE.Vector2,
    angle: number
  ): THREE.Vector2 {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const dx = point.x - center.x
    const dy = point.y - center.y
    return new THREE.Vector2(
      center.x + dx * cos - dy * sin,
      center.y + dx * sin + dy * cos
    )
  }

  private findRootFace(): number {
    let maxArea = 0
    let rootIdx = 0

    for (let i = 0; i < this.faces.length; i++) {
      if (this.faces[i].area > maxArea) {
        maxArea = this.faces[i].area
        rootIdx = i
      }
    }

    return rootIdx
  }

  private calculateBounds(vertices: THREE.Vector2[]): { min: THREE.Vector2; max: THREE.Vector2 } {
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const v of vertices) {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
    }

    return {
      min: new THREE.Vector2(minX, minY),
      max: new THREE.Vector2(maxX, maxY),
    }
  }

  private trianglesOverlap(
    v1: THREE.Vector2[],
    v2: THREE.Vector2[],
    padding: number = 0.02
  ): boolean {
    const b1 = this.calculateBounds(v1)
    const b2 = this.calculateBounds(v2)

    if (b1.max.x + padding < b2.min.x || b2.max.x + padding < b1.min.x) return false
    if (b1.max.y + padding < b2.min.y || b2.max.y + padding < b1.min.y) return false

    for (let i = 0; i < 3; i++) {
      if (this.pointInTriangle(v1[i], v2[0], v2[1], v2[2])) return true
      if (this.pointInTriangle(v2[i], v1[0], v1[1], v1[2])) return true
    }

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.edgesIntersect(
          v1[i], v1[(i + 1) % 3],
          v2[j], v2[(j + 1) % 3]
        )) return true
      }
    }

    return false
  }

  private pointInTriangle(
    p: THREE.Vector2,
    a: THREE.Vector2,
    b: THREE.Vector2,
    c: THREE.Vector2
  ): boolean {
    const d1 = this.sign(p, a, b)
    const d2 = this.sign(p, b, c)
    const d3 = this.sign(p, c, a)

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0

    return !(hasNeg && hasPos)
  }

  private sign(p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)
  }

  private edgesIntersect(
    a1: THREE.Vector2, a2: THREE.Vector2,
    b1: THREE.Vector2, b2: THREE.Vector2
  ): boolean {
    const d1 = this.sign(b1, b2, a1)
    const d2 = this.sign(b1, b2, a2)
    const d3 = this.sign(a1, a2, b1)
    const d4 = this.sign(a1, a2, b2)

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true
    }

    return false
  }

  private getSubtreeFaces(
    rootIdx: number,
    unfoldedFaces: Map<number, UnfoldedFace>
  ): number[] {
    const subtree: number[] = []
    const visited = new Set<number>()
    const stack = [rootIdx]

    while (stack.length > 0) {
      const idx = stack.pop()!
      if (visited.has(idx)) continue
      visited.add(idx)
      subtree.push(idx)

      const uf = unfoldedFaces.get(idx)
      if (uf) {
        for (const child of uf.children) {
          if (!visited.has(child.faceIndex)) {
            stack.push(child.faceIndex)
          }
        }
      }
    }

    return subtree
  }

  private translateSubtree(
    rootIdx: number,
    offset: THREE.Vector2,
    unfoldedFaces: Map<number, UnfoldedFace>
  ): void {
    const subtree = this.getSubtreeFaces(rootIdx, unfoldedFaces)

    for (const idx of subtree) {
      const uf = unfoldedFaces.get(idx)
      if (uf) {
        uf.vertices2D = uf.vertices2D.map((v) => v.clone().add(offset))
        uf.bounds = this.calculateBounds(uf.vertices2D)
      }
    }
  }

  private rotateSubtree(
    rootIdx: number,
    rotationCenter: THREE.Vector2,
    angle: number,
    unfoldedFaces: Map<number, UnfoldedFace>
  ): void {
    const subtree = this.getSubtreeFaces(rootIdx, unfoldedFaces)

    for (const idx of subtree) {
      const uf = unfoldedFaces.get(idx)
      if (uf) {
        uf.vertices2D = uf.vertices2D.map((v) =>
          this.rotatePoint2D(v, rotationCenter, angle)
        )
        uf.bounds = this.calculateBounds(uf.vertices2D)
      }
    }
  }

  private checkSubtreeOverlap(
    subtreeRoot: number,
    unfoldedFaces: Map<number, UnfoldedFace>,
    excludeFaces: Set<number>
  ): { overlap: boolean; overlappingFace: number | null } {
    const subtree = this.getSubtreeFaces(subtreeRoot, unfoldedFaces)
    const allFaces = Array.from(unfoldedFaces.keys())

    for (const faceIdx of subtree) {
      const uf1 = unfoldedFaces.get(faceIdx)
      if (!uf1) continue

      for (const otherIdx of allFaces) {
        if (subtree.includes(otherIdx)) continue
        if (excludeFaces.has(otherIdx)) continue

        const uf2 = unfoldedFaces.get(otherIdx)
        if (!uf2) continue

        if (this.trianglesOverlap(uf1.vertices2D, uf2.vertices2D, 0.02)) {
          return { overlap: true, overlappingFace: otherIdx }
        }
      }
    }

    return { overlap: false, overlappingFace: null }
  }

  private checkGlobalOverlap(
    unfoldedFaces: Map<number, UnfoldedFace>
  ): { face1: number; face2: number }[] {
    const overlaps: { face1: number; face2: number }[] = []
    const faceIndices = Array.from(unfoldedFaces.keys())

    for (let i = 0; i < faceIndices.length; i++) {
      for (let j = i + 1; j < faceIndices.length; j++) {
        const uf1 = unfoldedFaces.get(faceIndices[i])
        const uf2 = unfoldedFaces.get(faceIndices[j])

        if (!uf1 || !uf2) continue

        if (this.trianglesOverlap(uf1.vertices2D, uf2.vertices2D, 0.02)) {
          overlaps.push({ face1: faceIndices[i], face2: faceIndices[j] })
        }
      }
    }

    return overlaps
  }

  private getGlobalCenter(unfoldedFaces: Map<number, UnfoldedFace>): THREE.Vector2 {
    let centerX = 0, centerY = 0
    let count = 0

    for (const uf of unfoldedFaces.values()) {
      for (const v of uf.vertices2D) {
        centerX += v.x
        centerY += v.y
        count++
      }
    }

    return new THREE.Vector2(centerX / count, centerY / count)
  }

  private findDeepestCommonAncestor(
    face1: number,
    face2: number,
    unfoldedFaces: Map<number, UnfoldedFace>
  ): number | null {
    const ancestors1 = new Set<number>()
    let current: number | null = face1

    while (current !== null) {
      ancestors1.add(current)
      const uf = unfoldedFaces.get(current)
      current = uf?.parentFace ?? null
    }

    current = face2
    while (current !== null) {
      if (ancestors1.has(current)) {
        return current
      }
      const uf = unfoldedFaces.get(current)
      current = uf?.parentFace ?? null
    }

    return null
  }

  private findBranchRoot(
    faceIdx: number,
    ancestor: number,
    unfoldedFaces: Map<number, UnfoldedFace>
  ): number {
    let current = faceIdx
    let next = unfoldedFaces.get(current)?.parentFace ?? null

    while (next !== null && next !== ancestor) {
      current = next
      next = unfoldedFaces.get(current)?.parentFace ?? null
    }

    return current
  }

  unfold(): UnfoldResult {
    const unfoldedFaces: Map<number, UnfoldedFace> = new Map()
    const visited = new Set<number>()
    const bfsOrder: number[] = []
    const queue: { faceIdx: number; parentIdx: number | null; parentEdge: number | null }[] = []

    const rootIdx = this.findRootFace()
    queue.push({ faceIdx: rootIdx, parentIdx: null, parentEdge: null })

    const treeEdges = new Set<string>()

    while (queue.length > 0) {
      const { faceIdx, parentIdx, parentEdge } = queue.shift()!

      if (visited.has(faceIdx)) continue
      visited.add(faceIdx)
      bfsOrder.push(faceIdx)

      const face = this.faces[faceIdx]
      let vertices2D: THREE.Vector2[]
      const isFoldEdge: boolean[] = [false, false, false]
      const isCutEdge: boolean[] = [false, false, false]
      const children: { faceIndex: number; sharedEdge: number }[] = []

      if (parentIdx === null) {
        vertices2D = this.flattenFaceTo2D(face)
      } else {
        const parentUnfolded = unfoldedFaces.get(parentIdx)!
        const adjacencyInfo = this.faceAdjacency.get(faceIdx)!.find(
          (a) => a.neighbor === parentIdx
        )!

        const sharedEdge = adjacencyInfo.sharedEdge
        const parentSharedEdge = adjacencyInfo.neighborEdge

        const parent2D = parentUnfolded.vertices2D
        const parentEdgeStart = parent2D[parentSharedEdge]
        const parentEdgeEnd = parent2D[(parentSharedEdge + 1) % 3]

        const parentEdgeVec = new THREE.Vector2().subVectors(
          parentEdgeEnd,
          parentEdgeStart
        )
        const parentEdgeAngle = Math.atan2(parentEdgeVec.y, parentEdgeVec.x)

        let temp2D = this.flattenFaceTo2D(face)

        const childEdgeVec = new THREE.Vector2().subVectors(
          temp2D[(sharedEdge + 1) % 3],
          temp2D[sharedEdge]
        )
        const childEdgeAngle = Math.atan2(childEdgeVec.y, childEdgeVec.x)

        let targetAngle = parentEdgeAngle + Math.PI
        let needFlip = false
        let rotationAngle = targetAngle - childEdgeAngle

        const rotatedP2 = this.rotatePoint2D(
          temp2D[sharedEdge],
          temp2D[sharedEdge],
          rotationAngle
        )
        const rotatedP3 = this.rotatePoint2D(
          temp2D[(sharedEdge + 1) % 3],
          temp2D[sharedEdge],
          rotationAngle
        )

        const testVec = new THREE.Vector2().subVectors(rotatedP3, rotatedP2)
        const testAngle = Math.atan2(testVec.y, testVec.x)
        const angleDiff = Math.abs(
          ((testAngle - parentEdgeAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        )

        if (angleDiff > 0.1) {
          needFlip = true
        }

        temp2D = this.flattenFaceTo2D(face)
        if (needFlip) {
          temp2D = temp2D.map((v) => new THREE.Vector2(v.x, -v.y))
          const flippedEdgeVec = new THREE.Vector2().subVectors(
            temp2D[(sharedEdge + 1) % 3],
            temp2D[sharedEdge]
          )
          const flippedAngle = Math.atan2(flippedEdgeVec.y, flippedEdgeVec.x)
          rotationAngle = targetAngle - flippedAngle
        }

        vertices2D = temp2D.map((v) =>
          this.rotatePoint2D(v, temp2D[sharedEdge], rotationAngle)
        )

        const translate = new THREE.Vector2().subVectors(
          parentEdgeStart,
          vertices2D[sharedEdge]
        )
        vertices2D = vertices2D.map((v) => v.add(translate))

        const checkVec = new THREE.Vector2().subVectors(
          vertices2D[(sharedEdge + 1) % 3],
          vertices2D[sharedEdge]
        )
        const checkAngle = Math.atan2(checkVec.y, checkVec.x)
        const parentCheckAngle = Math.atan2(parentEdgeVec.y, parentEdgeVec.x)
        const finalAngleDiff = Math.abs(
          ((checkAngle - parentCheckAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        )

        if (finalAngleDiff > 0.5) {
          const alignRotation = parentEdgeAngle + Math.PI - checkAngle
          vertices2D = vertices2D.map((v) =>
            this.rotatePoint2D(v, vertices2D[sharedEdge], alignRotation)
          )
          const translate2 = new THREE.Vector2().subVectors(
            parentEdgeStart,
            vertices2D[sharedEdge]
          )
          vertices2D = vertices2D.map((v) => v.add(translate2))
        }

        const edgeKey = [Math.min(face.indices[sharedEdge], face.indices[(sharedEdge + 1) % 3]),
          Math.max(face.indices[sharedEdge], face.indices[(sharedEdge + 1) % 3])].join('-')
        treeEdges.add(edgeKey)
      }

      const adjacents = this.faceAdjacency.get(faceIdx) || []
      for (const adj of adjacents) {
        if (!visited.has(adj.neighbor)) {
          children.push({ faceIndex: adj.neighbor, sharedEdge: adj.sharedEdge })
          queue.push({
            faceIdx: adj.neighbor,
            parentIdx: faceIdx,
            parentEdge: adj.sharedEdge,
          })
        }
      }

      const bounds = this.calculateBounds(vertices2D)

      const area = face.area
      const baseSize = 0.5
      const minSize = 0.25
      const maxSize = 0.8
      const areaFactor = Math.min(Math.max(area * 2, 0.5), 2)
      const labelSize = Math.max(Math.min(baseSize * areaFactor, maxSize), minSize)

      unfoldedFaces.set(faceIdx, {
        face,
        faceIndex: faceIdx,
        vertices2D,
        isFoldEdge,
        isCutEdge,
        parentEdge,
        parentFace: parentIdx,
        children,
        bounds,
        labelSize,
      })
    }

    for (const faceIdx of bfsOrder) {
      const uf = unfoldedFaces.get(faceIdx)!
      const face = this.faces[faceIdx]

      for (let e = 0; e < 3; e++) {
        const v1 = face.indices[e]
        const v2 = face.indices[(e + 1) % 3]
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join('-')

        if (treeEdges.has(edgeKey)) {
          uf.isFoldEdge[e] = true
          uf.isCutEdge[e] = false
        } else {
          uf.isFoldEdge[e] = false
          uf.isCutEdge[e] = true
        }
      }
    }

    for (let i = 1; i < bfsOrder.length; i++) {
      const faceIdx = bfsOrder[i]
      const uf = unfoldedFaces.get(faceIdx)!
      const parentIdx = uf.parentFace

      if (parentIdx === null) continue

      const excludeFaces = new Set(this.getSubtreeFaces(faceIdx, unfoldedFaces))
      excludeFaces.add(parentIdx)

      let checkResult = this.checkSubtreeOverlap(faceIdx, unfoldedFaces, excludeFaces)

      if (checkResult.overlap) {
        const sharedEdge = uf.parentEdge!
        const parentUF = unfoldedFaces.get(parentIdx)!

        const adjacencyInfo = this.faceAdjacency.get(faceIdx)!.find(
          (a) => a.neighbor === parentIdx
        )!
        const parentSharedEdge = adjacencyInfo.neighborEdge

        const [edgeV1, edgeV2] = this.getEdgeVertices2D(parentUF.vertices2D, parentSharedEdge)
        const parentEdgeCenter = new THREE.Vector2().addVectors(edgeV1, edgeV2).divideScalar(2)

        const center = new THREE.Vector2()
        for (const v of uf.vertices2D) {
          center.add(v)
        }
        center.divideScalar(3)

        const dir = new THREE.Vector2().subVectors(center, parentEdgeCenter).normalize()
        const offset = dir.multiplyScalar(0.8)

        let attempts = 0
        while (checkResult.overlap && attempts < 10) {
          this.translateSubtree(faceIdx, offset, unfoldedFaces)
          checkResult = this.checkSubtreeOverlap(faceIdx, unfoldedFaces, excludeFaces)
          attempts++
        }
      }
    }

    let globalOverlaps = this.checkGlobalOverlap(unfoldedFaces)
    let globalAttempts = 0
    const globalCenter = this.getGlobalCenter(unfoldedFaces)

    while (globalOverlaps.length > 0 && globalAttempts < 5) {
      const processedBranches = new Set<number>()

      for (const overlap of globalOverlaps) {
        const ancestor = this.findDeepestCommonAncestor(overlap.face1, overlap.face2, unfoldedFaces)
        if (ancestor === null) continue

        const branch1 = this.findBranchRoot(overlap.face1, ancestor, unfoldedFaces)
        const branch2 = this.findBranchRoot(overlap.face2, ancestor, unfoldedFaces)

        const branchToMove = branch1 !== ancestor ? branch1 : branch2
        if (processedBranches.has(branchToMove)) continue
        processedBranches.add(branchToMove)

        const branchUF = unfoldedFaces.get(branchToMove)
        if (!branchUF || branchUF.parentFace === null) continue

        const parentUF = unfoldedFaces.get(branchUF.parentFace)!
        const adjacencyInfo = this.faceAdjacency.get(branchToMove)!.find(
          (a) => a.neighbor === branchUF.parentFace
        )!
        const parentSharedEdge = adjacencyInfo.neighborEdge

        const [edgeV1, edgeV2] = this.getEdgeVertices2D(parentUF.vertices2D, parentSharedEdge)
        const rotationCenter = new THREE.Vector2().addVectors(edgeV1, edgeV2).divideScalar(2)

        const excludeFaces = new Set(this.getSubtreeFaces(branchToMove, unfoldedFaces))
        excludeFaces.add(branchUF.parentFace)

        const anglesToTry = [Math.PI / 6, -Math.PI / 6, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3]
        let resolved = false

        for (const angle of anglesToTry) {
          this.rotateSubtree(branchToMove, rotationCenter, angle, unfoldedFaces)
          const check = this.checkSubtreeOverlap(branchToMove, unfoldedFaces, excludeFaces)
          if (!check.overlap) {
            resolved = true
            break
          }
          this.rotateSubtree(branchToMove, rotationCenter, -angle, unfoldedFaces)
        }

        if (!resolved) {
          const branchCenter = new THREE.Vector2()
          for (const v of branchUF.vertices2D) {
            branchCenter.add(v)
          }
          branchCenter.divideScalar(3)

          const awayFromCenter = new THREE.Vector2().subVectors(branchCenter, globalCenter).normalize()
          const translateOffset = awayFromCenter.multiplyScalar(1.0)

          let attempts = 0
          let check = this.checkSubtreeOverlap(branchToMove, unfoldedFaces, excludeFaces)
          while (check.overlap && attempts < 15) {
            this.translateSubtree(branchToMove, translateOffset, unfoldedFaces)
            check = this.checkSubtreeOverlap(branchToMove, unfoldedFaces, excludeFaces)
            attempts++
          }
        }
      }

      globalOverlaps = this.checkGlobalOverlap(unfoldedFaces)
      globalAttempts++
    }

    this.normalizePositions(unfoldedFaces)
    this.unifyOrientation(unfoldedFaces)

    return this.createGeometries(unfoldedFaces)
  }

  private normalizePositions(unfoldedFaces: Map<number, UnfoldedFace>): void {
    let minX = Infinity, minY = Infinity

    for (const uf of unfoldedFaces.values()) {
      for (const v of uf.vertices2D) {
        minX = Math.min(minX, v.x)
        minY = Math.min(minY, v.y)
      }
    }

    const offset = new THREE.Vector2(-minX + 0.5, -minY + 0.5)
    for (const uf of unfoldedFaces.values()) {
      uf.vertices2D = uf.vertices2D.map((v) => v.clone().add(offset))
      uf.bounds = this.calculateBounds(uf.vertices2D)
    }
  }

  private unifyOrientation(unfoldedFaces: Map<number, UnfoldedFace>): void {
    let totalAngle = 0
    let count = 0

    for (const uf of unfoldedFaces.values()) {
      const edgeVec = new THREE.Vector2().subVectors(
        uf.vertices2D[1],
        uf.vertices2D[0]
      )
      totalAngle += Math.atan2(edgeVec.y, edgeVec.x)
      count++
    }

    const avgAngle = totalAngle / count
    const targetAngle = 0
    const rotation = targetAngle - avgAngle

    const center = this.getGlobalCenter(unfoldedFaces)

    for (const uf of unfoldedFaces.values()) {
      uf.vertices2D = uf.vertices2D.map((v) =>
        this.rotatePoint2D(v, center, rotation)
      )
      uf.bounds = this.calculateBounds(uf.vertices2D)
    }
  }

  private createGeometries(
    unfoldedFaces: Map<number, UnfoldedFace>
  ): UnfoldResult {
    const geometries: THREE.BufferGeometry[] = []
    const cutLinePoints: THREE.Vector3[] = []
    const foldLinePoints: THREE.Vector3[] = []
    const labels: LabelData[] = []

    let totalMinX = Infinity, totalMinY = Infinity
    let totalMaxX = -Infinity, totalMaxY = -Infinity
    let maxLabelSize = 0

    const lineZ = 0.05
    const labelZ = 0.2

    const sortedFaces = Array.from(unfoldedFaces.values()).sort(
      (a, b) => a.faceIndex - b.faceIndex
    )

    for (const uf of sortedFaces) {
      const geoVertices: number[] = []
      const geoColors: number[] = []

      for (const v of uf.vertices2D) {
        geoVertices.push(v.x, v.y, 0)
        geoColors.push(uf.face.color.r, uf.face.color.g, uf.face.color.b)

        totalMinX = Math.min(totalMinX, v.x)
        totalMinY = Math.min(totalMinY, v.y)
        totalMaxX = Math.max(totalMaxX, v.x)
        totalMaxY = Math.max(totalMaxY, v.y)
      }

      maxLabelSize = Math.max(maxLabelSize, uf.labelSize)

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(geoVertices, 3)
      )
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(geoColors, 3)
      )
      geometry.setIndex([0, 1, 2])
      geometry.computeVertexNormals()
      geometries.push(geometry)

      for (let e = 0; e < 3; e++) {
        const v1 = uf.vertices2D[e]
        const v2 = uf.vertices2D[(e + 1) % 3]

        const p1 = new THREE.Vector3(v1.x, v1.y, lineZ)
        const p2 = new THREE.Vector3(v2.x, v2.y, lineZ)

        if (uf.isFoldEdge[e]) {
          foldLinePoints.push(p1, p2)
        } else if (uf.isCutEdge[e]) {
          cutLinePoints.push(p1, p2)
        }
      }

      const center2D = new THREE.Vector2()
      for (const v of uf.vertices2D) {
        center2D.add(v)
      }
      center2D.divideScalar(3)

      const toEdges: number[] = []
      for (let e = 0; e < 3; e++) {
        const v1 = uf.vertices2D[e]
        const v2 = uf.vertices2D[(e + 1) % 3]
        const edgeCenter = new THREE.Vector2().addVectors(v1, v2).divideScalar(2)
        toEdges.push(center2D.distanceTo(edgeCenter))
      }
      const minEdgeDist = Math.min(...toEdges)

      const labelOffset = new THREE.Vector2()
      for (let e = 0; e < 3; e++) {
        if (uf.isCutEdge[e]) {
          const v1 = uf.vertices2D[e]
          const v2 = uf.vertices2D[(e + 1) % 3]
          const edgeCenter = new THREE.Vector2().addVectors(v1, v2).divideScalar(2)
          const edgeDir = new THREE.Vector2().subVectors(edgeCenter, center2D).normalize()
          labelOffset.add(edgeDir)
        }
      }

      if (labelOffset.length() > 0) {
        labelOffset.normalize().multiplyScalar(minEdgeDist * 0.3)
      }

      const labelPos = center2D.clone().add(labelOffset)

      labels.push({
        text: String(uf.faceIndex + 1),
        position: new THREE.Vector2(labelPos.x, labelPos.y),
        index: uf.faceIndex,
        size: uf.labelSize,
      })
    }

    const safetyMargin = maxLabelSize + this.LINE_WIDTH
    totalMinX -= safetyMargin
    totalMinY -= safetyMargin
    totalMaxX += safetyMargin
    totalMaxY += safetyMargin

    const cutLineGeometry = new THREE.BufferGeometry().setFromPoints(
      cutLinePoints
    )
    const foldLineGeometry = new THREE.BufferGeometry().setFromPoints(
      foldLinePoints
    )

    const cutLines = new THREE.LineSegments(
      cutLineGeometry,
      new THREE.LineBasicMaterial({
        color: 0xff3333,
        linewidth: 3,
        depthTest: false,
      })
    )

    const dashMaterial = new THREE.LineDashedMaterial({
      color: 0x3366ff,
      dashSize: 0.15,
      gapSize: 0.08,
      depthTest: false,
    })
    const foldLines = new THREE.LineSegments(foldLineGeometry, dashMaterial)
    foldLines.computeLineDistances()

    return {
      geometries,
      cutLines,
      foldLines,
      labels,
      totalBounds: {
        min: new THREE.Vector2(totalMinX, totalMinY),
        max: new THREE.Vector2(totalMaxX, totalMaxY),
      },
      maxLabelSize,
      lineWidth: this.LINE_WIDTH,
    }
  }

  getFaces(): FaceData[] {
    return this.faces
  }
}
