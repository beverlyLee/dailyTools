import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeBodyScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.bodies = [];
        this.trajectoryLines = [];
        this.trajectoryPoints = {};
        this.maxTrajectoryPoints = 2000;
        
        this.init();
    }
    
    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);
        
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
        this.camera.position.set(0, 0, 100);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 1000;
        
        this.addLights();
        this.addStarfield();
        this.addAxesHelper();
        this.addGrid();
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.animate();
    }
    
    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        this.scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0x7aa7ff, 0.5, 200);
        pointLight1.position.set(-50, 0, 0);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff7a7a, 0.5, 200);
        pointLight2.position.set(50, 0, 0);
        this.scene.add(pointLight2);
    }
    
    addStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starVertices = [];
        const starColors = [];
        
        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            
            starVertices.push(x, y, z);
            
            const brightness = Math.random() * 0.5 + 0.5;
            starColors.push(brightness, brightness, brightness);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }
    
    addAxesHelper() {
        const axesHelper = new THREE.AxesHelper(50);
        this.scene.add(axesHelper);
    }
    
    addGrid() {
        const gridHelper = new THREE.GridHelper(200, 40, 0x222244, 0x111133);
        this.scene.add(gridHelper);
    }
    
    createBody(id, color, size = 1) {
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { bodyId: id };
        
        const glowGeometry = new THREE.SphereGeometry(size * 1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        mesh.add(glow);
        
        this.scene.add(mesh);
        this.bodies.push(mesh);
        
        const trajectoryGeometry = new THREE.BufferGeometry();
        const trajectoryMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
        this.scene.add(trajectoryLine);
        this.trajectoryLines.push(trajectoryLine);
        
        this.trajectoryPoints[id] = [];
        
        return mesh;
    }
    
    updateBodyPosition(id, position) {
        const body = this.bodies.find(b => b.userData.bodyId === id);
        if (body) {
            body.position.set(position[0], position[1], position[2]);
            
            if (this.trajectoryPoints[id]) {
                this.trajectoryPoints[id].push(new THREE.Vector3(
                    position[0], position[1], position[2]
                ));
                
                if (this.trajectoryPoints[id].length > this.maxTrajectoryPoints) {
                    this.trajectoryPoints[id].shift();
                }
                
                this.updateTrajectoryLine(id);
            }
        }
    }
    
    updateTrajectoryLine(id) {
        const lineIndex = this.bodies.findIndex(b => b.userData.bodyId === id);
        if (lineIndex >= 0 && lineIndex < this.trajectoryLines.length) {
            const line = this.trajectoryLines[lineIndex];
            const points = this.trajectoryPoints[id];
            
            if (points.length > 1) {
                const positions = new Float32Array(points.length * 3);
                points.forEach((p, i) => {
                    positions[i * 3] = p.x;
                    positions[i * 3 + 1] = p.y;
                    positions[i * 3 + 2] = p.z;
                });
                
                line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                line.geometry.computeBoundingSphere();
            }
        }
    }
    
    clearTrajectories() {
        Object.keys(this.trajectoryPoints).forEach(id => {
            this.trajectoryPoints[id] = [];
        });
        
        this.trajectoryLines.forEach(line => {
            line.geometry.dispose();
        });
    }
    
    removeAllBodies() {
        this.bodies.forEach(body => {
            this.scene.remove(body);
            body.geometry.dispose();
            body.material.dispose();
        });
        
        this.trajectoryLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        
        this.bodies = [];
        this.trajectoryLines = [];
        this.trajectoryPoints = {};
    }
    
    setBodySize(id, size) {
        const body = this.bodies.find(b => b.userData.bodyId === id);
        if (body) {
            const scale = size / 1;
            body.scale.set(scale, scale, scale);
        }
    }
    
    resetCamera() {
        this.camera.position.set(0, 0, 100);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        if (this.starfield) {
            this.starfield.rotation.y += 0.0001;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}
