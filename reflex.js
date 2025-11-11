document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const p1ScoreEl = document.getElementById('p1Score');
    const p2ScoreEl = document.getElementById('p2Score');
    const p1ReactionEl = document.getElementById('p1Reaction');
    const p2ReactionEl = document.getElementById('p2Reaction');
    const resetBtn = document.getElementById('resetBtn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const TARGET_RADIUS = 40;
    const WIN_SCORE = 20;
    
    let gameState = {
        p1Score: 0,
        p2Score: 0,
        targets: [],
        spawnTime: 0,
        lastClickTime: 0,
        gameActive: true
    };
    
    function spawnTarget() {
        const margin = TARGET_RADIUS + 10;
        const target = {
            x: Math.random() * (WIDTH - 2 * margin) + margin,
            y: Math.random() * (HEIGHT - 2 * margin) + margin,
            radius: TARGET_RADIUS,
            spawnTime: Date.now(),
            pulsePhase: 0
        };
        gameState.targets.push(target);
    }
    
    function update() {
        if (!gameState.gameActive) return;
        
        // Update target pulse animation
        gameState.targets.forEach(target => {
            target.pulsePhase += 0.1;
        });
        
        // Spawn new target if needed
        if (gameState.targets.length === 0) {
            const delay = Math.random() * 1000 + 500; // 0.5-1.5 seconds
            setTimeout(spawnTarget, delay);
        }
    }
    
    function draw() {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < WIDTH; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, HEIGHT);
            ctx.stroke();
        }
        for (let i = 0; i < HEIGHT; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(WIDTH, i);
            ctx.stroke();
        }
        
        // Draw targets
        gameState.targets.forEach(target => {
            const pulse = Math.sin(target.pulsePhase) * 5;
            const currentRadius = target.radius + pulse;
            
            // Outer glow
            const gradient = ctx.createRadialGradient(
                target.x, target.y, 0,
                target.x, target.y, currentRadius + 10
            );
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(target.x, target.y, currentRadius + 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Target circle
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(target.x, target.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner circle
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(target.x, target.y, currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Center dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(target.x, target.y, currentRadius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw scores on canvas
        ctx.font = 'bold 24px Inter';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText(`P1: ${gameState.p1Score}`, 20, 40);
        
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(`P2: ${gameState.p2Score}`, WIDTH - 100, 40);
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function handleClick(e) {
        if (!gameState.gameActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (WIDTH / rect.width);
        const y = (e.clientY - rect.top) * (HEIGHT / rect.height);
        
        // Check if clicked on a target
        for (let i = gameState.targets.length - 1; i >= 0; i--) {
            const target = gameState.targets[i];
            const dx = x - target.x;
            const dy = y - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < target.radius) {
                const reactionTime = Date.now() - target.spawnTime;
                
                // Determine which player clicked (left or right half of screen)
                if (x < WIDTH / 2) {
                    gameState.p1Score++;
                    p1ReactionEl.textContent = reactionTime;
                    statusEl.textContent = 'Player 1 scored! +1';
                    statusEl.style.color = '#06b6d4';
                } else {
                    gameState.p2Score++;
                    p2ReactionEl.textContent = reactionTime;
                    statusEl.textContent = 'Player 2 scored! +1';
                    statusEl.style.color = '#3b82f6';
                }
                
                updateScores();
                gameState.targets.splice(i, 1);
                
                // Check for winner
                if (gameState.p1Score >= WIN_SCORE) {
                    endGame(1);
                } else if (gameState.p2Score >= WIN_SCORE) {
                    endGame(2);
                }
                
                return;
            }
        }
    }
    
    function updateScores() {
        p1ScoreEl.textContent = gameState.p1Score;
        p2ScoreEl.textContent = gameState.p2Score;
    }
    
    function endGame(winner) {
        gameState.gameActive = false;
        gameState.targets = [];
        statusEl.textContent = `🏆 Player ${winner} Wins!`;
        statusEl.style.color = winner === 1 ? '#06b6d4' : '#3b82f6';
    }
    
    function resetGame() {
        gameState.p1Score = 0;
        gameState.p2Score = 0;
        gameState.targets = [];
        gameState.gameActive = true;
        
        updateScores();
        p1ReactionEl.textContent = '--';
        p2ReactionEl.textContent = '--';
        statusEl.textContent = 'Click the targets as fast as you can!';
        statusEl.style.color = '#06b6d4';
        
        spawnTarget();
    }
    
    // Event listeners
    canvas.addEventListener('click', handleClick);
    resetBtn.addEventListener('click', resetGame);
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    // Start game
    spawnTarget();
    gameLoop();
});
