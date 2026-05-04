import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class MDRenderer {
    constructor(container) {
        this.container = container;
        this.atoms = [];
        this.boxSize = 0;
        this.atomMeshes = [];
        this.atomColors = {
            default: 0x64b5f6,
            hot: 0xff5252,
            cold: 0x4caf50,
        };
        
        this.init();
    }
    
    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
        
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(15, 12, 15);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.addLights();
        
        window.addEventListener('resize', () => this.onResize());
        
        this.animate();
    }
    
    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0x64b5f6, 0.5);
        pointLight1.position.set(-10, 10, -10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xf44336, 0.3);
        pointLight2.position.set(10, -5, 10);
        this.scene.add(pointLight2);
    }
    
    createBox(boxSize) {
        if (this.boxHelper) {
            this.scene.remove(this.boxHelper);
        }
        
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const edges = new THREE.EdgesGeometry(geometry);
        this.boxHelper = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x444466 })
        );
        this.boxHelper.position.set(boxSize / 2, boxSize / 2, boxSize / 2);
        this.scene.add(this.boxHelper);
        
        this.boxSize = boxSize;
    }
    
    createAtoms(positions, boxSize) {
        this.clearAtoms();
        this.createBox(boxSize);
        
        const atomRadius = 0.3;
        const geometry = new THREE.SphereGeometry(atomRadius, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: this.atomColors.default,
            shininess: 100,
            specular: 0x222222,
        });
        
        positions.forEach((pos, index) => {
            const mesh = new THREE.Mesh(geometry, material.clone());
            mesh.position.set(pos[0], pos[1], pos[2]);
            mesh.userData = { index, originalColor: this.atomColors.default };
            this.scene.add(mesh);
            this.atomMeshes.push(mesh);
        });
        
        this.adjustCamera(boxSize);
    }
    
    updateAtomPositions(positions) {
        positions.forEach((pos, index) => {
            if (this.atomMeshes[index]) {
                this.atomMeshes[index].position.set(pos[0], pos[1], pos[2]);
            }
        });
    }
    
    updateAtomColorsByVelocity(velocities) {
        if (!velocities || velocities.length === 0) return;
        
        const speeds = velocities.map(v => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
        const maxSpeed = Math.max(...speeds);
        const minSpeed = Math.min(...speeds);
        
        velocities.forEach((vel, index) => {
            if (this.atomMeshes[index]) {
                const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
                const t = maxSpeed > minSpeed ? (speed - minSpeed) / (maxSpeed - minSpeed) : 0.5;
                
                const color = new THREE.Color();
                color.setHSL(0.6 - t * 0.6, 0.8, 0.5);
                this.atomMeshes[index].material.color = color;
            }
        });
    }
    
    clearAtoms() {
        this.atomMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.atomMeshes = [];
        
        if (this.boxHelper) {
            this.scene.remove(this.boxHelper);
            this.boxHelper = null;
        }
    }
    
    adjustCamera(boxSize) {
        const distance = boxSize * 1.8;
        this.camera.position.set(distance, distance * 0.8, distance);
        this.controls.target.set(boxSize / 2, boxSize / 2, boxSize / 2);
        this.controls.update();
    }
    
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        this.clearAtoms();
        this.renderer.dispose();
        this.controls.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
