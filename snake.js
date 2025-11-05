document.addEventListener('DOMContentLoaded', ()=>{
  console.log('Snake game loaded');
  const canvas = document.getElementById('snake');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('snake-score');
  console.log('Canvas:', canvas, 'Context:', ctx, 'Score element:', scoreEl);
  const size = 20;
  const cols = canvas.width / size;
  const rows = canvas.height / size;
  let snake, dir, food, running, loopId, gameStarted;
  let isMultiplayer = false;
  let snake2, dir2, p1Score, p2Score;

  function reset(){
    console.log('Reset called');
    if(isMultiplayer) {
      snake = [{x:5, y:Math.floor(rows/2)}];
      snake2 = [{x:cols-6, y:Math.floor(rows/2)}];
      dir = {x:1,y:0};
      dir2 = {x:-1,y:0};
      p1Score = 0;
      p2Score = 0;
    } else {
      snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
      dir = {x:1,y:0};
    }
    placeFood();
    running = false;
    gameStarted = false;
    updateScore();
    draw();
  }

  function placeFood(){
    food = {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows)};
  }

  function draw(){
    console.log('Draw called, gameStarted:', gameStarted);
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // food
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(food.x*size, food.y*size, size, size);
    // snake 1
    ctx.fillStyle = '#10b981';
    snake.forEach(s=>ctx.fillRect(s.x*size, s.y*size, size-1, size-1));
    
    // snake 2 in multiplayer
    if(isMultiplayer) {
      ctx.fillStyle = '#3b82f6';
      snake2.forEach(s=>ctx.fillRect(s.x*size, s.y*size, size-1, size-1));
    }
    
    // Show instruction if not started
    if(!gameStarted){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press arrow/WASD or swipe to start', canvas.width/2, canvas.height/2);
      console.log('Drawing start text');
    }
  }

  function step(){
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    
    // Check wall collision
    if(head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows){
      if(isMultiplayer) {
        stop();
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Player 2 Wins!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      } else {
        stop();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over! Hit a wall', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      }
    }
    
    // collision with self
    if(snake.some(s=>s.x===head.x && s.y===head.y)){
      if(isMultiplayer) {
        stop();
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Player 2 Wins!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      } else {
        stop();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over! Hit yourself', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      }
    }
    
    // Collision with other snake in multiplayer
    if(isMultiplayer && snake2.some(s=>s.x===head.x && s.y===head.y)){
      stop();
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Player 2 Wins!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
      return;
    }
    
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
      if(isMultiplayer) p1Score++;
      placeFood();
    } else {
      snake.pop();
    }
    
    // Move snake 2 in multiplayer
    if(isMultiplayer) {
      const head2 = {x: snake2[0].x + dir2.x, y: snake2[0].y + dir2.y};
      
      // Check collisions for snake 2
      if(head2.x < 0 || head2.x >= cols || head2.y < 0 || head2.y >= rows ||
         snake2.some(s=>s.x===head2.x && s.y===head2.y) ||
         snake.some(s=>s.x===head2.x && s.y===head2.y)){
        stop();
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Player 1 Wins!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      }
      
      snake2.unshift(head2);
      if(head2.x===food.x && head2.y===food.y){
        p2Score++;
        placeFood();
      } else {
        snake2.pop();
      }
    }
    
    draw();
    updateScore();
  }

  function updateScore(){
    if(isMultiplayer) {
      scoreEl.textContent = `P1 (Green): ${p1Score} | P2 (Blue): ${p2Score}`;
    } else {
      scoreEl.textContent = `Score: ${snake.length-1}`;
    }
  }

  function start(){
    if(running) return;
    running = true;
    gameStarted = true;
    loopId = setInterval(step, 120);
  }
  
  function stop(){
    running = false;
    clearInterval(loopId);
  }

  document.addEventListener('keydown', (e)=>{
    // Player 1: Arrow keys
    if(e.key === 'ArrowUp' && dir.y!==1) {
      dir = {x:0,y:-1};
      if(!running) start();
    }
    if(e.key === 'ArrowDown' && dir.y!==-1) {
      dir = {x:0,y:1};
      if(!running) start();
    }
    if(e.key === 'ArrowLeft' && dir.x!==1) {
      dir = {x:-1,y:0};
      if(!running) start();
    }
    if(e.key === 'ArrowRight' && dir.x!==-1) {
      dir = {x:1,y:0};
      if(!running) start();
    }
    
    // Player 2 in multiplayer: WASD keys
    if(isMultiplayer) {
      if((e.key === 'w' || e.key === 'W') && dir2.y!==1) {
        dir2 = {x:0,y:-1};
        if(!running) start();
      }
      if((e.key === 's' || e.key === 'S') && dir2.y!==-1) {
        dir2 = {x:0,y:1};
        if(!running) start();
      }
      if((e.key === 'a' || e.key === 'A') && dir2.x!==1) {
        dir2 = {x:-1,y:0};
        if(!running) start();
      }
      if((e.key === 'd' || e.key === 'D') && dir2.x!==-1) {
        dir2 = {x:1,y:0};
        if(!running) start();
      }
    } else {
      // Single player: WASD also controls snake
      if((e.key === 'w' || e.key === 'W') && dir.y!==1) {
        dir = {x:0,y:-1};
        if(!running) start();
      }
      if((e.key === 's' || e.key === 'S') && dir.y!==-1) {
        dir = {x:0,y:1};
        if(!running) start();
      }
      if((e.key === 'a' || e.key === 'A') && dir.x!==1) {
        dir = {x:-1,y:0};
        if(!running) start();
      }
      if((e.key === 'd' || e.key === 'D') && dir.x!==-1) {
        dir = {x:1,y:0};
        if(!running) start();
      }
    }
    
    // Any key to restart after game over
    if(!running && gameStarted){
      reset();
    }
  });

  // Touch/swipe controls for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, {passive: false});

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, {passive: false});

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;

    // If game is over, restart on any touch
    if(!running && gameStarted){
      reset();
      return;
    }

    // Determine swipe direction
    if(Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if(Math.abs(deltaX) > minSwipeDistance) {
        if(deltaX > 0 && dir.x !== -1) {
          // Swipe right
          dir = {x:1, y:0};
          if(!running) start();
        } else if(deltaX < 0 && dir.x !== 1) {
          // Swipe left
          dir = {x:-1, y:0};
          if(!running) start();
        }
      }
    } else {
      // Vertical swipe
      if(Math.abs(deltaY) > minSwipeDistance) {
        if(deltaY > 0 && dir.y !== -1) {
          // Swipe down
          dir = {x:0, y:1};
          if(!running) start();
        } else if(deltaY < 0 && dir.y !== 1) {
          // Swipe up
          dir = {x:0, y:-1};
          if(!running) start();
        }
      }
    }
  }

  reset();
});
