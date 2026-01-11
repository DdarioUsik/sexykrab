// ============================================
// MIA CROFT - Snow Adventure
// A 3D platformer game inspired by classic Tomb Raider
// ============================================

// Game State
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    PUZZLE: 'puzzle',
    LEVEL_TRANSITION: 'level_transition',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

// Main Game Class
class MiaCroftGame {
    constructor() {
        this.state = GameState.MENU;
        this.currentLevel = 1;
        this.maxLevels = 3;

        // Player stats
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 30;
        this.maxAmmo = 30;

        // Inventory
        this.inventory = [null, null, null];

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Player
        this.player = null;
        this.playerVelocity = new THREE.Vector3();
        this.playerOnGround = false;
        this.playerSpeed = 8;
        this.runMultiplier = 1.8;
        this.jumpForce = 12;
        this.gravity = 25;

        // Camera controls
        this.cameraDistance = 8;
        this.cameraHeight = 4;
        this.cameraRotation = { x: 0, y: 0 };
        this.mouseSensitivity = 0.002;

        // Input
        this.keys = {};
        this.mouseDown = false;
        this.pointerLocked = false;

        // Game objects
        this.platforms = [];
        this.collectibles = [];
        this.enemies = [];
        this.interactables = [];
        this.projectiles = [];
        this.particles = [];

        // Boss
        this.boss = null;
        this.bossHealth = 100;
        this.bossMaxHealth = 100;

        // Puzzle state
        this.currentPuzzle = null;
        this.puzzleSolved = false;

        // Level-specific
        this.levelObjects = [];
        this.exitGate = null;
        this.gateOpen = false;

        // Snowfall
        this.snowParticles = null;

        // Animation
        this.animationTime = 0;
        this.playerAnimState = 'idle';

        // Shooting
        this.canShoot = true;
        this.shootCooldown = 0.25;
        this.lastShootTime = 0;

        // Initialize
        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupLights();
        this.setupEventListeners();
        this.hideLoading();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0xCCDDEE, 50, 200);
    }

    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
        this.scene.add(ambient);

        // Directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffee, 1.0);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        this.scene.add(sun);

        // Hemisphere light for better ambient
        const hemi = new THREE.HemisphereLight(0xaaccff, 0x445566, 0.4);
        this.scene.add(hemi);
    }

    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Pointer lock
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());

        // Resize
        window.addEventListener('resize', () => this.onResize());

        // Menu buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('puzzle-close').addEventListener('click', () => this.closePuzzle());
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 2000);
    }

    startGame() {
        document.getElementById('menu').classList.add('hidden');
        this.renderer.domElement.requestPointerLock();
        this.state = GameState.PLAYING;
        this.currentLevel = 1;
        this.resetPlayer();
        this.loadLevel(1);
        this.showHUD();
        this.gameLoop();
    }

    restartGame() {
        document.getElementById('game-end').classList.add('hidden');
        this.health = this.maxHealth;
        this.ammo = this.maxAmmo;
        this.inventory = [null, null, null];
        this.currentLevel = 1;
        this.state = GameState.PLAYING;
        this.resetPlayer();
        this.loadLevel(1);
        this.updateHUD();
    }

    resetPlayer() {
        this.health = this.maxHealth;
        this.playerVelocity.set(0, 0, 0);
        this.playerOnGround = false;
    }

    showHUD() {
        document.getElementById('hud').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('inventory').style.display = 'flex';
    }

    hideHUD() {
        document.getElementById('hud').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('inventory').style.display = 'none';
    }

    updateHUD() {
        document.getElementById('health-fill').style.width = `${(this.health / this.maxHealth) * 100}%`;
        document.getElementById('ammo-display').textContent = this.ammo;
        document.getElementById('level-display').textContent = this.currentLevel;

        // Inventory
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`inv-${i + 1}`);
            if (this.inventory[i]) {
                slot.classList.add('has-item');
                slot.textContent = this.inventory[i].icon;
            } else {
                slot.classList.remove('has-item');
                slot.textContent = '';
            }
        }

        // Boss health
        if (this.boss && this.currentLevel === 3) {
            document.getElementById('boss-health').classList.add('visible');
            document.getElementById('boss-fill').style.width = `${(this.bossHealth / this.bossMaxHealth) * 100}%`;
        } else {
            document.getElementById('boss-health').classList.remove('visible');
        }
    }

    // ============================================
    // PLAYER CREATION
    // ============================================

    createPlayer() {
        const playerGroup = new THREE.Group();

        // Materials
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
        const jacketMat = new THREE.MeshLambertMaterial({ color: 0xE91E63 }); // Pink winter jacket
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1565C0 }); // Blue pants
        const bootsMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x2196F3 });

        // Body (torso with jacket) - child proportions
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.9, 0.5),
            jacketMat
        );
        torso.position.y = 0.9;
        torso.castShadow = true;
        playerGroup.add(torso);

        // Head - larger relative to body (child proportions)
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            skinMat
        );
        head.position.y = 1.7;
        head.castShadow = true;
        playerGroup.add(head);

        // Hair (ponytail style)
        const hairTop = new THREE.Mesh(
            new THREE.SphereGeometry(0.38, 16, 16),
            hairMat
        );
        hairTop.position.set(0, 1.75, -0.05);
        hairTop.scale.set(1, 0.9, 1);
        playerGroup.add(hairTop);

        // Ponytail
        const ponytail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8),
            hairMat
        );
        ponytail.position.set(0, 1.55, -0.3);
        ponytail.rotation.x = 0.3;
        playerGroup.add(ponytail);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 1.72, 0.28);
        playerGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 1.72, 0.28);
        playerGroup.add(rightEye);

        // Cheeks (rosy)
        const cheekMat = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
        const cheekGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
        leftCheek.position.set(-0.22, 1.65, 0.22);
        playerGroup.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
        rightCheek.position.set(0.22, 1.65, 0.22);
        playerGroup.add(rightCheek);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const leftArm = new THREE.Mesh(armGeo, jacketMat);
        leftArm.position.set(-0.5, 0.95, 0);
        leftArm.castShadow = true;
        playerGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, jacketMat);
        rightArm.position.set(0.5, 0.95, 0);
        rightArm.castShadow = true;
        playerGroup.add(rightArm);

        // Hands
        const handGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.set(-0.5, 0.55, 0);
        playerGroup.add(leftHand);

        const rightHand = new THREE.Mesh(handGeo, skinMat);
        rightHand.position.set(0.5, 0.55, 0);
        playerGroup.add(rightHand);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.2, 0.25, 0);
        leftLeg.castShadow = true;
        playerGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.2, 0.25, 0);
        rightLeg.castShadow = true;
        playerGroup.add(rightLeg);

        // Boots
        const bootGeo = new THREE.BoxGeometry(0.28, 0.2, 0.35);
        const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
        leftBoot.position.set(-0.2, 0.1, 0.05);
        leftBoot.castShadow = true;
        playerGroup.add(leftBoot);

        const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
        rightBoot.position.set(0.2, 0.1, 0.05);
        rightBoot.castShadow = true;
        playerGroup.add(rightBoot);

        // Backpack
        const backpack = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.25),
            new THREE.MeshLambertMaterial({ color: 0x795548 })
        );
        backpack.position.set(0, 1.0, -0.35);
        backpack.castShadow = true;
        playerGroup.add(backpack);

        // Winter hat (beanie)
        const hat = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: 0xE91E63 })
        );
        hat.position.set(0, 1.9, 0);
        hat.rotation.x = Math.PI;
        playerGroup.add(hat);

        // Pompom on hat
        const pompom = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
        );
        pompom.position.set(0, 2.1, 0);
        playerGroup.add(pompom);

        // Store references for animation
        playerGroup.userData.leftArm = leftArm;
        playerGroup.userData.rightArm = rightArm;
        playerGroup.userData.leftLeg = leftLeg;
        playerGroup.userData.rightLeg = rightLeg;

        playerGroup.position.set(0, 1, 0);
        this.player = playerGroup;
        this.scene.add(this.player);
    }

    // ============================================
    // LEVEL CREATION
    // ============================================

    loadLevel(levelNum) {
        // Clear previous level
        this.clearLevel();

        // Reset puzzle state
        this.puzzleSolved = false;
        this.gateOpen = false;

        // Show level intro
        this.showLevelIntro(levelNum);

        // Create common elements
        this.createSnowGround();
        this.createSnowfall();
        this.createPlayer();
        this.createMountains();

        // Level-specific content
        switch(levelNum) {
            case 1:
                this.createLevel1();
                break;
            case 2:
                this.createLevel2();
                break;
            case 3:
                this.createLevel3();
                break;
        }

        this.updateHUD();
    }

    clearLevel() {
        // Remove all level objects
        this.levelObjects.forEach(obj => this.scene.remove(obj));
        this.levelObjects = [];

        // Clear arrays
        this.platforms = [];
        this.collectibles = [];
        this.enemies = [];
        this.interactables = [];
        this.projectiles = [];
        this.particles = [];

        // Remove player
        if (this.player) {
            this.scene.remove(this.player);
            this.player = null;
        }

        // Remove snowfall
        if (this.snowParticles) {
            this.scene.remove(this.snowParticles);
            this.snowParticles = null;
        }

        // Remove boss
        if (this.boss) {
            this.scene.remove(this.boss);
            this.boss = null;
        }

        // Clear exit gate
        this.exitGate = null;
    }

    showLevelIntro(levelNum) {
        const titles = [
            '',
            'Level 1: The Frozen Cave',
            'Level 2: Ice Temple',
            'Level 3: Guardian\'s Lair'
        ];

        const descs = [
            '',
            'Find the ancient crystal key to open the passage. Watch out for icy platforms and collect supplies along the way!',
            'Navigate through the temple and solve the rune puzzle. The spirits of winter guard these halls...',
            'Face the Ice Guardian! Use your skills and courage to defeat the ancient protector of the mountain.'
        ];

        document.getElementById('level-title').textContent = titles[levelNum];
        document.getElementById('level-desc').textContent = descs[levelNum];
        document.getElementById('level-screen').classList.add('visible');

        setTimeout(() => {
            document.getElementById('level-screen').classList.remove('visible');
        }, 3000);
    }

    createSnowGround() {
        // Main snow ground
        const groundGeo = new THREE.PlaneGeometry(300, 300, 50, 50);

        // Add height variation
        const vertices = groundGeo.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] += Math.random() * 0.3;
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.userData.isGround = true;
        this.scene.add(ground);
        this.levelObjects.push(ground);
        this.platforms.push(ground);
    }

    createSnowfall() {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

            velocities.push({
                x: (Math.random() - 0.5) * 0.5,
                y: -1 - Math.random() * 2,
                z: (Math.random() - 0.5) * 0.5
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.3,
            transparent: true,
            opacity: 0.8
        });

        this.snowParticles = new THREE.Points(geometry, material);
        this.snowParticles.userData.velocities = velocities;
        this.scene.add(this.snowParticles);
    }

    createMountains() {
        const mountainMat = new THREE.MeshLambertMaterial({ color: 0x8899aa });
        const snowCapMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 80 + Math.random() * 40;
            const height = 30 + Math.random() * 40;

            // Mountain
            const mountain = new THREE.Mesh(
                new THREE.ConeGeometry(20 + Math.random() * 15, height, 6),
                mountainMat
            );
            mountain.position.set(
                Math.cos(angle) * distance,
                height / 2,
                Math.sin(angle) * distance
            );
            mountain.castShadow = true;
            this.scene.add(mountain);
            this.levelObjects.push(mountain);

            // Snow cap
            const cap = new THREE.Mesh(
                new THREE.ConeGeometry(8 + Math.random() * 5, height * 0.3, 6),
                snowCapMat
            );
            cap.position.set(
                mountain.position.x,
                height * 0.85,
                mountain.position.z
            );
            this.scene.add(cap);
            this.levelObjects.push(cap);
        }
    }

    // ============================================
    // LEVEL 1 - The Frozen Cave (Puzzle: Find Key)
    // ============================================

    createLevel1() {
        this.player.position.set(0, 1, 0);

        // Ice platforms
        this.createIcePlatform(5, 1.5, -10, 4, 0.5, 4);
        this.createIcePlatform(12, 3, -15, 4, 0.5, 4);
        this.createIcePlatform(18, 4.5, -10, 4, 0.5, 4);
        this.createIcePlatform(25, 6, -15, 5, 0.5, 5);

        // Cave entrance
        this.createCaveEntrance(30, 0, -15);

        // Collectibles
        this.createCollectible(5, 3, -10, 'ammo');
        this.createCollectible(12, 4.5, -15, 'health');
        this.createCollectible(18, 6, -10, 'ammo');

        // Key is hidden in a side area
        this.createKeyArea();

        // Exit gate
        this.createExitGate(35, 0, -15);

        // Enemies
        this.createSnowWolf(-8, 1, -5);
        this.createSnowWolf(10, 1, 5);

        // Trees for atmosphere
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            if (Math.abs(x) > 10 || Math.abs(z) > 10) {
                this.createPineTree(x, 0, z);
            }
        }
    }

    createKeyArea() {
        // Platform path to key
        this.createIcePlatform(-10, 2, 5, 3, 0.5, 3);
        this.createIcePlatform(-18, 3.5, 8, 3, 0.5, 3);
        this.createIcePlatform(-25, 5, 5, 4, 0.5, 4);

        // Key collectible
        this.createCollectible(-25, 6.5, 5, 'key');

        // Protective wolf
        this.createSnowWolf(-22, 1, 8);
    }

    createIcePlatform(x, y, z, width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });

        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData.isPlatform = true;
        platform.userData.bounds = { width, height, depth };

        this.scene.add(platform);
        this.levelObjects.push(platform);
        this.platforms.push(platform);

        return platform;
    }

    createCaveEntrance(x, y, z) {
        // Cave structure
        const caveGeo = new THREE.BoxGeometry(10, 8, 15);
        const caveMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
        const cave = new THREE.Mesh(caveGeo, caveMat);
        cave.position.set(x, y + 4, z - 7);
        this.scene.add(cave);
        this.levelObjects.push(cave);

        // Entrance hole (darker)
        const entranceGeo = new THREE.BoxGeometry(5, 6, 2);
        const entranceMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
        const entrance = new THREE.Mesh(entranceGeo, entranceMat);
        entrance.position.set(x, y + 3, z);
        this.scene.add(entrance);
        this.levelObjects.push(entrance);
    }

    createExitGate(x, y, z) {
        // Gate frame
        const frameMat = new THREE.MeshLambertMaterial({ color: 0x5d4e37 });

        // Left pillar
        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 6, 1),
            frameMat
        );
        leftPillar.position.set(x - 2, y + 3, z);
        this.scene.add(leftPillar);
        this.levelObjects.push(leftPillar);

        // Right pillar
        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 6, 1),
            frameMat
        );
        rightPillar.position.set(x + 2, y + 3, z);
        this.scene.add(rightPillar);
        this.levelObjects.push(rightPillar);

        // Top
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(5, 1, 1),
            frameMat
        );
        top.position.set(x, y + 6, z);
        this.scene.add(top);
        this.levelObjects.push(top);

        // Gate door
        const gateMat = new THREE.MeshLambertMaterial({
            color: this.gateOpen ? 0x00ff88 : 0x884422
        });
        const gate = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 5, 0.3),
            gateMat
        );
        gate.position.set(x, y + 2.5, z);
        gate.userData.isGate = true;
        this.scene.add(gate);
        this.levelObjects.push(gate);
        this.exitGate = gate;

        // Interactable zone
        this.interactables.push({
            position: new THREE.Vector3(x, y + 2, z),
            radius: 3,
            type: 'gate',
            action: () => this.tryOpenGate()
        });
    }

    tryOpenGate() {
        if (this.currentLevel === 1) {
            // Need key
            const hasKey = this.inventory.some(item => item && item.type === 'key');
            if (hasKey) {
                this.gateOpen = true;
                this.openGateAnimation();
                // Remove key from inventory
                const keyIndex = this.inventory.findIndex(item => item && item.type === 'key');
                if (keyIndex !== -1) this.inventory[keyIndex] = null;
                this.updateHUD();
            } else {
                this.showPrompt('You need the Crystal Key!');
            }
        } else if (this.currentLevel === 2) {
            if (this.puzzleSolved) {
                this.gateOpen = true;
                this.openGateAnimation();
            } else {
                this.showPrompt('Solve the rune puzzle first!');
            }
        }
    }

    openGateAnimation() {
        if (this.exitGate) {
            this.exitGate.material.color.setHex(0x00ff88);
            // Animate gate opening
            const targetY = this.exitGate.position.y + 5;
            const animate = () => {
                if (this.exitGate.position.y < targetY) {
                    this.exitGate.position.y += 0.1;
                    requestAnimationFrame(animate);
                }
            };
            animate();

            setTimeout(() => this.nextLevel(), 2000);
        }
    }

    // ============================================
    // LEVEL 2 - Ice Temple (Puzzle: Rune Pattern)
    // ============================================

    createLevel2() {
        this.player.position.set(0, 1, 0);

        // Temple structure
        this.createTemple();

        // Platforms to temple
        this.createIcePlatform(0, 1, -8, 6, 0.5, 6);
        this.createIcePlatform(8, 2.5, -15, 5, 0.5, 5);
        this.createIcePlatform(0, 4, -25, 8, 0.5, 8);

        // Collectibles
        this.createCollectible(0, 2.5, -8, 'ammo');
        this.createCollectible(8, 4, -15, 'health');

        // Ice spirits (enemies)
        this.createIceSpirit(-10, 2, -20);
        this.createIceSpirit(15, 2, -30);

        // Puzzle altar
        this.createPuzzleAltar(0, 4.5, -25);

        // Exit gate (at the back of temple)
        this.createExitGate(0, 4, -40);

        // Trees
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            if (Math.abs(x) > 15 || z > -5) {
                this.createPineTree(x, 0, z);
            }
        }
    }

    createTemple() {
        const templeMat = new THREE.MeshLambertMaterial({ color: 0x6a8caf });
        const iceMat = new THREE.MeshPhongMaterial({
            color: 0x88ddff,
            transparent: true,
            opacity: 0.7,
            shininess: 100
        });

        // Main platform
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(20, 1, 30),
            templeMat
        );
        base.position.set(0, 3.5, -30);
        base.receiveShadow = true;
        this.scene.add(base);
        this.levelObjects.push(base);
        this.platforms.push(base);
        base.userData.isPlatform = true;
        base.userData.bounds = { width: 20, height: 1, depth: 30 };

        // Pillars
        for (let i = 0; i < 4; i++) {
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1.2, 10, 8),
                iceMat
            );
            const xPos = (i % 2 === 0) ? -8 : 8;
            const zPos = (i < 2) ? -20 : -40;
            pillar.position.set(xPos, 9, zPos);
            pillar.castShadow = true;
            this.scene.add(pillar);
            this.levelObjects.push(pillar);
        }

        // Roof
        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(15, 8, 4),
            templeMat
        );
        roof.position.set(0, 18, -30);
        roof.rotation.y = Math.PI / 4;
        this.scene.add(roof);
        this.levelObjects.push(roof);
    }

    createPuzzleAltar(x, y, z) {
        // Altar
        const altarMat = new THREE.MeshLambertMaterial({ color: 0x4a6fa5 });
        const altar = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1.5, 3),
            altarMat
        );
        altar.position.set(x, y + 0.75, z);
        this.scene.add(altar);
        this.levelObjects.push(altar);

        // Glowing rune on top
        const runeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const rune = new THREE.Mesh(
            new THREE.CircleGeometry(1, 6),
            runeMat
        );
        rune.position.set(x, y + 1.55, z);
        rune.rotation.x = -Math.PI / 2;
        this.scene.add(rune);
        this.levelObjects.push(rune);

        // Interactable
        this.interactables.push({
            position: new THREE.Vector3(x, y + 1, z),
            radius: 3,
            type: 'puzzle',
            action: () => this.openPuzzle('runes')
        });
    }

    openPuzzle(type) {
        if (this.puzzleSolved) {
            this.showPrompt('Puzzle already solved!');
            return;
        }

        this.state = GameState.PUZZLE;
        document.exitPointerLock();

        const puzzleUI = document.getElementById('puzzle-ui');
        const puzzleGrid = document.getElementById('puzzle-grid');
        const puzzleTitle = document.getElementById('puzzle-title');

        puzzleGrid.innerHTML = '';

        if (type === 'runes') {
            puzzleTitle.textContent = 'Match the Rune Pattern';
            puzzleGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';

            // Correct pattern: top-left, center, bottom-right
            const correctPattern = [0, 4, 8];
            let selectedPattern = [];

            const runes = ['*', '+', '#', '@', '*', '~', '!', '%', '*'];

            for (let i = 0; i < 9; i++) {
                const btn = document.createElement('button');
                btn.className = 'puzzle-btn';
                btn.textContent = runes[i];
                btn.addEventListener('click', () => {
                    if (selectedPattern.includes(i)) {
                        selectedPattern = selectedPattern.filter(x => x !== i);
                        btn.classList.remove('active');
                    } else {
                        selectedPattern.push(i);
                        btn.classList.add('active');
                    }

                    // Check solution
                    if (selectedPattern.length === 3) {
                        const sorted = [...selectedPattern].sort((a,b) => a-b);
                        if (JSON.stringify(sorted) === JSON.stringify(correctPattern)) {
                            // Correct!
                            this.puzzleSolved = true;
                            document.querySelectorAll('.puzzle-btn.active').forEach(b => {
                                b.classList.add('correct');
                            });
                            setTimeout(() => {
                                this.closePuzzle();
                                this.showPrompt('Puzzle solved! The gate is now open!');
                            }, 1000);
                        } else {
                            // Wrong
                            setTimeout(() => {
                                selectedPattern = [];
                                document.querySelectorAll('.puzzle-btn').forEach(b => {
                                    b.classList.remove('active');
                                });
                            }, 500);
                        }
                    }
                });
                puzzleGrid.appendChild(btn);
            }
        }

        puzzleUI.classList.add('visible');
    }

    closePuzzle() {
        document.getElementById('puzzle-ui').classList.remove('visible');
        this.state = GameState.PLAYING;
        this.renderer.domElement.requestPointerLock();
    }

    // ============================================
    // LEVEL 3 - Boss Fight
    // ============================================

    createLevel3() {
        this.player.position.set(0, 1, 30);
        this.cameraRotation.y = Math.PI;

        // Boss arena
        this.createBossArena();

        // Boss
        this.createBoss();

        // Health and ammo pickups around arena
        this.createCollectible(-15, 1.5, 0, 'health');
        this.createCollectible(15, 1.5, 0, 'health');
        this.createCollectible(-10, 1.5, 15, 'ammo');
        this.createCollectible(10, 1.5, 15, 'ammo');
        this.createCollectible(0, 1.5, -15, 'ammo');
    }

    createBossArena() {
        // Circular arena platform
        const arenaMat = new THREE.MeshLambertMaterial({ color: 0x4a6a8a });
        const arena = new THREE.Mesh(
            new THREE.CylinderGeometry(25, 27, 2, 32),
            arenaMat
        );
        arena.position.set(0, 0, 0);
        arena.receiveShadow = true;
        arena.userData.isPlatform = true;
        arena.userData.isArena = true;
        this.scene.add(arena);
        this.levelObjects.push(arena);
        this.platforms.push(arena);

        // Ice pillars around arena
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(1.5, 2, 12, 8),
                new THREE.MeshPhongMaterial({
                    color: 0x88ddff,
                    transparent: true,
                    opacity: 0.7
                })
            );
            pillar.position.set(
                Math.cos(angle) * 22,
                6,
                Math.sin(angle) * 22
            );
            pillar.castShadow = true;
            this.scene.add(pillar);
            this.levelObjects.push(pillar);
        }

        // Cover platforms
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            this.createIcePlatform(
                Math.cos(angle) * 12,
                1.5,
                Math.sin(angle) * 12,
                4, 3, 4
            );
        }
    }

    createBoss() {
        const bossGroup = new THREE.Group();

        // Body (large ice golem)
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x6699cc,
            shininess: 80
        });

        const iceMat = new THREE.MeshPhongMaterial({
            color: 0x88ddff,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });

        // Main body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 3),
            bodyMat
        );
        body.position.y = 4;
        body.castShadow = true;
        bossGroup.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 2.5, 2.5),
            iceMat
        );
        head.position.y = 7.5;
        head.castShadow = true;
        bossGroup.add(head);

        // Eyes (glowing red)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            eyeMat
        );
        leftEye.position.set(-0.6, 7.7, 1.2);
        bossGroup.add(leftEye);

        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            eyeMat
        );
        rightEye.position.set(0.6, 7.7, 1.2);
        bossGroup.add(rightEye);

        // Arms
        const armGeo = new THREE.BoxGeometry(1.5, 4, 1.5);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-3, 4, 0);
        leftArm.castShadow = true;
        bossGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bodyMat);
        rightArm.position.set(3, 4, 0);
        rightArm.castShadow = true;
        bossGroup.add(rightArm);

        // Ice crown
        const crown = new THREE.Mesh(
            new THREE.ConeGeometry(1.5, 2, 6),
            iceMat
        );
        crown.position.y = 9.5;
        bossGroup.add(crown);

        // Legs
        const legGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
        const leftLeg = new THREE.Mesh(legGeo, bodyMat);
        leftLeg.position.set(-1.2, 1.5, 0);
        leftLeg.castShadow = true;
        bossGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, bodyMat);
        rightLeg.position.set(1.2, 1.5, 0);
        rightLeg.castShadow = true;
        bossGroup.add(rightLeg);

        bossGroup.position.set(0, 1, -10);
        bossGroup.userData.leftArm = leftArm;
        bossGroup.userData.rightArm = rightArm;

        this.boss = bossGroup;
        this.bossHealth = this.bossMaxHealth;
        this.scene.add(this.boss);
        this.levelObjects.push(this.boss);
    }

    // ============================================
    // GAME OBJECTS
    // ============================================

    createCollectible(x, y, z, type) {
        let geometry, material, icon;

        switch(type) {
            case 'health':
                geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
                material = new THREE.MeshBasicMaterial({ color: 0xff4444 });
                icon = '+';
                break;
            case 'ammo':
                geometry = new THREE.BoxGeometry(0.5, 0.7, 0.3);
                material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
                icon = '|';
                break;
            case 'key':
                geometry = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
                material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
                icon = 'K';
                break;
        }

        const collectible = new THREE.Mesh(geometry, material);
        collectible.position.set(x, y, z);
        collectible.userData.type = type;
        collectible.userData.icon = icon;

        this.scene.add(collectible);
        this.levelObjects.push(collectible);
        this.collectibles.push(collectible);

        return collectible;
    }

    createSnowWolf(x, y, z) {
        const wolfGroup = new THREE.Group();
        const furMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.8, 0.8),
            furMat
        );
        body.position.y = 0.6;
        body.castShadow = true;
        wolfGroup.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.5, 0.5),
            furMat
        );
        head.position.set(0.9, 0.7, 0);
        wolfGroup.add(head);

        // Snout
        const snout = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.25, 0.3),
            furMat
        );
        snout.position.set(1.3, 0.6, 0);
        wolfGroup.add(snout);

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
        leftEye.position.set(1.1, 0.8, 0.2);
        wolfGroup.add(leftEye);

        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
        rightEye.position.set(1.1, 0.8, -0.2);
        wolfGroup.add(rightEye);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(legGeo, furMat);
            leg.position.set(
                i < 2 ? 0.5 : -0.5,
                0.25,
                i % 2 === 0 ? 0.25 : -0.25
            );
            wolfGroup.add(leg);
        }

        // Tail
        const tail = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.15, 0.15),
            furMat
        );
        tail.position.set(-1, 0.7, 0);
        tail.rotation.z = 0.3;
        wolfGroup.add(tail);

        wolfGroup.position.set(x, y, z);
        wolfGroup.userData.health = 30;
        wolfGroup.userData.maxHealth = 30;
        wolfGroup.userData.speed = 4;
        wolfGroup.userData.damage = 10;
        wolfGroup.userData.attackRange = 2;
        wolfGroup.userData.aggroRange = 15;
        wolfGroup.userData.type = 'wolf';

        this.scene.add(wolfGroup);
        this.levelObjects.push(wolfGroup);
        this.enemies.push(wolfGroup);

        return wolfGroup;
    }

    createIceSpirit(x, y, z) {
        const spiritGroup = new THREE.Group();

        const spiritMat = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.6
        });

        // Main body (ethereal)
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 16, 16),
            spiritMat
        );
        body.position.y = 1.5;
        spiritGroup.add(body);

        // Inner glow
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        core.position.y = 1.5;
        spiritGroup.add(core);

        // Trailing wisps
        for (let i = 0; i < 3; i++) {
            const wisp = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 - i * 0.08, 8, 8),
                spiritMat
            );
            wisp.position.set(0, 1 - i * 0.3, -i * 0.3);
            spiritGroup.add(wisp);
        }

        spiritGroup.position.set(x, y, z);
        spiritGroup.userData.health = 20;
        spiritGroup.userData.maxHealth = 20;
        spiritGroup.userData.speed = 3;
        spiritGroup.userData.damage = 15;
        spiritGroup.userData.attackRange = 8;
        spiritGroup.userData.aggroRange = 20;
        spiritGroup.userData.type = 'spirit';
        spiritGroup.userData.canShoot = true;
        spiritGroup.userData.lastShot = 0;

        this.scene.add(spiritGroup);
        this.levelObjects.push(spiritGroup);
        this.enemies.push(spiritGroup);

        return spiritGroup;
    }

    createPineTree(x, y, z) {
        const treeGroup = new THREE.Group();

        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.5, 2, 8),
            new THREE.MeshLambertMaterial({ color: 0x4a3728 })
        );
        trunk.position.y = 1;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Foliage layers with snow
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        for (let i = 0; i < 3; i++) {
            const size = 2.5 - i * 0.6;
            const height = 2 + i * 1.5;

            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(size, 2, 8),
                leafMat
            );
            foliage.position.y = height;
            foliage.castShadow = true;
            treeGroup.add(foliage);

            // Snow cap
            const snow = new THREE.Mesh(
                new THREE.ConeGeometry(size * 0.7, 0.5, 8),
                snowMat
            );
            snow.position.y = height + 0.8;
            treeGroup.add(snow);
        }

        treeGroup.position.set(x, y, z);
        this.scene.add(treeGroup);
        this.levelObjects.push(treeGroup);

        return treeGroup;
    }

    // ============================================
    // INPUT HANDLING
    // ============================================

    onKeyDown(e) {
        this.keys[e.code] = true;

        if (e.code === 'KeyE' && this.state === GameState.PLAYING) {
            this.tryInteract();
        }

        if (e.code === 'Escape') {
            if (this.state === GameState.PUZZLE) {
                this.closePuzzle();
            }
        }
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseDown(e) {
        if (e.button === 0) {
            this.mouseDown = true;
            if (this.state === GameState.PLAYING && this.pointerLocked) {
                this.shoot();
            }
        }
    }

    onMouseUp(e) {
        if (e.button === 0) {
            this.mouseDown = false;
        }
    }

    onMouseMove(e) {
        if (this.pointerLocked && this.state === GameState.PLAYING) {
            this.cameraRotation.y -= e.movementX * this.mouseSensitivity;
            this.cameraRotation.x -= e.movementY * this.mouseSensitivity;
            this.cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraRotation.x));
        }
    }

    onPointerLockChange() {
        this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ============================================
    // GAME MECHANICS
    // ============================================

    shoot() {
        const now = this.clock.getElapsedTime();
        if (now - this.lastShootTime < this.shootCooldown) return;
        if (this.ammo <= 0) return;

        this.lastShootTime = now;
        this.ammo--;
        this.updateHUD();

        // Create projectile
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );

        // Shoot from player position in camera direction
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotation.x);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.y);

        projectile.position.copy(this.player.position);
        projectile.position.y += 1.5;
        projectile.userData.velocity = direction.multiplyScalar(50);
        projectile.userData.isPlayerProjectile = true;
        projectile.userData.damage = 10;
        projectile.userData.lifetime = 2;
        projectile.userData.spawnTime = now;

        this.scene.add(projectile);
        this.projectiles.push(projectile);

        // Muzzle flash effect
        this.createMuzzleFlash();
    }

    createMuzzleFlash() {
        const flash = new THREE.PointLight(0xffff00, 2, 5);
        flash.position.copy(this.player.position);
        flash.position.y += 1.5;
        this.scene.add(flash);

        setTimeout(() => {
            this.scene.remove(flash);
        }, 50);
    }

    tryInteract() {
        const playerPos = this.player.position;

        for (const interactable of this.interactables) {
            const dist = playerPos.distanceTo(interactable.position);
            if (dist < interactable.radius) {
                interactable.action();
                return;
            }
        }
    }

    showPrompt(text) {
        const prompt = document.getElementById('interaction-prompt');
        prompt.textContent = text;
        prompt.classList.add('visible');

        setTimeout(() => {
            prompt.classList.remove('visible');
        }, 2000);
    }

    collectItem(collectible) {
        const type = collectible.userData.type;

        switch(type) {
            case 'health':
                this.health = Math.min(this.health + 25, this.maxHealth);
                break;
            case 'ammo':
                this.ammo = Math.min(this.ammo + 10, this.maxAmmo);
                break;
            case 'key':
                // Add to inventory
                for (let i = 0; i < this.inventory.length; i++) {
                    if (!this.inventory[i]) {
                        this.inventory[i] = { type: 'key', icon: 'K' };
                        break;
                    }
                }
                this.showPrompt('Crystal Key collected!');
                break;
        }

        // Remove collectible
        this.scene.remove(collectible);
        const idx = this.collectibles.indexOf(collectible);
        if (idx !== -1) this.collectibles.splice(idx, 1);

        this.updateHUD();
    }

    takeDamage(amount) {
        this.health -= amount;
        this.updateHUD();

        // Screen flash effect
        document.body.style.backgroundColor = '#ff0000';
        setTimeout(() => {
            document.body.style.backgroundColor = '';
        }, 100);

        if (this.health <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.state = GameState.GAME_OVER;
        document.exitPointerLock();

        document.getElementById('end-title').textContent = 'Game Over';
        document.getElementById('end-title').className = 'end-title defeat';
        document.getElementById('end-message').textContent = 'Mia was defeated by the cold...';
        document.getElementById('game-end').classList.remove('hidden');
    }

    victory() {
        this.state = GameState.VICTORY;
        document.exitPointerLock();

        document.getElementById('end-title').textContent = 'Victory!';
        document.getElementById('end-title').className = 'end-title victory';
        document.getElementById('end-message').textContent = 'Mia defeated the Ice Guardian and saved the mountain!';
        document.getElementById('game-end').classList.remove('hidden');
    }

    nextLevel() {
        this.currentLevel++;

        if (this.currentLevel > this.maxLevels) {
            this.victory();
            return;
        }

        this.loadLevel(this.currentLevel);
    }

    // ============================================
    // UPDATE LOOP
    // ============================================

    gameLoop() {
        if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) return;

        requestAnimationFrame(() => this.gameLoop());

        const delta = Math.min(this.clock.getDelta(), 0.1);
        this.animationTime += delta;

        if (this.state === GameState.PLAYING) {
            this.updatePlayer(delta);
            this.updateCamera();
            this.updateEnemies(delta);
            this.updateBoss(delta);
            this.updateProjectiles(delta);
            this.updateCollectibles();
            this.updateSnowfall(delta);
            this.updateInteractionPrompt();
            this.checkLevelCompletion();
        }

        this.renderer.render(this.scene, this.camera);
    }

    updatePlayer(delta) {
        if (!this.player) return;

        // Movement input
        const moveDir = new THREE.Vector3();

        if (this.keys['KeyW']) moveDir.z -= 1;
        if (this.keys['KeyS']) moveDir.z += 1;
        if (this.keys['KeyA']) moveDir.x -= 1;
        if (this.keys['KeyD']) moveDir.x += 1;

        // Apply camera rotation to movement
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.y);

        // Running
        let speed = this.playerSpeed;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            speed *= this.runMultiplier;
        }

        // Apply movement
        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.playerVelocity.x = moveDir.x * speed;
            this.playerVelocity.z = moveDir.z * speed;

            // Rotate player to face movement direction
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            this.player.rotation.y = targetAngle;

            this.playerAnimState = 'walk';
        } else {
            this.playerVelocity.x *= 0.8;
            this.playerVelocity.z *= 0.8;
            this.playerAnimState = 'idle';
        }

        // Jump
        if (this.keys['Space'] && this.playerOnGround) {
            this.playerVelocity.y = this.jumpForce;
            this.playerOnGround = false;
        }

        // Gravity
        this.playerVelocity.y -= this.gravity * delta;

        // Apply velocity
        this.player.position.x += this.playerVelocity.x * delta;
        this.player.position.y += this.playerVelocity.y * delta;
        this.player.position.z += this.playerVelocity.z * delta;

        // Ground collision
        this.playerOnGround = false;

        // Check platform collisions
        for (const platform of this.platforms) {
            if (this.checkPlatformCollision(platform)) {
                break;
            }
        }

        // Ground level
        if (this.player.position.y < 1) {
            this.player.position.y = 1;
            this.playerVelocity.y = 0;
            this.playerOnGround = true;
        }

        // Animate player
        this.animatePlayer();
    }

    checkPlatformCollision(platform) {
        if (platform.userData.isGround) return false;
        if (platform.userData.isArena) {
            // Arena collision (circular)
            const dist = Math.sqrt(
                this.player.position.x ** 2 + this.player.position.z ** 2
            );
            if (dist < 25 && this.player.position.y < 2 && this.player.position.y > 0) {
                if (this.playerVelocity.y < 0) {
                    this.player.position.y = 2;
                    this.playerVelocity.y = 0;
                    this.playerOnGround = true;
                    return true;
                }
            }
            return false;
        }

        const bounds = platform.userData.bounds;
        if (!bounds) return false;

        const pPos = platform.position;
        const playerPos = this.player.position;

        // Check if player is above platform
        const halfWidth = bounds.width / 2;
        const halfDepth = bounds.depth / 2;
        const platformTop = pPos.y + bounds.height / 2;

        if (playerPos.x > pPos.x - halfWidth && playerPos.x < pPos.x + halfWidth &&
            playerPos.z > pPos.z - halfDepth && playerPos.z < pPos.z + halfDepth) {

            if (playerPos.y < platformTop + 1 && playerPos.y > platformTop - 0.5) {
                if (this.playerVelocity.y < 0) {
                    this.player.position.y = platformTop + 1;
                    this.playerVelocity.y = 0;
                    this.playerOnGround = true;
                    return true;
                }
            }
        }

        return false;
    }

    animatePlayer() {
        if (!this.player.userData.leftLeg) return;

        const leftLeg = this.player.userData.leftLeg;
        const rightLeg = this.player.userData.rightLeg;
        const leftArm = this.player.userData.leftArm;
        const rightArm = this.player.userData.rightArm;

        if (this.playerAnimState === 'walk') {
            const swing = Math.sin(this.animationTime * 10) * 0.4;
            leftLeg.rotation.x = swing;
            rightLeg.rotation.x = -swing;
            leftArm.rotation.x = -swing;
            rightArm.rotation.x = swing;
        } else {
            leftLeg.rotation.x *= 0.9;
            rightLeg.rotation.x *= 0.9;
            leftArm.rotation.x *= 0.9;
            rightArm.rotation.x *= 0.9;
        }
    }

    updateCamera() {
        if (!this.player) return;

        // Third person camera
        const offset = new THREE.Vector3(0, this.cameraHeight, this.cameraDistance);
        offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotation.x);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.y);

        this.camera.position.copy(this.player.position).add(offset);
        this.camera.lookAt(
            this.player.position.x,
            this.player.position.y + 1.5,
            this.player.position.z
        );
    }

    updateEnemies(delta) {
        const playerPos = this.player.position;
        const now = this.clock.getElapsedTime();

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const enemyPos = enemy.position;
            const dist = playerPos.distanceTo(enemyPos);

            // Check if dead
            if (enemy.userData.health <= 0) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
                continue;
            }

            // Aggro behavior
            if (dist < enemy.userData.aggroRange) {
                // Move toward player
                const direction = new THREE.Vector3()
                    .subVectors(playerPos, enemyPos)
                    .normalize();

                if (dist > enemy.userData.attackRange) {
                    enemyPos.x += direction.x * enemy.userData.speed * delta;
                    enemyPos.z += direction.z * enemy.userData.speed * delta;

                    // Face player
                    enemy.rotation.y = Math.atan2(direction.x, direction.z);
                }

                // Attack
                if (dist < enemy.userData.attackRange) {
                    if (enemy.userData.type === 'spirit' && enemy.userData.canShoot) {
                        if (now - enemy.userData.lastShot > 2) {
                            this.enemyShoot(enemy, direction);
                            enemy.userData.lastShot = now;
                        }
                    } else if (enemy.userData.type === 'wolf') {
                        // Melee attack
                        if (!enemy.userData.lastAttack || now - enemy.userData.lastAttack > 1) {
                            this.takeDamage(enemy.userData.damage);
                            enemy.userData.lastAttack = now;
                        }
                    }
                }
            }

            // Float animation for spirits
            if (enemy.userData.type === 'spirit') {
                enemy.position.y = 2 + Math.sin(now * 2) * 0.3;
            }
        }
    }

    enemyShoot(enemy, direction) {
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x88ffff })
        );

        projectile.position.copy(enemy.position);
        projectile.position.y += 1.5;
        projectile.userData.velocity = direction.clone().multiplyScalar(20);
        projectile.userData.isEnemyProjectile = true;
        projectile.userData.damage = enemy.userData.damage;
        projectile.userData.lifetime = 3;
        projectile.userData.spawnTime = this.clock.getElapsedTime();

        this.scene.add(projectile);
        this.projectiles.push(projectile);
    }

    updateBoss(delta) {
        if (!this.boss || this.currentLevel !== 3) return;

        const now = this.clock.getElapsedTime();
        const playerPos = this.player.position;
        const bossPos = this.boss.position;

        // Boss died
        if (this.bossHealth <= 0) {
            this.scene.remove(this.boss);
            this.boss = null;
            this.victory();
            return;
        }

        // Face player
        const direction = new THREE.Vector3()
            .subVectors(playerPos, bossPos)
            .normalize();
        this.boss.rotation.y = Math.atan2(direction.x, direction.z);

        const dist = playerPos.distanceTo(bossPos);

        // Boss behavior phases based on health
        const healthPercent = this.bossHealth / this.bossMaxHealth;

        // Movement
        if (dist > 8) {
            bossPos.x += direction.x * 3 * delta;
            bossPos.z += direction.z * 3 * delta;
        }

        // Attacks
        if (!this.boss.userData.lastAttack) this.boss.userData.lastAttack = 0;

        const attackCooldown = healthPercent > 0.5 ? 2 : 1;

        if (now - this.boss.userData.lastAttack > attackCooldown) {
            if (dist < 5) {
                // Ground slam
                this.bossGroundSlam();
            } else {
                // Ice projectile
                this.bossIceAttack(direction);
            }
            this.boss.userData.lastAttack = now;
        }

        // Arm animation
        const leftArm = this.boss.userData.leftArm;
        const rightArm = this.boss.userData.rightArm;
        if (leftArm && rightArm) {
            const swing = Math.sin(now * 2) * 0.2;
            leftArm.rotation.x = swing;
            rightArm.rotation.x = -swing;
        }

        this.updateHUD();
    }

    bossGroundSlam() {
        // Create shockwave effect
        const shockwave = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 8, 32),
            new THREE.MeshBasicMaterial({
                color: 0x88ddff,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            })
        );
        shockwave.position.copy(this.boss.position);
        shockwave.position.y = 0.1;
        shockwave.rotation.x = -Math.PI / 2;
        this.scene.add(shockwave);

        // Damage player if close
        const dist = this.player.position.distanceTo(this.boss.position);
        if (dist < 8) {
            this.takeDamage(20);
        }

        // Animate and remove shockwave
        let scale = 1;
        const animateShockwave = () => {
            scale += 0.3;
            shockwave.scale.set(scale, scale, 1);
            shockwave.material.opacity -= 0.05;

            if (shockwave.material.opacity > 0) {
                requestAnimationFrame(animateShockwave);
            } else {
                this.scene.remove(shockwave);
            }
        };
        animateShockwave();
    }

    bossIceAttack(direction) {
        // Fire multiple ice shards
        for (let i = -1; i <= 1; i++) {
            const projectile = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 0.8, 4),
                new THREE.MeshBasicMaterial({ color: 0x88ddff })
            );

            const dir = direction.clone();
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.2);

            projectile.position.copy(this.boss.position);
            projectile.position.y += 5;
            projectile.rotation.x = Math.PI / 2;
            projectile.userData.velocity = dir.multiplyScalar(25);
            projectile.userData.isEnemyProjectile = true;
            projectile.userData.damage = 15;
            projectile.userData.lifetime = 3;
            projectile.userData.spawnTime = this.clock.getElapsedTime();

            this.scene.add(projectile);
            this.projectiles.push(projectile);
        }
    }

    updateProjectiles(delta) {
        const now = this.clock.getElapsedTime();

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Move projectile
            proj.position.add(proj.userData.velocity.clone().multiplyScalar(delta));

            // Check lifetime
            if (now - proj.userData.spawnTime > proj.userData.lifetime) {
                this.scene.remove(proj);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Player projectile hits
            if (proj.userData.isPlayerProjectile) {
                // Check enemy hits
                for (const enemy of this.enemies) {
                    if (proj.position.distanceTo(enemy.position) < 1.5) {
                        enemy.userData.health -= proj.userData.damage;
                        this.scene.remove(proj);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }

                // Check boss hit
                if (this.boss && proj.position.distanceTo(this.boss.position) < 3) {
                    this.bossHealth -= proj.userData.damage;
                    this.scene.remove(proj);
                    this.projectiles.splice(i, 1);
                    this.updateHUD();
                }
            }

            // Enemy projectile hits player
            if (proj.userData.isEnemyProjectile) {
                if (proj.position.distanceTo(this.player.position) < 1) {
                    this.takeDamage(proj.userData.damage);
                    this.scene.remove(proj);
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }

    updateCollectibles() {
        const playerPos = this.player.position;

        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];

            // Rotate collectible
            collectible.rotation.y += 0.02;
            collectible.position.y += Math.sin(this.animationTime * 3 + i) * 0.002;

            // Check collection
            if (playerPos.distanceTo(collectible.position) < 1.5) {
                this.collectItem(collectible);
            }
        }
    }

    updateSnowfall(delta) {
        if (!this.snowParticles) return;

        const positions = this.snowParticles.geometry.attributes.position.array;
        const velocities = this.snowParticles.userData.velocities;

        for (let i = 0; i < velocities.length; i++) {
            positions[i * 3] += velocities[i].x * delta;
            positions[i * 3 + 1] += velocities[i].y * delta;
            positions[i * 3 + 2] += velocities[i].z * delta;

            // Reset if below ground
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = 100;
                positions[i * 3] = this.player.position.x + (Math.random() - 0.5) * 100;
                positions[i * 3 + 2] = this.player.position.z + (Math.random() - 0.5) * 100;
            }
        }

        this.snowParticles.geometry.attributes.position.needsUpdate = true;
    }

    updateInteractionPrompt() {
        const playerPos = this.player.position;
        let nearInteractable = false;

        for (const interactable of this.interactables) {
            if (playerPos.distanceTo(interactable.position) < interactable.radius) {
                nearInteractable = true;
                document.getElementById('interaction-prompt').textContent = 'Press E to interact';
                break;
            }
        }

        if (nearInteractable) {
            document.getElementById('interaction-prompt').classList.add('visible');
        } else {
            document.getElementById('interaction-prompt').classList.remove('visible');
        }
    }

    checkLevelCompletion() {
        if (!this.exitGate || !this.gateOpen) return;

        // Check if player reached exit
        const gatePos = this.exitGate.position;
        const playerPos = this.player.position;

        if (playerPos.distanceTo(gatePos) < 3) {
            this.nextLevel();
        }
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    window.game = new MiaCroftGame();
});
