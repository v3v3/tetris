const canvas = document.getElementById("gameBoard");
const ctx = canvas.getContext("2d");
const scale = 20;
const arenaWidth = 10;
const arenaHeight = 20;

let lastTime = 0;
let dropCounter = 0;
let dropInterval = 500; // Time (in milliseconds) for a piece to drop one row

// Level system variables
let level = 1;
const levelInterval = 1; // Number of lines cleared to increase the level

const arena = createMatrix(arenaWidth, arenaHeight);

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  pieceType: null,
  rotation: 0
};

// https://coolors.co/3addbe-f2a900-0052ff-dfc66d-ec1c24-009393-6941c6
const colors = [
  null,
  "#3addbe", // I - Kaspa cyan
  "#f2a900", // L - Bitcoin orange
  "#0052ff", // J - Coinbase blue
  "#dfc66d", // O - Dogecoin yellow
  "#ec1c24", // Z - Tesla red
  "#009393", // S - Tether green
  "#6941c6"  // T - Ordinals Wallet purple
];

// Heuristic Weights for AI functions
const HEIGHT_WEIGHT = -1;
const LINES_WEIGHT = 1;
const HOLES_WEIGHT = -1;



// User input event handling
document.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") {
    playerMove(-1);
  } else if (event.key === "ArrowRight") {
    playerMove(1);
  } else if (event.key === "ArrowDown") {
    playerDrop();
  } else if (event.key === "ArrowUp") {
    playerRotate(1);
  }
});

window.addEventListener("resize", resizeCanvas, false);

// Set canvas size
resizeCanvas();

// Initialize the player with a new piece
resetPlayer();

// Start the game loop
update();

function resizeCanvas(){
  const aspectRatio = arenaWidth / arenaHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let newCanvasWidth;
  let newCanvasHeight;

  if (windowWidth / windowHeight > aspectRatio) {
    newCanvasHeight = windowHeight * 0.8;
    newCanvasWidth = newCanvasHeight * aspectRatio;
  } else {
    newCanvasWidth = windowWidth * 0.8;
    newCanvasHeight = newCanvasWidth / aspectRatio;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the canvas transformation matrix
  canvas.width = newCanvasWidth;
  canvas.height = newCanvasHeight;
  ctx.scale(newCanvasWidth / arenaWidth, newCanvasHeight / arenaHeight);
}

function resetPlayer() {
  const pieces = "ILJOTSZ";
  player.pieceType = pieces[Math.floor(Math.random() * pieces.length)];
  player.matrix = createPiece(player.pieceType);
  player.pos.y = 0;
  player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
  player.rotation = Math.floor(Math.random() * 4);
  playerRotate(player.rotation)

  // If a new piece cannot be placed, the game is over
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0)); // Clear the arena for a new game
  }
}

// Generate matrix for Tetris pieces
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

// Create a new tetromino
function createPiece(type) {
  if (type === "I") {
    return [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
  } else if (type === "L") {
    return [
      [0, 2, 0],
      [0, 2, 0],
      [0, 2, 2]
    ];
  } else if (type === "J") {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [3, 3, 0]
    ];
  } else if (type === "O") {
    return [
      [4, 4],
      [4, 4]
    ];
  } else if (type === "Z") {
    return [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0]
    ];
  } else if (type === "S") {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0]
    ];
  } else if (type === "T") {
    return [
      [0, 7, 0],
      [7, 7, 7],
      [0, 0, 0]
    ];
  }
}

// Draw matrix on canvas
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 0.05;
        ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}


// Detect collisions
function collide(arena, player) {
  const [matrix, offset] = [player.matrix, player.pos];
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < matrix[y].length; ++x) {
      if (
        matrix[y][x] !== 0 &&
        (arena[y + offset.y] && arena[y + offset.y][x + offset.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

// Merge player matrix with arena matrix
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// Line clearing
function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    rowCount++;
  }
}

// Increase game speed based on number of lines cleared
function increaseSpeed(linesCleared) {
  if (linesCleared >= levelInterval) {
    level++;
    dropInterval = 1000 / (level * 0.5);
  }
}

// Player movement functions
// Drop
function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    resetPlayer();
    increaseSpeed(player.rowsCleared); // Increase game speed based on number of lines cleared
  }
  dropCounter = 0;
}

// Horitzonal movement
function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

// Rotation
function playerRotate(dir) {
  const currentRotation = player.rotation;
  const nextRotation = (currentRotation + dir + 4) % 4;

  rotate(player.matrix, dir);
  player.rotation = nextRotation;

  // If a collision is detected, rotate the matrix back to the current rotation
  if (collide(arena, player)) {
    rotate(player.matrix, -dir);
    player.rotation = currentRotation;
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

// AI implementation
// AI Function
function findBestMove(arena, tetrimino) {
  let bestScore = -Infinity;
  let bestMove = { rotation: 0, position: 0 };

  for (let rotation = 0; rotation < 4; rotation++) {
    const rotatedTetrimino = rotate(cloneMatrix(tetrimino), rotation);

    for (let position = -rotatedTetrimino[0].length; position < arena[0].length; position++) {
      const arenaCopy = cloneMatrix(arena);
      const tetriminoPosition = { x: position, y: 0 };

      if (isValidPlacement(arenaCopy, rotatedTetrimino, tetriminoPosition)) {
        placeTetrimino(arenaCopy, rotatedTetrimino, tetriminoPosition);
        const score = evaluateGameState(arenaCopy);

        if (score > bestScore) {
          bestScore = score;
          bestMove.rotation = rotation;
          bestMove.position = position;
        }
      }
    }
  }

  return bestMove;
}

// Helper Functions
function isValidPlacement(arena, tetrimino, position) {
  // Add your collision check logic here
}

function placeTetrimino(arena, tetrimino, position) {
  // Add your tetrimino placement logic here
}

function cloneMatrix(matrix) {
  return matrix.map(row => row.slice());
}

function getColumnHeights(arena) {
  const heights = new Array(arena[0].length).fill(0);

  for (let x = 0; x < arena[0].length; x++) {
    for (let y = 0; y < arena.length; y++) {
      if (arena[y][x] !== 0) {
        heights[x] = arena.length - y;
        break;
      }
    }
  }

  return heights;
}

function countCompletedLines(arena) {
  let count = 0;

  outer: for (let y = 0; y < arena.length; y++) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    count++;
  }

  return count;
}

function countHoles(arena) {
  let count = 0;

  for (let x = 0; x < arena[0].length; x++) {
    let foundBlock = false;
    for (let y = 0; y < arena.length; y++) {
      if (arena[y][x] !== 0) {
        foundBlock = true;
      } else if (foundBlock && arena[y][x] === 0) {
        count++;
      }
    }
  }

  return count;
}

// Animate and draw functions
function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}
