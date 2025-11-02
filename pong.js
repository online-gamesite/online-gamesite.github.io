document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('pong');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('pong-score');

  // Game objects
  const paddleW = 12;
  const paddleH = 80;
  const ballSize = 8;
  
  let player = {x: 20, y: canvas.height/2 - paddleH/2, w: paddleW, h: paddleH, speed: 6, dy: 0};
  let ai = {x: canvas.width - 20 - paddleW, y: canvas.height/2 - paddleH/2, w: paddleW, h: paddleH, speed: 4};
  let ball = {x: canvas.width/2, y: canvas.height/2, dx: 4, dy: 3, size: ballSize};
  
  let playerScore = 0;
  let aiScore = 0;
  let running = false;
  let gameOver = false;
  let winner = '';

  function reset(){
    ball.x = canvas.width/2;
    ball.y = canvas.height/2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    ball.dy = (Math.random() - 0.5) * 6;
    player.y = canvas.height/2 - paddleH/2;
    ai.y = canvas.height/2 - paddleH/2;
  }

  function resetGame(){
    playerScore = 0;
    aiScore = 0;
    gameOver = false;
    winner = '';
    reset();
    updateScore();
  }

  function updateScore(){
    statusEl.textContent = `You: ${playerScore} | AI: ${aiScore}`;
  }

  function draw(){
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player paddle (left)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // AI paddle (right)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

    // Ball
    ctx.fillStyle = '#fff';
    ctx.fillRect(ball.x - ball.size/2, ball.y - ball.size/2, ball.size, ball.size);

    // Instructions
    if(!running && !gameOver){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press SPACE or tap to start', canvas.width/2, canvas.height/2 + 60);
    }

    // Game over
    if(gameOver){
      ctx.fillStyle = winner === 'player' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(winner === 'player' ? 'You Win!' : 'AI Wins!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press SPACE or tap to play again', canvas.width/2, canvas.height/2 + 20);
    }
  }

  function update(){
    if(!running || gameOver) return;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom
    if(ball.y - ball.size/2 <= 0 || ball.y + ball.size/2 >= canvas.height){
      ball.dy = -ball.dy;
    }

    // Ball collision with player paddle
    if(ball.x - ball.size/2 <= player.x + player.w &&
       ball.x + ball.size/2 >= player.x &&
       ball.y >= player.y &&
       ball.y <= player.y + player.h){
      ball.dx = Math.abs(ball.dx);
      // Add spin based on where it hit
      let relativeHit = (ball.y - (player.y + player.h/2)) / (player.h/2);
      ball.dy = relativeHit * 5;
    }

    // Ball collision with AI paddle
    if(ball.x + ball.size/2 >= ai.x &&
       ball.x - ball.size/2 <= ai.x + ai.w &&
       ball.y >= ai.y &&
       ball.y <= ai.y + ai.h){
      ball.dx = -Math.abs(ball.dx);
      let relativeHit = (ball.y - (ai.y + ai.h/2)) / (ai.h/2);
      ball.dy = relativeHit * 5;
    }

    // Score points
    if(ball.x < 0){
      aiScore++;
      updateScore();
      if(aiScore >= 5){
        gameOver = true;
        winner = 'ai';
        running = false;
      } else {
        reset();
        running = false;
      }
    }
    if(ball.x > canvas.width){
      playerScore++;
      updateScore();
      if(playerScore >= 5){
        gameOver = true;
        winner = 'player';
        running = false;
      } else {
        reset();
        running = false;
      }
    }

    // Move player paddle
    player.y += player.dy;
    if(player.y < 0) player.y = 0;
    if(player.y + player.h > canvas.height) player.y = canvas.height - player.h;

    // AI follows ball with slight delay
    const aiCenter = ai.y + ai.h/2;
    if(ball.x > canvas.width/2){ // Only track when ball is on AI side
      if(ball.y < aiCenter - 10){
        ai.y -= ai.speed;
      } else if(ball.y > aiCenter + 10){
        ai.y += ai.speed;
      }
    }
    if(ai.y < 0) ai.y = 0;
    if(ai.y + ai.h > canvas.height) ai.y = canvas.height - ai.h;
  }

  function start(){
    if(gameOver){
      resetGame();
    }
    running = true;
  }

  // Keyboard controls
  let keys = {};
  document.addEventListener('keydown', (e)=>{
    keys[e.key] = true;
    if(e.key === ' '){
      e.preventDefault();
      if(!running){
        start();
      }
    }
  });
  document.addEventListener('keyup', (e)=>{
    keys[e.key] = false;
  });

  function handleKeyboard(){
    player.dy = 0;
    if(keys['ArrowUp'] || keys['w'] || keys['W']){
      player.dy = -player.speed;
    }
    if(keys['ArrowDown'] || keys['s'] || keys['S']){
      player.dy = player.speed;
    }
  }

  // Touch controls
  let touchY = null;
  canvas.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    if(!running){
      start();
    }
    touchY = e.touches[0].clientY;
  }, {passive: false});

  canvas.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    if(e.touches.length > 0){
      const rect = canvas.getBoundingClientRect();
      const newTouchY = e.touches[0].clientY - rect.top;
      player.y = newTouchY - player.h/2;
      if(player.y < 0) player.y = 0;
      if(player.y + player.h > canvas.height) player.y = canvas.height - player.h;
    }
  }, {passive: false});

  canvas.addEventListener('click', ()=>{
    if(!running){
      start();
    }
  });

  // Main game loop
  function gameLoop(){
    handleKeyboard();
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  resetGame();
  draw();
  gameLoop();
});
