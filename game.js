const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas boyutunu ayarla
function resizeCanvas() {
    if (window.innerWidth <= 768) {
        // Mobilde tam ekran
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        // Masaüstünde sabit boyut
        canvas.width = 800;
        canvas.height = 400;
    }
    // Goril pozisyonunu güncelle
    if (goril) {
        goril.groundY = canvas.height - 100;
        goril.y = goril.groundY - goril.height;
    }
}

// Önce canvas boyutunu ayarla
if (window.innerWidth <= 768) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
} else {
    canvas.width = 800;
    canvas.height = 400;
}

window.addEventListener('resize', resizeCanvas);

// Oyun değişkenleri
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
// Mobilde biraz daha yavaş, masaüstünde daha hızlı
let gameSpeed = window.innerWidth <= 768 ? 3.5 : 4;
let gravity = 0.8;
let highScore = parseInt(localStorage.getItem('gorilHighScore')) || 0;

// Goril objesi
const goril = {
    x: 100,
    y: 0,
    width: 60,
    height: 80,
    normalHeight: 80,
    duckHeight: 50,
    velocityY: 0,
    jumping: false,
    ducking: false,
    groundY: canvas.height - 100,
    
    draw() {
        if (this.ducking) {
            // Eğilmiş goril - daha kısa
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y + 40, this.width, this.duckHeight - 20);
            
            // Goril kafası (eğilmiş)
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + 40, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Gözler
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 15, this.y + 35, 8, 8);
            ctx.fillRect(this.x + 37, this.y + 35, 8, 8);
            
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 17, this.y + 37, 4, 4);
            ctx.fillRect(this.x + 39, this.y + 37, 4, 4);
            
            // Kollar (eğilmiş)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x - 10, this.y + 50, 15, 8);
            ctx.fillRect(this.x + this.width - 5, this.y + 50, 15, 8);
        } else {
            // Normal goril
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y + 20, this.width, this.height - 20);
            
            // Goril kafası
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + 20, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Gözler
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 15, this.y + 15, 8, 8);
            ctx.fillRect(this.x + 37, this.y + 15, 8, 8);
            
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 17, this.y + 17, 4, 4);
            ctx.fillRect(this.x + 39, this.y + 17, 4, 4);
            
            // Kollar
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x - 10, this.y + 30, 15, 8);
            ctx.fillRect(this.x + this.width - 5, this.y + 30, 15, 8);
            
            // Bacaklar
            ctx.fillRect(this.x + 10, this.y + this.height - 20, 15, 20);
            ctx.fillRect(this.x + 35, this.y + this.height - 20, 15, 20);
        }
    },
    
    update() {
        // Eğilme durumunu güncelle
        if (this.ducking && !this.jumping) {
            this.height = this.duckHeight;
        } else {
            this.height = this.normalHeight;
        }
        
        // Yerçekimi
        this.velocityY += gravity;
        this.y += this.velocityY;
        
        // Yere değme kontrolü
        if (this.y + this.height >= this.groundY) {
            this.y = this.groundY - this.height;
            this.velocityY = 0;
            this.jumping = false;
        }
    },
    
    jump() {
        if (!this.jumping && !this.ducking) {
            this.velocityY = -24;
            this.jumping = true;
        }
    },
    
    duck() {
        if (!this.jumping) {
            this.ducking = true;
        }
    },
    
    stand() {
        this.ducking = false;
    }
};

// Engeller dizisi
let obstacles = [];
let flyingObstacles = [];

class Obstacle {
    constructor(x) {
        this.x = x;
        this.width = 40;
        this.height = 60 + Math.random() * 40;
        this.y = goril.groundY - this.height;
    }
    
    draw() {
        // Engelin gövdesi (kaktüs benzeri)
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Engelin üst kısmı (dikenler)
        ctx.fillStyle = '#1a3d0d';
        for (let i = 0; i < 3; i++) {
            const spikeX = this.x + (i * this.width / 3);
            ctx.beginPath();
            ctx.moveTo(spikeX + this.width / 6, this.y);
            ctx.lineTo(spikeX + this.width / 3, this.y - 15);
            ctx.lineTo(spikeX + this.width / 2, this.y);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    update() {
        this.x -= gameSpeed;
    }
    
    collidesWith(goril) {
        return goril.x < this.x + this.width &&
               goril.x + goril.width > this.x &&
               goril.y < this.y + this.height &&
               goril.y + goril.height > this.y;
    }
}

// Uçan engel sınıfı
class FlyingObstacle {
    constructor(x) {
        this.x = x;
        this.width = 50;
        this.height = 40;
        // Goril normalde 80 yüksekliğinde (goril.groundY - 80 ile goril.groundY arası)
        // Goril eğilince 50 yüksekliğinde (goril.groundY - 50 ile goril.groundY arası)
        // Uçan engelin altı goril.groundY - 75 civarında olmalı ki normalde çarpsın ama eğilince geçsin
        // Engelin yüksekliği 40, yani engelin üstü this.y, altı this.y + 40
        // this.y + 40 = goril.groundY - 75 => this.y = goril.groundY - 115
        this.y = goril.groundY - 115 - Math.random() * 5; // Gorilin başına çarpmalı
    }
    
    draw() {
        // Uçan engel (kuş benzeri)
        ctx.fillStyle = '#8B4513';
        // Gövde
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Kanatlar
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.ellipse(this.x - 10, this.y + this.height / 2, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + this.width + 10, this.y + this.height / 2, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Göz
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 15, this.y + 10, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    update() {
        this.x -= gameSpeed;
    }
    
    collidesWith(goril) {
        // Eğilmişse çarpışma yok
        if (goril.ducking) {
            return false;
        }
        return goril.x < this.x + this.width &&
               goril.x + goril.width > this.x &&
               goril.y < this.y + this.height &&
               goril.y + goril.height > this.y;
    }
}

// Bulutlar
let clouds = [];

class Cloud {
    constructor(x) {
        this.x = x;
        this.y = 50 + Math.random() * 100;
        this.width = 60 + Math.random() * 40;
        this.height = 30 + Math.random() * 20;
        this.speed = 1 + Math.random() * 2;
    }
    
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 3, 0, Math.PI * 2);
        ctx.arc(this.x + this.width / 3, this.y, this.width / 2.5, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 2/3, this.y, this.width / 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.x = canvas.width + Math.random() * 200;
        }
    }
}

// İlk bulutları oluştur
for (let i = 0; i < 5; i++) {
    clouds.push(new Cloud(Math.random() * canvas.width * 2));
}

// Zemin çizgisi
function drawGround() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, goril.groundY);
    ctx.lineTo(canvas.width, goril.groundY);
    ctx.stroke();
}

// Skor gösterimi
function drawScore() {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Skor: ${Math.floor(score)}`, 20, 40);
    ctx.fillText(`En Yüksek: ${highScore}`, 20, 70);
}

// Oyun döngüsü
function gameLoop() {
    // Ekranı temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        // Bulutları çiz ve güncelle
        clouds.forEach(cloud => {
            cloud.update();
            cloud.draw();
        });
        
        // Zemin çizgisi
        drawGround();
        
        // Gorili güncelle ve çiz
        goril.update();
        goril.draw();
        
        // Engelleri güncelle ve çiz
        obstacles.forEach((obstacle, index) => {
            obstacle.update();
            obstacle.draw();
            
            // Çarpışma kontrolü
            if (obstacle.collidesWith(goril)) {
                endGame();
            }
            
            // Ekrandan çıkan engelleri kaldır
            if (obstacle.x + obstacle.width < 0) {
                obstacles.splice(index, 1);
            }
        });
        
        // Uçan engelleri güncelle ve çiz
        flyingObstacles.forEach((obstacle, index) => {
            obstacle.update();
            obstacle.draw();
            
            // Çarpışma kontrolü
            if (obstacle.collidesWith(goril)) {
                endGame();
            }
            
            // Ekrandan çıkan engelleri kaldır
            if (obstacle.x + obstacle.width < 0) {
                flyingObstacles.splice(index, 1);
            }
        });
        
        // Yeni engel oluştur (yer veya uçan)
        const lastObstacle = obstacles.length > 0 ? obstacles[obstacles.length - 1] : null;
        const lastFlyingObstacle = flyingObstacles.length > 0 ? flyingObstacles[flyingObstacles.length - 1] : null;
        const lastAnyObstacle = lastObstacle && lastFlyingObstacle 
            ? (lastObstacle.x > lastFlyingObstacle.x ? lastObstacle : lastFlyingObstacle)
            : (lastObstacle || lastFlyingObstacle);
        
        if (!lastAnyObstacle || lastAnyObstacle.x < canvas.width - 600) {
            // Rastgele yer veya uçan engel oluştur
            if (Math.random() < 0.5) {
                obstacles.push(new Obstacle(canvas.width));
            } else {
                flyingObstacles.push(new FlyingObstacle(canvas.width));
            }
        }
        
        // Skor artır
        score += 0.1;
        
        // Oyun hızını artır (mobilde maksimum hız daha düşük)
        if (score % 100 === 0 && score > 0) {
            const maxSpeed = window.innerWidth <= 768 ? 8.5 : 10;
            gameSpeed = Math.min(gameSpeed + 0.08, maxSpeed);
        }
        
        // Skor gösterimi
        drawScore();
        
    } else if (gameState === 'start') {
        // Başlangıç ekranı - arka plan animasyonu
        clouds.forEach(cloud => {
            cloud.update();
            cloud.draw();
        });
        drawGround();
        goril.draw();
    }
    
    requestAnimationFrame(gameLoop);
}

// Oyun bitirme fonksiyonu
function endGame() {
    gameState = 'gameOver';
    const finalScore = Math.floor(score);
    document.getElementById('finalScore').textContent = finalScore;
    
    // En yüksek skoru güncelle
    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('gorilHighScore', highScore.toString());
    }
    
    document.getElementById('highScoreFinal').textContent = highScore;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Klavye kontrolleri
document.addEventListener('keydown', (e) => {
    if (gameState === 'playing') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            goril.jump();
        }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            e.preventDefault();
            goril.duck();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (gameState === 'playing') {
        if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            e.preventDefault();
            goril.stand();
        }
    }
});

// Mobil kontroller
const jumpBtn = document.getElementById('jumpBtn');
const duckBtn = document.getElementById('duckBtn');

// Zıplama butonu
jumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.jump();
    }
});

jumpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.jump();
    }
});

// Eğilme butonu
duckBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.duck();
    }
});

duckBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.stand();
    }
});

duckBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.duck();
    }
});

duckBtn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.stand();
    }
});

duckBtn.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        goril.stand();
    }
});

// Başlat butonu
document.getElementById('startBtn').addEventListener('click', () => {
    gameState = 'playing';
    document.getElementById('startScreen').classList.add('hidden');
    score = 0;
    gameSpeed = window.innerWidth <= 768 ? 3.5 : 4;
    obstacles = [];
    flyingObstacles = [];
    // Goril pozisyonunu yeniden ayarla
    goril.groundY = canvas.height - 100;
    goril.y = goril.groundY - goril.height;
    goril.velocityY = 0;
    goril.jumping = false;
    goril.ducking = false;
    goril.height = goril.normalHeight;
});

// Yeniden başlat butonu
document.getElementById('restartBtn').addEventListener('click', () => {
    gameState = 'playing';
    document.getElementById('gameOver').classList.add('hidden');
    score = 0;
    gameSpeed = window.innerWidth <= 768 ? 3.5 : 4;
    obstacles = [];
    flyingObstacles = [];
    // Goril pozisyonunu yeniden ayarla
    goril.groundY = canvas.height - 100;
    goril.y = goril.groundY - goril.height;
    goril.velocityY = 0;
    goril.jumping = false;
    goril.ducking = false;
    goril.height = goril.normalHeight;
});

// İlk goril pozisyonunu ayarla
goril.groundY = canvas.height - 100;
goril.y = goril.groundY - goril.height;

// En yüksek skoru göster
if (document.getElementById('highScoreDisplay')) {
    document.getElementById('highScoreDisplay').textContent = highScore;
}

// Oyun döngüsünü başlat
gameLoop();

