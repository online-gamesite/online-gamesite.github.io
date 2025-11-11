document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const p1LivesEl = document.getElementById('p1Lives');
    const p2LivesEl = document.getElementById('p2Lives');
    const resetBtn = document.getElementById('resetBtn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const GRID_SIZE = 40;
    const COLS = WIDTH / GRID_SIZE;
    const ROWS = HEIGHT / GRID_SIZE;
    const PLAYER_SIZE = 30;
    const PLAYER_SPEED = 4;
    const BOMB_TIMER = 3000; // 3 seconds
    const EXPLOSION_DURATION = 500;
    const EXPLOSION_RANGE = 2; // Grid cells
    
    let gameState = 'playing'; // playing, gameover
    
    // Player 1 (Cyan)
    const player1 = {
        x: GRID_SIZE * 1.5,
        y: GRID_SIZE * 1.5,
        gridX: 1,
        gridY: 1,
        size: PLAYER_SIZE,
        color: '#06b6d4',
        keys: { up: false, down: false, left: false, right: false, bomb: false },
        lives: 3,
        bombCooldown: 0
    };
    
    // Player 2 (Blue)
    const player2 = {
        x: WIDTH - GRID_SIZE * 2.5,
        y: HEIGHT - GRID_SIZE * 2.5,
        gridX: COLS - 3,
        gridY: ROWS - 3,
        size: PLAYER_SIZE,
        color: '#3b82f6',
        keys: { up: false, down: false, left: false, right: false, bomb: false },
        lives: 3,
        bombCooldown: 0
    };
    
    // Walls (destructible and indestructible)
    const walls = [];
    const bombs = [];
    const explosions = [];
    
    function initializeWalls() {
        walls.length = 0;
        
        // Create grid pattern with alternating solid walls
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                // Solid walls in grid pattern
                if (row % 2 === 0 && col % 2 === 0) {
                    walls.push({
                        x: col * GRID_SIZE,
                        y: row * GRID_SIZE,
                        gridX: col,
                        gridY: row,
                        destructible: false
                    });
                }
                // Random destructible walls
                else if (Math.random() < 0.3) {
                    // Don't place near starting positions
                    const nearP1 = (col < 3 && row < 3);
                    const nearP2 = (col > COLS - 4 && row > ROWS - 4);
                    if (!nearP1 && !nearP2) {
                        walls.push({
                            x: col * GRID_SIZE,
                            y: row * GRID_SIZE,
                            gridX: col,
                            gridY: row,
                            destructible: true
                        });
                    }
                }
            }
        }
    }
    
    function updatePlayer(player) {
        if (gameState !== 'playing') return;
        
        // Movement
        let dx = 0;
        let dy = 0;
        
        if (player.keys.up) dy -= PLAYER_SPEED;
        if (player.keys.down) dy += PLAYER_SPEED;
        if (player.keys.left) dx -= PLAYER_SPEED;
        if (player.keys.right) dx += PLAYER_SPEED;
        
        // Try to move
        const newX = player.x + dx;
        const newY = player.y + dy;
        
        // Check collision with walls
        let canMove = true;
        const playerLeft = newX - player.size / 2;
        const playerRight = newX + player.size / 2;
        const playerTop = newY - player.size / 2;
        const playerBottom = newY + player.size / 2;
        
        for (const wall of walls) {
            const wallLeft = wall.x;
            const wallRight = wall.x + GRID_SIZE;
            const wallTop = wall.y;
            const wallBottom = wall.y + GRID_SIZE;
            
            if (playerRight > wallLeft && playerLeft < wallRight &&
                playerBottom > wallTop && playerTop < wallBottom) {
                canMove = false;
                break;
            }
        }
        
        // Check collision with bombs
        for (const bomb of bombs) {
            const bombLeft = bomb.x;
            const bombRight = bomb.x + GRID_SIZE;
            const bombTop = bomb.y;
            const bombBottom = bomb.y + GRID_SIZE;
            
            if (playerRight > bombLeft && playerLeft < bombRight &&
                playerBottom > bombTop && playerTop < bombBottom) {
                canMove = false;
                break;
            }
        }
        
        if (canMove) {
            player.x = Math.max(player.size / 2, Math.min(WIDTH - player.size / 2, newX));
            player.y = Math.max(player.size / 2, Math.min(HEIGHT - player.size / 2, newY));
            
            // Update grid position
            player.gridX = Math.floor(player.x / GRID_SIZE);
            player.gridY = Math.floor(player.y / GRID_SIZE);
        }
        
        // Bomb cooldown
        if (player.bombCooldown > 0) player.bombCooldown--;
        
        // Place bomb
        if (player.keys.bomb && player.bombCooldown === 0) {
            const bombGridX = Math.floor(player.x / GRID_SIZE);
            const bombGridY = Math.floor(player.y / GRID_SIZE);
            
            // Check if bomb already exists at this position
            const bombExists = bombs.some(b => b.gridX === bombGridX && b.gridY === bombGridY);
            
            if (!bombExists) {
                bombs.push({
                    x: bombGridX * GRID_SIZE,
                    y: bombGridY * GRID_SIZE,
                    gridX: bombGridX,
                    gridY: bombGridY,
                    timer: BOMB_TIMER,
                    owner: player,
                    pulsePhase: 0
                });
                player.bombCooldown = 30; // Half second cooldown
            }
        }
    }
    
    function updateBombs() {
        for (let i = bombs.length - 1; i >= 0; i--) {
            const bomb = bombs[i];
            bomb.timer -= 16; // ~60 FPS
            bomb.pulsePhase += 0.2;
            
            if (bomb.timer <= 0) {
                explode(bomb);
                bombs.splice(i, 1);
            }
        }
    }
    
    function explode(bomb) {
        const explosion = {
            gridX: bomb.gridX,
            gridY: bomb.gridY,
            timer: EXPLOSION_DURATION,
            cells: []
        };
        
        // Center
        explosion.cells.push({ x: bomb.gridX, y: bomb.gridY });
        
        // Four directions
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        
        for (const [dx, dy] of directions) {
            for (let i = 1; i <= EXPLOSION_RANGE; i++) {
                const gridX = bomb.gridX + dx * i;
                const gridY = bomb.gridY + dy * i;
                
                // Check bounds
                if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) break;
                
                // Check for wall
                const wallIndex = walls.findIndex(w => w.gridX === gridX && w.gridY === gridY);
                if (wallIndex !== -1) {
                    const wall = walls[wallIndex];
                    if (wall.destructible) {
                        walls.splice(wallIndex, 1);
                        explosion.cells.push({ x: gridX, y: gridY });
                    }
                    break; // Stop explosion in this direction
                }
                
                explosion.cells.push({ x: gridX, y: gridY });
            }
        }
        
        explosions.push(explosion);
        
        // Check player damage
        checkPlayerDamage(explosion);
    }
    
    function checkPlayerDamage(explosion) {
        [player1, player2].forEach(player => {
            for (const cell of explosion.cells) {
                if (player.gridX === cell.x && player.gridY === cell.y) {
                    player.lives--;
                    
                    if (player.lives <= 0) {
                        const winner = player === player1 ? 2 : 1;
                        endGame(winner);
                    } else {
                        // Respawn player at starting position
                        if (player === player1) {
                            player.x = GRID_SIZE * 1.5;
                            player.y = GRID_SIZE * 1.5;
                        } else {
                            player.x = WIDTH - GRID_SIZE * 2.5;
                            player.y = HEIGHT - GRID_SIZE * 2.5;
                        }
                    }
                    break;
                }
            }
        });
        
        updateLives();
    }
    
    function updateExplosions() {
        for (let i = explosions.length - 1; i >= 0; i--) {
            explosions[i].timer -= 16;
            if (explosions[i].timer <= 0) {
                explosions.splice(i, 1);
            }
        }
    }
    
    function update() {
        updatePlayer(player1);
        updatePlayer(player2);
        updateBombs();
        updateExplosions();
    }
    
    function draw() {
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * GRID_SIZE, 0);
            ctx.lineTo(i * GRID_SIZE, HEIGHT);
            ctx.stroke();
        }
        for (let i = 0; i <= ROWS; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * GRID_SIZE);
            ctx.lineTo(WIDTH, i * GRID_SIZE);
            ctx.stroke();
        }
        
        // Draw walls
        walls.forEach(wall => {
            if (wall.destructible) {
                ctx.fillStyle = '#6b7280';
            } else {
                ctx.fillStyle = '#374151';
            }
            ctx.fillRect(wall.x + 2, wall.y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            
            ctx.strokeStyle = wall.destructible ? '#9ca3af' : '#4b5563';
            ctx.lineWidth = 2;
            ctx.strokeRect(wall.x + 2, wall.y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
        });
        
        // Draw explosions
        explosions.forEach(exp => {
            const alpha = exp.timer / EXPLOSION_DURATION;
            ctx.globalAlpha = alpha;
            exp.cells.forEach(cell => {
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(cell.x * GRID_SIZE + 2, cell.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
                
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(cell.x * GRID_SIZE + 8, cell.y * GRID_SIZE + 8, GRID_SIZE - 16, GRID_SIZE - 16);
            });
            ctx.globalAlpha = 1;
        });
        
        // Draw bombs
        bombs.forEach(bomb => {
            const pulse = Math.sin(bomb.pulsePhase) * 3;
            const size = GRID_SIZE - 10 + pulse;
            const offset = (GRID_SIZE - size) / 2;
            
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(bomb.x + GRID_SIZE / 2, bomb.y + GRID_SIZE / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = bomb.timer < 1000 ? '#ef4444' : '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', bomb.x + GRID_SIZE / 2, bomb.y + GRID_SIZE / 2);
        });
        
        // Draw players
        [player1, player2].forEach(player => {
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size / 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function updateLives() {
        p1LivesEl.textContent = player1.lives;
        p2LivesEl.textContent = player2.lives;
    }
    
    function endGame(winner) {
        gameState = 'gameover';
        statusEl.textContent = `🏆 Player ${winner} Wins!`;
        statusEl.style.color = winner === 1 ? '#06b6d4' : '#3b82f6';
    }
    
    function resetGame() {
        gameState = 'playing';
        statusEl.textContent = 'Place bombs to eliminate your opponent!';
        statusEl.style.color = '#06b6d4';
        
        player1.x = GRID_SIZE * 1.5;
        player1.y = GRID_SIZE * 1.5;
        player1.lives = 3;
        player1.bombCooldown = 0;
        
        player2.x = WIDTH - GRID_SIZE * 2.5;
        player2.y = HEIGHT - GRID_SIZE * 2.5;
        player2.lives = 3;
        player2.bombCooldown = 0;
        
        bombs.length = 0;
        explosions.length = 0;
        initializeWalls();
        updateLives();
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Player 1
        if (e.key === 'w' || e.key === 'W') player1.keys.up = true;
        if (e.key === 's' || e.key === 'S') player1.keys.down = true;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = true;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = true;
        if (e.key === ' ') {
            e.preventDefault();
            player1.keys.bomb = true;
        }
        
        // Player 2
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            player2.keys.up = true;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            player2.keys.down = true;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            player2.keys.left = true;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            player2.keys.right = true;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            player2.keys.bomb = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Player 1
        if (e.key === 'w' || e.key === 'W') player1.keys.up = false;
        if (e.key === 's' || e.key === 'S') player1.keys.down = false;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = false;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = false;
        if (e.key === ' ') player1.keys.bomb = false;
        
        // Player 2
        if (e.key === 'ArrowUp') player2.keys.up = false;
        if (e.key === 'ArrowDown') player2.keys.down = false;
        if (e.key === 'ArrowLeft') player2.keys.left = false;
        if (e.key === 'ArrowRight') player2.keys.right = false;
        if (e.key === 'Enter') player2.keys.bomb = false;
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Initialize and start
    initializeWalls();
    gameLoop();
});
