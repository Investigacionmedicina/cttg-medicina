/* CTTG Medicina — comportamiento compartido del diseño.
   - Título de la barra superior según la sección activa (paneles con menú lateral).
   - Iniciales del usuario en el avatar.
   - Abrir una sección desde el enlace (#actas, #comite…).
   - Menú lateral en móvil.
   - Menú lateral en las páginas secundarias de coordinación (body[data-menu="staff"]). */
(function () {
  'use strict';

  const ICONOS = {
    inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    terminados: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',
    alertas: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    tutores: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    cambios: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    diplomado: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    seguimiento: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    filtros: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    informes: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16v-5M12 16V8M17 16v-3"/>',
  };
  function icono(nombre) {
    return '<svg class="sb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONOS[nombre] || '') + '</svg>';
  }
  window.cttgIcono = icono;

  // ---- Iniciales del usuario en el avatar ----
  function iniciales(txt) {
    const t = String(txt || '').replace(/[—-]/g, ' ').trim();
    if (!t) return '';
    const base = t.includes('@') ? t.split('@')[0].replace(/[._]/g, ' ') : t;
    const p = base.split(/\s+/).filter(Boolean);
    return ((p[0] || '')[0] || '').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase();
  }
  function marcarAvatar(el) {
    const ini = iniciales(el.textContent);
    if (ini) el.setAttribute('data-ini', ini); else el.removeAttribute('data-ini');
  }
  document.querySelectorAll('.user-chip').forEach(el => {
    marcarAvatar(el);
    new MutationObserver(() => marcarAvatar(el)).observe(el, { childList: true, characterData: true, subtree: true });
  });

  // ---- Título de la barra superior ----
  const titulo = document.getElementById('tituloVista');
  function textoBoton(btn) {
    if (!btn) return '';
    const c = btn.cloneNode(true);
    c.querySelectorAll('.sb-n,.badge-count,svg').forEach(n => n.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  if (titulo && typeof window.switchPanel === 'function') {
    const original = window.switchPanel;
    window.switchPanel = function (nombre, btn) {
      const r = original.apply(this, arguments);
      const activo = document.querySelector('.sidebar .main-tab.on') || btn;
      const t = textoBoton(activo);
      if (t) titulo.textContent = nombre === 'inicio' ? saludo() : t;
      document.body.classList.remove('menu-abierto');
      const main = document.querySelector('.app-main main');
      if (main) window.scrollTo({ top: 0 });
      return r;
    };
  }
  function saludo() {
    const h = new Date().getHours();
    return (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches') + (titulo && titulo.dataset.quien ? ', ' + titulo.dataset.quien : '');
  }
  if (titulo && titulo.dataset.saludo === '1') titulo.textContent = saludo();

  // ---- Abrir sección desde el enlace (#actas, #comite, …) ----
  function abrirDesdeHash() {
    const h = (location.hash || '').replace('#', '');
    if (!h || typeof window.switchPanel !== 'function') return;
    const btn = document.querySelector('.sidebar .main-tab[data-panel="' + h + '"]');
    if (btn) window.switchPanel(h, btn);
  }
  window.addEventListener('hashchange', abrirDesdeHash);
  if (location.hash) setTimeout(abrirDesdeHash, 0);

  // ---- Menú en móvil ----
  document.addEventListener('click', e => {
    if (e.target.closest('.menu-movil')) { document.body.classList.toggle('menu-abierto'); return; }
    if (document.body.classList.contains('menu-abierto') && !e.target.closest('.sidebar')) document.body.classList.remove('menu-abierto');
  });

  // ---- Menú lateral en páginas secundarias de coordinación ----
  if (document.body.dataset.menu === 'staff') {
    let rol = '';
    try { rol = String((JSON.parse(localStorage.getItem('cttg_admin') || 'null') || {}).rol || '').toLowerCase(); } catch (e) {}
    const panel = rol === 'coordinadora' || !rol ? 'coordinadora_dashboard.html' : 'asistente_dashboard.html';
    const actual = document.body.dataset.menuActivo || '';
    const item = (clave, texto, pre) =>
      '<a href="' + panel + '#' + clave + '"' + (actual === clave ? ' class="on"' : '') + '>' + pre + texto + '</a>';
    const n = k => '<span class="sb-n">' + k + '</span>';
    const html =
      '<div class="sb-marca"><div class="sb-sello">M</div><div><b>CTTG Medicina</b><span>' + (panel.startsWith('coord') ? 'Coordinación' : 'Asistencia') + '</span></div></div>' +
      '<div class="sb-grupo"><h6>General</h6><nav class="sb-nav">' + item('inicio', 'Inicio', icono('inicio')) + '</nav></div>' +
      '<div class="sb-grupo"><h6>Proceso</h6><nav class="sb-nav">' +
        item('rad', 'Radicaciones', n(1)) + item('actas', 'Actas de asesoría', n(2)) + item('protocolo', 'Protocolo', n(3)) +
        item('comite', 'Comité técnico', n(4)) + item('fase3', 'Sustentación', n(5)) + item('terminados', 'Terminados', icono('terminados')) +
      '</nav></div>' +
      '<div class="sb-grupo"><h6>Gestión</h6><nav class="sb-nav">' +
        item('alertas', 'Alertas', icono('alertas')) + item('tutores', 'Tutores', icono('tutores')) +
        item('seguimiento', 'Seguimiento', icono('seguimiento')) + item('informes', 'Informes', icono('informes')) +
      '</nav></div>';
    const app = document.createElement('div'); app.className = 'app';
    const aside = document.createElement('aside'); aside.className = 'sidebar'; aside.innerHTML = html;
    const cont = document.createElement('div'); cont.className = 'app-main';
    while (document.body.firstChild) cont.appendChild(document.body.firstChild);
    app.appendChild(aside); app.appendChild(cont);
    document.body.appendChild(app);
    const hdr = cont.querySelector(':scope > header');
    if (hdr && !hdr.querySelector('.menu-movil')) {
      const b = document.createElement('button'); b.className = 'menu-movil'; b.type = 'button'; b.setAttribute('aria-label', 'Abrir menú'); b.textContent = '☰';
      hdr.insertBefore(b, hdr.firstChild);
    }
  }
})();
