/* ============================================================
   main.js — Portfolio Regina Adelisa
   Semua konten dibaca dari file JSON secara dinamis.
   ============================================================ */

/* ── Helpers ─────────────────────────────────────────────── */
async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
    return await res.json();
  } catch (err) {
    console.warn('loadJSON:', err.message);
    return null;
  }
}

function isP(val) {
  if (val === null || val === undefined || val === '') return true;
  return typeof val === 'string' && val.trim().startsWith('[');
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ph(val, fallback = '—') {
  if (isP(val)) return `<span class="placeholder-text">${esc(val) || fallback}</span>`;
  return esc(val);
}

function periodStr(start, end) {
  if (isP(start)) return '<span class="placeholder-text">[Periode]</span>';
  const e = isP(end) ? '' : ` – ${esc(end)}`;
  return `${esc(start)}${e}`;
}

const pdfPreviewCache = new Map();

function renderPdfPreview(url, alt) {
  return `<div class="pdf-preview" data-pdf-preview="${esc(url)}" data-pdf-alt="${esc(alt)}">
    <span class="pdf-preview-status" aria-live="polite">Memuat pratinjau PDF…</span>
    <img class="pdf-preview-image" alt="${esc(alt)}" hidden>
  </div>`;
}

function renderThumbnail(image, pdf, options) {
  const { containerClass, placeholderClass, placeholder, alt, lightbox = true } = options;
  const validImage = image && !isP(image);
  const validPdf = pdf && !isP(pdf);
  let content = '';

  if (validImage) {
    content = `<img class="media-thumb-image" src="${esc(image)}" alt="${esc(alt)}" loading="lazy"
      data-placeholder-class="${esc(placeholderClass)}" data-placeholder="${esc(placeholder)}"
      ${lightbox ? `data-lightbox-src="${esc(image)}"` : ''}${validPdf ? ` data-fallback-pdf="${esc(pdf)}"` : ''}>`;
  } else if (validPdf) {
    content = renderPdfPreview(pdf, alt);
  } else {
    content = `<div class="${placeholderClass}">${placeholder}</div>`;
  }

  return `<div class="${containerClass} media-thumb">${content}</div>`;
}

function getPdfPreview(url) {
  const absoluteUrl = new URL(url, document.baseURI).href;
  if (pdfPreviewCache.has(absoluteUrl)) return pdfPreviewCache.get(absoluteUrl);

  const preview = (async () => {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) throw new Error('PDF.js gagal dimuat');

    const documentTask = pdfjs.getDocument({ url: absoluteUrl });
    let pdf;
    let page;
    const canvas = document.createElement('canvas');

    try {
      pdf = await documentTask.promise;
      page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 600 / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D tidak tersedia');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      page?.cleanup();
      canvas.width = 0;
      canvas.height = 0;
      await documentTask.destroy();
    }
  })();

  pdfPreviewCache.set(absoluteUrl, preview);
  preview.catch(() => pdfPreviewCache.delete(absoluteUrl));
  if (pdfPreviewCache.size > 12) {
    const oldestKey = pdfPreviewCache.keys().next().value;
    if (oldestKey !== absoluteUrl) pdfPreviewCache.delete(oldestKey);
  }
  return preview;
}

function initMediaPreviews(root = document) {
  const previews = [...root.querySelectorAll('[data-pdf-preview]')];
  if (root.matches?.('[data-pdf-preview]')) previews.push(root);
  const observePreview = element => {
    const url = element.dataset.pdfPreview;
    Promise.resolve().then(() => getPdfPreview(url)).then(src => {
      const image = element.querySelector('.pdf-preview-image');
      const status = element.querySelector('.pdf-preview-status');
      if (!image || !status || !element.isConnected) return;
      image.src = src;
      image.hidden = false;
      status.remove();
    }).catch(error => {
      console.warn('PDF preview:', url, error.message);
      const status = element.querySelector('.pdf-preview-status');
      if (status) status.textContent = 'Pratinjau PDF tidak tersedia';
      element.classList.add('pdf-preview--error');
    });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        observePreview(entry.target);
      });
    }, { rootMargin: '120px' });
    previews.forEach(preview => {
      if (preview.dataset.pdfPreviewObserved) return;
      preview.dataset.pdfPreviewObserved = 'true';
      observer.observe(preview);
    });
  } else {
    previews.forEach(observePreview);
  }

  root.querySelectorAll('img.media-thumb-image').forEach(image => {
    if (image.dataset.previewFallbackBound) return;
    image.dataset.previewFallbackBound = 'true';
    image.addEventListener('error', () => {
      let preview;
      if (image.dataset.fallbackPdf) {
        preview = document.createElement('div');
        preview.className = 'pdf-preview';
        preview.dataset.pdfPreview = image.dataset.fallbackPdf;
        preview.dataset.pdfAlt = image.alt;
        preview.innerHTML = `<span class="pdf-preview-status" aria-live="polite">Memuat pratinjau PDF…</span>
          <img class="pdf-preview-image" alt="${esc(image.alt)}" hidden>`;
      } else {
        preview = document.createElement('div');
        preview.className = image.dataset.placeholderClass;
        preview.textContent = image.dataset.placeholder;
      }
      image.replaceWith(preview);
      if (preview.dataset.pdfPreview) initMediaPreviews(preview);
    }, { once: true });
  });
}

/* Render an array of image paths as a clickable gallery */
function renderGallery(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const imgs = photos
    .filter(p => p && !isP(p))
    .map(p => `<img src="${esc(p)}" alt="Dokumentasi" loading="lazy"
         data-lightbox-src="${esc(p)}"
         onerror="this.style.display='none'">`).join('');
  if (!imgs) return '';
  return `<div class="modal-section">
    <div class="modal-section-label">Dokumentasi / Galeri Foto</div>
    <div class="modal-gallery">${imgs}</div>
  </div>`;
}

function normalizeDocumentEntries(item) {
  const docs = [];
  const seen = new Set();

  const addDoc = (title, file) => {
    if (!file || isP(file)) return;
    const normalizedFile = String(file).trim();
    if (!normalizedFile || seen.has(normalizedFile)) return;
    seen.add(normalizedFile);
    docs.push({
      title: title && !isP(title) ? String(title).trim() : 'Dokumen pendukung',
      file: normalizedFile,
    });
  };

  if (Array.isArray(item?.documents)) {
    item.documents.forEach(doc => {
      if (!doc || typeof doc !== 'object') {
        if (typeof doc === 'string') addDoc('Dokumen pendukung', doc);
        return;
      }
      addDoc(doc.title || doc.name || 'Dokumen pendukung', doc.file || doc.path || doc.url);
    });
  }

  if (item?.pdf && !isP(item.pdf)) addDoc(item.document_title || 'Dokumen pendukung', item.pdf);

  return docs;
}

function normalizeCertificateMedia(item) {
  const image = item?.certificate_image || item?.certificate_photo || item?.certificate_img || item?.certificate;
  const pdf = item?.certificate_pdf || item?.certificate_file || item?.certificate_document || item?.certificateDoc;

  return {
    image: image && !isP(image) ? String(image).trim() : '',
    pdf: pdf && !isP(pdf) ? String(pdf).trim() : '',
  };
}

function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim() || isP(value)) return '';

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

function normalizeExternalLinks(item) {
  if (!item || !Array.isArray(item.links)) return [];

  return item.links
    .map(link => {
      if (!link || (typeof link !== 'object' && typeof link !== 'string')) return null;
      if (typeof link === 'string') {
        const url = normalizeHttpUrl(link);
        return url ? { title: 'Tautan', type: 'Lainnya', url } : null;
      }

      const url = normalizeHttpUrl(link.url || link.href || link.link || link.target);
      if (!url) return null;
      const title = link.title || link.label || link.name || 'Tautan';
      const type = link.type || 'Lainnya';
      return { title: String(title).trim(), type: String(type).trim() || 'Lainnya', url };
    })
    .filter(Boolean);
}

function getLinkTypeLabel(type) {
  const value = String(type || '').trim().toLowerCase();
  if (!value) return 'Lainnya';
  if (value.includes('youtube')) return 'YouTube';
  if (value.includes('publikasi') || value.includes('jurnal')) return 'Publikasi/Jurnal';
  if (value.includes('website') || value.includes('proyek')) return 'Website/Proyek';
  if (value.includes('berita') || value.includes('media')) return 'Berita/Media';
  if (value.includes('drive') || value.includes('google')) return 'Google Drive';
  return 'Lainnya';
}

function getLinkTypeIcon(type) {
  const value = String(type || '').trim().toLowerCase();
  if (value.includes('youtube')) return '&#9654;';
  if (value.includes('publikasi') || value.includes('jurnal')) return '&#128218;';
  if (value.includes('website') || value.includes('proyek')) return '&#127760;';
  if (value.includes('berita') || value.includes('media')) return '&#128240;';
  if (value.includes('drive') || value.includes('google')) return '&#128193;';
  return '&#128279;';
}

function renderSupportDocumentList(item) {
  const docs = normalizeDocumentEntries(item);
  if (!docs.length) return '';

  return `
    <div class="modal-section">
      <div class="modal-section-label">Dokumen Pendukung</div>
      <div class="modal-doc-list">
        ${docs.map(doc => `
          <a href="${esc(doc.file)}" target="_blank" rel="noopener noreferrer" class="modal-doc-link">
            <span class="modal-doc-icon">&#128196;</span>
            <span>${esc(doc.title || 'Dokumen pendukung')}</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSupportCertificates(item) {
  const cert = normalizeCertificateMedia(item);
  if (!cert.image && !cert.pdf) return '';

  const preview = cert.image
    ? `<img src="${esc(cert.image)}" alt="Sertifikat" class="certificate-preview-image" loading="lazy" data-lightbox-src="${esc(cert.image)}">`
    : '';

  const pdfLink = cert.pdf
    ? `<a href="${esc(cert.pdf)}" target="_blank" rel="noopener noreferrer" class="modal-doc-link">
        <span class="modal-doc-icon">&#128206;</span>
        <span>Buka Sertifikat PDF</span>
      </a>`
    : '';

  return `
    <div class="modal-section">
      <div class="modal-section-label">Sertifikat</div>
      <div class="modal-doc-list">
        ${preview ? `<div class="certificate-preview">${preview}</div>` : ''}
        ${pdfLink}
      </div>
    </div>
  `;
}

function renderSupportLinks(item) {
  const links = normalizeExternalLinks(item);
  if (!links.length) return '';

  return `
    <div class="modal-section">
      <div class="modal-section-label">Dokumentasi dan Tautan Pendukung</div>
      <div class="modal-doc-list">
        ${links.map(link => {
          const type = getLinkTypeLabel(link.type);
          return `
            <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" class="modal-doc-link">
              <span class="modal-doc-icon">${getLinkTypeIcon(type)}</span>
              <span>${esc(link.title || type)}</span>
              <small>${esc(type)}</small>
            </a>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ── MODAL ────────────────────────────────────────────────── */
function openModal(html) {
  const overlay = document.getElementById('detail-modal');
  const body    = document.getElementById('detail-modal-body');
  if (!overlay || !body) return;
  body.innerHTML = html;
  initMediaPreviews(body);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('detail-modal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = document.getElementById('lightbox')?.classList.contains('open') ? 'hidden' : '';
}

/* ── LIGHTBOX ────────────────────────────────────────────── */
let lightboxImages = [];
let lightboxIndex = 0;

function showLightboxImage(index) {
  if (!lightboxImages.length) return;
  lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
  const img = document.getElementById('lightbox-img');
  if (img) img.src = lightboxImages[lightboxIndex];
  const multiple = lightboxImages.length > 1;
  document.getElementById('lightbox-prev')?.toggleAttribute('hidden', !multiple);
  document.getElementById('lightbox-next')?.toggleAttribute('hidden', !multiple);
}

function openLightbox(src, images = [src]) {
  if (!src || isP(src)) return;
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lightboxImages = images.filter(image => image && !isP(image));
  lightboxIndex = Math.max(0, lightboxImages.indexOf(src));
  showLightboxImage(lightboxIndex);
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function stepLightbox(direction) {
  if (lightboxImages.length > 1) showLightboxImage(lightboxIndex + direction);
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  const img = document.getElementById('lightbox-img');
  if (img) img.removeAttribute('src');
  lightboxImages = [];
  lightboxIndex = 0;
  document.body.style.overflow = document.getElementById('detail-modal')?.classList.contains('open') ? 'hidden' : '';
}

/* ── NAV ──────────────────────────────────────────────────── */
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  }));

  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-links a[href="#${e.target.id}"]`)?.classList.add('active');
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
}

/* ── MODALS INIT ──────────────────────────────────────────── */
function initModals() {
  const overlay = document.getElementById('detail-modal');
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  const lb = document.getElementById('lightbox');
  lb?.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev')?.addEventListener('click', () => stepLightbox(-1));
  document.getElementById('lightbox-next')?.addEventListener('click', () => stepLightbox(1));

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-lightbox-src]');
    if (!trigger) return;
    const src = trigger.dataset.lightboxSrc;
    const gallery = trigger.closest('.modal-gallery');
    const images = gallery
      ? [...gallery.querySelectorAll('[data-lightbox-src]')].map(image => image.dataset.lightboxSrc)
      : [src];
    openLightbox(src, images);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeLightbox();
    } else if (document.getElementById('lightbox')?.classList.contains('open')) {
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    }
  });
}

/* ── BERANDA ─────────────────────────────────────────────── */
async function renderBeranda() {
  const d = await loadJSON('content/profile/profile.json');
  if (!d) return;

  const el = id => document.getElementById(id);

  if (d.name)      { el('hero-name').textContent = d.name; document.title = `${d.name} — Portofolio`; }
  if (d.headline)  el('hero-headline').textContent = d.headline;
  if (d.education) el('hero-edu').textContent = d.education;
  if (d.bio)       el('hero-bio').textContent = d.bio;

  const introEl = el('hero-intro');
  if (introEl) {
    const introText = d.intro && !isP(d.intro) ? d.intro : '';
    introEl.textContent = introText;
    introEl.style.display = introText ? '' : 'none';
  }

  if (d.tagline && !isP(d.tagline)) el('hero-tagline').textContent = d.tagline;

  // Photo
  const photoWrap = el('hero-photo');
  if (photoWrap) {
    photoWrap.innerHTML = (d.photo && !isP(d.photo))
      ? `<img src="${esc(d.photo)}" alt="${esc(d.name)}" onerror="this.parentElement.innerHTML='<div class=\\'hero-photo-placeholder\\'>👤</div>'">`
      : `<div class="hero-photo-placeholder">👤</div>`;
  }

  // Interests
  const iEl = el('hero-interests');
  if (iEl && Array.isArray(d.interests)) {
    iEl.innerHTML = d.interests.map(i => `<span class="tag">${esc(i)}</span>`).join('');
  }

  // Buttons — fully CMS driven
  const btnPrimary   = el('btn-primary');
  const btnSecondary = el('btn-secondary');

  if (btnPrimary) {
    const label = d.button_primary_label;
    const link  = d.button_primary_link;
    if (!isP(label) && !isP(link)) {
      btnPrimary.textContent = label;
      btnPrimary.href = link;
      btnPrimary.style.display = 'inline-flex';
    } else {
      btnPrimary.style.display = 'none';
    }
  }
  if (btnSecondary) {
    if (!isP(d.button_secondary_label)) btnSecondary.textContent = d.button_secondary_label;
    if (!isP(d.button_secondary_link))  btnSecondary.href = d.button_secondary_link;
  }
}

/* ── SKILLS ──────────────────────────────────────────────── */
async function renderSkills() {
  const raw = await loadJSON('content/skills/skills.json');
  const hardGrid = document.getElementById('hard-skills-grid');
  const softGrid = document.getElementById('soft-skills-grid');
  const softLabel = document.getElementById('soft-skills-label');
  if (!raw || !hardGrid) return;

  // Hard skills
  const hardSkills = Array.isArray(raw) ? raw : (raw.hard_skills || raw.categories || []);
  hardGrid.innerHTML = hardSkills.map(cat => `
    <div class="skill-category">
      <div class="skill-cat-title">${esc(cat.category)}</div>
      <div class="skill-items">
        ${(cat.items || []).map(item => `
          <div class="skill-item">
            ${item.logo && !isP(item.logo)
              ? `<img src="${esc(item.logo)}" alt="${esc(item.name)}" class="skill-logo" onerror="this.outerHTML='<div class=\\'skill-logo-placeholder\\'>${esc(item.name.slice(0,2))}</div>'">`
              : `<div class="skill-logo-placeholder">${esc(item.name.slice(0,2))}</div>`}
            <div class="skill-info">
              <div class="skill-name">${esc(item.name)}</div>
              ${item.description ? `<div class="skill-desc">${esc(item.description)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');

  // Soft skills
  const softSkills = raw.soft_skills || [];
  const realSoft = softSkills.filter(s => !isP(s.name));
  if (realSoft.length > 0 && softGrid) {
    softGrid.innerHTML = realSoft.map(s => `
      <div class="soft-skill-card">
        <div class="soft-skill-name">${esc(s.name)}</div>
        ${s.description && !isP(s.description) ? `<div class="soft-skill-desc">${esc(s.description)}</div>` : ''}
      </div>`).join('');
  } else {
    softLabel?.remove();
    softGrid?.remove();
  }
}

/* ── EXP MODAL BUILDER ────────────────────────────────────── */
function buildExpModal(item, isOrg = false) {
  const institution = isOrg ? item.organization : item.institution;
  const deptLine = (!isOrg && item.department && !isP(item.department))
    ? ` <span style="color:var(--text-muted)">· ${esc(item.department)}</span>` : '';
  const locationLine = item.location && !isP(item.location)
    ? `<div class="modal-location">${esc(item.location)}</div>` : '';
  const cover = item.cover_photo && !isP(item.cover_photo)
    ? `<img class="exp-modal-cover" src="${esc(item.cover_photo)}" alt="${esc(item.position)}" data-lightbox-src="${esc(item.cover_photo)}">` : '';

  const respHtml = Array.isArray(item.responsibilities) && item.responsibilities.filter(r => !isP(r)).length
    ? `<div class="modal-section">
        <div class="modal-section-label">Tanggung Jawab</div>
        <ul class="modal-list">${item.responsibilities.filter(r => !isP(r)).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
       </div>` : '';

  const contribHtml = (item.contributions && !isP(item.contributions))
    ? `<div class="modal-section">
        <div class="modal-section-label">Kontribusi</div>
        <p class="modal-text">${esc(item.contributions)}</p>
       </div>` : '';

  const docHtml = renderSupportDocumentList(item);
  const certHtml = renderSupportCertificates(item);
  const linksHtml = renderSupportLinks(item);

  return `<div class="modal-inner">
    <div class="modal-badge">${isOrg ? 'Pengalaman Organisasi' : 'Pengalaman Kerja'}</div>
    <div class="modal-title">${ph(item.position)}</div>
    <div class="modal-subtitle">${ph(institution)}${deptLine}</div>
    <div class="modal-period">${periodStr(item.period_start, item.period_end)}</div>
    ${locationLine}
    ${cover}
    ${item.description && !isP(item.description)
      ? `<div class="modal-section"><div class="modal-section-label">Deskripsi</div><p class="modal-text">${esc(item.description)}</p></div>` : ''}
    ${respHtml}
    ${contribHtml}
    ${docHtml}
    ${certHtml}
    ${linksHtml}
    ${renderGallery(item.photos)}
  </div>`;
}

/* ── PENGALAMAN KERJA ────────────────────────────────────── */
async function renderWorkExperiences() {
  const raw = await loadJSON('content/work-experiences/work-experiences.json');
  const container = document.getElementById('work-cards');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.experiences || []);

  container.innerHTML = data.map((exp, idx) => `
    <div class="exp-card" data-exp-type="work" data-exp-idx="${idx}">
      ${renderThumbnail(exp.cover_photo, '', {
        containerClass: 'exp-card-cover',
        placeholderClass: 'exp-card-placeholder',
        placeholder: '💼',
        alt: exp.position || 'Dokumentasi pengalaman kerja',
        lightbox: false,
      })}
      <div class="exp-card-position">${ph(exp.position)}</div>
      <div class="exp-card-institution">${ph(exp.institution)}</div>
      <div class="exp-card-period">${periodStr(exp.period_start, exp.period_end)}</div>
      ${exp.description && !isP(exp.description)
        ? `<div class="exp-card-desc">${esc(exp.description)}</div>` : ''}
      <div class="exp-card-footer">
        <span class="exp-card-click-hint">Lihat detail →</span>
      </div>
    </div>`).join('');
  initMediaPreviews(container);

  container.addEventListener('click', e => {
    const card = e.target.closest('[data-exp-idx]');
    if (!card) return;
    openModal(buildExpModal(data[+card.dataset.expIdx], false));
  });
}

/* ── PENGALAMAN ORGANISASI ───────────────────────────────── */
async function renderOrganizations() {
  const raw = await loadJSON('content/organizations/organizations.json');
  const container = document.getElementById('org-cards');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.organizations || []);

  container.innerHTML = data.map((org, idx) => `
    <div class="exp-card" data-exp-type="org" data-exp-idx="${idx}">
      ${renderThumbnail(org.cover_photo, '', {
        containerClass: 'exp-card-cover',
        placeholderClass: 'exp-card-placeholder',
        placeholder: '🤝',
        alt: org.position || 'Dokumentasi organisasi',
        lightbox: false,
      })}
      <div class="exp-card-position">${ph(org.position)}</div>
      <div class="exp-card-institution">${ph(org.organization)}</div>
      <div class="exp-card-period">${periodStr(org.period_start, org.period_end)}</div>
      ${org.description && !isP(org.description)
        ? `<div class="exp-card-desc">${esc(org.description)}</div>` : ''}
      <div class="exp-card-footer">
        <span class="exp-card-click-hint">Lihat detail →</span>
      </div>
    </div>`).join('');
  initMediaPreviews(container);

  container.addEventListener('click', e => {
    const card = e.target.closest('[data-exp-idx]');
    if (!card) return;
    openModal(buildExpModal(data[+card.dataset.expIdx], true));
  });
}

/* ── PROJECTS ────────────────────────────────────────────── */
let allProjects = [];

async function renderProjects() {
  const raw = await loadJSON('content/projects/projects.json');
  const container = document.getElementById('projects-grid');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.projects || []);
  allProjects = data;

  container.innerHTML = data.map((proj, idx) => `
    <div class="project-card">
      ${renderThumbnail(proj.thumbnail, proj.media?.pdf, {
        containerClass: 'project-thumb',
        placeholderClass: 'project-thumb-placeholder',
        placeholder: '📊',
        alt: proj.title || 'Thumbnail proyek',
      })}
      <div class="project-body">
        <div class="project-category">${esc(proj.category || '')}</div>
        <div class="project-title">${esc(proj.title)}</div>
        <div class="project-desc">${esc(proj.description || '')}</div>
        <div class="project-tools">${(proj.tools || []).filter(t => !isP(t)).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${proj.role && !isP(proj.role) ? `<div class="project-role">Peran: <strong>${esc(proj.role)}</strong></div>` : ''}
        <div class="project-actions">
          <button class="btn btn-sm" data-proj-idx="${idx}">Lihat Detail</button>
          ${proj.media?.github && !isP(proj.media.github) ? `<a href="${esc(proj.media.github)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">GitHub</a>` : ''}
        </div>
      </div>
    </div>`).join('');
  initMediaPreviews(container);

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-proj-idx]');
    if (btn) openProjectModal(+btn.dataset.projIdx);
  });
}

function openProjectModal(idx) {
  const proj = allProjects[idx];
  if (!proj) return;
  const media = proj.media || {};

  const links = [
    media.github      && !isP(media.github)      ? `<a href="${esc(media.github)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">GitHub</a>` : '',
    media.colab       && !isP(media.colab)        ? `<a href="${esc(media.colab)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Colab</a>` : '',
    media.kaggle      && !isP(media.kaggle)       ? `<a href="${esc(media.kaggle)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Kaggle</a>` : '',
    media.huggingface && !isP(media.huggingface)  ? `<a href="${esc(media.huggingface)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Hugging Face</a>` : '',
    media.external    && !isP(media.external)     ? `<a href="${esc(media.external)}" target="_blank" rel="noopener" class="btn btn-sm">Buka Proyek</a>` : '',
    media.pdf         && !isP(media.pdf)          ? `<a href="${esc(media.pdf)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Unduh PDF</a>` : '',
  ].filter(Boolean);

  let embeds = '';
  if (media.youtube && !isP(media.youtube)) {
    const vid = extractYtId(media.youtube);
    if (vid) embeds += `<div class="modal-section"><div class="modal-section-label">Video</div><div class="modal-embed"><iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen title="Video proyek"></iframe></div></div>`;
  }
  if ((media.tableau || media.looker) && !isP(media.tableau || media.looker)) {
    embeds += `<div class="modal-section"><div class="modal-section-label">Dashboard</div><div class="modal-embed"><iframe src="${esc(media.tableau || media.looker)}" allowfullscreen title="Dashboard"></iframe></div></div>`;
  }
  if (media.pdf && !isP(media.pdf)) {
    embeds += `<div class="modal-section"><div class="modal-section-label">Dokumen PDF</div>
      <embed src="${esc(media.pdf)}" type="application/pdf" class="modal-pdf-preview">
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px">
        Jika tidak tampil, <a href="${esc(media.pdf)}" target="_blank">buka di sini</a>.</p></div>`;
  }

  openModal(`
    ${renderThumbnail(proj.thumbnail, media.pdf, {
      containerClass: 'project-detail-cover',
      placeholderClass: 'project-thumb-placeholder',
      placeholder: '📊',
      alt: proj.title || 'Thumbnail proyek',
    })}
    <div class="modal-inner">
      <div class="modal-badge">${esc(proj.category || '')}</div>
      <div class="modal-title">${esc(proj.title)}</div>
      ${proj.achievement ? `<div style="margin-bottom:10px"><span class="achievement-badge">${esc(proj.achievement)}</span></div>` : ''}
      ${proj.description ? `<p class="modal-text" style="margin-bottom:12px">${esc(proj.description)}</p>` : ''}

      ${proj.background && !isP(proj.background)
        ? `<div class="modal-section"><div class="modal-section-label">Latar Belakang & Tujuan</div><p class="modal-text">${esc(proj.background)}</p></div>` : ''}
      ${proj.methodology && !isP(proj.methodology)
        ? `<div class="modal-section"><div class="modal-section-label">Metodologi / Proses</div><p class="modal-text">${esc(proj.methodology)}</p></div>` : ''}
      ${proj.results && !isP(proj.results)
        ? `<div class="modal-section"><div class="modal-section-label">Hasil</div><p class="modal-text">${esc(proj.results)}</p></div>` : ''}

      <div class="modal-section">
        <div class="modal-section-label">Tools</div>
        <div class="modal-tools">${(proj.tools || []).filter(t => !isP(t)).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
      ${proj.role && !isP(proj.role) ? `<div class="modal-section"><div class="modal-section-label">Peran</div><p class="modal-text">${esc(proj.role)}</p></div>` : ''}
      ${links.length ? `<div class="modal-section"><div class="modal-section-label">Tautan</div><div class="modal-media-row">${links.join('')}</div></div>` : ''}
      ${renderGallery(proj.photos)}
      ${embeds}
    </div>`);
}

function extractYtId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ── CERTIFICATES ────────────────────────────────────────── */
async function renderCertificates() {
  const raw = await loadJSON('content/certificates/certificates.json');
  const container = document.getElementById('certs-grid');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.certificates || []);

  container.innerHTML = data.map(cert => `
    <div class="cert-card">
      ${renderThumbnail(cert.photo, cert.pdf, {
        containerClass: 'cert-thumb-wrap',
        placeholderClass: 'cert-thumb-placeholder',
        placeholder: '🏆',
        alt: cert.name || 'Sertifikat',
      })}
      <div class="cert-body">
        <div class="cert-name">${esc(cert.name)}</div>
        <div class="cert-issuer">${ph(cert.issuer)}</div>
        <div class="cert-date">${isP(cert.date) ? ph(cert.date || cert.year || '') : esc(cert.date || cert.year || '')}</div>
        <div class="cert-number">${cert.certificate_number && !isP(cert.certificate_number) ? `No. ${esc(cert.certificate_number)}` : ''}</div>
        <div class="cert-actions">
          ${cert.photo && !isP(cert.photo) ? `<button class="btn btn-sm btn-outline" data-lightbox-src="${esc(cert.photo)}">Lihat</button>` : ''}
          ${cert.pdf  && !isP(cert.pdf)   ? `<a href="${esc(cert.pdf)}" target="_blank" rel="noopener" class="btn btn-sm">PDF</a>` : ''}
          ${cert.verification_url && !isP(cert.verification_url) ? `<a href="${esc(cert.verification_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Verifikasi</a>` : ''}
        </div>
      </div>
    </div>`).join('');
  initMediaPreviews(container);
}

/* ── TRAININGS ────────────────────────────────────────────── */
async function renderTrainings() {
  const raw = await loadJSON('content/trainings/trainings.json');
  const container = document.getElementById('trainings-grid');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.trainings || []);

  container.innerHTML = data.map(tr => `
    <div class="cert-card">
      ${renderThumbnail(tr.certificate_photo || tr.photo, tr.certificate_pdf, {
        containerClass: 'cert-thumb-wrap',
        placeholderClass: 'cert-thumb-placeholder',
        placeholder: '📚',
        alt: tr.name || 'Dokumentasi pelatihan',
      })}
      <div class="cert-body">
        <div class="cert-name">${ph(tr.name)}</div>
        <div class="cert-issuer">${ph(tr.organizer)}</div>
        <div class="cert-date">${isP(tr.period_start) ? '' : `${esc(tr.period_start)}${tr.period_end && !isP(tr.period_end) ? ` – ${esc(tr.period_end)}` : ''}`}</div>
        ${tr.description && !isP(tr.description) ? `<div class="cert-number">${esc(tr.description)}</div>` : ''}
        <div class="cert-actions">
          ${(tr.certificate_photo || tr.photo) && !isP(tr.certificate_photo || tr.photo)
            ? `<button class="btn btn-sm btn-outline" data-lightbox-src="${esc(tr.certificate_photo || tr.photo)}">Lihat</button>` : ''}
          ${tr.certificate_pdf && !isP(tr.certificate_pdf) ? `<a href="${esc(tr.certificate_pdf)}" target="_blank" rel="noopener" class="btn btn-sm">PDF</a>` : ''}
        </div>
      </div>
    </div>`).join('');
  initMediaPreviews(container);
}

/* ── ACHIEVEMENTS ────────────────────────────────────────── */
async function renderAchievements() {
  const raw = await loadJSON('content/achievements/achievements.json');
  const container = document.getElementById('achievements-grid');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.achievements || []);

  container.innerHTML = data.map(ach => `
    <div class="achievement-card">
      <div class="achievement-title">${ph(ach.title)}</div>
      <div class="achievement-meta">
        ${!isP(ach.organizer) ? esc(ach.organizer) : ''}
        ${ach.year ? ` · ${esc(ach.year)}` : ''}
      </div>
      ${ach.achievement ? `<div class="achievement-badge">${esc(ach.achievement)}</div>` : ''}
      <div class="achievement-desc">${ach.description && !isP(ach.description) ? esc(ach.description) : ''}</div>
      ${ach.photo && !isP(ach.photo) ? `<img src="${esc(ach.photo)}" alt="Dokumentasi" class="achievement-photo" loading="lazy">` : ''}
      ${ach.certificate && !isP(ach.certificate) ? `<div style="margin-top:10px"><a href="${esc(ach.certificate)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Lihat Sertifikat</a></div>` : ''}
    </div>`).join('');
}

/* ── PUBLICATIONS ────────────────────────────────────────── */
let allPubs = [];

async function renderPublications() {
  const raw = await loadJSON('content/publications/publications.json');
  const container = document.getElementById('pub-list');
  if (!raw || !container) return;
  const data = Array.isArray(raw) ? raw : (raw.publications || []);
  allPubs = data;

  container.innerHTML = data.map((pub, idx) => `
    <div class="pub-card" data-pub-idx="${idx}">
      ${renderThumbnail(pub.poster || pub.photos?.[0], pub.pdf, {
        containerClass: 'pub-card-cover',
        placeholderClass: 'pub-card-placeholder',
        placeholder: '📄',
        alt: pub.title || 'Poster publikasi',
      })}
      <div class="pub-title">${ph(pub.title)}</div>
      <div class="pub-authors">${ph(pub.authors)}</div>
      <div class="pub-venue">
        ${isP(pub.venue) ? ph(pub.venue) : esc(pub.venue || '')}
        ${pub.year && !isP(pub.year) ? ` · ${esc(pub.year)}` : ''}
      </div>
      ${pub.abstract && !isP(pub.abstract) ? `<div class="pub-abstract">${esc(pub.abstract)}</div>` : ''}
      <div class="pub-actions">
        ${pub.doi && !isP(pub.doi) ? `<a href="https://doi.org/${encodeURIComponent(pub.doi)}" target="_blank" rel="noopener" class="btn btn-sm">DOI</a>` : ''}
        ${pub.url && !isP(pub.url) ? `<a href="${esc(pub.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Publikasi</a>` : ''}
        ${pub.pdf && !isP(pub.pdf) ? `<a href="${esc(pub.pdf)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">PDF</a>` : ''}
      </div>
      <div class="pub-open-hint">Klik untuk detail →</div>
    </div>`).join('');
  initMediaPreviews(container);

  container.addEventListener('click', e => {
    const card = e.target.closest('[data-pub-idx]');
    if (card && !e.target.closest('a, [data-lightbox-src]')) openPubModal(+card.dataset.pubIdx);
  });
}

function openPubModal(idx) {
  const pub = allPubs[idx];
  if (!pub) return;

  const ytId = pub.youtube && !isP(pub.youtube) ? extractYtId(pub.youtube) : null;
  const embedHtml = ytId
    ? `<div class="modal-section"><div class="modal-section-label">Video</div><div class="modal-embed"><iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen title="Video penelitian"></iframe></div></div>`
    : '';

  const links = [
    pub.doi && !isP(pub.doi) ? `<a href="https://doi.org/${encodeURIComponent(pub.doi)}" target="_blank" rel="noopener" class="btn btn-sm">DOI</a>` : '',
    pub.url && !isP(pub.url) ? `<a href="${esc(pub.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Buka Publikasi</a>` : '',
    pub.pdf && !isP(pub.pdf) ? `<a href="${esc(pub.pdf)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Unduh PDF</a>` : '',
    pub.poster && !isP(pub.poster) ? `<a href="${esc(pub.poster)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Lihat Poster</a>` : '',
  ].filter(Boolean);

  openModal(`<div class="modal-inner">
    <div class="modal-badge">Riset &amp; Publikasi</div>
    <div class="modal-title">${ph(pub.title)}</div>
    <div class="modal-subtitle">${ph(pub.authors)}</div>
    <div class="modal-period">${isP(pub.venue) ? '' : esc(pub.venue)}${pub.year && !isP(pub.year) ? ` · ${esc(pub.year)}` : ''}</div>
    ${pub.poster && !isP(pub.poster)
      ? `<img class="publication-poster" src="${esc(pub.poster)}" alt="${esc(pub.title)}" data-lightbox-src="${esc(pub.poster)}">` : ''}

    ${pub.abstract && !isP(pub.abstract)
      ? `<div class="modal-section"><div class="modal-section-label">Abstrak</div><p class="modal-text">${esc(pub.abstract)}</p></div>` : ''}
    ${pub.background && !isP(pub.background)
      ? `<div class="modal-section"><div class="modal-section-label">Latar Belakang & Tujuan</div><p class="modal-text">${esc(pub.background)}</p></div>` : ''}
    ${pub.methodology && !isP(pub.methodology)
      ? `<div class="modal-section"><div class="modal-section-label">Metode Penelitian</div><p class="modal-text">${esc(pub.methodology)}</p></div>` : ''}
    ${pub.results_summary && !isP(pub.results_summary)
      ? `<div class="modal-section"><div class="modal-section-label">Ringkasan Hasil</div><p class="modal-text">${esc(pub.results_summary)}</p></div>` : ''}
    ${links.length ? `<div class="modal-section"><div class="modal-section-label">Tautan</div><div class="modal-media-row">${links.join('')}</div></div>` : ''}
    ${renderGallery(pub.photos)}
    ${embedHtml}
  </div>`);
}

/* ── CONTACT ─────────────────────────────────────────────── */
async function renderContact() {
  const data = await loadJSON('content/contact/contact.json');
  const container = document.getElementById('contact-links');
  if (!data || !container) return;
  const links = [];

  if (data.email && !isP(data.email)) {
    links.push(`<a href="mailto:${esc(data.email)}" class="contact-card">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
      <span>${esc(data.email)}</span></a>`);
  }
  if (data.linkedin && !isP(data.linkedin)) {
    links.push(`<a href="${esc(data.linkedin)}" target="_blank" rel="noopener" class="contact-card">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
      <span>LinkedIn</span></a>`);
  }
  if (data.github && !isP(data.github)) {
    links.push(`<a href="${esc(data.github)}" target="_blank" rel="noopener" class="contact-card">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
      <span>GitHub</span></a>`);
  }
  if (Array.isArray(data.other_links)) {
    data.other_links.forEach(link => {
      if (link.url && !isP(link.url)) {
        links.push(`<a href="${esc(link.url)}" target="_blank" rel="noopener" class="contact-card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>${esc(link.label || link.url)}</span></a>`);
      }
    });
  }

  container.innerHTML = links.length
    ? links.join('')
    : `<p style="color:rgba(255,255,255,0.5);font-style:italic">Tambahkan informasi kontak melalui Pages CMS.</p>`;
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initModals();
  await Promise.all([
    renderBeranda(),
    renderSkills(),
    renderWorkExperiences(),
    renderOrganizations(),
    renderProjects(),
    renderCertificates(),
    renderTrainings(),
    renderAchievements(),
    renderPublications(),
    renderContact(),
  ]);
});
