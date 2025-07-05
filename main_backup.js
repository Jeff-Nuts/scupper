// ===================================================================
// TYPE DEFINITIONS
// ===================================================================
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// ===================================================================
// GAME IMPLEMENTATION (IIFE)
// ===================================================================
(function () {
    var canvas = document.getElementById('game');
    if (!canvas) {
        console.error("Canvas element with id 'game' could not be found.");
        return;
    }
    var ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context could not be initialized.");
        return;
    }
    // Game Constants
    var GRAVITY = 0.5;
    var FRICTION = 0.8;
    var WALL_SLIDE_SPEED = 1.5;
    var WALL_JUMP_KICKOFF = 5;
    var MAX_WALL_JUMPS = 3;
    // Dash constants
    var DASH_SPEED = 12;
    var DASH_DURATION = 180; // in milliseconds
    var DASH_INVINCIBILITY_DURATION = 200; // in milliseconds
    var MAX_DASHES = 3;
    var DASH_REPLENISH_COOLDOWN = 1500; // 1.5 seconds
    // Combat Constants
    var PLAYER_SHOOT_COOLDOWN = 80;
    var ENEMY_SHOOT_COOLDOWN = 1200;
    var MELEE_RANGE = 40;
    var MELEE_COOLDOWN = 500;
    var MELEE_KNOCKBACK_FORCE = 8;
    var STUN_DURATION = 1000;
    // Game State
    var keys = {};
    var mousePos = { x: 0, y: 0 };
    var isMouseDown = false;
    var player = {
        x: 50,
        y: 200,
        width: 20,
        height: 20,
        color: '#ff0',
        dx: 0,
        dy: 0,
        speed: 3,
        jumpPower: -10,
        onGround: false,
        direction: 'right',
        movementDirection: 'right',
        onWall: false,
        wallJumpsRemaining: MAX_WALL_JUMPS,
        health: 100,
        maxHealth: 100,
        currentWeapon: 'Machine Gun',
        dashesRemaining: MAX_DASHES,
        isDashing: false,
        dashEndTime: 0,
        isInvincible: false,
        invincibilityEndTime: 0,
        lastDashReplenishTime: 0,
    };
    var lastShotTime = 0;
    var lastMeleeTime = 0;
    var meleeSlashes = [];
    var platforms = [
        { x: 0, y: 340, width: 640, height: 20 },
        { x: 100, y: 280, width: 100, height: 10 },
        { x: 250, y: 220, width: 100, height: 10 },
        { x: 400, y: 160, width: 100, height: 10 },
        { x: 500, y: 200, width: 20, height: 140 },
        { x: 0, y: 100, width: 20, height: 240 },
    ];
    var enemies = [
        {
            x: 425,
            y: 140,
            width: 20,
            height: 20,
            color: '#f00',
            dx: 0,
            dy: 0,
            speed: 2.5,
            jumpPower: -10,
            onGround: false,
            direction: 'left',
            onWall: false,
            wallJumpsRemaining: MAX_WALL_JUMPS,
            shootCooldown: ENEMY_SHOOT_COOLDOWN,
            lastShotTime: 0,
            health: 100,
            maxHealth: 100,
            isStunned: false,
            stunEndTime: 0,
        },
    ];
    var pellets = [];
    var enemyPellets = [];
    function shootPellet() {
        var now = Date.now();
        if (now - lastShotTime < PLAYER_SHOOT_COOLDOWN)
            return;
        lastShotTime = now;
        var playerCenterX = player.x + player.width / 2;
        var playerCenterY = player.y + player.height / 2;
        var dx = mousePos.x - playerCenterX;
        var dy = mousePos.y - playerCenterY;
        var magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
        var bulletSpeed = 7;
        var normalizedDx = dx / magnitude;
        var normalizedDy = dy / magnitude;
        pellets.push({
            x: playerCenterX,
            y: playerCenterY,
            dx: normalizedDx * bulletSpeed,
            dy: normalizedDy * bulletSpeed,
            drawDx: normalizedDx,
            drawDy: normalizedDy,
            length: 8,
            color: '#000',
        });
    }
    function performDash() {
        if (player.dashesRemaining <= 0 || player.isDashing)
            return;
        player.dashesRemaining--;
        player.isDashing = true;
        player.isInvincible = true;
        player.dashEndTime = Date.now() + DASH_DURATION;
        player.invincibilityEndTime =
            Date.now() + DASH_INVINCIBILITY_DURATION;
        player.dx =
            player.movementDirection === 'right' ? DASH_SPEED : -DASH_SPEED;
        player.dy = 0; // Make the dash sharp and horizontal
    }
    function performMeleeAttack() {
        var now = Date.now();
        if (now - lastMeleeTime < MELEE_COOLDOWN)
            return;
        lastMeleeTime = now;
        meleeSlashes.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            radius: MELEE_RANGE,
            creationTime: now,
            duration: 150,
            direction: player.movementDirection,
        });
        for (var _i = 0, enemies_1 = enemies; _i < enemies_1.length; _i++) {
            var enemy = enemies_1[_i];
            var dx = enemy.x - player.x;
            var dy = enemy.y - player.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < MELEE_RANGE) {
                enemy.isStunned = true;
                enemy.stunEndTime = now + STUN_DURATION;
                var magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
                enemy.dx = (dx / magnitude) * MELEE_KNOCKBACK_FORCE;
                enemy.dy = ((dy / magnitude) * MELEE_KNOCKBACK_FORCE) / 2 - 3;
                break; // Only hit one enemy per swing
            }
        }
    }
    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', function (e) {
        isMouseDown = true;
    });
    window.addEventListener('mouseup', function (e) {
        isMouseDown = false;
    });
    window.addEventListener('keydown', function (e) {
        var key = e.key.toLowerCase();
        keys[key] = true;
        if (key === 'w') {
            if (player.onGround) {
                player.dy = player.jumpPower;
                player.onGround = false;
            }
            else if (player.onWall && player.wallJumpsRemaining > 0) {
                player.dy = player.jumpPower;
                player.dx =
                    player.onWall === 'left'
                        ? WALL_JUMP_KICKOFF
                        : -WALL_JUMP_KICKOFF;
                player.wallJumpsRemaining--;
                player.onWall = false;
            }
        }
        if (key === 'e') {
            performMeleeAttack();
        }
        if (key === 'shift') {
            performDash();
        }
    });
    window.addEventListener('keyup', function (e) {
        keys[e.key.toLowerCase()] = false;
    });
    function checkCollision(objA, objB) {
        return (objA.x < objB.x + objB.width &&
            objA.x + objA.width > objB.x &&
            objA.y < objB.y + objB.height &&
            objA.y + objA.height > objB.y);
    }
    function resetPlayer() {
        player.x = 50;
        player.y = 200;
        player.dx = 0;
        player.dy = 0;
        player.wallJumpsRemaining = MAX_WALL_JUMPS;
        player.onGround = false;
        player.health = player.maxHealth;
        player.direction = 'right';
        player.movementDirection = 'right';
        player.dashesRemaining = MAX_DASHES;
        player.isDashing = false;
        player.isInvincible = false;
        player.lastDashReplenishTime = Date.now();
    }
    function update() {
        var now = Date.now();
        // Handle player state (dashing, invincible)
        if (player.isDashing && now > player.dashEndTime) {
            player.isDashing = false;
            player.dx *= 0.5; // Apply friction immediately after dash
        }
        if (player.isInvincible && now > player.invincibilityEndTime) {
            player.isInvincible = false;
        }
        // Handle dash replenishment
        if (player.dashesRemaining < MAX_DASHES &&
            now > player.lastDashReplenishTime + DASH_REPLENISH_COOLDOWN) {
            player.dashesRemaining++;
            player.lastDashReplenishTime = now;
        }
        // Player Movement & Physics are skipped during dash
        if (!player.isDashing) {
            if (keys['a']) {
                player.dx = -player.speed;
                player.movementDirection = 'left';
            }
            else if (keys['d']) {
                player.dx = player.speed;
                player.movementDirection = 'right';
            }
            else {
                player.dx *= FRICTION;
            }
            player.dy += GRAVITY;
            if (player.onWall && player.dy > 0 && !player.onGround) {
                player.dy = WALL_SLIDE_SPEED;
            }
        }
        // Player Actions (Shooting can happen while dashing)
        if (isMouseDown) {
            shootPellet();
        }
        // Update player's aiming direction based on mouse
        var aimDx = mousePos.x - (player.x + player.width / 2);
        var aimDy = mousePos.y - (player.y + player.height / 2);
        if (Math.abs(aimDx) > Math.abs(aimDy)) {
            player.direction = aimDx > 0 ? 'right' : 'left';
        }
        else {
            player.direction = aimDy > 0 ? 'down' : 'up';
        }
        // Platform Collision (This happens regardless of dash state)
        var nextX = player.x + player.dx;
        var nextY = player.y + player.dy;
        player.onGround = false;
        player.onWall = false;
        for (var _i = 0, platforms_1 = platforms; _i < platforms_1.length; _i++) {
            var plat = platforms_1[_i];
            var playerNextX = __assign(__assign({}, player), { x: nextX });
            var playerNextY = __assign(__assign({}, player), { y: nextY });
            if (checkCollision(playerNextX, plat)) {
                if (player.dx > 0) {
                    nextX = plat.x - player.width;
                    player.onWall = 'right';
                }
                else if (player.dx < 0) {
                    nextX = plat.x + plat.width;
                    player.onWall = 'left';
                }
                player.dx = 0;
                if (player.isDashing)
                    player.isDashing = false;
            }
            if (checkCollision(playerNextY, plat)) {
                if (player.dy > 0) {
                    nextY = plat.y - player.height;
                    player.dy = 0;
                    player.onGround = true;
                    player.wallJumpsRemaining = MAX_WALL_JUMPS;
                }
                else if (player.dy < 0) {
                    nextY = plat.y + plat.height;
                    player.dy = 0;
                }
                if (player.isDashing)
                    player.isDashing = false;
            }
        }
        player.x = nextX;
        player.y = nextY;
        // Boundary checks
        if (player.x < 0) {
            player.x = 0;
            player.dx = 0;
        }
        if (player.x + player.width > canvas.width) {
            player.x = canvas.width - player.width;
            player.dx = 0;
        }
        if (player.y > canvas.height)
            resetPlayer();
        // --- Enemy update loop ---
        for (var i = enemies.length - 1; i >= 0; i--) {
            var enemy = enemies[i];
            if (enemy.isStunned && now > enemy.stunEndTime) {
                enemy.isStunned = false;
            }
            enemy.dy += GRAVITY;
            if (!enemy.isStunned) {
                enemy.dx *= FRICTION;
            }
            if (!enemy.isStunned) {
                var horizontalDist = player.x - enemy.x;
                var verticalDist = player.y - enemy.y;
                var JUMP_DECISION_THRESHOLD = -enemy.height * 2;
                var ATTACK_RANGE = 300;
                enemy.direction = horizontalDist > 0 ? 'right' : 'left';
                if (Math.abs(horizontalDist) > 5 &&
                    Math.abs(horizontalDist) < ATTACK_RANGE) {
                    var sign = function (num) { return (num > 0 ? 1 : num < 0 ? -1 : 0); };
                    enemy.dx = enemy.speed * sign(horizontalDist);
                }
                if (enemy.onGround) {
                    var shouldJump = false;
                    if (verticalDist < JUMP_DECISION_THRESHOLD)
                        shouldJump = true;
                    var pathCheckWidth = 5;
                    var pathCheckX = enemy.direction === 'right'
                        ? enemy.x + enemy.width
                        : enemy.x - pathCheckWidth;
                    var pathChecker = {
                        x: pathCheckX,
                        y: enemy.y,
                        width: pathCheckWidth,
                        height: enemy.height,
                    };
                    for (var _a = 0, platforms_2 = platforms; _a < platforms_2.length; _a++) {
                        var plat = platforms_2[_a];
                        if (checkCollision(pathChecker, plat) &&
                            plat.height > enemy.height) {
                            shouldJump = true;
                            break;
                        }
                    }
                    if (shouldJump) {
                        enemy.dy = enemy.jumpPower;
                        enemy.onGround = false;
                    }
                }
                else if (enemy.onWall &&
                    enemy.wallJumpsRemaining > 0 &&
                    verticalDist < 0) {
                    enemy.dy = enemy.jumpPower;
                    enemy.dx =
                        enemy.onWall === 'left'
                            ? WALL_JUMP_KICKOFF
                            : -WALL_JUMP_KICKOFF;
                    enemy.wallJumpsRemaining--;
                    enemy.onWall = false;
                }
                if (now - enemy.lastShotTime > enemy.shootCooldown) {
                    enemy.lastShotTime = now;
                    var playerCenterX = player.x + player.width / 2;
                    var playerCenterY = player.y + player.height / 2;
                    var enemyCenterX = enemy.x + enemy.width / 2;
                    var enemyCenterY = enemy.y + enemy.height / 2;
                    var dx = playerCenterX - enemyCenterX;
                    var dy = playerCenterY - enemyCenterY;
                    var magnitude = Math.sqrt(dx * dx + dy * dy);
                    if (magnitude > 0 && magnitude < ATTACK_RANGE * 1.5) {
                        var bulletSpeed = 4;
                        var normalizedDx = (dx / magnitude) * bulletSpeed;
                        var normalizedDy = (dy / magnitude) * bulletSpeed;
                        enemyPellets.push({
                            x: enemyCenterX,
                            y: enemyCenterY,
                            radius: 5,
                            dx: normalizedDx,
                            dy: normalizedDy,
                            color: '#f58742',
                        });
                    }
                }
            }
            if (enemy.onWall && enemy.dy > 0 && !enemy.onGround) {
                enemy.dy = WALL_SLIDE_SPEED;
            }
            var enemyNextX = enemy.x + enemy.dx;
            var enemyNextY = enemy.y + enemy.dy;
            enemy.onGround = false;
            enemy.onWall = false;
            for (var _b = 0, platforms_3 = platforms; _b < platforms_3.length; _b++) {
                var plat = platforms_3[_b];
                var enemyNextXBox = __assign(__assign({}, enemy), { x: enemyNextX });
                var enemyNextYBox = __assign(__assign({}, enemy), { y: enemyNextY });
                if (checkCollision(enemyNextXBox, plat)) {
                    if (enemy.dx > 0) {
                        enemyNextX = plat.x - enemy.width;
                        enemy.onWall = 'right';
                    }
                    else if (enemy.dx < 0) {
                        enemyNextX = plat.x + plat.width;
                        enemy.onWall = 'left';
                    }
                    enemy.dx = 0;
                }
                if (checkCollision(enemyNextYBox, plat)) {
                    if (enemy.dy > 0) {
                        enemyNextY = plat.y - enemy.height;
                        enemy.dy = 0;
                        enemy.onGround = true;
                        enemy.wallJumpsRemaining = MAX_WALL_JUMPS;
                    }
                    else if (enemy.dy < 0) {
                        enemyNextY = plat.y + plat.height;
                        enemy.dy = 0;
                    }
                }
            }
            enemy.x = enemyNextX;
            enemy.y = enemyNextY;
            if (enemy.x < 0) {
                enemy.x = 0;
                enemy.dx = 0;
            }
            if (enemy.x + enemy.width > canvas.width) {
                enemy.x = canvas.width - enemy.width;
                enemy.dx = 0;
            }
            if (enemy.y > canvas.height) {
                // Reset enemy if it falls off
                enemy.x = 425;
                enemy.y = 140;
                enemy.dx = 0;
                enemy.dy = 0;
                enemy.wallJumpsRemaining = MAX_WALL_JUMPS;
                enemy.health = enemy.maxHealth;
            }
        }
        // --- Melee Slash Updates ---
        for (var i = meleeSlashes.length - 1; i >= 0; i--) {
            if (Date.now() - meleeSlashes[i].creationTime >
                meleeSlashes[i].duration) {
                meleeSlashes.splice(i, 1);
            }
        }
        // --- Player Pellet Update logic ---
        for (var i = pellets.length - 1; i >= 0; i--) {
            var p = pellets[i];
            p.x += p.dx;
            p.y += p.dy;
            var hitSomething = false;
            var pelletBox = { x: p.x - 2, y: p.y - 2, width: 4, height: 4 };
            for (var j = enemies.length - 1; j >= 0; j--) {
                var enemy = enemies[j];
                if (checkCollision(pelletBox, enemy)) {
                    enemy.health -= 10;
                    hitSomething = true;
                    if (enemy.health <= 0) {
                        enemies.splice(j, 1);
                    }
                    break;
                }
            }
            if (hitSomething) {
                pellets.splice(i, 1);
                continue;
            }
            for (var _c = 0, platforms_4 = platforms; _c < platforms_4.length; _c++) {
                var plat = platforms_4[_c];
                if (checkCollision(pelletBox, plat)) {
                    hitSomething = true;
                    break;
                }
            }
            if (p.x < 0 ||
                p.x > canvas.width ||
                p.y < 0 ||
                p.y > canvas.height ||
                hitSomething) {
                pellets.splice(i, 1);
            }
        }
        // --- Enemy Pellet Updates ---
        for (var i = enemyPellets.length - 1; i >= 0; i--) {
            var p = enemyPellets[i];
            p.x += p.dx;
            p.y += p.dy;
            var hitSomething = false;
            var pelletBox = {
                x: p.x - p.radius,
                y: p.y - p.radius,
                width: p.radius * 2,
                height: p.radius * 2,
            };
            if (checkCollision(pelletBox, player) && !player.isInvincible) {
                player.health -= 5;
                hitSomething = true;
                if (player.health <= 0)
                    resetPlayer();
            }
            if (hitSomething) {
                enemyPellets.splice(i, 1);
                continue;
            }
            for (var _d = 0, platforms_5 = platforms; _d < platforms_5.length; _d++) {
                var plat = platforms_5[_d];
                if (p.x > plat.x &&
                    p.x < plat.x + plat.width &&
                    p.y > plat.y &&
                    p.y < plat.y + plat.height) {
                    hitSomething = true;
                    break;
                }
            }
            if (p.x < 0 ||
                p.x > canvas.width ||
                p.y < 0 ||
                p.y > canvas.height ||
                hitSomething) {
                enemyPellets.splice(i, 1);
            }
        }
    }
    function drawPlayer(p) {
        if (p.isInvincible) {
            var alpha = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.fillStyle = "rgba(255, 255, 255, ".concat(alpha, ")");
        }
        else if (p.onWall) {
            ctx.fillStyle = '#ffff99'; // Wall slide color
        }
        else {
            ctx.fillStyle = p.color;
        }
        ctx.fillRect(p.x, p.y, p.width, p.height);
        // Draw aiming direction indicator
        ctx.fillStyle = '#000';
        ctx.beginPath();
        var cx = p.x + p.width / 2;
        var cy = p.y + p.height / 2;
        var arrowSize = 4;
        var arrowDist = 8;
        if (p.direction === 'right') {
            ctx.moveTo(cx + arrowDist, cy);
            ctx.lineTo(cx, cy - arrowSize);
            ctx.lineTo(cx, cy + arrowSize);
        }
        else if (p.direction === 'left') {
            ctx.moveTo(cx - arrowDist, cy);
            ctx.lineTo(cx, cy - arrowSize);
            ctx.lineTo(cx, cy + arrowSize);
        }
        else if (p.direction === 'up') {
            ctx.moveTo(cx, cy - arrowDist);
            ctx.lineTo(cx - arrowSize, cy);
            ctx.lineTo(cx + arrowSize, cy);
        }
        else if (p.direction === 'down') {
            ctx.moveTo(cx, cy + arrowDist);
            ctx.lineTo(cx - arrowSize, cy);
            ctx.lineTo(cx + arrowSize, cy);
        }
        ctx.closePath();
        ctx.fill();
    }
    function drawUI() {
        var hudWidth = 220;
        var hudHeight = 105;
        var margin = 10;
        var hudX = canvas.width - hudWidth - margin;
        var hudY = margin;
        var padding = 10;
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(hudX, hudY, hudWidth, hudHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hudX, hudY, hudWidth, hudHeight);
        // Text settings
        ctx.fillStyle = '#fff';
        ctx.font = "14px 'Courier New', Courier, monospace";
        ctx.textAlign = 'left';
        // Health Bar
        var barWidth = 120;
        var barHeight = 15;
        var barX = hudX + 80;
        var barY = hudY + padding;
        var healthPercentage = Math.max(0, player.health / player.maxHealth);
        ctx.fillText('Health', hudX + padding, barY + barHeight - 2);
        ctx.fillStyle = '#555';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        // Info Text
        ctx.fillStyle = '#fff';
        ctx.fillText("Weapon: ".concat(player.currentWeapon), hudX + padding, hudY + padding + 40);
        ctx.fillText("Jumps: ".concat(player.wallJumpsRemaining), hudX + padding, hudY + padding + 60);
        // Dashes
        ctx.fillText('Dashes:', hudX + padding, hudY + padding + 80);
        var dashBoxSize = 12;
        var dashBoxSpacing = 5;
        for (var i = 0; i < MAX_DASHES; i++) {
            var dashBoxX = hudX + 80 + i * (dashBoxSize + dashBoxSpacing);
            var dashBoxY = hudY + padding + 80 - dashBoxSize / 1.5;
            if (i < player.dashesRemaining) {
                ctx.fillStyle = '#3498db'; // Blue for available
            }
            else {
                ctx.fillStyle = '#555'; // Dark for used/recharging
            }
            ctx.fillRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(dashBoxX, dashBoxY, dashBoxSize, dashBoxSize);
        }
    }
    function draw() {
        // Clear screen and draw background
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw platforms
        ctx.fillStyle = '#654321';
        for (var _i = 0, platforms_6 = platforms; _i < platforms_6.length; _i++) {
            var plat = platforms_6[_i];
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        }
        // Draw enemies
        for (var _a = 0, enemies_2 = enemies; _a < enemies_2.length; _a++) {
            var enemy = enemies_2[_a];
            // Health bar
            var barWidth = 30;
            var barHeight = 5;
            var barX = enemy.x + enemy.width / 2 - barWidth / 2;
            var barY = enemy.y - 10;
            var healthPercentage = enemy.health / enemy.maxHealth;
            ctx.fillStyle = '#550000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
            // Body
            if (enemy.isStunned)
                ctx.fillStyle = '#800080'; // Purple when stunned
            else if (enemy.onWall)
                ctx.fillStyle = '#ff9999'; // Lighter red on wall
            else
                ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        // Draw player
        drawPlayer(player);
        // Draw melee slashes
        for (var _b = 0, meleeSlashes_1 = meleeSlashes; _b < meleeSlashes_1.length; _b++) {
            var slash = meleeSlashes_1[_b];
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            var startAngle = 0;
            var endAngle = 0;
            if (slash.direction === 'right') {
                startAngle = -Math.PI / 4;
                endAngle = Math.PI / 4;
            }
            else if (slash.direction === 'left') {
                startAngle = Math.PI * 0.75;
                endAngle = Math.PI * 1.25;
            }
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, slash.radius, startAngle, endAngle);
            ctx.stroke();
        }
        // Draw player bullets (lines)
        for (var _c = 0, pellets_1 = pellets; _c < pellets_1.length; _c++) {
            var p = pellets_1[_c];
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            var startX = p.x - p.drawDx * p.length;
            var startY = p.y - p.drawDy * p.length;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
        // Draw enemy pellets (circles)
        for (var _d = 0, enemyPellets_1 = enemyPellets; _d < enemyPellets_1.length; _d++) {
            var p = enemyPellets_1[_d];
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        // Draw UI and cursor
        drawUI();
        var cursorSize = 10;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mousePos.x - cursorSize, mousePos.y);
        ctx.lineTo(mousePos.x + cursorSize, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - cursorSize);
        ctx.lineTo(mousePos.x, mousePos.y + cursorSize);
        ctx.stroke();
    }
    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }
    // Start the game loop
    loop();
})();
