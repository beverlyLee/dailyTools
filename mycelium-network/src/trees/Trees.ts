import * as THREE from 'three'

export interface TreeData {
  mesh: THREE.Group
  rootPosition: THREE.Vector3
  id: number
}

export class Trees {
  private trees: TreeData[] = []
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  generateTrees(count: number, radius: number): TreeData[] {
    this.trees = []

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const dist = radius * (0.4 + Math.random() * 0.6)
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      const tree = this.createSingleTree(i)
      tree.position.set(x, 0, z)
      this.scene.add(tree)

      this.trees.push({
        mesh: tree,
        rootPosition: new THREE.Vector3(x, 0, z),
        id: i
      })
    }

    return this.trees
  }

  private createSingleTree(id: number): THREE.Group {
    const treeGroup = new THREE.Group()
    treeGroup.name = `tree-${id}`

    const height = 3 + Math.random() * 4
    const trunkRadius = 0.2 + Math.random() * 0.15

    const trunkGeometry = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      height,
      8
    )
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
      metalness: 0.1
    })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = height / 2
    trunk.castShadow = true
    trunk.receiveShadow = true
    treeGroup.add(trunk)

    const crownRadius = 1.2 + Math.random() * 0.8
    const crownHeight = 2 + Math.random() * 1.5
    const crownGeometry = new THREE.SphereGeometry(crownRadius, 8, 6)
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.5 + Math.random() * 0.2, 0.25 + Math.random() * 0.1),
      roughness: 0.8
    })
    const crown = new THREE.Mesh(crownGeometry, crownMaterial)
    crown.position.y = height + crownHeight * 0.3
    crown.scale.y = 1.5
    crown.castShadow = true
    crown.receiveShadow = true
    treeGroup.add(crown)

    const rootMarkerGeometry = new THREE.SphereGeometry(0.15, 8, 8)
    const rootMarkerMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ff66,
      transparent: true,
      opacity: 0.0
    })
    const rootMarker = new THREE.Mesh(rootMarkerGeometry, rootMarkerMaterial)
    rootMarker.name = 'root-marker'
    rootMarker.visible = false
    treeGroup.add(rootMarker)

    return treeGroup
  }

  getTrees(): TreeData[] {
    return this.trees
  }

  getTreeRootPositions(): THREE.Vector3[] {
    return this.trees.map(t => t.rootPosition)
  }
}
