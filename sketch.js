// --- Global Constants ---
const PLAYER_SPEED = 5;
const ENEMY_SPEED = 2;
const LEFT_PANEL_WIDTH = 200;
const DAMPING_FACTOR = 0.9; // Controls how quickly velocity decays (momentum)

// --- Global Variables ---
let player;
let enemies = [];
let bullets = []; // Store active bullets
let shopItems = []; // Items available in the shop
let selectedWeapon = null; // The weapon the player has chosen
let gameIsPaused = false;
let gameState = 'START'; // Possible values: 'START', 'PLAYING'

// --- Player Class Definition ---
class Player {
    constructor(x, y, size, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        // NEW: Velocity and Acceleration
        this.velX = 0;
        this.velY = 0;
        this.acceleration = 0.5; // How quickly the player speeds up
        this.inventory = []; // Player inventory
    }

    display() {
        fill(this.color);
        noStroke();
        ellipse(this.x, this.y, this.size);
    }

    // UPDATED: Implements momentum and physics-based movement
    move() {
        let inputX = 0;
        let inputY = 0;

        // 1. Calculate raw directional input
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
            inputX -= 1;
        }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
            inputX += 1;
        }
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
            inputY -= 1;
        }
        if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
            inputY += 1;
        }

        // 2. Apply Acceleration (No normalization needed here)
        this.velX += inputX * this.acceleration;
        this.velY += inputY * this.acceleration;

        // 3. Apply Damping (Momentum decay/Friction)
        this.velX *= DAMPING_FACTOR;
        this.velY *= DAMPING_FACTOR;

        // 4. Limit Max Speed (Constrain total velocity vector magnitude)
        let totalVelocity = sqrt(this.velX * this.velX + this.velY * this.velY);

        if (totalVelocity > PLAYER_SPEED) {
            // Factor is PLAYER_SPEED / totalVelocity
            let factor = PLAYER_SPEED / totalVelocity;
            this.velX *= factor;
            this.velY *= factor;
        }

        // 5. Update Position
        this.x += this.velX;
        this.y += this.velY;

        // 6. Keep player within the screen bounds
        this.x = constrain(this.x, this.size / 2, width - this.size / 2);
        this.y = constrain(this.y, this.size / 2, height - this.size / 2);
    }

    shoot() {
        // Auto-fire logic
        this.autoShoot(enemies);
    }

    getClosestEnemy(enemies) {
        let closestDist = Infinity;
        let closestEnemy = null;
        for (let enemy of enemies) {
            let d = dist(this.x, this.y, enemy.x, enemy.y);
            if (d < closestDist) {
                closestDist = d;
                closestEnemy = enemy;
            }
        }
        return closestEnemy;
    }

    autoShoot(enemies) {
        let target = this.getClosestEnemy(enemies);
        if (target && this.inventory.length > 0) {
            let weapon = this.inventory[0];
            let angle = atan2(target.y - this.y, target.x - this.x);
            weapon.shoot(this.x, this.y, angle);
        }
    }

    updateWeapons() {
        if (this.inventory.length > 0) {
            this.inventory[0].update(this.x, this.y);
        }
    }
}

// --- Enemy Class Definition ---
class Enemy {
    constructor(x, y, size, color, speed) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.speed = speed;
    }

    display() {
        fill(this.color);
        noStroke();
        ellipse(this.x, this.y, this.size);
    }

    // Move the enemy towards a target (the player)
    move(target) {
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let distance = dist(this.x, this.y, target.x, target.y);

        if (distance > 1) {
            let directionX = dx / distance;
            let directionY = dy / distance;

            this.x += directionX * this.speed;
            this.y += directionY * this.speed;
        }
    }
}

// --- Bullet Class Definition ---
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.vx = cos(angle) * this.speed;
        this.vy = sin(angle) * this.speed;
        this.size = 5;
        this.life = 100; // Frames to live
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    display() {
        fill(255, 255, 0);
        noStroke();
        ellipse(this.x, this.y, this.size);
    }

    isOffScreen() {
        return (this.x < 0 || this.x > width || this.y < 0 || this.y > height);
    }
}

// --- Weapon Class Definition ---
class Weapon {
    constructor(name, type) {
        this.name = name;
        this.type = type; // 'SMG', etc.
        this.lastShotTime = 0;
        this.burstCount = 0;
        this.isBursting = false;
        this.burstTimer = 0;

        // SMG Stats
        this.burstSize = 3;
        this.burstDelay = 5; // Frames between shots in a burst
        this.burstCooldown = 30; // Frames between bursts (0.5s at 60fps)
    }

    shoot(x, y, angle) {
        // Logic handled in update() for bursts
        if (!this.isBursting && frameCount - this.lastShotTime > this.burstCooldown) {
            this.isBursting = true;
            this.burstCount = 0;
            this.burstTimer = 0;
            // this.originX = x; // No longer needed
            // this.originY = y; // No longer needed
            this.angle = angle;
        }
    }

    update(x, y) {
        if (this.isBursting) {
            if (this.burstTimer % this.burstDelay === 0) {
                bullets.push(new Bullet(x, y, this.angle));
                this.burstCount++;
                if (this.burstCount >= this.burstSize) {
                    this.isBursting = false;
                    this.lastShotTime = frameCount;
                }
            }
            this.burstTimer++;
        }
    }
}

// --- p5.js Setup Function (Runs once at the start) ---
function setup() {
    let canvasWidth = windowWidth - LEFT_PANEL_WIDTH;
    let canvasHeight = windowHeight;

    // Store a reference to the canvas object
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('game-container');

    player = new Player(width / 2, height / 2, 30, color(255, 100, 100));
    enemies.push(new Enemy(50, 50, 20, color(100, 255, 100), ENEMY_SPEED));

    // Initialize Shop Items (3 SMGs)
    shopItems.push(new Weapon("SMG Alpha", "SMG"));
    shopItems.push(new Weapon("SMG Beta", "SMG"));
    shopItems.push(new Weapon("SMG Gamma", "SMG"));
}

// --- p5.js Draw Function (Runs continuously) ---
function draw() {
    // 1. Clear the screen (background)
    background(20);

    if (gameState === 'START') {
        drawStartScreen();
    } else if (gameState === 'PLAYING') {
        // 2. Update Logic (Conditional): Only run movement/AI if NOT paused
        if (!gameIsPaused) {
            // Player movement (WASD/Arrow keys)
            player.move();

            // Handle Shooting (Auto-Fire)
            player.shoot();
            player.updateWeapons();

            // Update Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].update();
                if (bullets[i].isOffScreen() || bullets[i].life <= 0) {
                    bullets.splice(i, 1);
                }
            }

            // Enemy movement/AI updates (chases player)
            for (let enemy of enemies) {
                enemy.move(player);
            }
        }

        // 3. Drawing Logic (Always Run)

        // Draw player
        player.display();

        // Draw Bullets
        for (let bullet of bullets) {
            bullet.display();
        }

        // Draw enemies 
        for (let enemy of enemies) {
            enemy.display();
        }


        // 4. Pause Overlay (Conditional)
        if (gameIsPaused) {
            // Draw the semi-transparent overlay (Black with 150 opacity)
            fill(0, 0, 0, 150);
            noStroke();
            rect(0, 0, width, height);

            // Display the PAUSED text
            fill(255); // White text
            textSize(48);
            textAlign(CENTER, CENTER);
            text("PAUSED", width / 2, height / 2);
            textSize(20);
            text("Press ESC to Resume", width / 2, height / 2 + 50);
        }
    }
}

function drawStartScreen() {
    fill(255);
    textAlign(CENTER, CENTER);

    // Draw Shop Items
    let startX = width / 2 - 220;
    let startY = height / 2 - 100;

    for (let i = 0; i < shopItems.length; i++) {
        // Skip if item has been bought (null)
        if (!shopItems[i]) continue;

        let x = startX + i * 150;
        let y = startY;
        let w = 140;
        let h = 140; // Square shape
        let cornerRadius = 10; // Rounded corners

        // Check for hover
        let isHovered = (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h);

        // Highlight selected item or hovered item
        if (selectedWeapon === shopItems[i] || isHovered) {
            stroke(255, 255, 0); // Yellow glow
            strokeWeight(isHovered ? 4 : 3); // Thicker border on hover
            fill(50, 50, 50);
        } else {
            stroke(100);
            strokeWeight(1);
            fill(30, 30, 30);
        }

        rect(x, y, w, h, cornerRadius);

        // Text
        noStroke();
        fill(255);
        textSize(16);
        text(shopItems[i].name, x + w / 2, y + 40);
        textSize(12);
        text("Burst Fire", x + w / 2, y + 70);
        text("Free", x + w / 2, y + 110);
    }

    textSize(24);
    fill(255);
    text("Choose a Weapon", width / 2, startY - 40);

    // Always show start prompt if we have an item (which is now in inventory)
    if (player.inventory.length > 0) {
        fill(100, 255, 100);
        text("Press ENTER to Start", width / 2, height - 50);
    }
}

function mousePressed() {
    if (gameState === 'START') {
        // Check if clicked on an item
        let startX = width / 2 - 220;
        let startY = height / 2 - 100;

        for (let i = 0; i < shopItems.length; i++) {
            // Skip if item is already bought
            if (!shopItems[i]) continue;

            let x = startX + i * 150;
            let y = startY;
            let w = 140;
            let h = 140; // Match new square size

            if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
                // Only allow picking one item for now
                if (player.inventory.length === 0) {
                    let item = shopItems[i];
                    player.inventory.push(item);
                    shopItems[i] = null; // Remove from shop but keep slot empty (prevent shifting)
                    selectedWeapon = item;
                    updateInventoryUI();
                }
            }
        }
    }
}

function updateInventoryUI() {
    const slots = document.querySelectorAll('.inventory-slot');
    for (let i = 0; i < slots.length; i++) {
        if (i < player.inventory.length) {
            slots[i].style.backgroundColor = '#666';
            slots[i].innerText = player.inventory[i].name.split(' ')[1] || 'W'; // Show 'Alpha', 'Beta' etc
            slots[i].style.display = 'flex';
            slots[i].style.justifyContent = 'center';
            slots[i].style.alignItems = 'center';
            slots[i].style.color = 'white';
            slots[i].style.fontSize = '0.8rem';
        } else {
            slots[i].style.backgroundColor = '#333';
            slots[i].innerText = '';
        }
    }
}

// --- p5.js Key Release Function ---
function keyReleased() {
    if (gameState === 'START') {
        if (keyCode === ENTER && player.inventory.length > 0) {
            gameState = 'PLAYING';
        }
    } else if (gameState === 'PLAYING') {
        if (keyCode === 27) { // ESC key
            gameIsPaused = !gameIsPaused;
        }
    }
}

// --- p5.js Window Resized Function (Handles dynamic canvas resizing) ---
function windowResized() {
    let canvasWidth = windowWidth - LEFT_PANEL_WIDTH;
    let canvasHeight = windowHeight;
    resizeCanvas(canvasWidth, canvasHeight);
}