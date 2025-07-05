// ===================================================================
// GAME CONSTANTS
// ===================================================================
// Note: We define constants here so they can be accessed by all classes.
const GRAVITY = 800; // Phaser's physics values are typically larger
const FRICTION = 0.8; // We'll use drag for this

// Player Movement
const PLAYER_SPEED = 200;
const PLAYER_JUMP_POWER = 450;
const MAX_WALL_JUMPS = 3;
const WALL_SLIDE_SPEED = 100;
const WALL_JUMP_KICKOFF_X = 200;
const WALL_JUMP_KICKOFF_Y = 400;

// Dash constants
const DASH_SPEED = 500;
const DASH_DURATION = 180; // in milliseconds
const DASH_INVINCIBILITY_DURATION = 200; // in milliseconds
const MAX_DASHES = 3;
const DASH_REPLENISH_COOLDOWN = 1500; // 1.5 seconds

// Combat Constants
const PLAYER_SHOOT_COOLDOWN = 80;
const ENEMY_SHOOT_COOLDOWN = 1200;
const MELEE_RANGE = 40;
const MELEE_COOLDOWN = 500;
const MELEE_KNOCKBACK_FORCE = 350;
const STUN_DURATION = 1000;

// ===================================================================
// HELPER CLASSES (PLAYER AND ENEMY)
// ===================================================================

/**
 * A reusable class for our Player character.
 * Extends Arcade.Sprite to get physics and rendering.
 */
class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {
        super(scene, x, y, 'solid'); // Use 'solid' texture
        this.setDisplaySize(20, 20); // Set the visual size

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // --- Core Properties ---
        this.setCollideWorldBounds(true);
        // this.body.setGravityY(GRAVITY);
        this.setDragX(PLAYER_SPEED / (1 - FRICTION)); // Simulate friction with drag
        this.body.setSize(1, 1); // Set correct hitbox size

        this.setTint(0xffff00); // <-- ADD THIS LINE


        // --- Custom State from Original Game ---
        this.health = 100;
        this.maxHealth = 100;
        this.currentWeapon = 'Machine Gun';
        this.wallJumpsRemaining = MAX_WALL_JUMPS;
        this.dashesRemaining = MAX_DASHES;
        this.isDashing = false;
        this.isInvincible = false;
        this.movementDirection = 'right';

        // --- Timers ---
        this.lastDashReplenishTime = 0;
        this.lastShotTime = 0;
        this.lastMeleeTime = 0;
    }

    handleInput(keys) {
        if (this.isDashing) return; // No movement input while dashing

        // Horizontal Movement
        if (keys.A.isDown) {
            this.setVelocityX(-PLAYER_SPEED);
            this.movementDirection = 'left';
        } else if (keys.D.isDown) {
            this.setVelocityX(PLAYER_SPEED);
            this.movementDirection = 'right';
        } else {
            // setVelocityX(0) would fight drag, so we let drag handle stopping
        }

        // Jumping and Wall Jumping
        const onGround = this.body.blocked.down;
        const onWall = this.body.blocked.left || this.body.blocked.right;

        if (Phaser.Input.Keyboard.JustDown(keys.W)) {
            if (onGround) {
                this.setVelocityY(-PLAYER_JUMP_POWER);
            } else if (onWall && this.wallJumpsRemaining > 0) {
                this.setVelocityY(-WALL_JUMP_KICKOFF_Y);
                this.setVelocityX(this.body.blocked.left ? WALL_JUMP_KICKOFF_X : -WALL_JUMP_KICKOFF_X);
                this.wallJumpsRemaining--;
            }
        }
    }

    performDash() {
        if (this.dashesRemaining <= 0 || this.isDashing) return;

        this.dashesRemaining--;
        this.isDashing = true;
        this.isInvincible = true;

        this.body.setAllowGravity(false);
        this.setVelocity(this.movementDirection === 'right' ? DASH_SPEED : -DASH_SPEED, 0);

        // End Dash Timer
        this.scene.time.delayedCall(DASH_DURATION, () => {
            this.isDashing = false;
            this.body.setAllowGravity(true);
            // Don't reset velocity here, let drag take over for a smoother feel
        });

        // End Invincibility Timer
        this.scene.time.delayedCall(DASH_INVINCIBILITY_DURATION, () => {
            this.isInvincible = false;
        });
    }

    shoot(targetX, targetY) {
        const now = this.scene.time.now;
        if (now - this.lastShotTime < PLAYER_SHOOT_COOLDOWN) return;
        this.lastShotTime = now;

        this.scene.playerPellets.fire(this.x, this.y, targetX, targetY);
    }
    
    performMelee() {
        const now = this.scene.time.now;
        if (now - this.lastMeleeTime < MELEE_COOLDOWN) return;
        this.lastMeleeTime = now;
        
        // Visual Effect
        this.scene.meleeManager.swing(this.x, this.y, this.movementDirection);

        // Hit Detection
        this.scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return; // Don't hit inactive enemies
            const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (distance < MELEE_RANGE && !enemy.isStunned) {
                enemy.stunAndKnockback(this.x, this.y);
            }
        });
    }


    takeDamage(amount) {
        if (this.isInvincible) return;

        this.health -= amount;
        // this.scene.cameras.main.shake(100, 0.01); // Screen shake on hit

        if (this.health <= 0) {
            this.reset();
        }
    }

    reset() {
        this.setPosition(50, 200);
        this.setVelocity(0, 0);
        this.health = this.maxHealth;
        this.dashesRemaining = MAX_DASHES;
        this.wallJumpsRemaining = MAX_WALL_JUMPS;
        this.lastDashReplenishTime = this.scene.time.now;
    }
    
    // This is called automatically by the scene's update loop
    update(time, delta) {
        const onGround = this.body.blocked.down;
        const onWall = this.body.blocked.left || this.body.blocked.right;

        // Reset jumps when on ground
        if (onGround) {
            this.wallJumpsRemaining = MAX_WALL_JUMPS;
        }

        // Wall Sliding
        if (onWall && !onGround && this.body.velocity.y > 0) {
            this.setVelocityY(WALL_SLIDE_SPEED);
        }

        // Dash replenishment
        if (this.dashesRemaining < MAX_DASHES && time > this.lastDashReplenishTime + DASH_REPLENISH_COOLDOWN) {
            this.dashesRemaining++;
            this.lastDashReplenishTime = time;
        }

        // Visual State
        this.setTint(0xffff00); // Default yellow
        if (onWall) this.setTint(0xffff99); // Lighter yellow on wall
        if (this.isInvincible) {
            // Flashing effect
            this.setVisible(Math.floor(time / 80) % 2 === 0);
        } else {
            this.setVisible(true);
        }
    }
}


/**
 * A class for Enemies. Similar structure to Player.
 */
class Enemy extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {
        super(scene, x, y, 'solid'); // Use 'solid' texture
        this.setDisplaySize(20, 20); // Set the visual size

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        // this.body.setGravityY(GRAVITY);
        this.body.setSize(1, 1);
        this.setDragX(PLAYER_SPEED / (1 - FRICTION));

        this.setTint(0xff0000);

        this.health = 100;
        this.maxHealth = 100;
        this.speed = 150;
        this.jumpPower = 450;
        this.wallJumpsRemaining = MAX_WALL_JUMPS;
        this.direction = 'left';
        this.isStunned = false;
        
        this.lastShotTime = 0;
        this.shootCooldown = ENEMY_SHOOT_COOLDOWN;
        
        // Add health bar graphics to the enemy itself
        this.healthBar = this.scene.add.graphics();
    }
    
    stunAndKnockback(fromX, fromY) {
        this.isStunned = true;
        
        const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
        const knockbackVel = this.scene.physics.velocityFromRotation(angle, MELEE_KNOCKBACK_FORCE);
        this.setVelocity(knockbackVel.x, knockbackVel.y - 100); // Add a little upward pop

        this.scene.time.delayedCall(STUN_DURATION, () => {
            this.isStunned = false;
        });
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.healthBar.destroy(); // Clean up the graphics object
            this.destroy(); // Remove from game
        }
    }

    // This is called automatically by the group's update loop
    update(time, delta) {
        if (!this.active) { // <-- ADD THIS CHECK
            return;
        }
        // Update health bar position
        const barWidth = 30;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 20;
        const healthPercentage = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        this.healthBar.clear()
            .fillStyle(0x550000)
            .fillRect(barX, barY, barWidth, barHeight)
            .fillStyle(0x00ff00)
            .fillRect(barX, barY, barWidth * healthPercentage, barHeight);
            
        if (this.isStunned) {
            this.setTint(0x800080); // Purple when stunned
            return;
        }

        // Reset tint
        this.setTint(0xff0000); // Default red
        const onWall = this.body.blocked.left || this.body.blocked.right;
        if(onWall) this.setTint(0xff9999); // Lighter red on wall

        const onGround = this.body.blocked.down;
        if (onGround) {
            this.wallJumpsRemaining = MAX_WALL_JUMPS;
        }

        // --- Basic AI ---
        const player = this.scene.player;
        if (!player.active) return; // Don't run AI if player is inactive
        
        const horizontalDist = player.x - this.x;
        const verticalDist = player.y - this.y;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        const ATTACK_RANGE = 300;

        // 1. Movement
        if (distance < ATTACK_RANGE && distance > this.width) {
            if (horizontalDist > 0) {
                this.setVelocityX(this.speed);
                this.direction = 'right';
            } else {
                this.setVelocityX(-this.speed);
                this.direction = 'left';
            }
        }

        // 2. Shooting
        if (distance < ATTACK_RANGE * 1.5 && time > this.lastShotTime + this.shootCooldown) {
            this.lastShotTime = time;
            this.scene.enemyPellets.fire(this.x, this.y, player.x, player.y);
        }
        
        // 3. Jumping
        const JUMP_DECISION_THRESHOLD = -this.height * 2;
        if (onGround && verticalDist < JUMP_DECISION_THRESHOLD) {
            this.setVelocityY(-this.jumpPower);
        }
        
        // Check for walls in the way and jump over them
        if (onGround && Math.abs(horizontalDist) > this.width) {
            const lookAheadX = this.x + (this.direction === 'right' ? this.width : -this.width);
            // This is a simplified check, a better way would be raycasting or checking a small box
            const wallInFront = this.scene.platforms.getChildren().some(p => 
                 p.body.hitTest(lookAheadX, this.y) && p.body.height > this.height
            );
            if (wallInFront) {
                this.setVelocityY(-this.jumpPower);
            }
        }
        
        if (this.y > this.scene.sys.game.config.height + 50) {
             this.setPosition(425, 140);
             this.setVelocity(0,0);
             this.health = this.maxHealth;
        }
    }
}


// ===================================================================
// PROJECTILE CLASSES
// ===================================================================

/**
 * A group to manage all player pellets.
 */
class PlayerPelletGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);

        this.createMultiple({
            classType: PlayerPellet,
            frameQuantity: 30, // Pre-allocate 30 pellets
            active: false,
            visible: false,
            key: 'solid'
        });
    }

    fire(x, y, targetX, targetY) {
        const pellet = this.getFirstDead(true);
        if (pellet) {
            pellet.fire(x, y, targetX, targetY);
        }
    }
}

class PlayerPellet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'solid');
    }

    fire(x, y, targetX, targetY) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.setAllowGravity(false);
        this.setScale(8, 2); // Make it look like a line
        this.setTint(0x000000);
        
        const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        this.setRotation(angle);

        this.scene.physics.velocityFromRotation(angle, 420, this.body.velocity); // 420 is speed (7 * 60fps)

        // Deactivate after some time to clean up
        this.lifespan = 2000;
    }
    
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.lifespan -= delta;
        if (this.lifespan <= 0) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

/**
 * A group to manage all enemy pellets.
 */
class EnemyPelletGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);

        this.createMultiple({
            classType: EnemyPellet,
            frameQuantity: 30,
            active: false,
            visible: false,
            key: 'solid'
        });
    }

    fire(x, y, targetX, targetY) {
        const pellet = this.getFirstDead(true);
        if (pellet) {
            pellet.fire(x, y, targetX, targetY);
        }
    }
}

class EnemyPellet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'solid');
    }

    fire(x, y, targetX, targetY) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.setAllowGravity(false);
        this.body.setCircle(1); // Circular hitbox
        this.setDisplaySize(10, 10);
        this.setTint(0xf58742);

        const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        this.scene.physics.velocityFromRotation(angle, 240, this.body.velocity); // 240 speed (4 * 60fps)

        this.lifespan = 3000;
    }
    
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.lifespan -= delta;
        if (this.lifespan <= 0) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

/**
 * Manages the visual effect for melee attacks.
 */
class MeleeManager {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
    }

    swing(x, y, direction) {
        this.graphics.clear();
        this.graphics.lineStyle(3, 0xFFFFFF, 0.8);

        const radius = MELEE_RANGE;
        let startAngle, endAngle;

        if (direction === 'right') {
            startAngle = Phaser.Math.DegToRad(-45);
            endAngle = Phaser.Math.DegToRad(45);
        } else {
            startAngle = Phaser.Math.DegToRad(135);
            endAngle = Phaser.Math.DegToRad(225);
        }

        this.graphics.beginPath();
        this.graphics.arc(x, y, radius, startAngle, endAngle, false);
        this.graphics.strokePath();

        // Clear the graphic after a short time
        this.scene.time.delayedCall(150, () => {
            this.graphics.clear();
        });
    }
}


// ===================================================================
// UI CLASS
// ===================================================================
class GameUI {
    constructor(scene) {
        this.scene = scene;
        
        const hudWidth = 220;
        const hudHeight = 105;
        const margin = 10;
        const hudX = scene.sys.game.config.width - hudWidth - margin;
        const hudY = margin;
        const padding = 10;

        // Create a container to hold all UI elements
        this.container = scene.add.container(hudX, hudY);
        this.container.setScrollFactor(0); // Make it stay in place

        // Background
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.4);
        bg.fillRect(0, 0, hudWidth, hudHeight);
        bg.lineStyle(2, 0xFFFFFF, 0.6);
        bg.strokeRect(0, 0, hudWidth, hudHeight);
        this.container.add(bg);
        
        const textStyle = { font: "14px 'Courier New'", fill: '#fff' };

        // Health
        this.healthLabel = scene.add.text(padding, padding + 13, 'Health', textStyle).setOrigin(0, 0.5);
        this.healthBarBg = scene.add.graphics();
        this.healthBar = scene.add.graphics();
        this.container.add([this.healthLabel, this.healthBarBg, this.healthBar]);

        // Other Text
        this.weaponText = scene.add.text(padding, 50, '', textStyle);
        this.jumpsText = scene.add.text(padding, 70, '', textStyle);
        this.dashesLabel = scene.add.text(padding, 90, 'Dashes:', textStyle);
        this.container.add([this.weaponText, this.jumpsText, this.dashesLabel]);
        
        // Dash indicators
        this.dashBoxes = [];
        const dashBoxSize = 12;
        const dashBoxSpacing = 5;
        for (let i = 0; i < MAX_DASHES; i++) {
            const box = scene.add.graphics();
            this.container.add(box);
            this.dashBoxes.push(box);
        }
    }
    
    update() {
        const player = this.scene.player;
        
        // Health bar update
        const barWidth = 120;
        const barHeight = 15;
        const barX = 80;
        const barY = 10;
        this.healthBarBg.clear().fillStyle(0x555555).fillRect(barX, barY, barWidth, barHeight);
        const healthPercentage = Phaser.Math.Clamp(player.health / player.maxHealth, 0, 1);
        this.healthBar.clear().fillStyle(0x2ecc71).fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        
        // Text update
        this.weaponText.setText(`Weapon: ${player.currentWeapon}`);
        this.jumpsText.setText(`Jumps: ${player.wallJumpsRemaining}`);

        // Dashes update
        const dashBoxSize = 12;
        const dashBoxSpacing = 5;
        this.dashBoxes.forEach((box, i) => {
            const dashBoxX = 80 + i * (dashBoxSize + dashBoxSpacing);
            const dashBoxY = 90 - dashBoxSize / 1.5;
            const color = (i < player.dashesRemaining) ? 0x3498db : 0x555555;
            box.clear()
               .fillStyle(color)
               .fillRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize)
               .lineStyle(1, 0xFFFFFF)
               .strokeRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize);
        });
    }
}


// ===================================================================
// MAIN GAME SCENE
// ===================================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    /**
     * Load assets here.
     */
    preload() {
        // Create a 1x1 white texture that we can tint and scale
        const canvas = this.textures.createCanvas('solid', 1, 1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // Fill with white
        ctx.fillRect(0, 0, 1, 1);
        
        // Crucially, tell Phaser to update the texture in the GPU
        canvas.refresh();
    }


    /**
     * Create game objects here.
     */
    create() {
        this.cameras.main.setBackgroundColor('#87ceeb');
        
        // --- Setup Input ---
        this.keys = this.input.keyboard.addKeys('W,A,D,E,SHIFT');
        this.input.mouse.disableContextMenu(); // Prevent right-click menu

        const platformData = [
            { x: 0, y: 340, width: 640, height: 20 }, { x: 100, y: 280, width: 100, height: 10 },
            { x: 250, y: 220, width: 100, height: 10 }, { x: 400, y: 160, width: 100, height: 10 },
            { x: 500, y: 200, width: 20, height: 140 }, { x: 0, y: 100, width: 20, height: 240 },
        ];
        
        // We use a STATIC group to ensure all platforms are immovable and stable.
        this.platforms = this.physics.add.staticGroup();
        
        platformData.forEach(p => {
            // By default, physics bodies are positioned by their center.
            // We add half the width/height to the top-left coordinates to position them correctly.
            const plat = this.platforms.create(p.x + p.width / 2, p.y + p.height / 2, 'solid');
        
            // Now, we set the visual size and apply it to the physics hitbox.
            plat.setDisplaySize(p.width, p.height)
                .setTint(0x654321)
                .refreshBody(); // CRITICAL: This syncs the physics body to the new display size.
        });
        // --- Create Player ---
        this.player = new Player(this, 50, 200);

        // --- Create Enemies ---
        this.enemies = this.add.group({
            classType: Enemy,
            runChildUpdate: true // This is crucial for their AI to run!
        });
        this.enemies.add(new Enemy(this, 425, 140));

        // --- Create Projectile Groups ---
        this.playerPellets = new PlayerPelletGroup(this);
        this.enemyPellets = new EnemyPelletGroup(this);
        
        // --- Create Managers ---
        this.meleeManager = new MeleeManager(this);
        this.ui = new GameUI(this);

        // --- Setup Collisions ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        this.physics.add.overlap(this.playerPellets, this.enemies, this.handlePlayerPelletHitEnemy, null, this);
        this.physics.add.collider(this.playerPellets, this.platforms, (pellet) => pellet.setActive(false).setVisible(false));

        this.physics.add.overlap(this.enemyPellets, this.player, this.handleEnemyPelletHitPlayer, null, this);
        this.physics.add.collider(this.enemyPellets, this.platforms, (pellet) => pellet.setActive(false).setVisible(false));
        
        // --- Cursor ---
        this.cursor = this.add.graphics();
    }
    
    // --- Collision Callbacks ---
    
    // CORRECTED: This is a Group vs. Group collision, so the arguments are (memberOfFirstGroup, memberOfSecondGroup)
    handlePlayerPelletHitEnemy(enemy, pellet) {
        pellet.setActive(false).setVisible(false);
        enemy.takeDamage(10);
    }
    
    // CORRECTED: This is a Group vs. Sprite collision, so the arguments are (sprite, memberOfGroup)
    handleEnemyPelletHitPlayer(player, pellet) {
        console.log(typeof pellet);
        console.log(typeof player);
        pellet.setActive(false).setVisible(false);
        player.takeDamage(5);
    }

    /**
     * The main game loop, called every frame.
     */
    update(time, delta) {
        // Player update (input and other logic)
        this.player.handleInput(this.keys);
        this.player.update(time, delta);
        
        if(this.player.y > this.sys.game.config.height + 50) {
            this.player.reset();
        }

        // --- Handle player actions ---
        if (this.input.activePointer.isDown) {
            this.player.shoot(this.input.activePointer.x, this.input.activePointer.y);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
            this.player.performMelee();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
            this.player.performDash();
        }
        
        // Update UI
        this.ui.update();
        
        // Draw custom cursor
        const pointer = this.input.activePointer;
        const cursorSize = 10;
        this.cursor.clear()
            .lineStyle(2, 0x000000, 0.8)
            .moveTo(pointer.x - cursorSize, pointer.y)
            .lineTo(pointer.x + cursorSize, pointer.y)
            .moveTo(pointer.x, pointer.y - cursorSize)
            .lineTo(pointer.x, pointer.y + cursorSize)
            .strokePath();
    }
}

// ===================================================================
// PHASER GAME CONFIGURATION
// ===================================================================

const config = {
    type: Phaser.AUTO,
    width: 640,
    height: 360,
    parent: 'game-container', // This should match a div id in your HTML if you use one
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY },
            debug: true // Set to true to see physics bodies
        }
    },
    scene: [GameScene]
};

// Start the game
const game = new Phaser.Game(config);