import * as THREE from 'three';

const kaleidoShader = {
	uniforms: {
		'tDiffuse': { value: null },
		'brightness': { value: 2.5 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse;
		uniform float brightness;
		varying vec2 vUv;
		void main() {
			vec4 tex = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4( tex.rgb * brightness, 1.0 );
		}`
};

class KaleidoRoom {
  public group: THREE.Group;
  public centerObjects: THREE.Group;
  private mirrors: THREE.Mesh[] = [];
  private mirrorRenderTargets: THREE.WebGLRenderTarget[][] = [];
  private reflectionCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private readonly RECURSION_LEVELS = 4;
  private readonly NUM_MIRRORS = 3;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.group = new THREE.Group();
    this.centerObjects = new THREE.Group();
    this.reflectionCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    
    this.createRenderTargets();
    this.createMirrors();
    this.createCaps();
    this.createCenterObjects();
    
    this.group.add(this.centerObjects);
  }

  private createRenderTargets() {
    for (let i = 0; i < this.NUM_MIRRORS; i++) {
      this.mirrorRenderTargets[i] = [];
      for (let level = 0; level < this.RECURSION_LEVELS; level++) {
        this.mirrorRenderTargets[i][level] = new THREE.WebGLRenderTarget(1024, 1024, {
          format: THREE.RGBAFormat,
          type: THREE.HalfFloatType
        });
      }
    }
  }

  private createMirrors() {
    const mirrorSize = 25;
    const mirrorDistance = 6;
    const angles = [0, 120, 240];

    for (let i = 0; i < this.NUM_MIRRORS; i++) {
      const angleRad = (angles[i] * Math.PI) / 180;
      
      const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(kaleidoShader.uniforms),
        vertexShader: kaleidoShader.vertexShader,
        fragmentShader: kaleidoShader.fragmentShader
      });
      (material.uniforms as any).tDiffuse.value = this.mirrorRenderTargets[i][this.RECURSION_LEVELS - 1].texture;

      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(mirrorSize, mirrorSize),
        material
      );

      const x = Math.cos(angleRad) * mirrorDistance;
      const z = Math.sin(angleRad) * mirrorDistance;
      mirror.position.set(x, 0, z);
      mirror.lookAt(0, 0, 0);
      mirror.userData.mirrorIndex = i;
      mirror.userData.normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mirror.quaternion).normalize();
      
      this.mirrors.push(mirror);
      this.group.add(mirror);
    }
  }

  private createCaps() {
    const capSize = 20;
    const capY = 12;
    
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      metalness: 0.9,
      roughness: 0.1
    });

    const topCap = new THREE.Mesh(
      new THREE.CircleGeometry(capSize, 3),
      capMaterial
    );
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = capY;
    this.group.add(topCap);

    const bottomCap = new THREE.Mesh(
      new THREE.CircleGeometry(capSize, 3),
      capMaterial.clone()
    );
    bottomCap.rotation.x = Math.PI / 2;
    bottomCap.position.y = -capY;
    this.group.add(bottomCap);
  }

  private createCenterObjects() {
    const colors = [
      0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 
      0xf38181, 0xaa96da, 0xfcbad3, 0xa8d8ea
    ];
    
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 4; i++) {
      const color = colors[i % colors.length];
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.2,
        roughness: 0.3,
        emissive: color,
        emissiveIntensity: 0.8
      });
      const cube = new THREE.Mesh(cubeGeometry, material);
      const angle = (i * Math.PI * 2) / 4;
      const radius = 1.5;
      cube.position.set(
        Math.cos(angle) * radius,
        Math.sin(i * 0.5) * 0.5,
        Math.sin(angle) * radius
      );
      cube.scale.setScalar(0.9 + Math.random() * 0.3);
      cube.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      };
      this.centerObjects.add(cube);
    }

    const sphereGeometry = new THREE.SphereGeometry(0.7, 32, 32);
    for (let i = 0; i < 3; i++) {
      const color = colors[(i + 4) % colors.length];
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.4,
        roughness: 0.15,
        emissive: color,
        emissiveIntensity: 0.7
      });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
      const radius = 2;
      sphere.position.set(
        Math.cos(angle) * radius,
        Math.sin(i * 0.8) * 0.3,
        Math.sin(angle) * radius
      );
      sphere.scale.setScalar(0.8 + Math.random() * 0.4);
      sphere.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015
      };
      this.centerObjects.add(sphere);
    }

    const octaGeometry = new THREE.OctahedronGeometry(0.6);
    for (let i = 0; i < 3; i++) {
      const color = colors[(i + 6) % colors.length];
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.6,
        roughness: 0.1,
        emissive: color,
        emissiveIntensity: 0.9
      });
      const octa = new THREE.Mesh(octaGeometry, material);
      const angle = (i * Math.PI * 2) / 3 + Math.PI / 3;
      const radius = 2.5;
      octa.position.set(
        Math.cos(angle) * radius,
        Math.sin(i * 1.2) * 0.4,
        Math.sin(angle) * radius
      );
      octa.scale.setScalar(0.7 + Math.random() * 0.3);
      octa.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.025,
        y: (Math.random() - 0.5) * 0.025,
        z: (Math.random() - 0.5) * 0.025
      };
      this.centerObjects.add(octa);
    }
  }

  private renderMirrorRecursive(mirrorIndex: number, level: number, mainCamera: THREE.Camera) {
    const mirror = this.mirrors[mirrorIndex];
    const renderTarget = this.mirrorRenderTargets[mirrorIndex][level];
    
    const mirrorWorldPos = new THREE.Vector3();
    mirror.getWorldPosition(mirrorWorldPos);
    
    const cameraWorldPos = new THREE.Vector3();
    mainCamera.getWorldPosition(cameraWorldPos);
    
    const normal = mirror.userData.normal.clone();
    
    const toCamera = cameraWorldPos.clone().sub(mirrorWorldPos);
    const reflectedDir = toCamera.clone().reflect(normal);
    const virtualCamPos = mirrorWorldPos.clone().add(reflectedDir);
    
    this.reflectionCamera.copy(mainCamera as THREE.PerspectiveCamera);
    this.reflectionCamera.position.copy(virtualCamPos);
    this.reflectionCamera.lookAt(mirrorWorldPos);
    
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.clear();
    
    for (let i = 0; i < this.NUM_MIRRORS; i++) {
      if (i === mirrorIndex) {
        this.mirrors[i].visible = false;
      } else {
        if (level > 0) {
          const mat = this.mirrors[i].material as THREE.ShaderMaterial;
          mat.uniforms.tDiffuse.value = this.mirrorRenderTargets[i][level - 1].texture;
        } else {
          this.mirrors[i].visible = false;
        }
      }
    }
    
    this.renderer.render(this.scene, this.reflectionCamera);
    
    for (let i = 0; i < this.NUM_MIRRORS; i++) {
      this.mirrors[i].visible = true;
      const mat = this.mirrors[i].material as THREE.ShaderMaterial;
      mat.uniforms.tDiffuse.value = this.mirrorRenderTargets[i][this.RECURSION_LEVELS - 1].texture;
    }
    
    this.renderer.setRenderTarget(oldTarget);
  }

  public update(mainCamera: THREE.Camera) {
    this.centerObjects.rotation.y += 0.006;
    this.centerObjects.rotation.x += 0.002;
    
    this.centerObjects.children.forEach((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.userData.rotationSpeed) {
        mesh.rotation.x += mesh.userData.rotationSpeed.x;
        mesh.rotation.y += mesh.userData.rotationSpeed.y;
        mesh.rotation.z += mesh.userData.rotationSpeed.z;
      }
    });

    for (let level = 0; level < this.RECURSION_LEVELS; level++) {
      for (let i = 0; i < this.NUM_MIRRORS; i++) {
        this.renderMirrorRecursive(i, level, mainCamera);
      }
    }
  }
}

export default KaleidoRoom;
