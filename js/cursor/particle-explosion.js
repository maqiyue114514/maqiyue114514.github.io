class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 5 + 2;
      this.speedX = Math.random() * 6 - 3;
      this.speedY = Math.random() * 6 - 3;
      this.color = `hsl(${Math.random() * 360}, 100%, 70%)`;
      this.life = 100;
    }
    update() {
      this.speedY += 0.1; // 重力效果
      this.x += this.speedX;
      this.y += this.speedY;
      this.life--;
    }
    draw(ctx) {
      ctx.globalAlpha = this.life / 100;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  function initEffect() {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      zIndex: 99999
    });
    document.body.appendChild(canvas);
  
    const ctx = canvas.getContext('2d');
    let particles = [];
  
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0) particles.splice(i, 1);
      });
      requestAnimationFrame(animate);
    }
    animate();
  
    document.addEventListener('click', (e) => {
      for (let i = 0; i < 25; i++) {
        particles.push(new Particle(e.clientX, e.clientY));
      }
    });
  
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
  
  if (document.readyState === 'complete') initEffect();
  else window.addEventListener('load', initEffect);