/**
 * Canvas de Partículas: Pétalos de Sakura y Chispas de Fuego
 * Estilo Kimetsu no Yaiba - Optimizado a 60 FPS
 */

class SakuraParticles {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = window.innerWidth < 768 ? 25 : 45;
    this.isActive = true;
    this.mouse = { x: -1000, y: -1000 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    // Crear partículas iniciales
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }

    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  createParticle(randomY = false) {
    const isEmber = Math.random() < 0.25; // 25% chispas doradas, 75% sakura
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -20,
      size: isEmber ? Math.random() * 2.5 + 1 : Math.random() * 9 + 6,
      speedY: isEmber ? Math.random() * 1.5 + 0.8 : Math.random() * 1.2 + 0.6,
      speedX: (Math.random() - 0.5) * 1.2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      oscillationSpeed: Math.random() * 0.02 + 0.01,
      oscillationAngle: Math.random() * Math.PI * 2,
      isEmber: isEmber,
      opacity: Math.random() * 0.5 + 0.35,
      color: isEmber 
        ? '#fcbf49' 
        : (Math.random() < 0.5 ? '#f4a6b8' : '#ffe4e6')
    };
  }

  update() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.y += p.speedY;
      p.oscillationAngle += p.oscillationSpeed;
      p.x += Math.sin(p.oscillationAngle) * 0.8 + p.speedX;
      p.rotation += p.rotSpeed;

      // Reacción suave al cursor
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const force = (100 - dist) / 100;
        p.x -= (dx / dist) * force * 3;
        p.y -= (dy / dist) * force * 3;
      }

      // Reiniciar cuando sale de pantalla
      if (p.y > this.height + 20 || p.x < -50 || p.x > this.width + 50) {
        this.particles[i] = this.createParticle(false);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = p.opacity;

      if (p.isEmber) {
        // Chispa brillante
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = '#f77f00';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Pétalo de cerezo (Sakura)
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size, p.size / 3, 0, p.size);
        this.ctx.bezierCurveTo(-p.size, p.size / 3, -p.size / 2, -p.size / 2, 0, 0);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  animate() {
    if (this.isActive) {
      this.update();
      this.draw();
    }
    requestAnimationFrame(() => this.animate());
  }

  pause() {
    this.isActive = false;
  }

  resume() {
    this.isActive = true;
  }
}

window.SakuraParticles = SakuraParticles;
