document.addEventListener('DOMContentLoaded', () => {
  const cells = Array.from(document.querySelectorAll('.ttt-cell'));
  const status = document.getElementById('ttt-status');
  const reset = document.getElementById('reset');
  const scoreX = document.getElementById('score-x');
  const scoreO = document.getElementById('score-o');
  const scoreDraws = document.getElementById('score-draws');
  
  let board = Array(9).fill(null);
  let turn = 'X';
  let scores = {X: 0, O: 0, draws: 0};
  let mode = 'single'; // 'single' or 'multi'
  let isAiThinking = false;
  
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function render(){
    cells.forEach((c,i)=>{c.textContent = board[i] || ''});
  }

  function findWinningLine(){
    for(const w of wins){
      const [a,b,c] = w;
      if(board[a] && board[a] === board[b] && board[a] === board[c]) return w;
    }
    return null;
  }

  function checkWinResult(){
    const w = findWinningLine();
    if(w) return board[w[0]]; // 'X' or 'O'
    if(board.every(Boolean)) return 'draw';
    return null;
  }

  // AI using minimax algorithm
  function minimax(testBoard, player) {
    const avail = testBoard.map((v,i)=>v===null?i:null).filter(v=>v!==null);
    
    // Check terminal states
    const winner = checkWinnerOnBoard(testBoard);
    if (winner === 'O') return {score: 10};
    if (winner === 'X') return {score: -10};
    if (avail.length === 0) return {score: 0};
    
    const moves = [];
    for (const i of avail) {
      const move = {index: i};
      testBoard[i] = player;
      
      if (player === 'O') {
        const result = minimax(testBoard, 'X');
        move.score = result.score;
      } else {
        const result = minimax(testBoard, 'O');
        move.score = result.score;
      }
      
      testBoard[i] = null;
      moves.push(move);
    }
    
    let bestMove;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (const move of moves) {
        if (move.score > bestScore) {
          bestScore = move.score;
          bestMove = move;
        }
      }
    } else {
      let bestScore = Infinity;
      for (const move of moves) {
        if (move.score < bestScore) {
          bestScore = move.score;
          bestMove = move;
        }
      }
    }
    
    return bestMove;
  }

  function checkWinnerOnBoard(testBoard) {
    for(const w of wins){
      const [a,b,c] = w;
      if(testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
        return testBoard[a];
      }
    }
    if(testBoard.every(Boolean)) return 'draw';
    return null;
  }

  function aiMove() {
    if (isAiThinking) return;
    isAiThinking = true;
    
    // Add slight delay for better UX
    setTimeout(() => {
      const bestMove = minimax([...board], 'O');
      if (bestMove && bestMove.index !== undefined) {
        board[bestMove.index] = 'O';
        turn = 'X';
        render();
        checkGameEnd();
      }
      isAiThinking = false;
    }, 300);
  }

  function checkGameEnd() {
    const winningLine = findWinningLine();
    const result = checkWinResult();
    
    if(winningLine){
      cells.forEach(c=>c.classList.remove('win'));
      winningLine.forEach(i=>cells[i].classList.add('win'));
    }
    
    if(result){
      if(result === 'draw') {
        status.textContent = 'Draw!';
        scores.draws++;
        scoreDraws.textContent = scores.draws;
      } else {
        status.textContent = `${result} wins!`;
        scores[result]++;
        if(result === 'X') scoreX.textContent = scores.X;
        else scoreO.textContent = scores.O;
      }
      setTimeout(resetBoard, 1500);
    } else {
      status.textContent = `Turn: ${turn}`;
      
      // If single player mode and it's O's turn (AI), make AI move
      if (mode === 'single' && turn === 'O' && !result) {
        aiMove();
      }
    }
  }

  function resetBoard(){
    board = Array(9).fill(null);
    turn = 'X';
    isAiThinking = false;
    cells.forEach(c=>c.classList.remove('win'));
    render();
    status.textContent = `Turn: ${turn}`;
  }

  function cellClick(e){
    if (isAiThinking) return;
    
    const i = Number(e.currentTarget.dataset.pos);
    if(board[i] || checkWinResult()) return;
    
    // In single player mode, only allow X (human) to play
    if (mode === 'single' && turn === 'O') return;
    
    board[i] = turn;
    turn = turn === 'X' ? 'O' : 'X';
    render();
    checkGameEnd();
  }

  function setMode(newMode) {
    mode = newMode;
    resetBoard();
    scores = {X: 0, O: 0, draws: 0};
    scoreX.textContent = '0';
    scoreO.textContent = '0';
    scoreDraws.textContent = '0';
  }

  cells.forEach(c=>c.addEventListener('click', cellClick));
  reset.addEventListener('click', resetBoard);
  
  // Start in single player mode
  setMode('single');
  render();
});
