import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeBodyScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.bodies = [];
        this.trajectories = [];
        this.trajectoryPoints = [];
        this.showTrajectories = true;
        this.scaleFactor = 1e-12;
        this.animationId = null;
        
        this.bodyColors = [
            0xff6b6b,
            0x4ecdc4,
            0xffe66d
        ];
        
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            width / height,
            0.1,
            10000
        );
        this.camera.position.set(5, 5, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 100;

        this.addStars();
        this.addLights();
        this.addGrid();

        window.addEventListener('resize', () => this.onWindowResize());
        
        this.animate();
    }

    addStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.02,
            transparent: true,
            opacity: 0.8
        });

        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 200;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0xff6b6b, 0.5);
        const pointLight2 = new THREE.PointLight(0x4ecdc4, 0.5);
        const pointLight3 = new THREE.PointLight(0xffe66d, 0.5);
        
        this.scene.add(pointLight1);
        this.scene.add(pointLight2);
        this.scene.add(pointLight3);
        
        this.pointLights = [pointLight1, pointLight2, pointLight3];
    }

    addGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x333344, 0x222233);
        gridHelper.position.y = -2;
        this.scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(5);
        axesHelper.position.y = -1.99;
        this.scene.add(axesHelper);
    }

    clearBodies() {
        this.bodies.forEach(body => {
            this.scene.remove(body.mesh);
            if (body.glow) {
                this.scene.remove(body.glow);
            }
        });
        this.bodies = [];
        
        this.trajectories.forEach(trajectory => {
            this.scene.remove(trajectory);
        });
        this.trajectories = [];
        this.trajectoryPoints = [];
    }

    createBody(bodyData, index) {
        const radius = this.calculateRadius(bodyData.mass);
        const color = this.bodyColors[index % this.bodyColors.length];

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const glowGeometry = new THREE.SphereGeometry(radius * 1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);

        const position = bodyData.position || [0, 0, 0];
        const scaledPosition = position.map(p => p * this.scaleFactor);
        
        mesh.position.set(scaledPosition[0], scaledPosition[1], scaledPosition[2]);
        glow.position.set(scaledPosition[0], scaledPosition[1], scaledPosition[2]);

        this.scene.add(mesh);
        this.scene.add(glow);

        const trajectoryGeometry = new THREE.BufferGeometry();
        const trajectoryMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        const trajectory = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
        this.scene.add(trajectory);

        this.trajectories.push(trajectory);
        this.trajectoryPoints.push([]);

        return {
            mesh: mesh,
            glow: glow,
            name: bodyData.name || `Body ${index + 1}`,
            mass: bodyData.mass,
            color: color
        };
    }

    initializeBodies(bodiesData) {
        this.clearBodies();
        
        bodiesData.forEach((bodyData, index) => {
            const body = this.createBody(bodyData, index);
            this.bodies.push(body);
            
            if (this.pointLights && this.pointLights[index]) {
                const pos = body.mesh.position;
                this.pointLights[index].position.copy(pos);
            }
        });

        this.updateCameraPosition();
    }

    updateBodies(snapshot) {
        if (!snapshot || !snapshot.bodies) return;

        snapshot.bodies.forEach((bodyData, index) => {
            if (index < this.bodies.length) {
                const body = this.bodies[index];
                const position = bodyData.position.map(p => p * this.scaleFactor);
                
                body.mesh.position.set(position[0], position[1], position[2]);
                body.glow.position.set(position[0], position[1], position[2]);

                if (this.showTrajectories) {
                    this.trajectoryPoints[index].push(position);
                    
                    if (this.trajectoryPoints[index].length > 2000) {
                        this.trajectoryPoints[index].shift();
                    }

                    const positions = new Float32Array(this.trajectoryPoints[index].flat());
                    this.trajectories[index].geometry.setAttribute(
                        'position',
                        new THREE.BufferAttribute(positions, 3)
                    );
                    this.trajectories[index].geometry.computeBoundingSphere();
                }

                if (this.pointLights && this.pointLights[index]) {
                    this.pointLights[index].position.set(position[0], position[1], position[2]);
                }
            }
        });
    }

    loadTrajectories(trajectoryData) {
        if (!trajectoryData || trajectoryData.length === 0) return;

        this.trajectoryPoints = this.bodies.map(() => []);

        trajectoryData.forEach(snapshot => {
            snapshot.bodies.forEach((bodyData, index) => {
                if (index < this.bodies.length) {
                    const position = bodyData.position.map(p => p * this.scaleFactor);
                    this.trajectoryPoints[index].push(position);
                }
            });
        });

        this.bodies.forEach((_, index) => {
            const positions = new Float32Array(this.trajectoryPoints[index].flat());
            this.trajectories[index].geometry.setAttribute(
                'position',
                new THREE.BufferAttribute(positions, 3)
            );
            this.trajectories[index].geometry.computeBoundingSphere();
        });
    }

    calculateRadius(mass) {
        const logMass = Math.log10(mass);
        return Math.max(0.1, Math.min(1.0, 0.2 + logMass * 0.02));
    }

    updateCameraPosition() {
        if (this.bodies.length === 0) return;

        let centerX = 0, centerY = 0, centerZ = 0;
        this.bodies.forEach(body => {
            centerX += body.mesh.position.x;
            centerY += body.mesh.position.y;
            centerZ += body.mesh.position.z;
        });
        centerX /= this.bodies.length;
        centerY /= this.bodies.length;
        centerZ /= this.bodies.length;

        this.controls.target.set(centerX, centerY, centerZ);
        this.camera.position.set(centerX + 8, centerY + 8, centerZ + 12);
        this.controls.update();
    }

    toggleTrajectories(show) {
        this.showTrajectories = show;
        this.trajectories.forEach(trajectory => {
            trajectory.visible = show;
        });
    }

    clearTrajectories() {
        this.trajectoryPoints = this.bodies.map(() => []);
        this.trajectories.forEach(trajectory => {
            trajectory.geometry.dispose();
            trajectory.geometry = new THREE.BufferGeometry();
        });
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        this.bodies.forEach(body => {
            body.mesh.rotation.y += 0.005;
            body.glow.rotation.y += 0.005;
        });
        
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', this.onWindowResize);
        
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
