// // ===================================================================
// // TYPE DEFINITIONS
// // ===================================================================

// /** A generic object with a position and dimensions. */
// interface GameObject {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//   }
  
//   /** Represents which side a character is on a wall, or if they are not on a wall. */
//   type WallSide = 'left' | 'right' | false;
  
//   /** Represents the four cardinal directions, mainly for aiming. */
//   type AimDirection = 'right' | 'left' | 'up' | 'down';
  
//   /** Represents horizontal movement direction. */
//   type MovementDirection = 'right' | 'left';
  
//   /** Base interface for a character that moves and is affected by physics. */
//   interface MovableObject extends GameObject {
//     dx: number;
//     dy: number;
//     speed: number;
//     jumpPower: number;
//     onGround: boolean;
//     onWall: WallSide;
//     wallJumpsRemaining: number;
//   }
  
//   /** The player character's state. */
//   interface Player extends MovableObject {
//     color: string;
//     direction: AimDirection;
//     movementDirection: MovementDirection;
//     health: number;
//     maxHealth: number;
//     currentWeapon: string;
//     dashesRemaining: number;
//     isDashing: boolean;
//     dashEndTime: number;
//     isInvincible: boolean;
//     invincibilityEndTime: number;
//     lastDashReplenishTime: number;
//   }
  
//   /** An enemy character's state. */
//   interface Enemy extends MovableObject {
//     color: string;
//     direction: MovementDirection;
//     shootCooldown: number;
//     lastShotTime: number;
//     health: number;
//     maxHealth: number;
//     isStunned: boolean;
//     stunEndTime: number;
//   }
  
//   /** A stationary platform. */
//   interface Platform extends GameObject {}
  
//   /** A player-fired projectile (represented as a line). */
//   interface PlayerPellet {
//     x: number;
//     y: number;
//     dx: number;
//     dy: number;
//     drawDx: number;
//     drawDy: number;
//     length: number;
//     color: string;
//   }
  
//   /** An enemy-fired projectile (represented as a circle). */
//   interface EnemyPellet {
//     x: number;
//     y: number;
//     radius: number;
//     dx: number;
//     dy: number;
//     color: string;
//   }
  
//   /** A visual effect for a melee attack. */
//   interface MeleeSlash {
//     x: number;
//     y: number;
//     radius: number;
//     creationTime: number;
//     duration: number;
//     direction: MovementDirection;
//   }
  
//   /** The state of all keyboard keys being tracked. */
//   interface KeyStates {
//     [key: string]: boolean;
//   }
  
//   /** The position of the mouse cursor. */
//   interface MousePosition {
//     x: number;
//     y: number;
//   }
  
  
//   // ===================================================================
//   // GAME IMPLEMENTATION (IIFE)
//   // ===================================================================
  
//   (function () {
//       const canvas = document.getElementById('game') as HTMLCanvasElement;
//       if (!canvas) {
//           console.error("Canvas element with id 'game' could not be found.");
//           return;
//       }
  
//       const ctx = canvas.getContext('2d')!;
//       if (!ctx) {
//           console.error("2D rendering context could not be initialized.");
//           return;
//       }
  
//       // Game Constants
//       const GRAVITY: number = 0.5;
//       const FRICTION: number = 0.8;
//       const WALL_SLIDE_SPEED: number = 1.5;
//       const WALL_JUMP_KICKOFF: number = 5;
//       const MAX_WALL_JUMPS: number = 3;
  
//       // Dash constants
//       const DASH_SPEED: number = 12;
//       const DASH_DURATION: number = 180; // in milliseconds
//       const DASH_INVINCIBILITY_DURATION: number = 200; // in milliseconds
//       const MAX_DASHES: number = 3;
//       const DASH_REPLENISH_COOLDOWN: number = 1500; // 1.5 seconds
  
//       // Combat Constants
//       const PLAYER_SHOOT_COOLDOWN: number = 80;
//       const ENEMY_SHOOT_COOLDOWN: number = 1200;
//       const MELEE_RANGE: number = 40;
//       const MELEE_COOLDOWN: number = 500;
//       const MELEE_KNOCKBACK_FORCE: number = 8;
//       const STUN_DURATION: number = 1000;
  
//       // Game State
//       const keys: KeyStates = {};
//       const mousePos: MousePosition = { x: 0, y: 0 };
//       let isMouseDown: boolean = false;
  
//       const player: Player = {
//           x: 50,
//           y: 200,
//           width: 20,
//           height: 20,
//           color: '#ff0',
//           dx: 0,
//           dy: 0,
//           speed: 3,
//           jumpPower: -10,
//           onGround: false,
//           direction: 'right',
//           movementDirection: 'right',
//           onWall: false,
//           wallJumpsRemaining: MAX_WALL_JUMPS,
//           health: 100,
//           maxHealth: 100,
//           currentWeapon: 'Machine Gun',
//           dashesRemaining: MAX_DASHES,
//           isDashing: false,
//           dashEndTime: 0,
//           isInvincible: false,
//           invincibilityEndTime: 0,
//           lastDashReplenishTime: 0,
//       };
  
//       let lastShotTime: number = 0;
//       let lastMeleeTime: number = 0;
//       const meleeSlashes: MeleeSlash[] = [];
  
//       const platforms: Platform[] = [
//           { x: 0, y: 340, width: 640, height: 20 },
//           { x: 100, y: 280, width: 100, height: 10 },
//           { x: 250, y: 220, width: 100, height: 10 },
//           { x: 400, y: 160, width: 100, height: 10 },
//           { x: 500, y: 200, width: 20, height: 140 },
//           { x: 0, y: 100, width: 20, height: 240 },
//       ];
  
//       const enemies: Enemy[] = [
//           {
//               x: 425,
//               y: 140,
//               width: 20,
//               height: 20,
//               color: '#f00',
//               dx: 0,
//               dy: 0,
//               speed: 2.5,
//               jumpPower: -10,
//               onGround: false,
//               direction: 'left',
//               onWall: false,
//               wallJumpsRemaining: MAX_WALL_JUMPS,
//               shootCooldown: ENEMY_SHOOT_COOLDOWN,
//               lastShotTime: 0,
//               health: 100,
//               maxHealth: 100,
//               isStunned: false,
//               stunEndTime: 0,
//           },
//       ];
  
//       const pellets: PlayerPellet[] = [];
//       const enemyPellets: EnemyPellet[] = [];
  
//       function shootPellet(): void {
//           const now = Date.now();
//           if (now - lastShotTime < PLAYER_SHOOT_COOLDOWN) return;
//           lastShotTime = now;
  
//           const playerCenterX = player.x + player.width / 2;
//           const playerCenterY = player.y + player.height / 2;
  
//           let dx = mousePos.x - playerCenterX;
//           let dy = mousePos.y - playerCenterY;
//           const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
  
//           const bulletSpeed = 7;
//           const normalizedDx = dx / magnitude;
//           const normalizedDy = dy / magnitude;
  
//           pellets.push({
//               x: playerCenterX,
//               y: playerCenterY,
//               dx: normalizedDx * bulletSpeed,
//               dy: normalizedDy * bulletSpeed,
//               drawDx: normalizedDx,
//               drawDy: normalizedDy,
//               length: 8,
//               color: '#000',
//           });
//       }
  
//       function performDash(): void {
//           if (player.dashesRemaining <= 0 || player.isDashing) return;
  
//           player.dashesRemaining--;
//           player.isDashing = true;
//           player.isInvincible = true;
//           player.dashEndTime = Date.now() + DASH_DURATION;
//           player.invincibilityEndTime =
//               Date.now() + DASH_INVINCIBILITY_DURATION;
  
//           player.dx =
//               player.movementDirection === 'right' ? DASH_SPEED : -DASH_SPEED;
//           player.dy = 0; // Make the dash sharp and horizontal
//       }
  
//       function performMeleeAttack(): void {
//           const now = Date.now();
//           if (now - lastMeleeTime < MELEE_COOLDOWN) return;
//           lastMeleeTime = now;
  
//           meleeSlashes.push({
//               x: player.x + player.width / 2,
//               y: player.y + player.height / 2,
//               radius: MELEE_RANGE,
//               creationTime: now,
//               duration: 150,
//               direction: player.movementDirection,
//           });
  
//           for (const enemy of enemies) {
//               const dx = enemy.x - player.x;
//               const dy = enemy.y - player.y;
//               const distance = Math.sqrt(dx * dx + dy * dy);
  
//               if (distance < MELEE_RANGE) {
//                   enemy.isStunned = true;
//                   enemy.stunEndTime = now + STUN_DURATION;
//                   const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
//                   enemy.dx = (dx / magnitude) * MELEE_KNOCKBACK_FORCE;
//                   enemy.dy = ((dy / magnitude) * MELEE_KNOCKBACK_FORCE) / 2 - 3;
//                   break; // Only hit one enemy per swing
//               }
//           }
//       }
  
//       canvas.addEventListener('mousemove', (e: MouseEvent) => {
//           const rect = canvas.getBoundingClientRect();
//           mousePos.x = e.clientX - rect.left;
//           mousePos.y = e.clientY - rect.top;
//       });
  
//       canvas.addEventListener('mousedown', (e: MouseEvent) => {
//           isMouseDown = true;
//       });
  
//       window.addEventListener('mouseup', (e: MouseEvent) => {
//           isMouseDown = false;
//       });
  
//       window.addEventListener('keydown', (e: KeyboardEvent) => {
//           const key = e.key.toLowerCase();
//           keys[key] = true;
//           if (key === 'w') {
//               if (player.onGround) {
//                   player.dy = player.jumpPower;
//                   player.onGround = false;
//               } else if (player.onWall && player.wallJumpsRemaining > 0) {
//                   player.dy = player.jumpPower;
//                   player.dx =
//                       player.onWall === 'left'
//                           ? WALL_JUMP_KICKOFF
//                           : -WALL_JUMP_KICKOFF;
//                   player.wallJumpsRemaining--;
//                   player.onWall = false;
//               }
//           }
//           if (key === 'e') {
//               performMeleeAttack();
//           }
//           if (key === 'shift') {
//               performDash();
//           }
//       });
  
//       window.addEventListener('keyup', (e: KeyboardEvent) => {
//           keys[e.key.toLowerCase()] = false;
//       });
  
//       function checkCollision(objA: GameObject, objB: GameObject): boolean {
//           return (
//               objA.x < objB.x + objB.width &&
//               objA.x + objA.width > objB.x &&
//               objA.y < objB.y + objB.height &&
//               objA.y + objA.height > objB.y
//           );
//       }
  
//       function resetPlayer(): void {
//           player.x = 50;
//           player.y = 200;
//           player.dx = 0;
//           player.dy = 0;
//           player.wallJumpsRemaining = MAX_WALL_JUMPS;
//           player.onGround = false;
//           player.health = player.maxHealth;
//           player.direction = 'right';
//           player.movementDirection = 'right';
//           player.dashesRemaining = MAX_DASHES;
//           player.isDashing = false;
//           player.isInvincible = false;
//           player.lastDashReplenishTime = Date.now();
//       }
  
//       function update(): void {
//           const now = Date.now();
  
//           // Handle player state (dashing, invincible)
//           if (player.isDashing && now > player.dashEndTime) {
//               player.isDashing = false;
//               player.dx *= 0.5; // Apply friction immediately after dash
//           }
//           if (player.isInvincible && now > player.invincibilityEndTime) {
//               player.isInvincible = false;
//           }
  
//           // Handle dash replenishment
//           if (
//               player.dashesRemaining < MAX_DASHES &&
//               now > player.lastDashReplenishTime + DASH_REPLENISH_COOLDOWN
//           ) {
//               player.dashesRemaining++;
//               player.lastDashReplenishTime = now;
//           }
  
//           // Player Movement & Physics are skipped during dash
//           if (!player.isDashing) {
//               if (keys['a']) {
//                   player.dx = -player.speed;
//                   player.movementDirection = 'left';
//               } else if (keys['d']) {
//                   player.dx = player.speed;
//                   player.movementDirection = 'right';
//               } else {
//                   player.dx *= FRICTION;
//               }
  
//               player.dy += GRAVITY;
//               if (player.onWall && player.dy > 0 && !player.onGround) {
//                   player.dy = WALL_SLIDE_SPEED;
//               }
//           }
  
//           // Player Actions (Shooting can happen while dashing)
//           if (isMouseDown) {
//               shootPellet();
//           }
  
//           // Update player's aiming direction based on mouse
//           const aimDx = mousePos.x - (player.x + player.width / 2);
//           const aimDy = mousePos.y - (player.y + player.height / 2);
//           if (Math.abs(aimDx) > Math.abs(aimDy)) {
//               player.direction = aimDx > 0 ? 'right' : 'left';
//           } else {
//               player.direction = aimDy > 0 ? 'down' : 'up';
//           }
  
//           // Platform Collision (This happens regardless of dash state)
//           let nextX = player.x + player.dx;
//           let nextY = player.y + player.dy;
//           player.onGround = false;
//           player.onWall = false;
//           for (const plat of platforms) {
//               const playerNextX: GameObject = { ...player, x: nextX };
//               const playerNextY: GameObject = { ...player, y: nextY };
//               if (checkCollision(playerNextX, plat)) {
//                   if (player.dx > 0) {
//                       nextX = plat.x - player.width;
//                       player.onWall = 'right';
//                   } else if (player.dx < 0) {
//                       nextX = plat.x + plat.width;
//                       player.onWall = 'left';
//                   }
//                   player.dx = 0;
//                   if (player.isDashing) player.isDashing = false;
//               }
//               if (checkCollision(playerNextY, plat)) {
//                   if (player.dy > 0) {
//                       nextY = plat.y - player.height;
//                       player.dy = 0;
//                       player.onGround = true;
//                       player.wallJumpsRemaining = MAX_WALL_JUMPS;
//                   } else if (player.dy < 0) {
//                       nextY = plat.y + plat.height;
//                       player.dy = 0;
//                   }
//                   if (player.isDashing) player.isDashing = false;
//               }
//           }
//           player.x = nextX;
//           player.y = nextY;
  
//           // Boundary checks
//           if (player.x < 0) { player.x = 0; player.dx = 0; }
//           if (player.x + player.width > canvas.width) { player.x = canvas.width - player.width; player.dx = 0; }
//           if (player.y > canvas.height) resetPlayer();
  
//           // --- Enemy update loop ---
//           for (let i = enemies.length - 1; i >= 0; i--) {
//               const enemy = enemies[i];
  
//               if (enemy.isStunned && now > enemy.stunEndTime) {
//                   enemy.isStunned = false;
//               }
  
//               enemy.dy += GRAVITY;
//               if (!enemy.isStunned) {
//                   enemy.dx *= FRICTION;
//               }
  
//               if (!enemy.isStunned) {
//                   const horizontalDist = player.x - enemy.x;
//                   const verticalDist = player.y - enemy.y;
//                   const JUMP_DECISION_THRESHOLD = -enemy.height * 2;
//                   const ATTACK_RANGE = 300;
//                   enemy.direction = horizontalDist > 0 ? 'right' : 'left';
//                   if (
//                       Math.abs(horizontalDist) > 5 &&
//                       Math.abs(horizontalDist) < ATTACK_RANGE
//                   ) {
//                     const sign = (num: number) => (num > 0 ? 1 : num < 0 ? -1 : 0);

//                     enemy.dx = enemy.speed * sign(horizontalDist);
//                   }
  
//                   if (enemy.onGround) {
//                       let shouldJump = false;
//                       if (verticalDist < JUMP_DECISION_THRESHOLD) shouldJump = true;
//                       const pathCheckWidth = 5;
//                       const pathCheckX =
//                           enemy.direction === 'right'
//                               ? enemy.x + enemy.width
//                               : enemy.x - pathCheckWidth;
//                       const pathChecker: GameObject = {
//                           x: pathCheckX,
//                           y: enemy.y,
//                           width: pathCheckWidth,
//                           height: enemy.height,
//                       };
//                       for (const plat of platforms)
//                           if (
//                               checkCollision(pathChecker, plat) &&
//                               plat.height > enemy.height
//                           ) {
//                               shouldJump = true;
//                               break;
//                           }
//                       if (shouldJump) {
//                           enemy.dy = enemy.jumpPower;
//                           enemy.onGround = false;
//                       }
//                   } else if (
//                       enemy.onWall &&
//                       enemy.wallJumpsRemaining > 0 &&
//                       verticalDist < 0
//                   ) {
//                       enemy.dy = enemy.jumpPower;
//                       enemy.dx =
//                           enemy.onWall === 'left'
//                               ? WALL_JUMP_KICKOFF
//                               : -WALL_JUMP_KICKOFF;
//                       enemy.wallJumpsRemaining--;
//                       enemy.onWall = false;
//                   }
  
//                   if (now - enemy.lastShotTime > enemy.shootCooldown) {
//                       enemy.lastShotTime = now;
//                       const playerCenterX = player.x + player.width / 2;
//                       const playerCenterY = player.y + player.height / 2;
//                       const enemyCenterX = enemy.x + enemy.width / 2;
//                       const enemyCenterY = enemy.y + enemy.height / 2;
//                       let dx = playerCenterX - enemyCenterX;
//                       let dy = playerCenterY - enemyCenterY;
//                       const magnitude = Math.sqrt(dx * dx + dy * dy);
//                       if (magnitude > 0 && magnitude < ATTACK_RANGE * 1.5) {
//                           const bulletSpeed = 4;
//                           const normalizedDx = (dx / magnitude) * bulletSpeed;
//                           const normalizedDy = (dy / magnitude) * bulletSpeed;
//                           enemyPellets.push({
//                               x: enemyCenterX,
//                               y: enemyCenterY,
//                               radius: 5,
//                               dx: normalizedDx,
//                               dy: normalizedDy,
//                               color: '#f58742',
//                           });
//                       }
//                   }
//               }
//               if (enemy.onWall && enemy.dy > 0 && !enemy.onGround) {
//                   enemy.dy = WALL_SLIDE_SPEED;
//               }
//               let enemyNextX = enemy.x + enemy.dx;
//               let enemyNextY = enemy.y + enemy.dy;
//               enemy.onGround = false;
//               enemy.onWall = false;
//               for (const plat of platforms) {
//                   const enemyNextXBox: GameObject = { ...enemy, x: enemyNextX };
//                   const enemyNextYBox: GameObject = { ...enemy, y: enemyNextY };
//                   if (checkCollision(enemyNextXBox, plat)) {
//                       if (enemy.dx > 0) {
//                           enemyNextX = plat.x - enemy.width;
//                           enemy.onWall = 'right';
//                       } else if (enemy.dx < 0) {
//                           enemyNextX = plat.x + plat.width;
//                           enemy.onWall = 'left';
//                       }
//                       enemy.dx = 0;
//                   }
//                   if (checkCollision(enemyNextYBox, plat)) {
//                       if (enemy.dy > 0) {
//                           enemyNextY = plat.y - enemy.height;
//                           enemy.dy = 0;
//                           enemy.onGround = true;
//                           enemy.wallJumpsRemaining = MAX_WALL_JUMPS;
//                       } else if (enemy.dy < 0) {
//                           enemyNextY = plat.y + plat.height;
//                           enemy.dy = 0;
//                       }
//                   }
//               }
//               enemy.x = enemyNextX;
//               enemy.y = enemyNextY;
//               if (enemy.x < 0) { enemy.x = 0; enemy.dx = 0; }
//               if (enemy.x + enemy.width > canvas.width) {
//                   enemy.x = canvas.width - enemy.width;
//                   enemy.dx = 0;
//               }
//               if (enemy.y > canvas.height) {
//                   // Reset enemy if it falls off
//                   enemy.x = 425;
//                   enemy.y = 140;
//                   enemy.dx = 0;
//                   enemy.dy = 0;
//                   enemy.wallJumpsRemaining = MAX_WALL_JUMPS;
//                   enemy.health = enemy.maxHealth;
//               }
//           }
  
//           // --- Melee Slash Updates ---
//           for (let i = meleeSlashes.length - 1; i >= 0; i--) {
//               if (
//                   Date.now() - meleeSlashes[i].creationTime >
//                   meleeSlashes[i].duration
//               ) {
//                   meleeSlashes.splice(i, 1);
//               }
//           }
  
//           // --- Player Pellet Update logic ---
//           for (let i = pellets.length - 1; i >= 0; i--) {
//               const p = pellets[i];
//               p.x += p.dx;
//               p.y += p.dy;
//               let hitSomething = false;
//               const pelletBox: GameObject = { x: p.x - 2, y: p.y - 2, width: 4, height: 4 };
//               for (let j = enemies.length - 1; j >= 0; j--) {
//                   const enemy = enemies[j];
//                   if (checkCollision(pelletBox, enemy)) {
//                       enemy.health -= 10;
//                       hitSomething = true;
//                       if (enemy.health <= 0) {
//                           enemies.splice(j, 1);
//                       }
//                       break;
//                   }
//               }
//               if (hitSomething) {
//                   pellets.splice(i, 1);
//                   continue;
//               }
//               for (const plat of platforms) {
//                   if (checkCollision(pelletBox, plat)) {
//                       hitSomething = true;
//                       break;
//                   }
//               }
//               if (
//                   p.x < 0 ||
//                   p.x > canvas.width ||
//                   p.y < 0 ||
//                   p.y > canvas.height ||
//                   hitSomething
//               ) {
//                   pellets.splice(i, 1);
//               }
//           }
  
//           // --- Enemy Pellet Updates ---
//           for (let i = enemyPellets.length - 1; i >= 0; i--) {
//               const p = enemyPellets[i];
//               p.x += p.dx;
//               p.y += p.dy;
//               let hitSomething = false;
//               const pelletBox: GameObject = {
//                   x: p.x - p.radius,
//                   y: p.y - p.radius,
//                   width: p.radius * 2,
//                   height: p.radius * 2,
//               };
//               if (checkCollision(pelletBox, player) && !player.isInvincible) {
//                   player.health -= 5;
//                   hitSomething = true;
//                   if (player.health <= 0) resetPlayer();
//               }
//               if (hitSomething) {
//                   enemyPellets.splice(i, 1);
//                   continue;
//               }
//               for (const plat of platforms)
//                   if (
//                       p.x > plat.x &&
//                       p.x < plat.x + plat.width &&
//                       p.y > plat.y &&
//                       p.y < plat.y + plat.height
//                   ) {
//                       hitSomething = true;
//                       break;
//                   }
//               if (
//                   p.x < 0 ||
//                   p.x > canvas.width ||
//                   p.y < 0 ||
//                   p.y > canvas.height ||
//                   hitSomething
//               ) {
//                   enemyPellets.splice(i, 1);
//               }
//           }
//       }
  
//       function drawPlayer(p: Player): void {
//           if (p.isInvincible) {
//               const alpha = 0.6 + Math.sin(Date.now() / 80) * 0.4;
//               ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
//           } else if (p.onWall) {
//               ctx.fillStyle = '#ffff99'; // Wall slide color
//           } else {
//               ctx.fillStyle = p.color;
//           }
//           ctx.fillRect(p.x, p.y, p.width, p.height);
  
//           // Draw aiming direction indicator
//           ctx.fillStyle = '#000';
//           ctx.beginPath();
//           const cx = p.x + p.width / 2;
//           const cy = p.y + p.height / 2;
//           const arrowSize = 4;
//           const arrowDist = 8;
//           if (p.direction === 'right') {
//               ctx.moveTo(cx + arrowDist, cy);
//               ctx.lineTo(cx, cy - arrowSize);
//               ctx.lineTo(cx, cy + arrowSize);
//           } else if (p.direction === 'left') {
//               ctx.moveTo(cx - arrowDist, cy);
//               ctx.lineTo(cx, cy - arrowSize);
//               ctx.lineTo(cx, cy + arrowSize);
//           } else if (p.direction === 'up') {
//               ctx.moveTo(cx, cy - arrowDist);
//               ctx.lineTo(cx - arrowSize, cy);
//               ctx.lineTo(cx + arrowSize, cy);
//           } else if (p.direction === 'down') {
//               ctx.moveTo(cx, cy + arrowDist);
//               ctx.lineTo(cx - arrowSize, cy);
//               ctx.lineTo(cx + arrowSize, cy);
//           }
//           ctx.closePath();
//           ctx.fill();
//       }
  
//       function drawUI(): void {
//           const hudWidth = 220;
//           const hudHeight = 105;
//           const margin = 10;
//           const hudX = canvas.width - hudWidth - margin;
//           const hudY = margin;
//           const padding = 10;
  
//           // Background
//           ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
//           ctx.fillRect(hudX, hudY, hudWidth, hudHeight);
//           ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
//           ctx.lineWidth = 2;
//           ctx.strokeRect(hudX, hudY, hudWidth, hudHeight);
  
//           // Text settings
//           ctx.fillStyle = '#fff';
//           ctx.font = "14px 'Courier New', Courier, monospace";
//           ctx.textAlign = 'left';
  
//           // Health Bar
//           const barWidth = 120;
//           const barHeight = 15;
//           const barX = hudX + 80;
//           const barY = hudY + padding;
//           const healthPercentage = Math.max(0, player.health / player.maxHealth);
//           ctx.fillText('Health', hudX + padding, barY + barHeight - 2);
//           ctx.fillStyle = '#555';
//           ctx.fillRect(barX, barY, barWidth, barHeight);
//           ctx.fillStyle = '#2ecc71';
//           ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
//           ctx.strokeStyle = '#fff';
//           ctx.lineWidth = 1;
//           ctx.strokeRect(barX, barY, barWidth, barHeight);
  
//           // Info Text
//           ctx.fillStyle = '#fff';
//           ctx.fillText(
//               `Weapon: ${player.currentWeapon}`,
//               hudX + padding,
//               hudY + padding + 40
//           );
//           ctx.fillText(
//               `Jumps: ${player.wallJumpsRemaining}`,
//               hudX + padding,
//               hudY + padding + 60
//           );
  
//           // Dashes
//           ctx.fillText('Dashes:', hudX + padding, hudY + padding + 80);
//           const dashBoxSize = 12;
//           const dashBoxSpacing = 5;
//           for (let i = 0; i < MAX_DASHES; i++) {
//               const dashBoxX = hudX + 80 + i * (dashBoxSize + dashBoxSpacing);
//               const dashBoxY = hudY + padding + 80 - dashBoxSize / 1.5;
//               if (i < player.dashesRemaining) {
//                   ctx.fillStyle = '#3498db'; // Blue for available
//               } else {
//                   ctx.fillStyle = '#555'; // Dark for used/recharging
//               }
//               ctx.fillRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize);
//               ctx.strokeStyle = '#fff';
//               ctx.strokeRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize);
//           }
//       }
  
//       function draw(): void {
//           // Clear screen and draw background
//           ctx.fillStyle = '#87ceeb';
//           ctx.fillRect(0, 0, canvas.width, canvas.height);
  
//           // Draw platforms
//           ctx.fillStyle = '#654321';
//           for (const plat of platforms) {
//               ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
//           }
  
//           // Draw enemies
//           for (const enemy of enemies) {
//               // Health bar
//               const barWidth = 30;
//               const barHeight = 5;
//               const barX = enemy.x + enemy.width / 2 - barWidth / 2;
//               const barY = enemy.y - 10;
//               const healthPercentage = enemy.health / enemy.maxHealth;
//               ctx.fillStyle = '#550000';
//               ctx.fillRect(barX, barY, barWidth, barHeight);
//               ctx.fillStyle = '#00ff00';
//               ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
  
//               // Body
//               if (enemy.isStunned) ctx.fillStyle = '#800080'; // Purple when stunned
//               else if (enemy.onWall) ctx.fillStyle = '#ff9999'; // Lighter red on wall
//               else ctx.fillStyle = enemy.color;
//               ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
//           }
  
//           // Draw player
//           drawPlayer(player);
  
//           // Draw melee slashes
//           for (const slash of meleeSlashes) {
//               ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
//               ctx.lineWidth = 3;
//               ctx.beginPath();
//               let startAngle: number = 0;
//               let endAngle: number = 0;
//               if (slash.direction === 'right') {
//                   startAngle = -Math.PI / 4;
//                   endAngle = Math.PI / 4;
//               } else if (slash.direction === 'left') {
//                   startAngle = Math.PI * 0.75;
//                   endAngle = Math.PI * 1.25;
//               }
//               ctx.arc(
//                   player.x + player.width / 2,
//                   player.y + player.height / 2,
//                   slash.radius,
//                   startAngle,
//                   endAngle
//               );
//               ctx.stroke();
//           }
  
//           // Draw player bullets (lines)
//           for (const p of pellets) {
//               ctx.strokeStyle = p.color;
//               ctx.lineWidth = 2;
//               const startX = p.x - p.drawDx * p.length;
//               const startY = p.y - p.drawDy * p.length;
//               ctx.beginPath();
//               ctx.moveTo(startX, startY);
//               ctx.lineTo(p.x, p.y);
//               ctx.stroke();
//           }
  
//           // Draw enemy pellets (circles)
//           for (const p of enemyPellets) {
//               ctx.fillStyle = p.color;
//               ctx.beginPath();
//               ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
//               ctx.fill();
//           }
  
//           // Draw UI and cursor
//           drawUI();
  
//           const cursorSize = 10;
//           ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
//           ctx.lineWidth = 2;
//           ctx.beginPath();
//           ctx.moveTo(mousePos.x - cursorSize, mousePos.y);
//           ctx.lineTo(mousePos.x + cursorSize, mousePos.y);
//           ctx.moveTo(mousePos.x, mousePos.y - cursorSize);
//           ctx.lineTo(mousePos.x, mousePos.y + cursorSize);
//           ctx.stroke();
//       }
  
//       function loop(): void {
//           update();
//           draw();
//           requestAnimationFrame(loop);
//       }
  
//       // Start the game loop
//       loop();
//   })();