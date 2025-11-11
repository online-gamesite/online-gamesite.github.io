document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    
    const TRACK_WIDTH = 800;
    const TRACK_HEIGHT = 600;
    const LANE_WIDTH = 100;
    const CAR_WIDTH = 40;
    const CAR_HEIGHT = 60;
    const FINISH_LINE = 50;
    
    let gameState = 'ready'; // ready, playing, finished
    let winner = null;
    
    // Player 1 (Cyan - left lane)
    const player1 = {
        x: 130, // Centered in left lane (100-200)
        y: TRACK_HEIGHT - 100,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        speed: 0,
        maxSpeed: 12, // Increased from 8
        acceleration: 0.4, // Increased from 0.3
        friction: 0.12, // Reduced for less slowdown
        color: '#06b6d4',
        keys: { up: false, down: false, left: false, right: false },
        lane: 0,
        laneX: 130,
        minX: 105,
        maxX: 175,
        distance: 0,
        trackOffset: 0
    };
    
    // Player 2 (Blue - right lane)
    const player2 = {
        x: 630, // Centered in right lane (600-700)
        y: TRACK_HEIGHT - 100,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        speed: 0,
        maxSpeed: 12, // Increased from 8
        acceleration: 0.4, // Increased from 0.3
        friction: 0.12, // Reduced for less slowdown
        color: '#3b82f6',
        keys: { up: false, down: false, left: false, right: false },
        lane: 1,
        laneX: 630,
        minX: 605,
        maxX: 675,
        distance: 0,
        trackOffset: 0
    };
    
    // Obstacles (separate for each lane)
    let obstaclesLane0 = [];
    let obstaclesLane1 = [];
    let obstacleTimer0 = 0;
    let obstacleTimer1 = 0;
    const OBSTACLE_INTERVAL = 100; // Reduced from 120 for more frequent obstacles
    
    // Speed boosts (separate for each lane)
    let boostsLane0 = [];
    let boostsLane1 = [];
    let boostTimer0 = 0;
    let boostTimer1 = 0;
    const BOOST_INTERVAL = 150; // Reduced from 180 for more frequent boosts
    
    // Track scroll
    let distanceTraveled = 0;
    const RACE_DISTANCE = 20000; // 5x longer race distance
    
    function createObstacle(lane, obstacleArray) {
        const laneX = lane === 0 ? 130 : 630;
        obstacleArray.push({
            x: laneX - 25, // Center obstacle (50px wide)
            y: -50,
            width: 50,
            height: 50,
            lane: lane
        });
    }
    
    function createBoost(lane, boostArray) {
        const laneX = lane === 0 ? 130 : 630;
        boostArray.push({
            x: laneX - 20, // Center boost (40px wide)
            y: -30,
            width: 40,
            height: 40,
            lane: lane
        });
    }
    
    function checkCollision(player, obj) {
        return player.x < obj.x + obj.width &&
               player.x + player.width > obj.x &&
               player.y < obj.y + obj.height &&
               player.y + player.height > obj.y;
    }
    
    function updatePlayer(player, obstacleArray, boostArray) {
        // Acceleration and braking
        if (player.keys.up) {
            player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
        } else if (player.keys.down) {
            player.speed = Math.max(player.speed - player.acceleration * 2, 0);
        } else {
            // Apply friction
            player.speed = Math.max(player.speed - player.friction, 0);
        }
        
        // Lane switching with boundaries
        if (player.keys.left && player.x > player.minX) {
            player.x -= 2;
        }
        if (player.keys.right && player.x < player.maxX) {
            player.x += 2;
        }
        
        // Keep car centered in lane when no input
        if (!player.keys.left && !player.keys.right) {
            if (player.x < player.laneX - 1) {
                player.x += 1;
            } else if (player.x > player.laneX + 1) {
                player.x -= 1;
            }
        }
        
        // Check collisions with obstacles
        for (let i = obstacleArray.length - 1; i >= 0; i--) {
            if (checkCollision(player, obstacleArray[i])) {
                player.speed *= 0.3; // Slow down on collision
                obstacleArray.splice(i, 1);
            }
        }
        
        // Check collisions with boosts
        for (let i = boostArray.length - 1; i >= 0; i--) {
            if (checkCollision(player, boostArray[i])) {
                player.speed = Math.min(player.speed + 3, player.maxSpeed + 2);
                boostArray.splice(i, 1);
            }
        }
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        updatePlayer(player1, obstaclesLane0, boostsLane0);
        updatePlayer(player2, obstaclesLane1, boostsLane1);
        
        // Update individual player distances and track offsets
        player1.distance += player1.speed;
        player1.trackOffset += player1.speed;
        player2.distance += player2.speed;
        player2.trackOffset += player2.speed;
        
        // Update global distance for progress bar
        distanceTraveled = Math.max(player1.distance, player2.distance);
        
        // Spawn obstacles for lane 0 (player 1)
        if (player1.speed > 0) {
            obstacleTimer0++;
            if (obstacleTimer0 >= OBSTACLE_INTERVAL) {
                createObstacle(0, obstaclesLane0);
                obstacleTimer0 = 0;
            }
            
            // Spawn boosts
            boostTimer0++;
            if (boostTimer0 >= BOOST_INTERVAL) {
                createBoost(0, boostsLane0);
                boostTimer0 = 0;
            }
        }
        
        // Spawn obstacles for lane 1 (player 2)
        if (player2.speed > 0) {
            obstacleTimer1++;
            if (obstacleTimer1 >= OBSTACLE_INTERVAL) {
                createObstacle(1, obstaclesLane1);
                obstacleTimer1 = 0;
            }
            
            // Spawn boosts
            boostTimer1++;
            if (boostTimer1 >= BOOST_INTERVAL) {
                createBoost(1, boostsLane1);
                boostTimer1 = 0;
            }
        }
        
        // Move obstacles for lane 0 based on player 1 speed
        const obstacleSpeed0 = 3 + player1.speed * 0.5;
        for (let i = obstaclesLane0.length - 1; i >= 0; i--) {
            obstaclesLane0[i].y += obstacleSpeed0;
            if (obstaclesLane0[i].y > TRACK_HEIGHT) {
                obstaclesLane0.splice(i, 1);
            }
        }
        
        // Move boosts for lane 0
        for (let i = boostsLane0.length - 1; i >= 0; i--) {
            boostsLane0[i].y += obstacleSpeed0;
            if (boostsLane0[i].y > TRACK_HEIGHT) {
                boostsLane0.splice(i, 1);
            }
        }
        
        // Move obstacles for lane 1 based on player 2 speed
        const obstacleSpeed1 = 3 + player2.speed * 0.5;
        for (let i = obstaclesLane1.length - 1; i >= 0; i--) {
            obstaclesLane1[i].y += obstacleSpeed1;
            if (obstaclesLane1[i].y > TRACK_HEIGHT) {
                obstaclesLane1.splice(i, 1);
            }
        }
        
        // Move boosts for lane 1
        for (let i = boostsLane1.length - 1; i >= 0; i--) {
            boostsLane1[i].y += obstacleSpeed1;
            if (boostsLane1[i].y > TRACK_HEIGHT) {
                boostsLane1.splice(i, 1);
            }
        }
        
        // Check for winner - first to reach RACE_DISTANCE
        if (player1.distance >= RACE_DISTANCE || player2.distance >= RACE_DISTANCE) {
            gameState = 'finished';
            if (player1.distance > player2.distance) {
                winner = 1;
                statusEl.textContent = '🏆 Player 1 (Cyan) Wins!';
                statusEl.style.color = '#06b6d4';
            } else if (player2.distance > player1.distance) {
                winner = 2;
                statusEl.textContent = '🏆 Player 2 (Blue) Wins!';
                statusEl.style.color = '#3b82f6';
            } else {
                statusEl.textContent = '🏁 It\'s a Tie!';
                statusEl.style.color = '#f59e0b';
            }
        }
    }
    
    function drawTrack() {
        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, TRACK_HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
        
        // Draw lanes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        
        // Left lane
        ctx.strokeRect(100, 0, 100, TRACK_HEIGHT);
        // Right lane
        ctx.strokeRect(600, 0, 100, TRACK_HEIGHT);
        
        // Draw lane dividers (animated independently for each lane)
        ctx.setLineDash([20, 20]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        
        // Left lane divider (based on player 1 movement)
        const offset0 = (player1.trackOffset % 40);
        ctx.lineDashOffset = -offset0;
        ctx.beginPath();
        ctx.moveTo(150, 0);
        ctx.lineTo(150, TRACK_HEIGHT);
        ctx.stroke();
        
        // Right lane divider (based on player 2 movement)
        const offset1 = (player2.trackOffset % 40);
        ctx.lineDashOffset = -offset1;
        ctx.beginPath();
        ctx.moveTo(650, 0);
        ctx.lineTo(650, TRACK_HEIGHT);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Draw progress bar
        const progress = Math.min(distanceTraveled / RACE_DISTANCE, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(10, 10, 200, 20);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(10, 10, 200 * progress, 20);
        ctx.strokeStyle = '#06b6d4';
        ctx.strokeRect(10, 10, 200, 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter';
        ctx.fillText(`${Math.floor(progress * 100)}%`, 220, 25);
        
        // Draw finish line for Player 1 (left lane)
        if (player1.distance >= RACE_DISTANCE - 500) {
            const finishY1 = TRACK_HEIGHT - ((RACE_DISTANCE - player1.distance) / 5);
            if (finishY1 > 0 && finishY1 < TRACK_HEIGHT) {
                ctx.fillStyle = 'rgba(6, 182, 212, 0.8)'; // Cyan for P1
                ctx.fillRect(100, finishY1, 100, 5);
                ctx.fillStyle = player1.color;
                ctx.font = 'bold 20px Inter';
                ctx.fillText('FINISH', 110, finishY1 - 10);
            }
        }
        
        // Draw finish line for Player 2 (right lane)
        if (player2.distance >= RACE_DISTANCE - 500) {
            const finishY2 = TRACK_HEIGHT - ((RACE_DISTANCE - player2.distance) / 5);
            if (finishY2 > 0 && finishY2 < TRACK_HEIGHT) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'; // Blue for P2
                ctx.fillRect(600, finishY2, 100, 5);
                ctx.fillStyle = player2.color;
                ctx.font = 'bold 20px Inter';
                ctx.fillText('FINISH', 610, finishY2 - 10);
            }
        }
    }
    
    function drawCar(player) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        
        // Car body
        ctx.fillStyle = player.color;
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        
        // Car details
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 10, player.width - 10, 15); // windshield
        
        // Wheels
        ctx.fillStyle = '#1a1f35';
        ctx.fillRect(-player.width / 2 - 3, -player.height / 2 + 5, 5, 12);
        ctx.fillRect(player.width / 2 - 2, -player.height / 2 + 5, 5, 12);
        ctx.fillRect(-player.width / 2 - 3, player.height / 2 - 17, 5, 12);
        ctx.fillRect(player.width / 2 - 2, player.height / 2 - 17, 5, 12);
        
        // Speed indicator
        if (player.speed > 0) {
            ctx.fillStyle = player.color;
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(-player.width / 2 + 10, player.height / 2 + 10 + i * 15, 
                           player.width - 20, 8);
            }
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    function drawObstacles() {
        ctx.fillStyle = '#ef4444';
        
        // Draw obstacles for lane 0
        obstaclesLane0.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Warning stripes
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, 5);
            ctx.fillRect(obs.x + 5, obs.y + obs.height - 10, obs.width - 10, 5);
            ctx.fillStyle = '#ef4444';
        });
        
        // Draw obstacles for lane 1
        obstaclesLane1.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Warning stripes
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, 5);
            ctx.fillRect(obs.x + 5, obs.y + obs.height - 10, obs.width - 10, 5);
            ctx.fillStyle = '#ef4444';
        });
    }
    
    function drawBoosts() {
        // Draw boosts for lane 0
        boostsLane0.forEach(boost => {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(boost.x + boost.width / 2, boost.y + boost.height / 2, 
                   boost.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Star shape
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('⚡', boost.x + 10, boost.y + 28);
        });
        
        // Draw boosts for lane 1
        boostsLane1.forEach(boost => {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(boost.x + boost.width / 2, boost.y + boost.height / 2, 
                   boost.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Star shape
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('⚡', boost.x + 10, boost.y + 28);
        });
    }
    
    function draw() {
        drawTrack();
        drawObstacles();
        drawBoosts();
        drawCar(player1);
        drawCar(player2);
        
        // Draw speeds
        ctx.fillStyle = player1.color;
        ctx.font = '14px Inter';
        ctx.fillText(`P1: ${Math.floor(player1.speed * 20)} mph`, 10, TRACK_HEIGHT - 10);
        
        ctx.fillStyle = player2.color;
        ctx.fillText(`P2: ${Math.floor(player2.speed * 20)} mph`, TRACK_WIDTH - 120, TRACK_HEIGHT - 10);
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function startGame() {
        gameState = 'playing';
        statusEl.textContent = 'Race to the finish!';
        statusEl.style.color = '#06b6d4';
        distanceTraveled = 0;
        obstaclesLane0 = [];
        obstaclesLane1 = [];
        boostsLane0 = [];
        boostsLane1 = [];
        obstacleTimer0 = 0;
        obstacleTimer1 = 0;
        boostTimer0 = 0;
        boostTimer1 = 0;
        winner = null;
        
        player1.speed = 0;
        player1.trackOffset = 0;
        player2.speed = 0;
        player2.trackOffset = 0;
    }
    
    function resetGame() {
        gameState = 'ready';
        statusEl.textContent = 'Press SPACE to Start Race!';
        statusEl.style.color = '#06b6d4';
        
        player1.x = 130;
        player1.y = TRACK_HEIGHT - 100;
        player1.speed = 0;
        player1.distance = 0;
        player1.trackOffset = 0;
        
        player2.x = 630;
        player2.y = TRACK_HEIGHT - 100;
        player2.speed = 0;
        player2.distance = 0;
        player2.trackOffset = 0;
        
        obstaclesLane0 = [];
        obstaclesLane1 = [];
        boostsLane0 = [];
        boostsLane1 = [];
        distanceTraveled = 0;
        winner = null;
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = true;
        if (e.key === 's' || e.key === 'S') player1.keys.down = true;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = true;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = true;
        
        // Player 2 controls
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
        
        // Start game
        if (e.key === ' ' && gameState === 'ready') {
            e.preventDefault();
            startGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = false;
        if (e.key === 's' || e.key === 'S') player1.keys.down = false;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = false;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = false;
        
        // Player 2 controls
        if (e.key === 'ArrowUp') player2.keys.up = false;
        if (e.key === 'ArrowDown') player2.keys.down = false;
        if (e.key === 'ArrowLeft') player2.keys.left = false;
        if (e.key === 'ArrowRight') player2.keys.right = false;
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Start game loop
    gameLoop();
});
