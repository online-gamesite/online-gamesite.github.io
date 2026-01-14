// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, update, remove, push, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyC8cQdWyNNVVPKNn_B_wlE6q0OmqWJFMbA",
    authDomain: "multiplayer-games-76d23.firebaseapp.com",
    databaseURL: "https://multiplayer-games-76d23-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "multiplayer-games-76d23",
    storageBucket: "multiplayer-games-76d23.firebasestorage.app",
    messagingSenderId: "431065143042",
    appId: "1:431065143042:web:3ed9c9b38a13bce174141b",
    measurementId: "G-1KSV9E8QEM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Game Constants
const GRID_SIZE = 20;
const TILE_SIZE = 30;
const CANVAS_SIZE = 600;
const GAME_SPEED = 150;

// Game State
let canvas, ctx;
let myPlayerId = null;
let myPlayerName = '';
let currentRoom = null;
let players = {};
let food = null;
let myScore = 0;
let gameLoop = null;
let lastMoveTime = 0;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

// Colors for different players
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

// DOM Elements
const joinPanel = document.getElementById('joinPanel');
const gamePanel = document.getElementById('gamePanel');
const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const quickPlayBtn = document.getElementById('quickPlayBtn');
const leaveBtn = document.getElementById('leaveBtn');
const roomCodeEl = document.getElementById('roomCode');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const playerCountEl = document.getElementById('playerCount');
const playersListEl = document.getElementById('playersList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    joinBtn.addEventListener('click', () => joinGame(roomInput.value.toUpperCase()));
    quickPlayBtn.addEventListener('click', () => findOrCreateRoom());
    leaveBtn.addEventListener('click', leaveGame);
    
    setupKeyboardControls();
});

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

// Generate room code
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Find available room or create new one
async function findOrCreateRoom() {
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    try {
        const roomsSnapshot = await get(ref(database, 'snake-rooms'));
        if (roomsSnapshot.exists()) {
            const rooms = roomsSnapshot.val();
            // Find room with less than 4 players
            for (const [roomCode, room] of Object.entries(rooms)) {
                const playerCount = room.players ? Object.keys(room.players).length : 0;
                if (playerCount < 4) {
                    joinGame(roomCode);
                    return;
                }
            }
        }
        // No available room, create new one
        const newRoomCode = generateRoomCode();
        joinGame(newRoomCode);
    } catch (error) {
        console.error('Error finding room:', error);
        alert('Error connecting to game. Please try again.');
    }
}

// Join game room
async function joinGame(roomCode) {
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    if (!roomCode) {
        roomCode = generateRoomCode();
    }
    
    myPlayerId = generatePlayerId();
    myPlayerName = name;
    currentRoom = roomCode;
    
    // Create initial snake
    const startX = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
    const startY = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
    
    const playerData = {
        name: name,
        score: 0,
        alive: true,
        color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
        snake: [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ],
        direction: { x: 1, y: 0 },
        lastUpdate: Date.now()
    };
    
    try {
        // Add player to room
        await set(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), playerData);
        
        // Setup listeners
        setupGameListeners();
        
        // Show game panel
        joinPanel.style.display = 'none';
        gamePanel.style.display = 'block';
        roomCodeEl.textContent = currentRoom;
        statusEl.textContent = 'Game Active!';
        
        // Start game loop
        startGameLoop();
        
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game. Please try again.');
    }
}

// Setup Firebase listeners
function setupGameListeners() {
    // Listen to players
    onValue(ref(database, `snake-rooms/${currentRoom}/players`), (snapshot) => {
        if (snapshot.exists()) {
            players = snapshot.val();
            updatePlayersList();
            playerCountEl.textContent = Object.keys(players).length;
        }
    });
    
    // Listen to food
    onValue(ref(database, `snake-rooms/${currentRoom}/food`), (snapshot) => {
        if (snapshot.exists()) {
            food = snapshot.val();
        } else {
            // Host spawns food
            if (players && myPlayerId && players[myPlayerId]) {
                spawnFood();
            }
        }
    });
}

// Spawn food
async function spawnFood() {
    if (!currentRoom) return;
    
    let foodPos;
    let attempts = 0;
    do {
        foodPos = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        attempts++;
    } while (isFoodOnSnake(foodPos) && attempts < 100);
    
    await set(ref(database, `snake-rooms/${currentRoom}/food`), foodPos);
}

// Check if food spawned on snake
function isFoodOnSnake(pos) {
    for (const playerId in players) {
        const snake = players[playerId].snake;
        if (snake && snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
            return true;
        }
    }
    return false;
}

// Update players list
function updatePlayersList() {
    playersListEl.innerHTML = '<h3 style="color: #06b6d4; text-align: center;">Leaderboard</h3>';
    
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => b.score - a.score);
    
    sortedPlayers.forEach(([id, player]) => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.innerHTML = `
            <span class="player-name" style="color: ${player.color}">${player.name} ${id === myPlayerId ? '(You)' : ''}</span>
            <span class="player-score">${player.score} pts ${!player.alive ? '💀' : ''}</span>
        `;
        playersListEl.appendChild(div);
    });
}

// Setup keyboard controls
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) return;
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y === 0) nextDirection = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y === 0) nextDirection = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x === 0) nextDirection = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x === 0) nextDirection = { x: 1, y: 0 };
                e.preventDefault();
                break;
        }
    });
}

// Start game loop
function startGameLoop() {
    gameLoop = setInterval(updateGame, GAME_SPEED);
}

// Update game
async function updateGame() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) {
        draw();
        return;
    }
    
    const now = Date.now();
    if (now - lastMoveTime < GAME_SPEED) return;
    lastMoveTime = now;
    
    // Update direction
    direction = { ...nextDirection };
    
    const mySnake = players[myPlayerId].snake;
    const head = { ...mySnake[0] };
    
    // Move head
    head.x += direction.x;
    head.y += direction.y;
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        await handleDeath();
        return;
    }
    
    // Check self collision
    if (mySnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        await handleDeath();
        return;
    }
    
    // Check collision with other snakes
    for (const playerId in players) {
        if (playerId === myPlayerId) continue;
        const otherSnake = players[playerId].snake;
        if (otherSnake && otherSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
            await handleDeath();
            return;
        }
    }
    
    // Add new head
    mySnake.unshift(head);
    
    // Check food collision
    if (food && head.x === food.x && head.y === food.y) {
        myScore += 10;
        scoreEl.textContent = myScore;
        spawnFood();
    } else {
        // Remove tail
        mySnake.pop();
    }
    
    // Update Firebase
    await update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        snake: mySnake,
        direction: direction,
        score: myScore,
        lastUpdate: now
    });
    
    draw();
}

// Handle player death
async function handleDeath() {
    await update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        alive: false
    });
    statusEl.textContent = 'You died! 💀';
    draw();
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid
    ctx.strokeStyle = '#1a1f35';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
        ctx.stroke();
    }
    
    // Draw food
    if (food) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(
            food.x * TILE_SIZE + TILE_SIZE / 2,
            food.y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    // Draw snakes
    for (const playerId in players) {
        const player = players[playerId];
        if (!player.snake || !player.alive) continue;
        
        ctx.fillStyle = player.color;
        player.snake.forEach((segment, index) => {
            const alpha = index === 0 ? 1 : 0.7 - (index / player.snake.length) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillRect(
                segment.x * TILE_SIZE + 2,
                segment.y * TILE_SIZE + 2,
                TILE_SIZE - 4,
                TILE_SIZE - 4
            );
        });
        ctx.globalAlpha = 1;
        
        // Draw player name above snake
        if (player.snake[0]) {
            ctx.fillStyle = player.color;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                player.name,
                player.snake[0].x * TILE_SIZE + TILE_SIZE / 2,
                player.snake[0].y * TILE_SIZE - 5
            );
        }
    }
}

// Leave game
async function leaveGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    if (myPlayerId && currentRoom) {
        await remove(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`));
    }
    
    myPlayerId = null;
    currentRoom = null;
    players = {};
    food = null;
    myScore = 0;
    
    gamePanel.style.display = 'none';
    joinPanel.style.display = 'block';
    
    scoreEl.textContent = '0';
    playerCountEl.textContent = '0';
    playersListEl.innerHTML = '';
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (myPlayerId && currentRoom) {
        remove(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`));
    }
});
