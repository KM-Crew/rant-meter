/* 팀플 분노 측정기 — 하소연을 수치로, 수치를 발표자료로
   입력한 글은 이 브라우저 안에서만 분석하고 저장·전송하지 않습니다.
   실명은 자동으로 "A팀원"으로 바꾸고, 욕설은 결과물에서 ●●로 가립니다. */
'use strict';

const SWEAR = ['씨발', '시발', '씨팔', 'ㅅㅂ', 'ㅆㅂ', '개새', '새끼', '병신', 'ㅂㅅ', '존나', 'ㅈㄴ', '졸라', '지랄', 'ㅈㄹ', '썅', '미친놈', '미친년', '미친', 'ㅁㅊ', '또라이', '돌아이', '꺼져', '닥쳐', '개빡', '좆', '염병', '등신', '멍청이', '쓰레기'];
const ANGER = ['짜증', '화나', '화가', '열받', '열 받', '빡치', '빡쳐', '빡침', '미치겠', '답답', '어이없', '어이가 없', '기가 막', '황당', '왜 이래', '도대체', '진짜', '정말', '제발', '한숨', '하..', '하...', '아오', '으악', '억울', '최악', '대체'];
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
const save = () => store.sset('rm-state', st);

function maskNames(text, who) {
  // "철수씨", "민지 선배", "영희가" 같이 이름 + 호칭 패턴을 호칭명으로 바꿈
  return text.replace(new RegExp('([가-힣]{2,3})\\s?' + HONORIFIC, 'g'), (m, name, suf) => {
    if (/^(팀원|우리|그냥|진짜|정말|이건|저건|그건|교수|조장|팀장)/.test(name)) return m;
    const particle = { '이가': '이', '이는': '은', '이랑': '이랑', '이한테': '한테', '이도': '도' };
    return who + (particle[suf] || '');
  });
}
function maskSwear(text) {
  let out = text;
  SWEAR.forEach(w => { out = out.split(w).join('●'.repeat(Math.min(w.length, 3))); });
  return out;
}
function countOf(text, words) { return words.reduce((n, w) => n + (text.split(w).length - 1), 0); }

function analyze(text) {
  const swear = countOf(text, SWEAR);
  const anger = countOf(text, ANGER);
  const bang = (text.match(/[!?]/g) || []).length;
  const sigh = (text.match(/(하+\.{2,}|ㅠ+|ㅜ+|…)/g) || []).length;
  const caps = (text.match(/(.)\1{3,}/g) || []).length;
  const raw = swear * 14 + anger * 6 + bang * 2.5 + sigh * 3 + caps * 4 + text.length * 0.04;
  const score = Math.round(100 * (1 - Math.exp(-raw / 70)));
  const sentences = text.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 1);
  let hottest = sentences[0] || '';
  let best = -1;
  sentences.forEach(s => { const v = countOf(s, SWEAR) * 3 + countOf(s, ANGER) + (s.match(/!/g) || []).length; if (v > best) { best = v; hottest = s; } });
  return { swear, anger, bang, sigh, score, sentences: sentences.length, hottest };
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

/* ---------- 분석 연출 ---------- */
Router.on('/analyze', root => {
  const steps = ['욕설 성분 분석 중…', '한숨 농도 측정 중…', '무임승차 계수 산출 중…', '발표자료 디자인 중…'];
  root.append(h(`<section class="analyzing"><div class="spinner"></div><p id="s">${steps[0]}</p></section>`));
  let k = 0;
  const id = setInterval(() => {
    if (++k < steps.length) $('#s').textContent = steps[k];
    else { clearInterval(id); Router.go('/report'); }
  }, 750);
  return () => clearInterval(id);
});

/* ---------- 발표자료 ---------- */
function buildSlides() {
  const masked = maskSwear(maskNames(st.text, st.who));
  const r = analyze(st.text);
  const fs = freeScore(st.counts);
  const who = esc(st.who);
  const today = new Date();
  const date = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  const hottest = esc(maskSwear(maskNames(r.hottest, st.who))).slice(0, 80);
  const bars = [
    ['욕설', r.swear, 10], ['분노 표현', r.anger, 12], ['느낌표·물음표', r.bang, 20], ['한숨', r.sigh, 10]
  ];
  const freeRows = FREE.filter(f => st.counts[f.id]).map(f => [f.label, st.counts[f.id]]);
  const total = Math.round(r.score * 0.55 + fs * 0.45);
  const verdict = total >= 70 ? '즉각적인 업무 재분배가 필요함' : total >= 40 ? '주의 관찰 대상으로 지정함' : '일단 한 번은 봐줄 수 있음';
  return [
    `<div class="slide s-cover"><div class="kicker">협업 실태 분석 보고서</div><div class="st">팀 프로젝트 무임승차의<br>구조적 원인과 대응 방안</div><div class="by">— ${who} 사례를 중심으로</div><div class="foot2">${date} · 발표자: 익명의 피해자</div></div>`,
    `<div class="slide"><div class="sh">01. 사건 개요</div><ul class="big">
       <li>제보 문장 <b>${r.sentences}</b>개, 총 <b>${st.text.length}</b>자 분량의 진술 확보</li>
       <li>무임승차 의심 행위 <b>${Object.values(st.counts).reduce((a, b) => a + b, 0)}</b>건 접수</li>
       <li>가장 강렬한 진술:<blockquote>“${hottest || '(진술 없음)'}”</blockquote></li></ul></div>`,
    `<div class="slide"><div class="sh">02. 분노 지수 분석</div><div class="split2">
       <div class="kpi"><div class="kv">${r.score}</div><div class="kl">분노 지수 / 100</div><div class="kt">${angerLabel(r.score)}</div></div>
       <div class="chart">${bars.map(([l, v, m]) => `<div class="crow"><span>${l}</span><div class="cbar"><i style="width:${Math.min(100, v / m * 100)}%"></i></div><b>${v}</b></div>`).join('')}</div></div></div>`,
    `<div class="slide"><div class="sh">03. 무임승차 행위 현황</div><div class="split2">
       <div class="kpi"><div class="kv">${fs}</div><div class="kl">무임승차 지수 / 100</div></div>
       <div class="chart">${freeRows.length ? freeRows.map(([l, v]) => `<div class="crow"><span>${esc(l)}</span><div class="cbar alt"><i style="width:${v / 9 * 100}%"></i></div><b>${v}회</b></div>`).join('') : '<p>접수된 행위 없음 (다행)</p>'}</div></div></div>`,
    `<div class="slide s-end"><div class="sh">04. 결론 및 제언</div>
       <div class="concl">종합 위험도 <b>${total}</b>점 — ${verdict}</div>
       <ul class="big"><li>${who}에게 커피 기프티콘 대신 <b>업무 분장표</b>를 보낼 것</li><li>회의록에 참석자 이름을 <b>굵게</b> 남길 것</li><li>그래도 우리는 <b>A+</b>를 받는다</li></ul>
       <div class="foot2">팀플 분노 측정기 · 본 자료는 풍자이며 실존 인물과 무관합니다</div></div>`
  ];
}
Router.on('/report', root => {
  if (!st.text && !Object.values(st.counts).some(Boolean)) { Router.go('/vent'); return; }
  const slides = buildSlides();
  let i = 0;
  root.classList.add('wide');
  root.append(h(`
    <section class="stack">
      <div class="row"><h2 style="margin:0">발표자료</h2><span class="grow"></span><span class="muted small" id="pg"></span></div>
      <div class="viewer" id="viewer"><div id="stage"></div></div>
      <p class="muted small center">슬라이드 클릭·Space·→ 다음 장 / ← 이전 장 / ⛶ 전체 화면(Esc로 나가기)</p>
      <div class="row"><button class="btn grow" id="prev">← 이전</button><button class="btn grow" id="next">다음 →</button><button class="btn" id="fs">⛶</button></div>
      <div class="row"><button class="btn primary grow" id="save">이 장 이미지 저장</button><button class="btn grow" id="saveall">전체 저장</button></div>
      <a class="btn ghost block" href="#/vent">← 내용 고치기</a>
    </section>`));
  const stage = $('#stage');
  const show = () => { stage.innerHTML = slides[i]; $('#pg').textContent = `${i + 1} / ${slides.length}`; };
  const move = d => { i = clamp(i + d, 0, slides.length - 1); show(); };
  $('#prev').onclick = () => move(-1);
  $('#next').onclick = () => move(1);
  $('#fs').onclick = () => { const v = $('#viewer'); (v.requestFullscreen || v.webkitRequestFullscreen || (() => {})).call(v); };
  $('#save').onclick = () => saveImage($('.slide', stage), `report-${i + 1}.png`);
  $('#saveall').onclick = async () => {
    const keep = i;
    for (let k = 0; k < slides.length; k++) { i = k; show(); await saveImage($('.slide', stage), `report-${k + 1}.png`); }
    i = keep; show();
  };
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

Router.start($('#app'));
