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
const MELEE_RANGE = 40;
const MELEE_COOLDOWN = 500;
const MELEE_KNOCKBACK_FORCE = 350;
const STUN_DURATION = 1000;

// NEW: Enemy-specific constants
const BASE_ENEMY_SHOOT_COOLDOWN = 800; // Default shoot cooldown

const MELEE_ENEMY_ATTACK_RANGE = 40; // How close to attack
const MELEE_ENEMY_COOLDOWN = 1000; // 1 second between attacks
const MELEE_ENEMY_DAMAGE = 10;

const SHOOTER_ENEMY_SHOOT_COOLDOWN = 350; // Faster firing rate
const SHOOTER_MIN_FLEE_DISTANCE = 150; // If player is closer than this, run away
const SHOOTER_MAX_ENGAGE_DISTANCE = 400; // Will try to stay within this distance

// ===================================================================
// HELPER CLASSES (PLAYER AND ENEMY)
// ===================================================================

/**
 * A reusable class for our Player character.
 * Extends Arcade.Sprite to get physics and rendering.
 */
class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y, keys) {
        super(scene, x, y, 'solid');
        this.setDisplaySize(20, 20);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDragX(PLAYER_SPEED / (1 - FRICTION));
        this.body.setSize(1, 1);

        this.setTint(0xffff00);

        this.health = 100;
        this.maxHealth = 100;
        this.currentWeapon = 'Machine Gun';
        this.wallJumpsRemaining = MAX_WALL_JUMPS;
        this.dashesRemaining = MAX_DASHES;
        this.isDashing = false;
        this.isInvincible = false;
        this.movementDirection = 'right';

        this.lastDashReplenishTime = 0;
        this.lastShotTime = 0;
        this.lastMeleeTime = 0;

        this.keys = keys;
    }

    handleInput() {
        if (this.isDashing) return;

        if (this.keys.A.isDown) {
            this.setVelocityX(-PLAYER_SPEED);
            this.movementDirection = 'left';
        } else if (this.keys.D.isDown) {
            this.setVelocityX(PLAYER_SPEED);
            this.movementDirection = 'right';
        }

        const onGround = this.body.blocked.down;
        const onWall = this.body.blocked.left || this.body.blocked.right;

        if (Phaser.Input.Keyboard.JustDown(this.keys.W)) {
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

        this.scene.time.delayedCall(DASH_DURATION, () => {
            this.isDashing = false;
            this.body.setAllowGravity(true);
        });

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
        this.scene.meleeManager.swing(this.x, this.y, this.movementDirection);
        this.scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (distance < MELEE_RANGE && !enemy.isStunned) {
                enemy.stunAndKnockback(this.x, this.y);
            }
        });
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        this.health -= amount;
        // NEW: Add a flash effect on taking damage
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            ease: 'Power1'
        });
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
    
    update(time, delta) {
        if (Phaser.Input.Keyboard.JustUp(this.keys.W) && this.body.velocity.y < 0) {
            this.setVelocityY(0);
        }

        const onGround = this.body.blocked.down;
        const onWall = this.body.blocked.left || this.body.blocked.right;

        if (onGround) {
            this.wallJumpsRemaining = MAX_WALL_JUMPS;
        }

        if (onWall && !onGround && this.body.velocity.y > 0) {
            this.setVelocityY(WALL_SLIDE_SPEED);
        }

        if (this.dashesRemaining < MAX_DASHES && time > this.lastDashReplenishTime + DASH_REPLENISH_COOLDOWN) {
            this.dashesRemaining++;
            this.lastDashReplenishTime = time;
        }

        this.setTint(0xffff00);
        if (onWall) this.setTint(0xffff99);
        if (this.isInvincible) {
            this.setVisible(Math.floor(time / 80) % 2 === 0);
        } else {
            this.setVisible(true);
        }
    }
}

// NEW: BaseEnemy class to hold all shared enemy logic.
class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'solid') {
        super(scene, x, y, texture);
        this.setDisplaySize(30, 30);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setSize(1, 1);
        this.setDragX(PLAYER_SPEED / (1 - FRICTION));

        this.health = 100;
        this.maxHealth = 100;
        this.speed = 150;
        this.jumpPower = 450;
        this.direction = 'left';
        this.isStunned = false;

        this.lastShotTime = 0;
        this.shootCooldown = BASE_ENEMY_SHOOT_COOLDOWN;

        this.healthBar = this.scene.add.graphics();
    }

    stunAndKnockback(fromX, fromY) {
        this.isStunned = true;
        
        const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
        const knockbackVel = this.scene.physics.velocityFromRotation(angle, MELEE_KNOCKBACK_FORCE);
        this.setVelocity(knockbackVel.x, knockbackVel.y - 100);

        this.scene.time.delayedCall(STUN_DURATION, () => {
            this.isStunned = false;
        });
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.healthBar.destroy();
            this.destroy();
        }
    }

    shootAtPlayer(time) {
        const player = this.scene.player;
        if (!player.active || !player.body) return;
        
        if (time > this.lastShotTime + this.shootCooldown) {
            this.lastShotTime = time;
            this.scene.enemyPellets.fire(this.x, this.y, player.x, player.y);
        }
    }
    
    update(time, delta) {
        if (!this.active) return;

        // Health bar logic
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
            
        // Stun logic
        if (this.isStunned) {
            this.setTint(0x800080);
            return;
        }

        // Delegate specific behavior to subclasses
        this.updateAI(time, delta);

        // Common logic: fall off map
        if (this.y > this.scene.sys.game.config.height + 50) {
             this.setPosition(425, 140);
             this.setVelocity(0,0);
             this.health = this.maxHealth;
        }
    }

    // This method will be overridden by child classes
    updateAI(time, delta) {
        // To be implemented by subclasses
    }
}

// NEW: Melee-focused enemy
class MeleeEnemy extends BaseEnemy {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.setTint(0xff0000); // Red for melee
        this.speed = 150;
        this.lastMeleeTime = 0;
        this.health = 150;
        this.maxHealth = 150;
    }

    performMelee(player, time) {
        this.lastMeleeTime = time;
        player.takeDamage(MELEE_ENEMY_DAMAGE);
        this.scene.tweens.add({ // Visual feedback for attack
            targets: this,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true,
            ease: 'Power1'
        });
    }

    updateAI(time, delta) {
        this.setTint(0xff0000); // Reset tint
        const player = this.scene.player;
        if (!player.active) return;
        
        const horizontalDist = player.x - this.x;
        const verticalDist = player.y - this.y;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        const AGGRO_RANGE = 300;

        // 1. Attack
        if (distance < MELEE_ENEMY_ATTACK_RANGE && time > this.lastMeleeTime + MELEE_ENEMY_COOLDOWN) {
            this.performMelee(player, time);
        }

        // 2. Movement
        if (distance < AGGRO_RANGE && distance > MELEE_ENEMY_ATTACK_RANGE - 5) {
             if (horizontalDist > 0) {
                this.setVelocityX(this.speed);
                this.direction = 'right';
            } else {
                this.setVelocityX(-this.speed);
                this.direction = 'left';
            }
        } else {
            // Stop if too close or out of range
            this.setVelocityX(0);
        }

        // 3. Jumping (original AI jumping logic)
        const onGround = this.body.blocked.down;
        if (onGround && verticalDist < -this.height * 2) {
            this.setVelocityY(-this.jumpPower);
        }
        
        if (onGround && Math.abs(horizontalDist) > this.width) {
            const lookAheadX = this.x + (this.direction === 'right' ? this.width : -this.width);
            const wallInFront = this.scene.platforms.getChildren().some(p => 
                 p.body.hitTest(lookAheadX, this.y) && p.body.height > this.height
            );
            if (wallInFront) {
                this.setVelocityY(-this.jumpPower);
            }
        }
    }
}

// NEW: Ranged enemy that tries to keep its distance
class ShooterEnemy extends BaseEnemy {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.setTint(0x32a852); // Green for shooter
        this.speed = 100; // Slower, more deliberate
        this.shootCooldown = SHOOTER_ENEMY_SHOOT_COOLDOWN; // Use the faster cooldown
    }

    hasLineOfSight(target) {
        const lineOfSight = new Phaser.Geom.Line(this.x, this.y, target.x, target.y);
        const platforms = this.scene.platforms.getChildren();
        
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            const platBounds = plat.getBounds();
            if (Phaser.Geom.Intersects.LineToRectangle(lineOfSight, platBounds)) {
                return false; // Obstacle detected
            }
        }
        return true; // Clear shot
    }

    updateAI(time, delta) {
        this.setTint(0x32a852); // Reset tint
        const player = this.scene.player;
        if (!player.active) return;
        
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const hasLOS = this.hasLineOfSight(player);

        if (hasLOS) {
            this.shootAtPlayer(time); // Always shoot if LOS is clear

            if (distance < SHOOTER_MIN_FLEE_DISTANCE) {
                // Flee: Player is too close, move away horizontally
                if (player.x < this.x) this.setVelocityX(this.speed);
                else this.setVelocityX(-this.speed);
            } else if (distance > SHOOTER_MAX_ENGAGE_DISTANCE) {
                // Advance: Player is too far, move closer
                if (player.x > this.x) this.setVelocityX(this.speed);
                else this.setVelocityX(-this.speed);
            } else {
                // Optimal range: Stop moving to improve aim
                this.setVelocityX(0);
            }
        } else {
            // No LOS: Move towards player's X to try and find an angle
            if (player.x > this.x) this.setVelocityX(this.speed * 0.75);
            else this.setVelocityX(-this.speed * 0.75);
        }

        // Simple jump logic to get unstuck
        const onGround = this.body.blocked.down;
        if (onGround && (this.body.blocked.left || this.body.blocked.right)) {
            this.setVelocityY(-this.jumpPower);
        }
    }
}


// ===================================================================
// PROJECTILE CLASSES
// ===================================================================

class PlayerPelletGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);
        this.classType = PlayerPellet;
    }
    fire(x, y, targetX, targetY) {
        const pellet = this.create(x, y, 'solid');
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
        this.setActive(true);
        this.setVisible(true);
        this.body.setAllowGravity(false);
        this.setScale(8, 2);
        this.setTint(0x000000);
        
        const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        this.setRotation(angle);
        this.scene.physics.velocityFromRotation(angle, 420, this.body.velocity);
        this.lifespan = 2000;
    }
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.lifespan -= delta;
        if (this.lifespan <= 0) {
            this.destroy();
        }
    }
}
class EnemyPelletGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);
        this.classType = EnemyPellet;
    }
    fire(x, y, targetX, targetY) {
        const pellet = this.create(x, y, 'solid');
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
        this.setActive(true);
        this.setVisible(true);
        this.body.setAllowGravity(false);
        this.body.setCircle(1);
        this.setDisplaySize(10, 10);
        this.setTint(0xf58742);

        const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        this.scene.physics.velocityFromRotation(angle, 240, this.body.velocity);
        this.lifespan = 3000;
    }
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.lifespan -= delta;
        if (this.lifespan <= 0) {
            this.destroy();
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

        this.container = scene.add.container(hudX, hudY);
        this.container.setScrollFactor(0);

        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.4);
        bg.fillRect(0, 0, hudWidth, hudHeight);
        bg.lineStyle(2, 0xFFFFFF, 0.6);
        bg.strokeRect(0, 0, hudWidth, hudHeight);
        this.container.add(bg);
        
        const textStyle = { font: "14px 'Courier New'", fill: '#fff' };

        this.healthLabel = scene.add.text(padding, padding + 13, 'Health', textStyle).setOrigin(0, 0.5);
        this.healthBarBg = scene.add.graphics();
        this.healthBar = scene.add.graphics();
        this.container.add([this.healthLabel, this.healthBarBg, this.healthBar]);

        this.weaponText = scene.add.text(padding, 50, '', textStyle);
        this.jumpsText = scene.add.text(padding, 70, '', textStyle);
        this.dashesLabel = scene.add.text(padding, 90, 'Dashes:', textStyle);
        this.container.add([this.weaponText, this.jumpsText, this.dashesLabel]);
        
        this.dashBoxes = [];
        const dashBoxSize = 12;
        for (let i = 0; i < MAX_DASHES; i++) {
            const box = scene.add.graphics();
            this.container.add(box);
            this.dashBoxes.push(box);
        }
    }
    update() {
        const player = this.scene.player;
        if (!player.body) return;
        
        const barWidth = 120;
        const barHeight = 15;
        const barX = 80;
        const barY = 10;
        this.healthBarBg.clear().fillStyle(0x555555).fillRect(barX, barY, barWidth, barHeight);
        const healthPercentage = Phaser.Math.Clamp(player.health / player.maxHealth, 0, 1);
        this.healthBar.clear().fillStyle(0x2ecc71).fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        
        this.weaponText.setText(`Weapon: ${player.currentWeapon}`);
        this.jumpsText.setText(`Jumps: ${player.wallJumpsRemaining}`);

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

    preload() {
        const canvas = this.textures.createCanvas('solid', 1, 1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1, 1);
        canvas.refresh();
    }

    create() {
        this.cameras.main.setBackgroundColor('#87ceeb');
        
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT');
        this.input.mouse.disableContextMenu();

        const platformData = [
            { x: 0, y: 340, width: 640, height: 20 }, { x: 100, y: 280, width: 100, height: 10 },
            { x: 250, y: 220, width: 100, height: 10 }, { x: 400, y: 160, width: 100, height: 10 },
            { x: 500, y: 200, width: 20, height: 140 }, { x: 0, y: 100, width: 20, height: 240 },
        ];
        
        this.platforms = this.physics.add.staticGroup();
        
        platformData.forEach(p => {
            const plat = this.platforms.create(p.x + p.width / 2, p.y + p.height / 2, 'solid');
            plat.setDisplaySize(p.width, p.height).setTint(0x654321).refreshBody();
        });
        
        this.player = new Player(this, 50, 200, this.keys);

        // MODIFIED: Use a group that runs the update loop on its children
        this.enemies = this.add.group({
            classType: BaseEnemy, // Set a base class if needed, though we add specific ones
            runChildUpdate: true  // This is crucial! It calls the update method on each enemy.
        });

        // MODIFIED: Add one of each new enemy type
        this.enemies.add(new MeleeEnemy(this, 425, 140));
        this.enemies.add(new ShooterEnemy(this, 550, 100));

        this.playerPellets = new PlayerPelletGroup(this);
        this.enemyPellets = new EnemyPelletGroup(this);
        
        this.meleeManager = new MeleeManager(this);
        this.ui = new GameUI(this);

        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        this.physics.add.overlap(this.playerPellets, this.enemies, this.handlePlayerPelletHitEnemy, null, this);
        this.physics.add.collider(this.playerPellets, this.platforms, (pellet) => pellet.destroy());

        this.physics.add.overlap(this.enemyPellets, this.player, this.handleEnemyPelletHitPlayer, null, this);
        this.physics.add.collider(this.enemyPellets, this.platforms, (pellet) => pellet.destroy());
        
        this.cursor = this.add.graphics();
    }
    
    handlePlayerPelletHitEnemy(enemy, pellet) {
        pellet.destroy();
        enemy.takeDamage(10);
    }
    
    handleEnemyPelletHitPlayer(player, pellet) {
        pellet.destroy();
        player.takeDamage(5);
    }

    update(time, delta) {
        // Player update is called manually
        this.player.handleInput();
        this.player.update(time, delta);
        
        if(this.player.y > this.sys.game.config.height + 50) {
            this.player.reset();
        }

        if (this.input.activePointer.isDown) {
            this.player.shoot(this.input.activePointer.x, this.input.activePointer.y);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
            this.player.performMelee();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
            this.player.performDash();
        }
        
        this.ui.update();
        
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
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY },
            debug: true
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);