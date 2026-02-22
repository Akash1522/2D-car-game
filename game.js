const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const playerImg = new Image();
playerImg.src = "assets/player.png";

const enemyImg1 = new Image();
enemyImg1.src = "assets/enemy.png";

const enemyImg2 = new Image();
enemyImg2.src = "assets/enemy1.png";

const enemyImg3 = new Image();
enemyImg3.src = "assets/enemy2.png";

const enemyImg4 = new Image();
enemyImg4.src = "assets/enemy3.png";

const enemyImages = [enemyImg1, enemyImg2, enemyImg3, enemyImg4];

const roadImg = new Image();
roadImg.src = "assets/road.png";

const music = document.getElementById("bgMusic");
const crashSfx = document.getElementById("crashSfx");
const nitroSfx = document.getElementById("nitroSfx");

let roadY = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore") || "0", 10);
let baseSpeed = 3; // base obstacle speed

let state = {
    running: false,
    paused: false,
    isNitro: false,
    animationId: null,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 1500,
    elapsed: 0
};

// Lane configuration - must be before car object
const LANE_COUNT = 4;
const LANE_WIDTH = canvas.width / LANE_COUNT;
const CAR_MARGIN = 10;
const CAR_WIDTH = LANE_WIDTH - (CAR_MARGIN * 2);

let car = {
    x: 165,
    y: 460,
    width: CAR_WIDTH,
    height: 130,
    maxSpeed: 500
};

let obstacles = [];

document.getElementById("highScore").innerText = "High Score: " + highScore;

function getCarX(lane) {
    return CAR_MARGIN + (lane * LANE_WIDTH);
}

function drawRoad(delta) {
    // delta can be used for smooth parallax
    const scroll = (baseSpeed + (state.isNitro ? 6 : 0)) * (delta / 16);
    roadY += scroll;
    if (roadY >= canvas.height) roadY = 0;

    if (roadImg.complete) {
        ctx.drawImage(roadImg, 0, roadY - canvas.height, canvas.width, canvas.height);
        ctx.drawImage(roadImg, 0, roadY, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawCar() {
    if (playerImg.complete) {
        ctx.drawImage(playerImg, car.x, car.y, car.width, car.height);
    } else {
        ctx.fillStyle = "blue";
        ctx.fillRect(car.x, car.y, car.width, car.height);
    }
}

function drawObstacles() {
    obstacles.forEach(ob => {
        const img = enemyImages[ob.imageIndex];
        if (img && img.complete) ctx.drawImage(img, ob.x, ob.y, ob.w, ob.h);
        else {
            ctx.fillStyle = "maroon";
            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        }
    });
}

function createObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = getCarX(lane);
    const w = CAR_WIDTH;
    const h = 130;
    const imageIndex = Math.floor(Math.random() * enemyImages.length);
    obstacles.push({ x: x, y: -h - 20, w, h, speed: baseSpeed + Math.random() * 2 + (state.elapsed / 15000), imageIndex, lane: lane });
}

function updateObstacles(delta) {
    const speedBoost = state.isNitro ? 6 : 0;
    obstacles.forEach(ob => {
        ob.y += (ob.speed + speedBoost) * (delta / 16);
    });
    obstacles = obstacles.filter(ob => ob.y < canvas.height + 100);
}

function checkCollision() {
    const hitboxScale = 0.7; // 70% of actual size - collision only when cars really touch
    const carHitX = car.x + (car.width * (1 - hitboxScale) / 2);
    const carHitY = car.y + (car.height * (1 - hitboxScale) / 2);
    const carHitW = car.width * hitboxScale;
    const carHitH = car.height * hitboxScale;
    
    for (let ob of obstacles) {
        const obHitX = ob.x + (ob.w * (1 - hitboxScale) / 2);
        const obHitY = ob.y + (ob.h * (1 - hitboxScale) / 2);
        const obHitW = ob.w * hitboxScale;
        const obHitH = ob.h * hitboxScale;
        
        if (
            carHitX < obHitX + obHitW &&
            carHitX + carHitW > obHitX &&
            carHitY < obHitY + obHitH &&
            carHitY + carHitH > obHitY
        ) {
            return true;
        }
    }
    return false;
}

function showGameOver() {
    state.running = false;
    if (state.animationId) cancelAnimationFrame(state.animationId);
    music.pause();
    music.currentTime = 0;
    crashSfx.play().catch(()=>{});

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
    }

    document.getElementById("finalScore").innerText = `Game Over — Score: ${score}`;
    document.getElementById("highScore").innerText = "High Score: " + highScore;
    document.getElementById("gameOverOverlay").classList.remove("hidden");
}

function resetGame() {
    score = 0;
    obstacles = [];
    state.spawnTimer = 0;
    state.spawnInterval = 1500;
    state.elapsed = 0;
    baseSpeed = 3;
    roadY = 0;
    car.x = (canvas.width - car.width) / 2;
    car.y = 460;
    car.velocityX = 0;
    car.dir = 0;
    state.isNitro = false;
    state.paused = false;
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.animationId = null;
    document.getElementById("score").innerText = "Score: " + score;
}

function startGame() {
    resetGame();
    state.running = true;
    state.paused = false;
    document.getElementById("startOverlay").classList.add("hidden");
    document.getElementById("gameOverOverlay").classList.add("hidden");
    music.play().catch(()=>{});
    state.lastTime = performance.now();
    state.animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (!state.running) return;
    state.paused = !state.paused;
    if (state.paused) {
        music.pause();
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }
    } else {
        music.play().catch(()=>{});
        state.lastTime = performance.now();
        state.animationId = requestAnimationFrame(gameLoop);
    }
}

function restartGame() {
    document.getElementById("gameOverOverlay").classList.add("hidden");
    startGame();
}

function gameLoop(timestamp) {
    const delta = Math.min(40, timestamp - state.lastTime);
    state.lastTime = timestamp;

    if (!state.running || state.paused) return;

    state.elapsed += delta;
    state.spawnTimer += delta;

    // difficulty ramp
    if (state.elapsed % 8000 < delta) {
        baseSpeed += 0.4;
        state.spawnInterval = Math.max(600, state.spawnInterval - 80);
    }

    // spawn obstacles
    if (state.spawnTimer >= state.spawnInterval) {
        state.spawnTimer = 0;
        createObstacle();
    }

    // update
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad(delta);

    // Steering-based movement (instant response)
    const steeringSpeed = car.maxSpeed * (delta / 1000);
    
    if (car.dir === -1) {
        car.x -= steeringSpeed;
    } else if (car.dir === 1) {
        car.x += steeringSpeed;
    }
    
    // Keep car within road boundaries
    if (car.x < 0) {
        car.x = 0;
    }
    if (car.x > canvas.width - car.width) {
        car.x = canvas.width - car.width;
    }
    
    // Keep car within road boundaries
    if (car.x < 0) {
        car.x = 0;
        car.velocityX = 0;
    }
    if (car.x > canvas.width - car.width) {
        car.x = canvas.width - car.width;
        car.velocityX = 0;
    }

    drawCar();
    drawObstacles();
    updateObstacles(delta);

    // score based on time and speed
    score += Math.round((1 + baseSpeed / 4 + (state.isNitro ? 2 : 0)) * (delta / 16));
    document.getElementById("score").innerText = "Score: " + score;

    if (checkCollision()) {
        showGameOver();
        return;
    }

    state.animationId = requestAnimationFrame(gameLoop);
}

// Controls
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", restartGame);
document.getElementById("pauseBtn").addEventListener("click", pauseGame);

document.addEventListener("keydown", (e) => {
    if (!state.running) return;
    if (e.key === "ArrowLeft") car.dir = -1;
    if (e.key === "ArrowRight") car.dir = 1;
    if (e.key === "ArrowUp") {
        state.isNitro = true;
        nitroSfx.play().catch(()=>{});
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" && car.dir === -1) car.dir = 0;
    if (e.key === "ArrowRight" && car.dir === 1) car.dir = 0;
    if (e.key === "ArrowUp") state.isNitro = false;
});

// Mobile buttons: support hold for continuous movement
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const nitroBtn = document.getElementById("nitroBtn");

function addHoldListeners(el, onStart, onEnd) {
    el.addEventListener("touchstart", (e) => { e.preventDefault(); onStart(); });
    el.addEventListener("touchend", (e) => { e.preventDefault(); onEnd(); });
    el.addEventListener("mousedown", (e) => { e.preventDefault(); onStart(); });
    el.addEventListener("mouseup", (e) => { e.preventDefault(); onEnd(); });
    el.addEventListener("mouseleave", (e) => { e.preventDefault(); onEnd(); });
}

addHoldListeners(leftBtn, () => car.dir = -1, () => { if (car.dir === -1) car.dir = 0; });
addHoldListeners(rightBtn, () => car.dir = 1, () => { if (car.dir === 1) car.dir = 0; });
addHoldListeners(nitroBtn, () => { state.isNitro = true; nitroSfx.play().catch(()=>{}); }, () => state.isNitro = false);

// Start overlay shows until user clicks start
document.getElementById("startOverlay").classList.remove("hidden");
