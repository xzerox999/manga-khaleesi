/**
 * Aplicación Principal - Manga Demon Slayer para Khaleesi
 */

class MangaApp {
  constructor() {
    this.chapters = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.reader = null;

    this.grid = document.getElementById('manga-grid');
    this.searchInput = document.getElementById('search-input');
    this.filterTabs = document.querySelectorAll('.tab-btn');
    this.resumeBtn = document.getElementById('btn-resume-reading');
    this.statsCompleted = document.getElementById('stat-completed');
    this.statsTotal = document.getElementById('stat-total');

    this.init();
  }

  async init() {
    // 1. Inicializar partículas de Sakura
    window.sakuraInstance = new SakuraParticles('particles-canvas');

    // 2. Cargar datos de capítulos
    await this.loadChaptersData();

    // 3. Inicializar Lector
    this.reader = new MangaReader(this);

    // 4. Vincular Eventos UI
    this.bindEvents();

    // 5. Renderizar Tarjetas
    this.renderGrid();
    this.updateProgressUI();

    // 6. Registrar Service Worker PWA si está soportado
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.log('Service Worker no activo en entorno local/file:', err);
      });
    }
  }

  async loadChaptersData() {
    try {
      const res = await fetch('data/chapters.json');
      const data = await res.json();
      this.chapters = data.chapters || [];
      if (this.statsTotal) this.statsTotal.textContent = this.chapters.length;
    } catch (e) {
      console.error('Error al cargar chapters.json:', e);
    }
  }

  bindEvents() {
    // Buscador
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderGrid();
    });

    // Pestañas de filtrado por Arco
    this.filterTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterTabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.arc || 'all';
        this.renderGrid();
      });
    });

    // Botón Continuar Leyendo
    this.resumeBtn?.addEventListener('click', () => {
      const lastRead = JSON.parse(localStorage.getItem('khaleesi_last_read') || 'null');
      if (lastRead && lastRead.chapterId) {
        this.openChapter(lastRead.chapterId, lastRead.page || 1);
      } else if (this.chapters.length > 0) {
        this.openChapter(this.chapters[0].id, 1);
      }
    });
  }

  getFilteredChapters() {
    return this.chapters.filter((ch) => {
      const matchFilter = this.currentFilter === 'all' || ch.arc.toLowerCase().includes(this.currentFilter.toLowerCase());
      const matchSearch = !this.searchQuery || 
        ch.title.toLowerCase().includes(this.searchQuery) ||
        ch.arc.toLowerCase().includes(this.searchQuery) ||
        ch.id.includes(this.searchQuery);
      return matchFilter && matchSearch;
    });
  }

  renderGrid() {
    const list = this.getFilteredChapters();
    this.grid.innerHTML = '';

    if (list.length === 0) {
      this.grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-dim);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🗡️</div>
          <p>No se encontraron tomos con ese criterio de búsqueda.</p>
        </div>
      `;
      return;
    }

    const history = JSON.parse(localStorage.getItem('khaleesi_chapter_history') || '{}');

    list.forEach((ch, idx) => {
      const chProgress = history[ch.id] || null;
      let statusClass = 'status-unread';
      let statusText = 'No leído';
      let percent = 0;

      if (chProgress) {
        if (chProgress.completed) {
          statusClass = 'status-completed';
          statusText = '✓ Leído';
          percent = 100;
        } else {
          statusClass = 'status-reading';
          percent = Math.round((chProgress.page / chProgress.totalPages) * 100);
          statusText = `Pág. ${chProgress.page}`;
        }
      }

      const card = document.createElement('article');
      card.className = 'manga-card';
      card.style.animationDelay = `${(idx % 12) * 0.04}s`;
      card.innerHTML = `
        <div class="card-cover-wrapper">
          <img class="card-cover-img" src="${ch.coverFile}" alt="${ch.title}" loading="lazy">
          <div class="card-badge-status ${statusClass}">${statusText}</div>
          <div class="card-cover-overlay">
            <button class="card-overlay-btn" type="button">
              <span>LEER TOMO</span> ➔
            </button>
          </div>
        </div>
        <div class="card-content">
          <span class="card-arc-tag">${ch.arc}</span>
          <h4 class="card-title">${ch.title}</h4>
          <div class="card-meta">
            <span>📄 ${ch.pages} páginas</span>
            <span>💾 ${ch.sizeMb} MB</span>
          </div>
          <div class="card-progress-bar-container">
            <div class="card-progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        const resumePage = chProgress ? chProgress.page : 1;
        this.triggerSlashTransition(() => {
          this.openChapter(ch.id, resumePage);
        });
      });

      this.grid.appendChild(card);
    });
  }

  triggerSlashTransition(callback) {
    const overlay = document.getElementById('katana-slash-overlay');
    if (!overlay) {
      callback();
      return;
    }

    overlay.classList.add('active');
    setTimeout(() => {
      callback();
      setTimeout(() => {
        overlay.classList.remove('active');
      }, 250);
    }, 400);
  }

  openChapter(chapterId, page = 1) {
    const chapter = this.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    this.reader.loadChapter(chapter, page);
  }

  updateProgressUI() {
    const history = JSON.parse(localStorage.getItem('khaleesi_chapter_history') || '{}');
    const completedCount = Object.values(history).filter((h) => h.completed).length;
    if (this.statsCompleted) {
      this.statsCompleted.textContent = completedCount;
    }

    // Actualizar texto del botón continuar lectura
    const lastRead = JSON.parse(localStorage.getItem('khaleesi_last_read') || 'null');
    if (lastRead && this.resumeBtn) {
      this.resumeBtn.style.display = 'inline-flex';
      this.resumeBtn.querySelector('.resume-text').textContent = `Continuar ${lastRead.title} (Pág. ${lastRead.page})`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new MangaApp();
});
