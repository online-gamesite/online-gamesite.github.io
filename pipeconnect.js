document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const movesEl = document.getElementById('moves');
    const timeEl = document.getElementById('time');
    const levelEl = document.getElementById('level');
    const checkBtn = document.getElementById('checkBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    
    let gridSize = 6;
    let cellSize = 600 / gridSize;
    let grid = [];
    let startPos = null;
    let endPos = null;
    let moves = 0;
    let seconds = 0;
    let timerInterval = null;
    let currentLevel = 1;
    let difficulty = 'easy';
    let solved = false;
    
    // Pipe types: 0=empty, 1=straight, 2=corner, 3=T-junction, 4=cross, 5=source, 6=drain
    const PIPE_TYPES = {
        EMPTY: 0,
        STRAIGHT: 1,
        CORNER: 2,
        T_JUNCTION: 3,
        CROSS: 4,
        SOURCE: 5,
        DRAIN: 6
    };
    
    class Pipe {
        constructor(type, rotation = 0) {
            this.type = type;
            this.rotation = rotation; // 0, 1, 2, 3 (0°, 90°, 180°, 270°)
            this.connected = false;
            this.isSource = type === PIPE_TYPES.SOURCE;
            this.isDrain = type === PIPE_TYPES.DRAIN;
        }
        
        rotate() {
            if (!this.isSource && !this.isDrain) {
                this.rotation = (this.rotation + 1) % 4;
            }
        }
        
        getConnections() {
            // Returns array of directions [up, right, down, left] that are connected
            const connections = [false, false, false, false];
            
            switch(this.type) {
                case PIPE_TYPES.STRAIGHT:
                    if (this.rotation % 2 === 0) {
                        connections[0] = true; // up
                        connections[2] = true; // down
                    } else {
                        connections[1] = true; // right
                        connections[3] = true; // left
                    }
                    break;
                case PIPE_TYPES.CORNER:
                    switch(this.rotation) {
                        case 0: connections[0] = true; connections[1] = true; break; // up-right
                        case 1: connections[1] = true; connections[2] = true; break; // right-down
                        case 2: connections[2] = true; connections[3] = true; break; // down-left
                        case 3: connections[3] = true; connections[0] = true; break; // left-up
                    }
                    break;
                case PIPE_TYPES.T_JUNCTION:
                    switch(this.rotation) {
                        case 0: connections[0] = true; connections[1] = true; connections[3] = true; break;
                        case 1: connections[0] = true; connections[1] = true; connections[2] = true; break;
                        case 2: connections[1] = true; connections[2] = true; connections[3] = true; break;
                        case 3: connections[0] = true; connections[2] = true; connections[3] = true; break;
                    }
                    break;
                case PIPE_TYPES.CROSS:
                    connections[0] = connections[1] = connections[2] = connections[3] = true;
                    break;
                case PIPE_TYPES.SOURCE:
                    connections[1] = true; // Always connects right initially
                    break;
                case PIPE_TYPES.DRAIN:
                    connections[3] = true; // Always connects left initially
                    break;
            }
            
            return connections;
        }
    }
    
    function initGrid() {
        grid = [];
        for (let y = 0; y < gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < gridSize; x++) {
                grid[y][x] = new Pipe(PIPE_TYPES.EMPTY);
            }
        }
    }
    
    function generatePuzzle() {
        initGrid();
        solved = false;
        
        // Place source and drain
        startPos = { x: 0, y: Math.floor(gridSize / 2) };
        endPos = { x: gridSize - 1, y: Math.floor(gridSize / 2) };
        
        grid[startPos.y][startPos.x] = new Pipe(PIPE_TYPES.SOURCE);
        grid[endPos.y][endPos.x] = new Pipe(PIPE_TYPES.DRAIN);
        
        // Generate a valid path using BFS/random walk
        const path = generateValidPath();
        
        // Place pipes along the path
        for (let i = 0; i < path.length; i++) {
            const pos = path[i];
            if (grid[pos.y][pos.x].type !== PIPE_TYPES.EMPTY) continue;
            
            const prev = i > 0 ? path[i - 1] : null;
            const next = i < path.length - 1 ? path[i + 1] : null;
            
            const pipeType = determinePipeType(pos, prev, next);
            grid[pos.y][pos.x] = new Pipe(pipeType.type, pipeType.rotation);
        }
        
        // Add some random pipes as decoys
        const decoyCount = Math.floor(gridSize * gridSize * 0.2);
        for (let i = 0; i < decoyCount; i++) {
            const x = Math.floor(Math.random() * gridSize);
            const y = Math.floor(Math.random() * gridSize);
            
            if (grid[y][x].type === PIPE_TYPES.EMPTY) {
                const types = [PIPE_TYPES.STRAIGHT, PIPE_TYPES.CORNER];
                const type = types[Math.floor(Math.random() * types.length)];
                grid[y][x] = new Pipe(type, Math.floor(Math.random() * 4));
            }
        }
        
        // Randomize rotations
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const pipe = grid[y][x];
                if (!pipe.isSource && !pipe.isDrain && pipe.type !== PIPE_TYPES.EMPTY) {
                    const rotations = Math.floor(Math.random() * 4);
                    for (let r = 0; r < rotations; r++) {
                        pipe.rotate();
                    }
                }
            }
        }
    }
    
    function generateValidPath() {
        const path = [];
        let current = { ...startPos };
        path.push(current);
        
        const visited = new Set();
        visited.add(`${current.x},${current.y}`);
        
        while (current.x !== endPos.x || current.y !== endPos.y) {
            const possibleMoves = [];
            
            // Prefer moving towards the end
            if (current.x < endPos.x && !visited.has(`${current.x + 1},${current.y}`)) {
                possibleMoves.push({ x: current.x + 1, y: current.y, weight: 3 });
            }
            if (current.y < endPos.y && !visited.has(`${current.x},${current.y + 1}`)) {
                possibleMoves.push({ x: current.x, y: current.y + 1, weight: 2 });
            }
            if (current.y > endPos.y && !visited.has(`${current.x},${current.y - 1}`)) {
                possibleMoves.push({ x: current.x, y: current.y - 1, weight: 2 });
            }
            
            // Add random moves with lower weight
            const directions = [
                { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
            ];
            
            for (const dir of directions) {
                const newX = current.x + dir.x;
                const newY = current.y + dir.y;
                if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize &&
                    !visited.has(`${newX},${newY}`)) {
                    if (!possibleMoves.find(m => m.x === newX && m.y === newY)) {
                        possibleMoves.push({ x: newX, y: newY, weight: 1 });
                    }
                }
            }
            
            if (possibleMoves.length === 0) break;
            
            // Weighted random selection
            const totalWeight = possibleMoves.reduce((sum, m) => sum + m.weight, 0);
            let random = Math.random() * totalWeight;
            let selected = possibleMoves[0];
            
            for (const move of possibleMoves) {
                random -= move.weight;
                if (random <= 0) {
                    selected = move;
                    break;
                }
            }
            
            current = { x: selected.x, y: selected.y };
            path.push(current);
            visited.add(`${current.x},${current.y}`);
        }
        
        return path;
    }
    
    function determinePipeType(pos, prev, next) {
        if (!prev || !next) return { type: PIPE_TYPES.STRAIGHT, rotation: 0 };
        
        const dx1 = prev ? pos.x - prev.x : 0;
        const dy1 = prev ? pos.y - prev.y : 0;
        const dx2 = next ? next.x - pos.x : 0;
        const dy2 = next ? next.y - pos.y : 0;
        
        // Straight pipe
        if ((dx1 === 0 && dx2 === 0) || (dy1 === 0 && dy2 === 0)) {
            return { type: PIPE_TYPES.STRAIGHT, rotation: dx1 === 0 ? 0 : 1 };
        }
        
        // Corner pipe
        let rotation = 0;
        if (dx1 === -1 && dy2 === 1) rotation = 0; // from left, to down
        else if (dy1 === -1 && dx2 === 1) rotation = 0; // from up, to right
        else if (dx1 === 1 && dy2 === 1) rotation = 1; // from right, to down
        else if (dy1 === -1 && dx2 === -1) rotation = 1; // from up, to left
        else if (dx1 === 1 && dy2 === -1) rotation = 2; // from right, to up
        else if (dy1 === 1 && dx2 === -1) rotation = 2; // from down, to left
        else if (dx1 === -1 && dy2 === -1) rotation = 3; // from left, to up
        else if (dy1 === 1 && dx2 === 1) rotation = 3; // from down, to right
        
        return { type: PIPE_TYPES.CORNER, rotation };
    }
    
    function drawPipe(pipe, x, y) {
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;
        const pipeWidth = cellSize * 0.25;
        
        ctx.save();
        ctx.translate(cx, cy);
        
        // Draw pipe based on type and rotation
        if (pipe.isSource) {
            // Source
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(0, 0, cellSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${cellSize * 0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', 0, 0);
        } else if (pipe.isDrain) {
            // Drain
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, cellSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${cellSize * 0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('D', 0, 0);
        } else if (pipe.type !== PIPE_TYPES.EMPTY) {
            ctx.rotate((pipe.rotation * Math.PI) / 2);
            
            ctx.strokeStyle = pipe.connected ? '#06b6d4' : '#4b5563';
            ctx.lineWidth = pipeWidth;
            ctx.lineCap = 'round';
            
            if (pipe.connected) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#06b6d4';
            }
            
            switch(pipe.type) {
                case PIPE_TYPES.STRAIGHT:
                    ctx.beginPath();
                    ctx.moveTo(0, -cellSize / 2);
                    ctx.lineTo(0, cellSize / 2);
                    ctx.stroke();
                    break;
                    
                case PIPE_TYPES.CORNER:
                    ctx.beginPath();
                    ctx.moveTo(0, -cellSize / 2);
                    ctx.lineTo(0, 0);
                    ctx.lineTo(cellSize / 2, 0);
                    ctx.stroke();
                    break;
                    
                case PIPE_TYPES.T_JUNCTION:
                    ctx.beginPath();
                    ctx.moveTo(0, -cellSize / 2);
                    ctx.lineTo(0, 0);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-cellSize / 2, 0);
                    ctx.lineTo(cellSize / 2, 0);
                    ctx.stroke();
                    break;
                    
                case PIPE_TYPES.CROSS:
                    ctx.beginPath();
                    ctx.moveTo(0, -cellSize / 2);
                    ctx.lineTo(0, cellSize / 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-cellSize / 2, 0);
                    ctx.lineTo(cellSize / 2, 0);
                    ctx.stroke();
                    break;
            }
            
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    function draw() {
        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }
        
        // Draw pipes
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                drawPipe(grid[y][x], x, y);
            }
        }
    }
    
    function checkConnections() {
        // Reset all connections
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                grid[y][x].connected = false;
            }
        }
        
        // BFS from source
        const queue = [startPos];
        const visited = new Set();
        visited.add(`${startPos.x},${startPos.y}`);
        grid[startPos.y][startPos.x].connected = true;
        
        let foundDrain = false;
        
        while (queue.length > 0) {
            const pos = queue.shift();
            const pipe = grid[pos.y][pos.x];
            const connections = pipe.getConnections();
            
            // Check all four directions
            const directions = [
                { dx: 0, dy: -1, dir: 0 }, // up
                { dx: 1, dy: 0, dir: 1 },  // right
                { dx: 0, dy: 1, dir: 2 },  // down
                { dx: -1, dy: 0, dir: 3 }  // left
            ];
            
            for (const d of directions) {
                if (!connections[d.dir]) continue;
                
                const newX = pos.x + d.dx;
                const newY = pos.y + d.dy;
                const key = `${newX},${newY}`;
                
                if (newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize) continue;
                if (visited.has(key)) continue;
                
                const neighborPipe = grid[newY][newX];
                const neighborConnections = neighborPipe.getConnections();
                
                // Check if neighbor connects back
                const oppositeDir = (d.dir + 2) % 4;
                if (neighborConnections[oppositeDir]) {
                    visited.add(key);
                    neighborPipe.connected = true;
                    queue.push({ x: newX, y: newY });
                    
                    if (neighborPipe.isDrain) {
                        foundDrain = true;
                    }
                }
            }
        }
        
        return foundDrain;
    }
    
    function checkSolution() {
        const isComplete = checkConnections();
        draw();
        
        if (isComplete) {
            solved = true;
            clearInterval(timerInterval);
            statusEl.textContent = '🎉 Puzzle Solved! Great job!';
            statusEl.style.color = '#10b981';
        } else {
            statusEl.textContent = '❌ Not connected yet. Keep trying!';
            statusEl.style.color = '#ef4444';
            setTimeout(() => {
                statusEl.textContent = 'Connect the pipes from source to drain!';
                statusEl.style.color = '#06b6d4';
            }, 2000);
        }
    }
    
    function updateTimer() {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function startNewGame() {
        moves = 0;
        seconds = 0;
        movesEl.textContent = '0';
        timeEl.textContent = '0:00';
        statusEl.textContent = 'Connect the pipes from source to drain!';
        statusEl.style.color = '#06b6d4';
        
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        
        generatePuzzle();
        draw();
    }
    
    // Click handler
    canvas.addEventListener('click', (e) => {
        if (solved) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const gridX = Math.floor(clickX / cellSize);
        const gridY = Math.floor(clickY / cellSize);
        
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
            const pipe = grid[gridY][gridX];
            if (!pipe.isSource && !pipe.isDrain && pipe.type !== PIPE_TYPES.EMPTY) {
                pipe.rotate();
                moves++;
                movesEl.textContent = moves;
                checkConnections();
                draw();
            }
        }
    });
    
    // Touch handler
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (solved) return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const clickX = touch.clientX - rect.left;
        const clickY = touch.clientY - rect.top;
        
        const gridX = Math.floor(clickX / cellSize);
        const gridY = Math.floor(clickY / cellSize);
        
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
            const pipe = grid[gridY][gridX];
            if (!pipe.isSource && !pipe.isDrain && pipe.type !== PIPE_TYPES.EMPTY) {
                pipe.rotate();
                moves++;
                movesEl.textContent = moves;
                checkConnections();
                draw();
            }
        }
    });
    
    // Button handlers
    checkBtn.addEventListener('click', checkSolution);
    newGameBtn.addEventListener('click', () => {
        currentLevel++;
        levelEl.textContent = currentLevel;
        startNewGame();
    });
    
    // Difficulty buttons
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            difficulty = btn.dataset.difficulty;
            switch(difficulty) {
                case 'easy':
                    gridSize = 6;
                    break;
                case 'medium':
                    gridSize = 8;
                    break;
                case 'hard':
                    gridSize = 10;
                    break;
            }
            
            cellSize = 600 / gridSize;
            currentLevel = 1;
            levelEl.textContent = currentLevel;
            startNewGame();
        });
    });
    
    // Initialize
    startNewGame();
});
