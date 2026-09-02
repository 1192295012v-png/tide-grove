/* =========================================================
   main.js — 潮森 Tide & Grove 交互主程序
   ========================================================= */
(function () {
  'use strict';

  var D = window.TG_DATA;
  var state = D.load();
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad2 = function (n) { return n < 10 ? '0' + n : '' + n; };
  var ymd = function (y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); };

  /* =======================================================
     1. 光标光晕 & 滚动
     ======================================================= */
  var glow = $('#cursorGlow');
  var dot = $('#cursorDot');
  var HOT = 'a,button,input,select,textarea,.ritual,.day:not(.is-pad),.rcard,.pcard,[role="tab"]';

  if (glow && dot && window.matchMedia('(hover:hover)').matches) {
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2, tx = gx, ty = gy;
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      dot.classList.add('is-on');
      // 精确光标不做缓动，必须立刻跟手，否则等于没有光标
      dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
    }, { passive: true });
    window.addEventListener('mousedown', function () { dot.classList.add('is-down'); });
    window.addEventListener('mouseup', function () { dot.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { dot.classList.remove('is-on'); });
    // 悬停在可交互元素上时放大成环，提供明确的点击反馈
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(HOT)) dot.classList.add('is-hot');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(HOT)) dot.classList.remove('is-hot');
    });
    (function loop() {
      gx += (tx - gx) * 0.075; gy += (ty - gy) * 0.075;
      glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
      requestAnimationFrame(loop);
    })();
  } else {
    if (glow) glow.style.display = 'none';
    if (dot) dot.style.display = 'none';
    // 触屏/无悬停设备恢复系统光标
    document.body.style.cursor = 'auto';
  }

  var nav = $('#nav'), scrollBar = $('#scrollBar');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('is-stuck', y > 40);
    if (scrollBar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 导航高亮 */
  var navLinks = $$('#navLinks a');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var i = sections.indexOf(en.target);
      navLinks.forEach(function (a, k) { a.classList.toggle('is-active', k === i); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function (s) { if (s) navObserver.observe(s); });

  /* =======================================================
     2. Hero 海洋背景（Canvas 程序化生成）
     ======================================================= */
  (function ocean() {
    var cv = $('#oceanCanvas');
    if (!cv) return;
    var ctx = cv.getContext && cv.getContext('2d');
    // 不支持 canvas 时静默降级，绝不能阻断后续模块渲染
    if (!ctx) { cv.style.display = 'none'; return; }
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [], rays = [], t = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    function resize() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      var n = Math.round(Math.min(120, W / 16));
      particles = [];
      for (var i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.6 + Math.random() * 2.2,
          sp: 0.12 + Math.random() * 0.5,
          drift: (Math.random() - 0.5) * 0.28,
          a: 0.12 + Math.random() * 0.5,
          ph: Math.random() * Math.PI * 2
        });
      }
      rays = [];
      for (var j = 0; j < 7; j++) {
        rays.push({ x: W * (0.06 + j * 0.15) + Math.random() * 60, w: 40 + Math.random() * 120, a: 0.03 + Math.random() * 0.05, ph: Math.random() * 6.28 });
      }
    }

    function wave(yBase, amp, len, speed, color, lw) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 12) {
        var y = yBase
          + Math.sin((x / len) + t * speed) * amp
          + Math.sin((x / (len * 0.45)) - t * speed * 1.6) * amp * 0.34;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
    }

    window.__oceanActive = true;
    function frame() {
      if (!window.__oceanActive) return; // 视频播放后彻底停止 Canvas 动画，节省 GPU
      if (!reduce) t += 0.012;
      ctx.clearRect(0, 0, W, H);

      // 水体渐变
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(10,58,84,0.55)');
      g.addColorStop(0.45, 'rgba(7,38,58,0.35)');
      g.addColorStop(1, 'rgba(4,18,31,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // 光柱
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      rays.forEach(function (r) {
        var sway = Math.sin(t * 0.4 + r.ph) * 26;
        var lg = ctx.createLinearGradient(r.x + sway, 0, r.x + sway - 90, H * 0.95);
        lg.addColorStop(0, 'rgba(126,232,255,' + r.a + ')');
        lg.addColorStop(1, 'rgba(126,232,255,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(r.x + sway, -20);
        ctx.lineTo(r.x + sway + r.w * 0.35, -20);
        ctx.lineTo(r.x + sway - 120 + r.w, H);
        ctx.lineTo(r.x + sway - 180, H);
        ctx.closePath(); ctx.fill();
      });

      // 海雪粒子
      particles.forEach(function (p) {
        p.y -= p.sp; p.x += Math.sin(t * 1.2 + p.ph) * p.drift;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        if (p.x < -8) p.x = W + 8; else if (p.x > W + 8) p.x = -8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = 'rgba(180,240,255,' + p.a + ')';
        ctx.fill();
      });
      ctx.restore();

      // 波浪线
      wave(H * 0.42, 26, 340, 0.6, 'rgba(79,227,209,0.16)', 1.4);
      wave(H * 0.56, 18, 260, -0.8, 'rgba(74,168,255,0.14)', 1.2);
      wave(H * 0.72, 30, 420, 0.45, 'rgba(110,231,168,0.10)', 1.2);
      wave(H * 0.88, 22, 300, -0.55, 'rgba(126,232,255,0.09)', 1);

      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    resize(); frame();
  })();

  /* 视频层：能播放即作为背景淡入；失败才保留 Canvas 兜底层 */
  (function video() {
    var v = $('#heroVideo');
    var media = $('.hero__media');
    if (!v) return;
    var src = (v.querySelector('source') || {}).src || '';
    function show() {
      v.classList.add('is-on');
      if (media) media.classList.add('has-video');
      // 视频已能播放，停止程序化 Canvas 动画以释放 GPU
      if (typeof window.__oceanActive !== 'undefined') window.__oceanActive = false;
    }
    // 多个事件兜底，避免某些浏览器 canplay 不触发导致视频永远透明
    v.addEventListener('canplay', show);
    v.addEventListener('loadeddata', show);
    v.addEventListener('playing', show);
    v.addEventListener('error', function () { v.style.display = 'none'; });
    if (!src) return; // 无文件时静默保留 Canvas 背景
    try {
      // 静音自动播放策略较宽松，但仍需显式 muted + playsinline
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) { /* 环境不支持自动播放，保持 Canvas 背景 */ }
  })();

  /* =======================================================
     3. 进场动画
     ======================================================= */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach(function (el) { revealObserver.observe(el); });

  /* 数字滚动 */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var start = performance.now(), dur = 1500;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  /* ---------- 星章流水：驱动「实时潮位」与「本周星章」 ---------- */
  function pad2w(n) { return n < 10 ? '0' + n : '' + n; }
  function weekKey(d) {
    // ISO 周（周一起算），返回 'YYYY-Www'
    var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = dt.getDay() || 7;
    dt.setDate(dt.getDate() + 4 - day);          // 移到本周的星期四
    var y = dt.getFullYear();
    var diff = Math.round((dt - new Date(y, 0, 1)) / 86400000);
    return y + '-W' + pad2w(Math.floor(diff / 7) + 1);
  }
  function weekStart(d) {
    var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    dt.setDate(dt.getDate() - ((dt.getDay() || 7) - 1));
    return dt;
  }
  function starLog() {
    if (!Array.isArray(state.starLog)) state.starLog = [];
    return state.starLog;
  }
  function logStar(lv, n, src) {
    var now = new Date();
    starLog().push({
      w: weekKey(now),
      d: ymd(now.getFullYear(), now.getMonth(), now.getDate()),
      lv: lv, n: n, t: now.toISOString(), src: src || ''
    });
  }
  function starsOfWeek(key) {
    return starLog().reduce(function (s, e) { return s + (e.w === key ? e.n : 0); }, 0);
  }
  function starsOnDay(key) {
    return starLog().reduce(function (s, e) { return s + (e.d === key ? e.n : 0); }, 0);
  }
  function rewardOfLevel(lv) {
    var list = state.rewards.filter(function (r) { return r.level === lv; });
    return list[0] || null;
  }
  /* 勾选 / 取消日常目标 → 对应等级星章 +1 / −1（撤销时不足则忽略） */
  function syncStarByGoal(lv, sign) {
    var rw = rewardOfLevel(lv);
    if (!rw) return false;
    if (sign > 0) { rw.count += 1; logStar(lv, 1, 'goal'); return true; }
    if (rw.count > 0) { rw.count -= 1; logStar(lv, -1, 'goal'); return true; }
    return false;
  }

  /* Hero 统计：全部由真实数据推导，避免与下方模块显示的数字互相打脸 */
  var booted = false;
  function heroStatValues() {
    var stars = state.rewards.reduce(function (s, r) { return s + r.count; }, 0);
    var goals = 0, done = 0;
    D.MEMBERS.forEach(function (m) {
      var gp = state.goals[m.id];
      if (!gp) return;
      goals += gp.list.length;
      done += gp.list.filter(function (i) { return i.done; }).length;
    });
    var events = D.MEMBERS.reduce(function (s, m) {
      return s + Object.keys(state.events[m.id] || {}).length;
    }, 0);
    return {
      stars: stars,
      goals: goals,
      rate: goals ? Math.round((done / goals) * 100) : 0,
      events: events
    };
  }
  function paintHeroStats(animate) {
    var v = heroStatValues();
    $$('.hero__stats .num').forEach(function (el) {
      var val = v[el.getAttribute('data-k')];
      if (val == null) return;
      if (animate) { el.setAttribute('data-count', val); countUp(el); }
      else if (booted) { el.textContent = val; }
    });
  }
  if ($$('.hero__stats .num').length) {
    setTimeout(function () { booted = true; paintHeroStats(true); }, 500);
  }

  /* =======================================================
     4. 奖励模块
     ======================================================= */
  function starSVG() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.7l-5.9 3.1 1.2-6.6L2.5 9.6l6.6-.9L12 2.6z"/></svg>';
  }

  function renderRewards() {
    var wrap = $('#rewardGrid');
    if (!wrap) return;
    wrap.innerHTML = state.rewards.map(function (r) {
      var stars = '';
      for (var i = 0; i < r.level; i++) stars += starSVG();
      var pct = Math.min(100, Math.round((r.count / r.target) * 100));
      return '' +
        '<article class="rcard" style="--accent:' + r.accent + '" data-id="' + r.id + '">' +
          '<div class="rcard__top">' +
            '<div class="rcard__stars">' + stars + '</div>' +
            '<span class="rcard__tag">' + r.level + ' STAR</span>' +
          '</div>' +
          '<h3 class="rcard__name" data-edit="data-reward-' + r.id + '-name" tabindex="0" aria-describedby="tip-' + r.id + '">' + r.name + '</h3>' +
          '<p class="rcard__en" data-edit="data-reward-' + r.id + '-en">' + r.en + '</p>' +
          '<div class="rcard__count"><b>' + r.count + '</b><span>' + r.unit + '</span></div>' +
          '<div class="rcard__meter"><i data-pct="' + pct + '"></i></div>' +
          '<div class="rcard__ctrl">' +
            '<button type="button" class="rcard__exchange" data-act="exchange">兑换</button>' +
          '</div>' +
          '<div class="rcard__reveal" id="tip-' + r.id + '" role="tooltip">' +
            '<h4>星章说明</h4>' +
            '<p data-edit="data-reward-' + r.id + '-desc">' + r.desc + '</p>' +
            '<ul class="path">' +
              r.path.map(function (p, pi) { return '<li><b data-edit="data-reward-' + r.id + '-path' + pi + '-k">' + p.k + '</b><span data-edit="data-reward-' + r.id + '-path' + pi + '-v">' + p.v + '</span></li>'; }).join('') +
            '</ul>' +
          '</div>' +
        '</article>';
    }).join('');

    // 鼠标跟随光斑
    $$('.rcard', wrap).forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var b = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - b.left) / b.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - b.top) / b.height) * 100 + '%');
      });
      card.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn || btn.getAttribute('data-act') !== 'exchange') return;
        var id = card.getAttribute('data-id');
        var rw = state.rewards.filter(function (x) { return x.id === id; })[0];
        if (rw) openExchange(rw);
      });
    });

    /* 说明只在鼠标停在星章「名称」上时出现，一移开立刻收起 */
    $$('.rcard__name', wrap).forEach(function (nm) {
      var card = nm.closest('.rcard');
      if (!card) return;
      var show = function () { card.classList.add('is-tip'); };
      var hide = function () { card.classList.remove('is-tip'); };
      nm.addEventListener('mouseenter', show);
      nm.addEventListener('mouseleave', hide);
      nm.addEventListener('focus', show);
      nm.addEventListener('blur', hide);
      // 触屏 / 无悬停设备：点一下也能看
      nm.addEventListener('click', function () { card.classList.toggle('is-tip'); });
    });

    // 进度条动画
    requestAnimationFrame(function () {
      $$('.rcard__meter i', wrap).forEach(function (i) { i.style.width = i.getAttribute('data-pct') + '%'; });
    });

  }

  function updateWallet() {
    var el = $('#starValue');
    if (!el) return;
    var total = state.rewards.reduce(function (s, r) { return s + r.count * r.level; }, 0);
    el.textContent = total;
  }

  /* 星章兑换：扣除数量并登记用途 */
  var exModal = $('#exchangeModal');
  var exCtx = { rw: null };
  function openExchange(rw) {
    if (!exModal) return;
    exCtx.rw = rw;
    $('#exWho').textContent = rw.name + ' · ' + rw.level + ' 星';
    $('#exQty').value = '1';
    $('#exUse').value = '';
    exModal.hidden = false;
    setTimeout(function () { var i = $('#exQty'); if (i) i.focus(); }, 60);
  }
  function closeExchange() { if (exModal) exModal.hidden = true; }
  if (exModal) {
    $$('[data-exclose]', exModal).forEach(function (el) { el.addEventListener('click', closeExchange); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !exModal.hidden) closeExchange();
    });
    $('#exConfirm').addEventListener('click', function () {
      var rw = exCtx.rw;
      if (!rw) return closeExchange();
      var qty = parseInt($('#exQty').value, 10);
      var use = $('#exUse').value.trim();
      if (!qty || qty < 1) { window.alert('请输入有效的兑换数量'); return; }
      if (qty > rw.count) { window.alert('当前星章数量不足，最多可兑换 ' + rw.count + ' 枚'); return; }
      if (!use) { window.alert('请填写兑换用途'); return; }
      rw.count -= qty;
      logStar(rw.level, -qty, 'exchange');
      if (!state.exchanges) state.exchanges = [];
      state.exchanges.push({ level: rw.level, name: rw.name, qty: qty, use: use, at: new Date().toISOString() });
      D.save(state);
      closeExchange();
      renderRewards();
      updateWallet();
      paintHeroStats(false);
      paintTide();
      paintBars();
    });
  }

  /* =======================================================
     5. 日常目标
     ======================================================= */
  var weekSwitch = $('#weekSwitch');
  var currentWeek = 0;

  function goalBucket(mid) {
    var g = state.goals[mid];
    if (!g) return null;
    return currentWeek === 0 ? g.list : g.next;
  }
  function findGoal(mid, id) {
    var b = goalBucket(mid);
    if (!b) return null;
    var hit = null;
    b.forEach(function (x) { if (x.id === id) hit = x; });
    return hit;
  }
  function dropGoal(mid, id) {
    var g = state.goals[mid];
    if (!g) return;
    ['list', 'next'].forEach(function (k) {
      var arr = g[k];
      if (!arr) return;
      for (var i = arr.length - 1; i >= 0; i--) if (arr[i].id === id) arr.splice(i, 1);
    });
  }
  function lvOf(it) { return it.lv === 3 ? 3 : (it.lv === 2 ? 2 : 1); }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function starMarks(lv) {
    var s = '';
    for (var i = 0; i < lv; i++) s += '★';
    return s;
  }
  /* 星章数量发生变化后的统一刷新口 */
  function afterStarChange() {
    D.save(state);
    renderGoals();
    renderRewards();
    updateWallet();
    paintHeroStats(false);
    paintTide();
    paintBars();
  }

  function renderGoals() {
    var wrap = $('#goalGrid');
    if (!wrap) return;
    // 合并两位成员的目标到一张卡（两人同名为「顾豆豆」）
    var items = [], done = 0, earned = 0, total = 0;
    D.MEMBERS.forEach(function (m) {
      var g = state.goals[m.id];
      if (!g) return;
      var list = currentWeek === 0 ? g.list : g.next;
      list.forEach(function (it) {
        items.push({ it: it, mid: m.id });
        total += 1;
        if (it.done) { done += 1; earned += lvOf(it); }
      });
    });
    var pct = total ? Math.round((done / total) * 100) : 0;
    var rep = D.MEMBERS[0];
    wrap.innerHTML = '' +
      '<article class="gcard" style="--accent:' + rep.color + '" data-mid="' + rep.id + '">' +
        '<div class="gcard__head">' +
          '<div class="gcard__av" data-edit="data-member-' + rep.id + '-av">' + rep.av + '</div>' +
          '<div class="gcard__who"><h3 data-edit="data-member-' + rep.id + '-name">' + rep.name + '</h3></div>' +
          '<div class="gcard__rate"><b>' + pct + '<small class="pct">%</small></b><span>' + done + ' / ' + total + ' 完成</span></div>' +
        '</div>' +
        '<ul class="rituals">' +
          items.map(function (o) {
            var it = o.it, lv = lvOf(it);
            return '<li class="ritual' + (it.done ? ' is-done' : '') + '" data-id="' + it.id + '" data-mid="' + o.mid + '">' +
              '<span class="ritual__box" data-act="toggle" role="checkbox" tabindex="0" aria-checked="' + (it.done ? 'true' : 'false') + '" aria-label="完成打卡">' +
                '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</span>' +
              '<span class="ritual__txt">' +
                '<b class="tg-field" data-field="title" contenteditable="true" spellcheck="false" data-ph="点击输入目标名称">' + escHtml(it.title || '') + '</b>' +
                '<span class="tg-field" data-field="note" contenteditable="true" spellcheck="false" data-ph="点击补充备注（可留空）">' + escHtml(it.note || '') + '</span>' +
              '</span>' +
              '<button type="button" class="ritual__lv" data-act="lv" title="点击切换完成后入账的星章等级">' + starMarks(lv) + '</button>' +
              '<button type="button" class="ritual__del" data-act="del" aria-label="删除该目标" title="删除">×</button>' +
            '</li>';
          }).join('') +
          '<li class="ritual-add"><button type="button" data-act="add">＋ 添加一条目标</button></li>' +
        '</ul>' +
        '<div class="gcard__foot">' +
          '<div class="gcard__bar"><i data-pct="' + pct + '"></i></div>' +
          '<div class="gcard__meta">' +
            '<span>' + (currentWeek === 0 ? '本周已获' : '下周预计') + ' <b>' + earned + '</b> 星点</span>' +
            '<span>完成 <b>' + done + '</b> / ' + total + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';

    bindGoals(wrap);

    requestAnimationFrame(function () {
      $$('.gcard__bar i', wrap).forEach(function (i) { i.style.width = i.getAttribute('data-pct') + '%'; });
    });

  }

  function bindGoals(wrap) {
    $$('.ritual', wrap).forEach(function (li) {
      var card = li.closest('.gcard');
      var mid = li.getAttribute('data-mid');
      var id = li.getAttribute('data-id');

      function toggle() {
        var it = findGoal(mid, id);
        if (!it) return;
        var was = it.done;
        it.done = !was;
        syncStarByGoal(lvOf(it), was ? -1 : 1);
        afterStarChange();
      }

      var box = li.querySelector('[data-act="toggle"]');
      if (box) {
        box.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        box.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      }

      // 切换等级：已完成的先撤销旧等级，再按新等级重新入账
      var lvBtn = li.querySelector('[data-act="lv"]');
      if (lvBtn) lvBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var it = findGoal(mid, id);
        if (!it) return;
        if (it.done) syncStarByGoal(lvOf(it), -1);
        it.lv = lvOf(it) % 3 + 1;
        if (it.done) syncStarByGoal(it.lv, 1);
        afterStarChange();
      });

      var delBtn = li.querySelector('[data-act="del"]');
      if (delBtn) delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var it = findGoal(mid, id);
        if (!it) return;
        if (it.done) syncStarByGoal(lvOf(it), -1);
        dropGoal(mid, id);
        D.remove('goals', D.goalsKey(mid, currentWeek === 0 ? 'list' : 'next', id));
        afterStarChange();
      });

      // 名称 / 备注就地改写：失焦即存，回车退出编辑
      $$('.tg-field', li).forEach(function (f) {
        f.addEventListener('click', function (e) { e.stopPropagation(); });
        f.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); f.blur(); }
        });
        f.addEventListener('paste', function (e) {
          e.preventDefault();
          var t = String(((e.clipboardData || window.clipboardData) || {}).getData ? (e.clipboardData || window.clipboardData).getData('text') : '');
          t = t.replace(/\s+/g, ' ');
          if (document.execCommand) document.execCommand('insertText', false, t);
          else f.textContent = t;
        });
        f.addEventListener('blur', function () {
          var it = findGoal(mid, id);
          if (!it) return;
          it[f.getAttribute('data-field')] = f.textContent.replace(/\s+/g, ' ').trim();
          D.save(state);
          paintHeroStats(false);
        });
      });
    });

    $$('[data-act="add"]', wrap).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var mid = btn.closest('.gcard').getAttribute('data-mid');
        var bucket = goalBucket(mid);
        if (!bucket) return;
        bucket.push({ id: 'g' + Date.now() + Math.floor(Math.random() * 100), title: '', note: '', lv: 1, done: false });
        D.save(state);
        renderGoals();
        paintHeroStats(false);
        var card = $('.gcard[data-mid="' + mid + '"]');
        if (card) {
          var fields = $$('.ritual .tg-field[data-field="title"]', card);
          var last = fields[fields.length - 1];
          if (last) last.focus();
        }
      });
    });
  }

  if (weekSwitch) {
    weekSwitch.addEventListener('click', function (e) {
      var b = e.target.closest('.seg__btn');
      if (!b) return;
      currentWeek = parseInt(b.getAttribute('data-week'), 10) || 0;
      $$('.seg__btn', weekSwitch).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      renderGoals();
    });
  }

  /* =======================================================
     6. 档期日历
     ======================================================= */
  var today = new Date();
  var calY = today.getFullYear(), calM = today.getMonth();
  var DOW = ['日', '一', '二', '三', '四', '五', '六'];

  function renderCal() {
    var wrap = $('#calGrid');
    if (!wrap) return;
    var label = $('#calLabel');
    if (label) label.textContent = calY + ' 年 ' + (calM + 1) + ' 月';

    wrap.innerHTML = D.MEMBERS.map(function (m) {
      var evs = state.events[m.id] || {};
      var first = new Date(calY, calM, 1).getDay();
      var days = new Date(calY, calM + 1, 0).getDate();
      var cells = '';

      for (var i = 0; i < first; i++) cells += '<div class="day is-pad"></div>';

      for (var d = 1; d <= days; d++) {
        var key = ymd(calY, calM, d);
        var date = new Date(calY, calM, d);
        var wd = date.getDay();
        var ev = evs[key];
        var other = D.MEMBERS.filter(function (x) { return x.id !== m.id; })[0];
        var otherEv = (state.events[other.id] || {})[key];
        var cls = 'day';
        if (wd === 0 || wd === 6) cls += ' is-weekend';
        if (d === today.getDate() && calM === today.getMonth() && calY === today.getFullYear()) cls += ' is-today';
        if (ev && ev.fromPlan) cls += ' is-plan';          // 计划模板写入：独立配色
        if (!ev && !otherEv) cls += ' is-free';            // 两人都没有安排：空档

        cells += '<button type="button" class="' + cls + '" data-mid="' + m.id + '" data-date="' + key + '">' +
          '<span class="day__n">' + d + '</span>' +
          (ev ? '<span class="day__ev">' + escHtml(ev.text) + '<em>' + escHtml(ev.time) + ' · ' + escHtml(ev.tag) + (ev.fromPlan ? ' · 计划' : '') + '</em></span>' : '') +
          (ev ? '<span class="day__dot"></span>' : '') +
        '</button>';
      }

      var count = Object.keys(evs).filter(function (k) { return k.indexOf(calY + '-' + pad2(calM + 1)) === 0; }).length;

      return '' +
        '<section class="cal" style="--accent:' + m.color + '">' +
          '<div class="cal__head">' +
            '<div class="cal__av" data-edit="data-member-' + m.id + '-av">' + m.av + '</div>' +
            '<div><h3 data-edit="data-cal-' + m.id + '-title">' + (m.calTitle || m.name) + ' 的档期</h3><p>' + m.en + ' SCHEDULE</p></div>' +
            '<span class="cal__badge">' + count + ' 条安排</span>' +
          '</div>' +
          '<div class="cal__grid">' +
            '<div class="cal__dow">' + DOW.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
            '<div class="cal__days">' + cells + '</div>' +
          '</div>' +
        '</section>';
    }).join('');

    $$('.day:not(.is-pad)', wrap).forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-mid'), btn.getAttribute('data-date'));
      });
    });

    renderSync();

  }

  function renderSync() {
    var box = $('#syncList');
    if (!box) return;
    var a = state.events[D.MEMBERS[0].id] || {};
    var b = state.events[D.MEMBERS[1].id] || {};
    var days = new Date(calY, calM + 1, 0).getDate();
    // 空档日：当月两人都没有任何安排的日期
    var free = [];
    for (var d = 1; d <= days; d++) {
      var key = ymd(calY, calM, d);
      if (!a[key] && !b[key]) free.push(d);
    }
    if (!free.length) {
      box.innerHTML = '<span class="none">本月没有空档日 —— 安排得满满当当！</span>';
      return;
    }
    box.innerHTML = free.map(function (d) {
      return '<span><b>' + (calM + 1) + '/' + d + '</b> 空档</span>';
    }).join('');
  }

  function shiftMonth(n) {
    calM += n;
    if (calM < 0) { calM = 11; calY--; }
    else if (calM > 11) { calM = 0; calY++; }
    renderCal();
  }
  var prevBtn = $('#prevMonth'), nextBtn = $('#nextMonth'), todayBtn = $('#todayBtn');
  if (prevBtn) prevBtn.addEventListener('click', function () { shiftMonth(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { shiftMonth(1); });
  if (todayBtn) todayBtn.addEventListener('click', function () {
    calY = today.getFullYear(); calM = today.getMonth(); renderCal();
  });

  /* 弹层 */
  var modal = $('#planModal');
  var editCtx = { mid: null, date: null };

  function openModal(mid, date) {
    if (!modal) return;
    editCtx.mid = mid; editCtx.date = date;
    var m = D.MEMBERS.filter(function (x) { return x.id === mid; })[0];
    var d = new Date(date + 'T00:00:00');
    var ev = (state.events[mid] || {})[date];

    $('#modalWho').textContent = '为 ' + m.name + ' 安排档期';
    $('#modalTitle').textContent = (calM + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + DOW[d.getDay()];
    $('#planText').value = ev ? ev.text : '';
    $('#planTime').value = ev ? ev.time : '全天';
    $('#planTag').value = ev ? ev.tag : '出行';
    modal.hidden = false;
    setTimeout(function () { var i = $('#planText'); if (i) i.focus(); }, 60);
  }
  function closeModal() { if (modal) modal.hidden = true; }

  if (modal) {
    $$('[data-close]', modal).forEach(function (el) { el.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
    $('#planSave').addEventListener('click', function () {
      var text = $('#planText').value.trim();
      var mid = editCtx.mid, date = editCtx.date;
      if (!mid || !date) return closeModal();
      if (!state.events[mid]) state.events[mid] = {};
      if (text) {
        var old = state.events[mid][date];
        state.events[mid][date] = {
          text: text, time: $('#planTime').value, tag: $('#planTag').value,
          fromPlan: !!(old && old.fromPlan)
        };
      } else {
        delete state.events[mid][date];
        D.remove('events', D.eventsKey(mid, date));
      }
      D.save(state);
      renderCal();
      paintHeroStats(false);
      closeModal();
    });
    $('#planDel').addEventListener('click', function () {
      var mid = editCtx.mid, date = editCtx.date;
      if (mid && date && state.events[mid]) {
        delete state.events[mid][date];
        D.remove('events', D.eventsKey(mid, date));
        D.save(state);
        renderCal();
        paintHeroStats(false);
      }
      closeModal();
    });
  }

  /* =======================================================
     7. 计划模板
     ======================================================= */
  // 计划模板的视觉素材已迁移到 data.js（TG_DATA.PLAN_ICONS / PLAN_ACCENTS），云端不持久化

  function renderPlans() {
    var wrap = $('#planGrid');
    if (!wrap) return;

    // 默认没有示例，全部由使用者自建
    if (!state.plans.length) {
      wrap.className = 'plans plans--empty';
      wrap.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon"><svg fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg></div>' +
          '<h3 data-edit="data-plans-empty-title">还没有日程模板</h3>' +
          '<p data-edit="data-plans-empty-desc">这一栏默认是空的，所有计划都由你们自己创建。建好之后可以一键铺进日历。</p>' +
          '<button class="btn btn--primary btn--sm" id="emptyNewBtn" type="button"><span data-edit="data-plans-empty-btn">新建第一个模板</span></button>' +
        '</div>';
      var eb = $('#emptyNewBtn', wrap);
      if (eb) eb.addEventListener('click', openTplModal);
      return;
    }

    wrap.className = 'plans';
    wrap.innerHTML = state.plans.map(function (p) {
      return '' +
        '<article class="pcard" style="--accent:' + p.accent + '" data-pid="' + p.id + '">' +
          '<div class="pcard__glow"></div>' +
          '<button class="pcard__del" type="button" data-act="del" aria-label="删除模板" title="删除模板">×</button>' +
          '<div class="pcard__top">' +
            '<div class="pcard__icon"><svg viewBox="0 0 24 24" fill="none">' + p.icon + '</svg></div>' +
          '</div>' +
          '<h3 data-edit="data-plan-' + p.id + '-title">' + escHtml(p.title) + '</h3>' +
          '<p class="pcard__en" data-edit="data-plan-' + p.id + '-en">' + escHtml(p.en) + '</p>' +
          '<p class="pcard__desc' + (p.desc ? '' : ' is-empty') + '" data-edit="data-plan-' + p.id + '-desc">' + (p.desc ? escHtml(p.desc) : '暂无说明') + '</p>' +
          '<div class="pcard__foot">' +
            '<div class="pcard__meta">' +
              p.tags.map(function (t, ti) { return '<span data-edit="data-plan-' + p.id + '-tag' + ti + '">' + escHtml(t) + '</span>'; }).join('') +
            '</div>' +
            '<button class="pcard__use" type="button" data-plan="' + p.id + '" title="写入两人的下一个周六">写入日历</button>' +
          '</div>' +
        '</article>';
    }).join('');

    $$('.pcard__del', wrap).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var pid = btn.closest('.pcard').getAttribute('data-pid');
        var p = state.plans.filter(function (x) { return x.id === pid; })[0];
        if (!p) return;
        if (!window.confirm('删除模板「' + p.title + '」？')) return;
        state.plans = state.plans.filter(function (x) { return x.id !== pid; });
        D.remove('plans', pid);
        D.save(state);
        renderPlans();
      });
    });

    $$('.pcard__use', wrap).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = state.plans.filter(function (x) { return x.id === btn.getAttribute('data-plan'); })[0];
        if (!p) return;
        // 默认写入两人日历的下一个周六，并打上计划模板标记（日历里用独立颜色显示）
        var d = new Date();
        var add = (6 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + add);
        var key = ymd(d.getFullYear(), d.getMonth(), d.getDate());
        D.MEMBERS.forEach(function (m) {
          if (!state.events[m.id]) state.events[m.id] = {};
          state.events[m.id][key] = {
            text: p.title, time: '全天', tag: p.tags[0] || '出行',
            fromPlan: true, planId: p.id
          };
        });
        D.save(state);
        calY = d.getFullYear(); calM = d.getMonth();
        renderCal();
        paintHeroStats(false);
        btn.textContent = '已写入 ✓';
        setTimeout(function () { btn.textContent = '写入日历'; }, 1800);
        var sec = $('#calendar');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

  }

  /* ---------- 新建模板弹层 ---------- */
  var tplModal = $('#tplModal');
  function openTplModal() {
    if (!tplModal) return;
    $('#tplName').value = '';
    $('#tplDesc').value = '';
    $('#tplTag').value = '出行';
    $('#tplDur').value = '全天';
    tplModal.hidden = false;
    setTimeout(function () { var i = $('#tplName'); if (i) i.focus(); }, 60);
  }
  function closeTplModal() { if (tplModal) tplModal.hidden = true; }

  if (tplModal) {
    $$('[data-tclose]', tplModal).forEach(function (el) { el.addEventListener('click', closeTplModal); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !tplModal.hidden) closeTplModal();
    });
    $('#tplSave').addEventListener('click', function () {
      var name = $('#tplName').value.trim();
      if (!name) { window.alert('请先填写模板名称'); return; }
      var desc = $('#tplDesc').value.trim();
      var tag = $('#tplTag').value;
      var dur = $('#tplDur').value;
      var i = state.plans.length;
      state.plans.push({
        id: 'p' + Date.now(),
        accent: D.PLAN_ACCENTS[i % D.PLAN_ACCENTS.length],
        icon: D.PLAN_ICONS[i % D.PLAN_ICONS.length],
        title: name,
        en: 'CUSTOM',
        desc: desc,
        tags: [tag, dur]
      });
      D.save(state);
      closeTplModal();
      renderPlans();
    });
  }

  /* =======================================================
     8. Hero 小组件
     ======================================================= */
  /* 实时潮位 = 本周入账星章 ÷ 上周入账星章
     上周为 0 时：本周有入账记 100%，否则 0% */
  function paintTide() {
    var box = $('#tideLevel');
    if (!box) return;
    var now = new Date();
    var cur = starsOfWeek(weekKey(now));
    var prev = starsOfWeek(weekKey(new Date(now.getTime() - 7 * 86400000)));
    var level = prev > 0
      ? Math.max(0, Math.min(100, Math.round((cur / prev) * 100)))
      : (cur > 0 ? 100 : 0);

    var sub = $('#tideSub');
    if (sub) sub.innerHTML = '本周 <b>' + cur + '</b> 枚 · 上周 <b>' + prev + '</b> 枚';

    var delta = $('#tideDelta');
    if (delta) {
      if (prev > 0) {
        var p = Math.round(((cur - prev) / prev) * 100);
        var cls = p > 0 ? 'up' : (p < 0 ? 'down' : 'flat');
        delta.innerHTML = '较上周 <em class="' + cls + '">' + (p > 0 ? '+' : '') + p + '%</em>';
      } else if (cur > 0) {
        delta.innerHTML = '较上周 <em class="up">新增 ' + cur + ' 枚</em>';
      } else {
        delta.innerHTML = '较上周 <em class="flat">暂无记录</em>';
      }
    }

    // 数字缓动
    var t0 = 0, dur = 900;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      box.innerHTML = Math.round(level * eased) + '<small>%</small>';
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* 本周星章柱状：按周一 → 周日统计每日入账 */
  function paintBars() {
    var ul = $('#sparkbars');
    if (!ul) return;
    var start = weekStart(new Date());
    var labs = ['一', '二', '三', '四', '五', '六', '日'];
    var vals = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      vals.push(starsOnDay(ymd(d.getFullYear(), d.getMonth(), d.getDate())));
    }
    var max = Math.max.apply(null, vals.concat([1]));
    ul.innerHTML = vals.map(function (v, i) {
      var h = v > 0 ? Math.max(10, Math.round((v / max) * 62)) : 3;
      return '<li><span class="bar" data-h="' + h + '" title="' + v + ' 枚"></span><span class="lab">' + labs[i] + '</span></li>';
    }).join('');
    requestAnimationFrame(function () {
      $$('.bar', ul).forEach(function (b) { b.style.height = b.getAttribute('data-h') + 'px'; });
    });
  }

  /* =======================================================
     9. 时钟 & 重置
     ======================================================= */
  (function clock() {
    var c = $('#clock'), cd = $('#clockDate');
    if (!c) return;
    var wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    function tick() {
      var n = new Date();
      c.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes()) + ':' + pad2(n.getSeconds());
      if (cd) cd.textContent = n.getFullYear() + '.' + pad2(n.getMonth() + 1) + '.' + pad2(n.getDate()) + ' ' + wk[n.getDay()];
    }
    tick(); setInterval(tick, 1000);
  })();

  /* 统一重绘入口：任何影响星章 / 档期的操作之后调用 */
  function refreshAll() {
    renderRewards();
    updateWallet();
    renderGoals();
    renderCal();
    renderPlans();
    paintHeroStats(false);
    paintTide();
    paintBars();
  }

  var resetBtn = $('#resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('确定清空所有本地数据并恢复默认内容？此操作不可撤销。')) return;
      D.reset();
      // 深拷贝，避免重置后继续改动 data.js 里的常量数组
      state = JSON.parse(JSON.stringify(D.defaults()));
      D.save(state);
      refreshAll();
    });
  }

  var newPlanBtn = $('#newPlanBtn');
  if (newPlanBtn) newPlanBtn.addEventListener('click', openTplModal);

  /* =======================================================

  /* =======================================================
     10. 启动
     ======================================================= */
  // 逐模块隔离启动：任一模块异常不影响其余模块呈现
  function safe(fn) {
    try { fn(); }
    catch (e) { if (window.console && console.error) console.error('[Tide & Grove] 模块初始化失败:', e); }
  }
  [renderRewards, updateWallet, renderGoals, renderCal, renderPlans, paintTide, paintBars].forEach(safe);

  // 若已接入 Supabase，则启动后从云端拉取最新数据并重绘（失败自动回退本地）
  if (D.init) {
    safe(function () {
      D.init(function (ok) { if (ok) safe(refreshAll); });
    });
  }
})();
