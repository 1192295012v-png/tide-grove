/* =========================================================
   data.js — 默认数据 & 存储（Supabase + localStorage 双模式）
   ---------------------------------------------------------
   · 默认走 Supabase 云端（两人共享同一份数据）
   · 未联网 / 未配置 / 拉取失败时自动回退到浏览器 localStorage
   · load() 始终同步返回内存单例，保证渲染与测试可预测
   ========================================================= */
(function (global) {
  'use strict';

  var KEY = 'tide-grove/v1';

  /* ---------- Supabase 连接（前端只用 anon key） ---------- */
  var SUPABASE_URL = 'https://ccxjgepxxjanqiylqgrs.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeGpnZXB4eGphbnFpeWxxZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDk0MjIsImV4cCI6MjEwMzkyNTQyMn0.fVhVYLQswSu2esLEx3CvBmwPjvscwMSUr30NPeW-TfQ';
  var sb = null;
  try {
    if (global.supabase && typeof global.supabase.createClient === 'function') {
      sb = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    }
  } catch (e) { sb = null; }

  /* ---------- 同行者（两位主角，可自行改名） ---------- */
  var MEMBERS = [
    { id: 'yu',  name: '顾豆豆', en: 'Isle',  av: '', color: '#4fe3d1', calTitle: '小狐狸' },
    { id: 'ze',  name: '顾豆豆', en: 'Zeke',  av: '', color: '#6ee7a8', calTitle: '顾豆豆' }
  ];

  /* ---------- 档期类别（日历 / 计划模板共用） ---------- */
  var TAGS = ['出行', '运动', '学习', '家务', '放空', '工作'];
  var DURS = ['全天', '半天', '2 小时', '5 小时', '7 天', '2 天'];

  /* ---------- 计划模板的视觉素材（云端不存，按数组顺序还原） ---------- */
  var PLAN_ICONS = [
    '<path d="M3 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 3.5-2M3 21c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 3.5-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.7"/>',
    '<path d="M12 21v-7M12 14c-4 0-7-2.5-7-6a7 7 0 0 1 14 0c0 3.5-3 6-7 6z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 7h7M9 11h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    '<path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M12 21s-7-4.6-7-10a7 7 0 1 1 14 0c0 5.4-7 10-7 10z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.6" stroke="currentColor" stroke-width="1.7"/>',
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
  ];
  var PLAN_ACCENTS = ['#4fe3d1', '#6ee7a8', '#4aa8ff', '#ffd479', '#ff8a7a', '#7ee8fa'];

  /* ---------- 奖励星章：1 星 / 2 星 / 3 星 ---------- */
  var REWARDS = [
    {
      id: 's1', level: 1, name: '浅滩星章', en: 'Shoal Star', accent: '#4fe3d1',
      count: 1, target: 60, unit: '枚',
      desc: '轻量即时奖励，用于日常小坚持：好好吃饭、按时喝水、锻炼 30 分钟这类「门槛低但容易断」的事。',
      path: [
        { k: '获取', v: '完成 1 项日常目标自动 +1' },
        { k: '兑换', v: '实现简单愿望及回答问题' }
      ]
    },
    {
      id: 's2', level: 2, name: '深流星章', en: 'Current Star', accent: '#4aa8ff',
      count: 1, target: 30, unit: '枚',
      desc: '中等重量奖励，针对需要连续投入的事：每周完成好好吃饭按时喝水、形成一个好习惯。',
      path: [
        { k: '获取', v: '连续 5天打卡同一目标 +1' },
        { k: '兑换', v: '实现中等愿望' },
        { k: '确认', v: '需对方在日历中点赞生效' }
      ]
    },
    {
      id: 's3', level: 3, name: '灯塔星章', en: 'Lighthouse Star', accent: '#ffd479',
      count: 1, target: 10, unit: '枚',
      desc: '最高等级奖励，只授予真正改变生活轨迹的成就：完成里程碑任务、一起完成长途旅行。',
      path: [
        { k: '获取', v: '重大里程碑由双方共同提名' },
        { k: '兑换', v: '1 枚 = 一次「任意心愿」' },
        { k: '生效', v: '两人同时确认后方可兑换' }
      ]
    }
  ];

  /* ---------- 日常目标：每人一份
     lv = 完成后入账的星章等级（1 浅滩 / 2 深流 / 3 灯塔）
     标题、备注、等级都可以在页面上直接改 ---------- */
  var GOALS = {
    yu: {
      week: 0,
      list: [
        { id: 'y1', title: '一日三餐', note: '每天都要好好吃饭噢', lv: 1, done: false },
        { id: 'y2', title: '读 30 页纸质书', note: '喜欢的事情要坚持', lv: 1, done: false },
        { id: 'y3', title: '喝够 1.8L 水', note: '每天都要好好喝水', lv: 1, done: false },
        { id: 'y4', title: '戒烟', note: '形成好习惯噢', lv: 2, done: false },
        { id: 'y5', title: '23:30 前熄灯', note: '每天都要早点睡觉', lv: 1, done: false }
      ],
      next: [
        { id: 'y1', title: '海边骑行 12km', note: '周六清晨', lv: 2, done: false },
        { id: 'y2', title: '整理相册到 2024', note: '周日 2 小时', lv: 1, done: false },
        { id: 'y3', title: '读完《海边的卡夫卡》', note: '剩余 90 页', lv: 2, done: false },
        { id: 'y4', title: '给家里打一通长电话', note: '下周任意晚', lv: 1, done: false },
        { id: 'y5', title: '做一次全屋断舍离', note: '聚焦衣柜', lv: 2, done: false }
      ]
    },
    ze: {
      week: 0,
      list: [
        { id: 'z1', title: '锻炼 30 min', note: '保持健康最重要的原则', lv: 2, done: false },
        { id: 'z2', title: '非常开心', note: '不管发生什么，都要保持开心', lv: 1, done: false }
      ],
      next: [
        { id: 'z1', title: '完成半马训练计划 W3', note: '累计 32km', lv: 3, done: false },
        { id: 'z2', title: '重构项目里的日历模块', note: '预计 6 小时', lv: 2, done: false },
        { id: 'z3', title: '陪小屿去海边骑行', note: '周六同行', lv: 2, done: false },
        { id: 'z4', title: '学会做 3 道新菜', note: '周六试做', lv: 1, done: false },
        { id: 'z5', title: '整理一年的开销表', note: '周日晚上', lv: 1, done: false }
      ]
    }
  };

  /* ---------- 计划模板：默认留空，全部由使用者自建 ---------- */
  var PLANS = [];

  /* ---------- 星章流水：驱动「实时潮位」与「本周星章」
     每条 { w: 'YYYY-Www', d: 'YYYY-MM-DD', lv, n, t, src }
     n 为带符号的数量（+ 获得 / − 撤销或兑换） ---------- */
  function seedStarLog() { return []; }

  /* ---------- 日历种子数据（默认不预置，全部从零开始） ---------- */
  function seedEvents() {
    return { yu: {}, ze: {} };
  }

  /* ---------- 存储 ---------- */
  function defaults() {
    return {
      createdAt: new Date().toISOString(),
      rewards: REWARDS,
      goals: GOALS,
      plans: PLANS,
      events: seedEvents(),
      starLog: seedStarLog()
    };
  }

  /* 旧数据迁移：把 xp: '+1 ★★' 这种写法换成 lv: 2 */
  function migrateGoals(goals) {
    if (!goals) return goals;
    Object.keys(goals).forEach(function (mid) {
      ['list', 'next'].forEach(function (bucket) {
        var arr = goals[mid] && goals[mid][bucket];
        if (!arr) return;
        arr.forEach(function (it) {
          if (!it.lv) {
            var n = (String(it.xp || '').match(/★/g) || []).length;
            it.lv = n || 1;
          }
          if ('xp' in it) delete it.xp;
        });
      });
    });
    return goals;
  }

  /* 内存单例：load() 永远返回同一个对象，保证 main.js 持有的引用始终有效 */
  var cache = null;

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      var parsed = JSON.parse(raw);
      var base = defaults();
      base.rewards = parsed.rewards || base.rewards;
      base.goals = migrateGoals(parsed.goals || base.goals);
      base.plans = parsed.plans || base.plans;
      base.events = parsed.events || base.events;
      base.starLog = parsed.starLog || base.starLog;
      base.createdAt = parsed.createdAt || base.createdAt;
      return base;
    } catch (e) {
      return defaults();
    }
  }

  function load() {
    if (!cache) cache = readLocal();
    return cache;
  }

  /* 同步写 localStorage 镜像 + 后台推送云端（fire-and-forget） */
  function save(state) {
    cache = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 忽略配额错误 */ }
    pushSupabase(state);
  }

  function reset() {
    cache = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    if (!sb) return;
    // 清空云端全部表，再写回默认值（链式避免与 save() 竞态）
    Promise.all(['rewards', 'goals', 'events', 'plans', 'star_log'].map(function (t) {
      return sb.from(t).delete().neq('id', '__NO_SUCH_ROW__');
    })).then(function () {
      pushSupabase(defaults());
    }).catch(function () {});
  }

  /* =========================================================
     云端同步：行级映射（JS 字段 ↔ Supabase 列）
     · 奖励星章 desc → description
     · 目标 / 档期 / 计划 / 星章流水 用确定性文本主键，便于upsert
     ========================================================= */
  function goalsKey(mid, bucket, id) { return mid + ':' + bucket + ':' + id; }
  function eventsKey(mid, date) { return mid + ':' + date; }

  function rewardsToRows(rows) {
    return (rows || []).map(function (r) {
      return {
        id: r.id, level: r.level, name: r.name, en: r.en, accent: r.accent,
        count: r.count, target: r.target, unit: r.unit,
        description: r.desc, path: r.path || []
      };
    });
  }
  function goalsToRows(goals) {
    var out = [];
    MEMBERS.forEach(function (m) {
      var g = (goals || {})[m.id];
      if (!g) return;
      ['list', 'next'].forEach(function (bucket) {
        (g[bucket] || []).forEach(function (it, i) {
          out.push({
            id: goalsKey(m.id, bucket, it.id),
            member_id: m.id, bucket: bucket,
            title: it.title || '', note: it.note || '',
            lv: it.lv || 1, done: !!it.done, sort_order: i
          });
        });
      });
    });
    return out;
  }
  function eventsToRows(events) {
    var out = [];
    MEMBERS.forEach(function (m) {
      var ev = (events || {})[m.id] || {};
      Object.keys(ev).forEach(function (date) {
        var e = ev[date];
        out.push({
          id: eventsKey(m.id, date),
          member_id: m.id, event_date: date,
          text: e.text || '', time: e.time || '全天',
          tag: e.tag || '出行', from_plan: !!e.fromPlan
        });
      });
    });
    return out;
  }
  function plansToRows(plans) {
    return (plans || []).map(function (p) {
      return {
        id: p.id,
        title: p.title || '',
        description: p.desc || '',
        tag: (p.tags && p.tags[0]) || '出行',
        dur: (p.tags && p.tags[1]) || '全天'
      };
    });
  }
  function starLogToRows(log) {
    return (log || []).map(function (e) {
      return {
        id: [e.w, e.d, e.lv, e.n, e.src, e.t].join('|'),
        week: e.w, day: e.d, level: e.lv,
        delta: e.n, reason: e.t || null, src: e.src || ''
      };
    });
  }

  function rowsToRewards(rows) {
    return (rows || []).map(function (r) {
      return {
        id: r.id, level: r.level, name: r.name, en: r.en, accent: r.accent,
        count: r.count, target: r.target, unit: r.unit,
        desc: r.description, path: r.path || []
      };
    });
  }
  function rowsToGoals(rows) {
    var tmp = {};
    (rows || []).forEach(function (r) {
      if (!tmp[r.member_id]) tmp[r.member_id] = { list: [], next: [] };
      if (!tmp[r.member_id][r.bucket]) tmp[r.member_id][r.bucket] = [];
      tmp[r.member_id][r.bucket].push({
        id: (r.id || '').split(':').slice(2).join(':') || r.id,
        title: r.title || '', note: r.note || '',
        lv: r.lv || 1, done: !!r.done, _o: r.sort_order || 0
      });
    });
    var g = { yu: { week: 0, list: [], next: [] }, ze: { week: 0, list: [], next: [] } };
    MEMBERS.forEach(function (m) {
      ['list', 'next'].forEach(function (b) {
        var arr = (tmp[m.id] && tmp[m.id][b]) || [];
        arr.sort(function (a, x) { return a._o - x._o; });
        g[m.id][b] = arr.map(function (o) {
          return { id: o.id, title: o.title, note: o.note, lv: o.lv, done: o.done };
        });
      });
    });
    return g;
  }
  function rowsToEvents(rows) {
    var ev = { yu: {}, ze: {} };
    (rows || []).forEach(function (r) {
      if (!ev[r.member_id]) ev[r.member_id] = {};
      ev[r.member_id][r.event_date] = {
        text: r.text || '', time: r.time || '全天',
        tag: r.tag || '出行', fromPlan: !!r.from_plan
      };
    });
    return ev;
  }
  function rowsToPlans(rows) {
    return (rows || []).map(function (r, i) {
      return {
        id: r.id,
        accent: PLAN_ACCENTS[i % PLAN_ACCENTS.length],
        icon: PLAN_ICONS[i % PLAN_ICONS.length],
        title: r.title || '', en: 'CUSTOM',
        desc: r.description || '',
        tags: [r.tag || '出行', r.dur || '全天']
      };
    });
  }
  function rowsToStarLog(rows) {
    return (rows || []).map(function (r) {
      return { w: r.week, d: r.day, lv: r.level, n: r.delta, t: r.reason, src: r.src || '' };
    });
  }

  /* upsert 当前表；rows 为空则清空该表（仅清空当前表，不影响其他表） */
  function upsertTable(table, rows) {
    if (!rows.length) {
      sb.from(table).delete().neq('id', '__NO_SUCH_ROW__').then(null, function () {});
      return;
    }
    sb.from(table).upsert(rows, { onConflict: 'id' })
      .then(null, function (err) { if (global.console) console.warn('[Supabase] upsert ' + table + ' 失败:', err); });
  }

  /* 只推送传入的字段（避免未传字段被误判为空而清空） */
  function pushSupabase(state) {
    if (!sb || !state) return;
    try {
      if (state.rewards !== undefined) upsertTable('rewards', rewardsToRows(state.rewards));
      if (state.goals !== undefined) upsertTable('goals', goalsToRows(state.goals));
      if (state.events !== undefined) upsertTable('events', eventsToRows(state.events));
      if (state.plans !== undefined) upsertTable('plans', plansToRows(state.plans));
      if (state.starLog !== undefined) upsertTable('star_log', starLogToRows(state.starLog));
    } catch (e) { if (global.console) console.warn('[Supabase] 推送失败:', e); }
  }

  /* 删除单行（用于目标 / 计划 / 档期的单项删除真正生效到云端） */
  function remove(table, id) {
    if (!sb || !id) return;
    sb.from(table).delete().eq('id', String(id))
      .then(null, function (e) { if (global.console) console.warn('[Supabase] 删除 ' + table + ':' + id + ' 失败:', e); });
  }

  /* 启动时从云端拉取最新数据；云端为空则沿用本地默认值并回写
     onReady(ok): ok=true 表示已用云端数据刷新，调用方可重绘 */
  function init(onReady) {
    onReady = onReady || function () {};
    if (!sb) { try { onReady(false); } catch (e) {} return Promise.resolve(false); }

    var p = Promise.all([
      sb.from('rewards').select('*'),
      sb.from('goals').select('*'),
      sb.from('events').select('*'),
      sb.from('plans').select('*'),
      sb.from('star_log').select('*')
    ]);

    return p.then(function (res) {
      res.forEach(function (r) { if (r && r.error) throw new Error('Supabase 查询返回错误'); });
      var rews = (res[0].data) || [], goals = (res[1].data) || [],
          events = (res[2].data) || [], plans = (res[3].data) || [],
          logs = (res[4].data) || [];

      // 就地修改 cache（不替换引用），保证 main.js 持有的 state 同步更新
      cache.rewards = rews.length ? rowsToRewards(rews) : (cache.rewards || rowsToRewards(defaults().rewards));
      cache.goals  = goals.length ? rowsToGoals(goals) : (cache.goals || defaults().goals);
      cache.events = events.length ? rowsToEvents(events) : (cache.events || defaults().events);
      cache.plans  = plans.length ? rowsToPlans(plans) : (cache.plans || rowsToPlans(defaults().plans));
      cache.starLog = logs.length ? rowsToStarLog(logs) : (cache.starLog || []);

      // 把空表回写云端，完成首次初始化
      if (!rews.length)   pushSupabase({ rewards: cache.rewards });
      if (!goals.length)  pushSupabase({ goals: cache.goals });
      if (!events.length) pushSupabase({ events: cache.events });
      if (!plans.length)  pushSupabase({ plans: cache.plans });
      if (!logs.length)   pushSupabase({ starLog: cache.starLog });

      try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
      onReady(true);
      return true;
    }).catch(function (err) {
      if (global.console) console.warn('[Supabase] 初始化拉取失败，继续使用本地缓存：', err);
      onReady(false);
      return false;
    });
  }

  global.TG_DATA = {
    KEY: KEY,
    MEMBERS: MEMBERS,
    TAGS: TAGS,
    DURS: DURS,
    PLAN_ICONS: PLAN_ICONS,
    PLAN_ACCENTS: PLAN_ACCENTS,
    isCloud: !!sb,
    load: load,
    save: save,
    reset: reset,
    init: init,
    remove: remove,
    goalsKey: goalsKey,
    eventsKey: eventsKey,
    defaults: defaults
  };
})(window);
