/* 팀플 분노 측정기 — 하소연을 온도로, 온도를 색으로, 색으로 발표 PPT 템플릿을
   입력한 글은 이 브라우저 안에서만 분석하고 서버로 보내지 않습니다.
   만들어지는 템플릿·카드에는 하소연 내용이 한 글자도 들어가지 않습니다(온도와 색만 씀). */
'use strict';

// 사전: 긴 말부터 맞춰서 "개새끼"가 "개새"+"새끼"로 두 번 세지지 않게 함
const SWEAR = ['씨발', '시발', '씨팔', '씨바', '시바', 'ㅅㅂ', 'ㅆㅂ', 'ㅅ ㅂ', '개새끼', '개새', '새끼', '쌔끼', '병신', '븅신', '빙신', 'ㅂㅅ', 'ㅄ', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ', '썅', '미친놈', '미친년', '미친', 'ㅁㅊ', '또라이', '돌아이', '꺼져', '닥쳐', '개빡', '좆', 'ㅈ같', '염병', '등신', '멍청이', '쓰레기', '빡대가리', '개같', '개노답', '노답', '한심', '호구', 'fuck', 'shit'];
const ANGER = ['짜증', '화나', '화가', '화난', '열받', '열 받', '열불', '빡치', '빡쳐', '빡침', '빡돌', '미치겠', '미쳐버', '답답', '어이없', '어이가 없', '기가 막', '기가막', '황당', '왜 이래', '도대체', '진짜', '정말', '제발', '아오', '으악', '최악', '대체', '뭐하는', '뭐 하는', '실화', '말이 돼', '말이 되', '노양심', '양심', '뻔뻔', '소름', '혈압', '뒷목', '참을 수', '못 참', '분노', '환장'];
const SAD = ['억울', '서럽', '서운', '허탈', '현타', '눈물', '울고 싶', '울었', '우울', '속상', '외롭', '포기', '그만두고 싶', '하기 싫', '자괴감', '무기력', '한숨', '힘들', '지친다', '지쳐'];
const SOLO = ['혼자', '나만', '내가 다', '내가 혼자', '독박', '떠맡', '떠넘', '대신 해', '대신해', '밤새', '밤샘', '새벽', '잠을 못', '못 잤', '다 했', '내가 했', '맡겨', '버스 태', '버스 기사', '캐리'];
const LEX = { swear: SWEAR, anger: ANGER, sad: SAD, solo: SOLO };
const _rx = {};
function lexRx(name) {
  if (!_rx[name]) _rx[name] = new RegExp([...LEX[name]].sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  _rx[name].lastIndex = 0;
  return _rx[name];
}
const count = (text, name) => (String(text).match(lexRx(name)) || []).length;
const FREE = [
  { id: 'meet', label: '회의 불참', w: 9 },
  { id: 'read', label: '단톡 읽씹', w: 6 },
  { id: 'late', label: '마감 지각', w: 10 },
  { id: 'copy', label: '자료 복붙', w: 8 },
  { id: 'ghost', label: '발표 당일 잠수', w: 25 },
  { id: 'what', label: '"나 이거 몰랐는데?"', w: 7 }
];

const st = store.sget('rm-state', { text: '', counts: {} });
const save = () => store.sset('rm-state', st);

/* 하소연 → 분노 점수(0~100) */
function analyze(text) {
  text = String(text || '');
  const swear = count(text, 'swear'), anger = count(text, 'anger'), sad = count(text, 'sad'), solo = count(text, 'solo');
  const bang = (text.match(/[!?]/g) || []).length;
  const sigh = (text.match(/(하+\.{2,}|ㅠ+|ㅜ+|…|후\.{2,})/g) || []).length;
  const caps = (text.match(/(.)\1{3,}/g) || []).length;
  const raw = swear * 14 + anger * 6 + sad * 3 + solo * 3 + bang * 2.5 + sigh * 3 + caps * 4 + text.length * 0.04;
  return { swear, anger, sad: sad + sigh, solo, bang, score: Math.round(100 * (1 - Math.exp(-raw / 70))) };
}
function freeScore(counts) {
  const raw = FREE.reduce((s, f) => s + (counts[f.id] || 0) * f.w, 0);
  return Math.round(100 * (1 - Math.exp(-raw / 45)));
}
const totalOf = (text, counts) => Math.round(analyze(text).score * 0.55 + freeScore(counts) * 0.45);

/* ---------- 점수 → 온도 ---------- */
const lerpTable = (tab, x) => {
  for (let k = 1; k < tab.length; k++) if (x <= tab[k][0]) {
    const [x0, ...a] = tab[k - 1], [x1, ...b] = tab[k], u = (x - x0) / (x1 - x0);
    return a.map((v, j) => v + (b[j] - v) * u);
  }
  return tab[tab.length - 1].slice(1);
};
// 점수 0 → -10℃(빙하), 45 → 36.5℃(체온), 65 → 100℃(끓는점), 85 → 1,200℃(용암), 100 → 5,500℃(태양 표면)
const TEMP = [[0, -10], [25, 20], [45, 36.5], [65, 100], [85, 1200], [100, 5500]];
const tempOf = total => lerpTable(TEMP, clamp(total, 0, 100))[0];
const fmtTemp = c => (c < 100 ? (Math.round(c * 10) / 10).toFixed(1) : Math.round(c).toLocaleString('ko-KR')) + '℃';
const STAGES = [
  [95, '☀️', '태양 표면', '이 분노로 발전소를 돌릴 수 있어요'],
  [80, '🌋', '흘러내리는 용암', '회의록이 녹아내리는 중'],
  [65, '🫕', '팔팔 끓는 물', '100℃ 돌파, 김이 펄펄'],
  [55, '♨️', '부글부글 온천', '뚜껑이 들썩이기 시작했어요'],
  [40, '🙂', '딱 체온', '사람이라면 이 정도는 화나요'],
  [20, '🌤️', '선선한 봄바람', '아직은 웃으며 넘길 수 있어요'],
  [0, '🧊', '남극 빙하', '분노가 꽁꽁 얼었어요']
];
const stageOf = total => STAGES.find(s => total >= s[0]);

/* ---------- 온도 → 색 팔레트 ---------- */
// 점수별 기준 색상(색상각·채도). 차가운 파랑 → 민트 → 노랑 → 주황 → 빨강 → 자홍(태양)
const HUE = [[0, 205, 70], [20, 180, 50], [40, 45, 90], [60, 22, 92], [80, 2, 80], [100, -25, 80]];
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
function lum(hex) {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4));
  return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
}
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const onColor = bg => contrast(bg, '#ffffff') >= contrast(bg, '#16161a') ? '#ffffff' : '#16161a';
function paletteOf(total) {
  const [h, s] = lerpTable(HUE, clamp(total, 0, 100));
  const P = {
    bg: hsl2hex(h, s * .45, 97), soft: hsl2hex(h, s * .7, 89), main: hsl2hex(h, s, 44),
    deep: hsl2hex(h, s * .55, 17), accent: hsl2hex(h - 30, s, 50), text: hsl2hex(h, 22, 14)
  };
  P.onMain = onColor(P.main); P.onAccent = onColor(P.accent);
  return P;
}
const SWATCH = [['bg', '배경'], ['soft', '연한 색'], ['main', '메인'], ['deep', '진한 색'], ['accent', '포인트'], ['text', '글자']];
const palVars = P => Object.entries(P).map(([k, v]) => `--p-${k}:${v}`).join(';');

/* ---------- 랜딩 ---------- */
const SPECTRUM = [0, 20, 40, 55, 65, 80, 95].map(t => paletteOf(t).main);
Router.on('/', root => {
  const wrap = h('<div class="split center"></div>');
  root.append(wrap);
  wrap.append(h(`
    <section class="hero">
      <div class="thermo"><i></i></div>
      <h1>팀플 하다<br>열받았나요?</h1>
      <p class="muted">마음껏 털어놓으세요. 하소연을 <b>분노 온도</b>로 바꾸고, 그 온도에 딱 맞는 색으로 <b>발표용 PPT 템플릿</b>을 만들어 드려요.</p>
      <a class="btn primary big block" href="#/vent">털어놓기</a>
      <div class="notice" style="margin-top:14px">털어놓은 내용은 템플릿에 <b>한 글자도 들어가지 않아요</b>. 온도와 색만 써요. 글은 서버로 보내지 않고, 이 탭을 닫으면 사라져요.</div>
    </section>`));
  wrap.append(h(`
    <section class="sample">
      <h2>분노 온도별 템플릿 색</h2>
      <div class="spectrum">${SPECTRUM.map((c, k) => `<i style="background:${c}" title="${STAGES[STAGES.length - 1 - k][2]}"></i>`).join('')}</div>
      <div class="row small muted"><span>🧊 −10℃</span><span class="grow"></span><span>36.5℃</span><span class="grow"></span><span>☀️ 5,500℃</span></div>
      <div class="minis">${[15, 50, 90].map(t => `<div class="slide mini s-section" style="${palVars(paletteOf(t))}"><div class="ttl">발표 제목</div><div class="sub">${fmtTemp(tempOf(t))} 템플릿</div></div>`).join('')}</div>
      <div class="feats"><span>🌡️ 분노 온도</span><span>🎨 온도 색 팔레트</span><span>📊 PPTX 템플릿 6장</span></div>
    </section>`));
});

/* ---------- 털어놓기 ---------- */
Router.on('/vent', root => {
  root.append(h(`
    <section class="split">
      <div class="stack">
      <h1>털어놓기</h1>
      <div class="card">
        <div class="row"><b>분노 온도</b><span class="grow"></span><span id="label" class="lbl"></span></div>
        <div class="gauge"><i id="g"></i></div>
        <div class="row small muted"><span>🧊</span><span class="grow"></span><span>☀️</span></div>
      </div>
      <textarea id="t" rows="7" placeholder="예) 회의 세 번 연속 안 오더니 발표 전날 '나 뭐 하면 돼?' 이러는 거 실화냐?? 진짜 어이가 없어서…" aria-label="하소연 입력"></textarea>
      <div class="row"><span class="small muted">내용은 템플릿에 들어가지 않아요</span><span class="grow"></span><button class="btn ghost" id="mic">🎤 말로 하기</button></div>
      </div>
      <div class="stack">
      <h2>무임승차 체크리스트</h2>
      <p class="muted small">해당하는 일이 몇 번 있었나요? 온도가 더 올라가요.</p>
      <div class="free" id="free"></div>
      <button class="btn primary big block" id="go">온도 재고 템플릿 만들기</button>
      </div>
    </section>`));
  const t = $('#t');
  t.value = st.text;
  const update = () => {
    st.text = t.value; save();
    const total = totalOf(st.text, st.counts), P = paletteOf(total), S = stageOf(total);
    $('#g').style.width = Math.max(4, total) + '%';
    $('#g').style.background = `linear-gradient(90deg, ${paletteOf(0).main}, ${P.main})`;
    $('#label').textContent = `${S[1]} ${fmtTemp(tempOf(total))} · ${S[2]}`;
    $('#label').style.color = P.main;
  };
  t.oninput = update;
  const free = $('#free');
  FREE.forEach(f => {
    const row = h(`<div class="frow"><span class="grow">${f.label}</span><button class="btn ghost step" data-nosfx data-d="-1" aria-label="${esc(f.label)} 하나 빼기">−</button><b class="n">${st.counts[f.id] || 0}</b><button class="btn ghost step" data-nosfx data-d="1" aria-label="${esc(f.label)} 하나 더하기">+</button></div>`);
    $$('.step', row).forEach(b => b.onclick = () => {
      st.counts[f.id] = clamp((st.counts[f.id] || 0) + Number(b.dataset.d), 0, 9);
      $('.n', row).textContent = st.counts[f.id]; vibrate(10); Sfx.play('pop'); update();
    });
    free.append(row);
  });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) $('#mic').classList.add('hidden');
  else {
    let rec = null;
    $('#mic').onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'ko-KR'; rec.interimResults = false; rec.continuous = true;
      rec.onresult = e => { for (let k = e.resultIndex; k < e.results.length; k++) if (e.results[k].isFinal) t.value += (t.value ? ' ' : '') + e.results[k][0].transcript; update(); };
      rec.onend = () => { rec = null; $('#mic').textContent = '🎤 말로 하기'; };
      rec.onerror = () => toast('음성 인식을 쓸 수 없어요');
      rec.start(); $('#mic').textContent = '⏹ 그만 듣기';
    };
  }
  $('#go').onclick = () => {
    if (t.value.trim().length < 5 && !Object.values(st.counts).some(Boolean)) { toast('조금만 더 털어놔 주세요'); return; }
    Router.go('/analyze');
  };
  update();
});

const hasInput = () => st.text || Object.values(st.counts).some(Boolean);

/* ---------- 측정 연출 ---------- */
Router.on('/analyze', root => {
  if (!hasInput()) { Router.go('/vent'); return; }
  const r = analyze(st.text), fs = freeScore(st.counts), total = totalOf(st.text, st.counts);
  const goal = tempOf(total), P = paletteOf(total), S = stageOf(total);
  const steps = [
    ['욕설·분노 표현 측정', `욕설 ${r.swear} · 분노 ${r.anger} · 느낌표 ${r.bang}`],
    ['한숨·독박 농도 측정', `허탈 ${r.sad} · 독박 ${r.solo}`],
    ['무임승차 열기 더하기', `무임승차 지수 ${fs}`],
    ['분노 온도 환산', `${fmtTemp(goal)} · ${S[2]}`],
    ['온도 색 팔레트 추출', `메인 ${P.main} · 포인트 ${P.accent}`],
    ['발표 템플릿 디자인', '6장 완성']
  ];
  root.append(h(`
    <section class="analyzing">
      <div class="meter"><div class="mnum" id="num">-10℃</div><div class="mlbl">분노 온도 측정 중</div></div>
      <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="측정 진행"><i id="pb"></i></div>
      <p class="small muted" id="pct">0%</p>
      <ol class="alog" id="log">${steps.map(([a]) => `<li><span class="dot"></span><span class="grow">${a}</span><span class="res"></span></li>`).join('')}</ol>
      <button class="btn ghost" id="skip">건너뛰기</button>
    </section>`));
  const STEP = Motion.reduced ? 160 : 560;
  const lis = $$('#log li');
  const timers = [];
  let raf = 0, done = false;
  const t0 = performance.now(), dur = STEP * steps.length;
  const tickNum = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    $('#num').textContent = fmtTemp(tempOf(total * e));
    $('#num').style.color = paletteOf(total * e).main;
    $('#pb').style.width = Math.round(p * 100) + '%';
    $('.pbar').setAttribute('aria-valuenow', Math.round(p * 100));
    $('#pct').textContent = Math.round(p * 100) + '%';
    if (p < 1) raf = requestAnimationFrame(tickNum);
  };
  raf = requestAnimationFrame(tickNum);
  const finish = () => { if (done) return; done = true; Sfx.play('win'); vibrate([20, 40, 20]); Router.go('/template'); };
  steps.forEach(([, res], k) => {
    timers.push(setTimeout(() => { lis[k].classList.add('on'); }, STEP * k));
    timers.push(setTimeout(() => { lis[k].classList.remove('on'); lis[k].classList.add('ok'); $('.res', lis[k]).textContent = res; Sfx.play('tick'); }, STEP * (k + 1) - 60));
  });
  timers.push(setTimeout(finish, dur + (Motion.reduced ? 100 : 500)));
  $('#skip').onclick = finish;
  return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
});

/* ---------- 발표 템플릿 6장 (화면 미리보기). 글자는 모두 자리 표시 문구 ---------- */
function buildSlides(P) {
  const v = `style="${palVars(P)}"`;
  return [
    `<div class="slide s-cover" ${v}><i class="edge"></i><div class="ttl">발표 제목을 입력하세요</div><div class="sub">부제목 · 발표자 · 날짜</div></div>`,
    `<div class="slide s-body" ${v}><div class="sh">목차</div><ol class="toc">${['첫 번째 주제', '두 번째 주제', '세 번째 주제', '마무리'].map((x, k) => `<li><b>0${k + 1}</b>${x}</li>`).join('')}</ol><span class="pg">2</span></div>`,
    `<div class="slide s-section" ${v}><div class="num">01</div><div class="ttl">섹션 제목</div><div class="sub">이 섹션에서 다룰 내용을 한 줄로</div></div>`,
    `<div class="slide s-body" ${v}><div class="sh">슬라이드 제목</div><ul class="big"><li>핵심 내용을 한 줄로 적으세요</li><li>근거나 예시를 덧붙이세요</li><li>강조할 말은 <em>포인트 색</em>으로</li></ul><span class="pg">4</span></div>`,
    `<div class="slide s-body" ${v}><div class="sh">그래프 · 비교</div><div class="two"><div class="chart">${[['항목 A', 80], ['항목 B', 55], ['항목 C', 35]].map(([l, x], k) => `<div class="crow"><span>${l}</span><div class="cbar"><i class="${k ? '' : 'hi'}" style="width:${x}%"></i></div></div>`).join('')}</div><div class="note">숫자와 항목 이름을 바꿔 쓰세요. 가장 중요한 값은 포인트 색으로 칠해져 있어요.</div></div><span class="pg">5</span></div>`,
    `<div class="slide s-end" ${v}><div class="ttl">감사합니다</div><div class="sub">질문을 받겠습니다</div></div>`
  ];
}

/* ---------- PPTX 템플릿 (PptxGenJS, 저장소에 함께 둔 파일을 필요할 때만 불러옴) ----------
   슬라이드 마스터 5종에 팔레트 색을 넣어서, 새 슬라이드를 추가해도 같은 색이 유지되는 진짜 템플릿으로 만듦 */
const PPTX_URL = 'vendor/pptxgen.bundle.js';
async function exportPptx(total) {
  toast('PPTX 템플릿을 만드는 중…');
  try { if (!window.PptxGenJS) await loadScript(PPTX_URL); } catch (e) { /* 아래에서 안내 */ }
  if (!window.PptxGenJS) { toast('PPTX 도구를 불러오지 못했어요. 이미지 저장을 이용해 주세요'); Sfx.play('bad'); return false; }
  try {
    const P = paletteOf(total), c = x => x.replace('#', ''), F = 'Malgun Gothic', S = stageOf(total), temp = fmtTemp(tempOf(total));
    const p = new window.PptxGenJS();
    p.layout = 'LAYOUT_WIDE'; p.title = `${temp} 발표 템플릿`; p.company = '팀플 분노 측정기';
    const ph = (name, type, x, y, w, h, o, text) => ({ placeholder: { options: { name, type, x, y, w, h, fontFace: F, margin: 0, ...o }, text } });
    const num = color => ({ x: 12.3, y: 6.95, w: .6, h: .35, fontFace: F, fontSize: 11, color: c(color), align: 'right' });
    p.defineSlideMaster({ title: '표지', background: { color: c(P.deep) }, objects: [
      { rect: { x: 0, y: 0, w: .35, h: 7.5, fill: { color: c(P.accent) } } },
      { rect: { x: .9, y: 4.35, w: 1.6, h: .08, fill: { color: c(P.main) } } },
      ph('title', 'title', .9, 2.1, 11.4, 2.1, { fontSize: 44, bold: true, color: 'FFFFFF', valign: 'bottom' }, '발표 제목을 입력하세요'),
      ph('sub', 'body', .9, 4.65, 11.4, .8, { fontSize: 20, color: c(P.soft) }, '부제목 · 발표자 · 날짜')
    ] });
    p.defineSlideMaster({ title: '간지', background: { color: c(P.main) }, objects: [
      ph('num', 'body', .9, 1.6, 6, 1.6, { fontSize: 88, bold: true, color: c(P.onMain) }, '01'),
      ph('title', 'title', .9, 3.3, 11.4, 1.2, { fontSize: 40, bold: true, color: c(P.onMain) }, '섹션 제목'),
      ph('sub', 'body', .9, 4.5, 11.4, .7, { fontSize: 18, color: c(P.onMain) }, '이 섹션에서 다룰 내용을 한 줄로')
    ] });
    p.defineSlideMaster({ title: '본문', background: { color: c(P.bg) }, slideNumber: num(P.main), objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: .12, fill: { color: c(P.main) } } },
      { rect: { x: .8, y: 1.32, w: 1.2, h: .07, fill: { color: c(P.accent) } } },
      ph('title', 'title', .8, .45, 11.7, .85, { fontSize: 30, bold: true, color: c(P.deep) }, '슬라이드 제목'),
      ph('body', 'body', .8, 1.75, 11.7, 4.9, { fontSize: 22, color: c(P.text), valign: 'top' }, '내용을 입력하세요')
    ] });
    p.defineSlideMaster({ title: '그래프', background: { color: c(P.bg) }, slideNumber: num(P.main), objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: .12, fill: { color: c(P.main) } } },
      { rect: { x: .8, y: 1.32, w: 1.2, h: .07, fill: { color: c(P.accent) } } },
      { rect: { x: 8.4, y: 1.75, w: 4.1, h: 4.9, fill: { color: c(P.soft) }, rectRadius: .15 } },
      ph('title', 'title', .8, .45, 11.7, .85, { fontSize: 30, bold: true, color: c(P.deep) }, '그래프 · 비교'),
      ph('note', 'body', 8.7, 2.05, 3.5, 4.3, { fontSize: 18, color: c(P.text), valign: 'top' }, '설명을 입력하세요')
    ] });
    p.defineSlideMaster({ title: '마무리', background: { color: c(P.deep) }, objects: [
      { rect: { x: 0, y: 7.1, w: 13.33, h: .4, fill: { color: c(P.accent) } } },
      ph('title', 'title', .9, 2.4, 11.5, 1.6, { fontSize: 54, bold: true, color: 'FFFFFF', align: 'center' }, '감사합니다'),
      ph('sub', 'body', .9, 4.0, 11.5, .8, { fontSize: 22, color: c(P.soft), align: 'center' }, '질문을 받겠습니다')
    ] });
    let s = p.addSlide({ masterName: '표지' });
    s.addText('발표 제목을 입력하세요', { placeholder: 'title' }); s.addText('부제목 · 발표자 · 날짜', { placeholder: 'sub' });
    s = p.addSlide({ masterName: '본문' });
    s.addText('목차', { placeholder: 'title' });
    s.addText(['첫 번째 주제', '두 번째 주제', '세 번째 주제', '마무리'].map((x, k) => ({ text: `0${k + 1}   ${x}`, options: { breakLine: true } })), { placeholder: 'body', paraSpaceAfter: 14 });
    s = p.addSlide({ masterName: '간지' });
    s.addText('01', { placeholder: 'num' }); s.addText('섹션 제목', { placeholder: 'title' }); s.addText('이 섹션에서 다룰 내용을 한 줄로', { placeholder: 'sub' });
    s = p.addSlide({ masterName: '본문' });
    s.addText('슬라이드 제목', { placeholder: 'title' });
    s.addText([
      { text: '핵심 내용을 한 줄로 적으세요', options: { bullet: true, breakLine: true } },
      { text: '근거나 예시를 덧붙이세요', options: { bullet: true, breakLine: true } },
      { text: '강조할 말은 ', options: { bullet: true } }, { text: '포인트 색', options: { color: c(P.accent), bold: true } }, { text: '으로' }
    ], { placeholder: 'body', paraSpaceAfter: 12 });
    s = p.addSlide({ masterName: '그래프' });
    s.addText('그래프 · 비교', { placeholder: 'title' });
    s.addText('숫자와 항목 이름을 바꿔 쓰세요. 그래프를 오른쪽 클릭 → "데이터 편집"으로 고칠 수 있어요.', { placeholder: 'note' });
    s.addChart(p.ChartType.bar, [{ name: '값', labels: ['항목 A', '항목 B', '항목 C'], values: [80, 55, 35] }], {
      x: .8, y: 1.75, w: 7.2, h: 4.9, barDir: 'bar', chartColors: [c(P.accent), c(P.main), c(P.main)], showValue: true,
      dataLabelColor: c(P.text), dataLabelFontSize: 14, catAxisLabelColor: c(P.text), catAxisLabelFontFace: F, catAxisLabelFontSize: 16,
      catAxisOrientation: 'maxMin', valAxisHidden: true, valGridLine: { style: 'none' }, barGapWidthPct: 60
    });
    s = p.addSlide({ masterName: '마무리' });
    s.addText('감사합니다', { placeholder: 'title' }); s.addText('질문을 받겠습니다', { placeholder: 'sub' });
    const blob = await p.write({ outputType: 'blob' });
    download(blob, `발표-템플릿-${temp.replace(/[,℃]/g, '')}도-${S[2].replace(/\s/g, '')}.pptx`);
    toast('PPTX 템플릿을 저장했어요. 파워포인트·키노트·구글 슬라이드에서 열 수 있어요');
    Sfx.play('ok');
    return true;
  } catch (e) {
    console.error(e);
    toast('PPTX를 만들지 못했어요. 이미지 저장을 이용해 주세요');
    Sfx.play('bad');
    return false;
  }
}

/* ---------- 결과 카드 (온도·색만. 원문 없음) ---------- */
function cardHtml(total) {
  const P = paletteOf(total), S = stageOf(total);
  return `<div class="rcard" id="rcard" style="${palVars(P)}">
    <div class="rc-top">🌡️ 팀플 분노 온도</div>
    <div class="rc-temp">${fmtTemp(tempOf(total))}</div>
    <div class="rc-stage">${S[1]} ${S[2]}</div>
    <div class="rc-sub">${S[3]}</div>
    <div class="rc-pal">${SWATCH.map(([k]) => `<i style="background:${P[k]}"></i>`).join('')}</div>
    <div class="rc-foot">이 온도로 만든 발표 템플릿 · km-crew.github.io/rant-meter</div>
  </div>`;
}
const cardLink = total => location.href.split('#')[0] + '#/card?d=' + encodeData({ t: total });
function shareCard(total) {
  const S = stageOf(total);
  shareText('팀플 분노 측정기', `${S[1]} 내 팀플 분노 온도: ${fmtTemp(tempOf(total))} (${S[2]})\n이 온도 색으로 발표 템플릿까지 받았어 👇`, cardLink(total));
}
function readCard(params) {
  const d = decodeData(params.get('d') || '');
  return d && typeof d === 'object' && d.t != null ? clamp(Math.round(Number(d.t) || 0), 0, 100) : null;
}

Router.on('/template', root => {
  if (!hasInput()) { Router.go('/vent'); return; }
  const total = totalOf(st.text, st.counts), P = paletteOf(total), S = stageOf(total);
  const slides = buildSlides(P);
  let i = 0;
  root.classList.add('wide');
  root.append(h(`
    <section class="stack" style="${palVars(P)}">
      <div class="tempbox">
        <div class="tb-em">${S[1]}</div>
        <div><div class="tb-temp">${fmtTemp(tempOf(total))}</div><b>${S[2]}</b><div class="muted small">${S[3]}</div></div>
      </div>
      <div class="palette" role="list" aria-label="이 온도의 색 팔레트">${SWATCH.map(([k, n]) => `<button class="sw" role="listitem" data-hex="${P[k]}" aria-label="${n} ${P[k]} 복사"><i style="background:${P[k]}"></i><b>${n}</b><span>${P[k]}</span></button>`).join('')}</div>
      <div class="row"><h2 style="margin:0">발표 템플릿</h2><span class="grow"></span><span class="muted small" id="pg"></span></div>
      <p class="muted small">하소연 내용은 들어가지 않았어요. 글자는 모두 바꿔 쓰는 자리 표시 문구예요.</p>
      <div class="viewer" id="viewer"><div id="stage"></div></div>
      <p class="muted small center">슬라이드 클릭·Space·→ 다음 장 / ← 이전 장 / ⛶ 전체 화면(Esc로 나가기)</p>
      <div class="row"><button class="btn grow" id="prev">← 이전</button><button class="btn grow" id="next">다음 →</button><button class="btn" id="fs" title="전체 화면" aria-label="전체 화면">⛶</button></div>
      <div class="row"><button class="btn primary grow" id="pptx">📊 PPTX 템플릿 내려받기</button><button class="btn grow" id="save">이 장 이미지</button></div>
      <div class="cardsec">
        <h2>온도 카드</h2>
        <p class="muted small">온도와 색만 담아요. 링크를 받은 친구는 카드만 볼 수 있어요.</p>
        <div id="cardwrap">${cardHtml(total)}</div>
        <div class="row"><button class="btn primary grow" id="share">결과 공유하기</button><button class="btn grow" id="savecard">카드 이미지 저장</button></div>
      </div>
      <a class="btn ghost block" href="#/vent">← 다시 털어놓기</a>
    </section>`));
  const stage = $('#stage');
  const show = () => { stage.innerHTML = slides[i]; $('#pg').textContent = `${i + 1} / ${slides.length}`; };
  const move = d => { const j = clamp(i + d, 0, slides.length - 1); if (j !== i) Sfx.play('whoosh'); i = j; show(); };
  $$('.sw').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.hex); toast(`${b.dataset.hex} 복사했어요`); } catch (e) { toast(b.dataset.hex); }
  });
  $('#prev').onclick = () => move(-1);
  $('#next').onclick = () => move(1);
  $('#fs').onclick = () => { const v = $('#viewer'); (v.requestFullscreen || v.webkitRequestFullscreen || (() => {})).call(v); };
  $('#save').onclick = () => saveImage($('.slide', stage), `template-${i + 1}.png`);
  $('#pptx').onclick = async () => { const b = $('#pptx'); b.disabled = true; await exportPptx(total); b.disabled = false; };
  $('#share').onclick = () => shareCard(total);
  $('#savecard').onclick = () => saveImage($('#rcard'), 'rant-temperature.png');
  // 발표 프로그램과 같은 키: 다음 = →·↓·PageDown·Space·Enter·N, 이전 = ←·↑·PageUp·Backspace·P, 처음/끝 = Home/End
  const NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n', 'N'];
  const PREV = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p', 'P'];
  const key = e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (NEXT.includes(e.key)) { e.preventDefault(); move(1); }
    else if (PREV.includes(e.key)) { e.preventDefault(); move(-1); }
    else if (e.key === 'Home') { e.preventDefault(); i = 0; show(); }
    else if (e.key === 'End') { e.preventDefault(); i = slides.length - 1; show(); }
  };
  stage.addEventListener('click', () => move(1));            // 슬라이드를 누르면 다음 장(발표 화면과 같음)
  addEventListener('keydown', key);
  let sx = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1); sx = null; });
  show();
  return () => { removeEventListener('keydown', key); root.classList.remove('wide'); };
});
Router.on('/report', () => Router.go('/template')); // 예전 주소

/* ---------- 공유받은 온도 카드 ---------- */
Router.on('/card', (root, params) => {
  const total = readCard(params);
  if (total == null) { toast('카드 링크가 올바르지 않아요'); Router.go('/'); return; }
  root.append(h(`
    <section class="split center">
      <div class="stack">
        <h1>친구의 팀플 분노 온도</h1>
        <p class="muted">온도와 색만 담긴 카드예요. 무슨 일이 있었는지는 비밀!</p>
        <a class="btn primary big block" href="#/vent">나도 온도 재고 템플릿 받기</a>
        <button class="btn block" id="savecard">카드 이미지 저장</button>
      </div>
      <div>${cardHtml(total)}</div>
    </section>`));
  $('#savecard').onclick = () => saveImage($('#rcard'), 'rant-temperature.png');
});

Router.start($('#app'));
