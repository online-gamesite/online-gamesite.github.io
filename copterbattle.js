// Copter Battle Arena - Client-side JavaScript
const SERVER_URL = window.location.protocol + '//' + window.location.host;
const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Game state
let myId = null;
let players = {};
let bullets = [];
let gameWorld = { width: 3000, height: 3000 };
let camera = { x: 0, y: 0 };

// Input state
let keys = {};
let mouseX = 0;
let mouseY = 0;
let isShooting = false;

// Join game
function joinGame() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
    
    socket.emit('joinGame', { name: name });
}

// Socket handlers
socket.on('joined', (data) => {
    myId = data.id;
    gameWorld = data.gameWorld;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    showNotification('🚁 Joined the battle!');
    
    // Start game loop
    requestAnimationFrame(gameLoop);
});

socket.on('playerJoined', (player) => {
    players[player.id] = player;
    if (player.id !== myId) {
        showNotification(`${player.name} joined the battle`);
    }
});

socket.on('playerLeft', (data) => {
    delete players[data.id];
    showNotification(`${data.name} left the game`);
});

socket.on('gameState', (state) => {
    players = state.players;
    bullets = state.bullets;
    updateHUD();
});

socket.on('playerKilled', (data) => {
    if (data.victim === myId) {
        showDeathScreen(data.killerName);
    } else if (data.killer === myId) {
        showNotification(`💀 You killed ${data.victimName}! +100`);
    } else {
        showNotification(`💀 ${data.killerName} killed ${data.victimName}`);
    }
});

socket.on('playerRespawned', (playerId) => {
    if (playerId === myId) {
        hideDeathScreen();
        showNotification('🚁 Respawned!');
    }
});

socket.on('upgradeSuccess', (data) => {
    showNotification(`⚡ Upgraded ${data.upgradeType}!`);
    updateUpgradeMenu();
});

// Input handlers
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'u') {
        toggleUpgradeMenu();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    isShooting = true;
});

canvas.addEventListener('mouseup', () => {
    isShooting = false;
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!myId || !players[myId] || !players[myId].alive) return;
    
    const player = players[myId];
    let moved = false;
    
    // Movement (WASD)
    const speed = 5; // Will be modified by upgrades on server
    let dx = 0;
    let dy = 0;
    
    if (keys['w'] || keys['arrowup']) dy -= speed;
    if (keys['s'] || keys['arrowdown']) dy += speed;
    if (keys['a'] || keys['arrowleft']) dx -= speed;
    if (keys['d'] || keys['arrowright']) dx += speed;
    
    if (dx !== 0 || dy !== 0) {
        player.x += dx;
        player.y += dy;
        
        // Keep in bounds
        player.x = Math.max(0, Math.min(gameWorld.width, player.x));
        player.y = Math.max(0, Math.min(gameWorld.height, player.y));
        
        moved = true;
    }
    
    // Calculate angle to mouse
    const worldMouseX = mouseX + camera.x;
    const worldMouseY = mouseY + camera.y;
    player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
    
    // Send update to server
    if (moved || player.angle) {
        socket.emit('playerMove', {
            x: player.x,
            y: player.y,
            angle: player.angle
        });
    }
    
    // Shooting
    if (isShooting || keys[' ']) {
        socket.emit('shoot', { angle: player.angle });
    }
    
    // Update camera to follow player
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    // Keep camera in bounds
    camera.x = Math.max(0, Math.min(gameWorld.width - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(gameWorld.height - canvas.height, camera.y));
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
    
    // Draw bullets
    bullets.forEach(bullet => {
        const screenX = bullet.x - camera.x;
        const screenY = bullet.y - camera.y;
        
        if (screenX < -50 || screenX > canvas.width + 50 || 
            screenY < -50 || screenY > canvas.height + 50) return;
        
        const player = players[bullet.playerId];
        ctx.fillStyle = player ? player.color : '#FFD700';
        ctx.beginPath();
        ctx.arc(screenX, screenY, bullet.size || 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet trail
        ctx.strokeStyle = player ? player.color + '80' : '#FFD70080';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        const trailX = screenX - Math.cos(bullet.angle) * 10;
        const trailY = screenY - Math.sin(bullet.angle) * 10;
        ctx.lineTo(trailX, trailY);
        ctx.stroke();
    });
    
    // Draw players
    Object.values(players).forEach(player => {
        if (!player.alive) return;
        
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;
        
        if (screenX < -100 || screenX > canvas.width + 100 || 
            screenY < -100 || screenY > canvas.height + 100) return;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(player.angle);
        
        // Helicopter body
        ctx.fillStyle = player.color;
        ctx.fillRect(-20, -15, 40, 30);
        
        // Cockpit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-10, -10, 20, 20);
        
        // Rotor
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-30, -20);
        ctx.lineTo(30, -20);
        ctx.stroke();
        
        // Tail
        ctx.fillStyle = player.color;
        ctx.fillRect(20, -5, 15, 10);
        
        // Gun
        ctx.fillStyle = '#333';
        ctx.fillRect(20, -2, 15, 4);
        
        ctx.restore();
        
        // Health bar
        const barWidth = 50;
        const barHeight = 5;
        const healthPercent = player.health / player.maxHealth;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX - barWidth/2, screenY - 30, barWidth, barHeight);
        
        const healthColor = healthPercent > 0.5 ? '#4ECDC4' : healthPercent > 0.25 ? '#FFA07A' : '#FF6B6B';
        ctx.fillStyle = healthColor;
        ctx.fillRect(screenX - barWidth/2, screenY - 30, barWidth * healthPercent, barHeight);
        
        // Player name
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(player.name, screenX, screenY - 38);
        ctx.fillText(player.name, screenX, screenY - 38);
        
        // Level badge
        if (player.level > 1) {
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.font = 'bold 10px Arial';
            ctx.strokeText(`Lv.${player.level}`, screenX, screenY + 35);
            ctx.fillText(`Lv.${player.level}`, screenX, screenY + 35);
        }
    });
}

// HUD functions
function updateHUD() {
    if (!myId || !players[myId]) return;
    
    const player = players[myId];
    
    document.getElementById('playerName').textContent = player.name;
    document.getElementById('playerLevel').textContent = player.level;
    document.getElementById('playerXP').textContent = player.xp;
    document.getElementById('playerKD').textContent = `${player.kills}/${player.deaths}`;
    
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
    
    // Update leaderboard
    const sorted = Object.values(players).sort((a, b) => b.score - a.score).slice(0, 10);
    const leaderboard = document.getElementById('leaderboardList');
    leaderboard.innerHTML = '';
    
    sorted.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item' + (p.id === myId ? ' me' : '');
        div.innerHTML = `
            <span>${i + 1}. ${p.name}</span>
            <span>${p.kills} kills</span>
        `;
        leaderboard.appendChild(div);
    });
}

function toggleUpgradeMenu() {
    const menu = document.getElementById('upgradeMenu');
    menu.style.display = menu.style.display === 'none' || !menu.style.display ? 'block' : 'none';
    updateUpgradeMenu();
}

function updateUpgradeMenu() {
    if (!myId || !players[myId]) return;
    
    const player = players[myId];
    const availablePoints = Math.floor(player.xp / 10);
    const spentPoints = Object.values(player.upgrades).reduce((sum, level) => sum + level, 0);
    
    document.getElementById('availablePoints').textContent = availablePoints - spentPoints;
    
    // Update upgrade buttons
    ['FIRE_RATE', 'BULLET_DAMAGE', 'MAX_HEALTH', 'MOVE_SPEED', 'BULLET_SIZE'].forEach(type => {
        const level = player.upgrades[type] || 0;
        document.getElementById(`upgrade-${type}`).textContent = level;
    });
}

function buyUpgrade(upgradeType) {
    socket.emit('upgrade', upgradeType);
}

// Notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showDeathScreen(killerName) {
    const deathScreen = document.getElementById('deathScreen');
    document.getElementById('killerName').textContent = killerName || 'Unknown';
    deathScreen.style.display = 'block';
    
    let timer = 3;
    document.getElementById('respawnTimer').textContent = timer;
    
    const interval = setInterval(() => {
        timer--;
        document.getElementById('respawnTimer').textContent = timer;
        if (timer <= 0) clearInterval(interval);
    }, 1000);
}

function hideDeathScreen() {
    document.getElementById('deathScreen').style.display = 'none';
}

// Handle enter key on name input
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});
