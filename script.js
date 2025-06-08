class FPSGame {
    constructor() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Game state
        this.score = 0;
        this.health = 100;
        this.ammo = 30;
        this.isGameOver = false;
        this.targets = [];
        this.bullets = [];
        this.isJumping = false;
        this.jumpHeight = 2; // Maximum height the player can jump
        this.jumpForce = 0.3; // Initial upward force of the jump
        this.gravity = 0.01; // Strength of gravity
        this.velocityY = 0; // Current vertical velocity
        this.groundY = 2; // Y-position of the ground

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
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.movementJoystick = null;
        this.lookJoystick = null;

        // Audio setup
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        this.sounds = {
            shoot: new THREE.Audio(this.listener),
            hit: new THREE.Audio(this.listener),
            reload: new THREE.Audio(this.listener),
            empty: new THREE.Audio(this.listener)
        };

        // Load sounds
        const audioLoader = new THREE.AudioLoader();
        
        // Gunshot sound
        audioLoader.load('https://redjanvisitacion.github.io/FPS-GAME/audio/GUNSHOT.MP3', (buffer) => {
            this.sounds.shoot.setBuffer(buffer);
            this.sounds.shoot.setVolume(0.5);
        });

        // Hit sound
        audioLoader.load('https://redjanvisitacion.github.io/FPS-GAME/audio/HIT.MP3', (buffer) => {
            this.sounds.hit.setBuffer(buffer);
            this.sounds.hit.setVolume(0.5);
        });

        // Reload sound
        audioLoader.load('https://redjanvisitacion.github.io/FPS-GAME/audio/RELOAD.MP3', (buffer) => {
            this.sounds.reload.setBuffer(buffer);
            this.sounds.reload.setVolume(0.5);
        });

        // Empty gun sound
        audioLoader.load('https://redjanvisitacion.github.io/FPS-GAME/audio/EMPTY.MP3', (buffer) => {
            this.sounds.empty.setBuffer(buffer);
            this.sounds.empty.setVolume(0.5);
        });

        // Setup game elements
        this.setupScene();
        this.setupControls();
        this.setupEventListeners();
        this.createTargets();

        // Show mobile controls if on mobile
        if (this.isMobile) {
            document.getElementById('mobile-controls').classList.remove('d-none');
            this.setupMobileControls();
        }

        // Add particle system for effects
        this.particles = [];
        this.muzzleFlash = null;
        this.setupParticleSystem();

        // Start game loop
        this.animate();
    }

    setupScene() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 10, 0);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Create walls
        this.createWalls();

        // Set camera position
        this.camera.position.y = 2;
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.2
        });
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
            mesh.receiveShadow = true;
            mesh.castShadow = true;
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

            document.addEventListener('keydown', (event) => {
                switch (event.code) {
                    case 'KeyW': this.moveForward = true; break;
                    case 'KeyS': this.moveBackward = true; break;
                    case 'KeyA': this.moveLeft = true; break;
                    case 'KeyD': this.moveRight = true; break;
                    case 'KeyR': this.reload(); break;
                    case 'Space': 
                        if (!this.isJumping) {
                            this.startJump();
                        }
                        break;
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
    }

    setupEventListeners() {
        // Credits button functionality
        document.getElementById('credits-btn').addEventListener('click', () => {
            document.getElementById('credits-screen').classList.remove('hidden');
            if (this.controls) {
                this.controls.unlock();
            }
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            document.getElementById('credits-screen').classList.add('hidden');
            if (!this.isGameOver) {
                this.controls.lock();
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });

        // Mobile start button
        document.getElementById('mobile-start-btn').addEventListener('click', () => {
            document.getElementById('start-screen').classList.add('hidden');
        });
    }

    setupMobileControls() {
        // Movement joystick
        this.movementJoystick = new VirtualJoystick({
            container: document.getElementById('movement-joystick'),
            mouseSupport: true
        });

        // Look joystick
        this.lookJoystick = new VirtualJoystick({
            container: document.getElementById('look-joystick'),
            mouseSupport: true
        });

        // Shoot button
        document.getElementById('shoot-btn').addEventListener('click', () => {
            this.shoot();
        });

        // Reload button
        document.getElementById('reload-btn').addEventListener('click', () => {
            this.reload();
        });
    }

    createTargets() {
        // Create a simple enemy model using basic shapes
        const createEnemy = () => {
            const group = new THREE.Group();

            // Body
            const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                metalness: 0.5,
                roughness: 0.5
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 1;
            body.castShadow = true;
            group.add(body);

            // Head
            const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
            const headMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                metalness: 0.5,
                roughness: 0.5
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 2;
            head.castShadow = true;
            group.add(head);

            // Arms
            const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
            const armMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                metalness: 0.5,
                roughness: 0.5
            });

            const leftArm = new THREE.Mesh(armGeometry, armMaterial);
            leftArm.position.set(-0.7, 1, 0);
            leftArm.rotation.z = Math.PI / 4;
            leftArm.castShadow = true;
            group.add(leftArm);

            const rightArm = new THREE.Mesh(armGeometry, armMaterial);
            rightArm.position.set(0.7, 1, 0);
            rightArm.rotation.z = -Math.PI / 4;
            rightArm.castShadow = true;
            group.add(rightArm);

            return group;
        };

        // Create 10 enemies
        for (let i = 0; i < 10; i++) {
            const enemy = createEnemy();
            enemy.position.set(
                Math.random() * 80 - 40,
                0,
                Math.random() * 80 - 40
            );
            enemy.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(enemy);
            this.targets.push(enemy);
        }
    }

    setupParticleSystem() {
        // Create muzzle flash light
        const muzzleLight = new THREE.PointLight(0xffaa00, 1, 10);
        muzzleLight.visible = false;
        this.camera.add(muzzleLight);
        this.muzzleFlash = muzzleLight;
    }

    createMuzzleFlash() {
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            this.muzzleFlash.intensity = 2;
            
            // Create flash geometry
            const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const flashMaterial = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.8
            });
            const flash = new THREE.Mesh(flashGeometry, flashMaterial);
            this.camera.add(flash);

            // Animate flash
            const animateFlash = () => {
                flash.scale.x += 0.2;
                flash.scale.y += 0.2;
                flash.scale.z += 0.2;
                flash.material.opacity -= 0.1;

                if (flash.material.opacity <= 0) {
                    this.camera.remove(flash);
                    this.muzzleFlash.visible = false;
                    return;
                }
                requestAnimationFrame(animateFlash);
            };
            animateFlash();
        }
    }

    createBulletTrail(start, end) {
        const points = [];
        points.push(start);
        points.push(end);

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.5
        });

        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Animate trail
        const animateTrail = () => {
            material.opacity -= 0.1;
            if (material.opacity <= 0) {
                this.scene.remove(line);
                return;
            }
            requestAnimationFrame(animateTrail);
        };
        animateTrail();
    }

    createImpactEffect(position) {
        // Create impact particles
        for (let i = 0; i < 10; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    shoot() {
        if (this.ammo <= 0) {
            if (this.sounds.empty.isPlaying) {
                this.sounds.empty.stop();
            }
            this.sounds.empty.play();
            return;
        }

        this.ammo--;
        this.updateUI();

        // Play gunshot sound
        if (this.sounds.shoot.isPlaying) {
            this.sounds.shoot.stop();
        }
        this.sounds.shoot.play();

        // Create muzzle flash
        this.createMuzzleFlash();

        // Create bullet
        const bulletGeometry = new THREE.SphereGeometry(0.1);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        bullet.position.copy(this.camera.position);
        bullet.velocity = new THREE.Vector3();
        this.camera.getWorldDirection(bullet.velocity);
        bullet.velocity.multiplyScalar(50);

        this.scene.add(bullet);
        this.bullets.push(bullet);

        // Create bullet trail
        const bulletEnd = bullet.position.clone().add(bullet.velocity.clone().multiplyScalar(0.1));
        this.createBulletTrail(bullet.position.clone(), bulletEnd);
    }

    checkBulletHits(bullet) {
        const bulletPosition = bullet.position.clone();

        this.targets.forEach((target, index) => {
            const targetPosition = target.position.clone();
            const distance = bulletPosition.distanceTo(targetPosition);

            if (distance < 2) {
                // Play hit sound
                if (this.sounds.hit.isPlaying) {
                    this.sounds.hit.stop();
                }
                this.sounds.hit.play();

                // Create impact effect
                this.createImpactEffect(bulletPosition);
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
            
            // Play reload sound
            if (this.sounds.reload.isPlaying) {
                this.sounds.reload.stop();
            }
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
        if (this.controls) {
            this.controls.unlock();
        }
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-score').textContent = this.score;
        
        if (isWin) {
            document.querySelector('#game-over h1').textContent = 'You Win!';
        }
    }

    startJump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.velocityY = this.jumpForce;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.position.add(particle.velocity);
            particle.material.opacity -= 0.02;

            if (particle.material.opacity <= 0) {
                this.scene.remove(particle);
                this.particles.splice(i, 1);
            }
        }

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
        } else {
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

            if (this.controls) {
                this.controls.moveRight(this.velocity.x * delta);
                this.controls.moveForward(this.velocity.z * delta);
            }
        }

        // Apply jump and gravity
        if (this.isJumping || this.camera.position.y > this.groundY) {
            this.velocityY -= this.gravity;
            this.camera.position.y += this.velocityY;

            if (this.camera.position.y < this.groundY) {
                this.camera.position.y = this.groundY;
                this.velocityY = 0;
                this.isJumping = false;
            }
        }

        // Wall collision detection
        const playerX = this.camera.position.x;
        const playerZ = this.camera.position.z;
        const wallLimit = 49;

        if (playerX > wallLimit) this.camera.position.x = wallLimit;
        if (playerX < -wallLimit) this.camera.position.x = -wallLimit;
        if (playerZ > wallLimit) this.camera.position.z = wallLimit;
        if (playerZ < -wallLimit) this.camera.position.z = -wallLimit;

        // Update bullets and check collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));
            
            // Check for target hits
            for (let j = this.targets.length - 1; j >= 0; j--) {
                const target = this.targets[j];
                if (bullet.position.distanceTo(target.position) < 2) {
                    this.sounds.hit.play();
                    this.scene.remove(target);
                    this.targets.splice(j, 1);
                    this.score += 10;
                    this.updateUI();

                    if (this.targets.length === 0) {
                        this.gameOver(true);
                    }
                    break;
                }
            }

            // Remove bullets that are too far
            if (bullet.position.distanceTo(this.camera.position) > 100) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
const game = new FPSGame(); 