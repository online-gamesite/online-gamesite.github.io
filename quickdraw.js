document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const wordDisplayEl = document.getElementById('wordDisplay');
    const p1ScoreEl = document.getElementById('p1Score');
    const p2ScoreEl = document.getElementById('p2Score');
    const timerEl = document.getElementById('timer');
    const resetBtn = document.getElementById('resetBtn');
    const guessBtn = document.getElementById('guessBtn');
    const skipBtn = document.getElementById('skipBtn');
    const clearBtn = document.getElementById('clearBtn');
    const penTool = document.getElementById('penTool');
    const eraserTool = document.getElementById('eraserTool');
    const colorBtns = document.querySelectorAll('.color-btn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const ROUND_TIME = 60;
    const WORDS = [
        'cat', 'dog', 'car', 'house', 'tree', 'sun', 'moon', 'star',
        'flower', 'fish', 'bird', 'snake', 'boat', 'plane', 'train',
        'guitar', 'pizza', 'apple', 'banana', 'ice cream', 'cake',
        'mountain', 'beach', 'rainbow', 'cloud', 'lightning', 'snowman',
        'heart', 'smile', 'crown', 'diamond', 'key', 'lock', 'book'
    ];
    
    let gameState = {
        currentPlayer: 1,
        currentWord: '',
        p1Score: 0,
        p2Score: 0,
        timeLeft: ROUND_TIME,
        isDrawing: false,
        tool: 'pen',
        color: '#06b6d4',
        lineWidth: 3,
        timerInterval: null
    };
    
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function getNewWord() {
        return WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    
    function startRound() {
        gameState.currentWord = getNewWord();
        gameState.timeLeft = ROUND_TIME;
        clearCanvas();
        
        // Show word to current drawer
        wordDisplayEl.textContent = gameState.currentWord.toUpperCase();
        statusEl.textContent = `Player ${gameState.currentPlayer} is drawing!`;
        statusEl.style.color = gameState.currentPlayer === 1 ? '#06b6d4' : '#3b82f6';
        
        // Start timer
        if (gameState.timerInterval) clearInterval(gameState.timerInterval);
        gameState.timerInterval = setInterval(updateTimer, 1000);
    }
    
    function updateTimer() {
        gameState.timeLeft--;
        timerEl.textContent = `Time: ${gameState.timeLeft}s`;
        
        if (gameState.timeLeft <= 10) {
            timerEl.style.color = '#ef4444';
        } else {
            timerEl.style.color = '#f59e0b';
        }
        
        if (gameState.timeLeft <= 0) {
            timeUp();
        }
    }
    
    function timeUp() {
        clearInterval(gameState.timerInterval);
        statusEl.textContent = `Time's up! The word was: ${gameState.currentWord}`;
        statusEl.style.color = '#ef4444';
        setTimeout(nextTurn, 3000);
    }
    
    function correctGuess() {
        clearInterval(gameState.timerInterval);
        
        // Award points based on time left
        const points = Math.max(1, Math.floor(gameState.timeLeft / 10));
        
        if (gameState.currentPlayer === 1) {
            gameState.p1Score += points;
        } else {
            gameState.p2Score += points;
        }
        
        updateScores();
        statusEl.textContent = `Correct! +${points} points! Word was: ${gameState.currentWord}`;
        statusEl.style.color = '#10b981';
        
        setTimeout(nextTurn, 2000);
    }
    
    function skipWord() {
        clearInterval(gameState.timerInterval);
        statusEl.textContent = `Skipped! The word was: ${gameState.currentWord}`;
        statusEl.style.color = '#f59e0b';
        setTimeout(nextTurn, 2000);
    }
    
    function nextTurn() {
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        startRound();
    }
    
    function updateScores() {
        p1ScoreEl.textContent = `Score: ${gameState.p1Score}`;
        p2ScoreEl.textContent = `Score: ${gameState.p2Score}`;
    }
    
    function clearCanvas() {
        ctx.fillStyle = '#1a1f35';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (WIDTH / rect.width),
            y: (e.clientY - rect.top) * (HEIGHT / rect.height)
        };
    }
    
    function startDrawing(e) {
        drawing = true;
        const pos = getMousePos(e);
        lastX = pos.x;
        lastY = pos.y;
    }
    
    function draw(e) {
        if (!drawing) return;
        
        const pos = getMousePos(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        
        if (gameState.tool === 'pen') {
            ctx.strokeStyle = gameState.color;
            ctx.lineWidth = gameState.lineWidth;
        } else {
            ctx.strokeStyle = '#1a1f35';
            ctx.lineWidth = 20;
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        lastX = pos.x;
        lastY = pos.y;
    }
    
    function stopDrawing() {
        drawing = false;
    }
    
    // Canvas event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    });
    
    // Tool buttons
    penTool.addEventListener('click', () => {
        gameState.tool = 'pen';
        penTool.classList.add('active');
        eraserTool.classList.remove('active');
    });
    
    eraserTool.addEventListener('click', () => {
        gameState.tool = 'eraser';
        eraserTool.classList.add('active');
        penTool.classList.remove('active');
    });
    
    clearBtn.addEventListener('click', clearCanvas);
    
    // Color buttons
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            gameState.color = btn.dataset.color;
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Game buttons
    guessBtn.addEventListener('click', correctGuess);
    skipBtn.addEventListener('click', skipWord);
    
    resetBtn.addEventListener('click', () => {
        if (gameState.timerInterval) clearInterval(gameState.timerInterval);
        gameState.p1Score = 0;
        gameState.p2Score = 0;
        gameState.currentPlayer = 1;
        updateScores();
        startRound();
    });
    
    // Initialize
    clearCanvas();
    startRound();
});
