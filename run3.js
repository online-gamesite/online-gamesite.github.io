const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const gameOverDiv = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const finalMessage = document.getElementById('finalMessage');
const restartBtn = document.getElementById('restartBtn');

// Game state
let gameRunning = true;
let distance = 0;
let speed = 4;
let scrollOffset = 0;

// Player
const player = {
    x: 3,
    y: 3,
    size: 20,
    velocityY: 0,
    gravity: 0.5,
    jumpPower: -10,
    isJumping: false,
    rotation: 0, // 0 = floor, 90 = right wall, 180 = ceiling, 270 = left wall
    targetRotation: 0,
    rotationSpeed: 5
};

// Tunnel tiles
const TILE_SIZE = 60;
const TUNNEL_WIDTH = 7;
const TUNNEL_HEIGHT = 7;
let tiles = [];

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === ' ' && gameRunning) {
        e.preventDefault();
        if (!player.isJumping) {
            player.velocityY = player.jumpPower;
            player.isJumping = true;
        }
    }
    
    if (e.key === 'r' || e.key === 'R') {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

restartBtn.addEventListener('click', restartGame);

// Generate initial tunnel
function initTunnel() {
    tiles = [];
    for (let z = -5; z < 50; z++) {
        generateTunnelSegment(z);
    }
}

function generateTunnelSegment(z) {
    const segment = [];
    
    // Create a random pattern for this segment
    const pattern = Math.floor(Math.random() * 5);
    
    for (let x = 0; x < TUNNEL_WIDTH; x++) {
        for (let y = 0; y < TUNNEL_HEIGHT; y++) {
            let hasTile = false;
            
            if (z < 5) {
                // Start area - always have floor
                hasTile = (y === TUNNEL_HEIGHT - 1);
            } else {
                // Generate patterns based on difficulty
                const difficulty = Math.min(z / 50, 1);
                
                switch(pattern) {
                    case 0: // Floor with some gaps
                        if (y === TUNNEL_HEIGHT - 1) {
                            hasTile = Math.random() > difficulty * 0.3;
                        }
                        break;
                    case 1: // Walls pattern
                        if ((x === 0 || x === TUNNEL_WIDTH - 1) && y > 2) {
                            hasTile = Math.random() > 0.2;
                        }
                        if (y === TUNNEL_HEIGHT - 1) {
                            hasTile = Math.random() > difficulty * 0.4;
                        }
                        break;
                    case 2: // Scattered platforms
                        hasTile = Math.random() > 0.7;
                        break;
                    case 3: // Ceiling and floor
                        if (y === 0 || y === TUNNEL_HEIGHT - 1) {
                            hasTile = Math.random() > difficulty * 0.3;
                        }
                        break;
                    case 4: // Side walls
                        if (x === 0 || x === TUNNEL_WIDTH - 1 || y === TUNNEL_HEIGHT - 1) {
                            hasTile = Math.random() > 0.3;
                        }
                        break;
                }
            }
            
            if (hasTile) {
                segment.push({ x, y, z });
            }
        }
    }
    
    tiles.push(...segment);
}

// Draw 3D tunnel with perspective
function drawTunnel() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const horizon = canvas.height * 0.4;
    
    // Sort tiles by distance for proper rendering
    const visibleTiles = tiles.filter(tile => {
        const relativeZ = tile.z - scrollOffset;
        return relativeZ > -2 && relativeZ < 30;
    }).sort((a, b) => a.z - b.z);
    
    // Draw sky/background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0520');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 100; i++) {
        const starX = (i * 123) % canvas.width;
        const starY = (i * 456) % horizon;
        const size = (i % 3) * 0.5 + 0.5;
        ctx.fillRect(starX, starY, size, size);
    }
    
    // Draw tunnel tiles
    visibleTiles.forEach(tile => {
        const relativeZ = tile.z - scrollOffset;
        const perspective = 1 / (relativeZ * 0.15 + 1);
        
        if (perspective <= 0) return;
        
        // Calculate position based on camera rotation
        const rotRad = (player.rotation * Math.PI) / 180;
        const centerOffsetX = (tile.x - TUNNEL_WIDTH / 2) * TILE_SIZE;
        const centerOffsetY = (tile.y - TUNNEL_HEIGHT / 2) * TILE_SIZE;
        
        // Apply rotation
        const rotatedX = centerOffsetX * Math.cos(rotRad) - centerOffsetY * Math.sin(rotRad);
        const rotatedY = centerOffsetX * Math.sin(rotRad) + centerOffsetY * Math.cos(rotRad);
        
        const screenX = centerX + rotatedX * perspective;
        const screenY = horizon + rotatedY * perspective;
        const tileSize = TILE_SIZE * perspective;
        
        // Lighting based on distance
        const brightness = Math.max(50, 255 - relativeZ * 10);
        
        // Draw tile with 3D effect
        ctx.fillStyle = `rgb(${brightness * 0.3}, ${brightness * 0.5}, ${brightness})`;
        ctx.fillRect(screenX - tileSize / 2, screenY - tileSize / 2, tileSize, tileSize);
        
        // Tile border
        ctx.strokeStyle = `rgb(${brightness * 0.5}, ${brightness * 0.7}, ${brightness})`;
        ctx.lineWidth = Math.max(1, perspective * 2);
        ctx.strokeRect(screenX - tileSize / 2, screenY - tileSize / 2, tileSize, tileSize);
        
        // Highlight edges for depth
        ctx.fillStyle = `rgba(100, 150, 255, ${0.3 * perspective})`;
        ctx.fillRect(screenX - tileSize / 2, screenY - tileSize / 2, tileSize * 0.1, tileSize);
        ctx.fillRect(screenX - tileSize / 2, screenY - tileSize / 2, tileSize, tileSize * 0.1);
    });
}

// Draw player
function drawPlayer() {
    const centerX = canvas.width / 2;
    const horizon = canvas.height * 0.4;
    
    // Player position relative to camera rotation
    const rotRad = (player.rotation * Math.PI) / 180;
    const playerOffsetX = (player.x - TUNNEL_WIDTH / 2) * TILE_SIZE;
    const playerOffsetY = (player.y - TUNNEL_HEIGHT / 2) * TILE_SIZE;
    
    const rotatedX = playerOffsetX * Math.cos(rotRad) - playerOffsetY * Math.sin(rotRad);
    const rotatedY = playerOffsetX * Math.sin(rotRad) + playerOffsetY * Math.cos(rotRad);
    
    const perspective = 0.6;
    const screenX = centerX + rotatedX * perspective;
    const screenY = horizon + rotatedY * perspective;
    const size = player.size * perspective;
    
    // Draw player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + size, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Player highlight
    ctx.fillStyle = '#ff9999';
    ctx.beginPath();
    ctx.arc(screenX - size * 0.3, screenY - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Player outline
    ctx.strokeStyle = '#cc5555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.stroke();
}

// Check if player is on a tile
function checkCollision() {
    const playerZ = Math.floor(scrollOffset);
    
    for (let tile of tiles) {
        if (Math.abs(tile.z - playerZ) < 1) {
            const dx = Math.abs(tile.x - player.x);
            const dy = Math.abs(tile.y - player.y);
            
            if (dx < 0.5 && dy < 0.5) {
                return tile;
            }
        }
    }
    return null;
}

// Check for wall collision to rotate gravity
function checkWallCollision() {
    const playerZ = Math.floor(scrollOffset);
    
    for (let tile of tiles) {
        if (Math.abs(tile.z - playerZ) < 1) {
            const dx = tile.x - player.x;
            const dy = tile.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.7 && distance > 0.3) {
                // Determine which wall was hit
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Hit side wall
                    if (dx > 0) {
                        // Right wall
                        player.targetRotation = 90;
                        player.x = tile.x;
                        player.y = tile.y;
                        return true;
                    } else {
                        // Left wall
                        player.targetRotation = 270;
                        player.x = tile.x;
                        player.y = tile.y;
                        return true;
                    }
                } else {
                    // Hit floor or ceiling
                    if (dy > 0) {
                        // Floor
                        player.targetRotation = 0;
                        player.x = tile.x;
                        player.y = tile.y;
                        return true;
                    } else {
                        // Ceiling
                        player.targetRotation = 180;
                        player.x = tile.x;
                        player.y = tile.y;
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    // Move forward
    scrollOffset += speed * 0.02;
    distance = Math.floor(scrollOffset);
    scoreDisplay.textContent = `Distance: ${distance}m`;
    
    // Increase speed over time
    speed = Math.min(4 + distance * 0.01, 8);
    
    // Generate new tunnel segments
    const maxZ = Math.max(...tiles.map(t => t.z));
    if (maxZ < scrollOffset + 50) {
        generateTunnelSegment(maxZ + 1);
    }
    
    // Remove old tiles
    tiles = tiles.filter(t => t.z > scrollOffset - 10);
    
    // Handle input
    if (keys['ArrowLeft']) {
        player.x -= 0.1;
    }
    if (keys['ArrowRight']) {
        player.x += 0.1;
    }
    
    // Apply gravity based on rotation
    const gravityAngle = (player.rotation * Math.PI) / 180;
    player.velocityY += player.gravity;
    
    // Move player based on current rotation
    switch (player.rotation) {
        case 0: // Normal gravity (down)
            player.y += player.velocityY * 0.1;
            break;
        case 90: // Right wall is floor
            player.x += player.velocityY * 0.1;
            break;
        case 180: // Ceiling is floor
            player.y -= player.velocityY * 0.1;
            break;
        case 270: // Left wall is floor
            player.x -= player.velocityY * 0.1;
            break;
    }
    
    // Smooth rotation
    if (player.rotation !== player.targetRotation) {
        const diff = player.targetRotation - player.rotation;
        if (Math.abs(diff) > 180) {
            if (diff > 0) {
                player.rotation -= player.rotationSpeed;
            } else {
                player.rotation += player.rotationSpeed;
            }
        } else {
            if (diff > 0) {
                player.rotation += player.rotationSpeed;
            } else {
                player.rotation -= player.rotationSpeed;
            }
        }
        
        player.rotation = (player.rotation + 360) % 360;
    }
    
    // Check ground collision
    const onTile = checkCollision();
    if (onTile) {
        player.velocityY = 0;
        player.isJumping = false;
        player.x = onTile.x;
        player.y = onTile.y;
        
        // Set rotation based on tile position
        if (onTile.y >= TUNNEL_HEIGHT - 1.5) {
            player.targetRotation = 0; // Floor
        } else if (onTile.y <= 0.5) {
            player.targetRotation = 180; // Ceiling
        } else if (onTile.x <= 0.5) {
            player.targetRotation = 270; // Left wall
        } else if (onTile.x >= TUNNEL_WIDTH - 1.5) {
            player.targetRotation = 90; // Right wall
        }
    }
    
    // Check wall collisions
    checkWallCollision();
    
    // Boundary check
    if (player.x < -1 || player.x > TUNNEL_WIDTH + 1 || 
        player.y < -1 || player.y > TUNNEL_HEIGHT + 1) {
        gameOver();
    }
    
    // Check if fell through gap
    if (player.velocityY > 5 && !onTile) {
        const nearbyTiles = tiles.filter(t => 
            Math.abs(t.z - scrollOffset) < 2 && 
            Math.abs(t.x - player.x) < 1.5 && 
            Math.abs(t.y - player.y) < 1.5
        );
        
        if (nearbyTiles.length === 0) {
            gameOver();
        }
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    gameOverDiv.style.display = 'block';
    finalScore.textContent = `Distance: ${distance}m`;
    
    if (distance < 50) {
        finalMessage.textContent = "Keep practicing! 🏃";
    } else if (distance < 150) {
        finalMessage.textContent = "Good run! 🌟";
    } else if (distance < 300) {
        finalMessage.textContent = "Impressive! 🚀";
    } else {
        finalMessage.textContent = "Amazing! You're a master! 👑";
    }
}

// Restart game
function restartGame() {
    gameRunning = true;
    distance = 0;
    speed = 4;
    scrollOffset = 0;
    
    player.x = 3;
    player.y = 6;
    player.velocityY = 0;
    player.isJumping = false;
    player.rotation = 0;
    player.targetRotation = 0;
    
    gameOverDiv.style.display = 'none';
    initTunnel();
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawTunnel();
    drawPlayer();
    update();
    
    requestAnimationFrame(gameLoop);
}

// Start game
initTunnel();
gameLoop();
