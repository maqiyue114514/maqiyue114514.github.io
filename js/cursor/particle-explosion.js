class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 3 + 1;
      this.speedX = Math.random() * 6 - 3;
      this.speedY = Math.random() * 6 - 3;
      this.color = color || `hsl(${Math.random() * 360}, 100%, 50%)`;
      this.life = 100;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.size *= 0.97;
      this.life--;
    }
    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  function initParticleSystem() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
  
    const ctx = canvas.getContext('2d');
    let particles = [];
  
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0 || p.size <= 0.5) particles.splice(i, 1);
      });
      requestAnimationFrame(animate);
    }
    animate();
  
    document.addEventListener('click', (e) => {
      for (let i = 0; i < 30; i++) {
        particles.push(new Particle(e.clientX, e.clientY));
      }
    });
  
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
  
  if (document.readyState === 'complete') {
    initParticleSystem();
  } else {
    window.addEventListener('load', initParticleSystem);
  }