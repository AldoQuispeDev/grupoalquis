/* App Grupo Alquis Perú — lógica del celular (JavaScript sin frameworks) */
(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};
  var DEMO = !CFG.API_URL;
  var TIPOS = ['Terreno', 'Casa', 'Departamento', 'Local'];
  var OPERACIONES = ['Venta', 'Alquiler'];
  var ESTADOS_PROP = ['Disponible', 'Pendiente', 'Reservado', 'Vendido', 'Alquilado'];
  var ESTADOS_CITA = ['Pendiente', 'Realizada', 'Cancelada'];
  var TIPOS_CITA = ['Visita', 'Captación', 'Reunión'];
  var CLASE_CITA = { 'Visita': 'visita', 'Captación': 'captacion', 'Reunión': 'reunion' };
  var CONTACTO_DE_CITA = { 'Visita': 'interesado', 'Captación': 'propietario' };
  var AYUDA_CITA = { 'Visita': 'Con un interesado, para mostrarle una propiedad.', 'Captación': 'Con un propietario, para conocer o captar su propiedad.', 'Reunión': 'Con cualquier contacto: interesado, propietario u otro.' };
  var ESTADOS_RESERVA = ['Activa', 'Concretada', 'Cancelada'];
  // Temperatura del interesado: los botones van de Frío a Caliente; las listas ordenan de Caliente a Frío.
  var TEMPERATURAS = ['Frío', 'Tibio', 'Caliente'];
  var RANGO_TEMP = { 'Caliente': 0, 'Tibio': 1, 'Frío': 2 };
  var CLASE_TEMP = { 'Frío': 'frio', 'Tibio': 'tibio', 'Caliente': 'caliente' };
  var AYUDA_TEMP = { 'Frío': 'Aún no conoce la propiedad', 'Tibio': 'Ya la conoce y está algo interesado', 'Caliente': 'Tiene interés real en comprar' };
  var EMOJI_TEMP = { 'Frío': '❄️', 'Tibio': '🌤️', 'Caliente': '🔥' };
  var QUE_PASO = [['realizada', 'Se realizó'], ['reprogramada', 'Se reprogramó'], ['noAsistio', 'No asistió']];
  var ESTADO_CITA_SEGUN = { realizada: 'Realizada', reprogramada: 'Pendiente', noAsistio: 'Cancelada' };
  // Seguimiento del cliente. Sin valor (clientes antiguos) cuenta como "Activo".
  var ESTADOS_SEG = ['Activo', 'En espera', 'Compró', 'Descartado'];
  var AVISO = 'Te aviso cuando lo tenga';
  // "¿Cómo te fue?" rápido: respuestas de un toque y la temperatura que sugieren.
  var RESPUESTAS = [['Le gustó', 'Tibio'], ['Lo pensará', 'Tibio'], ['Quiere volver a verla', 'Caliente'], ['Va a separar', 'Caliente'], ['Le pareció caro', 'Frío'], ['No le interesó', 'Frío'], [AVISO, '']];
  var RESPUESTAS_OTRO = ['Todo bien', 'Lo pensará', 'Hay que volver a reunirse', 'No le interesó'];
  var HORAS = ['09:00', '10:00', '11:00', '15:00', '16:00', '17:00'];
  var MOTIVOS = ['Seguimiento', 'Confirmar cita', 'Enviar información', 'Negociar precio', 'Avisar nueva opción'];
  var ICONO_TIPO = { Terreno: 'terreno', Casa: 'casa', Departamento: 'depto', Local: 'local' };
  // Pantallas con formulario: al llegar datos nuevos en segundo plano no se vuelven a pintar.
  var FORMULARIOS = ['contacto-form', 'cita-nueva', 'cita', 'llamada-nueva', 'llamada', 'reserva-nueva', 'reserva', 'como-te-fue', 'propiedad-form', 'agente-form', 'agente', 'cambiar-contrasena', 'asignar'];
  var TABLA_DE = { propietario: 'Propietarios', interesado: 'Interesados', otro: 'OtrosContactos' };
  var NOMBRE_TIPO = { propietario: 'Propietario', interesado: 'Interesado', otro: 'Otro' };
  var MARCA = 'Grupo Alquis Perú';
  var MIN_CONTRASENA = 8;
  var ROL_ADMIN = 'Administrador';
  var REDES = [['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['instagram', 'Instagram']];

  var S = {
    token: leerLocal('inmo_token') || '',
    agente: leerJSON('inmo_agente'),
    filtroAgente: '',
    db: leerJSON('inmo_cache'),
    pub: null,
    cargandoDb: false,
    filtrosProp: { q: '', tipo: '', estado: '', operacion: '', zona: '', precioMax: '', abierto: false },
    filtrosPub: { estado: '', operacion: '', tipo: '', zona: '', precioMax: '' },
    tabContactos: 'interesado',
    qContactos: '',
    filtroTemp: '',
    verPasadas: false,
    verHechas: false,
    v: 0,          // versión de los datos: sube con cada cambio
    memo: {},      // cálculos guardados para la versión actual
    lim: {},       // cuántos elementos mostrar en cada lista larga
    menu: [],      // acciones del menú "⋯" de la pantalla actual
    ultima: '',    // última dirección pintada (para conservar el desplazamiento)
    borrador: null // datos de un guardado que falló, para corregirlos
  };

  /* ================= Utilidades ================= */

  function leerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarLocal(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function leerJSON(k) { try { return JSON.parse(leerLocal(k) || 'null'); } catch (e) { return null; } }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, ''));
    return isNaN(n) ? null : n;
  }
  function dinero(v) {
    var n = num(v);
    if (n == null) return '';
    return 'S/ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function lista(t) { return String(t || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function iniciales(n) {
    var p = String(n || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function urlSegura(u) { u = String(u || '').trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  function marca(c) { return c && c.negocio && c.negocio !== 'Mi Inmobiliaria' ? c.negocio : MARCA; }
  function soloDigitos(t) { return String(t || '').replace(/\D/g, ''); }
  function normalizar(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function nombreCorto(n) { return String(n || '').trim().split(/\s+/)[0]; }
  // 987654321 → "987 654 321"; +51987654321 → "+51 987 654 321".
  function fmtCel(v) {
    var t = String(v || '').trim(), mas = t.charAt(0) === '+', d = soloDigitos(t), pre = '';
    if (mas && d.length > 9) { pre = '+' + d.slice(0, d.length - 9) + ' '; d = d.slice(-9); }
    return (mas && !pre ? '+' : '') + pre + d.replace(/(\d{3})(?=\d)/g, '$1 ');
  }
  // 120000 → "120 000".
  function fmtMiles(v) {
    var p = String(v || '').replace(/[^\d.]/g, '').split('.');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p.length > 1 ? '.' + p[1] : '');
  }
  function telLink(cel) { var d = soloDigitos(cel); return d ? 'tel:' + d : ''; }
  function wspLink(cel, texto) {
    var d = soloDigitos(cel);
    if (!d) return '';
    if (d.length === 9) d = '51' + d;
    return 'https://wa.me/' + d + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoFecha(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hoy() { return isoFecha(new Date()); }
  function sumarDias(iso, n) { var d = aFecha(iso); d.setDate(d.getDate() + n); return isoFecha(d); }
  function aFecha(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esIso(t) { return /^\d{4}-\d{2}-\d{2}$/.test(String(t)); }
  function fechaTexto(iso) { var d = aFecha(iso); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function fechaLarga(iso) {
    if (!esIso(iso)) return iso || '';
    return mayus(fechaTexto(iso));
  }
  function fechaCorta(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso || 'Sin fecha';
    if (iso === hoy()) return 'Hoy';
    if (iso === sumarDias(hoy(), 1)) return 'Mañana';
    var d = aFecha(iso);
    return mayus(DIAS[d.getDay()].slice(0, 3)) + ' ' + d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3);
  }
  function saludo() {
    var h = new Date().getHours();
    return h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
  }

  // Aviso breve abajo. Con una acción muestra un botón y espera un poco más antes de irse solo.
  function toast(msg, accion, fn) {
    var t = document.getElementById('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (accion ? '<button type="button">' + esc(accion) + '</button>' : '');
    t.classList.toggle('con-accion', !!accion);
    if (accion) t.lastChild.onclick = function () { t.classList.remove('ver'); fn(); };
    t.classList.add('ver');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('ver'); }, accion ? 7000 : 2600);
  }

  // Panel inferior: se cierra tocando fuera, deslizando hacia abajo o con Escape.
  function hoja(html, alMontar) {
    if (S.cerrarHoja) S.cerrarHoja();
    var antes = document.activeElement, velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = '<div class="hoja" role="dialog" aria-modal="true" tabindex="-1"><span class="asa" aria-hidden="true"></span>' + html + '</div>';
    document.body.appendChild(velo);
    var h = velo.firstChild, y0 = null, dy = 0;
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    function cerrar() {
      velo.remove(); S.cerrarHoja = null;
      document.removeEventListener('keydown', tecla);
      if (antes && document.contains(antes)) antes.focus({ preventScroll: true });
    }
    S.cerrarHoja = cerrar;
    document.addEventListener('keydown', tecla);
    velo.onclick = function (e) { if (e.target === velo) cerrar(); };
    h.addEventListener('touchstart', function (e) { y0 = h.scrollTop > 0 ? null : e.touches[0].clientY; dy = 0; }, { passive: true });
    h.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); h.style.transform = dy ? 'translateY(' + dy + 'px)' : ''; }, { passive: true });
    h.addEventListener('touchend', function () { if (dy > 70) cerrar(); else h.style.transform = ''; y0 = null; });
    h.focus({ preventScroll: true });
    if (alMontar) alMontar(h, cerrar);
    return cerrar;
  }
  // Menú "⋯" y paneles de opciones: cada acción es [texto, #ruta o función, clase ("peligro" o "destacado")].
  function abrirMenu(items, titulo) {
    hoja((titulo || '') + '<div class="menu-lista">' + items.map(function (x, i) {
      return '<button type="button" class="menu-item' + (x[2] ? ' ' + x[2] : '') + '" data-i="' + i + '">' + esc(x[0]) + '</button>';
    }).join('') + '</div>', function (h, cerrar) {
      h.querySelectorAll('[data-i]').forEach(function (b) {
        b.onclick = function () { var x = items[b.dataset.i]; cerrar(); if (typeof x[1] === 'function') x[1](); else ir(x[1]); };
      });
    });
  }
  function botonMenu(items) {
    S.menu = items;
    return '<button class="btn-icono borde" type="button" data-a="menu" aria-label="Más opciones">' + ic('puntos', 22) + '</button>';
  }
  function cargando(si) { document.getElementById('cargando').hidden = !si; }

  /* ================= Íconos ================= */

  var IC = {
    mas: '<path d="M12 5v14M5 12h14"/>',
    atras: '<path d="M15 5l-7 7 7 7"/>',
    tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    wsp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 1.8 1.7 3.3 3.5 4l1.2-1.2 2 1-.4 1.5c-3.3.2-6.4-2.8-6.3-6.1L10.5 8l1 2z"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    casa: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    gente: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
    edificio: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    terreno: '<path d="M3 18l5-9 4 6 3-4 6 7z"/><path d="M3 21h18"/>',
    depto: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    local: '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5"/>',
    estrella: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    megafono: '<path d="M4 10v4h3l7 4V6L7 10zM17 9a4 4 0 0 1 0 6"/>',
    lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5"/>',
    salir: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
    recargar: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    llamadas: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/><path d="M15 3.5a5.5 5.5 0 0 1 5.5 5.5"/>',
    flecha: '<path d="M9 5l7 7-7 7"/>',
    puntos: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    llave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
    reserva: '<path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    ojoNo: '<path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.6M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    facebook: '<path fill="currentColor" stroke="none" d="M13.4 21v-7.6H16l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6V21z"/>',
    tiktok: '<path fill="currentColor" stroke="none" d="M16.3 3c.3 2.3 1.6 3.7 3.9 3.9v3a7 7 0 0 1-3.8-1.2v6.2A5.6 5.6 0 1 1 11 9.3c.3 0 .6 0 .9.1v3.1a2.6 2.6 0 1 0 1.8 2.5V3z"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>'
  };
  function ic(n, t) {
    t = t || 22;
    return '<svg width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';
  }
  function icTipo(tipo) { return '<span class="tipo-icono">' + ic(ICONO_TIPO[tipo] || 'edificio', 26) + '</span>'; }

  /* ================= Coincidencias (recomendaciones) ================= */

  function coincidencia(int, p) {
    var razones = [], gan = 0, pos = 0;
    function crit(peso, estado, texto) {
      pos += peso;
      if (estado === 'si') gan += peso;
      else if (estado === 'medio') gan += peso / 2;
      razones.push({ e: estado, t: texto });
    }
    if (int.Operacion) {
      if (p.Operacion && p.Operacion !== int.Operacion) return null;
      crit(10, p.Operacion ? 'si' : '?', p.Operacion ? p.Operacion : 'Operación sin dato');
    }
    if (int.Tipo) {
      if (p.Tipo && p.Tipo !== int.Tipo) return null;
      crit(20, p.Tipo ? 'si' : '?', p.Tipo || 'Tipo sin dato');
    }
    var zonas = lista(int.Zonas);
    if (zonas.length) {
      if (!p.Zona) crit(25, '?', 'Zona sin dato');
      else crit(25, zonas.indexOf(p.Zona) >= 0 ? 'si' : 'no', p.Zona);
    }
    var pres = num(int.PresupuestoMax), precio = num(p.Precio);
    if (pres != null) {
      if (precio == null) crit(25, '?', 'Precio sin dato');
      else if (precio <= pres) crit(25, 'si', 'Dentro del presupuesto');
      else if (precio <= pres * 1.1) crit(25, 'medio', 'Un poco sobre el presupuesto');
      else return null;
    }
    var amin = num(int.AreaMin), area = num(p.Area);
    if (amin != null) {
      if (area == null) crit(10, '?', 'Área sin dato');
      else crit(10, area >= amin ? 'si' : 'no', area + ' m²');
    }
    var dmin = num(int.DormitoriosMin), dorm = num(p.Dormitorios);
    if (dmin != null) {
      if (dorm == null) crit(5, '?', 'Dormitorios sin dato');
      else crit(5, dorm >= dmin ? 'si' : 'no', dorm + ' dorm.');
    }
    var desea = lista(int.Caracteristicas), tiene = lista(p.Caracteristicas);
    if (desea.length) {
      var peso = 15 / desea.length;
      desea.forEach(function (c) { crit(peso, tiene.indexOf(c) >= 0 ? 'si' : 'no', c); });
    }
    return { puntaje: pos ? Math.round(gan / pos * 100) : null, razones: razones };
  }

  function recomendarPara(int, props) {
    return props.filter(function (p) { return p.Estado === 'Disponible' || p.Estado === undefined; })
      .map(function (p) { var m = coincidencia(int, p); return m ? { p: p, m: m } : null; })
      .filter(function (x) { return x && (x.m.puntaje == null || x.m.puntaje >= 40); })
      .sort(function (a, b) { return (b.m.puntaje || 0) - (a.m.puntaje || 0); });
  }

  // Compró y Descartado ya no entran en las recomendaciones.
  function interesadosPara(p, ints) {
    return ints.filter(enSeguimiento).map(function (i) { var m = coincidencia(i, p); return m ? { i: i, m: m } : null; })
      .filter(function (x) { return x && x.m.puntaje != null && x.m.puntaje >= 40; })
      .sort(function (a, b) { return RANGO_TEMP[temperatura(a.i)] - RANGO_TEMP[temperatura(b.i)] || b.m.puntaje - a.m.puntaje; });
  }

  var CAMPOS_BUSCA = ['Operacion', 'Tipo', 'Zonas', 'PresupuestoMax', 'AreaMin', 'DormitoriosMin', 'Caracteristicas'];
  function tieneBusqueda(i) { return CAMPOS_BUSCA.some(function (k) { return String(i[k] || '').trim(); }); }
  function estadoSeg(i) { return ESTADOS_SEG.indexOf(i.EstadoSeguimiento) >= 0 ? i.EstadoSeguimiento : 'Activo'; }
  function enSeguimiento(i) { var e = estadoSeg(i); return e === 'Activo' || e === 'En espera'; }
  function coincide60(i, p) { var m = coincidencia(i, p); return !!m && m.puntaje >= 60; }
  // Propiedades disponibles del mismo agente que le coinciden al 60 % o más.
  function coincidenFuerte(i) {
    if (!tieneBusqueda(i)) return [];
    return T('Propiedades').filter(function (p) { return p.Estado === 'Disponible' && p.ID_Agente === i.ID_Agente && coincide60(i, p); });
  }
  // Las que todavía no se le ofrecieron a un cliente "En espera".
  function nuevasOpciones(i) {
    var ya = lista(i.OpcionesAvisadas);
    return coincidenFuerte(i).filter(function (p) { return ya.indexOf(p.ID) < 0; });
  }
  // Clientes "En espera" que buscan algo como esta propiedad (el administrador ve los de todos).
  function esperandoPara(p) {
    return T('Interesados').filter(function (i) { return estadoSeg(i) === 'En espera' && tieneBusqueda(i) && coincide60(i, p); });
  }
  function ids(arr) { return arr.map(function (x) { return x.ID; }).join(', '); }
  // "Te aviso cuando lo tenga": lo que coincide hoy queda como ya visto, así solo aparecen las nuevas.
  function marcarEnEspera(i) {
    guardarRegistro('Interesados', { ID: i.ID, EstadoSeguimiento: 'En espera', OpcionesAvisadas: ids(coincidenFuerte(i)) });
  }
  // Al registrar una propiedad o volverla disponible: ¿algún cliente en espera la busca?
  function alertaEspera(p) {
    var n = p.Estado === 'Disponible' ? esperandoPara(p).length : 0;
    if (n) toast(plural(n, 'cliente en espera busca', 'clientes en espera buscan') + ' algo así', 'Verlos', function () { ir('#/a/propiedad/' + p.ID + '?espera=1'); });
    return n;
  }

  function htmlRazones(rs) {
    return '<div class="razones">' + rs.map(function (r) {
      var c = r.e === 'si' ? 'si' : (r.e === 'no' ? 'no' : (r.e === 'medio' ? 'medio' : ''));
      var s = r.e === 'si' ? '✓ ' : (r.e === 'no' ? '✗ ' : (r.e === 'medio' ? '≈ ' : '? '));
      return '<span class="razon ' + c + '">' + s + esc(r.t) + '</span>';
    }).join('') + '</div>';
  }
  function htmlPuntaje(m) {
    if (m.puntaje == null) return '<span class="puntaje medio"><small>Sin</small><small>criterios</small></span>';
    return '<span class="puntaje' + (m.puntaje < 70 ? ' medio' : '') + '">' + m.puntaje + '<small>%</small></span>';
  }

  /* ================= Conexión con el servidor ================= */

  function api(accion, data) {
    // En el modo demo la respuesta también llega después, como desde internet: la pantalla no se traba.
    var pedido = DEMO ? new Promise(function (ok) { setTimeout(function () { ok(Demo.manejar({ action: accion, token: S.token, data: data || {} })); }); }) : fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: accion, token: S.token, data: data || {} })
    }).then(function (r) { return r.json(); }).catch(function () {
      return { ok: false, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' };
    });
    return pedido.then(function (r) {
      if (r && r.auth === false && S.token) sesionVencida();
      if (r && r.cambiar && S.agente) { S.agente.debeCambiar = true; recordarAgente(S.agente); ir('#/a/cambiar-contrasena'); }
      return r;
    });
  }

  // Trae todo del servidor en segundo plano. Mientras tanto se ve lo guardado en el celular.
  function cargarDb(forzar) {
    if (S.cargandoDb) return;
    if (S.db && !forzar && S.db._t && Date.now() - S.db._t < 30000) return;
    S.cargandoDb = true;
    api('todo').then(function (r) {
      S.cargandoDb = false;
      if (!r.ok) { if (r.auth !== false && !r.cambiar && !S.db) toast(r.error || 'No se pudieron cargar los datos.'); return; }
      if (S.db) delete S.db._t;
      var antes = S.db ? JSON.stringify(S.db) : '';
      S.db = r.data;
      COLA.forEach(aplicar); // lo que aún no llega al servidor se sigue viendo
      if (r.data.yo) recordarAgente(r.data.yo);
      var cambio = JSON.stringify(S.db) !== antes;
      S.db._t = Date.now();
      cambiaron();
      if (cambio) refrescar();
    });
  }
  // Vuelve a pintar la pantalla con los datos nuevos, salvo que el agente esté escribiendo o en un panel.
  function refrescar() {
    var a = document.activeElement;
    if (S.cerrarHoja || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) || FORMULARIOS.indexOf(ruta().partes[1]) >= 0) return;
    render();
  }
  // La copia completa en el celular se hace justo después de pintar: con muchos datos tarda.
  // Lo pendiente no se pierde: la cola se guarda en el acto y se vuelve a aplicar al abrir.
  function cambiaron() {
    S.v++;
    clearTimeout(S.tCache);
    S.tCache = setTimeout(function () { if (S.db) guardarLocal('inmo_cache', JSON.stringify(S.db)); }, 250);
  }
  function poner(tabla, reg) {
    var arr = S.db[tabla] || (S.db[tabla] = []), i = arr.findIndex(function (x) { return x.ID === reg.ID; });
    if (i >= 0) arr[i] = reg; else arr.push(reg);
  }
  function ponerEnCache(tabla, reg) { poner(tabla, reg); cambiaron(); }
  // Guarda cálculos (Inicio, coincidencias, buscador) hasta que cambien los datos o pase un minuto.
  function memo(k, fn) {
    var v = S.v + ':' + Math.floor(Date.now() / 60000);
    if (S.memo.v !== v) S.memo = { v: v };
    return k in S.memo ? S.memo[k] : (S.memo[k] = fn());
  }

  /* ================= Guardado al instante ================= */
  // Lo que guarda el agente se ve en el acto y se envía al servidor en segundo plano, todo junto
  // en una sola petición. La cola queda en el celular (una por agente): si se corta la señal,
  // se envía al volver. Los registros nuevos usan un ID temporal hasta que el servidor da el real.

  var COLA = [];
  function claveCola() { return 'inmo_cola_' + (S.agente ? S.agente.ID : ''); }
  function cargarCola() { COLA = S.agente ? leerJSON(claveCola()) || [] : []; }
  function guardarCola() { if (S.agente) guardarLocal(claveCola(), COLA.length ? JSON.stringify(COLA) : null); }
  function ahoraTexto() { var d = new Date(); return hoy() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  // Aplica una acción en los datos del celular, igual que lo hará el servidor.
  function aplicar(op) {
    var d = op.datos;
    if (op.accion === 'guardar') {
      var prev = buscarId(op.tabla, d.ID || op.tmp);
      var reg = Object.assign({}, prev || { ID_Agente: S.agente.ID, FechaRegistro: ahoraTexto() }, d, { ID: d.ID || op.tmp });
      if (op.tabla === 'Interesados' && !prev) { reg.Temperatura = reg.Temperatura || 'Frío'; reg.EstadoSeguimiento = reg.EstadoSeguimiento || 'Activo'; }
      if (op.tabla === 'Citas' && reg.TipoContacto === 'Interesado') reg.ID_Interesado = reg.ID_Contacto;
      return poner(op.tabla, reg);
    }
    var c = buscarId('Citas', d.ID);
    if (!c) return;
    var cita = Object.assign({}, c, { Estado: ESTADO_CITA_SEGUN[d.Que], Resultado: d.Que === 'noAsistio' ? textoNoAsistio(d.Resultado) : d.Resultado || '' });
    if (d.Que === 'reprogramada') { cita.Fecha = d.Fecha; cita.Hora = d.Hora || ''; }
    poner('Citas', cita);
    var k = contactoDeCita(c), ct = contacto(k.tipo, k.id);
    if (d.Interesado && ct && k.tipo === 'interesado') poner('Interesados', Object.assign({}, ct, d.Interesado));
    if (d.Llamada && ct) poner('Llamadas', { ID: op.tmp, TipoContacto: NOMBRE_TIPO[k.tipo], ID_Contacto: k.id, ID_Propiedad: c.ID_Propiedad, Motivo: d.Llamada.Motivo || '', Fecha: d.Llamada.Fecha || '', Estado: 'Pendiente', ID_Agente: c.ID_Agente, FechaRegistro: ahoraTexto() });
  }

  // Devuelve el ID del registro (temporal si es nuevo). "ruta" sirve para reabrir el formulario si falla.
  function encolar(op) {
    op.datos = JSON.parse(JSON.stringify(op.datos), function (k, x) { return REALES[x] || x; });
    if (op.accion === 'guardar' ? !op.datos.ID : op.datos.Llamada) op.tmp = 'TMP-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    aplicar(op);
    COLA.push(op);
    guardarCola(); cambiaron(); enviar();
    return op.accion === 'guardar' ? op.datos.ID || op.tmp : op.datos.ID;
  }
  function guardarRegistro(tabla, datos, ruta) { return encolar({ accion: 'guardar', tabla: tabla, datos: datos, ruta: ruta }); }

  function enviar() {
    if (S.enviando || !COLA.length || !S.token) return;
    S.enviando = true;
    var lote = COLA.slice();
    api('lote', { ops: lote }).then(function (r) {
      S.enviando = false;
      if (!r.ok) {
        if (r.auth !== false && !r.cambiar) toast('Sin señal: lo guardado está seguro en tu celular y se enviará cuando vuelva.', 'Reintentar', enviar);
        return avisarVacia(false);
      }
      var recargar = false, error = null;
      r.data.forEach(function (res, i) {
        var op = lote[i];
        if (res.omitida || COLA.indexOf(op) < 0) return; // depende de otra: se reintenta con ella
        if (res.duplicado && confirm(res.error + '\n\n¿Guardar de todas formas?')) { op.confirmarDuplicado = true; return; }
        if (res.ok) { COLA.splice(COLA.indexOf(op), 1); return recibir(op, res.data); }
        quitar(op);
        recargar = true;
        if (!res.duplicado) error = [res.error, op];
      });
      guardarCola(); cambiaron();
      if (!COLA.length || error) avisarVacia(!error);
      if (recargar) cargarDb(true); else refrescar();
      if (error) toast('No se pudo guardar: ' + error[0], error[1].ruta ? 'Corregir' : '', function () { S.borrador = error[1].datos; ir(error[1].ruta); });
      if (COLA.length && !error) enviar();
    });
  }
  // Saca de la cola una acción que falló y también las que dependían de ella (usaban su ID temporal).
  function quitar(op) {
    COLA.splice(COLA.indexOf(op), 1);
    if (op.tmp) COLA.filter(function (o) { return JSON.stringify(o.datos).indexOf(op.tmp) >= 0; }).forEach(quitar);
  }
  function recibir(op, data) {
    var nuevo = op.accion === 'guardar' ? data : data.llamada;
    if (op.tmp && nuevo) cambiarId(op.tmp, nuevo.ID);
    if (op.accion === 'guardar') return poner(op.tabla, data);
    [['cita', 'Citas'], ['interesado', 'Interesados'], ['llamada', 'Llamadas']].forEach(function (x) { if (data[x[0]]) poner(x[1], data[x[0]]); });
  }
  // Cambia un ID temporal por el real en los datos, en la cola y en la dirección actual.
  // REALES recuerda el cambio, por si una pantalla abierta todavía tiene el ID temporal.
  var REALES = {};
  function cambiarId(tmp, real) {
    REALES[tmp] = real;
    function r(t) { return t.split(tmp).join(real); }
    S.db = JSON.parse(r(JSON.stringify(S.db)));
    // Se cambian los datos de cada acción sin crear acciones nuevas: el envío en curso las reconoce.
    COLA.forEach(function (op) { op.datos = JSON.parse(r(JSON.stringify(op.datos))); });
    if (location.hash.indexOf(tmp) >= 0) history.replaceState(null, '', r(location.hash));
  }
  // Las reservas y lo que se elimina esperan a que todo lo anterior llegue al servidor.
  function sinPendientes() {
    return new Promise(function (ok, mal) {
      if (!COLA.length) return ok();
      S.alVaciar = { ok: ok, mal: mal };
      enviar();
    });
  }
  function avisarVacia(bien) {
    var a = S.alVaciar;
    S.alVaciar = null;
    if (a) (bien ? a.ok : a.mal)(new Error('pendientes'));
  }
  // Toma los datos de un guardado que falló, para volver a llenar el formulario.
  function tomarBorrador() { var b = S.borrador; S.borrador = null; return b; }

  // Las reservas no se pueden deshacer: esperan la respuesta del servidor.
  function guardarReserva(registro) {
    cargando(true);
    return sinPendientes().then(function () {
      registro = JSON.parse(JSON.stringify(registro), function (k, x) { return REALES[x] || x; });
      return api('guardarReserva', { registro: registro });
    }, function (e) { cargando(false); throw e; }).then(function (r) {
      cargando(false);
      if (!r.ok) { toast(r.error || 'No se pudo guardar la reserva.'); throw new Error(r.error); }
      ['reserva:Reservas', 'propiedad:Propiedades', 'interesado:Interesados'].forEach(function (x) { x = x.split(':'); if (r.data[x[0]]) poner(x[1], r.data[x[0]]); });
      cambiaron();
      S.pub = null;
      return r.data.reserva;
    });
  }

  function eliminarRegistro(tabla, id) {
    cargando(true);
    return sinPendientes().then(function () { id = REALES[id] || id; return api('eliminar', { tabla: tabla, id: id }); }, function (e) { cargando(false); throw e; }).then(function (r) {
      cargando(false);
      if (!r.ok) { toast(r.error || 'No se pudo eliminar.'); throw new Error(r.error); }
      S.db[tabla] = (S.db[tabla] || []).filter(function (x) { return x.ID !== id; });
      if (r.data && r.data.propiedad) poner('Propiedades', r.data.propiedad);
      cambiaron();
    });
  }

  function olvidarSesion() {
    S.token = ''; S.db = null; S.agente = null; S.filtroAgente = ''; S.qContactos = ''; S.filtroTemp = ''; S.lim = {}; COLA = [];
    guardarLocal('inmo_token', null); guardarLocal('inmo_cache', null); guardarLocal('inmo_agente', null);
  }
  function recordarAgente(a) {
    var otro = !S.agente || S.agente.ID !== a.ID;
    S.agente = { ID: a.ID, Usuario: a.Usuario, Nombre: a.Nombre, Rol: a.Rol, debeCambiar: !!a.debeCambiar };
    guardarLocal('inmo_agente', JSON.stringify(S.agente));
    if (otro) cargarCola();
  }
  function salirAgente() {
    if (COLA.length && !confirm('Tienes ' + plural(COLA.length, 'cambio que aún no se envía', 'cambios que aún no se envían') + ' (falta señal). Se enviarán cuando vuelvas a entrar. ¿Cerrar sesión igual?')) return;
    if (S.token) api('logout');
    olvidarSesion();
    ir('#/');
  }
  function sesionVencida() {
    olvidarSesion();
    toast('Tu sesión venció o se cerró. Vuelve a ingresar.');
    ir('#/agente');
  }

  /* ================= Acceso a datos ================= */

  function T(n) { return (S.db && S.db[n]) || []; }
  function esAdmin() { return !!S.agente && S.agente.Rol === ROL_ADMIN; }
  function agenteActivo(a) { return String(a.Activo).trim().toLowerCase() !== 'no'; }
  function agentesActivos() { return T('Agentes').filter(agenteActivo); }
  function nombreAgente(id) { var a = id && buscarId('Agentes', id); return a ? a.Nombre : (id ? 'Agente eliminado' : 'Sin asignar'); }
  // Etiqueta pequeña con el agente del registro. Solo la ve el administrador.
  function tagAgente(reg) {
    if (!esAdmin() || !reg) return '';
    return ' <span class="tag-agente' + (reg.ID_Agente ? '' : ' libre') + '">' + esc(nombreAgente(reg.ID_Agente).split(' ')[0]) + '</span>';
  }
  // Filtro "Agente: Todos / nombre" de las listas del administrador.
  function delAgente(arr) {
    var f = S.filtroAgente;
    if (!esAdmin() || !f) return arr;
    return arr.filter(function (x) { return f === '~' ? !x.ID_Agente : x.ID_Agente === f; });
  }
  function filtroAgente() {
    if (!esAdmin()) return '';
    var op = [['', 'Todos']].concat(T('Agentes').map(function (a) { return [a.ID, a.Nombre + (agenteActivo(a) ? '' : ' (inactivo)')]; }), [['~', 'Sin asignar']]);
    return '<label class="filtro-agente">Agente: <select data-filtro-agente aria-label="Filtrar por agente">' + op.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === S.filtroAgente ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select></label>';
  }
  function enlazarFiltroAgente(app, rehacer) {
    var sel = app.querySelector('[data-filtro-agente]');
    if (sel) sel.onchange = function () { S.filtroAgente = sel.value; rehacer(); };
  }
  function buscarId(tabla, id) { id = REALES[id] || id; return T(tabla).find(function (x) { return x.ID === id; }); }
  function conf() { return (S.db && S.db.config) || (S.pub && S.pub.config) || { zonas: [], caracteristicas: [], categoriasOtros: [] }; }
  function contacto(tipo, id) { return buscarId(TABLA_DE[tipo] || '', id); }
  function tipoDeLlamada(l) { return { Interesado: 'interesado', Propietario: 'propietario', Otro: 'otro' }[l.TipoContacto] || 'otro'; }
  function resumenProp(p) {
    if (!p) return 'Sin propiedad';
    var partes = [p.Tipo];
    if (num(p.Area) != null) partes[0] += ' ' + num(p.Area) + ' m²';
    else if (num(p.Dormitorios) != null) partes[0] += ' ' + num(p.Dormitorios) + ' dorm.';
    if (p.Zona) partes.push(p.Zona);
    return partes.join(' · ');
  }
  function llamadasPendientes() { return T('Llamadas').filter(function (l) { return l.Estado !== 'Hecha'; }); }
  function ordenarCitas(a, b) { return (a.Fecha + (a.Hora || '99')).localeCompare(b.Fecha + (b.Hora || '99')); }
  function tipoDeCita(c) { return c.TipoCita || 'Visita'; }
  // Las citas antiguas solo tienen ID_Interesado: se tratan como visitas con un interesado.
  function contactoDeCita(c) {
    var tipo = c.TipoContacto ? tipoDeLlamada(c) : (CONTACTO_DE_CITA[tipoDeCita(c)] || 'interesado');
    return { tipo: tipo, id: c.ID_Contacto || (tipo === 'interesado' ? c.ID_Interesado : '') || '' };
  }
  function citasDe(tipo, id) {
    return T('Citas').filter(function (c) { var k = contactoDeCita(c); return k.tipo === tipo && k.id === id; }).sort(ordenarCitas);
  }
  function reservaActiva(idp) { return T('Reservas').find(function (r) { return r.ID_Propiedad === idp && r.Estado === 'Activa'; }); }
  function ordenarReservas(a, b) { return String(b.FechaReserva || b.FechaRegistro).localeCompare(String(a.FechaReserva || a.FechaRegistro)); }
  function textoLimite(fl) {
    if (!esIso(fl)) return 'Sin fecha límite';
    var h = hoy();
    if (fl === h) return 'Vence hoy';
    if (fl === sumarDias(h, 1)) return 'Vence mañana';
    return (fl < h ? 'Venció el ' : 'Vence el ') + fechaTexto(fl);
  }
  // Si la fecha límite ya pasó, solo dice "Reservado": la propiedad nunca se libera sola.
  function etiquetaReservado(p) {
    return esIso(p.FechaLimite) && p.FechaLimite >= hoy() ? 'Reservado hasta el ' + fechaTexto(p.FechaLimite) : 'Reservado';
  }
  // Sin valor (interesados antiguos o del formulario público) cuenta como "Frío".
  function temperatura(i) {
    var t = String((i && i.Temperatura) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return t === 'caliente' ? 'Caliente' : (t === 'tibio' ? 'Tibio' : 'Frío');
  }
  function tagTemp(i) {
    var t = temperatura(i);
    return '<span class="tag-temp ' + CLASE_TEMP[t] + '">' + t + '</span>';
  }
  function horaDe(c) { var m = /^(\d{1,2}):(\d{2})/.exec(String(c.Hora || '')); return m ? pad(+m[1]) + ':' + m[2] : ''; }
  // Una cita sin hora se considera pasada recién al día siguiente.
  function yaPaso(c) {
    if (!esIso(c.Fecha)) return false;
    var h = hoy();
    if (c.Fecha !== h) return c.Fecha < h;
    var hr = horaDe(c), n = new Date();
    return !!hr && hr <= pad(n.getHours()) + ':' + pad(n.getMinutes());
  }
  function citaPendiente(c) { return (c.Estado || 'Pendiente') === 'Pendiente'; }
  function porCerrar(c) { return citaPendiente(c) && yaPaso(c); }
  function faltaResultado(c) { return yaPaso(c) && c.Estado !== 'Cancelada' && (citaPendiente(c) || !String(c.Resultado || '').trim()); }
  function textoNoAsistio(t) {
    t = String(t == null ? '' : t).trim();
    return /^no asistió/i.test(t) ? t : 'No asistió' + (t ? '. ' + t : '');
  }

  /* ================= Router ================= */

  function ir(h) { if (location.hash === h) render(); else location.hash = h; }
  function ruta() {
    var h = location.hash.replace(/^#/, '') || '/';
    var q = {};
    var i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[p[0]] = decodeURIComponent(p[1] || ''); });
      h = h.slice(0, i);
    }
    return { partes: h.split('/').filter(Boolean), q: q };
  }

  var VISTAS = {};
  var SOLO_ADMIN = ['agentes', 'agente', 'agente-form', 'asignar'];
  function render() {
    var r = ruta();
    var p = r.partes;
    if (p[0] === 'a') {
      if (!S.token) return ir('#/agente');
      // Con contraseña temporal no se puede usar ninguna otra pantalla.
      if (S.agente && S.agente.debeCambiar) {
        if (p[1] !== 'cambiar-contrasena') return ir('#/a/cambiar-contrasena');
        return VISTAS['cambiar-contrasena']();
      }
      if (SOLO_ADMIN.indexOf(p[1]) >= 0 && !esAdmin()) return ir('#/a/inicio');
      if (!S.db) { pintar('<div class="pantalla"><div class="vacio">Cargando tus datos…</div></div>'); cargarDb(true); return; }
      // Primero se pinta con lo guardado en el celular; después se piden datos nuevos.
      (VISTAS[p[1]] || VISTAS.inicio)(p.slice(2), r.q);
      return cargarDb(false);
    }
    if ((!p.length || p[0] === 'agente') && S.token) return ir('#/a/inicio');
    var vp = { agente: vLogin, publicar: vPublicar, busco: vBusco, p: vDetallePub }[p[0]] || vCatalogo;
    vp(p.slice(1), r.q);
  }
  // Si se vuelve a pintar la misma pantalla (datos nuevos, "Ver más"), se conserva el desplazamiento.
  function pintar(html, alMontar) {
    var app = document.getElementById('app'), misma = S.ultima === location.hash, y = window.scrollY;
    if (!misma) {
      if (S.cerrarHoja) S.cerrarHoja();
      // Un aviso con botón es de la pantalla anterior: se cierra para no confundir.
      var t = document.getElementById('toast');
      if (t.classList.contains('con-accion')) t.classList.remove('ver');
    }
    app.innerHTML = html;
    S.ultima = location.hash;
    window.scrollTo(0, misma ? y : 0);
    if (alMontar) alMontar(app);
  }
  window.addEventListener('hashchange', render);
  window.addEventListener('online', function () { enviar(); });

  // Un solo manejador para los botones que se repiten en muchas pantallas (data-a="acción").
  var ACC = {
    menu: function () { abrirMenu(S.menu); },
    fab: abrirRegistrar,
    temp: function (el) { panelTemp(el.dataset.id); },
    hecha: function (el) {
      var l = buscarId('Llamadas', el.dataset.id);
      if (!l) return;
      var est = l.Estado === 'Hecha' ? 'Pendiente' : 'Hecha';
      guardarRegistro('Llamadas', { ID: l.ID, Estado: est });
      toast(est === 'Hecha' ? 'Llamada hecha' : 'Llamada pendiente');
      render();
    },
    mas: function (el) { S.lim[el.dataset.k] = (S.lim[el.dataset.k] || 20) + Number(el.dataset.paso || 20); render(); },
    ok: function (el) { panelOk(el.dataset.id); },
    reprog: function (el) { panelReprog(el.dataset.id); },
    falto: function (el) {
      var c = buscarId('Citas', el.dataset.id);
      cerrarRapido(c, { Que: 'noAsistio', Resultado: '' });
      toast('Anotado: no asistió', 'Reprogramar', function () { panelReprog(c.ID); });
    },
    // Al llamar o escribir por una opción nueva, esa propiedad deja de mostrarse como nueva.
    avisada: function (el) {
      var i = buscarId('Interesados', el.dataset.id);
      if (i) guardarRegistro('Interesados', { ID: i.ID, OpcionesAvisadas: lista(i.OpcionesAvisadas).concat(lista(el.dataset.p)).join(', ') });
      setTimeout(render, 300);
    }
  };
  document.addEventListener('click', function (e) {
    var r = e.target;
    // Las opciones con data-toggle se pueden desmarcar tocándolas otra vez.
    if (r.matches('input[type=radio][data-toggle]')) {
      var on = r.dataset.on;
      document.querySelectorAll('input[name="' + r.name + '"]').forEach(function (x) { delete x.dataset.on; });
      if (on) { r.checked = false; r.dispatchEvent(new Event('change', { bubbles: true })); } else r.dataset.on = '1';
    }
    var el = r.closest('[data-a]');
    if (!el || !ACC[el.dataset.a]) return;
    if (el.tagName !== 'A') e.preventDefault();
    ACC[el.dataset.a](el);
  });
  // Elegir un día u hora rápida borra "Otra fecha u hora", y al revés.
  document.addEventListener('change', function (e) {
    var t = e.target, f = t.form, par = { Dia: 'OtraFecha', Hr: 'OtraHora' }[t.name];
    if (!f) return;
    if (par && f[par]) f[par].value = '';
    if (t.name === 'OtraFecha' || t.name === 'OtraHora') f.querySelectorAll('[name=' + (t.name === 'OtraFecha' ? 'Dia' : 'Hr') + ']').forEach(function (x) { x.checked = false; delete x.dataset.on; });
  });
  // Celular y precios se ordenan solos mientras se escriben.
  document.addEventListener('input', function (e) {
    var t = e.target, f = t.dataset && t.dataset.fmt;
    if (!f) return;
    var alFinal = t.selectionStart === t.value.length, v = f === 'cel' ? fmtCel(t.value) : fmtMiles(t.value);
    if (v !== t.value) { t.value = v; if (alFinal) t.setSelectionRange(v.length, v.length); }
  });

  // Barra inferior con el botón + flotante para registrar.
  function nav(activo) {
    var it = [['inicio', 'casa', 'Mi día'], ['contactos', 'gente', 'Contactos'], ['propiedades', 'edificio', 'Propiedades'], ['citas', 'cal', 'Citas']];
    return '<button class="fab" type="button" data-a="fab" aria-label="Registrar algo nuevo">' + ic('mas', 30) + '</button>' +
      '<nav class="nav" aria-label="Secciones"><div class="nav-interna">' + it.map(function (x) {
        return '<a href="#/a/' + x[0] + '"' + (x[0] === activo ? ' class="activo" aria-current="page"' : '') + '>' + ic(x[1], 24) + x[2] + '</a>';
      }).join('') + '</div></nav>';
  }
  function abrirRegistrar() {
    var op = [['persona', 'Cliente', 'contacto-form/interesado'], ['cal', 'Cita', 'cita-nueva'], ['llamadas', 'Llamada', 'llamada-nueva'], ['llave', 'Propietario', 'contacto-form/propietario'], ['edificio', 'Propiedad', 'propiedad-form']];
    hoja('<h2 class="hoja-titulo">¿Qué quieres registrar?</h2><div class="registrar">' + op.map(function (x) {
      return '<a href="#/a/' + x[2] + '" class="registrar-op"><span>' + ic(x[0], 28) + '</span>' + x[1] + '</a>';
    }).join('') + '</div><a class="enlace centrado" href="#/a/contacto-form/otro">Otro contacto (notario, banco…)</a>', function (h, cerrar) {
      h.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', cerrar); });
    });
  }
  function cabVolver(titulo, extra) {
    return '<div class="cab"><div class="cab-izq"><button class="volver" data-volver aria-label="Volver">' + ic('atras', 24) + '</button><h1>' + esc(titulo) + '</h1></div>' + (extra || '') + '</div>';
  }
  function enlazarVolver(app, destino) {
    app.querySelectorAll('[data-volver]').forEach(function (b) {
      b.onclick = function () { if (history.length > 1) history.back(); else ir(destino || '#/a/inicio'); };
    });
  }

  /* ================= Formularios genéricos ================= */

  // Campos de formulario. Tipos: text, tel, num, precio, date, time, area, select,
  // seg (botones), chips (una opción, se puede desmarcar), multi (varias), tipo (íconos) y temp.
  function campo(def, valor) {
    var id = 'f_' + def.n, t = def.t, v = valor == null ? '' : valor;
    var opc = def.req ? '' : ' <span class="opcional">(opcional)</span>';
    var h;
    if (t === 'select') {
      h = '<label for="' + id + '">' + esc(def.l) + opc + '</label><select id="' + id + '" name="' + def.n + '">' + (def.vacio !== false ? '<option value="">' + esc(def.vacio || '— Sin indicar —') + '</option>' : '') +
        def.op.map(function (o) {
          var val = typeof o === 'string' ? o : o[0], txt = typeof o === 'string' ? o : o[1];
          return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(txt) + '</option>';
        }).join('') + '</select>';
    } else if (/^(seg|chips|multi|tipo|temp)$/.test(t)) {
      var varias = t === 'multi', suelta = t === 'chips' || t === 'tipo';
      var op = t === 'temp' ? TEMPERATURAS : (t === 'tipo' ? TIPOS : def.op);
      var sel = varias ? lista(v) : [String(t === 'temp' ? temperatura({ Temperatura: v }) : v)];
      var clase = { seg: 'segmento' + (op.length === 2 ? ' dos' : ''), chips: 'multi', multi: 'multi', tipo: 'segmento tipos', temp: 'segmento temp' }[t] + (def.clase ? ' ' + def.clase : '');
      h = '<span class="etiqueta" id="et_' + def.n + '">' + esc(def.l) + opc + '</span><div class="' + clase + '" role="group" aria-labelledby="et_' + def.n + '">' + (op.length ? op.map(function (o) {
        var val = typeof o === 'string' ? o : o[0], txt = esc(typeof o === 'string' ? o : o[1]), on = sel.indexOf(String(val)) >= 0;
        if (t === 'temp') txt = '<strong>' + EMOJI_TEMP[val] + ' ' + val + '</strong><small>' + AYUDA_TEMP[val] + '</small>';
        if (t === 'tipo') txt = ic(ICONO_TIPO[val], 24) + (val === 'Departamento' ? 'Depto.' : txt);
        return '<label' + (t === 'temp' ? ' class="' + CLASE_TEMP[val] + '"' : '') + '><input type="' + (varias ? 'checkbox' : 'radio') + '" name="' + def.n + '" value="' + esc(val) + '"' +
          (on ? ' checked' + (suelta ? ' data-on="1"' : '') : '') + (suelta ? ' data-toggle' : '') + '><span>' + txt + '</span></label>';
      }).join('') : '<span class="item-sub">Agrega opciones en la pestaña Config de tu hoja.</span>') + '</div>';
    } else {
      var et = '<label for="' + id + '">' + esc(def.l) + opc + '</label>';
      if (t === 'area') h = et + '<textarea id="' + id + '" name="' + def.n + '" rows="3" placeholder="' + esc(def.ph || '') + '">' + esc(v) + '</textarea>';
      else {
        var extra = { num: ' inputmode="decimal"', precio: ' inputmode="numeric" data-fmt="miles"', tel: ' autocomplete="tel" data-fmt="cel"' }[t] || '';
        if (t === 'precio') v = fmtMiles(v);
        if (t === 'tel') v = fmtCel(v);
        h = et + '<input id="' + id + '" name="' + def.n + '" type="' + (t === 'num' || t === 'precio' ? 'text' : t || 'text') + '"' + extra + ' value="' + esc(v) + '" placeholder="' + esc(def.ph || '') + '">';
      }
    }
    return '<div class="campo">' + h + '</div>';
  }
  function campoClave(n, etiqueta, autocompletar) {
    var id = 'f_' + n;
    return '<div class="campo"><label for="' + id + '">' + esc(etiqueta) + '</label><div class="campo-clave">' +
      '<input id="' + id + '" name="' + n + '" type="password" autocomplete="' + autocompletar + '" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="200">' +
      '<button type="button" class="ver-clave" data-ver="' + id + '" aria-label="Mostrar contraseña" aria-pressed="false">' + ic('ojo', 22) + '</button></div></div>';
  }
  function enlazarVerClave(app) {
    app.querySelectorAll('[data-ver]').forEach(function (b) {
      b.onclick = function () {
        var inp = document.getElementById(b.dataset.ver), ver = inp.type === 'password';
        inp.type = ver ? 'text' : 'password';
        b.setAttribute('aria-pressed', String(ver));
        b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
        b.innerHTML = ic(ver ? 'ojoNo' : 'ojo', 22);
      };
    });
  }
  function leerForm(form) {
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'web') return;
      if (el.type === 'checkbox') {
        if (!(el.name in d)) d[el.name] = [];
        if (el.checked) d[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) d[el.name] = el.value; else if (!(el.name in d)) d[el.name] = '';
      } else d[el.name] = el.dataset.fmt ? el.value.replace(/\s/g, '') : el.value.trim();
    });
    Object.keys(d).forEach(function (k) { if (Array.isArray(d[k])) d[k] = d[k].join(', '); });
    if (form.elements.web) d.web = form.elements.web.value;
    return d;
  }
  function errorForm(form, msg) {
    var e = form.querySelector('.error');
    if (!e) { e = document.createElement('p'); e.className = 'error'; e.setAttribute('role', 'alert'); form.querySelector('.barra-guardar, .acciones-form').prepend(e); }
    e.textContent = msg;
  }

  function defsInteresado(c) {
    return [
      { n: 'Nombre', l: 'Nombre', req: true, ph: 'Juan Pérez' },
      { n: 'Celular', l: 'Celular', t: 'tel', ph: '987 654 321' },
      { n: 'Operacion', l: '¿Quiere comprar o alquilar?', t: 'seg', op: [['Venta', 'Comprar'], ['Alquiler', 'Alquilar']] },
      { n: 'Tipo', l: '¿Qué busca?', t: 'tipo' },
      { n: 'Zonas', l: 'Zonas que le interesan', t: 'multi', op: c.zonas },
      { n: 'PresupuestoMax', l: 'Presupuesto máximo (S/)', t: 'precio', ph: '150 000' },
      { n: 'AreaMin', l: 'Área mínima (m²)', t: 'num', ph: '150' },
      { n: 'DormitoriosMin', l: 'Dormitorios mínimos', t: 'num', ph: '2' },
      { n: 'Caracteristicas', l: 'Características que desea', t: 'multi', op: c.caracteristicas }
    ];
  }
  function defsPropiedad(c) {
    return [
      { n: 'Operacion', l: 'Operación', t: 'seg', op: OPERACIONES },
      { n: 'Tipo', l: 'Tipo de propiedad', t: 'tipo', req: true },
      { n: 'Zona', l: 'Zona', t: 'chips', op: c.zonas },
      { n: 'Precio', l: 'Precio (S/)', t: 'precio', ph: '120 000' },
      { n: 'Direccion', l: 'Dirección o referencia', ph: 'Av. principal 123' },
      { n: 'Area', l: 'Área (m²)', t: 'num', ph: '200' },
      { n: 'Dormitorios', l: 'Dormitorios', t: 'num', ph: '3' },
      { n: 'Caracteristicas', l: 'Características', t: 'multi', op: c.caracteristicas },
      { n: 'Descripcion', l: 'Descripción', t: 'area', ph: 'Detalles que ayuden al comprador.' }
    ];
  }

  /* ================= Componentes ================= */

  // Etiqueta de temperatura. Si es "editable", al tocarla se cambia en dos toques.
  function tagTemp(i, editable) {
    var t = temperatura(i), txt = EMOJI_TEMP[t] + ' ' + t;
    return editable && i.ID ? '<button type="button" class="tag-temp ' + CLASE_TEMP[t] + '" data-a="temp" data-id="' + esc(i.ID) + '" aria-label="' + t + '. Tocar para cambiar el nivel de interés">' + txt + '</button>'
      : '<span class="tag-temp ' + CLASE_TEMP[t] + '">' + txt + '</span>';
  }
  function tagSeg(i) { var e = estadoSeg(i); return e === 'Activo' ? '' : ' <span class="tag-seg ' + normalizar(e).replace(/\s/g, '') + '">' + e + '</span>'; }
  function panelTemp(id) {
    var i = buscarId('Interesados', id);
    if (!i) return;
    hoja('<h2 class="hoja-titulo">¿Qué tan interesado está ' + esc(nombreCorto(i.Nombre)) + '?</h2><div class="segmento temp">' + TEMPERATURAS.map(function (t) {
      return '<button type="button" class="' + CLASE_TEMP[t] + (temperatura(i) === t ? ' activo' : '') + '" data-t="' + t + '" aria-pressed="' + (temperatura(i) === t) + '"><strong>' + EMOJI_TEMP[t] + ' ' + t + '</strong><small>' + AYUDA_TEMP[t] + '</small></button>';
    }).join('') + '</div>', function (h, cerrar) {
      h.querySelectorAll('[data-t]').forEach(function (b) {
        b.onclick = function () {
          cerrar();
          guardarRegistro('Interesados', { ID: i.ID, Temperatura: b.dataset.t });
          toast(nombreCorto(i.Nombre) + ': ' + EMOJI_TEMP[b.dataset.t] + ' ' + b.dataset.t);
          render();
        };
      });
    });
  }

  // "¿Cuándo?": botones de día (hoy y los 6 siguientes) y de hora, más "Otra fecha u hora".
  function campoCuando(fecha, hora, conHora) {
    var h = hoy(), dias = [0, 1, 2, 3, 4, 5, 6].map(function (n) { return sumarDias(h, n); });
    var otraF = fecha && dias.indexOf(fecha) < 0 ? fecha : '', otraH = hora && HORAS.indexOf(hora) < 0 ? hora : '';
    function chip(n, v, txt, on) {
      return '<label><input type="radio" name="' + n + '" value="' + v + '"' + (on ? ' checked' + (n === 'Hr' ? ' data-on="1"' : '') : '') + (n === 'Hr' ? ' data-toggle' : '') + '><span>' + txt + '</span></label>';
    }
    return '<div class="multi dias" role="group" aria-label="Día">' + dias.map(function (d, i) {
      var x = aFecha(d);
      return chip('Dia', d, i === 0 ? 'Hoy' : (i === 1 ? 'Mañana' : mayus(DIAS[x.getDay()].slice(0, 3)) + ' ' + x.getDate()), d === fecha);
    }).join('') + '</div>' +
      (conHora ? '<div class="multi horas" role="group" aria-label="Hora">' + HORAS.map(function (x) { return chip('Hr', x, x.replace(/^0/, ''), x === hora); }).join('') + '</div>' : '') +
      '<details class="mas-detalles"' + (otraF || otraH ? ' open' : '') + '><summary>Otra fecha' + (conHora ? ' u hora' : '') + '</summary><div class="dos-col">' +
      campo({ n: 'OtraFecha', l: 'Fecha', t: 'date', req: true }, otraF) + (conHora ? campo({ n: 'OtraHora', l: 'Hora', t: 'time', req: true }, otraH) : '') + '</div></details>';
  }
  function leerCuando(d) { return { Fecha: d.OtraFecha || d.Dia || '', Hora: d.OtraHora || d.Hr || '' }; }

  // Contactos para el buscador: primero los Calientes y los de actividad reciente.
  // Se calcula una vez por cada cambio de datos.
  function contactosOrdenados() {
    return memo('contactos', function () {
      var ult = {}, todos = [];
      T('Citas').concat(T('Llamadas')).forEach(function (x) {
        var k = x.ID_Contacto || x.ID_Interesado, f = String(x.FechaRegistro || '');
        if (k && f > (ult[k] || '')) ult[k] = f;
      });
      ['interesado', 'propietario', 'otro'].forEach(function (t) {
        T(TABLA_DE[t]).forEach(function (c) {
          todos.push({ t: t, c: c, f: ult[c.ID] || String(c.FechaRegistro || ''), hot: t === 'interesado' && temperatura(c) === 'Caliente' && enSeguimiento(c), txt: normalizar(c.Nombre) + ' ' + soloDigitos(c.Celular) });
        });
      });
      return todos.sort(function (a, b) { return b.f.localeCompare(a.f); });
    });
  }
  // Buscador de contactos: filtra mientras se escribe (sin ir al servidor) y crea uno nuevo en línea.
  // "tipos": qué contactos se pueden elegir. alElegir({tipo, id}) o null al cambiar.
  function selectorContacto(cont, tipos, elegido, alElegir) {
    function cuerpo(x) {
      return '<span class="avatar ' + x.t + '">' + esc(iniciales(x.c.Nombre)) + '</span><span class="item-cuerpo"><span class="item-titulo">' + esc(x.c.Nombre) +
        (x.t === 'interesado' ? ' ' + tagTemp(x.c) : '') + '</span><span class="item-sub">' + (x.t === 'interesado' ? 'Cliente' : NOMBRE_TIPO[x.t]) + (x.c.Celular ? ' · ' + esc(fmtCel(x.c.Celular)) : '') + '</span></span>';
    }
    function fila(x, i) { return '<button type="button" class="item" data-i="' + i + '">' + cuerpo(x) + '</button>'; }
    function pintarElegido() {
      var ct = contacto(elegido.tipo, elegido.id);
      cont.innerHTML = '<div class="item elegido">' + cuerpo({ t: elegido.tipo, c: ct || { Nombre: 'Contacto' } }) + '<button type="button" class="enlace" data-cambiar>Cambiar</button></div>';
      cont.querySelector('[data-cambiar]').onclick = function () { elegido = null; alElegir(null); pintarBuscador(); cont.querySelector('input').focus(); };
    }
    function pintarBuscador() {
      cont.innerHTML = '<div class="caja-busqueda">' + ic('buscar', 20) + '<input type="search" placeholder="Escribe un nombre o celular" aria-label="Buscar contacto" autocomplete="off"></div><div class="lista resultados" aria-live="polite"></div>';
      var inp = cont.querySelector('input'), res = cont.querySelector('.resultados');
      function filtrar() {
        var q = normalizar(inp.value.trim()), dig = soloDigitos(q), arr = contactosOrdenados().filter(function (x) { return tipos.indexOf(x.t) >= 0; });
        var ver = q ? arr.filter(function (x) { return x.txt.indexOf(q) >= 0 || (dig.length > 2 && x.txt.indexOf(dig) >= 0); }).sort(function (a, b) { return b.hot - a.hot; }).slice(0, 8)
          : arr.slice(0, 4).concat(arr.filter(function (x) { return x.hot; })).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 6);
        res.innerHTML = ver.map(fila).join('') + '<button type="button" class="item nuevo" data-nuevo>' + ic('mas', 20) + (q ? 'Nuevo contacto: “' + esc(inp.value.trim()) + '”' : 'Nuevo contacto') + '</button>';
        res.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { elegir({ tipo: ver[b.dataset.i].t, id: ver[b.dataset.i].c.ID }); }; });
        res.querySelector('[data-nuevo]').onclick = function () { pintarNuevo(inp.value.trim()); };
      }
      inp.oninput = filtrar;
      filtrar();
    }
    function pintarNuevo(nombre) {
      cont.innerHTML = '<div class="recuadro neutro"><span class="recuadro-titulo">Nuevo contacto</span>' + campo({ n: 'NNombre', l: 'Nombre', req: true }, /\d{5}/.test(nombre) ? '' : nombre) +
        campo({ n: 'NCelular', l: 'Celular', t: 'tel', ph: '987 654 321' }, /\d{5}/.test(nombre) ? nombre : '') +
        (tipos.length > 1 ? campo({ n: 'NTipo', l: 'Es', t: 'seg', req: true, op: tipos.map(function (t) { return [t, t === 'interesado' ? 'Cliente' : NOMBRE_TIPO[t]]; }) }, tipos[0]) : '') +
        '<div class="fila-btns"><button type="button" class="btn primario" data-usar>Usar este contacto</button><button type="button" class="btn" data-volver-buscar>Cancelar</button></div></div>';
      var n = cont.querySelector('#f_NNombre');
      (n.value ? cont.querySelector('#f_NCelular') : n).focus();
      cont.querySelector('[data-volver-buscar]').onclick = pintarBuscador;
      cont.querySelector('[data-usar]').onclick = function () {
        if (!n.value.trim()) { n.focus(); return toast('Escribe el nombre del contacto.'); }
        var r = cont.querySelector('[name=NTipo]:checked'), t = r ? r.value : tipos[0];
        var datos = { Nombre: n.value.trim(), Celular: soloDigitos(cont.querySelector('#f_NCelular').value) };
        if (t !== 'otro') datos.Origen = 'Agente';
        elegir({ tipo: t, id: guardarRegistro(TABLA_DE[t], datos) });
      };
    }
    function elegir(x) { elegido = x; alElegir(x); pintarElegido(); }
    if (elegido) pintarElegido(); else pintarBuscador();
  }

  /* ================= Vistas públicas ================= */

  function cargarPub(cb) {
    if (S.pub) return cb();
    api('publico').then(function (r) {
      if (r.ok) { S.pub = r.data; cb(); }
      else pintar('<div class="pantalla publica"><div class="vacio">' + esc(r.error || 'No se pudo cargar el catálogo.') + '</div><button class="btn" data-reintentar>Intentar de nuevo</button></div>', function (app) {
        app.querySelector('[data-reintentar]').onclick = function () { location.reload(); };
      });
    });
  }
  function avisoDemo() {
    return DEMO ? '<div class="aviso-demo">Modo demo: los datos son de ejemplo y se guardan solo en este celular. Usuarios: aldo (administrador), maria y jose; contraseña: demo1234.</div>' : '';
  }
  function htmlRedes(c) {
    var nombre = marca(c);
    var enlaces = REDES.filter(function (r) { return urlSegura(c[r[0]]); }).map(function (r) {
      return '<a href="' + esc(urlSegura(c[r[0]])) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(nombre) + ' en ' + r[1] + ' (se abre en una pestaña nueva)">' + ic(r[0], 20) + '</a>';
    });
    return enlaces.length ? '<div class="redes">' + enlaces.join('') + '</div>' : '';
  }
  function tarjetaPub(p) {
    var det = [];
    if (num(p.Area) != null) det.push(num(p.Area) + ' m²');
    if (num(p.Dormitorios) != null) det.push(num(p.Dormitorios) + ' dorm.');
    return '<a class="prop" href="#/p/' + esc(p.ID) + '">' + icTipo(p.Tipo) + '<div class="prop-cuerpo"><span class="prop-meta">' + esc(p.Tipo) + (p.Operacion ? ' en ' + esc(p.Operacion.toLowerCase()) : '') + '</span>' +
      '<span class="prop-titulo">' + esc(p.Zona || 'Zona por confirmar') + '</span>' + (det.length ? '<span class="prop-sub">' + esc(det.join(' · ')) + '</span>' : '') +
      '<span class="precio">' + (dinero(p.Precio) || 'Precio a consultar') + '</span>' +
      (p.Estado === 'Reservado' ? '<span class="sello">' + esc(etiquetaReservado(p)) + '</span>' : '') + '</div></a>';
  }

  function vCatalogo() {
    cargarPub(function () {
      var c = S.pub.config, f = S.filtrosPub;
      var props = S.pub.Propiedades.filter(function (p) {
        if (f.estado && (p.Estado || 'Disponible') !== f.estado) return false;
        if (f.operacion && p.Operacion !== f.operacion) return false;
        if (f.tipo && p.Tipo !== f.tipo) return false;
        if (f.zona && p.Zona !== f.zona) return false;
        if (num(f.precioMax) != null && num(p.Precio) != null && num(p.Precio) > num(f.precioMax)) return false;
        return true;
      }).sort(function (a, b) { return (a.Estado === 'Reservado') - (b.Estado === 'Reservado'); });
      var chipsTipo = ['', 'Terreno', 'Casa', 'Departamento', 'Local'].map(function (t) {
        return '<button class="chip' + (f.tipo === t ? ' activo' : '') + '" data-tipo="' + t + '">' + (t ? t + 's' : 'Todas') + '</button>';
      }).join('');
      pintar('<div class="pantalla publica">' +
        '<header class="portada"><p class="marca">' + esc(marca(c)) + '</p>' +
        '<h1>Terrenos, casas y departamentos con asesoría de confianza</h1><p class="portada-texto">Mira las propiedades disponibles o cuéntanos qué buscas y te avisamos cuando aparezca.</p>' +
        '<div class="acciones-pub"><a class="accion-pub" href="#/busco"><span class="accion-texto"><strong>Cuéntanos qué buscas</strong><span>Te recomendamos opciones al instante</span></span>' + ic('flecha', 20) + '</a>' +
        '<a class="accion-pub" href="#/publicar"><span class="accion-texto"><strong>Publica tu propiedad gratis</strong><span>Para propietarios</span></span>' + ic('flecha', 20) + '</a></div></header>' +
        avisoDemo() +
        cabSeccion('Nuestras propiedades') +
        '<div class="chips" role="group" aria-label="Disponibilidad">' + [['', 'Todas'], ['Disponible', 'Disponibles'], ['Reservado', 'Reservadas']].map(function (o) {
          return '<button class="chip' + (f.estado === o[0] ? ' activo' : '') + '" data-est="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="chips" role="group" aria-label="Operación">' + [['', 'Venta y alquiler'], ['Venta', 'En venta'], ['Alquiler', 'En alquiler']].map(function (o) {
          return '<button class="chip' + (f.operacion === o[0] ? ' activo' : '') + '" data-op="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="chips" role="group" aria-label="Tipo">' + chipsTipo + '</div>' +
        '<div class="dos-col">' + campo({ n: 'zona', l: 'Zona', t: 'select', op: c.zonas, vacio: 'Todas', req: true }, f.zona) +
        campo({ n: 'precioMax', l: 'Precio hasta (S/)', t: 'num', ph: 'Sin límite', req: true }, f.precioMax) + '</div>' +
        '<p class="contador">' + props.length + (props.length === 1 ? ' propiedad' : ' propiedades') + '</p>' +
        '<div class="lista-props">' + (props.length ? props.map(tarjetaPub).join('') : '<div class="vacio">No hay propiedades con esos filtros. <a href="#/busco">Cuéntanos qué buscas</a> y te avisamos.</div>') + '</div></div>' +
        '<footer class="pie"><p class="pie-marca">' + esc(marca(c)) + '</p>' + htmlRedes(c) +
        '<p class="pie-copy">© ' + new Date().getFullYear() + ' ' + esc(marca(c)) + '</p><button data-agente>Acceso para el agente</button></footer></div>',
        function (app) {
          app.querySelectorAll('[data-tipo]').forEach(function (b) { b.onclick = function () { f.tipo = b.dataset.tipo; vCatalogo(); }; });
          app.querySelectorAll('[data-op]').forEach(function (b) { b.onclick = function () { f.operacion = b.dataset.op; vCatalogo(); }; });
          app.querySelectorAll('[data-est]').forEach(function (b) { b.onclick = function () { f.estado = b.dataset.est; vCatalogo(); }; });
          app.querySelector('#f_zona').onchange = function (e) { f.zona = e.target.value; vCatalogo(); };
          app.querySelector('#f_precioMax').onchange = function (e) { f.precioMax = e.target.value; vCatalogo(); };
          app.querySelector('[data-agente]').onclick = function () { ir('#/agente'); };
        });
    });
  }

  function vDetallePub(p) {
    cargarPub(function () {
      var prop = S.pub.Propiedades.find(function (x) { return x.ID === p[0]; });
      var c = S.pub.config;
      if (!prop) return pintar('<div class="pantalla publica">' + cabVolver('Propiedad') + '<div class="vacio">Esta propiedad ya no está disponible.</div></div>', function (a) { enlazarVolver(a, '#/'); });
      var reservada = prop.Estado === 'Reservado';
      var msg = reservada
        ? 'Hola, vi que la propiedad ' + prop.ID + ' (' + prop.Tipo + (prop.Zona ? ' en ' + prop.Zona : '') + ') está reservada. ¿Me avisan si se libera?'
        : 'Hola, me interesa la propiedad ' + prop.ID + ': ' + prop.Tipo + (prop.Zona ? ' en ' + prop.Zona : '') + (prop.Precio ? ' (' + dinero(prop.Precio) + ')' : '') + '. ¿Me das más información?';
      // Escribe al agente de la propiedad; si no tiene celular, al WhatsApp general.
      var wsp = wspLink(prop.WhatsApp || c.whatsapp, msg);
      pintar('<div class="pantalla publica">' + cabVolver(prop.Tipo + (prop.Operacion ? ' en ' + prop.Operacion.toLowerCase() : '')) +
        '<div class="ficha"><div class="ficha-top">' + icTipo(prop.Tipo) + '<div><h2>' + esc(prop.Zona || 'Zona por confirmar') + '</h2><span class="precio">' + (dinero(prop.Precio) || 'Precio a consultar') + '</span></div></div>' +
        (reservada ? '<span class="sello">' + esc(etiquetaReservado(prop)) + '</span>' : '') +
        '<dl class="datos"><dt>Código</dt><dd>' + esc(prop.ID) + '</dd>' +
        (num(prop.Area) != null ? '<dt>Área</dt><dd>' + num(prop.Area) + ' m²</dd>' : '') +
        (num(prop.Dormitorios) != null ? '<dt>Dormitorios</dt><dd>' + num(prop.Dormitorios) + '</dd>' : '') + '</dl>' +
        (lista(prop.Caracteristicas).length ? '<div class="chips-lectura">' + lista(prop.Caracteristicas).map(function (x) { return '<span class="razon si">✓ ' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
        (prop.Descripcion ? '<p class="descripcion">' + esc(prop.Descripcion) + '</p>' : '') + '</div>' +
        (wsp ? '<a class="btn primario ancho" href="' + esc(wsp) + '" target="_blank" rel="noopener">' + ic('wsp') + (reservada ? 'Avísame si se libera' : 'Me interesa, escribir por WhatsApp') + '</a>' : '') +
        '<a class="btn ancho" href="#/busco">Busco algo diferente</a></div>', function (a) { enlazarVolver(a, '#/'); });
    });
  }

  function vPublicar() {
    cargarPub(function () {
      var c = S.pub.config;
      pintar('<div class="pantalla publica">' + cabVolver('Publica tu propiedad') +
        '<p class="intro">Es gratis. Revisamos los datos y la publicamos en el catálogo. Tu número no se muestra a los visitantes.</p>' +
        '<form class="formulario" novalidate>' +
        '<div class="trampa" aria-hidden="true"><input name="web" tabindex="-1" autocomplete="off"></div>' +
        campo({ n: 'Nombre', l: 'Tu nombre', req: true, ph: 'María Quispe' }) + campo({ n: 'Celular', l: 'Tu celular', t: 'tel', req: true, ph: '984 123 456' }) +
        defsPropiedad(c).map(function (d) { return campo(d); }).join('') +
        '<div class="acciones-form"><button class="btn primario ancho" type="submit">Enviar mi propiedad</button></div></form></div>',
        function (app) {
          enlazarVolver(app, '#/');
          var form = app.querySelector('form');
          form.onsubmit = function (e) {
            e.preventDefault();
            var d = leerForm(form);
            if (!d.Nombre || !d.Celular) return errorForm(form, 'Escribe tu nombre y tu celular para poder contactarte.');
            if (!d.Tipo) return errorForm(form, 'Elige el tipo de propiedad.');
            cargando(true);
            api('publicarPropiedad', d).then(function (r) {
              cargando(false);
              if (!r.ok) return errorForm(form, r.error || 'No se pudo enviar. Inténtalo de nuevo.');
              pintar('<div class="pantalla publica"><div class="exito"><span class="circulo">' + ic('check', 32) + '</span><h1>Recibimos tu propiedad</h1>' +
                '<p class="intro">Te escribiremos al ' + esc(d.Celular) + ' para confirmar los datos antes de publicarla.</p></div><a class="btn ancho" href="#/">Volver al catálogo</a></div>');
            });
          };
        });
    });
  }

  function vBusco() {
    cargarPub(function () {
      var c = S.pub.config;
      pintar('<div class="pantalla publica">' + cabVolver('¿Qué estás buscando?') +
        '<p class="intro">Completa lo que sepas; puedes dejar campos vacíos. Te mostramos al instante las propiedades que coinciden.</p>' +
        '<form class="formulario" novalidate><div class="trampa" aria-hidden="true"><input name="web" tabindex="-1" autocomplete="off"></div>' +
        defsInteresado(c).map(function (d) {
          if (d.n === 'Nombre') d = { n: 'Nombre', l: 'Tu nombre', req: true, ph: 'Juan Pérez' };
          if (d.n === 'Celular') d = { n: 'Celular', l: 'Tu celular', t: 'tel', req: true, ph: '987 654 321' };
          return campo(d);
        }).join('') +
        '<div class="acciones-form"><button class="btn primario ancho" type="submit">Ver propiedades para mí</button></div></form></div>',
        function (app) {
          enlazarVolver(app, '#/');
          var form = app.querySelector('form');
          form.onsubmit = function (e) {
            e.preventDefault();
            var d = leerForm(form);
            if (!d.Nombre || !d.Celular) return errorForm(form, 'Escribe tu nombre y tu celular para avisarte de nuevas opciones.');
            cargando(true);
            api('registrarInteres', d).then(function (r) {
              cargando(false);
              if (!r.ok) return errorForm(form, r.error || 'No se pudo enviar. Inténtalo de nuevo.');
              var recos = recomendarPara(d, S.pub.Propiedades);
              pintar('<div class="pantalla publica"><div class="exito"><span class="circulo">' + ic('check', 32) + '</span><h1>Listo, ' + esc(d.Nombre.split(' ')[0]) + '</h1>' +
                '<p class="intro">Guardamos lo que buscas. Si aparece algo nuevo, te escribimos.</p></div>' +
                '<div class="seccion"><div class="seccion-cab"><h2>' + (recos.length ? 'Opciones para ti ahora' : 'Aún no hay opciones que coincidan') + '</h2></div>' +
                (recos.length ? recos.map(function (x) {
                  return '<div class="reco"><a class="reco-cab" href="#/p/' + esc(x.p.ID) + '">' + htmlPuntaje(x.m) + '<div class="prop-cuerpo"><span class="prop-titulo">' + esc(x.p.Tipo + (x.p.Zona ? ' en ' + x.p.Zona : '')) + '</span><span class="precio">' + (dinero(x.p.Precio) || 'Precio a consultar') + '</span></div></a>' + htmlRazones(x.m.razones) + '</div>';
                }).join('') : '<div class="vacio">Te avisaremos apenas tengamos una propiedad para ti.</div>') + '</div>' +
                '<a class="btn ancho" href="#/">Ver todo el catálogo</a></div>');
            });
          };
        });
    });
  }

  function vLogin() {
    pintar('<div class="pantalla publica">' + cabVolver('Acceso del agente') + avisoDemo() +
      '<p class="intro">Ingresa con tu usuario y tu contraseña para ver tus contactos, propiedades y citas.</p>' +
      '<form class="formulario" novalidate><div class="campo"><label for="f_usuario">Usuario</label><input id="f_usuario" name="usuario" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="30" value="' + esc(leerLocal('inmo_usuario') || '') + '"></div>' +
      campoClave('password', 'Contraseña', 'current-password') +
      '<div class="acciones-form"><button class="btn primario ancho" type="submit">Entrar</button></div></form></div>',
      function (app) {
        enlazarVolver(app, '#/');
        enlazarVerClave(app);
        var form = app.querySelector('form');
        var usu = app.querySelector('#f_usuario'), inp = app.querySelector('#f_password');
        (usu.value ? inp : usu).focus();
        form.onsubmit = function (e) {
          e.preventDefault();
          var usuario = usu.value.trim().toLowerCase(), clave = inp.value;
          if (!usuario) return errorForm(form, 'Escribe tu usuario.');
          if (!clave) return errorForm(form, 'Escribe tu contraseña.');
          cargando(true);
          api('login', { usuario: usuario, password: clave }).then(function (r) {
            cargando(false);
            if (!r.ok || !r.data || !r.data.token) { inp.value = ''; inp.focus(); return errorForm(form, r.error || 'No se pudo iniciar sesión.'); }
            S.token = r.data.token;
            guardarLocal('inmo_token', S.token);
            guardarLocal('inmo_usuario', usuario);
            recordarAgente(r.data.agente);
            S.db = null;
            ir(S.agente.debeCambiar ? '#/a/cambiar-contrasena' : '#/a/inicio');
          });
        };
      });
  }

  /* ================= Vistas del agente ================= */

  var ETIQUETA_TIPO = { interesado: 'Cliente', propietario: 'Propietario', otro: 'Otro' };
  function tagCita(c) {
    var tc = tipoDeCita(c);
    return '<span class="tag-cita ' + (CLASE_CITA[tc] || 'visita') + '">' + esc(tc) + '</span>';
  }
  function propDeCita(c) {
    var p = buscarId('Propiedades', c.ID_Propiedad);
    return p ? resumenProp(p) : (tipoDeCita(c) === 'Captación' ? 'Propiedad aún no registrada' : 'Sin propiedad');
  }
  // Nombre del contacto de la cita y su etiqueta de temperatura, si es un interesado.
  function partesCita(c) {
    var k = contactoDeCita(c), ct = contacto(k.tipo, k.id);
    return {
      k: k, ct: ct,
      nombre: ct ? ct.Nombre : (k.id ? 'Contacto eliminado' : 'Sin ' + NOMBRE_TIPO[k.tipo].toLowerCase()),
      temp: k.tipo === 'interesado' && ct ? ' ' + tagTemp(ct) : '',
      cuando: fechaCorta(c.Fecha) + (c.Hora ? ' · ' + c.Hora : '')
    };
  }
  var MARCA_FALTA = '<span class="falta-resultado">Falta resultado</span>';
  function busca(i) { return [i.Tipo, lista(i.Zonas).join(', '), i.PresupuestoMax ? 'hasta ' + dinero(i.PresupuestoMax) : ''].filter(Boolean).join(' · ') || 'sin detalles'; }
  function botonTel(ct, extra) {
    var t = ct && telLink(ct.Celular);
    return t ? '<a class="btn-icono" href="' + t + '" aria-label="Llamar a ' + esc(ct.Nombre) + '"' + (extra || '') + '>' + ic('tel', 20) + '</a>' : '';
  }
  function botonWsp(ct, msg, extra) {
    var w = ct && wspLink(ct.Celular, msg);
    return w ? '<a class="btn-icono wsp" href="' + esc(w) + '" target="_blank" rel="noopener" aria-label="WhatsApp a ' + esc(ct.Nombre) + '"' + (extra || '') + '>' + ic('wsp', 20) + '</a>' : '';
  }
  function cabSeccion(titulo, extra, attrs) { return '<div class="seccion"' + (attrs || '') + '><div class="seccion-cab"><h2>' + titulo + '</h2>' + (extra || '') + '</div>'; }
  function volver(destino) { if (history.length > 1) history.back(); else ir(destino || '#/a/inicio'); }
  // Listas largas: los primeros 20 y "Ver más".
  function paginar(k, arr, item) {
    var n = S.lim[k] || 20;
    return arr.slice(0, n).map(item).join('') + (arr.length > n ? '<button type="button" class="item ver-mas" data-a="mas" data-k="' + k + '">Ver más (' + (arr.length - n) + ')</button>' : '');
  }

  // modo: '' agenda del día (hora a la izquierda), 'fecha' agrega el día, 'contacto' pone la fecha como título
  // y 'dia' (Mi día) agrega los botones para anotar cómo te fue cuando la cita ya pasó.
  function itemCita(c, modo) {
    var x = partesCita(c), k = x.k, ct = x.ct, dia = modo === 'dia', cerrar = dia && porCerrar(c);
    var sub = propDeCita(c);
    if (tipoDeCita(c) === 'Reunión' && modo !== 'contacto') sub = ETIQUETA_TIPO[k.tipo] + (k.tipo === 'otro' && ct && ct.Categoria ? ' (' + ct.Categoria + ')' : '') + ' · ' + sub;
    if (modo === 'fecha' || (dia && c.Fecha !== hoy())) sub = (dia ? fechaCorta(c.Fecha) : x.cuando) + ' · ' + sub;
    var nombre = modo === 'contacto' ? esc(x.cuando) : esc(x.nombre);
    var cuerpo = (modo && !dia ? '' : '<span class="hora">' + esc(c.Hora || '—') + '</span>') + '<div class="item-cuerpo"><div class="item-titulo">' +
      (dia ? '<a href="#/a/cita/' + esc(c.ID) + '">' + nombre + '</a>' + (k.tipo === 'interesado' && ct ? ' ' + tagTemp(ct, true) : '') : nombre + x.temp) + ' ' + tagCita(c) + tagAgente(c) +
      (c.Estado && c.Estado !== 'Pendiente' ? ' <span class="estado chico ' + esc(c.Estado) + '">' + esc(c.Estado) + '</span>' : '') + '</div>' +
      '<div class="item-sub">' + (faltaResultado(c) && !cerrar ? MARCA_FALTA + ' · ' : '') + esc(sub) + '</div></div>';
    var id = ' data-id="' + esc(c.ID) + '"';
    return '<div class="item' + (cerrar ? ' con-acciones' : '') + '">' + (dia ? cuerpo : '<a class="item-enlace" href="#/a/cita/' + esc(c.ID) + '">' + cuerpo + '</a>') + botonTel(ct) +
      (cerrar ? '<div class="acciones-cita"><button type="button" class="btn chico" data-a="ok"' + id + '>✅ Se realizó</button><button type="button" class="btn chico" data-a="reprog"' + id + '>🔄 Reprogramar</button>' +
        '<button type="button" class="btn chico" data-a="falto"' + id + '>❌ No asistió</button></div>' : '') + '</div>';
  }

  // Historial del interesado: cada cita con su estado y lo que se anotó en Resultado.
  function itemHistorial(c) {
    var est = c.Estado || 'Pendiente', res = String(c.Resultado || '').trim();
    return '<a class="item arriba" href="#/a/cita/' + esc(c.ID) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(fechaCorta(c.Fecha) + (c.Hora ? ' · ' + c.Hora : '')) + ' ' + tagCita(c) +
      ' <span class="estado chico ' + esc(est) + '">' + esc(est) + '</span></div><div class="item-sub">' + esc(propDeCita(c)) + '</div>' +
      (res ? '<p class="resultado">' + esc(res) + '</p>' : (faltaResultado(c) ? '<div class="item-sub">' + MARCA_FALTA + '</div>' : '')) + '</div></a>';
  }

  // modo: 'inicio' (reservas por vencer), 'interesado' (en su ficha) o 'propiedad' (historial de la propiedad).
  function itemReserva(r, modo) {
    var p = buscarId('Propiedades', r.ID_Propiedad), i = buscarId('Interesados', r.ID_Interesado);
    var activa = r.Estado === 'Activa', vencida = activa && esIso(r.FechaLimite) && r.FechaLimite < hoy();
    var titulo = modo === 'propiedad' ? (i ? i.Nombre : 'Interesado eliminado') : (p ? resumenProp(p) : 'Propiedad eliminada');
    var sub = [];
    if (modo === 'inicio') sub.push(i ? i.Nombre : 'Interesado eliminado');
    if (num(r.MontoSeparacion) != null) sub.push('Separación ' + dinero(r.MontoSeparacion));
    if (modo !== 'inicio' && esIso(r.FechaReserva)) sub.push('Reservó ' + fechaCorta(r.FechaReserva).toLowerCase());
    var limite = activa ? textoLimite(r.FechaLimite) : '';
    var href = modo === 'propiedad' ? '#/a/reserva/' + r.ID : '#/a/propiedad/' + r.ID_Propiedad;
    return '<a class="item" href="' + esc(href) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(titulo) + (modo === 'inicio' ? tagAgente(r) : '') +
      (modo === 'inicio' ? '' : ' <span class="estado chico ' + esc(r.Estado) + '">' + esc(r.Estado || '') + '</span>') + '</div>' +
      '<div class="item-sub">' + esc(sub.join(' · ')) + (limite ? (sub.length ? ' · ' : '') + '<span' + (vencida ? ' class="alerta-texto"' : '') + '>' + esc(limite) + '</span>' : '') + '</div></div></a>';
  }

  function itemLlamada(l) {
    var tipo = tipoDeLlamada(l), ct = contacto(tipo, l.ID_Contacto), hecha = l.Estado === 'Hecha', atrasada = !hecha && l.Fecha && l.Fecha < hoy();
    var etiqueta = ETIQUETA_TIPO[tipo] + (tipo === 'otro' && ct && ct.Categoria ? ' · ' + ct.Categoria : '');
    var cuando = l.Fecha && l.Fecha !== hoy() ? (atrasada ? 'Atrasada · ' : '') + fechaCorta(l.Fecha) + ' · ' : '';
    return '<div class="item' + (hecha ? ' tachado' : '') + '"><button class="check' + (hecha ? ' hecho' : '') + '" data-a="hecha" data-id="' + esc(l.ID) + '" aria-label="' + (hecha ? 'Marcar como pendiente' : 'Marcar como hecha') + '"><span>' + (hecha ? ic('check', 16) : '') + '</span></button>' +
      '<a href="#/a/llamada/' + esc(l.ID) + '" class="item-enlace"><div class="item-cuerpo"><div class="item-titulo">' + esc(ct ? ct.Nombre : 'Contacto eliminado') + ' <span class="tag ' + tipo + '">' + esc(etiqueta) + '</span>' + tagAgente(l) + '</div>' +
      '<div class="item-sub' + (atrasada ? ' alerta-texto' : '') + '">' + esc(cuando + (l.Motivo || 'Sin motivo')) + '</div></div></a>' + botonTel(ct) + '</div>';
  }

  // Inicio > Sin asignar (solo administrador): lo que llegó desde la app pública.
  function itemSinAsignar(tipo, c) {
    var extra = tipo === 'propietario'
      ? T('Propiedades').filter(function (p) { return p.ID_Propietario === c.ID && !p.ID_Agente; }).map(resumenProp).join(' · ') || 'Sin propiedades'
      : 'Busca: ' + ([c.Tipo, lista(c.Zonas).join(', ')].filter(Boolean).join(' · ') || 'sin detalles');
    return '<div class="item"><a href="#/a/contacto/' + tipo + '/' + esc(c.ID) + '" class="item-cuerpo" style="text-decoration:none;color:inherit"><div class="item-titulo">' + esc(c.Nombre) +
      ' <span class="tag ' + tipo + '">' + NOMBRE_TIPO[tipo] + '</span></div><div class="item-sub">' + esc((c.Celular ? c.Celular + ' · ' : '') + extra) + '</div></a>' +
      '<a class="btn chico pildora" href="#/a/asignar/' + TABLA_DE[tipo] + '/' + esc(c.ID) + '">Asignar a…</a></div>';
  }

  /* ---------- Mi día ---------- */

  // Las secciones de Inicio se calculan una vez por cada cambio de datos (o por minuto).
  function miDia() {
    return memo('dia' + S.filtroAgente, function () {
      var h = hoy(), pend = delAgente(llamadasPendientes()), citas = delAgente(T('Citas')), ints = delAgente(T('Interesados')), ocupado = {};
      citas.forEach(function (c) { if (citaPendiente(c)) ocupado[contactoDeCita(c).id] = 1; });
      pend.forEach(function (l) { ocupado[l.ID_Contacto] = 1; });
      var espera = ints.filter(function (i) { return estadoSeg(i) === 'En espera'; }).map(function (i) { return { i: i, nuevas: nuevasOpciones(i) }; })
        .sort(function (a, b) { return (b.nuevas.length > 0) - (a.nuevas.length > 0) || RANGO_TEMP[temperatura(a.i)] - RANGO_TEMP[temperatura(b.i)]; });
      return {
        citas: citas.filter(function (c) { return c.Fecha === h || (c.Fecha < h && porCerrar(c)); }).sort(ordenarCitas),
        hoyN: citas.filter(function (c) { return c.Fecha === h && c.Estado !== 'Cancelada'; }).length,
        llamadas: pend.filter(function (l) { return !l.Fecha || l.Fecha <= h; }).sort(function (a, b) { return (a.Fecha || '9').localeCompare(b.Fecha || '9'); }),
        espera: espera,
        nuevas: espera.filter(function (x) { return x.nuevas.length; }).length,
        sinSeg: ints.filter(function (i) { return estadoSeg(i) === 'Activo' && temperatura(i) !== 'Frío' && !ocupado[i.ID]; })
          .sort(function (a, b) { return RANGO_TEMP[temperatura(a)] - RANGO_TEMP[temperatura(b)]; })
      };
    });
  }
  // Muestra hasta 5 y "Ver todo". Si no hay nada, un mensaje breve en vez de ocultarla.
  function seccionDia(k, titulo, arr, item, vacio) {
    var ver = S.lim[k] || 5;
    return cabSeccion(titulo + (arr.length ? ' <span class="cuenta">' + arr.length + '</span>' : ''), arr.length > ver ? '<button type="button" class="ver-todo" data-a="mas" data-k="' + k + '" data-paso="1000">Ver todo</button>' : '') +
      (arr.length ? '<div class="lista">' + arr.slice(0, ver).map(item).join('') + '</div>' : '<p class="vacio ok">' + vacio + '</p>') + '</div>';
  }
  function itemEspera(x) {
    var i = x.i, p = x.nuevas[0];
    var msg = p ? 'Hola ' + nombreCorto(i.Nombre) + ', te escribo de ' + marca(conf()) + '. Tengo una nueva opción que puede interesarte: ' + resumenProp(p) + (p.Precio ? ' a ' + dinero(p.Precio) : '') + '. ¿Te gustaría verla?' : '';
    var marcar = p ? ' data-a="avisada" data-id="' + esc(i.ID) + '" data-p="' + esc(ids(x.nuevas)) + '"' : '';
    return '<div class="item"><div class="item-cuerpo"><div class="item-titulo"><a href="#/a/contacto/interesado/' + esc(i.ID) + '">' + esc(i.Nombre) + '</a> ' + tagTemp(i, true) +
      (p ? ' <span class="tag-nueva">¡Nueva opción!</span>' : '') + tagAgente(i) + '</div><div class="item-sub">' +
      (p ? '<a href="#/a/propiedad/' + esc(p.ID) + '">' + esc(resumenProp(p)) + '</a>' + (p.Precio ? ' · ' + dinero(p.Precio) : '') + (x.nuevas.length > 1 ? ' y ' + (x.nuevas.length - 1) + ' más' : '') : 'Busca: ' + esc(busca(i))) +
      '</div></div>' + botonTel(i, marcar) + (p ? botonWsp(i, msg, marcar) : '') + '</div>';
  }
  function itemSinSeg(i) {
    return '<div class="item con-acciones"><div class="item-cuerpo"><div class="item-titulo"><a href="#/a/contacto/interesado/' + esc(i.ID) + '">' + esc(i.Nombre) + '</a> ' + tagTemp(i, true) + tagAgente(i) + '</div>' +
      '<div class="item-sub">' + esc(i.DetalleInteres || 'Busca: ' + busca(i)) + '</div></div>' + botonTel(i) +
      '<a class="btn chico pildora abajo" href="#/a/llamada-nueva?tipo=interesado&id=' + esc(i.ID) + '&motivo=Seguimiento">' + ic('llamadas', 18) + 'Programar seguimiento</a></div>';
  }

  VISTAS.inicio = function () {
    var h = hoy(), admin = esAdmin(), d = miDia(), en3 = sumarDias(h, 3), hace7 = sumarDias(h, -7);
    var porVencer = delAgente(T('Reservas')).filter(function (r) { return r.Estado === 'Activa' && esIso(r.FechaLimite) && r.FechaLimite <= en3; })
      .sort(function (a, b) { return a.FechaLimite.localeCompare(b.FechaLimite); });
    var nuevos = T('Propiedades').filter(function (p) { return p.Estado === 'Pendiente' && p.ID_Agente; }).map(function (p) {
      var dueno = buscarId('Propietarios', p.ID_Propietario);
      return '<a class="item" href="#/a/propiedad/' + esc(p.ID) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(resumenProp(p)) + ' <span class="tag app">Por aprobar</span>' + tagAgente(p) + '</div><div class="item-sub">Enviada por ' + esc(dueno ? dueno.Nombre : 'propietario') + '</div></div></a>';
    }).concat(T('Interesados').filter(function (i) { return i.Origen === 'App' && i.ID_Agente && String(i.FechaRegistro).slice(0, 10) >= hace7; }).map(function (i) {
      return '<a class="item" href="#/a/contacto/interesado/' + esc(i.ID) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(i.Nombre) + ' <span class="tag interesado">Nuevo cliente</span>' + tagAgente(i) + '</div><div class="item-sub">Busca: ' + esc(busca(i)) + '</div></div></a>';
    }));
    var sinAsignar = !admin ? [] : T('Propietarios').filter(function (c) { return !c.ID_Agente; }).map(function (c) { return itemSinAsignar('propietario', c); })
      .concat(T('Interesados').filter(function (c) { return !c.ID_Agente; }).map(function (c) { return itemSinAsignar('interesado', c); }));
    var menu = (admin ? [['Agentes', '#/a/agentes']] : []).concat([['Todas las llamadas', '#/a/llamadas'],
      ['Ver el catálogo público', function () { S.pub = null; location.hash = '#/catalogo'; }], ['Cambiar contraseña', '#/a/cambiar-contrasena'],
      ['Actualizar datos', function () { S.pub = null; cargarDb(true); toast('Actualizando…'); }],
      ['Cerrar sesión', function () { if (confirm('¿Cerrar sesión en este celular?')) salirAgente(); }, 'peligro']]);
    function extra(titulo, items) { return items.length ? cabSeccion(titulo) + '<div class="lista">' + items.join('') + '</div></div>' : ''; }
    pintar('<div class="pantalla"><div class="cab"><div><p class="fecha-hoy">' + fechaLarga(h) + '</p><h1 class="saludo">' + saludo() + (S.agente && S.agente.Nombre ? ', ' + esc(nombreCorto(S.agente.Nombre)) : '') + '</h1></div>' + botonMenu(menu) + '</div>' +
      avisoDemo() + filtroAgente() +
      '<p class="resumen-dia">Hoy: <strong>' + plural(d.hoyN, 'cita', 'citas') + '</strong> · <strong>' + plural(d.llamadas.length, 'llamada', 'llamadas') + '</strong> · <strong>' + plural(d.nuevas, 'nueva opción', 'nuevas opciones') + '</strong></p>' +
      seccionDia('dc', 'Citas de hoy', d.citas, function (c) { return itemCita(c, 'dia'); }, 'No tienes citas hoy. ¡Buen momento para llamar a tus clientes!') +
      seccionDia('ds', 'Seguimientos de hoy', d.llamadas, itemLlamada, 'Todo al día: no tienes llamadas pendientes.') +
      seccionDia('de', 'Clientes en espera', d.espera, itemEspera, 'Nadie en espera. Si un cliente busca algo que aún no tienes, toca “' + AVISO + '”.') +
      seccionDia('dn', 'Sin seguimiento', d.sinSeg, itemSinSeg, 'Todos tus clientes calientes y tibios tienen una cita o llamada pendiente.') +
      extra('Reservas por vencer', porVencer.map(function (r) { return itemReserva(r, 'inicio'); })) + extra('Nuevos desde la app', nuevos) +
      (sinAsignar.length ? cabSeccion('Sin asignar') + '<p class="item-sub">Llegaron desde la app pública. Elige qué agente los atiende; los agentes no los ven hasta que los asignes.</p>' +
        '<div class="lista">' + sinAsignar.join('') + '</div></div>' : '') +
      '</div>' + nav('inicio'), function (app) { enlazarFiltroAgente(app, VISTAS.inicio); });
  };

  VISTAS['cambiar-contrasena'] = function () {
    var obligatorio = !!(S.agente && S.agente.debeCambiar);
    pintar('<div class="pantalla">' + (obligatorio ? '<div class="cab"><h1>Crea tu contraseña</h1></div>' +
        '<p class="intro">Hola' + (S.agente.Nombre ? ', ' + esc(S.agente.Nombre.split(' ')[0]) : '') + '. Por seguridad, cambia la contraseña temporal que te dieron antes de continuar. Usa al menos ' + MIN_CONTRASENA + ' caracteres.</p>'
      : cabVolver('Cambiar contraseña') +
        '<p class="intro">Usa al menos ' + MIN_CONTRASENA + ' caracteres. Puedes combinar letras, números y símbolos. Al cambiarla se cerrará la sesión en tus otros dispositivos.</p>') +
      '<form class="formulario" novalidate>' + campoClave('actual', obligatorio ? 'Contraseña temporal' : 'Contraseña actual', 'current-password') +
      campoClave('nueva', 'Nueva contraseña', 'new-password') + campoClave('repetir', 'Repite la nueva contraseña', 'new-password') +
      '<div class="acciones-form"><button class="btn primario ancho" type="submit">Guardar nueva contraseña</button>' +
      (obligatorio ? '<button class="btn ancho peligro" type="button" data-salir>' + ic('salir', 18) + 'Cerrar sesión</button>' : '') + '</div></form></div>' + (obligatorio ? '' : nav('inicio')), function (app) {
        enlazarVolver(app);
        var salir = app.querySelector('[data-salir]');
        if (salir) salir.onclick = salirAgente;
        enlazarVerClave(app);
        var form = app.querySelector('form');
        form.actual.focus();
        form.onsubmit = function (e) {
          e.preventDefault();
          var actual = form.actual.value, nueva = form.nueva.value, repetir = form.repetir.value;
          if (!actual) return errorForm(form, 'Escribe tu contraseña actual.');
          if (nueva.length < MIN_CONTRASENA) return errorForm(form, 'La nueva contraseña debe tener al menos ' + MIN_CONTRASENA + ' caracteres.');
          if (nueva !== repetir) return errorForm(form, 'Las dos contraseñas nuevas no coinciden.');
          if (nueva === actual) return errorForm(form, 'La nueva contraseña debe ser distinta de la actual.');
          cargando(true);
          api('cambiarContrasena', { actual: actual, nueva: nueva }).then(function (r) {
            cargando(false);
            if (r.auth === false) return;
            if (!r.ok || !r.data || !r.data.token) {
              form.actual.value = ''; form.actual.focus();
              return errorForm(form, r.error || 'No se pudo cambiar la contraseña.');
            }
            S.token = r.data.token;
            guardarLocal('inmo_token', S.token);
            if (r.data.agente) recordarAgente(r.data.agente);
            if (obligatorio) S.db = null;
            toast('Contraseña cambiada');
            ir('#/a/inicio');
          });
        };
      });
  };

  VISTAS.llamadas = function () {
    var h = hoy();
    var pend = delAgente(llamadasPendientes());
    var grupos = [
      ['Atrasadas', pend.filter(function (l) { return l.Fecha && l.Fecha < h; }), true],
      ['Hoy', pend.filter(function (l) { return l.Fecha === h; })],
      ['Próximas', pend.filter(function (l) { return l.Fecha > h; })],
      ['Sin fecha', pend.filter(function (l) { return !l.Fecha; })]
    ];
    var hechas = delAgente(T('Llamadas')).filter(function (l) { return l.Estado === 'Hecha'; }).sort(function (a, b) { return (b.Fecha || '').localeCompare(a.Fecha || ''); });
    var cuerpo = grupos.filter(function (g) { return g[1].length; }).map(function (g) {
      g[1].sort(function (a, b) { return (a.Fecha || '').localeCompare(b.Fecha || ''); });
      return '<div class="seccion"><div class="seccion-cab"><h2' + (g[2] ? ' class="alerta"' : '') + '>' + g[0] + '</h2></div><div class="lista">' + g[1].map(itemLlamada).join('') + '</div></div>';
    }).join('');
    pintar('<div class="pantalla">' + cabVolver('Llamadas') + filtroAgente() +
      (cuerpo || '<div class="vacio ok">Todo al día: no tienes llamadas pendientes.</div>') +
      (hechas.length ? '<button class="btn ancho" data-hechas>' + (S.verHechas ? 'Ocultar hechas' : 'Ver hechas (' + hechas.length + ')') + '</button>' +
        (S.verHechas ? '<div class="lista">' + paginar('lh', hechas, itemLlamada) + '</div>' : '') : '') +
      '</div>' + nav('inicio'), function (app) {
        enlazarVolver(app);
        enlazarFiltroAgente(app, VISTAS.llamadas);
        var b = app.querySelector('[data-hechas]');
        if (b) b.onclick = function () { S.verHechas = !S.verHechas; VISTAS.llamadas(); };
      });
  };

  /* ---------- Contactos ---------- */

  var FILTROS_CLIENTE = [['', 'En seguimiento'], ['Caliente', '🔥 Caliente'], ['Tibio', '🌤️ Tibio'], ['Frío', '❄️ Frío'], ['En espera', 'En espera'], ['Compró', 'Compró'], ['Descartado', 'Descartado']];
  function pasaFiltro(c, f) { return ESTADOS_SEG.indexOf(f) > 0 ? estadoSeg(c) === f : enSeguimiento(c) && (!f || temperatura(c) === f); }
  function itemContacto(tab) {
    return function (c) {
      var extra = tab === 'interesado' ? 'Busca: ' + busca(c) : (tab === 'propietario' ? plural(T('Propiedades').filter(function (x) { return x.ID_Propietario === c.ID; }).length, 'propiedad', 'propiedades') : [c.Categoria, c.Detalle].filter(Boolean).join(' · '));
      return '<div class="item"><a class="item-enlace" href="#/a/contacto/' + tab + '/' + esc(c.ID) + '"><span class="avatar ' + tab + '">' + esc(iniciales(c.Nombre)) + '</span><div class="item-cuerpo"><div class="item-titulo">' + esc(c.Nombre) +
        (tab === 'interesado' ? tagSeg(c) : '') + (c.Origen === 'App' ? ' <span class="tag app">App</span>' : '') + tagAgente(c) + '</div><div class="item-sub">' + esc((c.Celular ? fmtCel(c.Celular) : 'Sin celular') + (extra ? ' · ' + extra : '')) + '</div></div></a>' +
        (tab === 'interesado' ? tagTemp(c, true) : '') + '</div>';
    };
  }
  VISTAS.contactos = function (p, q) {
    if (q.tab) S.tabContactos = q.tab;
    if ('f' in q) S.filtroTemp = q.f;
    var tab = S.tabContactos;
    pintar('<div class="pantalla"><div class="cab"><h1>Contactos</h1></div>' +
      '<div class="pestanas" role="tablist">' + ['interesado', 'propietario', 'otro'].map(function (t) {
        return '<button role="tab" aria-selected="' + (t === tab) + '" class="' + (t === tab ? 'activo' : '') + '" data-tab="' + t + '">' + { interesado: 'Clientes', propietario: 'Propietarios', otro: 'Otros' }[t] + '</button>';
      }).join('') + '</div>' + filtroAgente() +
      '<div class="caja-busqueda">' + ic('buscar', 20) + '<input id="qc" type="search" placeholder="Buscar por nombre o celular" aria-label="Buscar contacto" value="' + esc(S.qContactos) + '"></div>' +
      (tab === 'interesado' ? '<div class="chips" role="group" aria-label="Filtrar clientes">' + FILTROS_CLIENTE.map(function (f) {
        return '<button class="chip' + (S.filtroTemp === f[0] ? ' activo' : '') + '" data-f="' + f[0] + '" aria-pressed="' + (S.filtroTemp === f[0]) + '">' + f[1] + '</button>';
      }).join('') + '</div>' : '') +
      '<div id="listaC"></div></div>' + nav('contactos'), function (app) {
        app.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { S.tabContactos = b.dataset.tab; S.lim.c = 20; VISTAS.contactos([], {}); }; });
        app.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { S.filtroTemp = b.dataset.f; S.lim.c = 20; VISTAS.contactos([], {}); }; });
        enlazarFiltroAgente(app, function () { VISTAS.contactos([], {}); });
        var inp = app.querySelector('#qc'), cont = app.querySelector('#listaC');
        // Al escribir solo se vuelve a pintar la lista, con los datos que ya están en el celular.
        function pintarLista() {
          var qq = normalizar(S.qContactos.trim()), dig = soloDigitos(qq);
          var filas = delAgente(T(TABLA_DE[tab])).filter(function (c) {
            return (tab !== 'interesado' || pasaFiltro(c, S.filtroTemp)) && (!qq || normalizar(c.Nombre + ' ' + (c.Categoria || '')).indexOf(qq) >= 0 || (dig.length > 2 && soloDigitos(c.Celular).indexOf(dig) >= 0));
          }).sort(function (a, b) { return a.Nombre.localeCompare(b.Nombre); });
          cont.innerHTML = filas.length ? '<div class="lista">' + paginar('c', filas, itemContacto(tab)) + '</div>'
            : '<div class="vacio">' + (qq ? 'Sin resultados para esa búsqueda.' : 'Aún no hay contactos aquí. Toca + para registrar el primero.') + '</div>';
        }
        inp.oninput = function () { S.qContactos = inp.value; S.lim.c = 20; pintarLista(); };
        pintarLista();
      });
  };

  // Cambiar el estado de seguimiento de un cliente.
  function panelSeg(c) {
    abrirMenu(ESTADOS_SEG.map(function (e) {
      return [e + (estadoSeg(c) === e ? ' ✓' : ''), function () {
        if (e === 'En espera') marcarEnEspera(c); else guardarRegistro('Interesados', { ID: c.ID, EstadoSeguimiento: e });
        toast(nombreCorto(c.Nombre) + ': ' + e.toLowerCase()); render();
      }];
    }), '<h2 class="hoja-titulo">Seguimiento de ' + esc(nombreCorto(c.Nombre)) + '</h2>');
  }

  VISTAS.contacto = function (p, q) {
    var tipo = p[0], c = contacto(tipo, p[1]);
    if (!c) return pintar('<div class="pantalla">' + cabVolver('Contacto') + '<div class="vacio">Este contacto ya no existe.</div></div>' + nav('contactos'), function (a) { enlazarVolver(a, '#/a/contactos'); });
    var esInt = tipo === 'interesado', tel = telLink(c.Celular), wsp = wspLink(c.Celular), id = esc(c.ID);
    var menu = [['Agendar cita', '#/a/cita-nueva?ct=' + tipo + '&id=' + c.ID], ['Programar llamada', '#/a/llamada-nueva?tipo=' + tipo + '&id=' + c.ID]];
    if (esInt) menu.push(estadoSeg(c) === 'En espera' ? ['Cambiar seguimiento', function () { panelSeg(c); }]
      : [AVISO + ' (dejar en espera)', function () { marcarEnEspera(c); toast(nombreCorto(c.Nombre) + ' quedó en espera. Te avisaré cuando aparezca algo.'); render(); }], ['Cambiar seguimiento', function () { panelSeg(c); }]);
    if (tipo === 'propietario') menu.push(['Agregar propiedad', '#/a/propiedad-form?dueno=' + c.ID]);
    menu.push(['Editar datos', '#/a/contacto-form/' + tipo + '/' + c.ID]);
    if (esAdmin() && !c.ID_Agente && tipo !== 'otro') menu.push(['Asignar a un agente', '#/a/asignar/' + TABLA_DE[tipo] + '/' + c.ID]);
    menu.push(['Eliminar contacto', function () {
      if (confirm('¿Eliminar a ' + c.Nombre + '? Esta acción no se puede deshacer.')) eliminarRegistro(TABLA_DE[tipo], c.ID).then(function () { toast('Contacto eliminado'); ir('#/a/contactos'); }).catch(function () {});
    }, 'peligro']);
    var datos = '<dt>Celular</dt><dd>' + esc(c.Celular ? fmtCel(c.Celular) : '—') + '</dd>', extra = '';
    if (esInt) {
      datos += (c.DetalleInteres ? '<dt>Su interés</dt><dd>' + esc(c.DetalleInteres) + '</dd>' : '') +
        '<dt>Quiere</dt><dd>' + esc(c.Operacion === 'Venta' ? 'Comprar' : (c.Operacion === 'Alquiler' ? 'Alquilar' : '—')) + '</dd>' +
        '<dt>Busca</dt><dd>' + esc(c.Tipo || '—') + '</dd><dt>Zonas</dt><dd>' + esc(c.Zonas || '—') + '</dd>' +
        '<dt>Presupuesto</dt><dd>' + esc(dinero(c.PresupuestoMax) || '—') + '</dd><dt>Área mínima</dt><dd>' + esc(c.AreaMin ? c.AreaMin + ' m²' : '—') + '</dd>' +
        '<dt>Dormitorios</dt><dd>' + esc(c.DormitoriosMin || '—') + '</dd><dt>Desea</dt><dd>' + esc(c.Caracteristicas || '—') + '</dd>';
      var recos = recomendarPara(c, T('Propiedades').filter(function (x) { return x.ID_Agente === c.ID_Agente; }));
      extra += cabSeccion('Propiedades recomendadas', '', ' id="recos"') + (recos.length ? paginar('r', recos, function (x) {
        return '<div class="reco"><a class="reco-cab" href="#/a/propiedad/' + esc(x.p.ID) + '">' + htmlPuntaje(x.m) + '<div class="prop-cuerpo"><span class="prop-titulo">' + esc(resumenProp(x.p)) + '</span><span class="precio">' + (dinero(x.p.Precio) || 'Sin precio') + '</span></div></a>' +
          htmlRazones(x.m.razones) + '<div class="fila-btns"><a class="btn chico" href="#/a/cita-nueva?ct=interesado&id=' + id + '&prp=' + esc(x.p.ID) + '">' + ic('cal', 18) + 'Agendar cita</a>' +
          '<a class="btn chico" href="#/a/reserva-nueva?prp=' + esc(x.p.ID) + '&int=' + id + '">' + ic('reserva', 18) + 'Reservar</a></div></div>';
      }) : '<div class="vacio">' + (tieneBusqueda(c) ? 'Ninguna propiedad disponible coincide todavía.' : 'Agrega qué busca para ver recomendaciones.') + '</div>') + '</div>';
    }
    if (tipo === 'propietario') {
      var props = T('Propiedades').filter(function (x) { return x.ID_Propietario === c.ID; });
      extra += cabSeccion('Sus propiedades', '<a class="ver-todo" href="#/a/propiedad-form?dueno=' + id + '">+ Agregar</a>') +
        (props.length ? '<div class="lista-props">' + props.map(tarjetaAgente).join('') + '</div>' : '<div class="vacio">Sin propiedades registradas.</div>') + '</div>';
    }
    var citas = citasDe(tipo, c.ID);
    if (esInt) extra += cabSeccion('Historial') +
      (citas.length ? '<div class="lista">' + citas.reverse().map(itemHistorial).join('') + '</div>' : '<div class="vacio">Aún no tiene citas.</div>') + '</div>';
    else if (citas.length) extra += cabSeccion('Sus citas') + '<div class="lista">' + citas.map(function (x) { return itemCita(x, 'contacto'); }).join('') + '</div></div>';
    if (esInt) {
      var reservas = T('Reservas').filter(function (r) { return r.ID_Interesado === c.ID; }).sort(ordenarReservas);
      if (reservas.length) extra += cabSeccion('Sus reservas') + '<div class="lista">' + reservas.map(function (r) { return itemReserva(r, 'interesado'); }).join('') + '</div></div>';
    }
    if (tipo === 'otro') datos += '<dt>Categoría</dt><dd>' + esc(c.Categoria || '—') + '</dd><dt>Detalle</dt><dd>' + esc(c.Detalle || '—') + '</dd>';
    if (c.Notas) datos += '<dt>Notas</dt><dd>' + esc(c.Notas) + '</dd>';
    datos += '<dt>Registrado</dt><dd>' + esc(String(c.FechaRegistro || '').slice(0, 10) || '—') + (c.Origen === 'App' ? ' (desde la app)' : '') + '</dd>';
    if (esAdmin()) datos += '<dt>Agente</dt><dd>' + esc(nombreAgente(c.ID_Agente)) + '</dd>';
    pintar('<div class="pantalla">' + cabVolver(ETIQUETA_TIPO[tipo], botonMenu(menu)) +
      '<div class="ficha"><div class="ficha-top"><span class="avatar ' + tipo + '">' + esc(iniciales(c.Nombre)) + '</span><div><h2>' + esc(c.Nombre) + '</h2>' + (esInt ? tagTemp(c, true) + tagSeg(c) : '') + '</div></div>' +
      (tel ? '<div class="fila-btns grande"><a class="btn primario" href="' + tel + '">' + ic('tel', 20) + 'Llamar</a>' + (wsp ? '<a class="btn" href="' + esc(wsp) + '" target="_blank" rel="noopener">' + ic('wsp', 20) + 'WhatsApp</a>' : '') + '</div>'
        : '<a class="btn ancho" href="#/a/contacto-form/' + tipo + '/' + id + '">Agregar su celular</a>') +
      '<dl class="datos">' + datos + '</dl></div>' + extra + '</div>' + nav('contactos'), function (app) {
        enlazarVolver(app, '#/a/contactos');
        if (q.recos) app.querySelector('#recos').scrollIntoView();
      });
  };

  /* ---------- Registrar y editar contactos ---------- */

  VISTAS['contacto-form'] = function (p, q) {
    var tipo = TABLA_DE[p[0]] ? p[0] : 'interesado', c = p[1] ? contacto(tipo, p[1]) : null;
    if (p[1] && !c) return ir('#/a/contactos');
    var b = tomarBorrador(), v = b || c || {}, ruta = location.hash, cf = conf(), cuerpo;
    if (tipo === 'interesado') {
      var defsBusca = defsInteresado(cf).slice(2).concat([{ n: 'DetalleInteres', l: 'Describe su interés', t: 'area', ph: 'Visitó el terreno y le gustó; espera su gratificación para separar' }, { n: 'Notas', l: 'Notas', t: 'area' }]);
      cuerpo = campo({ n: 'Temperatura', l: '¿Qué tan interesado está?', t: 'temp', req: true }, v.Temperatura) +
        (c ? campo({ n: 'EstadoSeguimiento', l: 'Seguimiento', t: 'seg', req: true, op: ESTADOS_SEG, clase: 'cuatro' }, estadoSeg(v)) : '') +
        '<details class="plegable"' + (q.busca || tieneBusqueda(v) ? ' open' : '') + '><summary>¿Qué busca? <span class="opcional">(opcional)</span></summary><div class="grupo">' +
        defsBusca.map(function (d) { return campo(d, v[d.n]); }).join('') + '</div></details>';
    } else if (tipo === 'propietario') {
      // Dentro de "Su propiedad (opcional)" solo el tipo va sin "(opcional)": hace falta si se registra.
      var dp = defsPropiedad(cf).map(function (d) { return Object.assign({}, d, { n: 'P' + d.n, req: d.n === 'Tipo' }); });
      cuerpo = c ? campo({ n: 'Notas', l: 'Notas', t: 'area' }, v.Notas)
        : '<fieldset class="grupo"><legend>Su propiedad <span class="opcional">(opcional)</span></legend>' + dp.slice(1, 4).map(function (d) { return campo(d, v[d.n]); }).join('') +
          '<details class="mas-detalles"><summary>Más detalles</summary><div class="grupo">' + dp.slice(0, 1).concat(dp.slice(4)).map(function (d) { return campo(d, v[d.n]); }).join('') +
          campo({ n: 'Notas', l: 'Notas sobre el propietario', t: 'area' }, v.Notas) + '</div></details></fieldset>';
    } else cuerpo = campo({ n: 'Categoria', l: 'Categoría', t: 'chips', op: cf.categoriasOtros }, v.Categoria) + campo({ n: 'Detalle', l: 'Detalle', t: 'area', ph: 'Notaría del centro' }, v.Detalle);
    pintar('<div class="pantalla">' + cabVolver((c ? 'Editar ' : 'Nuevo ') + ETIQUETA_TIPO[tipo].toLowerCase()) +
      '<form class="formulario" novalidate>' + campo({ n: 'Nombre', l: 'Nombre', req: true, ph: tipo === 'otro' ? 'Dr. Ramírez' : 'Juan Pérez' }, v.Nombre) + campo({ n: 'Celular', l: 'Celular', t: 'tel', ph: '987 654 321' }, v.Celular) +
      cuerpo + '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/contactos');
        var form = app.querySelector('form');
        if (!c) form.Nombre.focus();
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Nombre) return errorForm(form, 'Escribe al menos el nombre.');
          if (tipo === 'propietario' && !c && !d.PTipo && dp.some(function (x) { return d[x.n]; })) return errorForm(form, 'Elige el tipo de su propiedad, o deja vacía esa sección.');
          if (c) d.ID = c.ID; else if (tipo !== 'otro') d.Origen = 'Agente';
          if (c && tipo === 'interesado' && d.EstadoSeguimiento === 'En espera' && estadoSeg(c) !== 'En espera') d.OpcionesAvisadas = ids(coincidenFuerte(Object.assign({}, c, d)));
          var prop = {};
          if (tipo === 'propietario' && !c) dp.forEach(function (x) { prop[x.n.slice(1)] = d[x.n]; delete d[x.n]; });
          var id = guardarRegistro(TABLA_DE[tipo], d, ruta);
          history.replaceState(null, '', '#/a/contacto/' + tipo + '/' + id);
          render();
          if (c) return toast('Cambios guardados');
          if (tipo === 'interesado') return trasGuardarCliente(buscarId('Interesados', id));
          if (tipo === 'propietario') return trasGuardarPropietario(id, prop.Tipo ? guardarRegistro('Propiedades', Object.assign(prop, { ID_Propietario: id, Estado: 'Disponible', Origen: 'Agente' })) : '');
          toast('Contacto guardado');
        };
      });
  };
  function listo(nombre) { return '<h2 class="hoja-titulo">' + ic('check', 22) + ' ' + esc(nombreCorto(nombre)) + ' quedó guardado</h2><p class="item-sub">¿Qué hacemos ahora?</p>'; }
  // Después de registrar un cliente: el siguiente paso más útil, a un toque.
  function trasGuardarCliente(i) {
    var cita = ['Agendar cita', '#/a/cita-nueva?ct=interesado&id=' + i.ID];
    var recos = tieneBusqueda(i) ? recomendarPara(i, T('Propiedades').filter(function (p) { return p.ID_Agente === i.ID_Agente; })) : [];
    var ops = !tieneBusqueda(i) ? [cita, ['Agregar qué busca', '#/a/contacto-form/interesado/' + i.ID + '?busca=1']]
      : recos.length ? [['Ver propiedades recomendadas (' + recos.length + ')', '#/a/contacto/interesado/' + i.ID + '?recos=1'], cita]
        : [['No tengo nada aún: dejarlo En espera', function () { marcarEnEspera(buscarId('Interesados', i.ID)); toast(nombreCorto(i.Nombre) + ' quedó en espera. Te avisaré cuando aparezca algo.'); render(); }], cita];
    ops[0][2] = 'destacado';
    abrirMenu(ops.concat([['Listo', function () {}]]), listo(i.Nombre));
  }
  function trasGuardarPropietario(id, idProp) {
    var dueno = buscarId('Propietarios', id), prop = idProp && buscarId('Propiedades', idProp), n = prop ? esperandoPara(prop).length : 0;
    S.pub = null;
    abrirMenu((n ? [['👀 ' + plural(n, 'cliente en espera busca', 'clientes en espera buscan') + ' algo así', '#/a/propiedad/' + idProp + '?espera=1', 'destacado']] : [])
      .concat([['Agregar ' + (prop ? 'otra ' : 'una ') + 'propiedad', '#/a/propiedad-form?dueno=' + id], ['Agendar cita de captación', '#/a/cita-nueva?ct=propietario&id=' + id], ['Listo', function () {}]]), listo(dueno ? dueno.Nombre : ''));
  }

  /* ---------- Propiedades ---------- */

  function tarjetaAgente(p) {
    var dueno = buscarId('Propietarios', p.ID_Propietario);
    return '<div class="prop"><a href="#/a/propiedad/' + esc(p.ID) + '" style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;text-decoration:none;color:inherit">' + icTipo(p.Tipo) +
      '<div class="prop-cuerpo"><span class="prop-meta">' + esc(p.Tipo) + (p.Operacion ? ' en ' + esc(p.Operacion.toLowerCase()) : '') + ' · <span class="estado ' + esc(p.Estado) + '">' + esc(p.Estado || 'Sin estado') + '</span></span>' +
      '<span class="prop-titulo">' + esc([num(p.Area) != null ? num(p.Area) + ' m²' : (num(p.Dormitorios) != null ? num(p.Dormitorios) + ' dorm.' : ''), p.Zona].filter(Boolean).join(' · ') || 'Sin detalles') + '</span>' +
      '<span class="prop-sub">Prop.: ' + esc(dueno ? dueno.Nombre : '—') + tagAgente(p) + '</span><span class="precio">' + (dinero(p.Precio) || 'Sin precio') + '</span></div></a>' +
      '<a class="btn-icono borde" href="#/a/propiedad-form/' + esc(p.ID) + '" aria-label="Editar propiedad">' + ic('lapiz', 18) + '</a></div>';
  }

  VISTAS.propiedades = function () {
    var f = S.filtrosProp, cf = conf(), qq = f.q.toLowerCase();
    var props = delAgente(T('Propiedades')).filter(function (p) {
      if (f.tipo && p.Tipo !== f.tipo) return false;
      if (f.estado && p.Estado !== f.estado) return false;
      if (f.operacion && p.Operacion !== f.operacion) return false;
      if (f.zona && p.Zona !== f.zona) return false;
      if (num(f.precioMax) != null && num(p.Precio) != null && num(p.Precio) > num(f.precioMax)) return false;
      if (qq) {
        var dueno = buscarId('Propietarios', p.ID_Propietario);
        if ((p.ID + ' ' + p.Zona + ' ' + p.Direccion + ' ' + p.Descripcion + ' ' + (dueno ? dueno.Nombre : '')).toLowerCase().indexOf(qq) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return String(b.ID).localeCompare(String(a.ID)); });
    var nFiltros = ['estado', 'operacion', 'zona', 'precioMax'].filter(function (k) { return f[k]; }).length;
    pintar('<div class="pantalla"><div class="cab"><h1>Propiedades</h1></div>' +
      '<div class="buscador"><div class="caja-busqueda">' + ic('buscar', 20) + '<input id="qp" type="search" placeholder="Zona, dirección o propietario" aria-label="Buscar propiedad" value="' + esc(f.q) + '"></div>' +
      '<button class="btn chico" data-filtros aria-expanded="' + f.abierto + '">' + ic('filtro', 18) + 'Filtros' + (nFiltros ? ' (' + nFiltros + ')' : '') + '</button></div>' +
      (f.abierto ? '<div class="panel-filtros">' + campo({ n: 'estado', l: 'Estado', t: 'select', op: ESTADOS_PROP, vacio: 'Todos', req: true }, f.estado) +
        campo({ n: 'operacion', l: 'Operación', t: 'select', op: OPERACIONES, vacio: 'Todas', req: true }, f.operacion) +
        campo({ n: 'zona', l: 'Zona', t: 'select', op: cf.zonas, vacio: 'Todas', req: true }, f.zona) +
        campo({ n: 'precioMax', l: 'Precio hasta', t: 'num', ph: 'S/', req: true }, f.precioMax) +
        '<button class="btn chico ocupa-todo" data-limpiar>Limpiar filtros</button></div>' : '') +
      '<div class="chips" role="group" aria-label="Tipo">' + [''].concat(TIPOS).map(function (t) {
        return '<button class="chip' + (f.tipo === t ? ' activo' : '') + '" data-tipo="' + t + '">' + (t ? t + 's' : 'Todas') + '</button>';
      }).join('') + '</div>' +
      filtroAgente() + '<p class="contador">' + props.length + (props.length === 1 ? ' propiedad' : ' propiedades') + '</p>' +
      (props.length ? '<div class="lista-props">' + paginar('p', props, tarjetaAgente) + '</div>' : '<div class="vacio">No hay propiedades con esos filtros.</div>') +
      '</div>' + nav('propiedades'), function (app) {
        app.querySelectorAll('[data-tipo]').forEach(function (b) { b.onclick = function () { f.tipo = b.dataset.tipo; VISTAS.propiedades(); }; });
        enlazarFiltroAgente(app, VISTAS.propiedades);
        app.querySelector('[data-filtros]').onclick = function () { f.abierto = !f.abierto; VISTAS.propiedades(); };
        ['estado', 'operacion', 'zona', 'precioMax'].forEach(function (k) {
          var el = app.querySelector('#f_' + k);
          if (el) el.onchange = function () { f[k] = el.value; VISTAS.propiedades(); };
        });
        var l = app.querySelector('[data-limpiar]');
        if (l) l.onclick = function () { f.estado = f.operacion = f.zona = f.precioMax = ''; VISTAS.propiedades(); };
        var inp = app.querySelector('#qp');
        inp.oninput = function () {
          f.q = inp.value; var pos = inp.selectionStart; VISTAS.propiedades();
          var n = document.getElementById('qp'); n.focus(); n.setSelectionRange(pos, pos);
        };
      });
  };

  VISTAS.propiedad = function (p, q) {
    var pr = buscarId('Propiedades', p[0]);
    if (!pr) return pintar('<div class="pantalla">' + cabVolver('Propiedad') + '<div class="vacio">Esta propiedad ya no existe.</div></div>' + nav('propiedades'), function (a) { enlazarVolver(a, '#/a/propiedades'); });
    var dueno = buscarId('Propietarios', pr.ID_Propietario);
    var ints = interesadosPara(pr, T('Interesados'));
    var citas = T('Citas').filter(function (c) { return c.ID_Propiedad === pr.ID; }).sort(ordenarCitas);
    var activa = reservaActiva(pr.ID);
    var historial = T('Reservas').filter(function (r) { return r.ID_Propiedad === pr.ID && r !== activa; }).sort(ordenarReservas);
    var bloqueReserva = '';
    if (activa) {
      var ri = buscarId('Interesados', activa.ID_Interesado), vencida = esIso(activa.FechaLimite) && activa.FechaLimite < hoy();
      bloqueReserva = '<div class="recuadro"><span class="recuadro-titulo">Reserva activa · ' + esc(activa.ID) + '</span>' +
        '<dl class="datos"><dt>Reservó</dt><dd>' + (ri ? '<a href="#/a/contacto/interesado/' + esc(ri.ID) + '">' + esc(ri.Nombre) + '</a>' + (ri.Celular ? '<br>' + esc(fmtCel(ri.Celular)) : '') : 'Interesado eliminado') + '</dd>' +
        '<dt>Separación</dt><dd>' + esc(dinero(activa.MontoSeparacion) || '—') + '</dd>' +
        '<dt>Fecha de reserva</dt><dd>' + esc(fechaLarga(activa.FechaReserva) || '—') + '</dd>' +
        '<dt>Fecha límite</dt><dd' + (vencida ? ' class="alerta-texto"' : '') + '>' + esc(esIso(activa.FechaLimite) ? fechaLarga(activa.FechaLimite) + (vencida ? ' (vencida)' : '') : 'Sin fecha límite') + '</dd>' +
        (activa.Notas ? '<dt>Notas</dt><dd>' + esc(activa.Notas) + '</dd>' : '') + '</dl>' +
        '<div class="fila-btns"><button class="btn chico primario" data-reserva="Concretada">' + ic('check', 18) + 'Marcar como concretada</button><button class="btn chico peligro" data-reserva="Cancelada">Cancelar reserva</button></div>' +
        '<div class="fila-btns">' + (ri && telLink(ri.Celular) ? '<a class="btn chico" href="' + telLink(ri.Celular) + '">' + ic('tel', 18) + 'Llamar</a>' : '') +
        '<a class="btn chico" href="#/a/reserva/' + esc(activa.ID) + '">' + ic('lapiz', 18) + 'Editar reserva</a></div></div>';
    } else if (pr.Estado === 'Reservado') bloqueReserva = '<p class="item-sub">Figura como reservada, pero no tiene una reserva registrada. Regístrala desde el menú ⋯.</p>';
    var espera = esperandoPara(pr), enEspera = {};
    espera.forEach(function (i) { enEspera[i.ID] = 1; });
    if (q.espera) ints.sort(function (a, b) { return (enEspera[b.i.ID] || 0) - (enEspera[a.i.ID] || 0); });
    function cambiar(est) {
      guardarRegistro('Propiedades', { ID: pr.ID, Estado: est });
      S.pub = null;
      toast(est === 'Disponible' ? 'Propiedad publicada' : 'Estado: ' + est);
      render();
      alertaEspera(buscarId('Propiedades', pr.ID));
    }
    var menu = [['Editar propiedad', '#/a/propiedad-form/' + pr.ID]];
    if (!activa && (pr.Estado === 'Disponible' || pr.Estado === 'Reservado')) menu.push(['Registrar reserva', '#/a/reserva-nueva?prp=' + pr.ID]);
    if (!activa) menu.push(['Cambiar estado (ahora: ' + (pr.Estado || 'sin estado') + ')', function () { abrirMenu(ESTADOS_PROP.map(function (e) { return [e, function () { cambiar(e); }]; }), '<h2 class="hoja-titulo">Estado de la propiedad</h2>'); }]);
    menu.push(['Eliminar propiedad', function () {
      if (confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) eliminarRegistro('Propiedades', pr.ID).then(function () { S.pub = null; toast('Propiedad eliminada'); ir('#/a/propiedades'); }).catch(function () {});
    }, 'peligro']);
    pintar('<div class="pantalla">' + cabVolver(pr.Tipo, botonMenu(menu)) +
      (pr.Estado === 'Pendiente' ? '<div class="recuadro"><span class="recuadro-titulo">Enviada desde la app, aún no es visible en el catálogo</span><button class="btn primario" data-estado="Disponible">' + ic('check', 20) + 'Aprobar y publicar</button></div>' : '') +
      '<div class="ficha"><div class="ficha-top">' + icTipo(pr.Tipo) + '<div><h2>' + esc([num(pr.Area) != null ? num(pr.Area) + ' m²' : '', pr.Zona].filter(Boolean).join(' · ') || pr.Tipo) + '</h2><span class="precio">' + (dinero(pr.Precio) || 'Sin precio') + '</span></div></div>' +
      '<dl class="datos"><dt>Código</dt><dd>' + esc(pr.ID) + '</dd><dt>Estado</dt><dd><span class="estado ' + esc(pr.Estado) + '">' + esc(pr.Estado || '—') + '</span></dd>' +
      '<dt>Operación</dt><dd>' + esc(pr.Operacion || '—') + '</dd><dt>Dirección</dt><dd>' + esc(pr.Direccion || '—') + '</dd>' +
      '<dt>Dormitorios</dt><dd>' + esc(pr.Dormitorios || '—') + '</dd><dt>Características</dt><dd>' + esc(pr.Caracteristicas || '—') + '</dd>' +
      (pr.Descripcion ? '<dt>Descripción</dt><dd>' + esc(pr.Descripcion) + '</dd>' : '') +
      '<dt>Propietario</dt><dd>' + (dueno ? '<a href="#/a/contacto/propietario/' + esc(dueno.ID) + '">' + esc(dueno.Nombre) + '</a>' + (dueno.Celular ? '<br>' + esc(fmtCel(dueno.Celular)) : '') : '—') + '</dd>' +
      (esAdmin() ? '<dt>Agente</dt><dd>' + esc(nombreAgente(pr.ID_Agente)) + '</dd>' : '') + '</dl>' +
      (activa ? '<p class="item-sub">El estado depende de la reserva activa: cambia al marcarla como concretada o cancelada.</p>' : '') + '</div>' +
      '<a class="btn primario ancho grande" href="#/a/cita-nueva?prp=' + esc(pr.ID) + '">' + ic('cal', 20) + 'Agendar visita</a>' +
      bloqueReserva +
      cabSeccion('Clientes que coinciden', '', ' id="coinciden"') + (espera.length ? '<p class="item-sub">' + plural(espera.length, 'cliente en espera busca', 'clientes en espera buscan') + ' algo así.</p>' : '') + (ints.length ? paginar('ci', ints, function (x) {
        return '<div class="reco"><a class="reco-cab" href="#/a/contacto/interesado/' + esc(x.i.ID) + '">' + htmlPuntaje(x.m) + '<div class="prop-cuerpo"><span class="prop-titulo">' + esc(x.i.Nombre) + ' ' + tagTemp(x.i) + (enEspera[x.i.ID] ? ' <span class="tag-seg enespera">En espera</span>' : '') + '</span><span class="prop-sub">' + esc(x.i.Celular ? fmtCel(x.i.Celular) : 'Sin celular') + '</span>' +
          (x.i.DetalleInteres ? '<span class="prop-sub">' + esc(x.i.DetalleInteres) + '</span>' : '') + '</div></a>' +
          htmlRazones(x.m.razones) + '<div class="fila-btns">' + (telLink(x.i.Celular) ? '<a class="btn chico" href="' + telLink(x.i.Celular) + '">' + ic('tel', 18) + 'Llamar</a>' : '') +
          '<a class="btn chico" href="#/a/cita-nueva?ct=interesado&id=' + esc(x.i.ID) + '&prp=' + esc(pr.ID) + '">' + ic('cal', 18) + 'Agendar cita</a></div></div>';
      }) : '<div class="vacio">Ningún cliente coincide todavía.</div>') + '</div>' +
      (citas.length ? cabSeccion('Citas') + '<div class="lista">' + citas.map(function (c) { return itemCita(c, 'fecha'); }).join('') + '</div></div>' : '') +
      (historial.length ? cabSeccion('Historial de reservas') + '<div class="lista">' + historial.map(function (r) { return itemReserva(r, 'propiedad'); }).join('') + '</div></div>' : '') +
      '</div>' + nav('propiedades'), function (app) {
        enlazarVolver(app, '#/a/propiedades');
        if (q.espera) app.querySelector('#coinciden').scrollIntoView();
        var ap = app.querySelector('[data-estado]');
        if (ap) ap.onclick = function () { cambiar('Disponible'); };
        app.querySelectorAll('[data-reserva]').forEach(function (b) {
          b.onclick = function () {
            var est = b.dataset.reserva, destino = pr.Operacion === 'Alquiler' ? 'Alquilado' : 'Vendido';
            if (!confirm(est === 'Concretada' ? '¿Marcar la reserva como concretada? La propiedad pasará a "' + destino + '".' : '¿Cancelar la reserva? La propiedad volverá a estar disponible en el catálogo.')) return;
            guardarReserva({ ID: activa.ID, Estado: est }).then(function () {
              toast(est === 'Concretada' ? 'Reserva concretada · ' + destino + '. El cliente pasó a "Compró".' : 'Reserva cancelada');
              render();
              if (est === 'Cancelada') alertaEspera(buscarId('Propiedades', pr.ID));
            }).catch(function () {});
          };
        });
      });
  };

  VISTAS['propiedad-form'] = function (p, q) {
    var pr = p[0] ? buscarId('Propiedades', p[0]) : null;
    var cf = conf(), activa = pr && reservaActiva(pr.ID), ruta = location.hash, v = tomarBorrador() || pr || {};
    var dueno = v.ID_Propietario || q.dueno;
    dueno = dueno ? { tipo: 'propietario', id: dueno } : null;
    pintar('<div class="pantalla">' + cabVolver(pr ? 'Editar propiedad' : 'Nueva propiedad') +
      '<form class="formulario" novalidate><span class="etiqueta">Propietario <span class="opcional">(opcional)</span></span><div id="quien"></div>' +
      defsPropiedad(cf).map(function (d) { return campo(d, v[d.n]); }).join('') +
      (activa ? '<p class="item-sub">Estado: Reservado. Cambia cuando marques la reserva como concretada o cancelada.</p>'
        : campo({ n: 'Estado', l: 'Estado', t: 'select', op: ESTADOS_PROP, vacio: false, req: true }, pr ? pr.Estado : 'Disponible')) +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar propiedad</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/propiedades');
        var form = app.querySelector('form');
        selectorContacto(app.querySelector('#quien'), ['propietario'], dueno, function (x) { dueno = x; });
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Tipo) return errorForm(form, 'Elige el tipo de propiedad.');
          d.ID_Propietario = dueno ? dueno.id : '';
          if (pr) d.ID = pr.ID; else d.Origen = 'Agente';
          var id = guardarRegistro('Propiedades', d, ruta), antes = pr ? pr.Estado : '';
          S.pub = null;
          history.replaceState(null, '', '#/a/propiedad/' + id); render();
          toast('Propiedad guardada');
          if (antes !== 'Disponible') alertaEspera(buscarId('Propiedades', id));
        };
      });
  };

  VISTAS.citas = function () {
    var h = hoy();
    var todas = delAgente(T('Citas')).slice().sort(ordenarCitas);
    var prox = todas.filter(function (c) { return c.Fecha >= h; });
    var pasadas = todas.filter(function (c) { return c.Fecha < h; }).reverse();
    var porDia = {};
    prox.forEach(function (c) { (porDia[c.Fecha] = porDia[c.Fecha] || []).push(c); });
    var bloques = Object.keys(porDia).sort().map(function (f) {
      var t = f === h ? 'Hoy · ' + fechaLarga(f).toLowerCase() : fechaLarga(f);
      return cabSeccion(esc(t)) + '<div class="lista">' + porDia[f].map(function (c) { return itemCita(c); }).join('') + '</div></div>';
    }).join('');
    pintar('<div class="pantalla"><div class="cab"><h1>Citas</h1></div>' + filtroAgente() +
      '<a class="btn primario ancho" href="#/a/cita-nueva">' + ic('mas', 22) + 'Agendar cita</a>' +
      (bloques || '<div class="vacio">No tienes citas próximas.</div>') +
      (pasadas.length ? '<button class="btn ancho" data-pasadas>' + (S.verPasadas ? 'Ocultar citas pasadas' : 'Ver citas pasadas (' + pasadas.length + ')') + '</button>' +
        (S.verPasadas ? '<div class="lista">' + paginar('cp', pasadas, function (c) { return itemCita(c, 'fecha'); }) + '</div>' : '') : '') +
      '</div>' + nav('citas'), function (app) {
        var b = app.querySelector('[data-pasadas]');
        if (b) b.onclick = function () { S.verPasadas = !S.verPasadas; VISTAS.citas(); };
        enlazarFiltroAgente(app, VISTAS.citas);
      });
  };


  /* ---------- Agendar una cita ---------- */

  // Tres preguntas: ¿con quién?, ¿cuándo? y ¿qué propiedad? (opcional). El tipo de cita se deduce solo.
  function formCita(c, q) {
    var b = tomarBorrador(), v = b || c || {}, ruta = location.hash, k = (c || b) ? contactoDeCita(v) : null;
    var sel = k && k.id ? { tipo: k.tipo, id: k.id } : (q.id ? { tipo: TABLA_DE[q.ct] ? q.ct : 'interesado', id: q.id } : null);
    var tcita = (c || b) ? tipoDeCita(v) : ({ visita: 'Visita', captacion: 'Captación', reunion: 'Reunión' }[q.tipo] || ''), propSel = v.ID_Propiedad || q.prp || '';
    var fecha = v.Fecha || (new Date().getHours() >= 17 ? sumarDias(hoy(), 1) : hoy());
    function tipoCita() { return tcita || { interesado: 'Visita', propietario: 'Captación', otro: 'Reunión' }[sel ? sel.tipo : 'interesado']; }
    var menu = c ? botonMenu([['Pantalla completa de “¿Cómo te fue?”', '#/a/como-te-fue/' + c.ID], ['Eliminar cita', function () {
      if (confirm('¿Eliminar esta cita?')) eliminarRegistro('Citas', c.ID).then(function () { toast('Cita eliminada'); ir('#/a/citas'); }).catch(function () {});
    }, 'peligro']]) : '';
    pintar('<div class="pantalla">' + cabVolver(c ? 'Cita' : 'Nueva cita', menu) +
      (c && yaPaso(c) ? '<button type="button" class="btn primario ancho" data-a="ok" data-id="' + esc(c.ID) + '">✅ ¿Cómo te fue?</button>' : '') +
      '<form class="formulario" novalidate><div class="pregunta"><h2>¿Con quién?</h2><button type="button" id="tipoCita"></button></div><div id="quien"></div>' +
      '<h2 class="pregunta">¿Cuándo?</h2>' + campoCuando(fecha, horaDe(v), true) + '<div id="queProp"></div>' +
      '<details class="mas-detalles"' + (v.Notas ? ' open' : '') + '><summary>Más detalles</summary><div class="grupo">' + campo({ n: 'Notas', l: 'Notas', t: 'area', ph: 'Llevar plano y copia literal' }, v.Notas) +
      campo({ n: 'OtraProp', l: 'Otra propiedad', t: 'select', vacio: 'Ninguna', op: T('Propiedades').map(function (p) { return [p.ID, resumenProp(p) + (p.Precio ? ' · ' + dinero(p.Precio) : '')]; }) }) +
      (c ? campo({ n: 'Estado', l: 'Estado', t: 'seg', op: ESTADOS_CITA, req: true }, v.Estado || 'Pendiente') + campo({ n: 'Resultado', l: 'Resultado', t: 'area', ph: 'En qué quedaron' }, v.Resultado) : '') + '</div></details>' +
      '<div class="barra-guardar"><button class="btn primario ancho grande" type="submit">' + (c ? 'Guardar cambios' : 'Agendar') + '</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/citas');
        var form = app.querySelector('form'), tbtn = app.querySelector('#tipoCita');
        function pintarTipo() {
          var t = tipoCita();
          tbtn.className = 'tag-cita grande ' + CLASE_CITA[t];
          tbtn.textContent = t + ' ▾';
          tbtn.setAttribute('aria-label', 'Tipo de cita: ' + t + '. Tocar para cambiarlo');
        }
        tbtn.onclick = function () { abrirMenu(TIPOS_CITA.map(function (t) { return [t + ': ' + AYUDA_CITA[t].toLowerCase(), function () { tcita = t; pintarTipo(); }]; }), '<h2 class="hoja-titulo">Tipo de cita</h2>'); };
        // Tarjetas de un toque: las recomendadas para el cliente o las del propietario.
        function pintarProps() {
          var ct = sel && contacto(sel.tipo, sel.id), arr = [];
          if (ct && sel.tipo === 'interesado') arr = recomendarPara(ct, T('Propiedades').filter(function (p) { return p.ID_Agente === ct.ID_Agente; })).slice(0, 4).map(function (x) { return x.p; });
          if (sel && sel.tipo === 'propietario') arr = T('Propiedades').filter(function (p) { return p.ID_Propietario === sel.id; });
          var elegida = buscarId('Propiedades', propSel);
          if (elegida && arr.indexOf(elegida) < 0) arr.unshift(elegida);
          app.querySelector('#queProp').innerHTML = arr.length ? '<h2 class="pregunta">¿Qué propiedad? <span class="opcional">(opcional)</span></h2><div class="tarjetas-prop">' + arr.map(function (p) {
            return '<label><input type="radio" name="Prop" value="' + esc(p.ID) + '" data-toggle' + (p.ID === propSel ? ' checked data-on="1"' : '') + '><span>' + ic(ICONO_TIPO[p.Tipo] || 'edificio', 20) +
              '<strong>' + esc(resumenProp(p)) + '</strong><small>' + (dinero(p.Precio) || 'Sin precio') + '</small></span></label>';
          }).join('') + '</div>' : '';
        }
        selectorContacto(app.querySelector('#quien'), ['interesado', 'propietario', 'otro'], sel, function (x) { sel = x; pintarTipo(); pintarProps(); });
        pintarTipo(); pintarProps();
        form.addEventListener('change', function (e) { if (e.target.name === 'Prop') propSel = e.target.checked ? e.target.value : ''; });
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form), w = leerCuando(d), tc = tipoCita();
          if (!sel) return errorForm(form, 'Elige con quién es la cita.');
          if (!w.Fecha) return errorForm(form, 'Elige el día de la cita.');
          var reg = { TipoCita: tc, TipoContacto: NOMBRE_TIPO[sel.tipo], ID_Contacto: sel.id, ID_Interesado: sel.tipo === 'interesado' ? sel.id : '', ID_Propiedad: d.OtraProp || propSel,
            Fecha: w.Fecha, Hora: w.Hora, Notas: d.Notas, Estado: c ? d.Estado || 'Pendiente' : 'Pendiente' };
          if (c) { reg.ID = c.ID; reg.Resultado = d.Resultado; }
          guardarRegistro('Citas', reg, ruta);
          toast((c ? 'Cita guardada: ' : 'Cita agendada: ') + fechaCorta(w.Fecha).toLowerCase() + (w.Hora ? ' a las ' + w.Hora.replace(/^0/, '') : ''));
          volver('#/a/citas');
        };
      });
  }
  VISTAS['cita-nueva'] = function (p, q) { formCita(null, q); };
  VISTAS.cita = function (p) {
    var c = buscarId('Citas', p[0]);
    if (!c) return ir('#/a/citas');
    formCita(c, {});
  };

  /* ---------- ¿Cómo te fue? rápido ---------- */

  function cerrarRapido(c, datos) {
    datos.ID = c.ID;
    encolar({ accion: 'cerrarCita', datos: datos });
    render();
  }
  // ✅ Se realizó: respuestas de un toque, temperatura sugerida y "¿Algo más?".
  function panelOk(id) {
    var c = buscarId('Citas', id), x = partesCita(c), esInt = x.k.tipo === 'interesado' && !!x.ct;
    var resp = esInt ? RESPUESTAS : RESPUESTAS_OTRO.map(function (r) { return [r, '']; });
    hoja('<form class="formulario" novalidate><h2 class="hoja-titulo">✅ ¿Cómo te fue con ' + esc(nombreCorto(x.nombre)) + '?</h2>' +
      '<div class="multi" role="group" aria-label="Respuestas rápidas">' + resp.map(function (r) { return '<label><input type="checkbox" name="R" value="' + esc(r[0]) + '"><span>' + esc(r[0]) + '</span></label>'; }).join('') + '</div>' +
      (esInt ? campo({ n: 'Temperatura', l: 'Nivel de interés', t: 'temp', req: true }, x.ct.Temperatura) : '') +
      campo({ n: 'Mas', l: '¿Algo más?', t: 'area', ph: 'Solo si hace falta' }) +
      '<button class="btn primario ancho" type="submit">Guardar</button></form>', function (h, cerrar) {
        var f = h.querySelector('form'), tocada = false;
        f.addEventListener('change', function (e) {
          if (e.target.name === 'Temperatura') tocada = true;
          if (e.target.name !== 'R' || !esInt || tocada) return;
          // Sugerencia: Caliente gana a Tibio y Tibio a Frío.
          var marcadas = lista(leerForm(f).R), sug = ['Caliente', 'Tibio', 'Frío'].filter(function (t) {
            return resp.some(function (r) { return r[1] === t && marcadas.indexOf(r[0]) >= 0; });
          })[0];
          if (sug) f.querySelector('[name=Temperatura][value="' + sug + '"]').checked = true;
        });
        f.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(f), m = lista(d.R), datos = { Que: 'realizada', Resultado: m.concat(d.Mas ? [d.Mas] : []).join('. ') };
          if (esInt) {
            datos.Interesado = { Temperatura: d.Temperatura };
            if (m.indexOf(AVISO) >= 0) { datos.Interesado.EstadoSeguimiento = 'En espera'; datos.Interesado.OpcionesAvisadas = ids(coincidenFuerte(x.ct)); }
          }
          cerrar();
          cerrarRapido(c, datos);
          sugerir(c, m);
        };
      });
  }
  // 🔄 Reprogramar: directo a los botones de día y hora.
  function panelReprog(id) {
    var c = buscarId('Citas', id);
    hoja('<form class="formulario" novalidate><h2 class="hoja-titulo">🔄 ¿Para cuándo la pasamos?</h2>' + campoCuando('', horaDe(c), true) +
      '<button class="btn primario ancho" type="submit">Reprogramar</button></form>', function (h, cerrar) {
        h.querySelector('form').onsubmit = function (e) {
          e.preventDefault();
          var w = leerCuando(leerForm(e.target));
          if (!w.Fecha) return toast('Elige el día.');
          cerrar();
          cerrarRapido(c, { Que: 'reprogramada', Fecha: w.Fecha, Hora: w.Hora, Resultado: c.Resultado || '' });
          toast('Cita pasada a ' + fechaCorta(w.Fecha).toLowerCase() + (w.Hora ? ' a las ' + w.Hora.replace(/^0/, '') : ''));
        };
      });
  }
  // Después de guardar: una sola sugerencia de un toque según el resultado. Si se ignora, se va sola.
  function sugerir(c, m) {
    var k = contactoDeCita(c), prp = c.ID_Propiedad ? '&prp=' + c.ID_Propiedad : '';
    function hay(r) { return m.indexOf(r) >= 0; }
    var manana = ['Programar llamada para mañana', function () {
      guardarRegistro('Llamadas', { TipoContacto: NOMBRE_TIPO[k.tipo], ID_Contacto: k.id, ID_Propiedad: c.ID_Propiedad, Motivo: 'Seguimiento', Fecha: sumarDias(hoy(), 1), Estado: 'Pendiente' });
      toast('Llamada programada para mañana'); render();
    }];
    var s = k.tipo !== 'interesado' ? (tipoDeCita(c) === 'Captación' && !c.ID_Propiedad ? ['Registrar su propiedad', '#/a/propiedad-form?dueno=' + k.id] : manana)
      : hay('Va a separar') ? ['Registrar reserva', '#/a/reserva-nueva?int=' + k.id + prp]
        : hay('Quiere volver a verla') ? ['Agendar otra visita', '#/a/cita-nueva?ct=interesado&id=' + k.id + prp]
          : hay(AVISO) ? null
            : hay('No le interesó') || hay('Le pareció caro') ? ['Ver otras opciones', '#/a/contacto/interesado/' + k.id + '?recos=1'] : manana;
    if (!s) return toast('Guardado. Quedó en espera: te avisaré cuando aparezca algo.');
    toast('Guardado', s[0], typeof s[1] === 'function' ? s[1] : function () { ir(s[1]); });
  }

  VISTAS['como-te-fue'] = function (p) {
    var c = buscarId('Citas', p[0]);
    if (!c) return ir('#/a/citas');
    var cf = conf(), x = partesCita(c), k = x.k, ct = x.ct, tc = tipoDeCita(c);
    var esInt = k.tipo === 'interesado' && !!ct;
    var noVino = c.Estado === 'Cancelada' && /^no asistió/i.test(c.Resultado || '');
    var previo = String(c.Resultado || '').replace(/^no asistió\.?\s*/i, '');
    var pasos = (ct ? [['llamada', 'Programar llamada']] : []).concat([['cita', 'Agendar otra cita']], esInt ? [['reserva', 'Registrar reserva']] : []);
    var claseNum = { 1: ' uno', 2: ' dos', 3: '' }[pasos.length];
    var quien = esInt ? 'el interesado' : 'el contacto';
    var AYUDA_PASO = {
      cita: 'Al guardar se abrirá la nueva cita con ' + quien + ' y la propiedad ya elegidos.',
      reserva: 'Al guardar se abrirá la reserva con el interesado y la propiedad ya elegidos.'
    };
    var editables = defsInteresado(cf).filter(function (d) { return d.n !== 'Nombre'; });
    pintar('<div class="pantalla">' + cabVolver('¿Cómo te fue?') +
      '<div class="ficha compacta"><p class="item-titulo">' + esc(x.nombre) + x.temp + ' ' + tagCita(c) + '</p><p class="item-sub">' + esc(x.cuando + ' · ' + propDeCita(c)) + '</p></div>' +
      '<form class="formulario" novalidate>' +
      campo({ n: 'Que', l: '¿Qué pasó?', t: 'seg', op: QUE_PASO, req: true, clase: 'grande' }, noVino ? 'noAsistio' : 'realizada') +
      '<div class="recuadro neutro" id="zonaReprog" hidden><span class="recuadro-titulo">Nueva fecha de la cita</span><div class="dos-col">' +
      campo({ n: 'NFecha', l: 'Fecha', t: 'date', req: true }, '') + campo({ n: 'NHora', l: 'Hora', t: 'time' }, horaDe(c)) + '</div></div>' +
      campo({ n: 'Resultado', l: '¿En qué quedaron?', t: 'area', ph: 'Le gustó, pero pidió una rebaja. Lo conversa con su familia.' }, previo) +
      (esInt ? '<div class="grupo">' + campo({ n: 'Temperatura', t: 'temp' }, ct.Temperatura) +
        campo({ n: 'DetalleInteres', l: 'Describe su interés', t: 'area', ph: 'Quiere separar apenas le aprueben el crédito' }, ct.DetalleInteres) +
        '<button type="button" class="enlace" data-editar aria-expanded="false" aria-controls="editarInt">' + ic('lapiz', 18) + 'Editar datos del interesado</button>' +
        '<div class="recuadro neutro" id="editarInt" hidden><span class="recuadro-titulo">Datos de ' + esc(ct.Nombre) + '</span>' +
        editables.map(function (d) { return campo(d, ct[d.n]); }).join('') + '</div></div>' : '') +
      '<div class="campo"><span class="etiqueta" id="etPaso">Siguiente paso <span class="opcional">(opcional)</span></span><div class="segmento' + claseNum + '" role="group" aria-labelledby="etPaso">' +
      pasos.map(function (b) { return '<button type="button" data-paso="' + b[0] + '" aria-pressed="false">' + b[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="recuadro neutro" id="zonaLlamada" hidden><span class="recuadro-titulo">Llamada de seguimiento</span>' +
      campo({ n: 'LFecha', l: 'Fecha de la llamada', t: 'date' }, sumarDias(hoy(), 1)) + campo({ n: 'LMotivo', l: 'Motivo', t: 'area', ph: 'Preguntar si ya decidió' }) + '</div>' +
      '<p class="item-sub" id="ayudaPaso" hidden></p>' +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/inicio');
        var form = app.querySelector('form'), siguiente = '', editando = false;
        var reprog = app.querySelector('#zonaReprog');
        form.querySelectorAll('[name=Que]').forEach(function (r) {
          r.onchange = function () {
            reprog.hidden = r.value !== 'reprogramada';
            if (!reprog.hidden) form.NFecha.focus();
          };
        });
        var ed = app.querySelector('[data-editar]');
        if (ed) ed.onclick = function () {
          editando = !editando;
          ed.setAttribute('aria-expanded', String(editando));
          app.querySelector('#editarInt').hidden = !editando;
        };
        app.querySelectorAll('[data-paso]').forEach(function (b) {
          b.onclick = function () {
            siguiente = siguiente === b.dataset.paso ? '' : b.dataset.paso;
            app.querySelectorAll('[data-paso]').forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.paso === siguiente)); });
            app.querySelector('#zonaLlamada').hidden = siguiente !== 'llamada';
            var ayuda = app.querySelector('#ayudaPaso');
            ayuda.textContent = AYUDA_PASO[siguiente] || '';
            ayuda.hidden = !AYUDA_PASO[siguiente];
          };
        });
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Que) return errorForm(form, 'Elige qué pasó con la cita.');
          if (d.Que === 'reprogramada' && !d.NFecha) return errorForm(form, 'Elige la nueva fecha de la cita.');
          var datos = { ID: c.ID, Que: d.Que, Resultado: d.Resultado };
          if (d.Que === 'reprogramada') { datos.Fecha = d.NFecha; datos.Hora = d.NHora; }
          if (esInt) {
            datos.Interesado = { Temperatura: d.Temperatura, DetalleInteres: d.DetalleInteres };
            // Solo se envían los datos del interesado si se abrió "Editar datos del interesado".
            if (editando) editables.forEach(function (df) { datos.Interesado[df.n] = d[df.n]; });
          }
          if (siguiente === 'llamada') datos.Llamada = { Fecha: d.LFecha, Motivo: d.LMotivo };
          encolar({ accion: 'cerrarCita', datos: datos });
          toast({ realizada: 'Cita realizada', reprogramada: 'Cita reprogramada para ' + fechaCorta(datos.Fecha).toLowerCase(), noAsistio: 'Cita cancelada: no asistió' }[d.Que] + (datos.Llamada ? ' · llamada programada' : ''));
          var prp = c.ID_Propiedad ? '&prp=' + encodeURIComponent(c.ID_Propiedad) : '';
          var destino = siguiente === 'cita' ? '#/a/cita-nueva?tipo=' + CLASE_CITA[tc] + '&ct=' + k.tipo + '&id=' + encodeURIComponent(k.id) + prp
            : (siguiente === 'reserva' ? '#/a/reserva-nueva?int=' + encodeURIComponent(k.id) + prp : '');
          if (destino) { history.replaceState(null, '', destino); render(); } else volver();
        };
      });
  };

  /* ---------- Llamadas ---------- */

  function formLlamada(l, q) {
    var b = tomarBorrador(), v = b || l || {}, ruta = location.hash;
    var sel = v.ID_Contacto ? { tipo: tipoDeLlamada(v), id: v.ID_Contacto } : (q.id ? { tipo: TABLA_DE[q.tipo] ? q.tipo : 'interesado', id: q.id } : null);
    var menu = l ? botonMenu([['Eliminar llamada', function () {
      if (confirm('¿Eliminar esta llamada?')) eliminarRegistro('Llamadas', l.ID).then(function () { toast('Llamada eliminada'); ir('#/a/llamadas'); }).catch(function () {});
    }, 'peligro']]) : '';
    pintar('<div class="pantalla">' + cabVolver(l ? 'Llamada' : 'Nueva llamada', menu) + '<form class="formulario" novalidate>' +
      '<h2 class="pregunta">¿A quién?</h2><div id="quien"></div>' +
      campo({ n: 'MotivoR', l: '¿Para qué?', t: 'chips', op: MOTIVOS, req: true }, q.motivo || '') +
      campo({ n: 'Motivo', l: 'Detalle', t: 'area', ph: 'Escribe más si hace falta' }, v.Motivo) +
      '<h2 class="pregunta">¿Cuándo?</h2>' + campoCuando(v.Fecha || (l ? '' : hoy()), '', false) +
      '<details class="mas-detalles"><summary>Más detalles</summary><div class="grupo">' +
      campo({ n: 'ID_Propiedad', l: 'Propiedad', t: 'select', op: T('Propiedades').map(function (p) { return [p.ID, resumenProp(p)]; }), vacio: 'Ninguna' }, v.ID_Propiedad) +
      (l ? campo({ n: 'Estado', l: 'Estado', t: 'seg', op: ['Pendiente', 'Hecha'], req: true }, v.Estado || 'Pendiente') : '') + '</div></details>' +
      '<div class="barra-guardar"><button class="btn primario ancho grande" type="submit">' + (l ? 'Guardar cambios' : 'Guardar llamada') + '</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/llamadas');
        var form = app.querySelector('form');
        selectorContacto(app.querySelector('#quien'), ['interesado', 'propietario', 'otro'], sel, function (x) { sel = x; });
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form), w = leerCuando(d);
          if (!sel) return errorForm(form, 'Elige a quién vas a llamar.');
          var reg = { TipoContacto: NOMBRE_TIPO[sel.tipo], ID_Contacto: sel.id, ID_Propiedad: d.ID_Propiedad, Motivo: [d.MotivoR, d.Motivo].filter(Boolean).join(': '), Fecha: w.Fecha, Estado: d.Estado || 'Pendiente' };
          if (l) reg.ID = l.ID;
          guardarRegistro('Llamadas', reg, ruta);
          toast('Llamada guardada' + (w.Fecha ? ' para ' + fechaCorta(w.Fecha).toLowerCase() : ''));
          volver('#/a/llamadas');
        };
      });
  }
  VISTAS['llamada-nueva'] = function (p, q) { formLlamada(null, q); };
  VISTAS.llamada = function (p) {
    var l = buscarId('Llamadas', p[0]);
    if (!l) return ir('#/a/llamadas');
    formLlamada(l, {});
  };

  function formReserva(r, q) {
    var props = T('Propiedades').filter(function (p) { return (p.Estado === 'Disponible' || p.Estado === 'Reservado') && !reservaActiva(p.ID); });
    var v = r || { ID_Propiedad: q.prp || '', ID_Interesado: q.int || '', FechaReserva: hoy(), MontoSeparacion: '', FechaLimite: '', Notas: '' };
    var pr = r && buscarId('Propiedades', r.ID_Propiedad);
    var activa = r && r.Estado === 'Activa';
    pintar('<div class="pantalla">' + cabVolver(r ? 'Reserva' : 'Nueva reserva') +
      '<form class="formulario" novalidate>' +
      (r ? '<div class="ficha compacta"><p class="item-sub">Propiedad · ' + esc(r.ID_Propiedad) + '</p><p class="resaltado"><a href="#/a/propiedad/' + esc(r.ID_Propiedad) + '">' + esc(pr ? resumenProp(pr) + (pr.Precio ? ' · ' + dinero(pr.Precio) : '') : 'Propiedad eliminada') + '</a></p>' +
          (activa ? '' : '<p class="item-sub">Estado de la reserva: <span class="estado ' + esc(r.Estado) + '">' + esc(r.Estado || '—') + '</span></p>') + '</div>'
        : campo({ n: 'ID_Propiedad', l: 'Propiedad', t: 'select', req: true, vacio: '— Elige la propiedad —', op: props.map(function (p) { return [p.ID, p.ID + ' · ' + resumenProp(p) + (p.Precio ? ' · ' + dinero(p.Precio) : '')]; }) }, v.ID_Propiedad) +
          (props.length ? '' : '<p class="item-sub">No hay propiedades disponibles para reservar.</p>')) +
      '<span class="etiqueta">Cliente que reserva</span><div id="quien"></div>' +
      '<div class="dos-col">' + campo({ n: 'FechaReserva', l: 'Fecha de reserva', t: 'date' }, v.FechaReserva) + campo({ n: 'FechaLimite', l: 'Fecha límite', t: 'date' }, v.FechaLimite) + '</div>' +
      campo({ n: 'MontoSeparacion', l: 'Monto de separación (S/)', t: 'num', ph: '2000' }, v.MontoSeparacion) +
      campo({ n: 'Notas', l: 'Notas', t: 'area', ph: 'Pagó por transferencia; minuta pendiente' }, v.Notas) +
      (activa ? campo({ n: 'Estado', l: 'Estado', t: 'seg', op: ESTADOS_RESERVA, req: true }, 'Activa') : '') +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">' + (r ? 'Guardar reserva' : 'Registrar reserva') + '</button>' +
      (r ? '<button class="btn peligro ancho" type="button" data-borrar>Eliminar reserva</button>' : '') + '</div></form></div>', function (app) {
        enlazarVolver(app, r ? '#/a/propiedad/' + r.ID_Propiedad : '#/a/propiedades');
        var form = app.querySelector('form'), cli = v.ID_Interesado ? { tipo: 'interesado', id: v.ID_Interesado } : null;
        selectorContacto(app.querySelector('#quien'), ['interesado'], cli, function (x) { cli = x; });
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          var idp = r ? r.ID_Propiedad : d.ID_Propiedad;
          if (!idp) return errorForm(form, 'Elige la propiedad que se reserva.');
          if (!cli) return errorForm(form, 'Elige al cliente que reserva.');
          if (d.FechaLimite && d.FechaReserva && d.FechaLimite < d.FechaReserva) return errorForm(form, 'La fecha límite no puede ser anterior a la fecha de reserva.');
          var cambio = r && d.Estado && d.Estado !== r.Estado ? d.Estado : '';
          var prop = buscarId('Propiedades', idp);
          if (cambio === 'Concretada' && !confirm('¿Marcar la reserva como concretada? La propiedad pasará a "' + (prop && prop.Operacion === 'Alquiler' ? 'Alquilado' : 'Vendido') + '".')) return;
          if (cambio === 'Cancelada' && !confirm('¿Cancelar la reserva? La propiedad volverá a estar disponible en el catálogo.')) return;
          var reg = { ID_Propiedad: idp, ID_Interesado: cli.id, FechaReserva: d.FechaReserva, MontoSeparacion: d.MontoSeparacion, FechaLimite: d.FechaLimite, Notas: d.Notas };
          if (r) { reg.ID = r.ID; if (d.Estado) reg.Estado = d.Estado; }
          guardarReserva(reg).then(function (g) {
            toast(!r ? 'Reserva registrada' : (cambio ? 'Reserva ' + cambio.toLowerCase() : 'Reserva guardada'));
            history.replaceState(null, '', '#/a/propiedad/' + g.ID_Propiedad); render();
          }).catch(function () {});
        };
        var b = app.querySelector('[data-borrar]');
        if (b) b.onclick = function () {
          if (!confirm(activa ? '¿Eliminar esta reserva? La propiedad volverá a estar disponible. Si el cliente desistió, mejor márcala como cancelada para conservar el historial.' : '¿Eliminar esta reserva del historial?')) return;
          eliminarRegistro('Reservas', r.ID).then(function () {
            S.pub = null; toast('Reserva eliminada');
            history.replaceState(null, '', '#/a/propiedad/' + r.ID_Propiedad); render();
          }).catch(function () {});
        };
      });
  }

  VISTAS['reserva-nueva'] = function (p, q) { formReserva(null, q); };
  VISTAS.reserva = function (p) {
    var r = buscarId('Reservas', p[0]);
    if (!r) return ir('#/a/propiedades');
    formReserva(r, {});
  };

  /* ================= Agentes (solo administrador) ================= */

  function apiAdmin(accion, datos) {
    cargando(true);
    return api(accion, datos).then(function (r) {
      cargando(false);
      if (!r.ok) { toast(r.error || 'No se pudo guardar.'); throw new Error(r.error); }
      return r.data;
    });
  }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  // Semana de lunes a domingo.
  function semanaActual() {
    var h = hoy(), ini = sumarDias(h, -((aFecha(h).getDay() + 6) % 7));
    return [ini, sumarDias(ini, 6)];
  }
  function resumenAgente(id) {
    var sem = semanaActual();
    function de(t) { return T(t).filter(function (x) { return x.ID_Agente === id; }); }
    return [
      plural(de('Interesados').length, 'interesado', 'interesados'),
      plural(de('Propiedades').length, 'propiedad', 'propiedades'),
      plural(de('Citas').filter(function (c) { return c.Fecha >= sem[0] && c.Fecha <= sem[1] && c.Estado !== 'Cancelada'; }).length, 'cita esta semana', 'citas esta semana'),
      plural(de('Reservas').filter(function (r) { return r.Estado === 'Activa'; }).length, 'reserva activa', 'reservas activas')
    ];
  }
  function htmlResumen(id) {
    return '<div class="resumen-agente">' + resumenAgente(id).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
  }
  function tagsAgente(a) {
    return (a.Rol === ROL_ADMIN ? ' <span class="tag propietario">Administrador</span>' : '') +
      (agenteActivo(a) ? '' : ' <span class="tag app">Inactivo</span>');
  }

  VISTAS.agentes = function () {
    var ags = T('Agentes').slice().sort(function (a, b) { return (agenteActivo(b) - agenteActivo(a)) || a.Nombre.localeCompare(b.Nombre); });
    pintar('<div class="pantalla">' + cabVolver('Agentes', '<a class="btn-redondo" href="#/a/agente-form" aria-label="Nuevo agente">' + ic('mas', 26) + '</a>') +
      '<p class="intro">Cada agente entra con su usuario y su contraseña, y solo ve sus propios registros.</p>' +
      '<div class="lista">' + ags.map(function (a) {
        return '<a class="item arriba' + (agenteActivo(a) ? '' : ' apagado') + '" href="#/a/agente/' + esc(a.ID) + '"><span class="avatar agente">' + esc(iniciales(a.Nombre)) + '</span><div class="item-cuerpo">' +
          '<div class="item-titulo">' + esc(a.Nombre) + tagsAgente(a) + '</div><div class="item-sub">Usuario: ' + esc(a.Usuario) + (a.Celular ? ' · ' + esc(a.Celular) : '') + '</div>' + htmlResumen(a.ID) + '</div></a>';
      }).join('') + '</div></div>' + nav('inicio'), function (app) { enlazarVolver(app, '#/a/inicio'); });
  };

  VISTAS['agente-form'] = function () {
    pintar('<div class="pantalla">' + cabVolver('Nuevo agente') +
      '<form class="formulario" novalidate>' +
      campo({ n: 'Nombre', l: 'Nombre', req: true, ph: 'María Fernández' }) +
      campo({ n: 'Usuario', l: 'Usuario', req: true, ph: 'maria' }) +
      '<p class="item-sub ayuda-campo">Con este usuario entrará a la app. Solo letras sin tildes, números, punto y guion bajo.</p>' +
      campo({ n: 'Celular', l: 'Celular', t: 'tel', ph: '984 123 456' }) +
      '<p class="item-sub ayuda-campo">Los clientes le escribirán a este número por WhatsApp desde el catálogo.</p>' +
      campo({ n: 'Rol', l: 'Rol', t: 'seg', op: [['Agente', 'Agente'], [ROL_ADMIN, 'Administrador']], req: true }, 'Agente') +
      campoClave('Contrasena', 'Contraseña temporal', 'new-password') +
      '<p class="item-sub ayuda-campo">Mínimo ' + MIN_CONTRASENA + ' caracteres. Dásela al agente: al entrar por primera vez, la app le pedirá crear la suya.</p>' +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Crear agente</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/agentes');
        enlazarVerClave(app);
        var form = app.querySelector('form');
        form.Usuario.setAttribute('autocapitalize', 'none');
        form.Usuario.setAttribute('autocomplete', 'off');
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          d.Usuario = d.Usuario.toLowerCase();
          if (!d.Nombre) return errorForm(form, 'Escribe el nombre del agente.');
          if (!/^[a-z0-9._]{3,30}$/.test(d.Usuario)) return errorForm(form, 'El usuario debe tener de 3 a 30 caracteres: letras sin tildes, números, punto o guion bajo.');
          if (T('Agentes').some(function (a) { return String(a.Usuario).toLowerCase() === d.Usuario; })) return errorForm(form, 'El usuario "' + d.Usuario + '" ya existe. Elige otro.');
          if (form.Contrasena.value.length < MIN_CONTRASENA) return errorForm(form, 'La contraseña temporal debe tener al menos ' + MIN_CONTRASENA + ' caracteres.');
          d.Contrasena = form.Contrasena.value;
          apiAdmin('guardarAgente', { agente: d }).then(function (a) {
            ponerEnCache('Agentes', a);
            toast('Agente creado');
            history.replaceState(null, '', '#/a/agente/' + a.ID); render();
          }).catch(function () {});
        };
      });
  };

  VISTAS.agente = function (p) {
    var a = buscarId('Agentes', p[0]);
    if (!a) return ir('#/a/agentes');
    var yo = !!S.agente && a.ID === S.agente.ID, act = agenteActivo(a);
    // Primero el administrador que está usando la app, después los demás agentes activos.
    var destinos = agentesActivos().filter(function (x) { return x.ID !== a.ID; }).sort(function (x, y) { return (y.ID === S.agente.ID) - (x.ID === S.agente.ID) || x.Nombre.localeCompare(y.Nombre); });
    var debe = /^s[ií]$/i.test(String(a.DebeCambiarContrasena).trim());
    pintar('<div class="pantalla">' + cabVolver('Agente') +
      '<div class="ficha"><div class="ficha-top"><span class="avatar agente">' + esc(iniciales(a.Nombre)) + '</span><div><h2>' + esc(a.Nombre) + '</h2>' +
      '<p class="item-sub">Usuario: <strong>' + esc(a.Usuario) + '</strong>' + tagsAgente(a) + '</p></div></div>' + htmlResumen(a.ID) +
      (debe ? '<p class="item-sub">Aún no cambia su contraseña temporal.</p>' : '') + '</div>' +
      '<form class="formulario" novalidate data-editar>' + campo({ n: 'Nombre', l: 'Nombre', req: true }, a.Nombre) + campo({ n: 'Celular', l: 'Celular', t: 'tel', ph: '984 123 456' }, a.Celular) +
      campo({ n: 'Rol', l: 'Rol', t: 'seg', op: [['Agente', 'Agente'], [ROL_ADMIN, 'Administrador']], req: true }, a.Rol === ROL_ADMIN ? ROL_ADMIN : 'Agente') +
      '<div class="acciones-form"><button class="btn primario ancho" type="submit">Guardar cambios</button></div></form>' +
      cabSeccion('Contraseña') +
      '<button class="btn ancho" type="button" data-restablecer aria-expanded="false" aria-controls="zonaClave">' + ic('candado', 20) + 'Restablecer contraseña</button>' +
      '<div class="recuadro neutro" id="zonaClave" hidden><span class="recuadro-titulo">Nueva contraseña temporal</span>' + campoClave('Temporal', 'Contraseña temporal', 'new-password') +
      '<p class="item-sub">Se cerrarán sus sesiones abiertas y, al entrar, deberá crear una contraseña nueva.</p><button class="btn primario" type="button" data-guardar-clave>Guardar contraseña temporal</button></div></div>' +
      cabSeccion('Acceso') +
      (yo ? '<p class="item-sub">Esta es tu cuenta. Para desactivarla, otro administrador debe hacerlo.</p>'
        : act ? '<button class="btn peligro ancho" type="button" data-baja aria-expanded="false" aria-controls="zonaBaja">Desactivar agente</button>' +
          '<div class="recuadro" id="zonaBaja" hidden><span class="recuadro-titulo">Desactivar a ' + esc(a.Nombre) + '</span><p class="item-sub">No podrá entrar a la app y se cerrarán sus sesiones al instante.</p>' +
          campo({ n: 'ReasignarA', l: '¿Qué hacemos con sus registros?', t: 'select', vacio: false, req: true, op: destinos.map(function (x) { return [x.ID, 'Pasarlos a ' + x.Nombre + (x.ID === S.agente.ID ? ' (tú)' : '')]; }).concat([['', 'Dejarlos a su nombre']]) }, S.agente.ID) +
          '<button class="btn peligro" type="button" data-confirmar-baja>Desactivar agente</button></div>'
        : '<p class="item-sub">Este agente está desactivado: no puede entrar a la app.</p><button class="btn primario ancho" type="button" data-alta>Reactivar agente</button>') +
      '</div></div>' + nav('inicio'), function (app) {
        enlazarVolver(app, '#/a/agentes');
        enlazarVerClave(app);
        var rehacer = function () { VISTAS.agente(p); };
        var form = app.querySelector('[data-editar]');
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Nombre) return errorForm(form, 'Escribe el nombre del agente.');
          apiAdmin('guardarAgente', { agente: { ID: a.ID, Nombre: d.Nombre, Celular: d.Celular, Rol: d.Rol } }).then(function (g) {
            ponerEnCache('Agentes', g);
            if (yo) recordarAgente(Object.assign({}, g, { debeCambiar: false }));
            S.pub = null; toast('Agente guardado');
            if (yo && g.Rol !== ROL_ADMIN) ir('#/a/inicio'); else rehacer();
          }).catch(function () {});
        };
        var bRes = app.querySelector('[data-restablecer]'), zonaClave = app.querySelector('#zonaClave');
        bRes.onclick = function () { zonaClave.hidden = !zonaClave.hidden; bRes.setAttribute('aria-expanded', String(!zonaClave.hidden)); if (!zonaClave.hidden) app.querySelector('#f_Temporal').focus(); };
        app.querySelector('[data-guardar-clave]').onclick = function () {
          var clave = app.querySelector('#f_Temporal').value;
          if (clave.length < MIN_CONTRASENA) return toast('La contraseña temporal debe tener al menos ' + MIN_CONTRASENA + ' caracteres.');
          apiAdmin('restablecerContrasena', { ID: a.ID, Contrasena: clave }).then(function (g) {
            ponerEnCache('Agentes', g);
            if (yo) { toast('Contraseña restablecida. Vuelve a ingresar.'); return sesionVencida(); }
            toast('Contraseña restablecida. Deberá cambiarla al entrar.'); rehacer();
          }).catch(function () {});
        };
        var bBaja = app.querySelector('[data-baja]');
        if (bBaja) bBaja.onclick = function () {
          var z = app.querySelector('#zonaBaja');
          z.hidden = !z.hidden; bBaja.setAttribute('aria-expanded', String(!z.hidden));
        };
        var bConf = app.querySelector('[data-confirmar-baja]');
        if (bConf) bConf.onclick = function () {
          var hacia = app.querySelector('#f_ReasignarA').value;
          apiAdmin('estadoAgente', { ID: a.ID, Activo: 'No', ReasignarA: hacia }).then(function (g) {
            ponerEnCache('Agentes', g.agente); S.pub = null;
            toast('Agente desactivado' + (g.movidos ? ' · ' + plural(g.movidos, 'registro reasignado', 'registros reasignados') : ''));
            rehacer();
            if (g.movidos) cargarDb(true); // trae los registros reasignados
          }).catch(function () {});
        };
        var bAlta = app.querySelector('[data-alta]');
        if (bAlta) bAlta.onclick = function () {
          apiAdmin('estadoAgente', { ID: a.ID, Activo: 'Sí' }).then(function (g) { ponerEnCache('Agentes', g.agente); S.pub = null; toast('Agente reactivado'); rehacer(); }).catch(function () {});
        };
      });
  };

  // Asignar a un agente un propietario (con sus propiedades) o un interesado que llegó sin asignar.
  VISTAS.asignar = function (p) {
    var tabla = p[0], reg = buscarId(tabla, p[1]);
    if (!reg || reg.ID_Agente || ['Propietarios', 'Interesados'].indexOf(tabla) < 0) return ir('#/a/inicio');
    var tipo = tabla === 'Propietarios' ? 'propietario' : 'interesado';
    var props = tipo === 'propietario' ? T('Propiedades').filter(function (x) { return x.ID_Propietario === reg.ID && !x.ID_Agente; }) : [];
    pintar('<div class="pantalla">' + cabVolver('Asignar a…') +
      '<div class="ficha compacta"><p class="item-titulo">' + esc(reg.Nombre) + ' <span class="tag ' + tipo + '">' + NOMBRE_TIPO[tipo] + '</span></p>' +
      '<p class="item-sub">' + esc(reg.Celular || 'Sin celular') + '</p>' +
      (props.length ? '<p class="item-sub">También se asigna: ' + esc(props.map(resumenProp).join(' · ')) + '</p>' : '') + '</div>' +
      cabSeccion('¿Qué agente lo atiende?') + '<div class="lista">' + agentesActivos().map(function (a) {
        return '<button class="item" type="button" data-agente="' + esc(a.ID) + '"><span class="avatar agente">' + esc(iniciales(a.Nombre)) + '</span><div class="item-cuerpo"><div class="item-titulo">' + esc(a.Nombre) + tagsAgente(a) + '</div>' +
          htmlResumen(a.ID) + '</div>' + ic('flecha', 20) + '</button>';
      }).join('') + '</div></div></div>' + nav('inicio'), function (app) {
        enlazarVolver(app, '#/a/inicio');
        app.querySelectorAll('[data-agente]').forEach(function (b) {
          b.onclick = function () {
            apiAdmin('asignar', { tabla: tabla, id: reg.ID, agente: b.dataset.agente }).then(function (cambios) {
              cambios.forEach(function (c) { ponerEnCache(c.tabla, c.registro); });
              toast('Asignado a ' + nombreAgente(b.dataset.agente));
              history.replaceState(null, '', '#/a/inicio'); render();
            }).catch(function () {});
          };
        });
      });
  };

  /* ================= Modo demo (sin servidor) ================= */

  // Datos de ejemplo compactos: los nombres de los campos se escriben una vez por tabla.
  function filas(campos, arr) {
    campos = campos.split(' ');
    return arr.map(function (f) { var o = {}; campos.forEach(function (c, i) { o[c] = f[i] == null ? '' : f[i]; }); return o; });
  }

  // Las mismas reglas que Code.gs, con los datos guardados solo en este navegador.
  var Demo = {
    CONTRASENA: 'demo1234',
    VERSION: 6, // si cambia, los datos de ejemplo se vuelven a crear
    REDES: { FACEBOOK: 'https://web.facebook.com/alquis.group', TIKTOK: 'https://www.tiktok.com/@alquis_group', INSTAGRAM: 'https://www.instagram.com/grupoalquis/' },
    DATOS: ['Propietarios', 'Interesados', 'OtrosContactos', 'Propiedades', 'Citas', 'Llamadas', 'Reservas'],
    CONTACTOS: ['Propietarios', 'Interesados', 'OtrosContactos'],
    TABLA_CONTACTO: { Interesado: 'Interesados', Propietario: 'Propietarios', Otro: 'OtrosContactos' },
    NOMBRE: { Propietarios: 'El propietario', Interesados: 'El interesado', OtrosContactos: 'El contacto', Propiedades: 'La propiedad', Citas: 'La cita', Llamadas: 'La llamada', Reservas: 'La reserva' },
    OBLIGATORIOS: { Propietarios: 'Nombre', Interesados: 'Nombre', OtrosContactos: 'Nombre', Propiedades: 'Tipo', Citas: 'Fecha', Llamadas: 'ID_Contacto' },
    prefijos: { Propietarios: 'PRO', Interesados: 'INT', OtrosContactos: 'OTR', Propiedades: 'PRP', Citas: 'CIT', Llamadas: 'LLA', Reservas: 'RES', Agentes: 'AGE' },
    MSJ_AJENO: 'Este registro no existe o no es tuyo.',
    MSJ_DUPLICADO: 'Este número ya está registrado por otro agente. Consulta con el administrador.',
    MSJ_SIN_ASIGNAR: 'Primero asigna ese contacto a un agente (Inicio > Sin asignar).',

    cargar: function () {
      var db = leerJSON('inmo_demo_db');
      if (db && db.Version === Demo.VERSION) return db;
      db = Demo.inicial();
      Demo.guardar(db);
      return db;
    },
    inicial: function () {
      var h = hoy(), d = function (n) { return sumarDias(h, n); };
      var db = {
        Version: Demo.VERSION,
        Config: Object.assign({ NOMBRE_NEGOCIO: MARCA, WHATSAPP: '51999999999', ZONAS: 'San Jerónimo, San Sebastián, Wanchaq, Santiago, Cusco Centro', CARACTERISTICAS: 'Con título, Agua, Luz, Desagüe, Pista asfaltada, Cochera, Jardín', CATEGORIAS_OTROS: 'Notario, Municipalidad, Topógrafo, Banco, Abogado, Otro agente, Otro' }, Demo.REDES),
        Sesiones: {},
        Fallos: {},
        // Solo en el modo demo las contraseñas quedan en este navegador; el servidor real guarda un hash.
        Claves: { 'AGE-0001': Demo.CONTRASENA, 'AGE-0002': Demo.CONTRASENA, 'AGE-0003': Demo.CONTRASENA },
        Agentes: filas('ID Usuario Nombre Celular Rol Activo DebeCambiarContrasena FechaRegistro', [
          ['AGE-0001', 'aldo', 'Aldo Quispe', '', 'Administrador', 'Sí', 'No', d(-60)],
          ['AGE-0002', 'maria', 'María Fernández', '984111222', 'Agente', 'Sí', 'No', d(-40)],
          ['AGE-0003', 'jose', 'José Huamán', '974333444', 'Agente', 'Sí', 'No', d(-40)]
        ]),
        Propietarios: filas('ID Nombre Celular Origen FechaRegistro Notas', [
          ['PRO-0001', 'María Quispe', '984123456', 'Agente', d(-20)],
          ['PRO-0002', 'Pedro Ccahua', '974555210', 'Agente', d(-15)],
          ['PRO-0003', 'Ana Torres', '951330778', 'Agente', d(-10)],
          ['PRO-0004', 'Julia Mendoza', '962410337', 'App', d(-1)]
        ]),
        Interesados: filas('ID Nombre Celular Operacion Tipo Zonas PresupuestoMax AreaMin DormitoriosMin Caracteristicas Origen FechaRegistro Temperatura DetalleInteres EstadoSeguimiento OpcionesAvisadas Notas', [
          ['INT-0001', 'Juan Pérez', '987654321', 'Venta', 'Terreno', 'San Jerónimo, San Sebastián', '150000', '150', '', 'Con título, Agua', 'Agente', d(-12), 'Tibio', 'Visitó el terreno de San Jerónimo; le gustó, pero lo ve un poco caro.', 'Activo'],
          ['INT-0002', 'Rosa Mamani', '965112449', 'Venta', 'Casa', 'Wanchaq', '260000', '', '3', 'Cochera', 'Agente', d(-9), 'Caliente', 'Separó la casa de San Sebastián; espera la aprobación del crédito.'],
          ['INT-0003', 'Luis Condori', '942870615', 'Venta', 'Casa', '', '250000', '', '', '', 'App', d(-5), 'Frío'],
          ['INT-0004', 'Carlos Huamán', '958221904', 'Venta', 'Departamento', 'Santiago, Wanchaq', '200000', '', '2', '', 'Agente', d(-6), 'Caliente', 'Reservó el departamento de Santiago. Firma en una semana.'],
          ['INT-0005', 'Elena Vargas', '951778204', 'Venta', 'Casa', 'Wanchaq', '230000', '', '2', '', 'App', d(-1), 'Frío'],
          ['INT-0006', 'Sofía Paredes', '984550671', 'Venta', 'Casa', 'Wanchaq', '250000', '', '3', '', 'Agente', d(-8), 'Caliente', 'Quiere mudarse antes de fin de año.', 'Activo'],
          ['INT-0007', 'Diego Ramos', '973118450', '', '', '', '', '', '', '', 'Agente', d(-4), 'Tibio', 'Pidió que lo llamen la próxima semana.', 'Activo'],
          ['INT-0008', 'Pilar Soto', '962004318', 'Venta', 'Terreno', 'San Jerónimo', '140000', '', '', '', 'Agente', d(-20), 'Tibio', 'Busca un terreno con título en San Jerónimo.', 'En espera', 'PRP-0001'],
          ['INT-0009', 'Raúl Mendoza', '951602233', 'Alquiler', 'Local', 'Cusco Centro', '2000', '', '', '', 'Agente', d(-15), 'Frío', 'Quiere un local pequeño para una cafetería.', 'En espera'],
          ['INT-0010', 'Martín Ríos', '940772615', 'Venta', 'Departamento', 'Santiago', '190000', '', '2', '', 'Agente', d(-50), 'Caliente', 'Compró en septiembre.', 'Compró'],
          ['INT-0011', 'Gloria Huamán', '958330147', 'Venta', 'Casa', 'San Sebastián', '120000', '', '', '', 'Agente', d(-40), 'Frío', 'Ya no busca: se quedará en su casa actual.', 'Descartado']
        ]),
        OtrosContactos: filas('ID Nombre Celular Categoria Detalle FechaRegistro', [
          ['OTR-0001', 'Dr. Ramírez', '984700120', 'Notario', 'Notaría del centro', d(-30)],
          ['OTR-0002', 'Jorge Huallpa', '973450882', 'Topógrafo', 'Planos y linderos', d(-25)]
        ]),
        Propiedades: filas('ID ID_Propietario Operacion Tipo Zona Direccion Area Dormitorios Precio Caracteristicas Descripcion Estado Origen FechaRegistro', [
          ['PRP-0001', 'PRO-0001', 'Venta', 'Terreno', 'San Jerónimo', 'Calle Los Pinos s/n', '200', '', '120000', 'Con título, Agua, Luz', 'Terreno plano, cerca a la avenida principal.', 'Disponible', 'Agente', d(-20)],
          ['PRP-0002', 'PRO-0002', 'Venta', 'Casa', 'Wanchaq', 'Jr. Los Álamos 210', '160', '3', '240000', 'Con título, Agua, Luz, Desagüe, Cochera', 'Casa de dos pisos con patio.', 'Disponible', 'Agente', d(-15)],
          ['PRP-0003', 'PRO-0003', 'Venta', 'Departamento', 'Santiago', 'Av. Antonio Lorena 455', '85', '2', '180000', 'Agua, Luz, Desagüe', '', 'Reservado', 'Agente', d(-10)],
          ['PRP-0004', 'PRO-0001', 'Venta', 'Terreno', 'San Sebastián', '', '300', '', '185000', 'Con título, Agua', '', 'Disponible', 'Agente', d(-8)],
          ['PRP-0005', 'PRO-0004', 'Alquiler', 'Departamento', 'Wanchaq', 'Calle Tacna 120', '70', '2', '1500', 'Agua, Luz', 'Departamento amoblado.', 'Pendiente', 'App', d(-1)],
          ['PRP-0006', 'PRO-0002', 'Venta', 'Casa', 'San Sebastián', 'Urb. Túpac Amaru B-12', '140', '3', '210000', 'Con título, Agua, Luz, Desagüe, Jardín', 'Casa de un piso con jardín interior.', 'Reservado', 'Agente', d(-18)],
          ['PRP-0007', 'PRO-0003', 'Alquiler', 'Local', 'Cusco Centro', 'Calle Plateros 330', '45', '', '2800', 'Agua, Luz', 'Local comercial a media cuadra de la plaza.', 'Reservado', 'Agente', d(-14)],
          ['PRP-0008', 'PRO-0001', 'Venta', 'Terreno', 'San Jerónimo', 'Pasaje Las Flores', '180', '', '135000', 'Con título, Agua, Luz', 'Terreno recién captado, listo para construir.', 'Disponible', 'Agente', h]
        ]),
        Citas: filas('ID ID_Interesado ID_Propiedad Fecha Hora Notas Estado FechaRegistro TipoCita TipoContacto ID_Contacto Resultado', [
          ['CIT-0001', 'INT-0001', 'PRP-0001', h, '10:00', 'Llevar plano', 'Pendiente', d(-3)],
          ['CIT-0002', 'INT-0002', 'PRP-0002', h, '12:30', '', 'Pendiente', d(-2)],
          ['CIT-0003', 'INT-0004', 'PRP-0003', h, '16:00', '', 'Pendiente', d(-2)],
          ['CIT-0004', 'INT-0003', 'PRP-0002', d(2), '09:30', '', 'Pendiente', d(-1)],
          ['CIT-0005', 'INT-0001', 'PRP-0004', d(7), '10:00', '', 'Pendiente', d(-1)],
          ['CIT-0006', '', '', h, '15:30', 'Quiere vender un terreno en Santiago.', 'Pendiente', d(-1), 'Captación', 'Propietario', 'PRO-0003'],
          ['CIT-0007', '', 'PRP-0004', d(1), '11:00', 'Tomar fotos y medidas del terreno.', 'Pendiente', d(-1), 'Captación', 'Propietario', 'PRO-0001'],
          ['CIT-0008', '', 'PRP-0003', d(1), '17:00', 'Revisar la minuta del departamento reservado.', 'Pendiente', d(-1), 'Reunión', 'Otro', 'OTR-0001'],
          ['CIT-0009', '', '', d(3), '10:30', 'Firmar la autorización de venta.', 'Pendiente', d(-1), 'Reunión', 'Propietario', 'PRO-0002'],
          ['CIT-0010', 'INT-0002', 'PRP-0006', d(-6), '18:00', 'Conversar la forma de pago.', 'Realizada', d(-8), 'Reunión', 'Interesado', 'INT-0002', 'Acordó separar la casa con S/ 3 000 mientras le aprueban el crédito.'],
          ['CIT-0011', 'INT-0001', 'PRP-0001', d(-12), '11:00', '', 'Realizada', d(-13), 'Visita', 'Interesado', 'INT-0001', 'Le gustó el terreno, pero pidió una rebaja. Lo conversa con su familia.'],
          ['CIT-0012', 'INT-0004', 'PRP-0003', d(-5), '17:00', '', 'Realizada', d(-6), 'Visita', 'Interesado', 'INT-0004', 'Le encantó. Separa mañana con S/ 2 000.'],
          ['CIT-0013', 'INT-0003', 'PRP-0002', d(-3), '10:00', '', 'Cancelada', d(-4), 'Visita', 'Interesado', 'INT-0003', 'No asistió. No contestó el celular.'],
          ['CIT-0014', 'INT-0001', 'PRP-0004', d(-1), '16:00', 'Mostrar el terreno más grande.', 'Pendiente', d(-3), 'Visita', 'Interesado', 'INT-0001'],
          ['CIT-0015', '', 'PRP-0006', d(-2), '11:30', 'Revisar documentos de la casa.', 'Pendiente', d(-4), 'Captación', 'Propietario', 'PRO-0002']
        ]),
        Reservas: filas('ID ID_Propiedad ID_Interesado FechaReserva MontoSeparacion FechaLimite Estado Notas FechaRegistro', [
          ['RES-0001', 'PRP-0003', 'INT-0004', d(-4), '2000', d(6), 'Activa', 'Pagó por transferencia.', d(-4)],
          ['RES-0002', 'PRP-0006', 'INT-0002', d(-6), '3000', d(2), 'Activa', 'Espera la aprobación del crédito.', d(-6)],
          ['RES-0003', 'PRP-0007', 'INT-0004', d(-9), '500', d(-1), 'Activa', 'Lo quiere para una oficina.', d(-9)],
          ['RES-0004', 'PRP-0001', 'INT-0001', d(-12), '1000', d(-5), 'Cancelada', 'Desistió por el precio.', d(-12)]
        ]),
        Llamadas: filas('ID TipoContacto ID_Contacto ID_Propiedad Motivo Fecha Estado FechaRegistro', [
          ['LLA-0001', 'Interesado', 'INT-0002', 'PRP-0002', 'Enviar más datos de la casa en Wanchaq', d(-1), 'Pendiente', d(-3)],
          ['LLA-0002', 'Propietario', 'PRO-0001', 'PRP-0001', 'Confirmar precio del terreno', h, 'Pendiente', d(-2)],
          ['LLA-0003', 'Interesado', 'INT-0003', '', 'Ofrecer casas hasta S/ 250 000', h, 'Pendiente', d(-2)],
          ['LLA-0004', 'Otro', 'OTR-0001', 'PRP-0003', 'Ver minuta del departamento de Santiago', h, 'Pendiente', d(-2)],
          ['LLA-0005', 'Otro', 'OTR-0002', '', 'Cotizar plano perimétrico', d(3), 'Pendiente', d(-1)],
          ['LLA-0006', 'Interesado', 'INT-0001', 'PRP-0004', 'Enviar fotos del terreno de San Sebastián', d(-2), 'Pendiente', d(-3)]
        ])
      };
      // Aldo (administrador), María y José tienen sus propios registros. El resto llegó desde la app y está sin asignar.
      var duenos = {
        'AGE-0001': ['PRO-0003', 'PRP-0003', 'PRP-0007', 'INT-0004', 'OTR-0001', 'CIT-0003', 'CIT-0006', 'CIT-0008', 'CIT-0012', 'RES-0001', 'RES-0003', 'LLA-0004'],
        'AGE-0002': ['PRO-0001', 'PRP-0001', 'PRP-0004', 'PRP-0008', 'INT-0001', 'INT-0006', 'INT-0007', 'INT-0008', 'INT-0009', 'INT-0010', 'INT-0011', 'OTR-0002', 'CIT-0001', 'CIT-0005', 'CIT-0007', 'CIT-0011', 'CIT-0014', 'RES-0004', 'LLA-0002', 'LLA-0005', 'LLA-0006'],
        'AGE-0003': ['PRO-0002', 'PRP-0002', 'PRP-0006', 'INT-0002', 'INT-0003', 'CIT-0002', 'CIT-0004', 'CIT-0009', 'CIT-0010', 'CIT-0013', 'CIT-0015', 'RES-0002', 'LLA-0001', 'LLA-0003']
      };
      var dueno = {};
      Object.keys(duenos).forEach(function (a) { duenos[a].forEach(function (id) { dueno[id] = a; }); });
      Demo.DATOS.forEach(function (t) { db[t].forEach(function (x) { x.ID_Agente = dueno[x.ID] || ''; }); });
      return db;
    },
    guardar: function (db) { guardarLocal('inmo_demo_db', JSON.stringify(db)); },
    config: function (c) {
      return { negocio: c.NOMBRE_NEGOCIO, whatsapp: c.WHATSAPP, facebook: urlSegura(c.FACEBOOK), tiktok: urlSegura(c.TIKTOK), instagram: urlSegura(c.INSTAGRAM), zonas: lista(c.ZONAS), caracteristicas: lista(c.CARACTERISTICAS), categoriasOtros: lista(c.CATEGORIAS_OTROS) };
    },
    falla: function (msg, duplicado) { var e = new Error(msg); e.duplicado = !!duplicado; throw e; },
    copia: function (x) { return x ? Object.assign({}, x) : null; },
    token: function () {
      var b = new Uint8Array(32);
      (window.crypto || window.msCrypto).getRandomValues(b);
      return Array.prototype.map.call(b, function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    },
    insertar: function (db, tabla, reg) {
      var pre = Demo.prefijos[tabla], arr = db[tabla], i = -1;
      if (reg.ID) i = arr.findIndex(function (x) { return x.ID === reg.ID; });
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], reg); Demo.guardar(db); return arr[i]; }
      var max = arr.reduce(function (m, x) { return Math.max(m, parseInt(String(x.ID).split('-')[1], 10) || 0); }, 0);
      var nuevo = Object.assign({}, reg, { ID: pre + '-' + ('0000' + (max + 1)).slice(-4), FechaRegistro: hoy() + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) });
      arr.push(nuevo); Demo.guardar(db); return nuevo;
    },
    buscar: function (db, tabla, id) { return id ? db[tabla].find(function (x) { return x.ID === id; }) || null : null; },

    /* --- Agentes y sesiones --- */
    esAdmin: function (a) { return !!a && a.Rol === ROL_ADMIN; },
    activo: function (a) { return !!a && agenteActivo(a); },
    debe: function (a) { return /^s[ií]$/i.test(String(a.DebeCambiarContrasena).trim()); },
    perfil: function (a) { return { ID: a.ID, Usuario: a.Usuario, Nombre: a.Nombre, Rol: Demo.esAdmin(a) ? ROL_ADMIN : 'Agente', debeCambiar: Demo.debe(a) }; },
    ver: function (ag, reg) { return !!reg && (Demo.esAdmin(ag) || (!!reg.ID_Agente && reg.ID_Agente === ag.ID)); },
    nuevaSesion: function (db, a) {
      var t = Demo.token(), v = Date.now() + 30 * 24 * 60 * 60 * 1000;
      db.Sesiones[t] = { a: a.ID, v: v };
      Demo.guardar(db);
      return { token: t, vence: v, agente: Demo.perfil(a) };
    },
    sesion: function (db, token) {
      var s = token && db.Sesiones[token];
      var a = s && s.v > Date.now() ? Demo.buscar(db, 'Agentes', s.a) : null;
      if (!a || !Demo.activo(a)) { if (s) { delete db.Sesiones[token]; Demo.guardar(db); } return null; }
      return a;
    },
    cerrarSesiones: function (db, id) { Object.keys(db.Sesiones).forEach(function (t) { if (db.Sesiones[t].a === id) delete db.Sesiones[t]; }); },
    // Bloqueo por usuario como en el servidor: 5 intentos fallidos bloquean ese usuario 15 minutos.
    login: function (db, d) {
      var u = String(d.usuario || '').trim().toLowerCase(), f = db.Fallos[u] || { n: 0, hasta: 0 };
      if (f.hasta > Date.now()) return { ok: false, error: 'Demasiados intentos fallidos. Por seguridad, el acceso está bloqueado. Inténtalo de nuevo en ' + Math.ceil((f.hasta - Date.now()) / 60000) + ' minutos.', bloqueado: true };
      var a = db.Agentes.find(function (x) { return x.Usuario.toLowerCase() === u; });
      if (!a || db.Claves[a.ID] !== d.password) {
        f.n++;
        if (f.n >= 5) { f = { n: 0, hasta: Date.now() + 15 * 60000 }; db.Fallos[u] = f; Demo.guardar(db); return { ok: false, error: 'Demasiados intentos fallidos. Por seguridad, el acceso está bloqueado. Inténtalo de nuevo en 15 minutos.', bloqueado: true }; }
        db.Fallos[u] = f; Demo.guardar(db);
        var q = 5 - f.n;
        return { ok: false, error: 'Usuario o contraseña incorrectos. En el modo demo: aldo, maria o jose, con demo1234. Te ' + (q === 1 ? 'queda 1 intento.' : 'quedan ' + q + ' intentos.') };
      }
      delete db.Fallos[u];
      if (!Demo.activo(a)) { Demo.guardar(db); return { ok: false, error: 'Tu cuenta está desactivada. Consulta con el administrador.' }; }
      return { ok: true, data: Demo.nuevaSesion(db, a) };
    },
    cambiarContrasena: function (db, ag, d) {
      var nueva = String(d.nueva || '');
      if (nueva.length < MIN_CONTRASENA) return { ok: false, error: 'La nueva contraseña debe tener al menos ' + MIN_CONTRASENA + ' caracteres.' };
      if (db.Claves[ag.ID] !== d.actual) return { ok: false, error: 'La contraseña actual no es correcta.' };
      if (d.actual === nueva) return { ok: false, error: 'La nueva contraseña debe ser distinta de la actual.' };
      db.Claves[ag.ID] = nueva;
      Demo.cerrarSesiones(db, ag.ID);
      var a = Demo.insertar(db, 'Agentes', { ID: ag.ID, DebeCambiarContrasena: 'No' });
      return { ok: true, data: Demo.nuevaSesion(db, a) };
    },
    adminsActivos: function (db, salvo) { return db.Agentes.filter(function (a) { return a.ID !== salvo && Demo.esAdmin(a) && Demo.activo(a); }).length; },
    guardarAgente: function (db, d) {
      d = d || {};
      var nombre = String(d.Nombre || '').trim(), rol = d.Rol === ROL_ADMIN ? ROL_ADMIN : 'Agente';
      if (!nombre) Demo.falla('Escribe el nombre del agente.');
      if (d.ID) {
        var previo = Demo.buscar(db, 'Agentes', d.ID);
        if (!previo) Demo.falla('Este agente ya no existe.');
        if (Demo.esAdmin(previo) && Demo.activo(previo) && rol !== ROL_ADMIN && !Demo.adminsActivos(db, previo.ID)) Demo.falla('No puedes quitar el rol al último administrador.');
        return Demo.copia(Demo.insertar(db, 'Agentes', { ID: previo.ID, Nombre: nombre, Celular: String(d.Celular || '').trim(), Rol: rol }));
      }
      var u = String(d.Usuario || '').trim().toLowerCase();
      if (!/^[a-z0-9._]{3,30}$/.test(u)) Demo.falla('El usuario debe tener de 3 a 30 caracteres: letras sin tildes, números, punto o guion bajo.');
      if (db.Agentes.some(function (a) { return a.Usuario.toLowerCase() === u; })) Demo.falla('El usuario "' + u + '" ya existe. Elige otro.');
      if (String(d.Contrasena || '').length < MIN_CONTRASENA) Demo.falla('La contraseña debe tener al menos ' + MIN_CONTRASENA + ' caracteres.');
      var nuevo = Demo.insertar(db, 'Agentes', { Usuario: u, Nombre: nombre, Celular: String(d.Celular || '').trim(), Rol: rol, Activo: 'Sí', DebeCambiarContrasena: 'Sí' });
      db.Claves[nuevo.ID] = d.Contrasena; Demo.guardar(db);
      return Demo.copia(nuevo);
    },
    restablecer: function (db, d) {
      if (String(d.Contrasena || '').length < MIN_CONTRASENA) Demo.falla('La contraseña debe tener al menos ' + MIN_CONTRASENA + ' caracteres.');
      var a = Demo.buscar(db, 'Agentes', d.ID);
      if (!a) Demo.falla('Este agente ya no existe.');
      db.Claves[a.ID] = d.Contrasena;
      Demo.cerrarSesiones(db, a.ID);
      delete db.Fallos[a.Usuario.toLowerCase()];
      return Demo.copia(Demo.insertar(db, 'Agentes', { ID: a.ID, DebeCambiarContrasena: 'Sí' }));
    },
    estadoAgente: function (db, ag, d) {
      var a = Demo.buscar(db, 'Agentes', d.ID);
      if (!a) Demo.falla('Este agente ya no existe.');
      if (d.Activo === 'Sí') return { agente: Demo.copia(Demo.insertar(db, 'Agentes', { ID: a.ID, Activo: 'Sí' })), movidos: 0 };
      if (a.ID === ag.ID) Demo.falla('No puedes desactivar tu propia cuenta.');
      if (Demo.esAdmin(a) && !Demo.adminsActivos(db, a.ID)) Demo.falla('No puedes desactivar al último administrador.');
      var movidos = 0;
      if (d.ReasignarA) {
        var destino = Demo.buscar(db, 'Agentes', d.ReasignarA);
        if (!destino || !Demo.activo(destino) || destino.ID === a.ID) Demo.falla('Elige un agente activo para recibir sus registros.');
        Demo.DATOS.forEach(function (t) { db[t].forEach(function (x) { if (x.ID_Agente === a.ID) { x.ID_Agente = destino.ID; movidos++; } }); });
      }
      Demo.cerrarSesiones(db, a.ID);
      return { agente: Demo.copia(Demo.insertar(db, 'Agentes', { ID: a.ID, Activo: 'No' })), movidos: movidos };
    },
    asignar: function (db, d) {
      if (['Propietarios', 'Interesados'].indexOf(d.tabla) < 0) Demo.falla('Solo se pueden asignar propietarios e interesados.');
      var reg = Demo.buscar(db, d.tabla, d.id);
      if (!reg) Demo.falla('Este registro ya no existe.');
      if (reg.ID_Agente) Demo.falla('Este registro ya está asignado.');
      var destino = Demo.buscar(db, 'Agentes', d.agente);
      if (!destino || !Demo.activo(destino)) Demo.falla('Elige un agente activo.');
      var cambios = [{ tabla: d.tabla, registro: Demo.copia(Demo.insertar(db, d.tabla, { ID: reg.ID, ID_Agente: destino.ID })) }];
      if (d.tabla === 'Propietarios') db.Propiedades.forEach(function (p) {
        if (p.ID_Propietario === reg.ID && !p.ID_Agente) cambios.push({ tabla: 'Propiedades', registro: Demo.copia(Demo.insertar(db, 'Propiedades', { ID: p.ID, ID_Agente: destino.ID })) });
      });
      return cambios;
    },

    /* --- Dueño de cada registro (igual que en Code.gs) --- */
    tablaContacto: function (tipo) { var t = Demo.TABLA_CONTACTO[tipo]; if (!t) Demo.falla('Tipo de contacto no válido.'); return t; },
    relaciones: function (tabla, r) {
      var pares = [];
      if (tabla === 'Propiedades') pares.push(['Propietarios', r.ID_Propietario]);
      if (tabla === 'Citas') {
        var tipo = r.TipoContacto || (r.TipoCita === 'Captación' ? 'Propietario' : 'Interesado');
        var id = r.ID_Contacto || (tipo === 'Interesado' ? r.ID_Interesado : '');
        pares.push(['Interesados', r.ID_Interesado], ['Propiedades', r.ID_Propiedad]);
        if (id) pares.push([Demo.tablaContacto(tipo), id]);
      }
      if (tabla === 'Llamadas') {
        if (r.ID_Contacto) pares.push([Demo.tablaContacto(r.TipoContacto), r.ID_Contacto]);
        pares.push(['Propiedades', r.ID_Propiedad]);
      }
      return pares.filter(function (p) { return String(p[1] || '').trim(); });
    },
    relacionados: function (db, ag, pares) {
      return pares.map(function (p) {
        var reg = Demo.buscar(db, p[0], p[1]);
        if (!Demo.ver(ag, reg)) Demo.falla(Demo.NOMBRE[p[0]] + ' elegido ya no existe o no es tuyo.');
        return { tabla: p[0], reg: reg };
      });
    },
    duenoNuevo: function (ag, rel) { return !Demo.esAdmin(ag) ? ag.ID : (rel.length ? rel[0].reg.ID_Agente : ag.ID); },
    mismoAgente: function (rel, dueno) {
      rel.forEach(function (x) { if (x.reg.ID_Agente !== dueno) Demo.falla(Demo.NOMBRE[x.tabla] + ' es de otro agente. En una cita, llamada, propiedad o reserva, todo debe ser del mismo agente.'); });
    },
    digitos: function (c) { var d = soloDigitos(c); return d.length >= 6 ? d.slice(-9) : ''; },
    revisarCelular: function (db, reg, previo, dueno) {
      if (!('Celular' in reg)) return;
      var d = Demo.digitos(reg.Celular);
      if (!d || (previo && Demo.digitos(previo.Celular) === d)) return;
      if (Demo.CONTACTOS.some(function (t) { return db[t].some(function (x) { return x.ID_Agente && x.ID_Agente !== dueno && Demo.digitos(x.Celular) === d; }); })) Demo.falla(Demo.MSJ_DUPLICADO, true);
    },
    revisarTemperatura: function (reg, nuevo) {
      var t = String(reg.Temperatura == null ? '' : reg.Temperatura).trim(), e = String(reg.EstadoSeguimiento == null ? '' : reg.EstadoSeguimiento).trim();
      if (t && TEMPERATURAS.indexOf(t) < 0) Demo.falla('Elige un nivel de interés válido: Frío, Tibio o Caliente.');
      if (e && ESTADOS_SEG.indexOf(e) < 0) Demo.falla('Elige un estado válido: Activo, En espera, Compró o Descartado.');
      if (nuevo && !t) reg.Temperatura = 'Frío';
      if (nuevo && !e) reg.EstadoSeguimiento = 'Activo';
    },
    // Igual que lote() en Code.gs.
    lote: function (db, ag, ops) {
      var reales = {}, fallidos = [];
      return (ops || []).map(function (op) {
        var texto = JSON.stringify(op.datos || {});
        if (fallidos.some(function (t) { return texto.indexOf('"' + t + '"') >= 0; })) { if (op.tmp) fallidos.push(op.tmp); return { ok: false, omitida: true }; }
        try {
          var datos = JSON.parse(texto, function (k, v) { return typeof v === 'string' && reales[v] ? reales[v] : v; }), r;
          if (op.accion === 'guardar') { r = Demo.guardarRegistro(db, ag, op.tabla, datos, op.confirmarDuplicado === true); if (op.tmp) reales[op.tmp] = r.ID; }
          else if (op.accion === 'cerrarCita') { r = Demo.cerrarCita(db, ag, datos); if (op.tmp && r.llamada) reales[op.tmp] = r.llamada.ID; }
          else Demo.falla('Acción desconocida.');
          return { ok: true, data: r };
        } catch (e) {
          if (op.tmp) fallidos.push(op.tmp);
          var res = { ok: false, error: String(e.message || e) };
          if (e.duplicado) res.duplicado = true;
          return res;
        }
      });
    },
    reservaActiva: function (db, idp, salvo) {
      return db.Reservas.find(function (r) { return r.ID_Propiedad === idp && r.Estado === 'Activa' && r.ID !== salvo; });
    },
    liberar: function (db, idp) {
      var p = Demo.buscar(db, 'Propiedades', idp);
      if (!p || p.Estado !== 'Reservado' || Demo.reservaActiva(db, idp)) return null;
      return Demo.copia(Demo.insertar(db, 'Propiedades', { ID: idp, Estado: 'Disponible' }));
    },
    guardarRegistro: function (db, ag, tabla, reg, confirmarDuplicado) {
      if (Demo.DATOS.indexOf(tabla) < 0) Demo.falla('Tabla no válida.');
      if (tabla === 'Reservas') Demo.falla('Las reservas se guardan con su propio formulario.');
      reg = Object.assign({}, reg || {});
      var ob = Demo.OBLIGATORIOS[tabla];
      if ((!reg.ID || ob in reg) && !String(reg[ob] || '').trim()) Demo.falla('Falta el campo ' + ob + '.');
      delete reg.ID_Agente;
      if (tabla === 'Citas' && reg.TipoContacto === 'Interesado' && reg.ID_Contacto) reg.ID_Interesado = reg.ID_Contacto;
      if (tabla === 'Interesados') Demo.revisarTemperatura(reg, !reg.ID);
      var previo = reg.ID ? Demo.buscar(db, tabla, reg.ID) : null;
      if (reg.ID && !Demo.ver(ag, previo)) Demo.falla(Demo.MSJ_AJENO);
      var rel = Demo.relacionados(db, ag, Demo.relaciones(tabla, Object.assign({}, previo, reg)));
      var dueno = previo ? previo.ID_Agente : Demo.duenoNuevo(ag, rel);
      if (!previo && !dueno) Demo.falla(Demo.MSJ_SIN_ASIGNAR);
      Demo.mismoAgente(rel, dueno);
      if (!Demo.esAdmin(ag) && !confirmarDuplicado && Demo.CONTACTOS.indexOf(tabla) >= 0) Demo.revisarCelular(db, reg, previo, dueno);
      if (!previo) reg.ID_Agente = dueno;
      if (tabla === 'Propiedades' && previo && ('Estado' in reg) && reg.Estado !== 'Reservado' && Demo.reservaActiva(db, previo.ID)) Demo.falla('Esta propiedad tiene una reserva activa. Para cambiar su estado, marca la reserva como concretada o cancelada en el detalle de la propiedad.');
      return Demo.copia(Demo.insertar(db, tabla, reg));
    },
    eliminar: function (db, ag, tabla, id) {
      if (Demo.DATOS.indexOf(tabla) < 0) Demo.falla('Tabla no válida.');
      var previo = Demo.buscar(db, tabla, id);
      if (!Demo.ver(ag, previo)) Demo.falla(Demo.MSJ_AJENO);
      if (tabla === 'Propiedades' && Demo.reservaActiva(db, id)) Demo.falla('Esta propiedad tiene una reserva activa. Cancélala antes de eliminar la propiedad.');
      db[tabla] = db[tabla].filter(function (x) { return x.ID !== id; }); Demo.guardar(db);
      return { id: id, propiedad: tabla === 'Reservas' && previo.Estado === 'Activa' ? Demo.liberar(db, previo.ID_Propiedad) : null };
    },
    guardarReserva: function (db, ag, r) {
      r = r || {};
      var previa = r.ID ? Demo.buscar(db, 'Reservas', r.ID) : null;
      if (r.ID && !Demo.ver(ag, previa)) Demo.falla(Demo.MSJ_AJENO);
      var idProp = previa ? previa.ID_Propiedad : String(r.ID_Propiedad || '').trim();
      var idInt = ('ID_Interesado' in r || !previa) ? String(r.ID_Interesado || '').trim() : previa.ID_Interesado;
      if (!idProp) Demo.falla('Elige la propiedad que se reserva.');
      if (!idInt) Demo.falla('Elige al interesado que reserva.');
      var rel = Demo.relacionados(db, ag, [['Propiedades', idProp], ['Interesados', idInt]]);
      var dueno = previa ? previa.ID_Agente : Demo.duenoNuevo(ag, rel);
      if (!previa && !dueno) Demo.falla(Demo.MSJ_SIN_ASIGNAR);
      Demo.mismoAgente(rel, dueno);
      var prop = rel[0].reg;
      var antes = previa ? previa.Estado : '';
      var estado = previa ? (r.Estado || antes || 'Activa') : 'Activa';
      if (ESTADOS_RESERVA.indexOf(estado) < 0) Demo.falla('Estado de reserva no válido.');
      if (previa && estado !== antes && antes !== 'Activa') Demo.falla('Esta reserva ya está ' + String(antes).toLowerCase() + '. Si el cliente vuelve, registra una reserva nueva.');
      if (estado === 'Activa' && Demo.reservaActiva(db, idProp, previa && previa.ID)) Demo.falla('La propiedad ' + idProp + ' ya tiene una reserva activa. Márcala como concretada o cancelada antes de registrar otra.');
      if (!previa && prop.Estado !== 'Disponible' && prop.Estado !== 'Reservado') Demo.falla('Solo se puede reservar una propiedad disponible. Esta figura como "' + (prop.Estado || 'sin estado') + '".');
      var datos = { ID_Propiedad: idProp, ID_Interesado: idInt, Estado: estado };
      ['FechaReserva', 'MontoSeparacion', 'FechaLimite', 'Notas'].forEach(function (k) { if (k in r) datos[k] = String(r[k] == null ? '' : r[k]).trim(); });
      if (previa) datos.ID = previa.ID;
      else { datos.ID_Agente = dueno; if (!datos.FechaReserva) datos.FechaReserva = hoy(); }
      var reserva = Demo.copia(Demo.insertar(db, 'Reservas', datos));
      var propiedad = null, interesado = null;
      if (estado === 'Activa' && prop.Estado !== 'Reservado') propiedad = Demo.insertar(db, 'Propiedades', { ID: prop.ID, Estado: 'Reservado' });
      if (estado === 'Concretada' && antes !== 'Concretada') {
        propiedad = Demo.insertar(db, 'Propiedades', { ID: prop.ID, Estado: prop.Operacion === 'Alquiler' ? 'Alquilado' : 'Vendido' });
        interesado = Demo.insertar(db, 'Interesados', { ID: idInt, EstadoSeguimiento: 'Compró' });
      }
      if (estado === 'Cancelada' && antes !== 'Cancelada') propiedad = Demo.liberar(db, prop.ID);
      return { reserva: reserva, propiedad: Demo.copia(propiedad), interesado: Demo.copia(interesado) };
    },
    cerrarCita: function (db, ag, d) {
      var estado = ESTADO_CITA_SEGUN[d.Que];
      if (!estado) Demo.falla('Elige qué pasó con la cita.');
      var fecha = String(d.Fecha || '').trim();
      if (d.Que === 'reprogramada' && !esIso(fecha)) Demo.falla('Elige la nueva fecha de la cita.');
      var cita = Demo.buscar(db, 'Citas', d.ID);
      if (!Demo.ver(ag, cita)) Demo.falla(Demo.MSJ_AJENO);
      var k = contactoDeCita(cita), interesado = null;
      if (d.Interesado && k.tipo === 'interesado' && k.id) {
        var actual = Demo.buscar(db, 'Interesados', k.id);
        if (!actual || actual.ID_Agente !== cita.ID_Agente) Demo.falla('El interesado de esta cita ya no existe o es de otro agente.');
        interesado = { ID: k.id };
        ['Temperatura', 'DetalleInteres', 'EstadoSeguimiento', 'OpcionesAvisadas', 'Celular', 'Operacion', 'Tipo', 'Zonas', 'PresupuestoMax', 'AreaMin', 'DormitoriosMin', 'Caracteristicas'].forEach(function (c) {
          if (c in d.Interesado) interesado[c] = String(d.Interesado[c] == null ? '' : d.Interesado[c]).trim();
        });
        Demo.revisarTemperatura(interesado, false);
      }
      if (d.Llamada) {
        var ct = k.id ? Demo.buscar(db, TABLA_DE[k.tipo], k.id) : null;
        if (!ct || ct.ID_Agente !== cita.ID_Agente) Demo.falla('Esta cita no tiene un contacto al que llamar.');
      }
      var regCita = { ID: cita.ID, Estado: estado, Resultado: d.Que === 'noAsistio' ? textoNoAsistio(d.Resultado) : String(d.Resultado || '').trim() };
      if (d.Que === 'reprogramada') { regCita.Fecha = fecha; regCita.Hora = d.Hora || ''; }
      var out = { cita: Demo.copia(Demo.insertar(db, 'Citas', regCita)), interesado: null, llamada: null };
      if (interesado) out.interesado = Demo.copia(Demo.insertar(db, 'Interesados', interesado));
      if (d.Llamada) out.llamada = Demo.copia(Demo.insertar(db, 'Llamadas', { TipoContacto: NOMBRE_TIPO[k.tipo], ID_Contacto: k.id, ID_Propiedad: cita.ID_Propiedad, Motivo: String(d.Llamada.Motivo || '').trim(), Fecha: d.Llamada.Fecha || '', Estado: 'Pendiente', ID_Agente: cita.ID_Agente }));
      return out;
    },
    // Igual que datosPublicos() en Code.gs: del agente solo sale su celular; de la reserva, la fecha límite vigente.
    publico: function (db) {
      var limites = {};
      db.Reservas.forEach(function (r) { if (r.Estado === 'Activa') limites[r.ID_Propiedad] = r.FechaLimite || ''; });
      return db.Propiedades.filter(function (p) {
        return (p.Estado === 'Disponible' || p.Estado === 'Reservado') && (!p.ID_Agente || Demo.activo(Demo.buscar(db, 'Agentes', p.ID_Agente)));
      }).map(function (p) {
        var o = { ID: p.ID, Operacion: p.Operacion, Tipo: p.Tipo, Zona: p.Zona, Area: p.Area, Dormitorios: p.Dormitorios, Precio: p.Precio, Caracteristicas: p.Caracteristicas, Descripcion: p.Descripcion, Estado: p.Estado };
        o.WhatsApp = p.ID_Agente ? soloDigitos(Demo.buscar(db, 'Agentes', p.ID_Agente).Celular) : '';
        if (p.Estado === 'Reservado') o.FechaLimite = esIso(limites[p.ID]) && limites[p.ID] >= hoy() ? limites[p.ID] : '';
        return o;
      });
    },
    manejar: function (req) {
      var db = Demo.cargar(), d = req.data || {}, a = req.action;
      try {
        if (a === 'publico') return { ok: true, data: { config: Demo.config(db.Config), Propiedades: Demo.publico(db) } };
        if (a === 'publicarPropiedad') {
          var pr = Demo.insertar(db, 'Propietarios', { Nombre: d.Nombre, Celular: d.Celular, Notas: '', Origen: 'App', ID_Agente: '' });
          Demo.insertar(db, 'Propiedades', { ID_Propietario: pr.ID, Operacion: d.Operacion, Tipo: d.Tipo, Zona: d.Zona, Direccion: d.Direccion, Area: d.Area, Dormitorios: d.Dormitorios, Precio: d.Precio, Caracteristicas: d.Caracteristicas, Descripcion: d.Descripcion, Estado: 'Pendiente', Origen: 'App', ID_Agente: '' });
          return { ok: true };
        }
        if (a === 'registrarInteres') {
          var r = {}; ['Nombre', 'Celular', 'Operacion', 'Tipo', 'Zonas', 'PresupuestoMax', 'AreaMin', 'DormitoriosMin', 'Caracteristicas'].forEach(function (k) { r[k] = d[k] || ''; });
          r.Origen = 'App'; r.Temperatura = 'Frío'; r.DetalleInteres = ''; r.ID_Agente = ''; r.EstadoSeguimiento = 'Activo';
          Demo.insertar(db, 'Interesados', r);
          return { ok: true };
        }
        if (a === 'login') return Demo.login(db, d);
        if (a === 'logout') { delete db.Sesiones[req.token]; Demo.guardar(db); return { ok: true }; }
        var ag = Demo.sesion(db, req.token);
        if (!ag) return { ok: false, error: 'Tu sesión venció o se cerró. Vuelve a ingresar.', auth: false };
        if (a === 'cambiarContrasena') return Demo.cambiarContrasena(db, ag, d);
        if (Demo.debe(ag)) return { ok: false, error: 'Antes de continuar, cambia tu contraseña.', cambiar: true };
        if (a === 'todo') {
          var o = { config: Demo.config(db.Config), yo: Demo.perfil(ag) };
          Demo.DATOS.forEach(function (t) { o[t] = db[t].filter(function (x) { return Demo.ver(ag, x); }).map(Demo.copia); });
          o.Agentes = Demo.esAdmin(ag) ? db.Agentes.map(Demo.copia) : [Demo.copia(ag)];
          return { ok: true, data: o };
        }
        if (a === 'lote') return { ok: true, data: Demo.lote(db, ag, d.ops) };
        if (a === 'guardar') return { ok: true, data: Demo.guardarRegistro(db, ag, d.tabla, d.registro, d.confirmarDuplicado === true) };
        if (a === 'guardarReserva') return { ok: true, data: Demo.guardarReserva(db, ag, d.registro) };
        if (a === 'cerrarCita') return { ok: true, data: Demo.cerrarCita(db, ag, d) };
        if (a === 'eliminar') return { ok: true, data: Demo.eliminar(db, ag, d.tabla, d.id) };
        if (['asignar', 'guardarAgente', 'restablecerContrasena', 'estadoAgente'].indexOf(a) >= 0) {
          if (!Demo.esAdmin(ag)) return { ok: false, error: 'Solo el administrador puede hacer esto.' };
          if (a === 'asignar') return { ok: true, data: Demo.asignar(db, d) };
          if (a === 'guardarAgente') return { ok: true, data: Demo.guardarAgente(db, d.agente) };
          if (a === 'restablecerContrasena') return { ok: true, data: Demo.restablecer(db, d) };
          if (a === 'estadoAgente') return { ok: true, data: Demo.estadoAgente(db, ag, d) };
        }
        return { ok: false, error: 'Acción desconocida.' };
      } catch (e) {
        var res = { ok: false, error: String(e.message || e) };
        if (e.duplicado) res.duplicado = true;
        return res;
      }
    }
  };

  /* ================= Inicio ================= */

  guardarLocal('inmo_pin', null); // la versión anterior guardaba el PIN aquí
  guardarLocal('inmo_cola', null);
  cargarCola();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (typeof module !== 'undefined') module.exports = { coincidencia: coincidencia, recomendarPara: recomendarPara, interesadosPara: interesadosPara, Demo: Demo, etiquetaReservado: etiquetaReservado, contactoDeCita: contactoDeCita, temperatura: temperatura, yaPaso: yaPaso, faltaResultado: faltaResultado, textoNoAsistio: textoNoAsistio, fmtCel: fmtCel, fmtMiles: fmtMiles };
  else { render(); enviar(); }
})();
