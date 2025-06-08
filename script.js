class FPSGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Game state
        this.score = 0;
        this.health = 100;
        this.ammo = 30;
        this.isGameOver = false;
        this.targets = [];
        this.bullets = [];

        // Movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 10.0;
        this.prevTime = performance.now();

        // Mobile controls
        this.isMobile = this.checkMobile();
        this.movementJoystick = null;
        this.lookJoystick = null;
        this.touchControls = {
            movement: { x: 0, y: 0 },
            look: { x: 0, y: 0 }
        };

        // Audio
        this.setupAudio();

        // Setup
        this.setupScene();
        this.setupControls();
        this.setupEventListeners();
        this.createTargets();

        // Show mobile controls if on mobile
        if (this.isMobile) {
            document.getElementById('mobile-controls').classList.remove('d-none');
            this.setupMobileControls();
        }

        // Start game loop
        this.animate();
    }

    checkMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    setupMobileControls() {
        // Movement joystick
        this.movementJoystick = new VirtualJoystick({
            container: document.getElementById('movement-joystick'),
            color: 'white',
            position: { left: '50%', top: '50%' },
            mode: 'static',
            size: 100
        });

        // Look joystick
        this.lookJoystick = new VirtualJoystick({
            container: document.getElementById('look-joystick'),
            color: 'white',
            position: { left: '50%', top: '50%' },
            mode: 'static',
            size: 100
        });

        // Shoot button
        document.getElementById('shoot-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });

        // Reload button
        document.getElementById('reload-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.reload();
        });
    }

    setupAudio() {
        // Create audio listener
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

        // Load sound effects
        this.sounds = {
            shoot: new THREE.Audio(this.listener),
            reload: new THREE.Audio(this.listener),
            hit: new THREE.Audio(this.listener),
            empty: new THREE.Audio(this.listener),
            gameOver: new THREE.Audio(this.listener)
        };

        // Create audio loader
        const audioLoader = new THREE.AudioLoader();

        // Load sound files
        audioLoader.load('https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3', (buffer) => {
            this.sounds.shoot.setBuffer(buffer);
            this.sounds.shoot.setVolume(0.5);
        });

        audioLoader.load('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3', (buffer) => {
            this.sounds.reload.setBuffer(buffer);
            this.sounds.reload.setVolume(0.5);
        });

        audioLoader.load('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', (buffer) => {
            this.sounds.hit.setBuffer(buffer);
            this.sounds.hit.setVolume(0.5);
        });

        audioLoader.load('https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', (buffer) => {
            this.sounds.empty.setBuffer(buffer);
            this.sounds.empty.setVolume(0.5);
        });

        audioLoader.load('https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3', (buffer) => {
            this.sounds.gameOver.setBuffer(buffer);
            this.sounds.gameOver.setVolume(0.5);
        });
    }

    setupScene() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Create walls
        this.createWalls();

        // Set camera position
        this.camera.position.y = 2;
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const wallGeometry = new THREE.BoxGeometry(100, 10, 1);

        // Create four walls
        const walls = [
            { position: [0, 5, -50], rotation: [0, 0, 0] },
            { position: [0, 5, 50], rotation: [0, 0, 0] },
            { position: [-50, 5, 0], rotation: [0, Math.PI / 2, 0] },
            { position: [50, 5, 0], rotation: [0, Math.PI / 2, 0] }
        ];

        walls.forEach(wall => {
            const mesh = new THREE.Mesh(wallGeometry, wallMaterial);
            mesh.position.set(...wall.position);
            mesh.rotation.set(...wall.rotation);
            this.scene.add(mesh);
        });
    }

    setupControls() {
        if (!this.isMobile) {
            this.controls = new THREE.PointerLockControls(this.camera, document.body);
            
            document.getElementById('start-screen').addEventListener('click', () => {
                this.controls.lock();
            });

            this.controls.addEventListener('lock', () => {
                document.getElementById('start-screen').classList.add('hidden');
            });

            this.controls.addEventListener('unlock', () => {
                if (!this.isGameOver) {
                    document.getElementById('start-screen').classList.remove('hidden');
                }
            });
        } else {
            // Mobile camera setup
            this.camera.position.y = 2;
        }
    }

    setupEventListeners() {
        if (!this.isMobile) {
            document.addEventListener('keydown', (event) => {
                switch (event.code) {
                    case 'KeyW': this.moveForward = true; break;
                    case 'KeyS': this.moveBackward = true; break;
                    case 'KeyA': this.moveLeft = true; break;
                    case 'KeyD': this.moveRight = true; break;
                    case 'KeyR': this.reload(); break;
                }
            });

            document.addEventListener('keyup', (event) => {
                switch (event.code) {
                    case 'KeyW': this.moveForward = false; break;
                    case 'KeyS': this.moveBackward = false; break;
                    case 'KeyA': this.moveLeft = false; break;
                    case 'KeyD': this.moveRight = false; break;
                }
            });

            document.addEventListener('click', () => {
                if (this.controls.isLocked) {
                    this.shoot();
                }
            });
        }

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createTargets() {
        const targetGeometry = new THREE.BoxGeometry(2, 2, 2);
        const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

        for (let i = 0; i < 10; i++) {
            const target = new THREE.Mesh(targetGeometry, targetMaterial);
            target.position.set(
                Math.random() * 80 - 40,
                2,
                Math.random() * 80 - 40
            );
            this.scene.add(target);
            this.targets.push(target);
        }
    }

    shoot() {
        if (this.ammo <= 0) {
            this.sounds.empty.play();
            return;
        }

        this.ammo--;
        this.updateUI();
        this.sounds.shoot.play();

        const bulletGeometry = new THREE.SphereGeometry(0.1);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        bullet.position.copy(this.camera.position);
        bullet.velocity = new THREE.Vector3();
        this.camera.getWorldDirection(bullet.velocity);
        bullet.velocity.multiplyScalar(50);

        this.scene.add(bullet);
        this.bullets.push(bullet);

        // Check for hits
        this.checkBulletHits(bullet);
    }

    checkBulletHits(bullet) {
        const bulletPosition = bullet.position.clone();
        const bulletDirection = bullet.velocity.clone().normalize();

        this.targets.forEach((target, index) => {
            const targetPosition = target.position.clone();
            const distance = bulletPosition.distanceTo(targetPosition);

            if (distance < 2) {
                this.sounds.hit.play();
                this.scene.remove(target);
                this.targets.splice(index, 1);
                this.score += 10;
                this.updateUI();

                if (this.targets.length === 0) {
                    this.gameOver(true);
                }
            }
        });
    }

    reload() {
        if (this.ammo < 30) {
            this.ammo = 30;
            this.updateUI();
            this.sounds.reload.play();
        }
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('health-value').textContent = this.health;
        document.getElementById('ammo-value').textContent = this.ammo;
    }

    gameOver(isWin = false) {
        this.isGameOver = true;
        this.controls.unlock();
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-score').textContent = this.score;
        this.sounds.gameOver.play();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        if (this.isMobile) {
            // Handle mobile movement
            if (this.movementJoystick) {
                const movement = this.movementJoystick.delta();
                this.velocity.x = movement.x * this.moveSpeed;
                this.velocity.z = -movement.y * this.moveSpeed;
            }

            // Handle mobile look
            if (this.lookJoystick) {
                const look = this.lookJoystick.delta();
                this.camera.rotation.y -= look.x * 0.01;
                this.camera.rotation.x -= look.y * 0.01;
                this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
            }

            // Apply movement
            this.camera.position.x += this.velocity.x * delta;
            this.camera.position.z += this.velocity.z * delta;
        } else if (this.controls.isLocked) {
            // Desktop movement
            this.velocity.x = 0;
            this.velocity.z = 0;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) {
                this.velocity.z = this.direction.z * this.moveSpeed;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x = this.direction.x * this.moveSpeed;
            }

            this.controls.moveRight(this.velocity.x * delta);
            this.controls.moveForward(this.velocity.z * delta);
        }

        // Update bullets
        this.bullets.forEach((bullet, index) => {
            bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));
            
            if (bullet.position.distanceTo(this.camera.position) > 100) {
                this.scene.remove(bullet);
                this.bullets.splice(index, 1);
            }
        });

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FPSGame();
}); 