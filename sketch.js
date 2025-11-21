// --- Global Constants ---
const PLAYER_SPEED = 5;
const ENEMY_SPEED = 2; 
const LEFT_PANEL_WIDTH = 200; 
const DAMPING_FACTOR = 0.9; // Controls how quickly velocity decays (momentum)

// --- Global Variables ---
let player; 
let enemies = []; 
let gameIsPaused = false; 

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

// --- p5.js Setup Function (Runs once at the start) ---
function setup() {
    let canvasWidth = windowWidth - LEFT_PANEL_WIDTH;
    let canvasHeight = windowHeight;

    // Store a reference to the canvas object
    let canvas = createCanvas(canvasWidth, canvasHeight); 
    canvas.parent('game-container');
    
    player = new Player(width / 2, height / 2, 30, color(255, 100, 100)); 
    enemies.push(new Enemy(50, 50, 20, color(100, 255, 100), ENEMY_SPEED)); 
}

// --- p5.js Draw Function (Runs continuously) ---
function draw() {
    // 1. Clear the screen (background)
    background(20); 

    // 2. Update Logic (Conditional): Only run movement/AI if NOT paused
    if (!gameIsPaused) {
        // Player movement (WASD/Arrow keys)
        player.move();
        
        // Enemy movement/AI updates (chases player)
        for (let enemy of enemies) {
            enemy.move(player); 
        }
    }
    
    // 3. Drawing Logic (Always Run)
    
    // Draw player
    player.display();

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

// --- p5.js Key Release Function ---
function keyReleased() {
    if (keyCode === 27) {
        gameIsPaused = !gameIsPaused;
    }
}

// --- p5.js Window Resized Function (Handles dynamic canvas resizing) ---
function windowResized() {
    let canvasWidth = windowWidth - LEFT_PANEL_WIDTH;
    let canvasHeight = windowHeight;
    resizeCanvas(canvasWidth, canvasHeight);
}