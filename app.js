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
  var TABLA_DE = { propietario: 'Propietarios', interesado: 'Interesados', otro: 'OtrosContactos' };
  var NOMBRE_TIPO = { propietario: 'Propietario', interesado: 'Interesado', otro: 'Otro' };
  var MARCA = 'Grupo Alquis Perú';
  var MIN_CONTRASENA = 8;
  var REDES = [['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['instagram', 'Instagram']];

  var S = {
    token: leerLocal('inmo_token') || '',
    db: leerJSON('inmo_cache'),
    pub: null,
    cargandoDb: false,
    filtrosProp: { q: '', tipo: '', estado: '', operacion: '', zona: '', precioMax: '', abierto: false },
    filtrosPub: { estado: '', operacion: '', tipo: '', zona: '', precioMax: '' },
    tabContactos: 'interesado',
    qContactos: '',
    verPasadas: false,
    verHechas: false
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

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('ver');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('ver'); }, 2400);
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
  function icTipo(tipo) {
    var n = { Terreno: 'terreno', Casa: 'casa', Departamento: 'depto', Local: 'local' }[tipo] || 'edificio';
    return '<span class="tipo-icono">' + ic(n, 26) + '</span>';
  }

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

  function interesadosPara(p, ints) {
    return ints.map(function (i) { var m = coincidencia(i, p); return m ? { i: i, m: m } : null; })
      .filter(function (x) { return x && x.m.puntaje != null && x.m.puntaje >= 40; })
      .sort(function (a, b) { return b.m.puntaje - a.m.puntaje; });
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
    var pedido = DEMO ? Promise.resolve(Demo.manejar({ action: accion, token: S.token, data: data || {} })) : fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: accion, token: S.token, data: data || {} })
    }).then(function (r) { return r.json(); }).catch(function () {
      return { ok: false, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' };
    });
    return pedido.then(function (r) {
      if (r && r.auth === false && S.token) sesionVencida();
      return r;
    });
  }

  function cargarDb(forzar) {
    if (S.cargandoDb) return;
    if (S.db && !forzar && S.db._t && Date.now() - S.db._t < 30000) return;
    S.cargandoDb = true;
    api('todo').then(function (r) {
      S.cargandoDb = false;
      if (r.ok) {
        S.db = r.data; S.db._t = Date.now();
        guardarLocal('inmo_cache', JSON.stringify(S.db));
        render();
      } else if (r.auth !== false && !S.db) {
        toast(r.error || 'No se pudieron cargar los datos.');
      }
    });
  }

  function ponerEnCache(tabla, reg) {
    var arr = S.db[tabla] || (S.db[tabla] = []);
    var i = arr.findIndex(function (x) { return x.ID === reg.ID; });
    if (i >= 0) arr[i] = reg; else arr.push(reg);
    guardarLocal('inmo_cache', JSON.stringify(S.db));
  }

  function guardarRegistro(tabla, registro) {
    cargando(true);
    return api('guardar', { tabla: tabla, registro: registro }).then(function (r) {
      cargando(false);
      if (!r.ok) { toast(r.error || 'No se pudo guardar.'); throw new Error(r.error); }
      ponerEnCache(tabla, r.data);
      return r.data;
    });
  }

  // El servidor guarda la reserva y cambia el estado de la propiedad en un solo paso.
  function guardarReserva(registro) {
    cargando(true);
    return api('guardarReserva', { registro: registro }).then(function (r) {
      cargando(false);
      if (!r.ok) { toast(r.error || 'No se pudo guardar la reserva.'); throw new Error(r.error); }
      ponerEnCache('Reservas', r.data.reserva);
      if (r.data.propiedad) ponerEnCache('Propiedades', r.data.propiedad);
      S.pub = null;
      return r.data.reserva;
    });
  }

  function eliminarRegistro(tabla, id) {
    cargando(true);
    return api('eliminar', { tabla: tabla, id: id }).then(function (r) {
      cargando(false);
      if (!r.ok) { toast(r.error || 'No se pudo eliminar.'); throw new Error(r.error); }
      S.db[tabla] = (S.db[tabla] || []).filter(function (x) { return x.ID !== id; });
      if (r.data && r.data.propiedad) ponerEnCache('Propiedades', r.data.propiedad);
      guardarLocal('inmo_cache', JSON.stringify(S.db));
    });
  }

  function olvidarSesion() {
    S.token = ''; S.db = null;
    guardarLocal('inmo_token', null); guardarLocal('inmo_cache', null);
  }
  function salirAgente() {
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
  function buscarId(tabla, id) { return T(tabla).find(function (x) { return x.ID === id; }); }
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
  function citasActivas() { return T('Citas').filter(function (c) { return c.Estado !== 'Cancelada'; }); }
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
  function render() {
    var r = ruta();
    var p = r.partes;
    if (p[0] === 'a') {
      if (!S.token) return ir('#/agente');
      if (!S.db) { pintar('<div class="pantalla"><div class="vacio">Cargando tus datos…</div></div>'); cargarDb(true); return; }
      cargarDb(false);
      var v = VISTAS[p[1]] || VISTAS.inicio;
      return v(p.slice(2), r.q);
    }
    if ((!p.length || p[0] === 'agente') && S.token) return ir('#/a/inicio');
    var vp = { agente: vLogin, publicar: vPublicar, busco: vBusco, p: vDetallePub }[p[0]] || vCatalogo;
    vp(p.slice(1), r.q);
  }
  function pintar(html, alMontar) {
    var app = document.getElementById('app');
    app.innerHTML = html;
    window.scrollTo(0, 0);
    if (alMontar) alMontar(app);
  }
  window.addEventListener('hashchange', render);

  function nav(activo) {
    var it = [['inicio', 'casa', 'Inicio'], ['contactos', 'gente', 'Contactos'], ['propiedades', 'edificio', 'Propiedades'], ['citas', 'cal', 'Citas']];
    return '<nav class="nav" aria-label="Secciones"><div class="nav-interna">' + it.map(function (x) {
      return '<a href="#/a/' + x[0] + '"' + (x[0] === activo ? ' class="activo" aria-current="page"' : '') + '>' + ic(x[1], 24) + x[2] + '</a>';
    }).join('') + '</div></nav>';
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

  function campo(def, valor) {
    var id = 'f_' + def.n;
    var v = valor == null ? '' : valor;
    var opc = def.req ? '' : ' <span class="opcional">(opcional)</span>';
    var et = '<label for="' + id + '">' + esc(def.l) + opc + '</label>';
    var h;
    if (def.t === 'select') {
      h = et + '<select id="' + id + '" name="' + def.n + '">' + (def.vacio !== false ? '<option value="">' + esc(def.vacio || '— Sin indicar —') + '</option>' : '') +
        def.op.map(function (o) {
          var val = typeof o === 'string' ? o : o[0], txt = typeof o === 'string' ? o : o[1];
          return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(txt) + '</option>';
        }).join('') + '</select>';
    } else if (def.t === 'multi') {
      var sel = lista(v);
      h = '<span class="etiqueta">' + esc(def.l) + opc + '</span><div class="multi">' + (def.op.length ? def.op.map(function (o) {
        return '<label><input type="checkbox" name="' + def.n + '" value="' + esc(o) + '"' + (sel.indexOf(o) >= 0 ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('') : '<span class="item-sub">Agrega opciones en la pestaña Config de tu hoja.</span>') + '</div>';
    } else if (def.t === 'seg') {
      h = '<span class="etiqueta">' + esc(def.l) + opc + '</span><div class="segmento' + (def.op.length === 2 ? ' dos' : '') + '">' + def.op.map(function (o) {
        var val = typeof o === 'string' ? o : o[0], txt = typeof o === 'string' ? o : o[1];
        return '<label><input type="radio" name="' + def.n + '" value="' + esc(val) + '"' + (String(v) === String(val) ? ' checked' : '') + '><span>' + esc(txt) + '</span></label>';
      }).join('') + '</div>';
    } else if (def.t === 'area') {
      h = et + '<textarea id="' + id + '" name="' + def.n + '" rows="3" placeholder="' + esc(def.ph || '') + '">' + esc(v) + '</textarea>';
    } else {
      var tipo = def.t || 'text';
      var extra = tipo === 'num' ? ' inputmode="decimal"' : '';
      if (tipo === 'num') tipo = 'text';
      h = et + '<input id="' + id + '" name="' + def.n + '" type="' + tipo + '"' + extra + ' value="' + esc(v) + '" placeholder="' + esc(def.ph || '') + '"' + (def.t === 'tel' ? ' autocomplete="tel"' : '') + '>';
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
      } else d[el.name] = el.value.trim();
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
      { n: 'Tipo', l: '¿Qué busca?', t: 'select', op: TIPOS },
      { n: 'Zonas', l: 'Zonas que le interesan', t: 'multi', op: c.zonas },
      { n: 'PresupuestoMax', l: 'Presupuesto máximo (S/)', t: 'num', ph: '150000' },
      { n: 'AreaMin', l: 'Área mínima (m²)', t: 'num', ph: '150' },
      { n: 'DormitoriosMin', l: 'Dormitorios mínimos', t: 'num', ph: '2' },
      { n: 'Caracteristicas', l: 'Características que desea', t: 'multi', op: c.caracteristicas }
    ];
  }
  function defsPropiedad(c) {
    return [
      { n: 'Operacion', l: 'Operación', t: 'seg', op: OPERACIONES },
      { n: 'Tipo', l: 'Tipo de propiedad', t: 'select', op: TIPOS, req: true, vacio: '— Elige el tipo —' },
      { n: 'Zona', l: 'Zona', t: 'select', op: c.zonas },
      { n: 'Direccion', l: 'Dirección o referencia', ph: 'Av. principal 123' },
      { n: 'Area', l: 'Área (m²)', t: 'num', ph: '200' },
      { n: 'Dormitorios', l: 'Dormitorios', t: 'num', ph: '3' },
      { n: 'Precio', l: 'Precio (S/)', t: 'num', ph: '120000' },
      { n: 'Caracteristicas', l: 'Características', t: 'multi', op: c.caracteristicas },
      { n: 'Descripcion', l: 'Descripción', t: 'area', ph: 'Detalles que ayuden al comprador.' }
    ];
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
    return DEMO ? '<div class="aviso-demo">Modo demo: los datos son de ejemplo y se guardan solo en este celular. Contraseña del agente: demo1234.</div>' : '';
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
        '<div class="seccion"><div class="seccion-cab"><h2>Nuestras propiedades</h2></div>' +
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
      var wsp = wspLink(c.whatsapp, msg);
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
      '<p class="intro">Ingresa tu contraseña para ver tus contactos, propiedades y citas.</p>' +
      '<form class="formulario" novalidate>' + campoClave('password', 'Contraseña', 'current-password') +
      '<div class="acciones-form"><button class="btn primario ancho" type="submit">Entrar</button></div></form></div>',
      function (app) {
        enlazarVolver(app, '#/');
        enlazarVerClave(app);
        var form = app.querySelector('form');
        var inp = app.querySelector('#f_password');
        inp.focus();
        form.onsubmit = function (e) {
          e.preventDefault();
          var clave = inp.value;
          if (!clave) return errorForm(form, 'Escribe tu contraseña.');
          cargando(true);
          api('login', { password: clave }).then(function (r) {
            cargando(false);
            if (!r.ok || !r.data || !r.data.token) { inp.value = ''; inp.focus(); return errorForm(form, r.error || 'No se pudo iniciar sesión.'); }
            S.token = r.data.token;
            guardarLocal('inmo_token', S.token);
            S.db = null;
            ir('#/a/inicio');
          });
        };
      });
  }

  /* ================= Vistas del agente ================= */

  function tagCita(c) {
    var tc = tipoDeCita(c);
    return '<span class="tag-cita ' + (CLASE_CITA[tc] || 'visita') + '">' + esc(tc) + '</span>';
  }
  // modo: '' muestra la hora a la izquierda (agenda del día), 'fecha' agrega el día, 'contacto' pone la fecha como título.
  function itemCita(c, modo) {
    var k = contactoDeCita(c), ct = contacto(k.tipo, k.id), p = buscarId('Propiedades', c.ID_Propiedad);
    var tc = tipoDeCita(c), tel = ct && telLink(ct.Celular);
    var cuando = fechaCorta(c.Fecha) + (c.Hora ? ' · ' + c.Hora : '');
    var nombre = ct ? ct.Nombre : (k.id ? 'Contacto eliminado' : 'Sin ' + NOMBRE_TIPO[k.tipo].toLowerCase());
    var sub = p ? resumenProp(p) : (tc === 'Captación' ? 'Propiedad aún no registrada' : 'Sin propiedad');
    if (tc === 'Reunión' && modo !== 'contacto') sub = NOMBRE_TIPO[k.tipo] + (k.tipo === 'otro' && ct && ct.Categoria ? ' (' + ct.Categoria + ')' : '') + ' · ' + sub;
    if (modo === 'fecha') sub = cuando + ' · ' + sub;
    return '<div class="item"><a href="#/a/cita/' + esc(c.ID) + '" style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;text-decoration:none;color:inherit">' +
      (modo ? '' : '<span class="hora">' + esc(c.Hora || '—') + '</span>') + '<div class="item-cuerpo"><div class="item-titulo">' + esc(modo === 'contacto' ? cuando : nombre) + ' ' + tagCita(c) +
      (c.Estado && c.Estado !== 'Pendiente' ? ' <span class="estado chico ' + esc(c.Estado) + '">' + esc(c.Estado) + '</span>' : '') + '</div><div class="item-sub">' + esc(sub) + '</div></div></a>' +
      (tel ? '<a class="btn-icono" href="' + tel + '" aria-label="Llamar a ' + esc(ct.Nombre) + '">' + ic('tel', 20) + '</a>' : '') + '</div>';
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
    return '<a class="item" href="' + esc(href) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(titulo) +
      (modo === 'inicio' ? '' : ' <span class="estado chico ' + esc(r.Estado) + '">' + esc(r.Estado || '') + '</span>') + '</div>' +
      '<div class="item-sub">' + esc(sub.join(' · ')) + (limite ? (sub.length ? ' · ' : '') + '<span' + (vencida ? ' class="alerta-texto"' : '') + '>' + esc(limite) + '</span>' : '') + '</div></div></a>';
  }

  function itemLlamada(l) {
    var tipo = tipoDeLlamada(l), ct = contacto(tipo, l.ID_Contacto);
    var etiqueta = NOMBRE_TIPO[tipo] + (tipo === 'otro' && ct && ct.Categoria ? ' · ' + ct.Categoria : '');
    var hecha = l.Estado === 'Hecha';
    var tel = ct && telLink(ct.Celular);
    var cuando = l.Fecha && l.Fecha !== hoy() ? fechaCorta(l.Fecha) + ' · ' : '';
    return '<div class="item' + (hecha ? ' tachado' : '') + '"><button class="check' + (hecha ? ' hecho' : '') + '" data-hecha="' + esc(l.ID) + '" aria-label="' + (hecha ? 'Marcar como pendiente' : 'Marcar como hecha') + '"><span>' + (hecha ? ic('check', 16) : '') + '</span></button>' +
      '<a href="#/a/llamada/' + esc(l.ID) + '" class="item-cuerpo" style="text-decoration:none;color:inherit"><div class="item-titulo">' + esc(ct ? ct.Nombre : 'Contacto eliminado') + ' <span class="tag ' + tipo + '">' + esc(etiqueta) + '</span></div>' +
      '<div class="item-sub">' + esc(cuando + (l.Motivo || 'Sin motivo')) + '</div></a>' +
      (tel ? '<a class="btn-icono" href="' + tel + '" aria-label="Llamar">' + ic('tel', 20) + '</a>' : '') + '</div>';
  }
  function enlazarChecks(app, rehacer) {
    app.querySelectorAll('[data-hecha]').forEach(function (b) {
      b.onclick = function () {
        var l = buscarId('Llamadas', b.dataset.hecha);
        if (!l) return;
        var nuevo = Object.assign({}, l, { Estado: l.Estado === 'Hecha' ? 'Pendiente' : 'Hecha' });
        guardarRegistro('Llamadas', nuevo).then(function () { toast(nuevo.Estado === 'Hecha' ? 'Llamada hecha' : 'Llamada pendiente'); rehacer(); });
      };
    });
  }

  VISTAS.inicio = function () {
    var h = hoy();
    var citasHoy = citasActivas().filter(function (c) { return c.Fecha === h; }).sort(ordenarCitas);
    var pend = llamadasPendientes().filter(function (l) { return !l.Fecha || l.Fecha <= h; }).sort(function (a, b) { return (a.Fecha || '').localeCompare(b.Fecha || ''); });
    var porAprobar = T('Propiedades').filter(function (p) { return p.Estado === 'Pendiente'; });
    var en3 = sumarDias(h, 3);
    var porVencer = T('Reservas').filter(function (r) { return r.Estado === 'Activa' && esIso(r.FechaLimite) && r.FechaLimite <= en3; })
      .sort(function (a, b) { return a.FechaLimite.localeCompare(b.FechaLimite); });
    var hace7 = sumarDias(h, -7);
    var nuevosInt = T('Interesados').filter(function (i) { return i.Origen === 'App' && String(i.FechaRegistro).slice(0, 10) >= hace7; });
    var nuevos = porAprobar.map(function (p) {
      var dueno = buscarId('Propietarios', p.ID_Propietario);
      return '<a class="item" href="#/a/propiedad/' + esc(p.ID) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(resumenProp(p)) + ' <span class="tag app">Por aprobar</span></div><div class="item-sub">Enviada por ' + esc(dueno ? dueno.Nombre : 'propietario') + '</div></div></a>';
    }).concat(nuevosInt.map(function (i) {
      return '<a class="item" href="#/a/contacto/interesado/' + esc(i.ID) + '"><div class="item-cuerpo"><div class="item-titulo">' + esc(i.Nombre) + ' <span class="tag interesado">Nuevo interesado</span></div><div class="item-sub">Busca: ' + esc([i.Tipo, lista(i.Zonas).join(', ')].filter(Boolean).join(' · ') || 'sin detalles') + '</div></div></a>';
    }));
    pintar('<div class="pantalla"><div class="cab"><div><p class="fecha-hoy">' + fechaLarga(h) + '</p><p class="saludo">' + saludo() + '</p></div>' +
      '<a class="btn-redondo" href="#/a/llamada-nueva" aria-label="Nueva llamada">' + ic('mas', 26) + '</a></div>' + avisoDemo() +
      '<div class="metricas"><a class="metrica" href="#/a/citas"><span>Citas hoy</span><strong>' + citasHoy.length + '</strong></a>' +
      '<a class="metrica naranja" href="#/a/llamadas"><span>Llamadas pendientes</span><strong>' + pend.length + '</strong></a></div>' +
      (nuevos.length ? '<div class="seccion"><div class="seccion-cab"><h2>Nuevos desde la app</h2></div><div class="lista">' + nuevos.join('') + '</div></div>' : '') +
      '<div class="seccion"><div class="seccion-cab"><h2>Citas de hoy</h2><a class="ver-todo" href="#/a/citas">Ver todo</a></div>' +
      (citasHoy.length ? '<div class="lista">' + citasHoy.map(function (c) { return itemCita(c); }).join('') + '</div>' : '<div class="vacio">No tienes citas hoy. <a href="#/a/cita-nueva">Agendar una cita</a></div>') + '</div>' +
      (porVencer.length ? '<div class="seccion"><div class="seccion-cab"><h2>Reservas por vencer</h2></div><div class="lista">' + porVencer.map(function (r) { return itemReserva(r, 'inicio'); }).join('') + '</div></div>' : '') +
      '<div class="seccion"><div class="seccion-cab"><h2>Llamadas pendientes</h2><a class="ver-todo" href="#/a/llamadas">Ver todo</a></div>' +
      (pend.length ? '<div class="lista">' + pend.slice(0, 6).map(itemLlamada).join('') + '</div>' : '<div class="vacio">No tienes llamadas pendientes para hoy.</div>') + '</div>' +
      '<div class="menu-agente"><a class="btn ancho" href="#/" data-catalogo>' + ic('edificio', 20) + 'Ver mi catálogo público</a>' +
      '<a class="btn ancho" href="#/a/cambiar-contrasena">' + ic('candado', 20) + 'Cambiar contraseña</a>' +
      '<div class="fila-btns"><button class="btn chico" data-recargar>' + ic('recargar', 18) + 'Actualizar datos</button><button class="btn chico peligro" data-salir>' + ic('salir', 18) + 'Cerrar sesión</button></div></div>' +
      '</div>' + nav('inicio'), function (app) {
        enlazarChecks(app, VISTAS.inicio);
        app.querySelector('[data-catalogo]').onclick = function (e) { e.preventDefault(); S.pub = null; location.hash = '#/catalogo'; };
        app.querySelector('[data-recargar]').onclick = function () { S.pub = null; cargarDb(true); toast('Actualizando…'); };
        app.querySelector('[data-salir]').onclick = function () { if (confirm('¿Cerrar sesión en este celular?')) salirAgente(); };
      });
  };

  VISTAS['cambiar-contrasena'] = function () {
    pintar('<div class="pantalla">' + cabVolver('Cambiar contraseña') +
      '<p class="intro">Usa al menos ' + MIN_CONTRASENA + ' caracteres. Puedes combinar letras, números y símbolos. Al cambiarla se cerrará la sesión en tus otros dispositivos.</p>' +
      '<form class="formulario" novalidate>' + campoClave('actual', 'Contraseña actual', 'current-password') +
      campoClave('nueva', 'Nueva contraseña', 'new-password') + campoClave('repetir', 'Repite la nueva contraseña', 'new-password') +
      '<div class="acciones-form"><button class="btn primario ancho" type="submit">Guardar nueva contraseña</button></div></form></div>' + nav('inicio'), function (app) {
        enlazarVolver(app);
        enlazarVerClave(app);
        var form = app.querySelector('form');
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
            toast('Contraseña cambiada');
            ir('#/a/inicio');
          });
        };
      });
  };

  VISTAS.llamadas = function () {
    var h = hoy();
    var pend = llamadasPendientes();
    var grupos = [
      ['Atrasadas', pend.filter(function (l) { return l.Fecha && l.Fecha < h; }), true],
      ['Hoy', pend.filter(function (l) { return l.Fecha === h; })],
      ['Próximas', pend.filter(function (l) { return l.Fecha > h; })],
      ['Sin fecha', pend.filter(function (l) { return !l.Fecha; })]
    ];
    var hechas = T('Llamadas').filter(function (l) { return l.Estado === 'Hecha'; }).sort(function (a, b) { return (b.Fecha || '').localeCompare(a.Fecha || ''); });
    var cuerpo = grupos.filter(function (g) { return g[1].length; }).map(function (g) {
      g[1].sort(function (a, b) { return (a.Fecha || '').localeCompare(b.Fecha || ''); });
      return '<div class="seccion"><div class="seccion-cab"><h2' + (g[2] ? ' class="alerta"' : '') + '>' + g[0] + '</h2></div><div class="lista">' + g[1].map(itemLlamada).join('') + '</div></div>';
    }).join('');
    pintar('<div class="pantalla">' + cabVolver('Llamadas', '<a class="btn-redondo" href="#/a/llamada-nueva" aria-label="Nueva llamada">' + ic('mas', 26) + '</a>') +
      (cuerpo || '<div class="vacio">No tienes llamadas pendientes. Toca + para programar una.</div>') +
      (hechas.length ? '<button class="btn ancho" data-hechas>' + (S.verHechas ? 'Ocultar hechas' : 'Ver hechas (' + hechas.length + ')') + '</button>' +
        (S.verHechas ? '<div class="lista">' + hechas.map(itemLlamada).join('') + '</div>' : '') : '') +
      '</div>' + nav('inicio'), function (app) {
        enlazarVolver(app);
        enlazarChecks(app, VISTAS.llamadas);
        var b = app.querySelector('[data-hechas]');
        if (b) b.onclick = function () { S.verHechas = !S.verHechas; VISTAS.llamadas(); };
      });
  };

  VISTAS.contactos = function (p, q) {
    if (q.tab) S.tabContactos = q.tab;
    var tab = S.tabContactos, qq = S.qContactos.toLowerCase();
    var filas = T(TABLA_DE[tab]).filter(function (c) {
      return !qq || (c.Nombre + ' ' + c.Celular + ' ' + (c.Categoria || '')).toLowerCase().indexOf(qq) >= 0;
    }).sort(function (a, b) { return a.Nombre.localeCompare(b.Nombre); });
    var html = filas.map(function (c) {
      var sub = c.Celular || 'Sin celular';
      var extra = '';
      if (tab === 'interesado') extra = 'Busca: ' + ([c.Tipo, c.PresupuestoMax ? 'hasta ' + dinero(c.PresupuestoMax) : ''].filter(Boolean).join(' · ') || 'sin detalles');
      if (tab === 'propietario') {
        var n = T('Propiedades').filter(function (x) { return x.ID_Propietario === c.ID; }).length;
        extra = n + (n === 1 ? ' propiedad' : ' propiedades');
      }
      if (tab === 'otro') extra = [c.Categoria, c.Detalle].filter(Boolean).join(' · ');
      return '<a class="item" href="#/a/contacto/' + tab + '/' + esc(c.ID) + '"><span class="avatar ' + tab + '">' + esc(iniciales(c.Nombre)) + '</span><div class="item-cuerpo"><div class="item-titulo">' + esc(c.Nombre) +
        (c.Origen === 'App' ? ' <span class="tag app">App</span>' : '') + '</div><div class="item-sub">' + esc(sub) + '</div>' + (extra ? '<div class="item-sub">' + esc(extra) + '</div>' : '') + '</div></a>';
    }).join('');
    pintar('<div class="pantalla"><div class="cab"><h1>Contactos</h1><a class="btn-redondo" href="#/a/contacto-form/' + tab + '" aria-label="Registrar contacto">' + ic('mas', 26) + '</a></div>' +
      '<div class="pestanas" role="tablist">' + ['interesado', 'propietario', 'otro'].map(function (t) {
        return '<button role="tab" aria-selected="' + (t === tab) + '" class="' + (t === tab ? 'activo' : '') + '" data-tab="' + t + '">' + { interesado: 'Interesados', propietario: 'Propietarios', otro: 'Otros' }[t] + '</button>';
      }).join('') + '</div>' +
      '<div class="caja-busqueda">' + ic('buscar', 20) + '<input id="qc" type="search" placeholder="Buscar por nombre o celular" aria-label="Buscar contacto" value="' + esc(S.qContactos) + '"></div>' +
      (html ? '<div class="lista">' + html + '</div>' : '<div class="vacio">' + (qq ? 'Sin resultados para esa búsqueda.' : 'Aún no tienes contactos aquí. Toca + para registrar el primero.') + '</div>') +
      '</div>' + nav('contactos'), function (app) {
        app.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { S.tabContactos = b.dataset.tab; VISTAS.contactos([], {}); }; });
        var inp = app.querySelector('#qc');
        inp.oninput = function () {
          S.qContactos = inp.value; var pos = inp.selectionStart; VISTAS.contactos([], {});
          var n = document.getElementById('qc'); n.focus(); n.setSelectionRange(pos, pos);
        };
      });
  };

  VISTAS.contacto = function (p) {
    var tipo = p[0], c = contacto(tipo, p[1]);
    if (!c) return pintar('<div class="pantalla">' + cabVolver('Contacto') + '<div class="vacio">Este contacto ya no existe.</div></div>' + nav('contactos'), function (a) { enlazarVolver(a, '#/a/contactos'); });
    var tel = telLink(c.Celular), wsp = wspLink(c.Celular);
    var datos = '<dt>Celular</dt><dd>' + esc(c.Celular || '—') + '</dd>';
    var extra = '';
    if (tipo === 'interesado') {
      datos += '<dt>Operación</dt><dd>' + esc(c.Operacion === 'Venta' ? 'Comprar' : (c.Operacion === 'Alquiler' ? 'Alquilar' : '—')) + '</dd>' +
        '<dt>Busca</dt><dd>' + esc(c.Tipo || '—') + '</dd><dt>Zonas</dt><dd>' + esc(c.Zonas || '—') + '</dd>' +
        '<dt>Presupuesto</dt><dd>' + esc(dinero(c.PresupuestoMax) || '—') + '</dd><dt>Área mínima</dt><dd>' + esc(c.AreaMin ? c.AreaMin + ' m²' : '—') + '</dd>' +
        '<dt>Dormitorios</dt><dd>' + esc(c.DormitoriosMin || '—') + '</dd><dt>Desea</dt><dd>' + esc(c.Caracteristicas || '—') + '</dd>';
      var recos = recomendarPara(c, T('Propiedades'));
      extra += '<div class="seccion"><div class="seccion-cab"><h2>Propiedades recomendadas</h2></div>' + (recos.length ? recos.map(function (x) {
        return '<div class="reco"><a class="reco-cab" href="#/a/propiedad/' + esc(x.p.ID) + '">' + htmlPuntaje(x.m) + '<div class="prop-cuerpo"><span class="prop-titulo">' + esc(resumenProp(x.p)) + '</span><span class="precio">' + (dinero(x.p.Precio) || 'Sin precio') + '</span></div></a>' +
          htmlRazones(x.m.razones) + '<div class="fila-btns"><a class="btn chico" href="#/a/cita-nueva?tipo=visita&ct=interesado&id=' + esc(c.ID) + '&prp=' + esc(x.p.ID) + '">' + ic('cal', 18) + 'Agendar cita</a>' +
          '<a class="btn chico" href="#/a/reserva-nueva?prp=' + esc(x.p.ID) + '&int=' + esc(c.ID) + '">' + ic('reserva', 18) + 'Reservar</a></div></div>';
      }).join('') : '<div class="vacio">Ninguna propiedad disponible coincide todavía.</div>') + '</div>';
    }
    if (tipo === 'propietario') {
      var props = T('Propiedades').filter(function (x) { return x.ID_Propietario === c.ID; });
      extra += '<div class="seccion"><div class="seccion-cab"><h2>Sus propiedades</h2><a class="ver-todo" href="#/a/propiedad-form?dueno=' + esc(c.ID) + '">+ Agregar</a></div>' +
        (props.length ? '<div class="lista-props">' + props.map(tarjetaAgente).join('') + '</div>' : '<div class="vacio">Sin propiedades registradas.</div>') + '</div>';
    }
    var citas = citasDe(tipo, c.ID);
    if (citas.length) extra += '<div class="seccion"><div class="seccion-cab"><h2>Sus citas</h2></div><div class="lista">' + citas.map(function (x) { return itemCita(x, 'contacto'); }).join('') + '</div></div>';
    if (tipo === 'interesado') {
      var reservas = T('Reservas').filter(function (r) { return r.ID_Interesado === c.ID; }).sort(ordenarReservas);
      if (reservas.length) extra += '<div class="seccion"><div class="seccion-cab"><h2>Sus reservas</h2></div><div class="lista">' + reservas.map(function (r) { return itemReserva(r, 'interesado'); }).join('') + '</div></div>';
    }
    var agendar = { interesado: ['visita', 'Agendar visita'], propietario: ['captacion', 'Agendar cita de captación'], otro: ['reunion', 'Agendar reunión'] }[tipo];
    if (tipo === 'otro') datos += '<dt>Categoría</dt><dd>' + esc(c.Categoria || '—') + '</dd><dt>Detalle</dt><dd>' + esc(c.Detalle || '—') + '</dd>';
    if (c.Notas) datos += '<dt>Notas</dt><dd>' + esc(c.Notas) + '</dd>';
    datos += '<dt>Registrado</dt><dd>' + esc(String(c.FechaRegistro || '').slice(0, 10) || '—') + (c.Origen === 'App' ? ' (desde la app)' : '') + '</dd>';
    pintar('<div class="pantalla">' + cabVolver(NOMBRE_TIPO[tipo], '<a class="btn-icono borde" href="#/a/contacto-form/' + tipo + '/' + esc(c.ID) + '" aria-label="Editar">' + ic('lapiz', 20) + '</a>') +
      '<div class="ficha"><div class="ficha-top"><span class="avatar ' + tipo + '">' + esc(iniciales(c.Nombre)) + '</span><h2>' + esc(c.Nombre) + '</h2></div>' +
      (tel || wsp ? '<div class="fila-btns">' + (tel ? '<a class="btn chico" href="' + tel + '">' + ic('tel', 18) + 'Llamar</a>' : '') + (wsp ? '<a class="btn chico" href="' + esc(wsp) + '" target="_blank" rel="noopener">' + ic('wsp', 18) + 'WhatsApp</a>' : '') + '</div>' : '') +
      '<dl class="datos">' + datos + '</dl>' +
      '<div class="fila-btns"><a class="btn chico" href="#/a/llamada-nueva?tipo=' + tipo + '&id=' + esc(c.ID) + '">' + ic('llamadas', 18) + 'Programar llamada</a>' +
      '<a class="btn chico" href="#/a/cita-nueva?tipo=' + agendar[0] + '&ct=' + tipo + '&id=' + esc(c.ID) + '">' + ic('cal', 18) + agendar[1] + '</a></div></div>' +
      extra + '<button class="btn peligro ancho" data-borrar>Eliminar contacto</button></div>' + nav('contactos'), function (app) {
        enlazarVolver(app, '#/a/contactos');
        app.querySelector('[data-borrar]').onclick = function () {
          if (!confirm('¿Eliminar a ' + c.Nombre + '? Esta acción no se puede deshacer.')) return;
          eliminarRegistro(TABLA_DE[tipo], c.ID).then(function () { toast('Contacto eliminado'); ir('#/a/contactos'); });
        };
      });
  };

  VISTAS['contacto-form'] = function (p) {
    var tipo = p[0] || 'interesado', c = p[1] ? contacto(tipo, p[1]) : null;
    var cf = conf();
    var defs;
    if (tipo === 'interesado') defs = defsInteresado(cf).concat([{ n: 'Notas', l: 'Notas', t: 'area' }]);
    else if (tipo === 'propietario') defs = [{ n: 'Nombre', l: 'Nombre', req: true, ph: 'María Quispe' }, { n: 'Celular', l: 'Celular', t: 'tel', ph: '984 123 456' }, { n: 'Notas', l: 'Notas', t: 'area' }];
    else defs = [{ n: 'Nombre', l: 'Nombre', req: true, ph: 'Dr. Ramírez' }, { n: 'Celular', l: 'Celular', t: 'tel', ph: '984 700 120' }, { n: 'Categoria', l: 'Categoría', t: 'select', op: cf.categoriasOtros }, { n: 'Detalle', l: 'Detalle', t: 'area', ph: 'Notaría del centro' }];
    var titulo = (c ? 'Editar ' : 'Nuevo ') + NOMBRE_TIPO[tipo].toLowerCase();
    pintar('<div class="pantalla">' + cabVolver(titulo.charAt(0).toUpperCase() + titulo.slice(1)) +
      (!c ? '<div class="segmento" role="group" aria-label="Tipo de contacto">' + ['interesado', 'propietario', 'otro'].map(function (t) {
        return '<label><input type="radio" name="tipoC" value="' + t + '"' + (t === tipo ? ' checked' : '') + '><span>' + NOMBRE_TIPO[t] + '</span></label>';
      }).join('') + '</div>' : '') +
      '<form class="formulario" novalidate>' + defs.map(function (d) { return campo(d, c ? c[d.n] : ''); }).join('') +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/contactos');
        app.querySelectorAll('[name=tipoC]').forEach(function (r) { r.onchange = function () { history.replaceState(null, '', '#/a/contacto-form/' + r.value); render(); }; });
        var form = app.querySelector('form');
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Nombre) return errorForm(form, 'Escribe al menos el nombre.');
          if (c) d.ID = c.ID; else if (tipo !== 'otro') d.Origen = 'Agente';
          guardarRegistro(TABLA_DE[tipo], d).then(function (g) {
            toast('Contacto guardado');
            history.replaceState(null, '', '#/a/contacto/' + tipo + '/' + g.ID); render();
          }).catch(function () {});
        };
      });
  };

  function tarjetaAgente(p) {
    var dueno = buscarId('Propietarios', p.ID_Propietario);
    return '<div class="prop"><a href="#/a/propiedad/' + esc(p.ID) + '" style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;text-decoration:none;color:inherit">' + icTipo(p.Tipo) +
      '<div class="prop-cuerpo"><span class="prop-meta">' + esc(p.Tipo) + (p.Operacion ? ' en ' + esc(p.Operacion.toLowerCase()) : '') + ' · <span class="estado ' + esc(p.Estado) + '">' + esc(p.Estado || 'Sin estado') + '</span></span>' +
      '<span class="prop-titulo">' + esc([num(p.Area) != null ? num(p.Area) + ' m²' : (num(p.Dormitorios) != null ? num(p.Dormitorios) + ' dorm.' : ''), p.Zona].filter(Boolean).join(' · ') || 'Sin detalles') + '</span>' +
      '<span class="prop-sub">Prop.: ' + esc(dueno ? dueno.Nombre : '—') + '</span><span class="precio">' + (dinero(p.Precio) || 'Sin precio') + '</span></div></a>' +
      '<a class="btn-icono borde" href="#/a/propiedad-form/' + esc(p.ID) + '" aria-label="Editar propiedad">' + ic('lapiz', 18) + '</a></div>';
  }

  VISTAS.propiedades = function () {
    var f = S.filtrosProp, cf = conf(), qq = f.q.toLowerCase();
    var props = T('Propiedades').filter(function (p) {
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
    pintar('<div class="pantalla"><div class="cab"><h1>Propiedades</h1><a class="btn-redondo" href="#/a/propiedad-form" aria-label="Agregar propiedad">' + ic('mas', 26) + '</a></div>' +
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
      '<p class="contador">' + props.length + (props.length === 1 ? ' propiedad' : ' propiedades') + '</p>' +
      (props.length ? '<div class="lista-props">' + props.map(tarjetaAgente).join('') + '</div>' : '<div class="vacio">No hay propiedades con esos filtros.</div>') +
      '</div>' + nav('propiedades'), function (app) {
        app.querySelectorAll('[data-tipo]').forEach(function (b) { b.onclick = function () { f.tipo = b.dataset.tipo; VISTAS.propiedades(); }; });
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

  VISTAS.propiedad = function (p) {
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
        '<dl class="datos"><dt>Reservó</dt><dd>' + (ri ? '<a href="#/a/contacto/interesado/' + esc(ri.ID) + '">' + esc(ri.Nombre) + '</a>' + (ri.Celular ? '<br>' + esc(ri.Celular) : '') : 'Interesado eliminado') + '</dd>' +
        '<dt>Separación</dt><dd>' + esc(dinero(activa.MontoSeparacion) || '—') + '</dd>' +
        '<dt>Fecha de reserva</dt><dd>' + esc(fechaLarga(activa.FechaReserva) || '—') + '</dd>' +
        '<dt>Fecha límite</dt><dd' + (vencida ? ' class="alerta-texto"' : '') + '>' + esc(esIso(activa.FechaLimite) ? fechaLarga(activa.FechaLimite) + (vencida ? ' (vencida)' : '') : 'Sin fecha límite') + '</dd>' +
        (activa.Notas ? '<dt>Notas</dt><dd>' + esc(activa.Notas) + '</dd>' : '') + '</dl>' +
        '<div class="fila-btns"><button class="btn chico primario" data-reserva="Concretada">' + ic('check', 18) + 'Marcar como concretada</button><button class="btn chico peligro" data-reserva="Cancelada">Cancelar reserva</button></div>' +
        '<div class="fila-btns">' + (ri && telLink(ri.Celular) ? '<a class="btn chico" href="' + telLink(ri.Celular) + '">' + ic('tel', 18) + 'Llamar</a>' : '') +
        '<a class="btn chico" href="#/a/reserva/' + esc(activa.ID) + '">' + ic('lapiz', 18) + 'Editar reserva</a></div></div>';
    } else if (pr.Estado === 'Disponible' || pr.Estado === 'Reservado') {
      bloqueReserva = '<div class="seccion">' + (pr.Estado === 'Reservado' ? '<p class="item-sub">Figura como reservada, pero no tiene una reserva registrada.</p>' : '') +
        '<a class="btn ancho" href="#/a/reserva-nueva?prp=' + esc(pr.ID) + '">' + ic('reserva', 20) + 'Registrar reserva</a></div>';
    }
    pintar('<div class="pantalla">' + cabVolver(pr.Tipo, '<a class="btn-icono borde" href="#/a/propiedad-form/' + esc(pr.ID) + '" aria-label="Editar">' + ic('lapiz', 20) + '</a>') +
      (pr.Estado === 'Pendiente' ? '<div class="recuadro"><span class="recuadro-titulo">Enviada desde la app, aún no es visible en el catálogo</span><button class="btn primario" data-estado="Disponible">' + ic('check', 20) + 'Aprobar y publicar</button></div>' : '') +
      '<div class="ficha"><div class="ficha-top">' + icTipo(pr.Tipo) + '<div><h2>' + esc([num(pr.Area) != null ? num(pr.Area) + ' m²' : '', pr.Zona].filter(Boolean).join(' · ') || pr.Tipo) + '</h2><span class="precio">' + (dinero(pr.Precio) || 'Sin precio') + '</span></div></div>' +
      '<dl class="datos"><dt>Código</dt><dd>' + esc(pr.ID) + '</dd><dt>Estado</dt><dd><span class="estado ' + esc(pr.Estado) + '">' + esc(pr.Estado || '—') + '</span></dd>' +
      '<dt>Operación</dt><dd>' + esc(pr.Operacion || '—') + '</dd><dt>Dirección</dt><dd>' + esc(pr.Direccion || '—') + '</dd>' +
      '<dt>Dormitorios</dt><dd>' + esc(pr.Dormitorios || '—') + '</dd><dt>Características</dt><dd>' + esc(pr.Caracteristicas || '—') + '</dd>' +
      (pr.Descripcion ? '<dt>Descripción</dt><dd>' + esc(pr.Descripcion) + '</dd>' : '') +
      '<dt>Propietario</dt><dd>' + (dueno ? '<a href="#/a/contacto/propietario/' + esc(dueno.ID) + '">' + esc(dueno.Nombre) + '</a>' + (dueno.Celular ? '<br>' + esc(dueno.Celular) : '') : '—') + '</dd></dl>' +
      (activa ? '<p class="item-sub">El estado depende de la reserva activa: cambia al marcarla como concretada o cancelada.</p>'
        : '<div class="campo"><label for="f_est">Cambiar estado</label><select id="f_est">' + ESTADOS_PROP.map(function (e) { return '<option' + (e === pr.Estado ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select></div>') + '</div>' +
      bloqueReserva +
      '<div class="seccion"><div class="seccion-cab"><h2>Interesados que coinciden</h2></div>' + (ints.length ? ints.map(function (x) {
        return '<div class="reco"><a class="reco-cab" href="#/a/contacto/interesado/' + esc(x.i.ID) + '">' + htmlPuntaje(x.m) + '<div class="prop-cuerpo"><span class="prop-titulo">' + esc(x.i.Nombre) + '</span><span class="prop-sub">' + esc(x.i.Celular || 'Sin celular') + '</span></div></a>' +
          htmlRazones(x.m.razones) + '<div class="fila-btns">' + (telLink(x.i.Celular) ? '<a class="btn chico" href="' + telLink(x.i.Celular) + '">' + ic('tel', 18) + 'Llamar</a>' : '') +
          '<a class="btn chico" href="#/a/cita-nueva?tipo=visita&ct=interesado&id=' + esc(x.i.ID) + '&prp=' + esc(pr.ID) + '">' + ic('cal', 18) + 'Agendar cita</a></div></div>';
      }).join('') : '<div class="vacio">Ningún interesado coincide todavía.</div>') + '</div>' +
      (citas.length ? '<div class="seccion"><div class="seccion-cab"><h2>Citas</h2></div><div class="lista">' + citas.map(function (c) { return itemCita(c, 'fecha'); }).join('') + '</div></div>' : '') +
      (historial.length ? '<div class="seccion"><div class="seccion-cab"><h2>Historial de reservas</h2></div><div class="lista">' + historial.map(function (r) { return itemReserva(r, 'propiedad'); }).join('') + '</div></div>' : '') +
      '<button class="btn peligro ancho" data-borrar>Eliminar propiedad</button></div>' + nav('propiedades'), function (app) {
        enlazarVolver(app, '#/a/propiedades');
        function cambiar(est) {
          guardarRegistro('Propiedades', Object.assign({}, pr, { Estado: est })).then(function () { S.pub = null; toast(est === 'Disponible' ? 'Propiedad publicada' : 'Estado: ' + est); VISTAS.propiedad(p); }).catch(function () { VISTAS.propiedad(p); });
        }
        var ap = app.querySelector('[data-estado]');
        if (ap) ap.onclick = function () { cambiar('Disponible'); };
        var sel = app.querySelector('#f_est');
        if (sel) sel.onchange = function (e) { cambiar(e.target.value); };
        app.querySelectorAll('[data-reserva]').forEach(function (b) {
          b.onclick = function () {
            var est = b.dataset.reserva, destino = pr.Operacion === 'Alquiler' ? 'Alquilado' : 'Vendido';
            if (!confirm(est === 'Concretada' ? '¿Marcar la reserva como concretada? La propiedad pasará a "' + destino + '".' : '¿Cancelar la reserva? La propiedad volverá a estar disponible en el catálogo.')) return;
            guardarReserva({ ID: activa.ID, Estado: est }).then(function () {
              toast(est === 'Concretada' ? 'Reserva concretada · ' + destino : 'Reserva cancelada');
              VISTAS.propiedad(p);
            }).catch(function () {});
          };
        });
        app.querySelector('[data-borrar]').onclick = function () {
          if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
          eliminarRegistro('Propiedades', pr.ID).then(function () { S.pub = null; toast('Propiedad eliminada'); ir('#/a/propiedades'); });
        };
      });
  };

  VISTAS['propiedad-form'] = function (p, q) {
    var pr = p[0] ? buscarId('Propiedades', p[0]) : null;
    var cf = conf();
    var duenos = T('Propietarios').slice().sort(function (a, b) { return a.Nombre.localeCompare(b.Nombre); });
    var duenoSel = pr ? pr.ID_Propietario : (q.dueno || '');
    var activa = pr && reservaActiva(pr.ID);
    pintar('<div class="pantalla">' + cabVolver(pr ? 'Editar propiedad' : 'Nueva propiedad') +
      '<form class="formulario" novalidate>' +
      campo({ n: 'ID_Propietario', l: 'Propietario', t: 'select', op: duenos.map(function (d) { return [d.ID, d.Nombre]; }).concat([['__nuevo', '+ Registrar nuevo propietario']]) }, duenoSel) +
      '<div class="recuadro" id="nuevoDueno" hidden><span class="recuadro-titulo">Nuevo propietario</span>' + campo({ n: 'NuevoNombre', l: 'Nombre', req: true }) + campo({ n: 'NuevoCelular', l: 'Celular', t: 'tel' }) + '</div>' +
      defsPropiedad(cf).map(function (d) { return campo(d, pr ? pr[d.n] : ''); }).join('') +
      (activa ? '<p class="item-sub">Estado: Reservado. Cambia cuando marques la reserva como concretada o cancelada.</p>'
        : campo({ n: 'Estado', l: 'Estado', t: 'select', op: ESTADOS_PROP, vacio: false, req: true }, pr ? pr.Estado : 'Disponible')) +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar propiedad</button></div></form></div>', function (app) {
        enlazarVolver(app, '#/a/propiedades');
        var form = app.querySelector('form'), sel = app.querySelector('#f_ID_Propietario'), caja = app.querySelector('#nuevoDueno');
        sel.onchange = function () { caja.hidden = sel.value !== '__nuevo'; };
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Tipo) return errorForm(form, 'Elige el tipo de propiedad.');
          var nuevo = d.ID_Propietario === '__nuevo';
          if (nuevo && !d.NuevoNombre) return errorForm(form, 'Escribe el nombre del nuevo propietario.');
          var paso = nuevo ? guardarRegistro('Propietarios', { Nombre: d.NuevoNombre, Celular: d.NuevoCelular, Origen: 'Agente' }) : Promise.resolve(null);
          paso.then(function (dn) {
            if (dn) d.ID_Propietario = dn.ID;
            delete d.NuevoNombre; delete d.NuevoCelular;
            if (pr) d.ID = pr.ID; else d.Origen = 'Agente';
            return guardarRegistro('Propiedades', d);
          }).then(function (g) {
            S.pub = null; toast('Propiedad guardada');
            history.replaceState(null, '', '#/a/propiedad/' + g.ID); render();
          }).catch(function () {});
        };
      });
  };

  VISTAS.citas = function () {
    var h = hoy();
    var todas = T('Citas').slice().sort(ordenarCitas);
    var prox = todas.filter(function (c) { return c.Fecha >= h; });
    var pasadas = todas.filter(function (c) { return c.Fecha < h; }).reverse();
    var porDia = {};
    prox.forEach(function (c) { (porDia[c.Fecha] = porDia[c.Fecha] || []).push(c); });
    var bloques = Object.keys(porDia).sort().map(function (f) {
      var t = f === h ? 'Hoy · ' + fechaLarga(f).toLowerCase() : fechaLarga(f);
      return '<div class="seccion"><div class="seccion-cab"><h2>' + esc(t) + '</h2></div><div class="lista">' + porDia[f].map(function (c) { return itemCita(c); }).join('') + '</div></div>';
    }).join('');
    pintar('<div class="pantalla"><div class="cab"><h1>Citas</h1></div>' +
      '<a class="btn primario ancho" href="#/a/cita-nueva">' + ic('mas', 22) + 'Agendar cita</a>' +
      (bloques || '<div class="vacio">No tienes citas próximas.</div>') +
      (pasadas.length ? '<button class="btn ancho" data-pasadas>' + (S.verPasadas ? 'Ocultar citas pasadas' : 'Ver citas pasadas (' + pasadas.length + ')') + '</button>' +
        (S.verPasadas ? '<div class="lista">' + pasadas.map(function (c) { return itemCita(c, 'fecha'); }).join('') + '</div>' : '') : '') +
      '</div>' + nav('citas'), function (app) {
        var b = app.querySelector('[data-pasadas]');
        if (b) b.onclick = function () { S.verPasadas = !S.verPasadas; VISTAS.citas(); };
      });
  };

  function opcionesContacto(t, conNuevo) {
    var arr = T(TABLA_DE[t]).slice().sort(function (a, b) { return a.Nombre.localeCompare(b.Nombre); }).map(function (c) {
      return [c.ID, c.Nombre + (t === 'otro' && c.Categoria ? ' · ' + c.Categoria : '') + (c.Celular ? ' · ' + c.Celular : '')];
    });
    if (conNuevo) arr.push(['__nuevo', t === 'otro' ? '+ Registrar nuevo contacto' : '+ Registrar nuevo ' + NOMBRE_TIPO[t].toLowerCase()]);
    return arr;
  }

  function formCita(c, q) {
    var cf = conf();
    var k = c ? contactoDeCita(c) : null;
    var tcita = c ? tipoDeCita(c) : ({ captacion: 'Captación', reunion: 'Reunión' }[q.tipo] || 'Visita');
    var tipo = k ? k.tipo : (CONTACTO_DE_CITA[tcita] || (TABLA_DE[q.ct] ? q.ct : 'interesado'));
    var v = c ? Object.assign({}, c, { ID_Contacto: k.id }) : { ID_Contacto: q.id || q.int || '', ID_Propiedad: q.prp || '', Fecha: hoy(), Hora: '', Notas: '', Estado: 'Pendiente' };
    function campoContacto(valor) {
      var elige = tcita === 'Reunión' ? 'un contacto' : (tipo === 'propietario' ? 'el propietario' : 'el interesado');
      return campo({ n: 'ID_Contacto', l: tcita === 'Reunión' ? 'Contacto' : NOMBRE_TIPO[tipo], t: 'select', op: opcionesContacto(tipo, true), vacio: '— Elige ' + elige + ' —' }, valor);
    }
    function htmlContacto(valor) {
      return (tcita === 'Reunión' ? campo({ n: 'TipoContacto', l: '¿Con quién es la reunión?', t: 'seg', op: [['interesado', 'Interesado'], ['propietario', 'Propietario'], ['otro', 'Otro']], req: true }, tipo) : '') +
        '<div id="selContacto">' + campoContacto(valor) + '</div>';
    }
    function htmlNuevo() {
      return '<span class="recuadro-titulo">Nuevo ' + (tipo === 'otro' ? 'contacto' : NOMBRE_TIPO[tipo].toLowerCase()) + '</span>' +
        campo({ n: 'NNombre', l: 'Nombre', req: true }) + campo({ n: 'NCelular', l: 'Celular', t: 'tel', ph: '984 123 456' }) +
        (tipo === 'otro' ? campo({ n: 'NCategoria', l: 'Categoría', t: 'select', op: cf.categoriasOtros }) + campo({ n: 'NDetalle', l: 'Detalle', t: 'area', ph: 'Notaría del centro' }) : '');
    }
    // En Captación solo aparecen las propiedades del propietario elegido.
    function campoPropiedad(idDueno, valor) {
      var props = T('Propiedades').filter(function (p) {
        if (p.ID === valor) return true;
        if (tcita === 'Captación') return !!idDueno && p.ID_Propietario === idDueno;
        if (tcita === 'Visita') return p.Estado !== 'Vendido' && p.Estado !== 'Alquilado';
        return true;
      });
      return campo({ n: 'ID_Propiedad', l: { 'Visita': 'Propiedad a visitar', 'Captación': 'Propiedad a captar', 'Reunión': 'Propiedad relacionada' }[tcita], t: 'select',
        op: props.map(function (p) { return [p.ID, resumenProp(p) + (p.Precio ? ' · ' + dinero(p.Precio) : '')]; }),
        vacio: { 'Visita': '— Sin indicar —', 'Captación': 'Aún no registrada', 'Reunión': 'Ninguna' }[tcita] }, valor);
    }
    function resumen(idp, idc) {
      var p = buscarId('Propiedades', idp), ct = idc && idc !== '__nuevo' ? contacto(tipo, idc) : null, d = p && buscarId('Propietarios', p.ID_Propietario);
      if (!p && !ct) return '';
      return '<div class="ficha compacta">' + (ct ? '<p class="item-sub">' + NOMBRE_TIPO[tipo] + ': <strong>' + esc(ct.Nombre) + '</strong>' + (ct.Celular ? ' · ' + esc(ct.Celular) : '') + '</p>' : '') +
        (p ? '<p class="resaltado">' + esc(resumenProp(p)) + (p.Precio ? ' · ' + dinero(p.Precio) : '') + '</p><p class="item-sub">Propietario: ' + esc(d ? d.Nombre + (d.Celular ? ' · ' + d.Celular : '') : '—') + '</p><p class="item-sub">Dirección: ' + esc(p.Direccion || '—') + '</p>' : '') + '</div>';
    }
    pintar('<div class="pantalla">' + cabVolver(c ? 'Cita' : 'Nueva cita') +
      '<form class="formulario" novalidate>' +
      campo({ n: 'TipoCita', l: 'Tipo de cita', t: 'seg', op: TIPOS_CITA, req: true }, tcita) +
      '<p class="item-sub" id="ayudaCita">' + esc(AYUDA_CITA[tcita]) + '</p>' +
      '<div class="grupo" id="zonaContacto">' + htmlContacto(v.ID_Contacto) + '</div>' +
      '<div class="recuadro" id="nuevoContacto" hidden>' + htmlNuevo() + '</div>' +
      '<div id="zonaProp">' + campoPropiedad(tipo === 'propietario' ? v.ID_Contacto : '', v.ID_Propiedad) + '</div>' +
      '<div id="resumenCita">' + resumen(v.ID_Propiedad, v.ID_Contacto) + '</div>' +
      '<div class="dos-col">' + campo({ n: 'Fecha', l: 'Fecha', t: 'date', req: true }, v.Fecha) + campo({ n: 'Hora', l: 'Hora', t: 'time' }, v.Hora) + '</div>' +
      campo({ n: 'Notas', l: 'Notas', t: 'area', ph: 'Llevar plano y copia literal' }, v.Notas) +
      (c ? campo({ n: 'Estado', l: 'Estado', t: 'seg', op: ESTADOS_CITA, req: true }, v.Estado || 'Pendiente') : '') +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar cita</button>' + (c ? '<button class="btn peligro ancho" type="button" data-borrar>Eliminar cita</button>' : '') + '</div></form></div>', function (app) {
        enlazarVolver(app, '#/a/citas');
        var form = app.querySelector('form');
        var caja = app.querySelector('#nuevoContacto');
        function idDueno() { return tipo === 'propietario' && form.ID_Contacto.value !== '__nuevo' ? form.ID_Contacto.value : ''; }
        function act() { app.querySelector('#resumenCita').innerHTML = resumen(form.ID_Propiedad.value, form.ID_Contacto.value); }
        function pintarProp() {
          var actual = buscarId('Propiedades', form.ID_Propiedad.value);
          var valor = actual && (tcita !== 'Captación' || actual.ID_Propietario === idDueno()) ? actual.ID : '';
          app.querySelector('#zonaProp').innerHTML = campoPropiedad(idDueno(), valor);
          form.ID_Propiedad.onchange = act;
        }
        function alCambiarContacto() {
          caja.hidden = form.ID_Contacto.value !== '__nuevo';
          if (tcita === 'Captación') pintarProp();
          act();
        }
        function enlazarContacto() {
          form.ID_Contacto.onchange = alCambiarContacto;
          form.querySelectorAll('[name=TipoContacto]').forEach(function (r) { r.onchange = function () { tipo = r.value; pintarContacto(false, ''); }; });
        }
        function pintarContacto(conTipo, valor) {
          if (conTipo) app.querySelector('#zonaContacto').innerHTML = htmlContacto(valor);
          else app.querySelector('#selContacto').innerHTML = campoContacto(valor);
          caja.innerHTML = htmlNuevo();
          if (!valor && !T(TABLA_DE[tipo]).length) form.ID_Contacto.value = '__nuevo';
          enlazarContacto(); alCambiarContacto();
        }
        form.querySelectorAll('[name=TipoCita]').forEach(function (r) {
          r.onchange = function () {
            var antes = { tipo: tipo, id: form.ID_Contacto.value };
            tcita = r.value;
            tipo = CONTACTO_DE_CITA[tcita] || antes.tipo;
            app.querySelector('#ayudaCita').textContent = AYUDA_CITA[tcita];
            pintarContacto(true, antes.tipo === tipo ? antes.id : '');
            pintarProp(); act();
          };
        });
        enlazarContacto();
        form.ID_Propiedad.onchange = act;
        if (!v.ID_Contacto && !T(TABLA_DE[tipo]).length) form.ID_Contacto.value = '__nuevo';
        caja.hidden = form.ID_Contacto.value !== '__nuevo';
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          if (!d.Fecha) return errorForm(form, 'Elige la fecha de la cita.');
          var nuevo = d.ID_Contacto === '__nuevo';
          if (nuevo && !d.NNombre) return errorForm(form, 'Escribe el nombre del nuevo contacto.');
          var datosNuevo = tipo === 'otro' ? { Nombre: d.NNombre, Celular: d.NCelular, Categoria: d.NCategoria, Detalle: d.NDetalle } : { Nombre: d.NNombre, Celular: d.NCelular, Origen: 'Agente' };
          var paso = nuevo ? guardarRegistro(TABLA_DE[tipo], datosNuevo) : Promise.resolve(null);
          paso.then(function (nc) {
            var idc = nc ? nc.ID : d.ID_Contacto;
            var reg = { TipoCita: tcita, TipoContacto: NOMBRE_TIPO[tipo], ID_Contacto: idc, ID_Interesado: tipo === 'interesado' ? idc : '', ID_Propiedad: d.ID_Propiedad, Fecha: d.Fecha, Hora: d.Hora, Notas: d.Notas, Estado: c ? (d.Estado || 'Pendiente') : 'Pendiente' };
            if (c) reg.ID = c.ID;
            return guardarRegistro('Citas', reg);
          }).then(function () { toast('Cita guardada'); ir('#/a/citas'); }).catch(function () {});
        };
        var b = app.querySelector('[data-borrar]');
        if (b) b.onclick = function () {
          if (!confirm('¿Eliminar esta cita?')) return;
          eliminarRegistro('Citas', c.ID).then(function () { toast('Cita eliminada'); ir('#/a/citas'); });
        };
      });
  }
  VISTAS['cita-nueva'] = function (p, q) { formCita(null, q); };
  VISTAS.cita = function (p) {
    var c = buscarId('Citas', p[0]);
    if (!c) return ir('#/a/citas');
    formCita(c, {});
  };

  function formLlamada(l, q) {
    var cf = conf();
    var tipo = l ? tipoDeLlamada(l) : (q.tipo || 'interesado');
    var v = l || { ID_Contacto: q.id || '', ID_Propiedad: '', Motivo: '', Fecha: hoy(), Estado: 'Pendiente' };
    function opciones(t) { return opcionesContacto(t, t === 'otro'); }
    var props = T('Propiedades');
    pintar('<div class="pantalla">' + cabVolver(l ? 'Llamada' : 'Nueva llamada') +
      '<form class="formulario" novalidate>' +
      campo({ n: 'TipoContacto', l: '¿A quién vas a llamar?', t: 'seg', op: [['interesado', 'Interesado'], ['propietario', 'Propietario'], ['otro', 'Otro']], req: true }, tipo) +
      '<div id="selContacto">' + campo({ n: 'ID_Contacto', l: 'Contacto', t: 'select', op: opciones(tipo), req: true, vacio: '— Elige un contacto —' }, v.ID_Contacto) + '</div>' +
      '<div class="recuadro" id="nuevoOtro" hidden><span class="recuadro-titulo">Datos del contacto</span>' +
      campo({ n: 'ONombre', l: 'Nombre', req: true, ph: 'Dr. Ramírez' }) + campo({ n: 'OCelular', l: 'Celular', t: 'tel', ph: '984 123 456' }) +
      campo({ n: 'OCategoria', l: 'Categoría', t: 'select', op: cf.categoriasOtros }) + campo({ n: 'ODetalle', l: 'Detalle', t: 'area', ph: 'Notaría del centro, encargado de la minuta' }) + '</div>' +
      campo({ n: 'Motivo', l: 'Motivo de la llamada', t: 'area', ph: 'Confirmar precio del terreno' }, v.Motivo) +
      '<div class="dos-col">' + campo({ n: 'Fecha', l: 'Fecha', t: 'date' }, v.Fecha) +
      campo({ n: 'ID_Propiedad', l: 'Propiedad', t: 'select', op: props.map(function (p) { return [p.ID, resumenProp(p)]; }), vacio: 'Ninguna' }, v.ID_Propiedad) + '</div>' +
      (l ? campo({ n: 'Estado', l: 'Estado', t: 'seg', op: ['Pendiente', 'Hecha'], req: true }, v.Estado || 'Pendiente') : '') +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">Guardar llamada</button>' + (l ? '<button class="btn peligro ancho" type="button" data-borrar>Eliminar llamada</button>' : '') + '</div></form></div>', function (app) {
        enlazarVolver(app, '#/a/llamadas');
        var form = app.querySelector('form');
        var caja = app.querySelector('#nuevoOtro');
        function revisar() { caja.hidden = form.ID_Contacto.value !== '__nuevo'; }
        function cambiarTipo(t) {
          app.querySelector('#selContacto').innerHTML = campo({ n: 'ID_Contacto', l: 'Contacto', t: 'select', op: opciones(t), req: true, vacio: '— Elige un contacto —' }, '');
          if (t === 'otro' && !T('OtrosContactos').length) form.ID_Contacto.value = '__nuevo';
          form.ID_Contacto.onchange = revisar; revisar();
        }
        form.querySelectorAll('[name=TipoContacto]').forEach(function (r) { r.onchange = function () { cambiarTipo(r.value); }; });
        form.ID_Contacto.onchange = revisar;
        if (tipo === 'otro' && !T('OtrosContactos').length && !v.ID_Contacto) form.ID_Contacto.value = '__nuevo';
        revisar();
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          var t = d.TipoContacto;
          if (!d.ID_Contacto) return errorForm(form, 'Elige a quién vas a llamar.');
          if (d.ID_Contacto === '__nuevo' && !d.ONombre) return errorForm(form, 'Escribe el nombre del contacto.');
          var paso = d.ID_Contacto === '__nuevo' ? guardarRegistro('OtrosContactos', { Nombre: d.ONombre, Celular: d.OCelular, Categoria: d.OCategoria, Detalle: d.ODetalle }) : Promise.resolve(null);
          paso.then(function (nc) {
            var reg = { TipoContacto: NOMBRE_TIPO[t], ID_Contacto: nc ? nc.ID : d.ID_Contacto, ID_Propiedad: d.ID_Propiedad, Motivo: d.Motivo, Fecha: d.Fecha, Estado: d.Estado || 'Pendiente' };
            if (l) reg.ID = l.ID;
            return guardarRegistro('Llamadas', reg);
          }).then(function () { toast('Llamada guardada'); ir('#/a/llamadas'); }).catch(function () {});
        };
        var b = app.querySelector('[data-borrar]');
        if (b) b.onclick = function () {
          if (!confirm('¿Eliminar esta llamada?')) return;
          eliminarRegistro('Llamadas', l.ID).then(function () { toast('Llamada eliminada'); ir('#/a/llamadas'); });
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
      campo({ n: 'ID_Interesado', l: 'Interesado que reserva', t: 'select', req: true, vacio: '— Elige al interesado —', op: opcionesContacto('interesado', true) }, v.ID_Interesado) +
      '<div class="recuadro" id="nuevoInt" hidden><span class="recuadro-titulo">Nuevo interesado</span>' + campo({ n: 'NNombre', l: 'Nombre', req: true }) + campo({ n: 'NCelular', l: 'Celular', t: 'tel', ph: '987 654 321' }) + '</div>' +
      '<div class="dos-col">' + campo({ n: 'FechaReserva', l: 'Fecha de reserva', t: 'date' }, v.FechaReserva) + campo({ n: 'FechaLimite', l: 'Fecha límite', t: 'date' }, v.FechaLimite) + '</div>' +
      campo({ n: 'MontoSeparacion', l: 'Monto de separación (S/)', t: 'num', ph: '2000' }, v.MontoSeparacion) +
      campo({ n: 'Notas', l: 'Notas', t: 'area', ph: 'Pagó por transferencia; minuta pendiente' }, v.Notas) +
      (activa ? campo({ n: 'Estado', l: 'Estado', t: 'seg', op: ESTADOS_RESERVA, req: true }, 'Activa') : '') +
      '<div class="barra-guardar"><button class="btn primario ancho" type="submit">' + (r ? 'Guardar reserva' : 'Registrar reserva') + '</button>' +
      (r ? '<button class="btn peligro ancho" type="button" data-borrar>Eliminar reserva</button>' : '') + '</div></form></div>', function (app) {
        enlazarVolver(app, r ? '#/a/propiedad/' + r.ID_Propiedad : '#/a/propiedades');
        var form = app.querySelector('form'), caja = app.querySelector('#nuevoInt');
        function revisar() { caja.hidden = form.ID_Interesado.value !== '__nuevo'; }
        form.ID_Interesado.onchange = revisar;
        if (!v.ID_Interesado && !T('Interesados').length) form.ID_Interesado.value = '__nuevo';
        revisar();
        form.onsubmit = function (e) {
          e.preventDefault();
          var d = leerForm(form);
          var idp = r ? r.ID_Propiedad : d.ID_Propiedad;
          if (!idp) return errorForm(form, 'Elige la propiedad que se reserva.');
          if (!d.ID_Interesado) return errorForm(form, 'Elige al interesado que reserva.');
          var nuevo = d.ID_Interesado === '__nuevo';
          if (nuevo && !d.NNombre) return errorForm(form, 'Escribe el nombre del nuevo interesado.');
          if (d.FechaLimite && d.FechaReserva && d.FechaLimite < d.FechaReserva) return errorForm(form, 'La fecha límite no puede ser anterior a la fecha de reserva.');
          var cambio = r && d.Estado && d.Estado !== r.Estado ? d.Estado : '';
          var prop = buscarId('Propiedades', idp);
          if (cambio === 'Concretada' && !confirm('¿Marcar la reserva como concretada? La propiedad pasará a "' + (prop && prop.Operacion === 'Alquiler' ? 'Alquilado' : 'Vendido') + '".')) return;
          if (cambio === 'Cancelada' && !confirm('¿Cancelar la reserva? La propiedad volverá a estar disponible en el catálogo.')) return;
          var paso = nuevo ? guardarRegistro('Interesados', { Nombre: d.NNombre, Celular: d.NCelular, Origen: 'Agente' }) : Promise.resolve(null);
          paso.then(function (ni) {
            var reg = { ID_Propiedad: idp, ID_Interesado: ni ? ni.ID : d.ID_Interesado, FechaReserva: d.FechaReserva, MontoSeparacion: d.MontoSeparacion, FechaLimite: d.FechaLimite, Notas: d.Notas };
            if (r) { reg.ID = r.ID; if (d.Estado) reg.Estado = d.Estado; }
            return guardarReserva(reg);
          }).then(function (g) {
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

  /* ================= Modo demo (sin servidor) ================= */

  var Demo = {
    CONTRASENA: 'demo1234',
    REDES: { FACEBOOK: 'https://web.facebook.com/alquis.group', TIKTOK: 'https://www.tiktok.com/@alquis_group', INSTAGRAM: 'https://www.instagram.com/grupoalquis/' },
    cargar: function () {
      var db = leerJSON('inmo_demo_db');
      var h = hoy(), d = function (n) { return sumarDias(h, n); };
      if (db) {
        // Datos demo de versiones anteriores: quita el PIN y agrega lo nuevo.
        var cambio = false;
        if (!db.Sesiones || db.Config.PIN || !('FACEBOOK' in db.Config)) {
          delete db.Config.PIN;
          Object.keys(Demo.REDES).forEach(function (k) { if (!(k in db.Config)) db.Config[k] = Demo.REDES[k]; });
          db.Sesiones = db.Sesiones || {};
          cambio = true;
        }
        if (!db.Reservas) {
          db.Reservas = [];
          if (db.Propiedades.some(function (p) { return p.ID === 'PRP-0003' && p.Estado === 'Reservado'; }) && db.Interesados.some(function (i) { return i.ID === 'INT-0004'; })) {
            db.Reservas.push({ ID: 'RES-0001', ID_Propiedad: 'PRP-0003', ID_Interesado: 'INT-0004', FechaReserva: d(-4), MontoSeparacion: '2000', FechaLimite: d(6), Estado: 'Activa', Notas: 'Pagó por transferencia.', FechaRegistro: d(-4) });
          }
          cambio = true;
        }
        if (cambio) Demo.guardar(db);
        return db;
      }
      db = {
        Config: Object.assign({ NOMBRE_NEGOCIO: MARCA, WHATSAPP: '51999999999', ZONAS: 'San Jerónimo, San Sebastián, Wanchaq, Santiago, Cusco Centro', CARACTERISTICAS: 'Con título, Agua, Luz, Desagüe, Pista asfaltada, Cochera, Jardín', CATEGORIAS_OTROS: 'Notario, Municipalidad, Topógrafo, Banco, Abogado, Otro agente, Otro' }, Demo.REDES),
        Sesiones: {},
        Propietarios: [
          { ID: 'PRO-0001', Nombre: 'María Quispe', Celular: '984123456', Notas: '', Origen: 'Agente', FechaRegistro: d(-20) },
          { ID: 'PRO-0002', Nombre: 'Pedro Ccahua', Celular: '974555210', Notas: '', Origen: 'Agente', FechaRegistro: d(-15) },
          { ID: 'PRO-0003', Nombre: 'Ana Torres', Celular: '951330778', Notas: '', Origen: 'Agente', FechaRegistro: d(-10) },
          { ID: 'PRO-0004', Nombre: 'Julia Mendoza', Celular: '962410337', Notas: '', Origen: 'App', FechaRegistro: d(-1) }
        ],
        Interesados: [
          { ID: 'INT-0001', Nombre: 'Juan Pérez', Celular: '987654321', Operacion: 'Venta', Tipo: 'Terreno', Zonas: 'San Jerónimo, San Sebastián', PresupuestoMax: '150000', AreaMin: '150', DormitoriosMin: '', Caracteristicas: 'Con título, Agua', Notas: '', Origen: 'Agente', FechaRegistro: d(-12) },
          { ID: 'INT-0002', Nombre: 'Rosa Mamani', Celular: '965112449', Operacion: 'Venta', Tipo: 'Casa', Zonas: 'Wanchaq', PresupuestoMax: '260000', AreaMin: '', DormitoriosMin: '3', Caracteristicas: 'Cochera', Notas: '', Origen: 'Agente', FechaRegistro: d(-9) },
          { ID: 'INT-0003', Nombre: 'Luis Condori', Celular: '942870615', Operacion: 'Venta', Tipo: 'Casa', Zonas: '', PresupuestoMax: '250000', AreaMin: '', DormitoriosMin: '', Caracteristicas: '', Notas: '', Origen: 'App', FechaRegistro: d(-2) },
          { ID: 'INT-0004', Nombre: 'Carlos Huamán', Celular: '958221904', Operacion: 'Venta', Tipo: 'Departamento', Zonas: 'Santiago, Wanchaq', PresupuestoMax: '200000', AreaMin: '', DormitoriosMin: '2', Caracteristicas: '', Notas: '', Origen: 'Agente', FechaRegistro: d(-6) }
        ],
        OtrosContactos: [
          { ID: 'OTR-0001', Nombre: 'Dr. Ramírez', Celular: '984700120', Categoria: 'Notario', Detalle: 'Notaría del centro', FechaRegistro: d(-30) },
          { ID: 'OTR-0002', Nombre: 'Jorge Huallpa', Celular: '973450882', Categoria: 'Topógrafo', Detalle: 'Planos y linderos', FechaRegistro: d(-25) }
        ],
        Propiedades: [
          { ID: 'PRP-0001', ID_Propietario: 'PRO-0001', Operacion: 'Venta', Tipo: 'Terreno', Zona: 'San Jerónimo', Direccion: 'Calle Los Pinos s/n', Area: '200', Dormitorios: '', Precio: '120000', Caracteristicas: 'Con título, Agua, Luz', Descripcion: 'Terreno plano, cerca a la avenida principal.', Estado: 'Disponible', Origen: 'Agente', FechaRegistro: d(-20) },
          { ID: 'PRP-0002', ID_Propietario: 'PRO-0002', Operacion: 'Venta', Tipo: 'Casa', Zona: 'Wanchaq', Direccion: 'Jr. Los Álamos 210', Area: '160', Dormitorios: '3', Precio: '240000', Caracteristicas: 'Con título, Agua, Luz, Desagüe, Cochera', Descripcion: 'Casa de dos pisos con patio.', Estado: 'Disponible', Origen: 'Agente', FechaRegistro: d(-15) },
          { ID: 'PRP-0003', ID_Propietario: 'PRO-0003', Operacion: 'Venta', Tipo: 'Departamento', Zona: 'Santiago', Direccion: 'Av. Antonio Lorena 455', Area: '85', Dormitorios: '2', Precio: '180000', Caracteristicas: 'Agua, Luz, Desagüe', Descripcion: '', Estado: 'Reservado', Origen: 'Agente', FechaRegistro: d(-10) },
          { ID: 'PRP-0004', ID_Propietario: 'PRO-0001', Operacion: 'Venta', Tipo: 'Terreno', Zona: 'San Sebastián', Direccion: '', Area: '300', Dormitorios: '', Precio: '185000', Caracteristicas: 'Con título, Agua', Descripcion: '', Estado: 'Disponible', Origen: 'Agente', FechaRegistro: d(-8) },
          { ID: 'PRP-0005', ID_Propietario: 'PRO-0004', Operacion: 'Alquiler', Tipo: 'Departamento', Zona: 'Wanchaq', Direccion: 'Calle Tacna 120', Area: '70', Dormitorios: '2', Precio: '1500', Caracteristicas: 'Agua, Luz', Descripcion: 'Departamento amoblado.', Estado: 'Pendiente', Origen: 'App', FechaRegistro: d(-1) },
          { ID: 'PRP-0006', ID_Propietario: 'PRO-0002', Operacion: 'Venta', Tipo: 'Casa', Zona: 'San Sebastián', Direccion: 'Urb. Túpac Amaru B-12', Area: '140', Dormitorios: '3', Precio: '210000', Caracteristicas: 'Con título, Agua, Luz, Desagüe, Jardín', Descripcion: 'Casa de un piso con jardín interior.', Estado: 'Reservado', Origen: 'Agente', FechaRegistro: d(-18) },
          { ID: 'PRP-0007', ID_Propietario: 'PRO-0003', Operacion: 'Alquiler', Tipo: 'Local', Zona: 'Cusco Centro', Direccion: 'Calle Plateros 330', Area: '45', Dormitorios: '', Precio: '2800', Caracteristicas: 'Agua, Luz', Descripcion: 'Local comercial a media cuadra de la plaza.', Estado: 'Reservado', Origen: 'Agente', FechaRegistro: d(-14) }
        ],
        Citas: [
          { ID: 'CIT-0001', ID_Interesado: 'INT-0001', ID_Propiedad: 'PRP-0001', Fecha: h, Hora: '10:00', Notas: 'Llevar plano', Estado: 'Pendiente', FechaRegistro: d(-3) },
          { ID: 'CIT-0002', ID_Interesado: 'INT-0002', ID_Propiedad: 'PRP-0002', Fecha: h, Hora: '12:30', Notas: '', Estado: 'Pendiente', FechaRegistro: d(-2) },
          { ID: 'CIT-0003', ID_Interesado: 'INT-0004', ID_Propiedad: 'PRP-0003', Fecha: h, Hora: '16:00', Notas: '', Estado: 'Pendiente', FechaRegistro: d(-2) },
          { ID: 'CIT-0004', ID_Interesado: 'INT-0003', ID_Propiedad: 'PRP-0002', Fecha: d(2), Hora: '09:30', Notas: '', Estado: 'Pendiente', FechaRegistro: d(-1) },
          { ID: 'CIT-0005', ID_Interesado: 'INT-0001', ID_Propiedad: 'PRP-0004', Fecha: d(7), Hora: '10:00', Notas: '', Estado: 'Pendiente', FechaRegistro: d(-1) },
          { ID: 'CIT-0006', ID_Interesado: '', ID_Propiedad: '', Fecha: h, Hora: '15:30', Notas: 'Quiere vender un terreno en Santiago.', Estado: 'Pendiente', FechaRegistro: d(-1), TipoCita: 'Captación', TipoContacto: 'Propietario', ID_Contacto: 'PRO-0003' },
          { ID: 'CIT-0007', ID_Interesado: '', ID_Propiedad: 'PRP-0004', Fecha: d(1), Hora: '11:00', Notas: 'Tomar fotos y medidas del terreno.', Estado: 'Pendiente', FechaRegistro: d(-1), TipoCita: 'Captación', TipoContacto: 'Propietario', ID_Contacto: 'PRO-0001' },
          { ID: 'CIT-0008', ID_Interesado: '', ID_Propiedad: 'PRP-0006', Fecha: d(1), Hora: '17:00', Notas: 'Revisar la minuta de la casa reservada.', Estado: 'Pendiente', FechaRegistro: d(-1), TipoCita: 'Reunión', TipoContacto: 'Otro', ID_Contacto: 'OTR-0001' },
          { ID: 'CIT-0009', ID_Interesado: '', ID_Propiedad: '', Fecha: d(3), Hora: '10:30', Notas: 'Firmar la autorización de venta.', Estado: 'Pendiente', FechaRegistro: d(-1), TipoCita: 'Reunión', TipoContacto: 'Propietario', ID_Contacto: 'PRO-0002' },
          { ID: 'CIT-0010', ID_Interesado: 'INT-0002', ID_Propiedad: 'PRP-0006', Fecha: d(-6), Hora: '18:00', Notas: 'Conversar la forma de pago.', Estado: 'Realizada', FechaRegistro: d(-8), TipoCita: 'Reunión', TipoContacto: 'Interesado', ID_Contacto: 'INT-0002' }
        ],
        Reservas: [
          { ID: 'RES-0001', ID_Propiedad: 'PRP-0003', ID_Interesado: 'INT-0004', FechaReserva: d(-4), MontoSeparacion: '2000', FechaLimite: d(6), Estado: 'Activa', Notas: 'Pagó por transferencia.', FechaRegistro: d(-4) },
          { ID: 'RES-0002', ID_Propiedad: 'PRP-0006', ID_Interesado: 'INT-0002', FechaReserva: d(-6), MontoSeparacion: '3000', FechaLimite: d(2), Estado: 'Activa', Notas: 'Espera la aprobación del crédito.', FechaRegistro: d(-6) },
          { ID: 'RES-0003', ID_Propiedad: 'PRP-0007', ID_Interesado: 'INT-0003', FechaReserva: d(-9), MontoSeparacion: '500', FechaLimite: d(-1), Estado: 'Activa', Notas: '', FechaRegistro: d(-9) },
          { ID: 'RES-0004', ID_Propiedad: 'PRP-0001', ID_Interesado: 'INT-0001', FechaReserva: d(-12), MontoSeparacion: '1000', FechaLimite: d(-5), Estado: 'Cancelada', Notas: 'Desistió por el precio.', FechaRegistro: d(-12) }
        ],
        Llamadas: [
          { ID: 'LLA-0001', TipoContacto: 'Interesado', ID_Contacto: 'INT-0002', ID_Propiedad: 'PRP-0002', Motivo: 'Enviar más datos de la casa en Wanchaq', Fecha: d(-1), Estado: 'Pendiente', FechaRegistro: d(-3) },
          { ID: 'LLA-0002', TipoContacto: 'Propietario', ID_Contacto: 'PRO-0001', ID_Propiedad: 'PRP-0001', Motivo: 'Confirmar precio del terreno', Fecha: h, Estado: 'Pendiente', FechaRegistro: d(-2) },
          { ID: 'LLA-0003', TipoContacto: 'Interesado', ID_Contacto: 'INT-0003', ID_Propiedad: '', Motivo: 'Ofrecer casas hasta S/ 250 000', Fecha: h, Estado: 'Pendiente', FechaRegistro: d(-2) },
          { ID: 'LLA-0004', TipoContacto: 'Otro', ID_Contacto: 'OTR-0001', ID_Propiedad: 'PRP-0004', Motivo: 'Ver minuta del terreno de San Sebastián', Fecha: h, Estado: 'Pendiente', FechaRegistro: d(-2) },
          { ID: 'LLA-0005', TipoContacto: 'Otro', ID_Contacto: 'OTR-0002', ID_Propiedad: '', Motivo: 'Cotizar plano perimétrico', Fecha: d(3), Estado: 'Pendiente', FechaRegistro: d(-1) }
        ]
      };
      Demo.guardar(db);
      return db;
    },
    guardar: function (db) { guardarLocal('inmo_demo_db', JSON.stringify(db)); },
    prefijos: { Propietarios: 'PRO', Interesados: 'INT', OtrosContactos: 'OTR', Propiedades: 'PRP', Citas: 'CIT', Llamadas: 'LLA', Reservas: 'RES' },
    config: function (c) {
      return { negocio: c.NOMBRE_NEGOCIO, whatsapp: c.WHATSAPP, facebook: urlSegura(c.FACEBOOK), tiktok: urlSegura(c.TIKTOK), instagram: urlSegura(c.INSTAGRAM), zonas: lista(c.ZONAS), caracteristicas: lista(c.CARACTERISTICAS), categoriasOtros: lista(c.CATEGORIAS_OTROS) };
    },
    token: function () {
      var b = new Uint8Array(32);
      (window.crypto || window.msCrypto).getRandomValues(b);
      return Array.prototype.map.call(b, function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    },
    sesion: function (db) {
      var t = Demo.token();
      db.Sesiones[t] = Date.now() + 30 * 24 * 60 * 60 * 1000;
      Demo.guardar(db);
      return { ok: true, data: { token: t, vence: db.Sesiones[t] } };
    },
    insertar: function (db, tabla, reg) {
      var pre = Demo.prefijos[tabla], arr = db[tabla], i = -1;
      if (reg.ID) i = arr.findIndex(function (x) { return x.ID === reg.ID; });
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], reg); Demo.guardar(db); return arr[i]; }
      var max = arr.reduce(function (m, x) { return Math.max(m, parseInt(String(x.ID).split('-')[1], 10) || 0); }, 0);
      var nuevo = Object.assign({}, reg, { ID: pre + '-' + ('0000' + (max + 1)).slice(-4), FechaRegistro: hoy() + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) });
      arr.push(nuevo); Demo.guardar(db); return nuevo;
    },
    reservaActiva: function (db, idp, salvo) {
      return db.Reservas.find(function (r) { return r.ID_Propiedad === idp && r.Estado === 'Activa' && r.ID !== salvo; });
    },
    liberar: function (db, idp) {
      var p = db.Propiedades.find(function (x) { return x.ID === idp; });
      if (!p || p.Estado !== 'Reservado' || Demo.reservaActiva(db, idp)) return null;
      return Object.assign({}, Demo.insertar(db, 'Propiedades', { ID: idp, Estado: 'Disponible' }));
    },
    // Las mismas reglas que guardarReserva() en Code.gs.
    guardarReserva: function (db, r) {
      r = r || {};
      function error(t) { return { ok: false, error: t }; }
      var previa = r.ID ? db.Reservas.find(function (x) { return x.ID === r.ID; }) : null;
      if (r.ID && !previa) return error('Esta reserva ya no existe.');
      var idProp = previa ? previa.ID_Propiedad : String(r.ID_Propiedad || '').trim();
      var idInt = ('ID_Interesado' in r || !previa) ? String(r.ID_Interesado || '').trim() : previa.ID_Interesado;
      if (!idProp) return error('Elige la propiedad que se reserva.');
      if (!idInt) return error('Elige al interesado que reserva.');
      var prop = db.Propiedades.find(function (p) { return p.ID === idProp; });
      if (!prop) return error('La propiedad ' + idProp + ' ya no existe.');
      if (!db.Interesados.some(function (i) { return i.ID === idInt; })) return error('El interesado ya no existe.');
      var antes = previa ? previa.Estado : '';
      var estado = previa ? (r.Estado || antes || 'Activa') : 'Activa';
      if (ESTADOS_RESERVA.indexOf(estado) < 0) return error('Estado de reserva no válido.');
      if (previa && estado !== antes && antes !== 'Activa') return error('Esta reserva ya está ' + String(antes).toLowerCase() + '. Si el cliente vuelve, registra una reserva nueva.');
      if (estado === 'Activa' && Demo.reservaActiva(db, idProp, previa && previa.ID)) return error('La propiedad ' + idProp + ' ya tiene una reserva activa. Márcala como concretada o cancelada antes de registrar otra.');
      if (!previa && prop.Estado !== 'Disponible' && prop.Estado !== 'Reservado') return error('Solo se puede reservar una propiedad disponible. Esta figura como "' + (prop.Estado || 'sin estado') + '".');
      var datos = { ID_Propiedad: idProp, ID_Interesado: idInt, Estado: estado };
      ['FechaReserva', 'MontoSeparacion', 'FechaLimite', 'Notas'].forEach(function (k) { if (k in r) datos[k] = String(r[k] == null ? '' : r[k]).trim(); });
      if (previa) datos.ID = previa.ID;
      else if (!datos.FechaReserva) datos.FechaReserva = hoy();
      var reserva = Object.assign({}, Demo.insertar(db, 'Reservas', datos));
      var propiedad = null;
      if (estado === 'Activa' && prop.Estado !== 'Reservado') propiedad = Demo.insertar(db, 'Propiedades', { ID: prop.ID, Estado: 'Reservado' });
      if (estado === 'Concretada' && antes !== 'Concretada') propiedad = Demo.insertar(db, 'Propiedades', { ID: prop.ID, Estado: prop.Operacion === 'Alquiler' ? 'Alquilado' : 'Vendido' });
      if (estado === 'Cancelada' && antes !== 'Cancelada') propiedad = Demo.liberar(db, prop.ID);
      return { ok: true, data: { reserva: reserva, propiedad: propiedad && Object.assign({}, propiedad) } };
    },
    // Igual que datosPublicos() en Code.gs: de la reserva solo sale la fecha límite vigente.
    publico: function (db) {
      var limites = {};
      db.Reservas.forEach(function (r) { if (r.Estado === 'Activa') limites[r.ID_Propiedad] = r.FechaLimite || ''; });
      return db.Propiedades.filter(function (p) { return p.Estado === 'Disponible' || p.Estado === 'Reservado'; }).map(function (p) {
        var o = { ID: p.ID, Operacion: p.Operacion, Tipo: p.Tipo, Zona: p.Zona, Area: p.Area, Dormitorios: p.Dormitorios, Precio: p.Precio, Caracteristicas: p.Caracteristicas, Descripcion: p.Descripcion, Estado: p.Estado };
        if (p.Estado === 'Reservado') o.FechaLimite = esIso(limites[p.ID]) && limites[p.ID] >= hoy() ? limites[p.ID] : '';
        return o;
      });
    },
    manejar: function (req) {
      var db = Demo.cargar(), d = req.data || {};
      var a = req.action;
      if (a === 'publico') return { ok: true, data: { config: Demo.config(db.Config), Propiedades: Demo.publico(db) } };
      if (a === 'publicarPropiedad') {
        var pr = Demo.insertar(db, 'Propietarios', { Nombre: d.Nombre, Celular: d.Celular, Notas: '', Origen: 'App' });
        Demo.insertar(db, 'Propiedades', { ID_Propietario: pr.ID, Operacion: d.Operacion, Tipo: d.Tipo, Zona: d.Zona, Direccion: d.Direccion, Area: d.Area, Dormitorios: d.Dormitorios, Precio: d.Precio, Caracteristicas: d.Caracteristicas, Descripcion: d.Descripcion, Estado: 'Pendiente', Origen: 'App' });
        return { ok: true };
      }
      if (a === 'registrarInteres') {
        var r = {}; ['Nombre', 'Celular', 'Operacion', 'Tipo', 'Zonas', 'PresupuestoMax', 'AreaMin', 'DormitoriosMin', 'Caracteristicas'].forEach(function (k) { r[k] = d[k] || ''; });
        r.Origen = 'App'; Demo.insertar(db, 'Interesados', r); return { ok: true };
      }
      if (a === 'login') return d.password === Demo.CONTRASENA ? Demo.sesion(db) : { ok: false, error: 'Contraseña incorrecta. En el modo demo es demo1234.' };
      if (a === 'logout') { delete db.Sesiones[req.token]; Demo.guardar(db); return { ok: true }; }
      if (!req.token || !(db.Sesiones[req.token] > Date.now())) return { ok: false, error: 'Tu sesión venció o se cerró. Vuelve a ingresar.', auth: false };
      if (a === 'cambiarContrasena') {
        if (d.actual !== Demo.CONTRASENA) return { ok: false, error: 'La contraseña actual no es correcta.' };
        return { ok: false, error: 'En el modo demo la contraseña es siempre demo1234. Podrás cambiarla cuando conectes tu hoja de Google.' };
      }
      if (a === 'todo') {
        var o = { config: Demo.config(db.Config) };
        Object.keys(Demo.prefijos).forEach(function (t) { o[t] = db[t].map(function (x) { return Object.assign({}, x); }); });
        return { ok: true, data: o };
      }
      var MSJ_ACTIVA = 'Esta propiedad tiene una reserva activa. Para cambiar su estado, marca la reserva como concretada o cancelada en el detalle de la propiedad.';
      if (a === 'guardar') {
        var reg = d.registro || {};
        if (!Demo.prefijos[d.tabla]) return { ok: false, error: 'Tabla no válida.' };
        if (d.tabla === 'Reservas') return { ok: false, error: 'Las reservas se guardan con su propio formulario.' };
        if (d.tabla === 'Propiedades' && reg.ID && ('Estado' in reg) && reg.Estado !== 'Reservado' && Demo.reservaActiva(db, reg.ID)) return { ok: false, error: MSJ_ACTIVA };
        return { ok: true, data: Object.assign({}, Demo.insertar(db, d.tabla, reg)) };
      }
      if (a === 'guardarReserva') return Demo.guardarReserva(db, d.registro);
      if (a === 'eliminar') {
        if (!Demo.prefijos[d.tabla]) return { ok: false, error: 'Tabla no válida.' };
        if (d.tabla === 'Propiedades' && Demo.reservaActiva(db, d.id)) return { ok: false, error: 'Esta propiedad tiene una reserva activa. Cancélala antes de eliminar la propiedad.' };
        var borrada = db[d.tabla].find(function (x) { return x.ID === d.id; });
        db[d.tabla] = db[d.tabla].filter(function (x) { return x.ID !== d.id; }); Demo.guardar(db);
        var liberada = d.tabla === 'Reservas' && borrada && borrada.Estado === 'Activa' ? Demo.liberar(db, borrada.ID_Propiedad) : null;
        return { ok: true, data: { id: d.id, propiedad: liberada } };
      }
      return { ok: false, error: 'Acción desconocida.' };
    }
  };

  /* ================= Inicio ================= */

  guardarLocal('inmo_pin', null); // la versión anterior guardaba el PIN aquí
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (typeof module !== 'undefined') module.exports = { coincidencia: coincidencia, recomendarPara: recomendarPara, Demo: Demo, etiquetaReservado: etiquetaReservado, contactoDeCita: contactoDeCita };
  else render();
})();
