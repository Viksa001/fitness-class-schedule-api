(() => {
  'use strict';

  // ---------- constants ----------
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
  const PALETTE = ['#ff5a36', '#2f7cf6', '#16a37b', '#a259ff', '#f2a20c', '#e5468c', '#0fa3b1', '#6b7a2a'];
  const HOUR_PX = 56;
  const KEY_STORAGE = 'fitbuddy.apiKey';
  const DEFAULT_KEY = 'demo-key-2026';
  const THIS_YEAR = new Date().getFullYear();

  const ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2v.1"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    room: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><circle cx="15" cy="12" r="1"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5h11M6.5 17.5h11M4 9v6M20 9v6M2 11v2M22 11v2M6.5 6.5v11M17.5 6.5v11"/></svg>',
  };

  // ---------- state ----------
  const state = {
    rooms: [],
    instructors: [],
    schedule: [],
    busiest: [],
    classes: new Map(),   // fitnessClassId -> class, merged from every year we've loaded
    loadedYears: new Set(),
    authError: false,
    filters: { room: '', instructor: '' },
    classYear: THIS_YEAR,
    classQuery: '',
  };

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getKey = () => { try { return localStorage.getItem(KEY_STORAGE) || DEFAULT_KEY; } catch { return DEFAULT_KEY; } };
  const setKey = (k) => { try { localStorage.setItem(KEY_STORAGE, k); } catch { /* storage unavailable */ } };

  const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
  const toMin = (t) => { const [h, m] = hhmm(t).split(':').map(Number); return h * 60 + m; };
  const fromMin = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const endTime = (c) => fromMin(toMin(c.startTime) + (c.durationMinutes || 0));
  const titleCase = (d) => d ? d[0] + d.slice(1).toLowerCase() : '';
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const fmtHours = (min) => { const h = min / 60; return Number.isInteger(h) ? String(h) : h.toFixed(1); };
  const todayKey = () => DAYS[(new Date().getDay() + 6) % 7];
  const classId = (c) => c.fitnessClassId;

  function roomColor(roomId) {
    const i = state.rooms.findIndex((r) => r.roomId === roomId);
    return PALETTE[(i < 0 ? (roomId || 0) : i) % PALETTE.length];
  }
  function personColor(id) { return PALETTE[((id || 0) + 3) % PALETTE.length]; }

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
      method,
      headers: { 'X-API-Key': getKey(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (res.status === 401) { state.authError = true; updateKeyStatus(); }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    if (res.status !== 401) { state.authError = false; updateKeyStatus(); }
    return data;
  }

  function toast(msg, kind = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${kind === 'err' ? 'err' : ''}`;
    el.innerHTML = `${kind === 'err' ? ICON.alert : ICON.check}<div>${esc(msg)}</div>`;
    $('#toasts').append(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3800);
    setTimeout(() => el.remove(), 4200);
  }

  // Confirmation burst shown over the page after a class lands on the timetable.
  function celebrate(c) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const color = c.room ? roomColor(c.room.roomId) : PALETTE[0];
    const roomName = c.room?.name || state.rooms.find((r) => r.roomId === c.room?.roomId)?.name;
    const bits = Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 140 + Math.random() * 120;
      return `<i style="--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--rot:${Math.random() * 720 - 360}deg;--d:${Math.random() * 120}ms;background:${PALETTE[i % PALETTE.length]}${i % 3 ? '' : ';border-radius:50%'}"></i>`;
    }).join('');
    const el = document.createElement('div');
    el.className = 'celebrate';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="cel-bits">${bits}</div>
      <div class="cel-card" style="--c:${color}">
        <div class="cel-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <div class="cel-day">${DAY_SHORT[c.dayOfWeek] || ''}</div>
        <b>${esc(c.name)}</b>
        <span>${hhmm(c.startTime)}–${endTime(c)}${roomName ? ` · ${esc(roomName)}` : ''}</span>
      </div>`;
    document.body.append(el);
    setTimeout(() => el.classList.add('out'), 1700);
    setTimeout(() => el.remove(), 2100);
  }

  function updateKeyStatus() {
    const dot = $('#keyDot');
    dot.className = `dot ${state.authError ? 'bad' : 'ok'}`;
    $('#keyLabel').textContent = state.authError ? 'Invalid API key' : 'API key connected';
  }

  // ---------- data loading ----------
  async function loadCore() {
    const [rooms, instructors, schedule, busiest] = await Promise.all([
      api('/rooms?size=500&sort=name'),
      api('/instructors?size=500&sort=name'),
      api('/schedule?size=2000'),
      api('/reports/busiest-rooms'),
    ]);
    state.rooms = rooms.content || [];
    state.instructors = instructors.content || [];
    state.schedule = schedule.content || [];
    state.busiest = busiest || [];
    state.schedule.forEach((c) => state.classes.set(classId(c), c));
  }

  async function loadYear(year, force = false) {
    if (!force && state.loadedYears.has(year)) return;
    const list = await api(`/classes/year/${year}`);
    (list || []).forEach((c) => state.classes.set(classId(c), c));
    state.loadedYears.add(year);
  }

  const scheduledIds = () => new Set(state.schedule.map(classId));

  function classStatus(c) {
    if (scheduledIds().has(classId(c))) return { label: 'Scheduled', cls: 'ok' };
    if (c.room) return { label: 'Removed', cls: '' };
    return { label: 'Unscheduled', cls: 'warn' };
  }

  // ---------- router ----------
  const routes = { dashboard: renderDashboard, schedule: renderSchedule, classes: renderClasses, rooms: renderRooms, instructors: renderInstructors };

  async function route() {
    const name = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
    const fn = routes[name] || renderDashboard;
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
    const view = $('#view');
    view.innerHTML = loadingView();
    try {
      await loadCore();
      if (name === 'classes') await loadYear(state.classYear);
      fn(view);
    } catch (e) {
      view.innerHTML = errorView(e);
    }
  }

  function rerender() {
    const name = (location.hash.replace(/^#\/?/, '') || 'dashboard');
    (routes[name] || renderDashboard)($('#view'));
  }

  async function refresh() {
    await loadCore();
    rerender();
  }

  function loadingView() {
    return `<div class="page-head"><div><div class="skeleton" style="width:120px;height:14px;margin-bottom:10px"></div><div class="skeleton" style="width:260px;height:32px"></div></div></div>
      <div class="grid grid-kpi">${'<div class="card kpi"><div class="skeleton" style="height:64px"></div></div>'.repeat(4)}</div>`;
  }

  function errorView(e) {
    const auth = e.status === 401;
    return `<div class="page-head"><div><p class="eyebrow">Connection</p><h1>${auth ? 'API key required' : 'Can’t reach the API'}</h1>
      <p class="sub">${auth ? 'The server rejected the API key. Enter the key configured in <code>application.properties</code>.' : esc(e.message)}</p></div></div>
      <button class="btn" data-action="key">${ICON.alert} ${auth ? 'Set API key' : 'Check API key'}</button>
      <button class="btn ghost" data-action="retry">Retry</button>`;
  }

  // ---------- dashboard ----------
  function renderDashboard(view) {
    const totalMin = state.schedule.reduce((s, c) => s + (c.durationMinutes || 0), 0);
    const today = todayKey();
    const todays = state.schedule.filter((c) => c.dayOfWeek === today).sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    const maxMin = Math.max(1, ...state.busiest.map((r) => r.totalMinutes));

    const load = new Map();
    state.schedule.forEach((c) => { if (c.instructor) load.set(c.instructor.instructorId, (load.get(c.instructor.instructorId) || 0) + 1); });
    const topInstructors = state.instructors.map((i) => ({ ...i, n: load.get(i.instructorId) || 0 })).sort((a, b) => b.n - a.n).slice(0, 5);

    view.innerHTML = `
      ${authBanner()}
      <div class="page-head">
        <div><p class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>Studio overview</h1><p class="sub">Your weekly timetable at a glance.</p></div>
        <button class="btn" data-action="schedule-new">${ICON.plus} Schedule a class</button>
      </div>

      <div class="grid grid-kpi">
        ${kpi(ICON.cal, 'Scheduled classes', state.schedule.length)}
        ${kpi(ICON.clock, 'Weekly hours', fmtHours(totalMin), 'h')}
        ${kpi(ICON.room, 'Rooms', state.rooms.length)}
        ${kpi(ICON.user, 'Instructors', state.instructors.length)}
      </div>

      <div class="grid grid-2" style="margin-top:20px">
        <section class="card">
          <div class="card-head"><h2>Busiest rooms</h2><span class="meta">minutes booked per week</span></div>
          ${state.busiest.length ? `<div class="bars">${state.busiest.map((r) => `
            <div class="bar-row" style="--c:${roomColor(r.roomId)}">
              <span class="name" title="${esc(r.name)}">${esc(r.name)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(r.totalMinutes / maxMin) * 100}%"></div></div>
              <span class="val">${r.totalMinutes} min</span>
            </div>`).join('')}</div>` : empty(ICON.room, 'No rooms booked yet.')}
        </section>

        <section class="card">
          <div class="card-head"><h2>Today · ${titleCase(today)}</h2><a class="meta" href="#/schedule">Full week →</a></div>
          ${todays.length ? `<ul class="list agenda">${todays.map((c) => `
            <li style="--c:${roomColor(c.room?.roomId)}">
              <span class="time">${hhmm(c.startTime)}</span><span class="stripe"></span>
              <div class="grow"><div class="title">${esc(c.name)}</div>
              <div class="meta">${esc(c.room?.name)} · ${esc(c.instructor?.name)} · ${c.durationMinutes} min</div></div>
            </li>`).join('')}</ul>` : empty(ICON.cal, 'Nothing on the schedule today.')}
        </section>
      </div>

      <section class="card" style="margin-top:20px">
        <div class="card-head"><h2>Instructor load</h2><a class="meta" href="#/instructors">All instructors →</a></div>
        ${topInstructors.length ? `<ul class="list">${topInstructors.map((i) => `
          <li><span class="avatar" style="--c:${personColor(i.instructorId)}">${esc(initials(i.name))}</span>
          <div class="grow"><div class="title">${esc(i.name)}</div></div>
          <span class="badge ${i.n ? 'ok' : ''}">${i.n} class${i.n === 1 ? '' : 'es'} / week</span></li>`).join('')}</ul>` : empty(ICON.user, 'No instructors yet.')}
      </section>`;
  }

  const kpi = (icon, label, value, unit = '') =>
    `<div class="card kpi"><div class="kpi-label">${icon}${esc(label)}</div><div class="kpi-value">${esc(value)}${unit ? `<small>${unit}</small>` : ''}</div></div>`;
  const empty = (icon, text) => `<div class="empty">${icon}<div>${esc(text)}</div></div>`;
  const authBanner = () => state.authError ? `<div class="banner">${ICON.alert} The API key was rejected. <button class="btn sm" data-action="key">Update key</button></div>` : '';

  // ---------- schedule ----------
  function renderSchedule(view) {
    const { room, instructor } = state.filters;
    const items = state.schedule.filter((c) =>
      (!room || String(c.room?.roomId) === room) && (!instructor || String(c.instructor?.instructorId) === instructor));

    let startH = 7, endH = 21;
    state.schedule.forEach((c) => {
      startH = Math.min(startH, Math.floor(toMin(c.startTime) / 60));
      endH = Math.max(endH, Math.ceil((toMin(c.startTime) + c.durationMinutes) / 60));
    });
    endH = Math.min(endH, 24);
    const hours = endH - startH;

    const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const today = todayKey();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const cols = DAYS.map((day, di) => {
      const dayItems = items.filter((c) => c.dayOfWeek === day);
      const laid = layoutLanes(dayItems);
      const showNow = day === today && nowMin >= startH * 60 && nowMin <= endH * 60;
      return `<div class="cal-col ${day === today ? 'today' : ''}" data-day="${day}" style="height:${hours * HOUR_PX}px">
        ${showNow ? `<div class="now-line" style="top:${((nowMin - startH * 60) / 60) * HOUR_PX}px"></div>` : ''}
        ${laid.map(({ c, lane, lanes }) => {
          const top = ((toMin(c.startTime) - startH * 60) / 60) * HOUR_PX;
          const h = Math.max(26, (c.durationMinutes / 60) * HOUR_PX - 2);
          const w = 100 / lanes;
          return `<button class="ev" data-id="${classId(c)}" style="--c:${roomColor(c.room?.roomId)};top:${top}px;height:${h}px;left:calc(${lane * w}% + 3px);right:auto;width:calc(${w}% - 6px)">
            <b>${esc(c.name)}</b><span>${hhmm(c.startTime)}–${endTime(c)}</span>${h > 50 ? `<span>${esc(c.room?.name)} · ${esc(c.instructor?.name)}</span>` : ''}
          </button>`;
        }).join('')}
      </div>`;
    }).join('');

    view.innerHTML = `
      ${authBanner()}
      <div class="page-head">
        <div><p class="eyebrow">Weekly timetable</p><h1>Schedule</h1><p class="sub">Click an empty slot to book it, or a class to see details.</p></div>
        <div class="toolbar">
          <select class="select" id="fRoom" aria-label="Filter by room"><option value="">All rooms</option>
            ${state.rooms.map((r) => `<option value="${r.roomId}" ${room === String(r.roomId) ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
          <select class="select" id="fInstr" aria-label="Filter by instructor"><option value="">All instructors</option>
            ${state.instructors.map((i) => `<option value="${i.instructorId}" ${instructor === String(i.instructorId) ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select>
          <button class="btn" data-action="schedule-new">${ICON.plus} Schedule</button>
        </div>
      </div>
      <section class="card">
        <div class="cal">
          <div class="cal-grid" style="--hour:${HOUR_PX}px">
            <div class="cal-head"></div>
            ${DAYS.map((d, i) => { const dt = new Date(monday); dt.setDate(monday.getDate() + i);
              return `<div class="cal-head ${d === today ? 'today' : ''}"><div class="d">${DAY_SHORT[d]}</div><div class="n">${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div></div>`; }).join('')}
            <div class="cal-times" style="height:${hours * HOUR_PX}px">
              ${Array.from({ length: hours }, (_, i) => i ? `<span style="top:${i * HOUR_PX}px">${fromMin((startH + i) * 60)}</span>` : '').join('')}
            </div>
            ${cols}
          </div>
        </div>
        ${state.rooms.length ? `<div class="legend">${state.rooms.map((r) => `<span style="--c:${roomColor(r.roomId)}"><i></i>${esc(r.name)}</span>`).join('')}</div>` : ''}
      </section>`;

    $('#fRoom').onchange = (e) => { state.filters.room = e.target.value; renderSchedule(view); };
    $('#fInstr').onchange = (e) => { state.filters.instructor = e.target.value; renderSchedule(view); };
    view.querySelectorAll('.cal-col').forEach((col) => {
      col.addEventListener('click', (e) => {
        if (e.target.closest('.ev')) return;
        const y = e.clientY - col.getBoundingClientRect().top;
        const min = startH * 60 + Math.floor((y / HOUR_PX) * 2) * 30;
        openScheduleModal({ dayOfWeek: col.dataset.day, startTime: fromMin(min) });
      });
    });
  }

  // Side-by-side layout for overlapping classes on the same day.
  function layoutLanes(items) {
    const sorted = [...items].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    const out = [];
    let cluster = [], laneEnds = [], clusterEnd = -1;
    const flush = () => { cluster.forEach((x) => { x.lanes = laneEnds.length; out.push(x); }); cluster = []; laneEnds = []; };
    sorted.forEach((c) => {
      const s = toMin(c.startTime), e = s + c.durationMinutes;
      if (s >= clusterEnd) flush();
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(e); } else laneEnds[lane] = e;
      cluster.push({ c, lane });
      clusterEnd = Math.max(clusterEnd, e);
    });
    flush();
    return out;
  }

  // ---------- classes ----------
  function renderClasses(view) {
    const q = state.classQuery.toLowerCase();
    const list = [...state.classes.values()]
      .filter((c) => c.year === state.classYear && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name) || classId(a) - classId(b));
    const years = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

    view.innerHTML = `
      ${authBanner()}
      <div class="page-head">
        <div><p class="eyebrow">Catalogue</p><h1>Classes</h1><p class="sub">Create classes, then place them on the weekly timetable.</p></div>
      </div>
      <div class="grid grid-side">
        <section class="card">
          <div class="card-head">
            <div class="seg" id="yearSeg">${years.map((y) => `<button type="button" data-year="${y}" class="${y === state.classYear ? 'on' : ''}">${y}</button>`).join('')}</div>
            <input class="input" id="classSearch" placeholder="Search classes…" value="${esc(state.classQuery)}" style="max-width:220px">
          </div>
          ${list.length ? `<ul class="list" style="margin-top:8px">${list.map((c) => { const st = classStatus(c); return `
            <li>
              <span class="avatar square" style="--c:${c.room ? roomColor(c.room.roomId) : 'var(--muted)'}">${esc(initials(c.name))}</span>
              <div class="grow"><div class="title">${esc(c.name)} <span class="id">#${classId(c)}</span></div>
                <div class="meta">${c.dayOfWeek && c.room ? `${titleCase(c.dayOfWeek)} ${hhmm(c.startTime)}–${endTime(c)} · ${esc(c.room.name)} · ${esc(c.instructor?.name)}` : 'Not on the timetable yet'}</div></div>
              <span class="badge ${st.cls}">${st.label}</span>
              <button class="btn ghost sm" data-action="schedule-class" data-id="${classId(c)}">${st.label === 'Scheduled' ? 'Reschedule' : 'Schedule'}</button>
            </li>`; }).join('')}</ul>` : empty(ICON.dumbbell, q ? 'No classes match your search.' : `No classes for ${state.classYear} yet.`)}
        </section>

        <section class="card card-pad">
          <h2 style="margin-bottom:16px">New class</h2>
          <form class="form" id="classForm">
            <div class="field"><label for="cName">Name</label><input class="input" id="cName" name="name" required placeholder="e.g. Morning Yoga"></div>
            <div class="field"><label for="cYear">Year</label><input class="input" id="cYear" name="year" type="number" min="2000" max="2100" required value="${state.classYear}"></div>
            <label class="hint" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="thenSchedule" checked> Schedule it right after creating</label>
            <button class="btn" type="submit">${ICON.plus} Create class</button>
          </form>
        </section>
      </div>`;

    $('#yearSeg').onclick = async (e) => {
      const y = Number(e.target.dataset.year);
      if (!y) return;
      state.classYear = y;
      try { await loadYear(y); } catch (err) { toast(err.message, 'err'); }
      renderClasses(view);
    };
    $('#classSearch').oninput = (e) => {
      state.classQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderClasses(view);
      const s = $('#classSearch'); s.focus(); s.setSelectionRange(pos, pos);
    };
    $('#classForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const created = await api('/classes', { method: 'POST', body: { name: f.get('name').trim(), year: Number(f.get('year')) } });
        state.classes.set(classId(created), created);
        toast(`Created “${created.name}”`);
        state.classYear = created.year;
        renderClasses(view);
        if (f.get('thenSchedule')) openScheduleModal({ classId: classId(created) });
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    };
  }

  // ---------- rooms ----------
  function renderRooms(view) {
    const minutes = new Map(state.busiest.map((r) => [r.roomId, r.totalMinutes]));
    const counts = new Map();
    state.schedule.forEach((c) => c.room && counts.set(c.room.roomId, (counts.get(c.room.roomId) || 0) + 1));

    view.innerHTML = `
      ${authBanner()}
      <div class="page-head"><div><p class="eyebrow">Spaces</p><h1>Rooms</h1><p class="sub">${state.rooms.length} room${state.rooms.length === 1 ? '' : 's'} available for booking.</p></div></div>
      <div class="grid grid-side">
        <section class="card">
          ${state.rooms.length ? `<ul class="list">${state.rooms.map((r) => { const n = counts.get(r.roomId) || 0; const m = minutes.get(r.roomId) || 0; return `
            <li><span class="avatar square" style="--c:${roomColor(r.roomId)}">${esc(initials(r.name))}</span>
              <div class="grow"><div class="title">${esc(r.name)} <span class="id">#${r.roomId}</span></div>
              <div class="meta">${n} class${n === 1 ? '' : 'es'} · ${fmtHours(m)} h booked per week</div></div>
              <span class="badge ${n ? 'ok' : ''}">${n ? 'In use' : 'Free'}</span></li>`; }).join('')}</ul>` : empty(ICON.room, 'No rooms yet. Add your first one.')}
        </section>
        ${createCard('roomForm', 'New room', 'Room name', 'e.g. Studio A')}
      </div>`;

    bindCreate('#roomForm', '/rooms', 'Room');
  }

  // ---------- instructors ----------
  function renderInstructors(view) {
    const byId = new Map();
    state.schedule.forEach((c) => {
      if (!c.instructor) return;
      const arr = byId.get(c.instructor.instructorId) || [];
      arr.push(c);
      byId.set(c.instructor.instructorId, arr);
    });

    view.innerHTML = `
      ${authBanner()}
      <div class="page-head"><div><p class="eyebrow">Team</p><h1>Instructors</h1><p class="sub">${state.instructors.length} instructor${state.instructors.length === 1 ? '' : 's'} on the roster.</p></div></div>
      <div class="grid grid-side">
        <section class="card">
          ${state.instructors.length ? `<ul class="list">${state.instructors.map((i) => { const cls = byId.get(i.instructorId) || []; const mins = cls.reduce((s, c) => s + c.durationMinutes, 0); return `
            <li><span class="avatar" style="--c:${personColor(i.instructorId)}">${esc(initials(i.name))}</span>
              <div class="grow"><div class="title">${esc(i.name)} <span class="id">#${i.instructorId}</span></div>
              <div class="meta">${cls.length ? cls.slice(0, 3).map((c) => `${esc(c.name)} (${DAY_SHORT[c.dayOfWeek]} ${hhmm(c.startTime)})`).join(', ') + (cls.length > 3 ? ` +${cls.length - 3} more` : '') : 'No classes assigned'}</div></div>
              <span class="badge ${cls.length ? 'ok' : ''}">${fmtHours(mins)} h / week</span></li>`; }).join('')}</ul>` : empty(ICON.user, 'No instructors yet. Add your first one.')}
        </section>
        ${createCard('instrForm', 'New instructor', 'Full name', 'e.g. Ana Petrova')}
      </div>`;

    bindCreate('#instrForm', '/instructors', 'Instructor');
  }

  const createCard = (id, title, label, ph) => `
    <section class="card card-pad"><h2 style="margin-bottom:16px">${title}</h2>
      <form class="form" id="${id}">
        <div class="field"><label for="${id}Name">${label}</label><input class="input" id="${id}Name" name="name" required minlength="2" maxlength="50" placeholder="${ph}"></div>
        <button class="btn" type="submit">${ICON.plus} Add</button>
      </form></section>`;

  function bindCreate(sel, path, noun) {
    $(sel).onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const created = await api(path, { method: 'POST', body: { name: e.target.name.value.trim() } });
        toast(`${noun} “${created.name}” added`);
        await refresh();
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    };
  }

  // ---------- modals ----------
  const modal = $('#modal');
  const openModal = (html) => { modal.innerHTML = html; if (!modal.open) modal.showModal(); };
  const closeModal = () => modal.close();
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });

  async function openScheduleModal(preset = {}) {
    if (!state.rooms.length || !state.instructors.length) {
      openModal(`<div class="modal-body"><h2>Almost there</h2><p class="sub">You need at least one room and one instructor before scheduling a class.</p></div>
        <div class="modal-foot"><button class="btn ghost" data-close>Close</button>
        <a class="btn" href="#/${state.rooms.length ? 'instructors' : 'rooms'}" data-close>Add ${state.rooms.length ? 'an instructor' : 'a room'}</a></div>`);
      return;
    }
    try { await loadYear(THIS_YEAR); } catch { /* list just stays shorter */ }

    const existing = preset.classId ? state.classes.get(preset.classId) : null;
    const v = {
      classId: preset.classId ?? '',
      dayOfWeek: preset.dayOfWeek || existing?.dayOfWeek || todayKey(),
      startTime: preset.startTime || hhmm(existing?.startTime) || '09:00',
      durationMinutes: existing?.durationMinutes || 60,
      roomId: existing?.room?.roomId ?? (state.filters.room ? Number(state.filters.room) : state.rooms[0].roomId),
      instructorId: existing?.instructor?.instructorId ?? (state.filters.instructor ? Number(state.filters.instructor) : state.instructors[0].instructorId),
    };
    const unscheduledFirst = [...state.classes.values()].sort((a, b) =>
      (scheduledIds().has(classId(a)) - scheduledIds().has(classId(b))) || a.name.localeCompare(b.name));

    openModal(`
      <form id="schedForm">
        <div class="modal-body">
          <p class="eyebrow">Timetable</p><h2 style="font-size:20px">${existing && scheduledIds().has(classId(existing)) ? 'Reschedule class' : 'Schedule a class'}</h2>
          <div class="form" style="margin-top:18px">
            <div class="field"><label for="sClass">Class</label>
              <select class="select" id="sClass" name="classId">
                <option value="new" ${v.classId === '' ? 'selected' : ''}>+ New class…</option>
                ${unscheduledFirst.map((c) => `<option value="${classId(c)}" ${classId(c) === v.classId ? 'selected' : ''}>${esc(c.name)} · ${c.year} · #${classId(c)}${scheduledIds().has(classId(c)) ? ' (scheduled)' : ''}</option>`).join('')}
              </select></div>
            <div class="form-row" id="newClassFields" ${v.classId === '' ? '' : 'hidden'}>
              <div class="field"><label for="sName">New class name</label><input class="input" id="sName" name="name" placeholder="e.g. HIIT Express"></div>
              <div class="field"><label for="sYear">Year</label><input class="input" id="sYear" name="year" type="number" value="${THIS_YEAR}"></div>
            </div>
            <div class="form-row">
              <div class="field"><label for="sDay">Day</label><select class="select" id="sDay" name="dayOfWeek">
                ${DAYS.map((d) => `<option value="${d}" ${d === v.dayOfWeek ? 'selected' : ''}>${titleCase(d)}</option>`).join('')}</select></div>
              <div class="field"><label for="sStart">Start time</label><input class="input" id="sStart" name="startTime" type="time" step="300" required value="${v.startTime}"></div>
            </div>
            <div class="field"><label>Duration</label>
              <div class="seg" id="durSeg">${[30, 45, 60, 75, 90].map((m) => `<button type="button" data-min="${m}" class="${m === v.durationMinutes ? 'on' : ''}">${m} min</button>`).join('')}</div>
              <input type="hidden" name="durationMinutes" value="${v.durationMinutes}"></div>
            <div class="form-row">
              <div class="field"><label for="sRoom">Room</label><select class="select" id="sRoom" name="roomId">
                ${state.rooms.map((r) => `<option value="${r.roomId}" ${r.roomId === v.roomId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
              <div class="field"><label for="sInstr">Instructor</label><select class="select" id="sInstr" name="instructorId">
                ${state.instructors.map((i) => `<option value="${i.instructorId}" ${i.instructorId === v.instructorId ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select></div>
            </div>
            <div class="hint" id="conflictHint"></div>
          </div>
        </div>
        <div class="modal-foot"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">${ICON.check} Save to timetable</button></div>
      </form>`);

    const form = $('#schedForm');
    const checkConflict = () => {
      const f = new FormData(form);
      const clash = state.schedule.find((c) => c.room?.roomId === Number(f.get('roomId')) && c.dayOfWeek === f.get('dayOfWeek')
        && hhmm(c.startTime) === f.get('startTime') && String(classId(c)) !== f.get('classId'));
      $('#conflictHint').innerHTML = clash ? `<span style="color:var(--danger)">⚠ ${esc(clash.name)} already starts in this room at that time.</span>` : '';
    };
    form.addEventListener('change', checkConflict);
    checkConflict();
    $('#sClass').onchange = (e) => { $('#newClassFields').hidden = e.target.value !== 'new'; };
    $('#durSeg').onclick = (e) => {
      const m = e.target.dataset.min; if (!m) return;
      form.durationMinutes.value = m;
      $('#durSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target));
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        let id = f.get('classId');
        if (id === 'new') {
          const name = (f.get('name') || '').trim();
          if (!name) throw new Error('Give the new class a name.');
          const created = await api('/classes', { method: 'POST', body: { name, year: Number(f.get('year')) || THIS_YEAR } });
          state.classes.set(classId(created), created);
          id = classId(created);
        }
        const saved = await api(`/classes/${id}/schedule`, {
          method: 'POST',
          body: {
            dayOfWeek: f.get('dayOfWeek'),
            startTime: f.get('startTime'),
            durationMinutes: Number(f.get('durationMinutes')),
            room: { roomId: Number(f.get('roomId')) },
            instructor: { instructorId: Number(f.get('instructorId')) },
          },
        });
        state.classes.set(classId(saved), saved);
        closeModal();
        celebrate(saved);
        toast(`${saved.name} · ${titleCase(saved.dayOfWeek)} ${hhmm(saved.startTime)}`);
        await refresh();
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    };
  }

  function openClassDetails(id) {
    const c = state.schedule.find((x) => classId(x) === id);
    if (!c) return;
    openModal(`
      <div class="modal-body" style="--c:${roomColor(c.room?.roomId)}">
        <span class="badge" style="background:color-mix(in srgb, var(--c) 16%, transparent);color:var(--c)">${esc(c.room?.name)}</span>
        <h2 style="font-size:22px;margin-top:10px">${esc(c.name)}</h2>
        <dl class="detail">
          <dt>When</dt><dd>${titleCase(c.dayOfWeek)}, ${hhmm(c.startTime)}–${endTime(c)}</dd>
          <dt>Duration</dt><dd>${c.durationMinutes} minutes</dd>
          <dt>Instructor</dt><dd>${esc(c.instructor?.name)}</dd>
          <dt>Year</dt><dd>${c.year || '—'}</dd>
          <dt>Class ID</dt><dd class="id">#${classId(c)}</dd>
        </dl>
      </div>
      <div class="modal-foot">
        <button class="btn ghost" data-action="remove-class" data-id="${classId(c)}" style="color:var(--danger);margin-right:auto">Remove</button>
        <button class="btn ghost" data-close>Close</button>
        <button class="btn" data-action="schedule-class" data-id="${classId(c)}">Reschedule</button>
      </div>`);
  }

  function confirmRemove(id) {
    const c = state.classes.get(id);
    openModal(`
      <div class="modal-body"><h2 style="font-size:20px">Remove from timetable?</h2>
        <p class="sub">“${esc(c?.name)}” will no longer appear on the schedule. This is a soft delete, so the record stays in the database.</p></div>
      <div class="modal-foot"><button class="btn ghost" data-close>Keep it</button><button class="btn danger" data-action="remove-confirm" data-id="${id}">Remove</button></div>`);
  }

  function openKeyModal() {
    openModal(`
      <form id="keyForm">
        <div class="modal-body"><p class="eyebrow">Connection</p><h2 style="font-size:20px">API key</h2>
          <p class="sub">Sent as the <code>X-API-Key</code> header on every request. Stored only in this browser.</p>
          <div class="field" style="margin-top:16px"><label for="kInput">Key</label><input class="input" id="kInput" name="key" value="${esc(getKey())}" autocomplete="off" spellcheck="false" style="font-family:var(--mono)"></div>
        </div>
        <div class="modal-foot"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">Save &amp; test</button></div>
      </form>`);
    $('#keyForm').onsubmit = async (e) => {
      e.preventDefault();
      setKey(e.target.key.value.trim());
      try { await api('/rooms?size=1'); toast('Connected to the API'); closeModal(); route(); }
      catch (err) { toast(err.status === 401 ? 'That key was rejected' : err.message, 'err'); }
    };
  }

  // ---------- global actions ----------
  document.addEventListener('click', async (e) => {
    const ev = e.target.closest('.ev');
    if (ev) { openClassDetails(Number(ev.dataset.id)); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const id = Number(a.dataset.id);
    switch (a.dataset.action) {
      case 'schedule-new': openScheduleModal(); break;
      case 'schedule-class': openScheduleModal({ classId: id }); break;
      case 'remove-class': confirmRemove(id); break;
      case 'remove-confirm':
        a.disabled = true;
        try {
          await api(`/schedule/${id}`, { method: 'DELETE' });
          closeModal();
          toast('Removed from the timetable');
          await refresh();
        } catch (err) { toast(err.message, 'err'); a.disabled = false; }
        break;
      case 'key': openKeyModal(); break;
      case 'retry': route(); break;
    }
  });
  $('#keyBtn').onclick = openKeyModal;

  window.addEventListener('hashchange', route);
  route();
})();
