/* 팀플 분노 측정기 — 하소연을 수치로, 수치를 발표자료로
   입력한 글은 이 브라우저 안에서만 분석하고 저장·전송하지 않습니다.
   실명은 자동으로 "A팀원"으로 바꾸고, 욕설은 결과물에서 ●●로 가립니다. */
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
function hits(text, name) { return String(text).match(lexRx(name)) || []; }
const FREE = [
  { id: 'meet', label: '회의 불참', w: 9 },
  { id: 'read', label: '단톡 읽씹', w: 6 },
  { id: 'late', label: '마감 지각', w: 10 },
  { id: 'copy', label: '자료 복붙', w: 8 },
  { id: 'ghost', label: '발표 당일 잠수', w: 25 },
  { id: 'what', label: '"나 이거 몰랐는데?"', w: 7 }
];
const HONORIFIC = '(씨|님|선배|후배|이형|이 형|오빠|언니|누나|이가|이는|이랑|이한테|이도)';

const st = store.sget('rm-state', { text: '', who: 'A팀원', counts: {} });
if (!st.theme) st.theme = store.get('rm-theme', 'navy');
const save = () => { store.sset('rm-state', st); store.set('rm-theme', st.theme || 'navy'); };

function maskNames(text, who) {
  // "철수씨", "민지 선배", "영희가" 같이 이름 + 호칭 패턴을 호칭명으로 바꿈
  return text.replace(new RegExp('([가-힣]{2,3})\\s?' + HONORIFIC, 'g'), (m, name, suf) => {
    if (/^(팀원|우리|그냥|진짜|정말|이건|저건|그건|교수|조장|팀장)/.test(name)) return m;
    const particle = { '이가': '이', '이는': '은', '이랑': '이랑', '이한테': '한테', '이도': '도' };
    return who + (particle[suf] || '');
  });
}
function maskSwear(text) {
  return String(text).replace(lexRx('swear'), w => '●'.repeat(Math.min(w.replace(/\s/g, '').length, 3)));
}
function analyze(text) {
  text = String(text || '');
  const swearW = hits(text, 'swear'), angerW = hits(text, 'anger'), sadW = hits(text, 'sad'), soloW = hits(text, 'solo');
  const swear = swearW.length, anger = angerW.length, sad = sadW.length, solo = soloW.length;
  const bang = (text.match(/[!?]/g) || []).length;
  const sigh = (text.match(/(하+\.{2,}|ㅠ+|ㅜ+|…|후\.{2,})/g) || []).length;
  const caps = (text.match(/(.)\1{3,}/g) || []).length;
  const raw = swear * 14 + anger * 6 + sad * 3 + solo * 3 + bang * 2.5 + sigh * 3 + caps * 4 + text.length * 0.04;
  const score = Math.round(100 * (1 - Math.exp(-raw / 70)));
  const sentences = text.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 1);
  let hottest = sentences[0] || '';
  let best = -1;
  sentences.forEach(s => { const v = hits(s, 'swear').length * 3 + hits(s, 'anger').length + (s.match(/!/g) || []).length; if (v > best) { best = v; hottest = s; } });
  // 감정 성분(%) — 분노(욕설+분노어+느낌표) · 허탈(서러움+한숨) · 독박(혼자 다 함)
  const parts = { anger: swear * 3 + anger * 2 + bang * .5 + caps, sad: sad * 2 + sigh * 1.5, solo: solo * 2 };
  const sum = parts.anger + parts.sad + parts.solo;
  const mix = sum ? { anger: Math.round(parts.anger / sum * 100), sad: Math.round(parts.sad / sum * 100) } : { anger: 0, sad: 0 };
  mix.solo = sum ? 100 - mix.anger - mix.sad : 0;
  // 가장 많이 나온 표현(욕설은 가림)
  const freq = {};
  [...swearW.map(w => maskSwear(w)), ...angerW, ...sadW, ...soloW].forEach(w => { const k = w.toLowerCase(); freq[k] = (freq[k] || 0) + 1; });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { swear, anger, sad, solo, bang, sigh, score, sentences: sentences.length, hottest, mix, top };
}
function freeScore(counts) {
  const raw = FREE.reduce((s, f) => s + (counts[f.id] || 0) * f.w, 0);
  return Math.round(100 * (1 - Math.exp(-raw / 45)));
}
function angerLabel(s) {
  return s >= 85 ? '활화산 폭발' : s >= 65 ? '용암 끓는 중' : s >= 40 ? '부글부글' : s >= 15 ? '미지근한 짜증' : '부처님 모드';
}

/* ---------- 랜딩 ---------- */
Router.on('/', root => {
  const wrap = h('<div class="split center"></div>');
  root.append(wrap);
  wrap.append(h(`
    <section class="hero">
      <div class="thermo"><i></i></div>
      <h1>팀플 하다<br>열받았나요?</h1>
      <p class="muted">마음껏 털어놓으세요. 분노 지수와 무임승차 지수를 측정해 <b>진지한 척 발표자료</b>로 만들어 드려요.</p>
      <a class="btn primary big block" href="#/vent">털어놓기</a>
      <div class="notice" style="margin-top:14px">실명은 넣지 마세요. 이름처럼 보이면 자동으로 "A팀원"으로 바꾸고, 욕설은 결과물에서 ●●로 가려요. 입력한 글은 저장·전송되지 않아요.</div>
    </section>`));
  wrap.append(h(`
    <section class="sample">
      <h2>이런 걸 만들어 드려요</h2>
      <div class="slide mini s-cover"><div class="kicker">협업 실태 분석 보고서</div><div class="st">팀 프로젝트 무임승차의<br>구조적 원인과 대응 방안</div><div class="by">— A팀원 사례를 중심으로</div></div>
      <div class="feats"><span>🎨 테마 3종</span><span>📊 PPTX 내려받기</span><span>🃏 결과 카드 공유</span></div>
    </section>`));
});

/* ---------- 털어놓기 ---------- */
Router.on('/vent', root => {
  root.append(h(`
    <section class="split">
      <div class="stack">
      <h1>털어놓기</h1>
      <div class="card">
        <div class="row"><b>분노 게이지</b><span class="grow"></span><span id="label" class="lbl">부처님 모드</span></div>
        <div class="gauge"><i id="g"></i></div>
        <div class="row small muted"><span>😌</span><span class="grow"></span><span>🌋</span></div>
      </div>
      <textarea id="t" rows="7" placeholder="예) 회의 세 번 연속 안 오더니 발표 전날 '나 뭐 하면 돼?' 이러는 거 실화냐?? 진짜 어이가 없어서…"></textarea>
      <div class="row"><label class="small muted" for="who">상대 호칭</label><input id="who" type="text" style="max-width:140px" maxlength="8"><span class="grow"></span><button class="btn ghost" id="mic">🎤 말로 하기</button></div>
      </div>
      <div class="stack">
      <h2>무임승차 체크리스트</h2>
      <p class="muted small">해당하는 일이 몇 번 있었나요?</p>
      <div class="free" id="free"></div>
      <button class="btn primary big block" id="go">분석하기</button>
      </div>
    </section>`));
  const t = $('#t'), who = $('#who');
  t.value = st.text; who.value = st.who;
  const update = () => {
    const r = analyze(t.value);
    $('#g').style.width = r.score + '%';
    $('#g').style.background = `hsl(${40 - r.score * 0.4}, 90%, ${55 - r.score * 0.1}%)`;
    $('#label').textContent = angerLabel(r.score) + ' · ' + r.score;
    st.text = t.value; save();
  };
  t.oninput = update;
  who.oninput = () => { st.who = who.value.trim() || 'A팀원'; save(); };
  const free = $('#free');
  FREE.forEach(f => {
    const row = h(`<div class="frow"><span class="grow">${f.label}</span><button class="btn ghost step" data-nosfx data-d="-1" aria-label="${esc(f.label)} 하나 빼기">−</button><b class="n">${st.counts[f.id] || 0}</b><button class="btn ghost step" data-nosfx data-d="1" aria-label="${esc(f.label)} 하나 더하기">+</button></div>`);
    $$('.step', row).forEach(b => b.onclick = () => {
      st.counts[f.id] = clamp((st.counts[f.id] || 0) + Number(b.dataset.d), 0, 9);
      $('.n', row).textContent = st.counts[f.id]; save(); vibrate(10); Sfx.play('pop');
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

/* ---------- 슬라이드 테마 (화면·PPTX 공용 색) ---------- */
const THEMES = {
  navy: { name: '보고서', bg: '#ffffff', fg: '#1b1b22', head: '#1c2b5a', accent: '#e5484d', soft: '#f3f5fb', track: '#eef0f5', muted: '#6b6b76', concl: '#fff1f0', bar1: ['#ff9f0a', '#e5484d'], bar2: ['#6a7bd8', '#1c2b5a'], cover: ['#1c2b5a', '#31407a'], coverFg: '#ffffff', mix: ['#e5484d', '#8b8fa8', '#1c2b5a'] },
  mint: { name: '학회 발표', bg: '#fbfdfb', fg: '#17302a', head: '#0f766e', accent: '#d9480f', soft: '#ecf7f3', track: '#e1eee8', muted: '#5d7069', concl: '#fff4e6', bar1: ['#63c7a5', '#0f766e'], bar2: ['#f59f00', '#d9480f'], cover: ['#e6f4ef', '#c3e6d9'], coverFg: '#0f3d36', mix: ['#d9480f', '#7c9a91', '#0f766e'] },
  dark: { name: '투자 설명회', bg: '#15151d', fg: '#f2f2f7', head: '#ffd43b', accent: '#ff4d8d', soft: '#23232f', track: '#2c2c3a', muted: '#a0a0b4', concl: '#2d1c2c', bar1: ['#ff8fab', '#ff4d8d'], bar2: ['#74c0fc', '#4263eb'], cover: ['#0b0b12', '#2f1f47'], coverFg: '#ffffff', mix: ['#ff4d8d', '#a0a0b4', '#74c0fc'] }
};
const themeOf = () => THEMES[st.theme] ? st.theme : 'navy';
function themeVars(key) {
  const T = THEMES[key];
  return `--s-bg:${T.bg};--s-fg:${T.fg};--s-head:${T.head};--s-accent:${T.accent};--s-soft:${T.soft};--s-track:${T.track};--s-muted:${T.muted};--s-concl:${T.concl};` +
    `--s-bar1a:${T.bar1[0]};--s-bar1b:${T.bar1[1]};--s-bar2a:${T.bar2[0]};--s-bar2b:${T.bar2[1]};--s-cov1:${T.cover[0]};--s-cov2:${T.cover[1]};--s-covfg:${T.coverFg};` +
    `--s-mix1:${T.mix[0]};--s-mix2:${T.mix[1]};--s-mix3:${T.mix[2]}`;
}
function gradeOf(total) {
  return total >= 85 ? ['☢️', '팀플 핵폭발', '이 정도면 학과 전설로 남습니다']
    : total >= 65 ? ['🌋', '활화산 조장', '용암이 회의록을 덮기 직전']
    : total >= 40 ? ['♨️', '부글부글 견습생', '아직은 뚜껑이 닫혀 있어요']
    : total >= 15 ? ['☕', '미지근한 팀원', '커피 한 잔이면 식을 분노']
    : ['🧘', '팀플 해탈자', '부처님도 울고 갈 평온함'];
}

/* ---------- 분석 결과 묶음 ---------- */
function report() {
  const r = analyze(st.text);
  const fs = freeScore(st.counts);
  const today = new Date();
  const total = Math.round(r.score * 0.55 + fs * 0.45);
  return {
    r, fs, total,
    who: st.who || 'A팀원',
    date: `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`,
    hottest: maskSwear(maskNames(r.hottest, st.who)).slice(0, 80),
    bars: [['욕설', r.swear, 10], ['분노 표현', r.anger, 12], ['허탈·한숨', r.sad + r.sigh, 12], ['독박 표현', r.solo, 8], ['느낌표·물음표', r.bang, 20]],
    freeRows: FREE.filter(f => st.counts[f.id]).map(f => [f.label, st.counts[f.id]]),
    acts: Object.values(st.counts).reduce((a, b) => a + b, 0),
    verdict: total >= 70 ? '즉각적인 업무 재분배가 필요함' : total >= 40 ? '주의 관찰 대상으로 지정함' : '일단 한 번은 봐줄 수 있음'
  };
}
const SLIDE_COUNT = 6;

/* ---------- 분석 연출 ---------- */
Router.on('/analyze', root => {
  if (!st.text && !Object.values(st.counts).some(Boolean)) { Router.go('/vent'); return; }
  const D = report(), r = D.r;
  const steps = [
    ['욕설 성분 분석', `욕설 ${r.swear}건 검출 (결과물에서는 ●●)`],
    ['분노 표현 스캔', `분노 표현 ${r.anger}건 · 느낌표 ${r.bang}개`],
    ['한숨·허탈 농도 측정', `허탈 신호 ${r.sad + r.sigh}건`],
    ['독박 지수 계산', `"나만 했다" 계열 ${r.solo}건`],
    ['무임승차 계수 산출', `의심 행위 ${D.acts}건 → 지수 ${D.fs}`],
    ['발표자료 디자인', `${SLIDE_COUNT}장 생성 완료`]
  ];
  root.append(h(`
    <section class="analyzing">
      <div class="meter"><div class="mnum" id="num">0</div><div class="mlbl">분노 지수 측정 중</div></div>
      <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="분석 진행"><i id="pb"></i></div>
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
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    $('#num').textContent = Math.round(r.score * e);
    $('#pb').style.width = Math.round(p * 100) + '%';
    $('.pbar').setAttribute('aria-valuenow', Math.round(p * 100));
    $('#pct').textContent = Math.round(p * 100) + '%';
    if (p < 1) raf = requestAnimationFrame(tickNum);
  };
  raf = requestAnimationFrame(tickNum);
  const finish = () => { if (done) return; done = true; Sfx.play('win'); vibrate([20, 40, 20]); Router.go('/report'); };
  steps.forEach(([, res], k) => {
    timers.push(setTimeout(() => { lis[k].classList.add('on'); }, STEP * k));
    timers.push(setTimeout(() => { lis[k].classList.remove('on'); lis[k].classList.add('ok'); $('.res', lis[k]).textContent = res; Sfx.play('tick'); }, STEP * (k + 1) - 60));
  });
  timers.push(setTimeout(finish, dur + (Motion.reduced ? 100 : 500)));
  $('#skip').onclick = finish;
  return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
});

/* ---------- 발표자료 ---------- */
function buildSlides(D, th) {
  const r = D.r, who = esc(D.who), v = `style="${themeVars(th)}"`;
  const cls = `slide th-${th}`;
  const m = r.mix, hasMix = m.anger + m.sad + m.solo > 0;
  return [
    `<div class="${cls} s-cover" ${v}><div class="kicker">협업 실태 분석 보고서</div><div class="st">팀 프로젝트 무임승차의<br>구조적 원인과 대응 방안</div><div class="by">— ${who} 사례를 중심으로</div><div class="foot2">${D.date} · 발표자: 익명의 피해자</div></div>`,
    `<div class="${cls}" ${v}><div class="sh">01. 사건 개요</div><ul class="big">
       <li>제보 문장 <b>${r.sentences}</b>개, 총 <b>${st.text.length}</b>자 분량의 진술 확보</li>
       <li>무임승차 의심 행위 <b>${D.acts}</b>건 접수</li>
       <li>가장 강렬한 진술:<blockquote>“${esc(D.hottest) || '(진술 없음)'}”</blockquote></li></ul></div>`,
    `<div class="${cls}" ${v}><div class="sh">02. 감정 성분 분석</div><div class="split2">
       <div class="donut" style="--a:${m.anger};--b:${m.sad}"><div class="dh">${hasMix ? m.anger + '%' : '—'}<small>분노</small></div></div>
       <div><div class="legend">${[['분노', m.anger, 1], ['허탈', m.sad, 2], ['독박', m.solo, 3]].map(([l, x, k]) => `<div><i class="lg${k}"></i>${l} <b>${x}%</b></div>`).join('')}</div>
       <div class="kl" style="margin-top:2.4cqw">자주 나온 표현</div>
       <div class="words">${r.top.length ? r.top.map(([w, n]) => `<span>${esc(w)} ×${n}</span>`).join('') : '<span>특이 표현 없음</span>'}</div></div></div></div>`,
    `<div class="${cls}" ${v}><div class="sh">03. 분노 지수 분석</div><div class="split2">
       <div class="kpi"><div class="kv">${r.score}</div><div class="kl">분노 지수 / 100</div><div class="kt">${angerLabel(r.score)}</div></div>
       <div class="chart">${D.bars.map(([l, x, mx]) => `<div class="crow"><span>${l}</span><div class="cbar"><i style="width:${Math.min(100, x / mx * 100)}%"></i></div><b>${x}</b></div>`).join('')}</div></div></div>`,
    `<div class="${cls}" ${v}><div class="sh">04. 무임승차 행위 현황</div><div class="split2">
       <div class="kpi"><div class="kv">${D.fs}</div><div class="kl">무임승차 지수 / 100</div></div>
       <div class="chart">${D.freeRows.length ? D.freeRows.map(([l, x]) => `<div class="crow"><span>${esc(l)}</span><div class="cbar alt"><i style="width:${x / 9 * 100}%"></i></div><b>${x}회</b></div>`).join('') : '<p>접수된 행위 없음 (다행)</p>'}</div></div></div>`,
    `<div class="${cls} s-end" ${v}><div class="sh">05. 결론 및 제언</div>
       <div class="concl">종합 위험도 <b>${D.total}</b>점 — ${D.verdict}</div>
       <ul class="big"><li>${who}에게 커피 기프티콘 대신 <b>업무 분장표</b>를 보낼 것</li><li>회의록에 참석자 이름을 <b>굵게</b> 남길 것</li><li>그래도 우리는 <b>A+</b>를 받는다</li></ul>
       <div class="foot2">팀플 분노 측정기 · 본 자료는 풍자이며 실존 인물과 무관합니다</div></div>`
  ];
}

/* ---------- PPTX 내보내기 (PptxGenJS, 저장소에 함께 둔 파일을 필요할 때만 불러옴) ---------- */
const PPTX_URL = 'vendor/pptxgen.bundle.js';
async function exportPptx(D, th) {
  toast('PPTX를 만드는 중…');
  try { if (!window.PptxGenJS) await loadScript(PPTX_URL); } catch (e) { /* 아래에서 안내 */ }
  if (!window.PptxGenJS) { toast('PPTX 도구를 불러오지 못했어요. 이미지 저장을 이용해 주세요'); Sfx.play('bad'); return false; }
  try {
    const T = THEMES[th], c = x => x.replace('#', ''), F = 'Malgun Gothic', r = D.r;
    const p = new window.PptxGenJS();
    p.layout = 'LAYOUT_WIDE'; p.title = '협업 실태 분석 보고서'; p.company = '팀플 분노 측정기';
    const base = { fontFace: F, color: c(T.fg) };
    const head = (s, t) => {
      s.background = { color: c(T.bg) };
      s.addText(t, { ...base, x: .8, y: .45, w: 11.7, h: .8, fontSize: 28, bold: true, color: c(T.head) });
      s.addShape(p.ShapeType.rect, { x: .8, y: 1.25, w: 11.7, h: .05, fill: { color: c(T.head) }, line: { color: c(T.head) } });
      s.addText('팀플 분노 측정기 · 본 자료는 풍자이며 실존 인물과 무관합니다', { ...base, x: .8, y: 6.95, w: 11.7, h: .35, fontSize: 10, color: c(T.muted) });
    };
    const kpi = (s, val, lbl, sub) => {
      s.addText(String(val), { ...base, x: .8, y: 1.9, w: 4.2, h: 2.2, fontSize: 110, bold: true, color: c(T.accent), align: 'center' });
      s.addText(lbl, { ...base, x: .8, y: 4.1, w: 4.2, h: .5, fontSize: 16, color: c(T.muted), align: 'center' });
      if (sub) s.addText(sub, { ...base, x: .8, y: 4.6, w: 4.2, h: .6, fontSize: 22, bold: true, align: 'center' });
    };
    const bar = (s, labels, values, color) => s.addChart(p.ChartType.bar, [{ name: '건수', labels, values }], {
      x: 5.4, y: 1.6, w: 7.1, h: 5, barDir: 'bar', chartColors: [c(color)], showValue: true, dataLabelColor: c(T.fg), dataLabelFontSize: 14,
      catAxisLabelColor: c(T.fg), catAxisLabelFontFace: F, catAxisLabelFontSize: 16, catAxisOrientation: 'maxMin', valAxisHidden: true, valGridLine: { style: 'none' }, barGapWidthPct: 60
    });
    // 표지
    let s = p.addSlide();
    s.background = { color: c(T.cover[0]) };
    s.addText('협업 실태 분석 보고서', { ...base, x: .9, y: 1.9, w: 11.5, h: .5, fontSize: 16, color: c(T.coverFg), charSpacing: 6 });
    s.addText('팀 프로젝트 무임승차의\n구조적 원인과 대응 방안', { ...base, x: .9, y: 2.5, w: 11.5, h: 2, fontSize: 42, bold: true, color: c(T.coverFg) });
    s.addText(`— ${D.who} 사례를 중심으로`, { ...base, x: .9, y: 4.5, w: 11.5, h: .6, fontSize: 20, color: c(T.coverFg) });
    s.addText(`${D.date} · 발표자: 익명의 피해자`, { ...base, x: .9, y: 6.6, w: 11.5, h: .4, fontSize: 12, color: c(T.coverFg) });
    // 01 개요
    s = p.addSlide(); head(s, '01. 사건 개요');
    s.addText([
      { text: `제보 문장 ${r.sentences}개, 총 ${st.text.length}자 분량의 진술 확보`, options: { bullet: true, breakLine: true } },
      { text: `무임승차 의심 행위 ${D.acts}건 접수`, options: { bullet: true, breakLine: true } },
      { text: '가장 강렬한 진술:', options: { bullet: true } }
    ], { ...base, x: .8, y: 1.6, w: 11.7, h: 2.2, fontSize: 22, paraSpaceAfter: 10, valign: 'top' });
    s.addShape(p.ShapeType.rect, { x: 1.1, y: 4.0, w: .1, h: 1.4, fill: { color: c(T.accent) }, line: { color: c(T.accent) } });
    s.addText(`“${D.hottest || '(진술 없음)'}”`, { ...base, x: 1.2, y: 4.0, w: 11, h: 1.4, fontSize: 20, fill: { color: c(T.soft) }, margin: 14 });
    // 02 감정 성분
    s = p.addSlide(); head(s, '02. 감정 성분 분석');
    const m = r.mix;
    if (m.anger + m.sad + m.solo > 0) {
      s.addChart(p.ChartType.doughnut, [{ name: '감정 성분', labels: ['분노', '허탈', '독박'], values: [m.anger, m.sad, m.solo] }], {
        x: .8, y: 1.6, w: 5.4, h: 5, holeSize: 55, chartColors: T.mix.map(c), showPercent: true, showLegend: true, legendPos: 'b',
        legendFontFace: F, legendFontSize: 14, legendColor: c(T.fg), dataLabelColor: 'FFFFFF', dataLabelFontSize: 14
      });
    } else s.addText('감정 표현이 거의 없어요', { ...base, x: .8, y: 3.4, w: 5.4, h: .8, fontSize: 22, align: 'center', color: c(T.muted) });
    s.addText('자주 나온 표현', { ...base, x: 6.8, y: 1.9, w: 5.7, h: .5, fontSize: 16, color: c(T.muted) });
    s.addText(r.top.length ? r.top.map(([w, n]) => ({ text: `${w}  ×${n}`, options: { bullet: true, breakLine: true } })) : '특이 표현 없음', { ...base, x: 6.8, y: 2.5, w: 5.7, h: 3.6, fontSize: 22, valign: 'top' });
    // 03 분노 지수
    s = p.addSlide(); head(s, '03. 분노 지수 분석');
    kpi(s, r.score, '분노 지수 / 100', angerLabel(r.score));
    bar(s, D.bars.map(b => b[0]), D.bars.map(b => b[1]), T.bar1[1]);
    // 04 무임승차
    s = p.addSlide(); head(s, '04. 무임승차 행위 현황');
    kpi(s, D.fs, '무임승차 지수 / 100');
    if (D.freeRows.length) bar(s, D.freeRows.map(f => f[0]), D.freeRows.map(f => f[1]), T.bar2[1]);
    else s.addText('접수된 행위 없음 (다행)', { ...base, x: 5.4, y: 3.4, w: 7.1, h: .8, fontSize: 22 });
    // 05 결론
    s = p.addSlide(); head(s, '05. 결론 및 제언');
    s.addText([{ text: '종합 위험도 ' }, { text: `${D.total}점`, options: { bold: true, color: c(T.accent), fontSize: 32 } }, { text: ` — ${D.verdict}` }],
      { ...base, x: .8, y: 1.6, w: 11.7, h: 1.1, fontSize: 24, fill: { color: c(T.concl) }, margin: 14 });
    s.addText([
      { text: `${D.who}에게 커피 기프티콘 대신 업무 분장표를 보낼 것`, options: { bullet: true, breakLine: true } },
      { text: '회의록에 참석자 이름을 굵게 남길 것', options: { bullet: true, breakLine: true } },
      { text: '그래도 우리는 A+를 받는다', options: { bullet: true, bold: true } }
    ], { ...base, x: .8, y: 3.0, w: 11.7, h: 3, fontSize: 24, paraSpaceAfter: 12, valign: 'top' });
    const blob = await p.write({ outputType: 'blob' });
    download(blob, `팀플-분석-보고서-${THEMES[th].name.replace(/\s/g, '')}.pptx`);
    toast('PPTX를 저장했어요. 파워포인트·키노트·구글 슬라이드에서 열 수 있어요');
    Sfx.play('ok');
    return true;
  } catch (e) {
    console.error(e);
    toast('PPTX를 만들지 못했어요. 이미지 저장을 이용해 주세요');
    Sfx.play('bad');
    return false;
  }
}

/* ---------- 결과 카드 (원문·호칭 없이 점수만) ---------- */
function cardData(D) { return { a: D.r.score, f: D.fs, t: D.total, m: [D.r.mix.anger, D.r.mix.sad, D.r.mix.solo] }; }
function cardHtml(C) {
  const [em, title, sub] = gradeOf(C.t);
  const row = (l, x, k) => `<div class="rc-row"><span>${l}</span><div class="rc-bar k${k}"><i style="width:${x}%"></i></div><b>${x}</b></div>`;
  const hasMix = C.m[0] + C.m[1] + C.m[2] > 0;
  return `<div class="rcard" id="rcard">
    <div class="rc-top">🌡️ 팀플 분노 측정 결과</div>
    <div class="rc-grade"><span class="rc-em">${em}</span><div><div class="rc-lv">종합 위험도 ${C.t}점</div><b class="rc-title">${title}</b><div class="rc-sub">${sub}</div></div></div>
    ${row('분노 지수', C.a, 1)}${row('무임승차', C.f, 2)}
    <div class="rc-mixl">감정 성분</div>
    <div class="rc-mix">${hasMix ? `<i class="m1" style="width:${C.m[0]}%"></i><i class="m2" style="width:${C.m[1]}%"></i><i class="m3" style="width:${C.m[2]}%"></i>` : '<i class="m0" style="width:100%"></i>'}</div>
    <div class="rc-leg"><span><i class="m1"></i>분노 ${C.m[0]}%</span><span><i class="m2"></i>허탈 ${C.m[1]}%</span><span><i class="m3"></i>독박 ${C.m[2]}%</span></div>
    <div class="rc-foot">km-crew.github.io/rant-meter · 풍자용 · 원문은 담기지 않아요</div>
  </div>`;
}
function cardLink(C) { return location.href.split('#')[0] + '#/card?d=' + encodeData(C); }
function shareCard(C) {
  const [em, title] = gradeOf(C.t);
  shareText('팀플 분노 측정기', `${em} 내 팀플 분노 등급: ${title} (종합 ${C.t}점 · 분노 ${C.a} · 무임승차 ${C.f})\n너도 측정해 봐 👇`, cardLink(C));
}
function readCard(params) {
  const d = decodeData(params.get('d') || '');
  if (!d || typeof d !== 'object') return null;
  const n = x => clamp(Math.round(Number(x) || 0), 0, 100);
  const m = Array.isArray(d.m) ? d.m.slice(0, 3).map(n) : [0, 0, 0];
  while (m.length < 3) m.push(0);
  return { a: n(d.a), f: n(d.f), t: n(d.t), m };
}

Router.on('/report', root => {
  if (!st.text && !Object.values(st.counts).some(Boolean)) { Router.go('/vent'); return; }
  const D = report();
  let th = themeOf();
  let slides = buildSlides(D, th);
  let i = 0;
  root.classList.add('wide');
  root.append(h(`
    <section class="stack">
      <div class="row"><h2 style="margin:0">발표자료</h2><span class="grow"></span><span class="muted small" id="pg"></span></div>
      <div class="row themes" role="group" aria-label="슬라이드 테마"><span class="small muted">테마</span>${Object.entries(THEMES).map(([k, T]) => `<button class="chip th" data-th="${k}" aria-pressed="${k === th}"><i style="background:linear-gradient(135deg,${T.cover[0]},${T.accent})"></i>${T.name}</button>`).join('')}</div>
      <div class="viewer" id="viewer"><div id="stage"></div></div>
      <p class="muted small center">슬라이드 클릭·Space·→ 다음 장 / ← 이전 장 / ⛶ 전체 화면(Esc로 나가기)</p>
      <div class="row"><button class="btn grow" id="prev">← 이전</button><button class="btn grow" id="next">다음 →</button><button class="btn" id="fs" title="전체 화면">⛶</button></div>
      <div class="row"><button class="btn primary grow" id="pptx">📊 PPTX 내려받기</button><button class="btn grow" id="save">이 장 이미지</button><button class="btn grow" id="saveall">전체 이미지</button></div>
      <div class="cardsec">
        <h2>결과 카드</h2>
        <p class="muted small">원문과 호칭은 빼고 점수만 담아요. 링크를 받은 친구는 카드만 볼 수 있어요.</p>
        <div id="cardwrap">${cardHtml(cardData(D))}</div>
        <div class="row"><button class="btn primary grow" id="share">결과 공유하기</button><button class="btn grow" id="savecard">카드 이미지 저장</button></div>
      </div>
      <a class="btn ghost block" href="#/vent">← 내용 고치기</a>
    </section>`));
  const stage = $('#stage');
  const show = () => { stage.innerHTML = slides[i]; $('#pg').textContent = `${i + 1} / ${slides.length}`; };
  const move = d => { const j = clamp(i + d, 0, slides.length - 1); if (j !== i) Sfx.play('whoosh'); i = j; show(); };
  $$('.th').forEach(b => b.onclick = () => {
    th = b.dataset.th; st.theme = th; save();
    $$('.th').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    slides = buildSlides(D, th); show();
  });
  $('#prev').onclick = () => move(-1);
  $('#next').onclick = () => move(1);
  $('#fs').onclick = () => { const v = $('#viewer'); (v.requestFullscreen || v.webkitRequestFullscreen || (() => {})).call(v); };
  $('#save').onclick = () => saveImage($('.slide', stage), `report-${i + 1}.png`);
  $('#saveall').onclick = async () => {
    const keep = i;
    for (let k = 0; k < slides.length; k++) { i = k; show(); await saveImage($('.slide', stage), `report-${k + 1}.png`); }
    i = keep; show();
  };
  $('#pptx').onclick = async () => { const b = $('#pptx'); b.disabled = true; await exportPptx(D, th); b.disabled = false; };
  $('#share').onclick = () => shareCard(cardData(D));
  $('#savecard').onclick = () => saveImage($('#rcard'), 'rant-card.png');
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

/* ---------- 공유받은 결과 카드 ---------- */
Router.on('/card', (root, params) => {
  const C = readCard(params);
  if (!C) { toast('결과 카드 링크가 올바르지 않아요'); Router.go('/'); return; }
  root.append(h(`
    <section class="split center">
      <div class="stack">
        <h1>친구의 팀플 분노 결과</h1>
        <p class="muted">점수만 담긴 카드예요. 무슨 일이 있었는지는 비밀!</p>
        <a class="btn primary big block" href="#/vent">나도 측정하기</a>
        <button class="btn block" id="savecard">카드 이미지 저장</button>
      </div>
      <div>${cardHtml(C)}</div>
    </section>`));
  $('#savecard').onclick = () => saveImage($('#rcard'), 'rant-card.png');
});

Router.start($('#app'));
