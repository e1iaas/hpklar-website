/* HP Klar – gratis verktyg för högskoleprovet. Ren logik överst (testas i Node), DOM-bindning längst ner. */
(function (root) {
  'use strict';
  const pad = n => (n < 10 ? '0' : '') + n;
  const sv = (x, d) => x.toFixed(d).replace('.', ',');
  const WD = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  // Delprov i den ordning de ligger i ett provpass. m = UHR:s rekommenderade provtid (minuter).
  const DP = [
    { c: 'ORD', n: 'Ordförståelse', p: 'v', q: 10, m: 3, s: 'ord-hogskoleprovet' },
    { c: 'LÄS', n: 'Läsförståelse', p: 'v', q: 10, m: 22, s: 'las-hogskoleprovet' },
    { c: 'MEK', n: 'Meningskomplettering', p: 'v', q: 10, m: 8, s: 'mek-hogskoleprovet' },
    { c: 'ELF', n: 'Engelsk läsförståelse', p: 'v', q: 10, m: 22, s: 'elf-hogskoleprovet' },
    { c: 'XYZ', n: 'Matematisk problemlösning', p: 'k', q: 12, m: 12, s: 'xyz-hogskoleprovet' },
    { c: 'KVA', n: 'Kvantitativa jämförelser', p: 'k', q: 10, m: 10, s: 'kva-hogskoleprovet' },
    { c: 'NOG', n: 'Kvantitativa resonemang', p: 'k', q: 6, m: 10, s: 'nog-hogskoleprovet' },
    { c: 'DTK', n: 'Diagram, tabeller och kartor', p: 'k', q: 12, m: 23, s: 'dtk-hogskoleprovet' },
  ];
  const run = { v: 0, k: 0 };
  DP.forEach(d => { d.q1 = run[d.p] + 1; run[d.p] += d.q; d.q2 = run[d.p]; });

  // ---------- poäng (UHR:s normeringstabeller) ----------
  const parseRaw = s => {
    if (typeof s === 'string' && !/^\s*\d{1,2}\s*$/.test(s)) return null;
    const x = Number(s);
    return Number.isInteger(x) && x >= 0 && x <= 80 ? x : null;
  };
  // Resultatet är medelvärdet av de två normerade delpoängen (båda i steg om 0,1 => svaret blir en exakt multipel av 0,05).
  const result = (t, rv, rk) => Math.round(((t.v[rv] + t.k[rk]) / 2) * 100) / 100;
  // Andel (%) av deltagarna som nådde minst resultatet res (kräver fördelningen t.d; annars null).
  const atLeast = (t, res) => {
    if (!t.d) return null;
    let below = 0; for (let j = 0; j < Math.round(res * 20); j++) below += t.d[j];
    return Math.round((1 - below / t.n) * 1000) / 10;
  };
  const balanced = (t, target) => { for (let r = 0; r <= 80; r++) if (result(t, r, r) >= target - 1e-9) return r; return null; };
  const verbNeeded = (t, rk, target) => { for (let r = 0; r <= 80; r++) if (result(t, r, rk) >= target - 1e-9) return r; return null; };

  // ---------- pluggschema ----------
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  // Smooth weighted round robin: sprider ut svaga delprov jämnt i stället för att klumpa ihop dem.
  const wrr = items => {
    const cur = items.map(() => 0), total = items.reduce((a, b) => a + b.w, 0);
    return () => {
      let best = 0;
      items.forEach((it, i) => { cur[i] += it.w; if (cur[i] > cur[best]) best = i; });
      cur[best] -= total;
      return items[best].c;
    };
  };
  // o: { start, test (Date), days: [getDay-värden], minutes, weak: [koder] }
  function buildSchedule(o) {
    const n = Math.round((o.test - o.start) / 864e5);
    if (!(n >= 1)) return [];
    const next = wrr(DP.map(d => ({ c: d.c, w: o.weak.indexOf(d.c) >= 0 ? 3 : 1 })));
    const days = [];
    for (let i = 0; i < n; i++) {
      const d = addDays(o.start, i), left = n - i; // left = dagar kvar till provet
      if (left === 1) continue;                    // dagen före provet: vila
      if (o.days.indexOf(d.getDay()) < 0) continue;
      days.push({ d, left, wk: ymd(addDays(d, -((d.getDay() + 6) % 7))) });
    }
    // ett provpass på tid per vecka (veckans sista valda dag) om veckan har minst två pass och det inte är de tre sista dagarna
    const byWeek = {};
    days.forEach(x => (byWeek[x.wk] = byWeek[x.wk] || []).push(x));
    Object.keys(byWeek).forEach(k => { const g = byWeek[k], last = g[g.length - 1]; if (g.length >= 2 && last.left > 3) last.timed = true; });
    let alt = 0;
    return days.map(x => {
      const base = { key: ymd(x.d), date: x.d, left: x.left };
      if (x.left <= 3) return Object.assign(base, { type: 'rep', code: '', label: 'Repetera dina felsvar – inget nytt stoff', minutes: o.minutes });
      if (x.timed) { const verbal = alt++ % 2 === 0; return Object.assign(base, { type: 'timed', code: verbal ? 'V' : 'K', label: 'Provpass på tid – ' + (verbal ? 'verbal' : 'kvantitativ') + ' del (55 min)', minutes: 55 }); }
      const code = next(), dp = DP.filter(d => d.c === code)[0];
      return Object.assign(base, { type: 'dp', code, label: code + ' – ' + dp.n, minutes: o.minutes });
    });
  }
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fold = line => { const o = []; let i = 0; while (line.length - i > 60) { o.push(line.substr(i, 60)); i += 60; } o.push(line.substr(i)); return o.join('\r\n '); };
  const stamp = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  function buildICS(sessions, hour, minute, now) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HP Klar//Pluggschema//SV', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    sessions.forEach(s => {
      const st = new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate(), hour, minute);
      const en = new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate(), hour, minute + s.minutes);
      const url = s.type === 'dp' ? 'https://www.apphpklar.se/' + DP.filter(d => d.c === s.code)[0].s : 'https://www.apphpklar.se/studieplan-hogskoleprovet';
      L.push('BEGIN:VEVENT', 'UID:' + s.key + '-' + (s.code || s.type) + '@apphpklar.se', 'DTSTAMP:' + dtstamp,
        'DTSTART:' + stamp(st), 'DTEND:' + stamp(en), fold('SUMMARY:' + icsEsc('Högskoleprovet: ' + s.label)),
        fold('DESCRIPTION:' + icsEsc('Pluggschema från HP Klar. Tips: ' + url)), 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }

  // ---------- timer ----------
  const blocksFor = part => { let t = 0; return DP.filter(d => d.p === part).map(d => { const b = { c: d.c, n: d.n, q1: d.q1, q2: d.q2, m: d.m, from: t }; t += d.m * 60; return b; }); };
  const blockAt = (bl, sec) => { let t = 0; for (let i = 0; i < bl.length; i++) { const end = t + bl[i].m * 60; if (sec < end) return { i, left: end - sec }; t = end; } return { i: -1, left: 0 }; };
  const fmt = sec => { sec = Math.max(0, Math.ceil(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); };

  // ---------- nedräkning ----------
  const countdown = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; };

  // ---------- delprovsanalys ----------
  // vals: { ORD: antal rätt | null, ... }, perWeek: minuter per vecka. Svagare delprov får mer tid, men ingen får noll.
  function analyse(vals, perWeek) {
    const rows = DP.filter(d => vals[d.c] != null).map(d => { const pct = Math.round(vals[d.c] / d.q * 100); return { d, ok: vals[d.c], pct, w: (100 - pct) + 10 }; });
    const tw = rows.reduce((a, r) => a + r.w, 0);
    rows.forEach(r => { r.min = tw ? Math.round(perWeek * r.w / tw / 5) * 5 : 0; });
    return rows.sort((a, b) => a.pct - b.pct);
  }


  // ---------- repetitionsschema (utspridd repetition) ----------
  // Första avståndet följer Cepeda m.fl. (2008): optimalt avstånd växer med tiden till provet, ca 20–40 % av en veckas
  // fördröjning men ca 5–10 % av ett års. Vi interpolerar på log-skala mellan 30 % vid 7 dagar och 7,5 % vid 365 dagar.
  // Att därefter fördubbla avståndet är en vanlig tumregel, inte något den studien bevisat.
  const daysBetween = (a, b) => Math.round((b - a) / 864e5);
  const firstGap = T => Math.max(1, Math.round(2.1 * Math.pow(T / 7, 0.6494)));
  function spacedDates(learn, test) {
    const T = daysBetween(learn, test); if (T < 3) return [];
    const out = []; let t = 0, gap = Math.min(firstGap(T), Math.floor(T / 2));
    for (;;) { t += gap; if (t > T - 1) break; out.push({ date: addDays(learn, t), day: t, n: out.length + 1 }); gap *= 2; }
    const last = out.length ? out[out.length - 1].day : 0;
    if (T - 2 >= last + 2) out.push({ date: addDays(learn, T - 2), day: T - 2, n: out.length + 1 }); // sista repetitionen två dagar före provet
    return out;
  }

  // ---------- flashcards (Leitner, 5 lådor) ----------
  const BOX_DAYS = [1, 2, 4, 8, 16];
  const MAX_CARDS = 2000, MAX_LEN = 300;
  const cleanText = x => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '');
  function makeCard(f, b, today, id) {
    f = cleanText(f); b = cleanText(b);
    if (!f || !b || f.length > MAX_LEN || b.length > MAX_LEN) return null;
    return { id: id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7), f, b, box: 1, due: ymd(today) };
  }
  function review(card, correct, today) {
    const box = correct ? Math.min(5, card.box + 1) : 1;
    return Object.assign({}, card, { box, due: ymd(addDays(today, BOX_DAYS[box - 1])) });
  }
  const dueCards = (cards, today) => cards.filter(c => c.due <= ymd(today)).sort((a, b) => a.box - b.box || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  // Importerad data är opålitlig: validera allt, släng skräp, ta bort dubbletter och begränsa antalet.
  function importCards(json, existing, today) {
    let data; try { data = JSON.parse(json); } catch (e) { return { error: 'Filen är inte giltig JSON.' }; }
    if (!Array.isArray(data)) return { error: 'Förväntade en lista med kort.' };
    const seen = new Set(existing.map(c => c.f + '\u0001' + c.b)), cards = existing.slice(); let added = 0, skipped = 0;
    for (const x of data) {
      const c = x && typeof x === 'object' ? makeCard(x.f, x.b, today) : null;
      if (!c || seen.has(c.f + '\u0001' + c.b) || cards.length >= MAX_CARDS) { skipped++; continue; }
      const box = Number.isInteger(x.box) && x.box >= 1 && x.box <= 5 ? x.box : 1, due = typeof x.due === 'string' && /^\d{4}-\d\d-\d\d$/.test(x.due) ? x.due : c.due;
      cards.push(Object.assign(c, { box, due })); seen.add(c.f + '\u0001' + c.b); added++;
    }
    return { cards, added, skipped };
  }

  const api = { DP, parseRaw, result, atLeast, balanced, verbNeeded, ymd, addDays, buildSchedule, buildICS, blocksFor, blockAt, fmt, countdown, analyse, sv, spacedDates, firstGap, makeCard, review, dueCards, importCards, BOX_DAYS };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  root.HPTOOLS = api;
  if (typeof document === 'undefined') return;

  // =====================================================================
  // DOM
  // =====================================================================
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat läge */ } } };
  const TESTS = root.HPNORM || [];
  const fillTests = sel => { sel.innerHTML = TESTS.map((t, i) => '<option value="' + i + '">' + t.name + '</option>').join(''); };
  const dstr = d => WD[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  const localDate = v => { const p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const msg = (el, t) => { el.textContent = t; el.hidden = !t; };
  // Nästa provdag enligt UHR (anmälan 7–14 januari 2027). Förifylls bara så länge datumet ligger framåt i tiden.
  const NEXT_TEST = '2027-04-10';
  const dflt = () => (NEXT_TEST >= ymd(today()) ? NEXT_TEST : '');

  // ----- poängräknare -----
  const calc = $('[data-tool="calc"]');
  if (calc) {
    const sel = $('#ptest', calc), out = $('#out', calc), err = $('.formerr', calc);
    fillTests(sel);
    calc.addEventListener('submit', e => {
      e.preventDefault();
      const rv = parseRaw($('#rv', calc).value), rk = parseRaw($('#rk', calc).value);
      if (rv === null || rk === null) { msg(err, 'Fyll i heltal mellan 0 och 80 för båda delarna.'); out.hidden = true; return; }
      msg(err, '');
      const t = TESTS[+sel.value], res = result(t, rv, rk), avg = (t.mv + t.mk) / 2, al = atLeast(t, res);
      const cmp = TESTS.map(x => ({ n: x.name, r: result(x, rv, rk) }));
      const lo = Math.min.apply(null, cmp.map(c => c.r)), hi = Math.max.apply(null, cmp.map(c => c.r));
      out.innerHTML = '<p class="eyebrow">Ditt resultat</p><p class="score"><span>' + sv(res, 2) + '</span><small>av 2,00</small></p>' +
        '<dl class="facts tiles"><div><dt>Verbal del</dt><dd>' + rv + ' rätt → ' + sv(t.v[rv], 1) + '</dd></div><div><dt>Kvantitativ del</dt><dd>' + rk + ' rätt → ' + sv(t.k[rk], 1) + '</dd></div>' +
        (al !== null ? '<div><dt>Andel som nådde det</dt><dd>' + sv(al, 1) + ' %</dd></div>' : '<div><dt>Snitt vid provet</dt><dd>' + sv(avg, 2) + '</dd></div>') + '<div><dt>Totalt rätt</dt><dd>' + (rv + rk) + ' av 160</dd></div></dl>' +
        '<p>' + (res > avg + 0.025 ? 'Det är över' : res < avg - 0.025 ? 'Det är under' : 'Det är i nivå med') + ' medelresultatet vid <strong>' + t.name + '</strong> (' + sv(avg, 2) + ').' + (al !== null ? ' Ungefär <strong>' + sv(al, 1) + ' %</strong> av deltagarna nådde minst ditt resultat.' : '') + '</p>' +
        '<details><summary>Samma antal rätt på andra prov (visar hur normeringen skiljer)</summary><div class="a"><p>Med exakt samma antal rätt hade resultatet blivit mellan <strong>' + sv(lo, 2) + '</strong> och <strong>' + sv(hi, 2) + '</strong> beroende på provets svårighetsgrad. Räkna alltid med det prov du faktiskt gjorde.</p>' +
        '<div class="table-wrap"><table class="keep"><thead><tr><th scope="col">Prov</th><th scope="col">Resultat</th></tr></thead><tbody>' + cmp.map(c => '<tr><td>' + c.n + '</td><td>' + sv(c.r, 2) + '</td></tr>').join('') + '</tbody></table></div></div></details>' +
        '<p class="note">Källa: UHR:s normeringstabeller för provet. Gäller bara om du räknar mot samma prov som du gjorde.</p>';
      out.hidden = false; out.focus({ preventScroll: true });
    });
  }

  // ----- hur många rätt krävs -----
  const need = $('[data-tool="need"]');
  if (need) {
    const sel = $('#ptest', need), tg = $('#target', need), out = $('#out', need);
    fillTests(sel);
    tg.innerHTML = ''; for (let x = 50; x <= 200; x += 5) tg.innerHTML += '<option value="' + x / 100 + '"' + (x === 120 ? ' selected' : '') + '>' + sv(x / 100, 2) + '</option>';
    need.addEventListener('submit', e => {
      e.preventDefault();
      const t = TESTS[+sel.value], T = +tg.value, b = balanced(t, T);
      let rows = '';
      for (let rk = 20; rk <= 80; rk += 5) { const rv = verbNeeded(t, rk, T); if (rv !== null) rows += '<tr><td>' + rk + '</td><td>' + rv + '</td><td>' + (rk + rv) + '</td></tr>'; }
      out.innerHTML = b === null ? '<p>Resultatet ' + sv(T, 2) + ' gick inte att nå vid detta prov.</p>' :
        '<p class="eyebrow">Så många rätt krävdes för ' + sv(T, 2) + '</p><p class="score"><span>' + b + '</span><small>rätt per del</small></p>' +
        '<p>Med lika många rätt i den verbala och den kvantitativa delen krävdes <strong>' + b + ' av 80</strong> i båda, alltså <strong>' + 2 * b + ' av 160</strong> totalt, vid <strong>' + t.name + '</strong>. Är du starkare i den ena delen kan du klara dig med färre rätt i den andra:</p>' +
        '<div class="table-wrap"><table class="keep"><thead><tr><th scope="col">Rätt i kvantitativ del</th><th scope="col">Rätt som krävs i verbal del</th><th scope="col">Totalt</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="note">Källa: UHR:s normeringstabeller för provet. Normeringen skiljer mellan prov, så siffrorna är bara en vägledning.</p>';
      out.hidden = false; out.focus({ preventScroll: true });
    });
  }

  // ----- pluggschema -----
  const sch = $('[data-tool="sched"]');
  if (sch) {
    const out = $('#sout'), err = $('.formerr', sch), sd = $('#sstart', sch), td = $('#stest', sch);
    const t0 = today(); sd.value = ymd(t0); sd.min = ymd(t0); td.min = ymd(addDays(t0, 2));
    td.value = store.get('hpk_testdate') || dflt();
    let cur = null;
    const done = () => { try { return JSON.parse(store.get('hpk_done') || '{}'); } catch (e) { return {}; } };
    const render = () => {
      const d = done(), tot = cur.sessions.reduce((a, s) => a + s.minutes, 0), timed = cur.sessions.filter(s => s.type === 'timed').length;
      out.innerHTML = '<p class="eyebrow">Ditt pluggschema</p><p class="score"><span>' + cur.sessions.length + '</span><small>pass fram till provet</small></p>' +
        '<dl class="facts tiles"><div><dt>Total tid</dt><dd>' + sv(tot / 60, 1) + ' timmar</dd></div><div><dt>Provpass på tid</dt><dd>' + timed + '</dd></div><div><dt>Provdatum</dt><dd>' + dstr(cur.test) + '</dd></div><div><dt>Dagen före</dt><dd>Vila</dd></div></dl>' +
        '<div class="table-wrap"><table class="keep sched"><thead><tr><th scope="col">Klar</th><th scope="col">Dag</th><th scope="col">Pass</th></tr></thead><tbody>' +
        cur.sessions.map(s => { const a = cur.hh + ':' + pad(cur.mm); const dp = DP.filter(x => x.c === s.code)[0];
          return '<tr class="' + (s.type === 'timed' ? 'pass' : s.type === 'rep' ? 'rest' : '') + '"><td><input type="checkbox" data-k="' + s.key + '" aria-label="Klar ' + dstr(s.date) + '"' + (d[s.key] ? ' checked' : '') + '></td><td>' + dstr(s.date) + '<br><small class="nw">' + a + ' · ' + s.minutes + ' min</small></td><td>' + (dp ? '<a href="/' + dp.s + '">' + s.label + '</a>' : s.label) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="btnrow noprint"><button type="button" class="btn" id="dl">Ladda ner kalenderfil (.ics)</button><button type="button" class="btn ghost" id="pr">Skriv ut</button><button type="button" class="btn ghost" id="rs">Nollställ avbockningar</button></div>' +
        '<p class="note">Kalenderfilen fungerar i Apple Kalender, Google Kalender och Outlook. Inget skickas eller sparas hos oss; avbockningar sparas bara i din webbläsare.</p>';
      out.hidden = false;
    };
    sch.addEventListener('submit', e => {
      e.preventDefault();
      if (!td.value) { msg(err, 'Ange ditt provdatum.'); return; }
      const start = localDate(sd.value), test = localDate(td.value), days = $$('input[name="wd"]:checked', sch).map(i => +i.value);
      if (!(test > start)) { msg(err, 'Provdatumet måste ligga efter startdatumet.'); return; }
      if (!days.length) { msg(err, 'Välj minst en dag i veckan.'); return; }
      msg(err, ''); store.set('hpk_testdate', td.value);
      const tm = $('#stime', sch).value.split(':'), minutes = +$('#smin', sch).value;
      const sessions = buildSchedule({ start, test, days, minutes, weak: $$('input[name="delprov"]:checked', sch).map(i => i.value) });
      if (!sessions.length) { msg(err, 'Inga pass ryms mellan dagens datum och provet. Välj fler dagar eller ett senare provdatum.'); return; }
      cur = { sessions, test, hh: pad(+tm[0] || 18), mm: +tm[1] || 0 };
      render(); out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    out.addEventListener('click', e => {
      if (e.target.id === 'pr') window.print();
      if (e.target.id === 'rs') { store.set('hpk_done', '{}'); render(); }
      if (e.target.id === 'dl') {
        const blob = new Blob([buildICS(cur.sessions, +cur.hh, cur.mm, new Date())], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'pluggschema-hogskoleprovet.ics'; document.body.appendChild(a); a.click(); a.remove();
      }
    });
    out.addEventListener('change', e => { const k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k) { const d = done(); if (e.target.checked) d[k] = 1; else delete d[k]; store.set('hpk_done', JSON.stringify(d)); } });
  }

  // ----- timer -----
  const tm = $('[data-tool="timer"]');
  if (tm) {
    const big = $('#tbig', tm), sub = $('#tsub', tm), list = $('#tblocks', tm), go = $('#tgo', tm), part = $('#tpart', tm), follow = $('#tfollow', tm), skip = $('#tskip', tm);
    let bl, total, elapsedBefore = 0, startedAt = 0, timer = null, lastBlock = -2, wake = null;
    const elapsed = () => elapsedBefore + (startedAt ? (Date.now() - startedAt) / 1000 : 0);
    const beep = long => { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(.2, c.currentTime); o.start(); o.stop(c.currentTime + (long ? 1.2 : .25)); } catch (e) { /* ljud ej tillgängligt */ } };
    const setup = () => { bl = blocksFor(part.value); total = 55 * 60; elapsedBefore = 0; startedAt = 0; lastBlock = -2; clearInterval(timer); go.textContent = 'Starta'; draw(); };
    const draw = () => {
      const e = Math.min(elapsed(), total), left = total - e, b = blockAt(bl, e);
      big.textContent = follow.checked && b.i >= 0 ? fmt(b.left) : fmt(left);
      sub.textContent = left <= 0 ? 'Tiden är slut – lämna in svaret.' : (follow.checked && b.i >= 0 ? bl[b.i].c + ' (uppgift ' + bl[b.i].q1 + '–' + bl[b.i].q2 + ') · totalt kvar ' + fmt(left) : 'Totalt kvar');
      list.hidden = !follow.checked;
      list.innerHTML = bl.map((x, i) => '<li class="' + (i === b.i ? 'now' : (b.i === -1 || i < b.i) ? 'done' : '') + '"><span>' + x.c + ' <small>uppgift ' + x.q1 + '–' + x.q2 + '</small></span><span>' + x.m + ' min</span></li>').join('');
      if (b.i !== lastBlock) { if (lastBlock !== -2) beep(left <= 0); lastBlock = b.i; }
      if (left <= 0) { clearInterval(timer); startedAt = 0; elapsedBefore = total; go.textContent = 'Nollställ'; }
    };
    const rel = () => { try { if (wake) wake.release(); } catch (e) { /* inget */ } wake = null; };
    go.addEventListener('click', () => {
      if (go.textContent === 'Nollställ') { setup(); return; }
      if (startedAt) { elapsedBefore = elapsed(); startedAt = 0; clearInterval(timer); go.textContent = 'Fortsätt'; rel(); return; }
      startedAt = Date.now(); go.textContent = 'Pausa'; timer = setInterval(draw, 250); draw();
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }, () => { /* nekad */ }); } catch (e) { /* stöds ej */ }
    });
    skip.addEventListener('click', () => { const b = blockAt(bl, elapsed()); if (b.i >= 0 && b.i < bl.length - 1) { elapsedBefore = bl[b.i + 1].from; startedAt = startedAt ? Date.now() : 0; draw(); } });
    part.addEventListener('change', setup); follow.addEventListener('change', draw);
    $('#treset', tm).addEventListener('click', setup);
    setup();
  }

  // ----- nedräkning -----
  const cd = $('[data-tool="count"]');
  if (cd) {
    const inp = $('#cdate', cd), out = $('#cout', cd), err = $('.formerr', cd);
    inp.value = store.get('hpk_testdate') || dflt();
    inp.min = ymd(today());
    let iv = null;
    const tick = () => {
      const target = localDate(inp.value); target.setHours(9, 0, 0, 0); // provpass 1 börjar 09.00 enligt UHR:s schema
      const c = countdown(target - new Date()), days = Math.max(0, Math.round((localDate(inp.value) - today()) / 864e5));
      out.innerHTML = '<div class="cd"><div><b>' + c.d + '</b><span>dagar</span></div><div><b>' + pad(c.h) + '</b><span>timmar</span></div><div><b>' + pad(c.m) + '</b><span>minuter</span></div><div><b>' + pad(c.s) + '</b><span>sekunder</span></div></div>' +
        '<p class="res-msg">' + (target <= new Date() ? 'Provdagen är här eller redan förbi.' : days + ' ' + (days === 1 ? 'dag' : 'dagar') + ' kvar, ungefär ' + sv(days / 7, 1) + ' veckor. Provpass 1 börjar 09.00 enligt UHR:s schema.') + '</p>' +
        '<p><a class="btn" href="/pluggschema-hogskoleprovet">Gör ett pluggschema</a> <a class="btn ghost" href="/studieplan-hogskoleprovet">Skapa studieplan</a></p>';
      out.hidden = false;
    };
    cd.addEventListener('submit', e => { e.preventDefault(); if (!inp.value) { msg(err, 'Ange ett provdatum.'); return; } msg(err, ''); store.set('hpk_testdate', inp.value); clearInterval(iv); tick(); iv = setInterval(tick, 1000); });
    if (inp.value) { tick(); iv = setInterval(tick, 1000); }
  }

  // ----- delprovsanalys -----
  const an = $('[data-tool="analys"]');
  if (an) {
    const out = $('#aout', an), err = $('.formerr', an);
    an.addEventListener('submit', e => {
      e.preventDefault();
      const vals = {}; let bad = false;
      DP.forEach(d => { const v = $('#a-' + d.c, an).value.trim(); if (v === '') return; const x = Number(v); if (!Number.isInteger(x) || x < 0 || x > d.q) bad = true; else vals[d.c] = x; });
      const hrs = Number($('#a-h', an).value);
      if (bad) { msg(err, 'Antal rätt måste vara ett heltal mellan 0 och delprovets maxpoäng.'); out.hidden = true; return; }
      if (!Object.keys(vals).length) { msg(err, 'Fyll i minst ett delprov.'); out.hidden = true; return; }
      if (!(hrs > 0 && hrs <= 40)) { msg(err, 'Ange hur många timmar per vecka du kan plugga (1–40).'); out.hidden = true; return; }
      msg(err, '');
      const rows = analyse(vals, hrs * 60);
      out.innerHTML = '<p class="eyebrow">Din analys</p><p class="res-msg">Svagast först. Tiden är fördelad så att svagare delprov får mer, men inget delprov nollas.</p><ul class="bars">' +
        rows.map(r => '<li><strong>' + r.d.c + '</strong><span class="pbar"><i style="width:' + r.pct + '%"></i></span><span>' + r.pct + ' %</span></li>').join('') + '</ul>' +
        '<div class="table-wrap"><table class="keep"><thead><tr><th scope="col">Delprov</th><th scope="col">Rätt</th><th scope="col">Tid per vecka</th></tr></thead><tbody>' +
        rows.map(r => '<tr><td><a href="/' + r.d.s + '">' + r.d.c + '</a></td><td>' + r.ok + ' av ' + r.d.q + '</td><td>' + r.min + ' min</td></tr>').join('') + '</tbody></table></div>' +
        '<p class="note">Ett enda provpass är ett litet underlag (NOG har till exempel bara 6 uppgifter), så se resultatet som en fingervisning. Gör fler prov för säkrare slutsatser.</p>';
      out.hidden = false; out.focus({ preventScroll: true });
    });
  }
  // ----- repetitionsschema -----
  const sp = $('[data-tool="spaced"]');
  if (sp) {
    const td = $('#rdate', sp), ld = $('#rlearn', sp), tp = $('#rtopic', sp), tm = $('#rtime', sp), out = $('#rout', sp), err = $('.formerr', sp);
    td.value = store.get('hpk_testdate') || dflt(); ld.value = ymd(today()); td.min = ymd(today());
    let cur = null;
    const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    sp.addEventListener('submit', e => {
      e.preventDefault();
      if (!td.value || !ld.value) { msg(err, 'Fyll i både provdatum och när du lär dig ämnet.'); out.hidden = true; return; }
      const learn = localDate(ld.value), test = localDate(td.value), topic = tp.value.replace(/\s+/g, ' ').trim().slice(0, 60) || 'ämnet';
      if (test <= today()) { msg(err, 'Provdatumet måste ligga framåt i tiden.'); out.hidden = true; return; }
      if (learn < today()) { msg(err, 'Datumet du lär dig ämnet kan inte ligga bakåt i tiden.'); out.hidden = true; return; }
      const dates = spacedDates(learn, test), T = daysBetween(learn, test);
      if (!dates.length) { msg(err, 'Det är för kort tid till provet för utspridd repetition (minst 3 dagar behövs). Repetera i stället dagligen.'); out.hidden = true; return; }
      msg(err, ''); store.set('hpk_testdate', td.value);
      const hm = (tm.value || '18:00').split(':'), h = +hm[0] || 18, mi = +hm[1] || 0;
      cur = { sessions: dates.map(d => ({ date: d.date, key: 'rep' + ymd(learn) + '-' + d.n, type: 'rep', label: 'Repetera ' + topic + ' (' + d.n + ' av ' + dates.length + ')', minutes: 20 })), h: h, m: mi };
      out.innerHTML = '<p class="eyebrow">Ditt repetitionsschema</p><p class="res-msg">Första repetitionen efter <strong>' + firstGap(T) + ' dagar</strong> (' + sv(firstGap(T) / T * 100, 0) + ' % av tiden till provet), sedan fördubblas avståndet. Totalt <strong>' + dates.length + ' repetitioner</strong> av ' + esc(topic) + ' före provet.</p>' +
        '<div class="table-wrap"><table class="keep"><thead><tr><th scope="col">#</th><th scope="col">Datum</th><th scope="col">Dag</th><th scope="col">Sedan förra</th></tr></thead><tbody>' +
        dates.map((d, i) => '<tr><td>' + d.n + '</td><td>' + dstr(d.date) + '</td><td>' + d.day + '</td><td>' + (d.day - (i ? dates[i - 1].day : 0)) + ' dagar</td></tr>').join('') + '</tbody></table></div>' +
        '<p class="btnrow"><button type="button" class="btn" id="rdl">Ladda ned kalenderfil (.ics)</button> <button type="button" class="btn ghost" id="rpr">Skriv ut</button></p>' +
        '<p class="note">Gör varje repetition som ett test: svara från minnet innan du tittar i facit. Avståndet bygger på Cepeda m.fl. (2008). Att fördubbla avståndet efter första repetitionen är en tumregel, inte något den studien bevisat.</p>';
      out.hidden = false; out.focus({ preventScroll: true });
    });
    out.addEventListener('click', e => {
      if (e.target.id === 'rpr') window.print();
      if (e.target.id === 'rdl' && cur) {
        const blob = new Blob([buildICS(cur.sessions, cur.h, cur.m, new Date())], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'repetitionsschema-hogskoleprovet.ics'; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
      }
    });
  }

  // ----- flashcards (Leitner) -----
  const cardsLoad = () => { try { const x = JSON.parse(store.get('hpk_cards') || '[]'); return Array.isArray(x) ? x : []; } catch (e) { return []; } };
  const cardsSave = c => store.set('hpk_cards', JSON.stringify(c));
  const fc = $('[data-tool="cards"]');
  if (fc) {
    const view = $('#cview', fc), stat = $('#cstat', fc), err = $('.formerr', fc), list = $('#clist', fc), addf = $('#cadd', fc), ex = $('#cex', fc);
    let cards = cardsLoad(), queue = [];
    // textContent only: kortens text är aldrig HTML
    const el = (tag, txt, cls) => { const n = document.createElement(tag); if (txt != null) n.textContent = txt; if (cls) n.className = cls; return n; };
    const save = () => cardsSave(cards);
    const renderStat = () => {
      const due = dueCards(cards, today()).length, per = [1, 2, 3, 4, 5].map(b => cards.filter(c => c.box === b).length);
      stat.textContent = cards.length + ' kort, ' + due + ' att repetera idag. Lådor 1–5: ' + per.join(' / ') + '.';
    };
    const renderList = () => {
      list.textContent = '';
      cards.slice().reverse().slice(0, 200).forEach(c => {
        const li = el('li'), b = el('button', 'Ta bort', 'btn ghost sm'); li.appendChild(el('span', c.f + ' → ' + c.b)); b.type = 'button'; b.setAttribute('data-del', c.id); li.appendChild(b); list.appendChild(li);
      });
    };
    const next = () => {
      view.textContent = ''; renderStat(); renderList();
      if (!queue.length) queue = dueCards(cards, today());
      if (!queue.length) { view.appendChild(el('p', cards.length ? 'Inga kort att repetera idag. Kom tillbaka imorgon eller lägg till fler kort.' : 'Du har inga kort ännu. Lägg till egna kort eller hämta ord från ordlistan.', 'res-msg')); return; }
      const c = queue[0], card = el('div', null, 'fcard'), ans = el('p', c.b, 'fback'), row = el('p', null, 'btnrow'), show = el('button', 'Visa svar', 'btn'), ok = el('button', 'Kunde det', 'btn'), no = el('button', 'Kunde inte', 'btn ghost');
      card.appendChild(el('p', 'Låda ' + c.box + ' · ' + queue.length + ' kvar', 'eyebrow')); card.appendChild(el('p', c.f, 'ffront')); ans.hidden = true; card.appendChild(ans);
      [show, ok, no].forEach(b => { b.type = 'button'; row.appendChild(b); }); ok.hidden = no.hidden = true; card.appendChild(row); view.appendChild(card);
      show.addEventListener('click', () => { ans.hidden = false; show.hidden = true; ok.hidden = no.hidden = false; });
      const answer = good => { const i = cards.findIndex(x => x.id === c.id); if (i >= 0) cards[i] = review(c, good, today()); save(); queue.shift(); next(); };
      ok.addEventListener('click', () => answer(true)); no.addEventListener('click', () => answer(false));
    };
    addf.addEventListener('submit', e => {
      e.preventDefault();
      if (cards.length >= MAX_CARDS) { msg(err, 'Max ' + MAX_CARDS + ' kort.'); return; }
      const c = makeCard($('#cf', addf).value, $('#cb', addf).value, today());
      if (!c) { msg(err, 'Fyll i både fråga och svar (max ' + MAX_LEN + ' tecken vardera).'); return; }
      msg(err, ''); cards.push(c); save(); queue = []; $('#cf', addf).value = ''; $('#cb', addf).value = ''; $('#cf', addf).focus(); next();
    });
    list.addEventListener('click', e => { const id = e.target.getAttribute && e.target.getAttribute('data-del'); if (id) { cards = cards.filter(c => c.id !== id); save(); queue = []; next(); } });
    $('#cexport', ex).addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(cards, null, 1)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'hp-klar-flashcards.json'; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
    });
    $('#cimport', ex).addEventListener('change', e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (f.size > 1e6) { msg(err, 'Filen är för stor (max 1 MB).'); return; }
      const r = new FileReader();
      r.onload = () => { const res = importCards(String(r.result), cards, today()); if (res.error) { msg(err, res.error); return; } cards = res.cards; save(); queue = []; msg(err, ''); next(); stat.textContent += ' Importerade ' + res.added + ', hoppade över ' + res.skipped + '.'; };
      r.readAsText(f);
    });
    $('#creset', ex).addEventListener('click', () => { if (window.confirm('Ta bort alla kort från den här webbläsaren?')) { cards = []; save(); queue = []; next(); } });
    next();
  }

  // ----- ordlista: lägg orden i flashcards -----
  const aw = $('[data-tool="addwords"]');
  if (aw) {
    const btn = $('button', aw), note = $('.res-msg', aw);
    btn.addEventListener('click', () => {
      const items = $$('dl.glossary dt').map(dt => ({ f: dt.textContent, b: dt.nextElementSibling ? dt.nextElementSibling.textContent : '' }));
      const res = importCards(JSON.stringify(items), cardsLoad(), today());
      if (res.error) { note.textContent = res.error; note.hidden = false; return; }
      cardsSave(res.cards); note.textContent = res.added + ' ord lades till i dina flashcards' + (res.skipped ? ' (' + res.skipped + ' fanns redan).' : '.'); note.hidden = false;
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
