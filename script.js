// ===== 游戏配置 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 8;
const TILE_SIZE = 60;
const TILE_PADDING = 4;
const ANIMATION_SPEED = 0.25;

// 使用 Emoji 图标替代颜色
const TILE_EMOJIS = ['🔴', '🔵', '🟢', '', '🟡', '⭐', '💎'];
const TILE_COLORS = ['#ff4757', '#3742fa', '#2ed573', '#a55eea', '#ffa502', '#ffd700', '#00d9ff'];

// 特殊方块类型
const SPECIAL_TYPES = {
    NONE: null,
    LINE_HORIZONTAL: 'line_horizontal',  // 4 个横向 - 消除整行
    LINE_VERTICAL: 'line_vertical',        // 4 个纵向 - 消除整列
    BOMB: 'bomb',                          // 5 个/L 形 - 3x3 范围爆炸
    RAINBOW: 'rainbow'                     // 5 个直线 - 消除同色所有
};

// 强制设置画布尺寸，避免渲染延迟
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = BOARD_SIZE * TILE_SIZE * dpr;
    canvas.height = BOARD_SIZE * TILE_SIZE * dpr;
    canvas.style.width = (BOARD_SIZE * TILE_SIZE) + 'px';
    canvas.style.height = (BOARD_SIZE * TILE_SIZE) + 'px';
    ctx.scale(dpr, dpr);
}

// ===== 音效系统 (使用 Web Audio API) =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SOUND_EFFECTS = {
    SELECT: 'select',
    SWAP: 'swap',
    MATCH: 'match',
    SPECIAL: 'special',
    BOMB: 'bomb',
    RAINBOW: 'rainbow',
    INVALID: 'invalid',
    LEVEL_UP: 'levelup'
};

// 合成音效函数
function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch(type) {
        case SOUND_EFFECTS.SELECT:
            oscillator.frequency.setValueAtTime(440, now);
            oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
            
        case SOUND_EFFECTS.SWAP:
            oscillator.frequency.setValueAtTime(330, now);
            oscillator.frequency.linearRampToValueAtTime(550, now + 0.15);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
            break;
            
        case SOUND_EFFECTS.MATCH:
            // 和弦效果
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.2, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.3);
            });
            return;
            
        case SOUND_EFFECTS.SPECIAL:
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, now);
            oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
            
        case SOUND_EFFECTS.BOMB:
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gainNode.gain.setValueAtTime(0.4, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
            
        case SOUND_EFFECTS.RAINBOW:
            // 彩虹音阶
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                gain.gain.setValueAtTime(0.25, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.4);
            });
            return;
            
        case SOUND_EFFECTS.INVALID:
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.linearRampToValueAtTime(150, now + 0.2);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
            
        case SOUND_EFFECTS.LEVEL_UP:
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                gain.gain.setValueAtTime(0.3, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.5);
            });
            return;
    }
}

// 音量控制
let masterVolume = 0.5;
function setVolume(volume) {
    masterVolume = Math.max(0, Math.min(1, volume));
    if (audioCtx.destination) {
        audioCtx.destination.gain = masterVolume;
    }
}


// ===== 游戏状态 =====
let board = [];
let selectedTile = null;
let score = 0;
let bestScore = parseInt(localStorage.getItem('match3BestScore')) || 0;
let gameStarted = false;
let isAnimating = false;
let animations = [];

// 连击系统
let comboCount = 0;
let comboMultiplier = 1;
let comboTimeout = null;

// 计时器
let gameTime = 120; // 2 分钟
let timerInterval = null;
let timerDisplay = document.getElementById('timerDisplay');
let timerBox = document.getElementById('timerBox');
let comboBox = document.getElementById('comboBox');
let comboCountDisplay = document.getElementById('comboCount');
let comboMultiplierDisplay = document.getElementById('comboMultiplier');

// DOM 元素
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('bestScore');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

// ===== 分数更新 =====
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
    bestScoreDisplay.textContent = bestScore;
}

function updateComboDisplay() {
    if (comboCount > 1) {
        comboBox.classList.add('visible');
        comboCountDisplay.textContent = comboCount;
        comboMultiplierDisplay.textContent = `x${comboMultiplier}`;
    } else {
        comboBox.classList.remove('visible');
    }
}

function addCombo() {
    comboCount++;
    comboMultiplier = 1 + Math.floor(comboCount / 3) * 0.5;
    updateComboDisplay();
    
    // 清除之前的超时
    if (comboTimeout) clearTimeout(comboTimeout);
    
    // 2 秒后重置连击
    comboTimeout = setTimeout(() => {
        comboCount = 0;
        comboMultiplier = 1;
        updateComboDisplay();
    }, 2000);
}

function resetCombo() {
    comboCount = 0;
    comboMultiplier = 1;
    updateComboDisplay();
    if (comboTimeout) clearTimeout(comboTimeout);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(gameTime);
        
        // 最后 30 秒显示警告
        if (gameTime <= 30) {
            timerBox.classList.add('warning');
        } else {
            timerBox.classList.remove('warning');
        }
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    if (gameMode === 'timed') {
        gameTime = 120; // 2 分钟
        timerBox.style.display = 'block';
        updateTimerDisplay();
        
        timerInterval = setInterval(() => {
            gameTime--;
            updateTimerDisplay();
            
            if (gameTime <= 0) {
                endGame();
            }
        }, 1000);
    } else {
        // 无限模式
        timerBox.style.display = 'none';
        gameTime = 0;
        updateTimerDisplay();
    }
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
}

function endGame() {
    stopTimer();
    gameStarted = false;
    startBtn.innerHTML = '<span class="btn-icon">▶️</span> 开始游戏';
    startBtn.disabled = false;
    
    if (gameMode === 'timed') {
        // 显示游戏结束提示
        createFloatingText('⏰ 时间到!', canvas.width / 2, canvas.height / 2, '#ff4757');
        playSound(SOUND_EFFECTS.LEVEL_UP);
    }
    
    drawBoard();
}

function updateBestScore() {
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('match3BestScore', bestScore);
        bestScoreDisplay.textContent = bestScore;
        // 添加最高分更新动画
        createFloatingText('🏆 新纪录!', canvas.width / 2, canvas.height / 3, '#ffd700');
    }
}

function addScore(points, x, y) {
    score += points;
    updateScoreDisplay();
    updateBestScore();
    createFloatingText(`+${points}`, x, y, '#00ff88');
}

// ===== 动画系统 =====
class TileAnimation {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.alpha = 1;
        this.scale = 1;
        this.progress = 0;
    }
}

class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1;
        this.yOffset = 0;
        this.scale = 0.8;
        this.life = 50; // 生命周期帧数
    }
    
    update() {
        this.yOffset += 2;
        this.alpha -= 0.02;
        this.scale += 0.01;
        this.life--;
    }
    
    isDead() {
        return this.alpha <= 0 || this.life <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.translate(this.x, this.y - this.yOffset);
        ctx.scale(this.scale, this.scale);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.alpha = 1;
        this.size = Math.random() * 6 + 3;
        this.life = 50; // 生命周期帧数
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // 重力
        this.alpha -= 0.02;
        this.size *= 0.95;
        this.life--;
    }
    
    isDead() {
        return this.alpha <= 0 || this.life <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let floatingTexts = [];
let particles = [];

function createFloatingText(text, x, y, color) {
    floatingTexts.push(new FloatingText(text, x, y, color));
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateAnimations() {
    // 更新浮动文字 - 使用 isDead() 统一判断
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.update();
        if (ft.isDead()) {
            floatingTexts.splice(i, 1);
        }
    }
    
    // 更新粒子 - 使用 isDead() 统一判断
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
}

// ===== 方块类 =====
class Tile {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.scale = 0;
        this.alpha = 0;
        this.isMatched = false;
        this.isSpecial = false;
        this.specialType = null;
        this.wobblePhase = Math.random() * Math.PI * 2;
    }
    
    update() {
        // 平滑移动到目标位置 - 使用更快的收敛速度
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        if (Math.abs(dx) > 0.01) this.x += dx * ANIMATION_SPEED;
        else this.x = this.targetX;
        if (Math.abs(dy) > 0.01) this.y += dy * ANIMATION_SPEED;
        else this.y = this.targetY;
        
        // 生成动画
        if (this.scale < 1) {
            this.scale += 0.15;
            if (this.scale > 1) this.scale = 1;
        }
        if (this.alpha < 1) {
            this.alpha += 0.15;
            if (this.alpha > 1) this.alpha = 1;
        }
        
        // 选中时的弹跳效果
        this.wobblePhase += 0.1;
    }
    
    drawSpecialMarker(ctx, size) {
        if (this.specialType === SPECIAL_TYPES.LINE_HORIZONTAL) {
            // 横向消除 - 左右箭头
            ctx.fillStyle = '#fff';
            ctx.font = `${size * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⬅️', -size * 0.3, 0);
            ctx.fillText('➡️', size * 0.3, 0);
        } else if (this.specialType === SPECIAL_TYPES.LINE_VERTICAL) {
            // 纵向消除 - 上下箭头
            ctx.fillStyle = '#fff';
            ctx.font = `${size * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⬆️', 0, -size * 0.3);
            ctx.fillText('⬇️', 0, size * 0.3);
        } else if (this.specialType === SPECIAL_TYPES.BOMB) {
            // 炸弹 - 闪烁效果
            const pulse = Math.sin(this.wobblePhase * 2) * 0.2 + 0.8;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
            // 火花
            ctx.fillStyle = '#ffd700';
            ctx.font = `${size * 0.4}px Arial`;
            ctx.fillText('💥', 0, 2);
        } else if (this.specialType === SPECIAL_TYPES.RAINBOW) {
            // 彩虹 - 渐变旋转效果
            const gradient = ctx.createConicGradient(this.wobblePhase, 0, 0);
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(0.14, '#ff7f00');
            gradient.addColorStop(0.28, '#ffff00');
            gradient.addColorStop(0.42, '#00ff00');
            gradient.addColorStop(0.57, '#0000ff');
            gradient.addColorStop(0.71, '#4b0082');
            gradient.addColorStop(0.85, '#9400d3');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${size * 0.35}px Arial`;
            ctx.fillText('🌈', 0, 2);
        }
    }
    
    draw(ctx, isSelected) {
        const centerX = this.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = this.y * TILE_SIZE + TILE_SIZE / 2;
        const size = (TILE_SIZE - TILE_PADDING * 2) * this.scale * 0.9;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(centerX, centerY);
        
        // 选中效果：光晕 + 缩放
        if (isSelected) {
            // 外光晕
            const glowSize = size * 1.3 + Math.sin(this.wobblePhase) * 3;
            const gradient = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, glowSize);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 217, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 217, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
            
            // 内边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.strokeRect(-size/2, -size/2, size, size);
            ctx.shadowBlur = 0;
        }
        
        // 绘制背景（半透明圆角矩形）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        roundRect(ctx, -size/2, -size/2, size, size, 10);
        ctx.fill();
        ctx.stroke();
        
        // 绘制 Emoji
        ctx.font = `${size * 0.7}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText(TILE_EMOJIS[this.type], 0, 2);
        ctx.shadowBlur = 0;
        
        // 特殊方块标记
        if (this.isSpecial) {
            this.drawSpecialMarker(ctx, size);
        }
        
        ctx.restore();
    }
}

// 辅助函数：绘制圆角矩形
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// ===== 游戏逻辑 =====
function getRandomTileType() {
    return Math.floor(Math.random() * TILE_EMOJIS.length);
}

function initBoard() {
    board = [];
    score = 0;
    resetCombo();
    updateScoreDisplay();
    
    for (let y = 0; y < BOARD_SIZE; y++) {
        let row = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            let tileType = getRandomTileType();
            // 避免初始匹配
            while (
                (x >= 2 && row[x - 1] && row[x - 2] && tileType === row[x - 1].type && tileType === row[x - 2].type) ||
                (y >= 2 && board[y - 1][x] && board[y - 2][x] && tileType === board[y - 1][x].type && tileType === board[y - 2][x].type)
            ) {
                tileType = getRandomTileType();
            }
            const tile = new Tile(tileType, x, y);
            tile.scale = 1;
            tile.alpha = 1;
            row.push(tile);
        }
        board.push(row);
    }
}

function drawBoard() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 如果 board 未初始化，只绘制背景遮罩
    if (!board || board.length === 0) {
        drawStartPrompt();
        return;
    }
    
    // 绘制网格背景
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const bgX = x * TILE_SIZE + TILE_PADDING;
            const bgY = y * TILE_SIZE + TILE_PADDING;
            const bgSize = TILE_SIZE - TILE_PADDING * 2;
            
            ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
            roundRect(ctx, bgX, bgY, bgSize, bgSize, 8);
            ctx.fill();
        }
    }
    
    // 先更新所有方块位置，再绘制
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const tile = board[y][x];
            if (tile && !tile.isMatched) {
                tile.update();
            }
        }
    }
    
    // 绘制所有方块
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const tile = board[y][x];
            if (tile && !tile.isMatched) {
                tile.draw(ctx, selectedTile && selectedTile.x === x && selectedTile.y === y);
            }
        }
    }
    
    // 绘制动画效果
    updateAnimations();
    
    // 绘制浮动文字 - 使用统一的 draw() 方法
    for (const ft of floatingTexts) {
        ft.draw(ctx);
    }
    
    // 绘制粒子
    for (const p of particles) {
        p.draw(ctx);
    }
}

function getTileAt(canvasX, canvasY) {
    const x = Math.floor(canvasX / TILE_SIZE);
    const y = Math.floor(canvasY / TILE_SIZE);
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && board[y][x]) {
        return { x, y, tile: board[y][x] };
    }
    return null;
}

function areAdjacent(tile1, tile2) {
    return (
        (Math.abs(tile1.x - tile2.x) === 1 && tile1.y === tile2.y) ||
        (Math.abs(tile1.y - tile2.y) === 1 && tile1.x === tile2.x)
    );
}

async function swapTilesAnimated(tile1, tile2) {
    return new Promise(resolve => {
        const temp = board[tile1.y][tile1.x];
        board[tile1.y][tile1.x] = board[tile2.y][tile2.x];
        board[tile2.y][tile2.x] = temp;
        
        // 更新目标位置
        board[tile1.y][tile1.x].targetX = tile1.x;
        board[tile1.y][tile1.x].targetY = tile1.y;
        board[tile2.y][tile2.x].targetX = tile2.x;
        board[tile2.y][tile2.x].targetY = tile2.y;
        
        // 强制设置当前位置为起始位置，确保动画平滑
        board[tile1.y][tile1.x].x = tile2.x;
        board[tile1.y][tile1.x].y = tile2.y;
        board[tile2.y][tile2.x].x = tile1.x;
        board[tile2.y][tile2.x].y = tile1.y;
        
        // 动画过程中持续绘制
        const startTime = Date.now();
        const duration = 250;
        
        function animateSwap() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 更新所有方块
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    const tile = board[y][x];
                    if (tile) tile.update();
                }
            }
            drawBoard();
            
            if (progress < 1) {
                requestAnimationFrame(animateSwap);
            } else {
                resolve();
            }
        }
        
        animateSwap();
    });
}

function checkMatches() {
    const foundMatches = [];
    const tilesToRemoveSet = new Set();
    let specialTileInfo = null;
    let maxMatchLength = 0;
    
    // 辅助函数：安全获取方块类型（数字类型直接比较）
    const getTileType = (x, y) => {
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
        const tile = board[y][x];
        if (!tile || tile.isMatched) return null;
        return tile.type; // 直接返回数字类型
    };
    
    // ===== 横向检查（完全分离）=====
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x <= BOARD_SIZE - 3; x++) {
            const t1 = board[y][x], t2 = board[y][x+1], t3 = board[y][x+2];
            if (!t1 || !t2 || !t3 || t1.isMatched || t2.isMatched || t3.isMatched) continue;
            
            // 直接比较 type 数字
            if (t1.type === t2.type && t1.type === t3.type) {
                const matchType = t1.type;
                let matchLength = 3;
                
                // 向右扩展
                for (let i = x + 3; i < BOARD_SIZE; i++) {
                    const tile = board[y][i];
                    if (!tile || tile.isMatched || tile.type !== matchType) break;
                    matchLength++;
                }
                
                // 添加到消除集合
                for (let i = 0; i < matchLength; i++) {
                    tilesToRemoveSet.add(`${x + i},${y}`);
                }
                
                // 创建特殊方块（只记录最长的）
                if (matchLength >= 5 && matchLength > maxMatchLength) {
                    maxMatchLength = matchLength;
                    specialTileInfo = { x: x + Math.floor(matchLength / 2), y: y, type: SPECIAL_TYPES.RAINBOW };
                } else if (matchLength === 4 && maxMatchLength < 4) {
                    maxMatchLength = matchLength;
                    specialTileInfo = { x: x + Math.floor(matchLength / 2), y: y, type: SPECIAL_TYPES.LINE_HORIZONTAL };
                }
            }
        }
    }
    
    // ===== 纵向检查（完全分离）=====
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y <= BOARD_SIZE - 3; y++) {
            const t1 = board[y][x], t2 = board[y+1][x], t3 = board[y+2][x];
            if (!t1 || !t2 || !t3 || t1.isMatched || t2.isMatched || t3.isMatched) continue;
            
            // 直接比较 type 数字
            if (t1.type === t2.type && t1.type === t3.type) {
                const matchType = t1.type;
                let matchLength = 3;
                
                // 向下扩展
                for (let i = y + 3; i < BOARD_SIZE; i++) {
                    const tile = board[i][x];
                    if (!tile || tile.isMatched || tile.type !== matchType) break;
                    matchLength++;
                }
                
                // 添加到消除集合
                for (let i = 0; i < matchLength; i++) {
                    tilesToRemoveSet.add(`${x},${y + i}`);
                }
                
                // 创建特殊方块（只记录最长的）
                if (matchLength >= 5 && matchLength > maxMatchLength) {
                    maxMatchLength = matchLength;
                    specialTileInfo = { x: x, y: y + Math.floor(matchLength / 2), type: SPECIAL_TYPES.RAINBOW };
                } else if (matchLength === 4 && maxMatchLength < 4) {
                    maxMatchLength = matchLength;
                    specialTileInfo = { x: x, y: y + Math.floor(matchLength / 2), type: SPECIAL_TYPES.LINE_VERTICAL };
                }
            }
        }
    }
    
    // ===== L/T 形检测（炸弹）=====
    // 从每个方块向四个方向扩展
    for (let cy = 1; cy < BOARD_SIZE - 1; cy++) {
        for (let cx = 1; cx < BOARD_SIZE - 1; cx++) {
            const centerTile = board[cy][cx];
            if (!centerTile || centerTile.isMatched) continue;
            
            const centerType = centerTile.type;
            
            // 向四个方向扩展
            let hLeft = 0, hRight = 0, vUp = 0, vDown = 0;
            
            // 向左
            for (let i = cx - 1; i >= 0; i--) {
                const tile = board[cy][i];
                if (!tile || tile.isMatched || tile.type !== centerType) break;
                hLeft++;
            }
            // 向右
            for (let i = cx + 1; i < BOARD_SIZE; i++) {
                const tile = board[cy][i];
                if (!tile || tile.isMatched || tile.type !== centerType) break;
                hRight++;
            }
            // 向上
            for (let i = cy - 1; i >= 0; i--) {
                const tile = board[i][cx];
                if (!tile || tile.isMatched || tile.type !== centerType) break;
                vUp++;
            }
            // 向下
            for (let i = cy + 1; i < BOARD_SIZE; i++) {
                const tile = board[i][cx];
                if (!tile || tile.isMatched || tile.type !== centerType) break;
                vDown++;
            }
            
            const hTotal = hLeft + hRight + 1; // 横向总数（含中心）
            const vTotal = vUp + vDown + 1;    // 纵向总数（含中心）
            
            // L/T 形条件：横向 3+ 纵向 3，或总方块数 >= 5
            if (hTotal >= 3 && vTotal >= 3 && (hTotal + vTotal - 1) >= 5) {
                specialTileInfo = { x: cx, y: cy, type: SPECIAL_TYPES.BOMB };
                // 添加横向所有方块
                for (let i = cx - hLeft; i <= cx + hRight; i++) {
                    tilesToRemoveSet.add(`${i},${cy}`);
                }
                // 添加纵向所有方块
                for (let i = cy - vUp; i <= cy + vDown; i++) {
                    tilesToRemoveSet.add(`${cx},${i}`);
                }
            }
        }
    }
    
    // 转换为数组
    for (const key of tilesToRemoveSet) {
        const [x, y] = key.split(',').map(Number);
        foundMatches.push({ x, y });
    }
    
    return { 
        matchedTiles: foundMatches, 
        specialTileToCreate: specialTileInfo 
    };
}

async function activateSpecialTile(x, y, specialType) {
    const tilesToActivate = [];
    
    if (specialType === SPECIAL_TYPES.LINE_HORIZONTAL) {
        // 消除整行
        for (let i = 0; i < BOARD_SIZE; i++) {
            tilesToActivate.push({ x: i, y: y });
        }
        createFloatingText('💥 行消除!', x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE, '#00d9ff');
    } else if (specialType === SPECIAL_TYPES.LINE_VERTICAL) {
        // 消除整列
        for (let i = 0; i < BOARD_SIZE; i++) {
            tilesToActivate.push({ x: x, y: i });
        }
        createFloatingText('💥 列消除!', x * TILE_SIZE, y * TILE_SIZE, '#00ff88');
    } else if (specialType === SPECIAL_TYPES.BOMB) {
        // 3x3 范围爆炸
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const targetX = x + dx;
                const targetY = y + dy;
                if (targetX >= 0 && targetX < BOARD_SIZE && targetY >= 0 && targetY < BOARD_SIZE) {
                    tilesToActivate.push({ x: targetX, y: targetY });
                }
            }
        }
        createFloatingText('💣 炸弹!', x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE, '#ff4757');
    } else if (specialType === SPECIAL_TYPES.RAINBOW) {
        // 消除所有同色方块
        const targetTile = board[y][x];
        if (targetTile) {
            const targetType = targetTile.type;
            for (let by = 0; by < BOARD_SIZE; by++) {
                for (let bx = 0; bx < BOARD_SIZE; bx++) {
                    if (board[by][bx] && board[by][bx].type === targetType) {
                        tilesToActivate.push({ x: bx, y: by });
                    }
                }
            }
            createFloatingText('🌈 彩虹!', x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE, '#ffd700');
        }
    }
    
    return tilesToActivate;
}

async function removeMatches(matchesInfo) {
    const matchedTiles = matchesInfo.matchedTiles;
    const specialTileToCreate = matchesInfo.specialTileToCreate;
    let extraTilesToActivate = [];
    
    if (matchedTiles.length === 0) return;
    
    // 检查是否有特殊方块被触发
    for (const coord of matchedTiles) {
        const tile = board[coord.y][coord.x];
        if (tile && tile.isSpecial) {
            // 播放特殊音效
            if (tile.specialType === SPECIAL_TYPES.BOMB) {
                playSound(SOUND_EFFECTS.BOMB);
            } else if (tile.specialType === SPECIAL_TYPES.RAINBOW) {
                playSound(SOUND_EFFECTS.RAINBOW);
            } else {
                playSound(SOUND_EFFECTS.SPECIAL);
            }
            const activatedTiles = await activateSpecialTile(coord.x, coord.y, tile.specialType);
            extraTilesToActivate = extraTilesToActivate.concat(activatedTiles);
        }
    }
    
    // 合并所有要消除的方块
    const allTilesToRemoveSet = new Set(matchedTiles.map(m => `${m.x},${m.y}`));
    for (const coord of extraTilesToActivate) {
        allTilesToRemoveSet.add(`${coord.x},${coord.y}`);
    }
    
    const allTilesToRemove = [];
    for (const key of allTilesToRemoveSet) {
        const [x, y] = key.split(',').map(Number);
        allTilesToRemove.push({ x, y });
    }
    
    // 标记要消除的方块
    for (const coord of allTilesToRemove) {
        if (board[coord.y][coord.x]) {
            board[coord.y][coord.x].isMatched = true;
        }
    }
    
    // 绘制消除动画
    for (let frame = 0; frame < 15; frame++) {
        const animProgress = frame / 15;
        for (const coord of allTilesToRemove) {
            const tile = board[coord.y][coord.x];
            if (tile) {
                tile.scale = 1 - animProgress * 0.5;
                tile.alpha = 1 - animProgress;
            }
        }
        drawBoard();
        await new Promise(r => setTimeout(r, 20));
    }
    
    // 创建粒子效果
    for (const coord of allTilesToRemove) {
        const tile = board[coord.y][coord.x];
        if (tile) {
            const centerX = coord.x * TILE_SIZE + TILE_SIZE / 2;
            const centerY = coord.y * TILE_SIZE + TILE_SIZE / 2;
            const color = tile.isSpecial ? '#fff' : TILE_COLORS[tile.type];
            createParticles(centerX, centerY, color, tile.isSpecial ? 12 : 6);
        }
    }
    
    // 添加分数（含连击加成）
    const baseScore = allTilesToRemove.length * 10;
    const specialBonus = extraTilesToActivate.length > matchedTiles.length ? 100 : 0;
    const comboBonus = Math.floor((comboMultiplier - 1) * 100);
    const totalScore = baseScore + specialBonus + comboBonus;
    
    if (allTilesToRemove.length > 0) {
        const firstCoord = allTilesToRemove[0];
        addScore(totalScore, firstCoord.x * TILE_SIZE + TILE_SIZE / 2, firstCoord.y * TILE_SIZE + TILE_SIZE / 2);
        
        // 增加连击
        addCombo();
        
        // 播放消除音效
        if (extraTilesToActivate.length > matchedTiles.length) {
            playSound(SOUND_EFFECTS.SPECIAL);
        } else {
            playSound(SOUND_EFFECTS.MATCH);
        }
        
        // 连击提示
        if (comboCount > 2) {
            createFloatingText(`🔥 ${comboCount}连击!`, firstCoord.x * TILE_SIZE + TILE_SIZE/2, firstCoord.y * TILE_SIZE, '#ff6b6b');
        }
    }
    
    // 移除方块
    for (const coord of allTilesToRemove) {
        board[coord.y][coord.x] = null;
    }
    
    // 创建新的特殊方块（只在第一次消除时创建）
    if (specialTileToCreate && !extraTilesToActivate.length) {
        const targetTile = board[specialTileToCreate.y][specialTileToCreate.x];
        if (targetTile && !targetTile.isMatched) {
            targetTile.isSpecial = true;
            targetTile.specialType = specialTileToCreate.type;
            createFloatingText('✨ 特殊方块!', specialTileToCreate.x * TILE_SIZE + TILE_SIZE/2, specialTileToCreate.y * TILE_SIZE, '#ffd700');
            playSound(SOUND_EFFECTS.SPECIAL);
        }
    }
    
    // 方块下落
    for (let x = 0; x < BOARD_SIZE; x++) {
        let emptyY = -1;
        for (let y = BOARD_SIZE - 1; y >= 0; y--) {
            if (board[y][x] === null) {
                if (emptyY === -1) emptyY = y;
            } else if (emptyY !== -1) {
                board[emptyY][x] = board[y][x];
                board[emptyY][x].targetY = emptyY;
                board[emptyY][x].y = emptyY;
                board[y][x] = null;
                emptyY--;
            }
        }
        
        // 生成新方块 - 从上方落下
        for (let y = BOARD_SIZE - 1; y >= 0; y--) {
            if (board[y][x] === null) {
                const newTile = new Tile(getRandomTileType(), x, -1);
                newTile.targetY = y;
                newTile.scale = 0;
                newTile.alpha = 0;
                board[y][x] = newTile;
            }
        }
    }
    
    // 等待下落动画完成
    await new Promise(r => setTimeout(r, 500));
    
    // 确保所有方块到达目标位置
    for (let frame = 0; frame < 10; frame++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            for (let y = 0; y < BOARD_SIZE; y++) {
                const tile = board[y][x];
                if (tile) {
                    tile.update();
                }
            }
        }
        drawBoard();
        await new Promise(r => setTimeout(r, 20));
    }
    
    // 检查是否有新的匹配（连击）
    const newMatches = checkMatches();
    if (newMatches.matchedTiles.length > 0) {
        await removeMatches(newMatches);
    }
}

// ===== 事件处理 =====
canvas.addEventListener('click', async (event) => {
    if (!gameStarted || isAnimating) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const clickedTileInfo = getTileAt(clickX, clickY);
    
    if (!clickedTileInfo || !clickedTileInfo.tile) return;
    
    if (!selectedTile) {
        selectedTile = clickedTileInfo;
        playSound(SOUND_EFFECTS.SELECT);
        drawBoard(); // 立即重绘显示选中状态
    } else {
        if (areAdjacent(selectedTile, clickedTileInfo)) {
            isAnimating = true;
            
            // 清除选中状态后再交换
            const tile1 = selectedTile;
            const tile2 = clickedTileInfo;
            selectedTile = null;
            drawBoard();
            
            await swapTilesAnimated(tile1, tile2);
            playSound(SOUND_EFFECTS.SWAP);
            drawBoard();
            
            const matchesAfterSwap = checkMatches();
            if (matchesAfterSwap.matchedTiles.length > 0) {
                await removeMatches(matchesAfterSwap);
            } else {
                // 无匹配，交换回来
                playSound(SOUND_EFFECTS.INVALID);
                await swapTilesAnimated(tile1, tile2);
            }
            
            isAnimating = false;
            drawBoard();
        } else {
            selectedTile = clickedTileInfo;
            playSound(SOUND_EFFECTS.SELECT);
            drawBoard(); // 立即重绘显示选中状态
        }
    }
});

// 游戏模式
let gameMode = 'timed'; // 'timed' or 'endless'
const modeRadios = document.querySelectorAll('input[name="gameMode"]');

modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameMode = e.target.value;
        playSound(SOUND_EFFECTS.SELECT);
    });
});

// 音效控制
let soundEnabled = true;
const soundBtn = document.getElementById('soundBtn');
const soundIcon = document.getElementById('soundIcon');
const volumeSlider = document.getElementById('volumeSlider');

if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        playSound(SOUND_EFFECTS.SELECT);
    });
}

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        setVolume(volume);
    });
}

// 按钮事件
startBtn.addEventListener('click', () => {
    gameStarted = true;
    isAnimating = false;
    // 激活音频上下文
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    startBtn.innerHTML = '<span class="btn-icon">✅</span> 游戏中...';
    startBtn.disabled = true;
    if (soundEnabled) playSound(SOUND_EFFECTS.LEVEL_UP);
    resetCombo();
    startTimer();
    initBoard();
    drawBoard();
});

resetBtn.addEventListener('click', () => {
    gameStarted = false;
    isAnimating = false;
    selectedTile = null;
    startBtn.innerHTML = '<span class="btn-icon">▶️</span> 开始游戏';
    startBtn.disabled = false;
    if (soundEnabled) playSound(SOUND_EFFECTS.SWAP);
    stopTimer();
    resetCombo();
    initBoard();
    drawBoard();
});

// 覆盖 playSound 函数以支持静音
const originalPlaySound = playSound;
playSound = function(type) {
    if (soundEnabled) {
        originalPlaySound(type);
    }
};

// 绘制开始提示
function drawStartPrompt() {
    if (!gameStarted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 20;
        ctx.fillText('点击"开始游戏"按钮', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#8892b0';
        ctx.shadowBlur = 0;
        ctx.fillText('开始挑战！', canvas.width / 2, canvas.height / 2 + 20);
    }
}

// ===== 初始化 =====
setupCanvas();
updateScoreDisplay();
drawBoard();

// 游戏循环 - 持续绘制确保动画流畅
function gameLoop() {
    drawBoard();
    requestAnimationFrame(gameLoop);
}
gameLoop();
