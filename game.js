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
const MELEE_RANGE = 300;
const MELEE_COOLDOWN = 400;
const MELEE_KNOCKBACK_FORCE = 2000;
const MELEE_ANIMATION_DURATION = 180;
const STUN_DURATION = 1000;
const SLASH_WIDTH = 300;  // The length of the slash arc.
const SLASH_CURVE = 90;   // How much the slash curves. Higher number = bigger arc.
const SLASH_OFFSET =50;  // NEW: How far from the player's center the slash appears.


// Enemy-specific constants
const BASE_ENEMY_SHOOT_COOLDOWN = 800;
const ENEMY_SEPARATION_RADIUS = 60;
const ENEMY_SEPARATION_FORCE = 600;

const MELEE_ENEMY_ATTACK_RANGE = 40;
const MELEE_ENEMY_COOLDOWN = 1000;
const MELEE_ENEMY_DAMAGE = 10;
const MELEE_ENEMY_INITIAL_AGGRO_RANGE = 350;

const SHOOTER_ENEMY_SHOOT_COOLDOWN = 350;
const SHOOTER_MIN_FLEE_DISTANCE = 150;
const SHOOTER_MAX_ENGAGE_DISTANCE = 400;

// ===================================================================
// HELPER CLASSES (PLAYER AND ENEMY)
// ===================================================================

class Player extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y, keys, meleeManager) {
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
		this.meleeManager = meleeManager;
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
	performMelee(targetX, targetY) {
		const now = this.scene.time.now;
		if (now - this.lastMeleeTime < MELEE_COOLDOWN) return;
		this.lastMeleeTime = now;
	
		// Use the coordinates that were passed in.
		const angleToCursor = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
	
		// Call the manager, passing "this" (the player instance) and the coordinates.
		this.meleeManager.swing(this, targetX, targetY);
	
		this.scene.enemies.getChildren().forEach(enemy => {
			if (!enemy.active || enemy.isStunned) return;
			const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
			if (distance < MELEE_RANGE) {
				const angleToEnemy = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
				const angleDifference = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - angleToCursor));
				if (angleDifference <= Phaser.Math.DegToRad(50)) {
					enemy.stunAndKnockback(this.x, this.y);
				}
			}
		});
	}
	takeDamage(amount) {
		if (this.isInvincible) return;
		this.health -= amount;
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

class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y, texture = 'solid') {
		super(scene, x, y, texture);
		this.setDisplaySize(30, 30);
		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.setCollideWorldBounds(true);
		this.body.setSize(1, 1);
		this.setDrag(500, 0);
		this.health = 100;
		this.maxHealth = 100;
		this.speed = 150;
		this.jumpPower = 450;
		this.direction = 'left';
		this.isStunned = false;
		this.lastShotTime = 0;
		this.shootCooldown = BASE_ENEMY_SHOOT_COOLDOWN;
		this.healthBar = this.scene.add.graphics();
		this.wallJumpsRemaining = MAX_WALL_JUMPS;
		this.wallSlideSpeed = WALL_SLIDE_SPEED / 2;
	}
	performWallJump() {
		if (this.wallJumpsRemaining <= 0) return;
		const onLeftWall = this.body.blocked.left;
		const onRightWall = this.body.blocked.right;
		if (!onLeftWall && !onRightWall) return;
		this.wallJumpsRemaining--;
		const kickX = onLeftWall ? WALL_JUMP_KICKOFF_X : -WALL_JUMP_KICKOFF_X;
		this.setVelocityY(-WALL_JUMP_KICKOFF_Y * 0.9);
		this.setVelocityX(kickX);
		this.direction = onLeftWall ? 'right' : 'left';
	}
	applySeparation() {
		let separationX = 0;
		this.scene.enemies.getChildren().forEach(otherEnemy => {
			if (otherEnemy === this || !otherEnemy.active) return;
			const distance = Phaser.Math.Distance.Between(this.x, this.y, otherEnemy.x, otherEnemy.y);
			if (distance < ENEMY_SEPARATION_RADIUS) {
				const pushForce = (ENEMY_SEPARATION_RADIUS - distance) / ENEMY_SEPARATION_RADIUS;
				separationX += (this.x - otherEnemy.x) * pushForce;
			}
		});
		const totalSeparation = new Phaser.Math.Vector2(separationX, 0);
		if (totalSeparation.length() > 0) {
			totalSeparation.normalize().scale(ENEMY_SEPARATION_FORCE);
			this.setAccelerationX(this.body.acceleration.x + totalSeparation.x);
		}
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
			const spawnY = this.y - 10;
			this.scene.enemyPellets.fire(this.x, spawnY, player.x, player.y);
		}
	}
	update(time, delta) {
		if (!this.active) return;
		const barWidth = 30;
		const barHeight = 5;
		const barX = this.x - barWidth / 2;
		const barY = this.y - 20;
		const healthPercentage = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
		this.healthBar.clear()
			.fillStyle(0x550000).fillRect(barX, barY, barWidth, barHeight)
			.fillStyle(0x00ff00).fillRect(barX, barY, barWidth * healthPercentage, barHeight);
		if (this.isStunned) {
			this.setTint(0x800080);
			this.setAcceleration(0, 0);
			return;
		}
		this.setAccelerationX(0);
		const onGround = this.body.blocked.down;
		const onWall = this.body.blocked.left || this.body.blocked.right;
		if (onGround) {
			this.wallJumpsRemaining = MAX_WALL_JUMPS;
		}
		if (onWall && !onGround && this.body.velocity.y > 0) {
			this.setVelocityY(this.wallSlideSpeed);
		}
		this.updateAI(time, delta);
		this.applySeparation();
		if (this.y > this.scene.sys.game.config.height + 50) {
			this.setPosition(425, 140);
			this.setVelocity(0, 0);
			this.health = this.maxHealth;
		}
	}
	updateAI(time, delta) {}
}

class MeleeEnemy extends BaseEnemy {
	constructor(scene, x, y) {
		super(scene, x, y);
		this.setTint(0xff0000);
		this.speed = 800;
		this.lastMeleeTime = 0;
		this.health = 150;
		this.maxHealth = 150;
		this.hasSpottedPlayer = false;
	}
	performMelee(player, time) {
		this.lastMeleeTime = time;
		player.takeDamage(MELEE_ENEMY_DAMAGE);
		this.scene.tweens.add({
			targets: this,
			scaleX: 1.2,
			scaleY: 1.2,
			duration: 100,
			yoyo: true,
			ease: 'Power1'
		});
	}
	updateAI(time, delta) {
		this.setTint(this.hasSpottedPlayer ? 0xFF4500 : 0xff0000);
		const player = this.scene.player;
		if (!player.active) return;
		const horizontalDist = player.x - this.x;
		const verticalDist = player.y - this.y;
		const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
		const onWall = this.body.blocked.left || this.body.blocked.right;
		const onGround = this.body.blocked.down;
		const playerIsAbove = player.y < this.y - this.height;
		if (!this.hasSpottedPlayer && distance < MELEE_ENEMY_INITIAL_AGGRO_RANGE) {
			this.hasSpottedPlayer = true;
		}
		if (this.hasSpottedPlayer) {
			if (distance > MELEE_ENEMY_ATTACK_RANGE - 5) {
				if (horizontalDist > 0) this.setAccelerationX(this.speed);
				else this.setAccelerationX(-this.speed);
			} else {
				this.setAccelerationX(0);
			}
		}
		if (distance < MELEE_ENEMY_ATTACK_RANGE && time > this.lastMeleeTime + MELEE_ENEMY_COOLDOWN) {
			this.performMelee(player, time);
		}
		if (onWall && !onGround && playerIsAbove) {
			this.performWallJump();
			return;
		}
		if (onGround && verticalDist < -this.height * 2) {
			this.setVelocityY(-this.jumpPower);
		}
		if (onGround && Math.abs(horizontalDist) > this.width) {
			const lookAheadX = this.x + (this.direction === 'right' ? this.width : -this.width);
			const wallInFront = this.scene.platforms.getChildren().some(p =>
				p.body.hitTest(lookAheadX, this.y) && p.body.height > this.height
			);
			if (wallInFront) this.setVelocityY(-this.jumpPower);
		}
	}
}

class ShooterEnemy extends BaseEnemy {
	constructor(scene, x, y) {
		super(scene, x, y);
		this.setTint(0x32a852);
		this.speed = 700;
		this.shootCooldown = SHOOTER_ENEMY_SHOOT_COOLDOWN;
	}
	hasLineOfSight(target) {
		const lineOfSight = new Phaser.Geom.Line(this.x, this.y, target.x, target.y);
		const platforms = this.scene.platforms.getChildren();
		for (let i = 0; i < platforms.length; i++) {
			const plat = platforms[i];
			const platBounds = plat.getBounds();
			if (Phaser.Geom.Intersects.LineToRectangle(lineOfSight, platBounds)) return false;
		}
		return true;
	}
	updateAI(time, delta) {
		this.setTint(0x32a852);
		const player = this.scene.player;
		if (!player.active) return;
		const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
		const hasLOS = this.hasLineOfSight(player);
		const onWall = this.body.blocked.left || this.body.blocked.right;
		const onGround = this.body.blocked.down;
		if (onWall && !onGround && this.body.velocity.y >= 0) {
			this.performWallJump();
			return;
		}
		if (hasLOS) {
			this.shootAtPlayer(time);
			if (distance < SHOOTER_MIN_FLEE_DISTANCE) {
				if (player.x < this.x) this.setAccelerationX(this.speed);
				else this.setAccelerationX(-this.speed);
			} else if (distance > SHOOTER_MAX_ENGAGE_DISTANCE) {
				if (player.x > this.x) this.setAccelerationX(this.speed);
				else this.setAccelerationX(-this.speed);
			} else {
				this.setAccelerationX(0);
			}
		} else {
			if (player.x > this.x) this.setAccelerationX(this.speed * 0.75);
			else this.setAccelerationX(-this.speed * 0.75);
		}
		if (onGround && (this.body.blocked.left || this.body.blocked.right)) {
			this.setVelocityY(-this.jumpPower * 0.8);
		}
	}
}

// ===================================================================
// PROJECTILE & OTHER CLASSES
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
		this.body.setCircle(0.1);
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
// Constants to define the slash's appearance. Tweak these to your liking.


class MeleeManager {
	constructor(scene) {
		this.scene = scene;
		this.textureKey = 'melee_slash_texture';

		if (!this.scene.textures.exists(this.textureKey)) {
			this.createSlashTexture();
		}
	}

	createSlashTexture() {
		const graphics = this.scene.add.graphics();
		const curve = new Phaser.Curves.QuadraticBezier(
			new Phaser.Math.Vector2(0, SLASH_CURVE),
			new Phaser.Math.Vector2(SLASH_WIDTH / 2, 0),
			new Phaser.Math.Vector2(SLASH_WIDTH, SLASH_CURVE)
		);
		for (let i = 0; i < 7; i++) {
			graphics.lineStyle(18 - (i * 2.5), 0xffffff, 1.0 - (i * 0.15));
			curve.draw(graphics);
		}
		graphics.generateTexture(this.textureKey, SLASH_WIDTH, SLASH_CURVE);
		graphics.destroy();
	}

	swing(player, targetX, targetY) {
		const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
		const slashX = player.x + Math.cos(angle) * SLASH_OFFSET;
		const slashY = player.y + Math.sin(angle) * SLASH_OFFSET;

		const slash = this.scene.add.sprite(slashX, slashY, this.textureKey);

		slash.setOrigin(0.5, 0.5);

		// Apply the final rotation: the angle to the cursor PLUS 90 degrees.
		slash.setRotation(angle + Phaser.Math.DegToRad(90));

		slash.setDepth(player.depth + 1);

		this.scene.tweens.add({
			targets: slash,
			alpha: { from: 1, to: 0 },
			scale: { from: 1, to: 1.2 },
			duration: 200,
			ease: 'Power2',
			onComplete: () => {
				slash.destroy();
			}
		});
	}
}
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
		const textStyle = {
			font: "14px 'Courier New'",
			fill: '#fff'
		};
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
			box.clear().fillStyle(color).fillRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize).lineStyle(1, 0xFFFFFF).strokeRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize);
		});
	}
}

// ===================================================================
// MAIN GAME SCENE & CONFIG
// ===================================================================

class GameScene extends Phaser.Scene {
	constructor() {
		super({
			key: 'GameScene'
		});
	}
	preload() {
		const canvas = this.textures.createCanvas('solid', 1, 1);
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, 1, 1);
		canvas.refresh();
		this.createSlashTextures();
	}

	createSlashTextures() {
		const width = MELEE_RANGE * 2.5;
		const height = MELEE_RANGE * 2;

		// --- Slash 1: Standard horizontal ---
		let gfx = this.add.graphics().setVisible(false);
		this.drawSlash(gfx, 1); // Standard curviness
		gfx.generateTexture('slash1', width, height);
		gfx.destroy();

		// --- Slash 2: A slightly flatter slash ---
		gfx = this.add.graphics().setVisible(false);
		this.drawSlash(gfx, 0.7); // Less curvy
		gfx.generateTexture('slash2', width, height);
		gfx.destroy();

		// --- Slash 3: A more aggressive, curved slash ---
		gfx = this.add.graphics().setVisible(false);
		this.drawSlash(gfx, 1.3); // More curvy
		gfx.generateTexture('slash3', width, height);
		gfx.destroy();

		// --- Slash 4: Another slight variation ---
		gfx = this.add.graphics().setVisible(false);
		this.drawSlash(gfx, 1.1);
		gfx.generateTexture('slash4', width, height);
		gfx.destroy();
	}

	drawSlash(graphics, curviness = 1) {
		const w = MELEE_RANGE * 2.5;
		const h = MELEE_RANGE * 2;

		// THE FIX: We draw the curve relative to the texture's top-left (0,0).
		// This makes the pivot point predictable.
		const startPoint = new Phaser.Math.Vector2(0, h / 2);
		const controlPoint = new Phaser.Math.Vector2(w / 2, h / 2 - (MELEE_RANGE * curviness));
		const endPoint = new Phaser.Math.Vector2(w * 0.9, h * 0.4);

		const curve = new Phaser.Curves.QuadraticBezier(startPoint, controlPoint, endPoint);

		for (let i = 0; i < 6; i++) {
			const alpha = 1.0 - (i * 0.15);
			const lineWidth = 15 - (i * 2.5);

			graphics.lineStyle(lineWidth, 0xffffff, alpha);
			curve.draw(graphics);
		}
	}

	create() {
		this.cameras.main.setBackgroundColor('#87ceeb');
		this.keys = this.input.keyboard.addKeys('W,A,D,E,V,SHIFT,SPACE');
		this.input.mouse.disableContextMenu();
		const platformData = [
			{ x: 0, y: 980, width: 1500, height: 20 },
			{ x: 0, y: 0, width: 1500, height: 20 },
			{ x: 0, y: 20, width: 20, height: 960 },
			{ x: 1480, y: 20, width: 20, height: 960 },
			{ x: 500, y: 650, width: 500, height: 30 },
			{ x: 650, y: 850, width: 200, height: 20 },
			{ x: 1000, y: 680, width: 20, height: 150 },
			{ x: 480, y: 680, width: 20, height: 150 },
			{ x: 20, y: 800, width: 300, height: 20 },
			{ x: 400, y: 720, width: 30, height: 150 },
			{ x: 150, y: 550, width: 250, height: 20 },
			{ x: 20, y: 300, width: 200, height: 20 },
			{ x: 300, y: 150, width: 150, height: 20 },
			{ x: 1200, y: 800, width: 280, height: 20 },
			{ x: 1150, y: 500, width: 20, height: 300 },
			{ x: 1250, y: 400, width: 230, height: 20 },
			{ x: 1000, y: 250, width: 200, height: 20 },
			{ x: 1350, y: 150, width: 130, height: 20 },
			{ x: 800, y: 450, width: 100, height: 20 },
			{ x: 600, y: 300, width: 100, height: 20 },
			{ x: 1000, y: 100, width: 20, height: 80 },
		];
		this.platforms = this.physics.add.staticGroup();
		platformData.forEach(p => {
			const plat = this.platforms.create(p.x + p.width / 2, p.y + p.height / 2, 'solid');
			plat.setDisplaySize(p.width, p.height).setTint(0x654321).refreshBody();
		});
		this.player = new Player(this, 50, 200, this.keys, new MeleeManager(this));
		this.enemies = this.add.group({
			classType: BaseEnemy,
			runChildUpdate: true
		});
		const meleeSpawns = [{ x: 1400, y: 900 }, { x: 700, y: 900 }, { x: 100, y: 700 }, { x: 750, y: 600 }, { x: 1400, y: 350 }, ];
		const shooterSpawns = [{ x: 750, y: 200 }, { x: 1400, y: 100 }, { x: 80, y: 250 }, { x: 1250, y: 750 }, { x: 200, y: 500 }, ];
		meleeSpawns.forEach(spawn => this.enemies.add(new MeleeEnemy(this, spawn.x, spawn.y)));
		shooterSpawns.forEach(spawn => this.enemies.add(new ShooterEnemy(this, spawn.x, spawn.y)));

		this.playerPellets = new PlayerPelletGroup(this);
		this.enemyPellets = new EnemyPelletGroup(this);
		// this.meleeManager = new MeleeManager(this);
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
		this.player.handleInput();
		this.player.update(time, delta);
		if (this.player.y > this.sys.game.config.height + 50) {
			this.player.reset();
		}
		if (this.input.activePointer.isDown && this.input.activePointer.leftButtonDown()) {
			this.player.shoot(this.input.activePointer.x, this.input.activePointer.y);
		}

		if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
			const pointer = this.input.activePointer;
			this.player.performMelee(pointer.worldX, pointer.worldY);
		}
		// Also change the 'V' key handler to match
		if (Phaser.Input.Keyboard.JustDown(this.keys.V)) {
			const pointer = this.input.activePointer;
			this.player.performMelee(pointer.worldX, pointer.worldY);
		}

		if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
			this.player.performDash();
		}
		this.ui.update();
		const pointer = this.input.activePointer;
		const cursorSize = 10;
		this.cursor.clear().lineStyle(2, 0x000000, 0.8).moveTo(pointer.x - cursorSize, pointer.y).lineTo(pointer.x + cursorSize, pointer.y).moveTo(pointer.x, pointer.y - cursorSize).lineTo(pointer.x, pointer.y + cursorSize).strokePath();
	}
}
const config = {
	type: Phaser.AUTO,
	width: 1500,
	height: 1000,
	parent: 'game-container',
	pixelArt: true,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: {
				y: GRAVITY
			},
			debug: false
		}
	},
	scene: [GameScene]
};
const game = new Phaser.Game(config);