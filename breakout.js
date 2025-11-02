document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('breakout');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('breakout-score');

  // Game state
  let paddle = {x: canvas.width/2 - 50, y: canvas.height - 30, w: 100, h: 12, speed: 8};
  let ball = {x: canvas.width/2, y: canvas.height - 50, dx: 3, dy: -3, r: 6};
  let bricks = [];
  let score = 0;
  let lives = 3;
  let running = false;
  let gameOver = false;
  let won = false;
  let loopId = null;

  // Brick setup
  const brickRows = 5;
  const brickCols = 8;
  const brickW = 55;
  const brickH = 20;
  const brickPadding = 5;
  const brickOffsetTop = 40;
  const brickOffsetLeft = 10;

  function initBricks(){
    bricks = [];
    for(let r=0; r<brickRows; r++){
      for(let c=0; c<brickCols; c++){
        bricks.push({
          x: c * (brickW + brickPadding) + brickOffsetLeft,
          y: r * (brickH + brickPadding) + brickOffsetTop,
          status: 1,
          color: ['#ef4444','#f59e0b','#10b981','#06b6d4','#8b5cf6'][r]
        });
      }
    }
  }

  function reset(){
    paddle.x = canvas.width/2 - 50;
    ball.x = canvas.width/2;
    ball.y = canvas.height - 50;
    ball.dx = 3;
    ball.dy = -3;
    score = 0;
    lives = 3;
    gameOver = false;
    won = false;
    initBricks();
    updateStatus();
    draw();
  }

  function updateStatus(){
    statusEl.textContent = `Score: ${score} | Lives: ${lives}`;
  }

  function draw(){
    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Bricks
    bricks.forEach(b=>{
      if(b.status === 1){
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, brickW, brickH);
      }
    });

    // Paddle
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    // Ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();

    // Instructions or game over
    if(!running && !gameOver && !won){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press SPACE or tap to start', canvas.width/2, canvas.height/2);
    }

    if(gameOver){
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press SPACE or tap to restart', canvas.width/2, canvas.height/2 + 20);
    }

    if(won){
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('You Win!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press SPACE or tap to restart', canvas.width/2, canvas.height/2 + 20);
    }
  }

  function update(){
    if(!running || gameOver || won) return;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if(ball.x + ball.r > canvas.width || ball.x - ball.r < 0){
      ball.dx = -ball.dx;
    }
    if(ball.y - ball.r < 0){
      ball.dy = -ball.dy;
    }

    // Bottom - lose life
    if(ball.y + ball.r > canvas.height){
      lives--;
      updateStatus();
      if(lives <= 0){
        running = false;
        gameOver = true;
      } else {
        ball.x = canvas.width/2;
        ball.y = canvas.height - 50;
        ball.dx = 3;
        ball.dy = -3;
        running = false;
      }
    }

    // Paddle collision
    if(ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
       ball.x >= paddle.x && ball.x <= paddle.x + paddle.w){
      ball.dy = -Math.abs(ball.dy);
      // Add spin based on where it hit paddle
      let hitPos = (ball.x - paddle.x) / paddle.w; // 0 to 1
      ball.dx = (hitPos - 0.5) * 6;
    }

    // Brick collision
    bricks.forEach(b=>{
      if(b.status === 1){
        if(ball.x > b.x && ball.x < b.x + brickW &&
           ball.y > b.y && ball.y < b.y + brickH){
          ball.dy = -ball.dy;
          b.status = 0;
          score += 10;
          updateStatus();
        }
      }
    });

    // Check win
    if(bricks.every(b => b.status === 0)){
      running = false;
      won = true;
    }

    draw();
  }

  function start(){
    if(gameOver || won){
      reset();
    }
    running = true;
  }

  function gameLoop(){
    update();
    loopId = requestAnimationFrame(gameLoop);
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

  // Move paddle with keys
  function handleKeyboardPaddle(){
    if(keys['ArrowLeft'] || keys['a'] || keys['A']){
      paddle.x -= paddle.speed;
      if(paddle.x < 0) paddle.x = 0;
    }
    if(keys['ArrowRight'] || keys['d'] || keys['D']){
      paddle.x += paddle.speed;
      if(paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
    }
  }

  // Mouse controls
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddle.x = mouseX - paddle.w/2;
    if(paddle.x < 0) paddle.x = 0;
    if(paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  });

  canvas.addEventListener('click', ()=>{
    if(!running){
      start();
    }
  });

  // Touch controls
  canvas.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    paddle.x = touchX - paddle.w/2;
    if(paddle.x < 0) paddle.x = 0;
    if(paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  }, {passive: false});

  canvas.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    if(!running){
      start();
    }
  }, {passive: false});

  // Main loop with keyboard handling
  function mainLoop(){
    handleKeyboardPaddle();
    update();
    requestAnimationFrame(mainLoop);
  }

  reset();
  mainLoop();
});
