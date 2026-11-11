/* ==========================================================================
 * mockup-bo-core.js — Core engine for Back Office Simulators
 * Provides shell layout, CRUD views, routing, state management, modal & toasts.
 * ========================================================================== */

// Global registry of screens, order, actions, modal and state
var REG = {};
var ORDER = [];
var ACT = {};
var MODAL = null;
var S = {};

// Helper utilities
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bd(text, type) {
  if (text == null || text === '') return '';
  var cls = type ? 'bd-' + type : 'bd-sec';
  return '<span class="bd ' + cls + '">' + esc(text) + '</span>';
}

function yes(v) {
  return v ? '<span class="bd bd-success">✔ Có</span>' : '<span class="muted">—</span>';
}

function note(msg, type) {
  var cls = type === 'dan' || type === 'bad' ? 'dan' : type === 'warn' ? 'warn' : 'info';
  return '<div class="note ' + cls + '">' + msg + '</div>';
}

function wfb(s) {
  var map = {
    Open: 'warning',
    InProgress: 'info',
    Resolved: 'success',
    Verified: 'success',
    Closed: 'sec',
    Draft: 'warning',
    Active: 'success',
    Retired: 'sec'
  };
  var vi = (window.BO_CONFIG && window.BO_CONFIG.labels && window.BO_CONFIG.labels.status && window.BO_CONFIG.labels.status[s]) || s;
  return bd(vi, map[s] || 'sec');
}

function gp(title, body) {
  return '<div class="card" style="margin-bottom:12px">' +
    (title ? '<div style="font-weight:600;font-size:14px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f1f5f9">' + title + '</div>' : '') +
    (body || '') +
  '</div>';
}

function dd(id, label, icon, cls, items) {
  var ic = icon ? '<i class="fa-solid ' + icon + '"></i> ' : '';
  var btnCls = cls ? 'btn-' + cls : 'btn-sec';
  var listHtml = (Array.isArray(items) ? items : []).map(function(it) {
    if (it === '-') return '<hr style="margin:4px 0;border:0;border-top:1px solid #eef0f4">';
    if (Array.isArray(it)) {
      var lbl = it[0], icn = it[1], act = it[2], arg = it[3];
      var icnHtml = icn ? '<i class="fa-solid ' + icn + '"></i> ' : '';
      var argAttr = arg != null ? ' data-arg="' + esc(String(arg)) + '"' : '';
      var actAttr = act ? ' data-act="' + act + '"' : '';
      return '<div class="dd-item" style="padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:12px"' + actAttr + argAttr + '>' + icnHtml + esc(lbl) + '</div>';
    }
    return '<div class="dd-item" style="padding:6px 12px;font-size:12px">' + esc(String(it)) + '</div>';
  }).join('');

  return '<div class="dropdown" style="position:relative;display:inline-block" id="' + esc(id) + '">' +
    '<button type="button" class="btn ' + btnCls + '" onclick="var m=this.nextElementSibling;m.style.display=m.style.display===\'block\'?\'none\':\'block\';event.stopPropagation()">' +
      ic + esc(label) + ' <i class="fa-solid fa-chevron-down" style="font-size:10px;margin-left:4px"></i>' +
    '</button>' +
    '<div class="dropdown-menu" style="display:none;position:absolute;top:100%;right:0;background:#fff;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:300;min-width:160px;margin-top:4px;padding:4px 0">' +
      listHtml +
    '</div>' +
  '</div>';
}

function btn(text, icon, cls, act, arg) {
  var ic = icon ? '<i class="fa-solid ' + icon + '"></i> ' : '';
  var cl = cls ? 'btn-' + cls : 'btn-sec';
  var dataAct = act ? ' data-act="' + act + '"' : '';
  var dataArg = arg != null ? ' data-arg="' + esc(String(arg)) + '"' : '';
  return '<button type="button" class="btn ' + cl + '"' + dataAct + dataArg + '>' + ic + (text || '') + '</button>';
}

function modal(o) {
  MODAL = o;
  render();
}

function closeModal() {
  MODAL = null;
  render();
}

function toast(msg, type) {
  if (typeof document === 'undefined') return;
  var container = document.getElementById('bo-toasts') || createToastContainer();
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type === 'w' ? 'warn' : type === 'dan' ? 'dan' : 'success');
  var ic = type === 'w' ? '<i class="fa-solid fa-triangle-exclamation"></i> ' :
           type === 'dan' ? '<i class="fa-solid fa-circle-exclamation"></i> ' :
           '<i class="fa-solid fa-circle-check"></i> ';
  t.innerHTML = ic + esc(msg);
  container.appendChild(t);
  setTimeout(function() {
    t.classList.add('fade-out');
    setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
  }, 2500);
}

function createToastContainer() {
  var c = document.createElement('div');
  c.id = 'bo-toasts';
  document.body.appendChild(c);
  return c;
}

function tabsbar(tabs, activeIdx, actName) {
  return '<div class="tabsbar">' + tabs.map(function(tab, i) {
    var on = i === activeIdx ? ' on' : '';
    var ic = tab.ic ? '<i class="fa-solid ' + tab.ic + '"></i> ' : '';
    return '<div class="tab-btn' + on + '" data-act="' + actName + '" data-arg="' + i + '">' + ic + esc(tab.t) + '</div>';
  }).join('') + '</div>';
}

function pageHeader(title, actions) {
  var acts = Array.isArray(actions) ? actions.join(' ') : (actions || '');
  return '<div class="p-header"><h1 class="p-title">' + esc(title) + '</h1><div class="p-acts">' + acts + '</div></div>';
}

function formLayout(fields) {
  return '<div class="fl">' + (fields || []).join('') + '</div>';
}

function F(label, val, type, opts) {
  opts = opts || {};
  var span = opts.span ? ' style="grid-column: span ' + opts.span + '"' : '';
  var req = opts.req ? ' *' : '';
  var valHtml = '';
  if (opts.ro || type === 'ro') {
    valHtml = '<div class="inp ro"><span class="tx">' + esc(val != null ? String(val) : '—') + '</span></div>';
  } else if (type === 'area') {
    valHtml = '<textarea class="sim-in" style="width:100%" rows="' + (opts.rows || 3) + '">' + esc(val || '') + '</textarea>';
  } else if (type === 'combo') {
    valHtml = '<div class="inp"><span class="tx">' + esc(val || '—') + '</span></div>';
  } else {
    var inType = type === 'num' ? 'number' : type === 'date' ? 'date' : 'text';
    valHtml = '<input class="sim-in" type="' + inType + '" value="' + esc(val != null ? String(val) : '') + '">';
  }
  return '<div class="fi"' + span + '><div class="cap">' + esc(label) + req + '</div>' + valHtml + '</div>';
}

function sg(cols, rows, opts) {
  opts = opts || {};
  var heads = cols.map(function(c) { return '<th>' + esc(c.t) + '</th>'; }).join('');
  var bodyRows = (rows || []).map(function(r) {
    var cells = cols.map(function(c) {
      var val = r[c.k];
      return '<td>' + (c.fmt ? c.fmt(val, r) : esc(val != null ? String(val) : '')) + '</td>';
    }).join('');
    return '<tr>' + cells + '</tr>';
  }).join('');
  return '<div class="gridwrap"><table class="g sub"><thead><tr>' + heads + '</tr></thead><tbody>' +
    (bodyRows || '<tr><td colspan="' + cols.length + '" class="muted" style="text-align:center;padding:12px">Không có dữ liệu</td></tr>') +
    '</tbody></table></div>';
}

function iso(d) {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  var dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  var y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), day = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function isoToday() {
  return iso(new Date());
}

function curLink() {
  return S.active || '';
}

function wsOfScr(scr) {
  if (!scr) return null;
  var workspaces = (window.BO_CONFIG && window.BO_CONFIG.workspaces) || [];
  if (scr.ws && scr.ws !== 'SUB') {
    var match = workspaces.find(function(w) { return w.code === scr.ws; });
    if (match) return match;
  }
  if (scr.group) {
    var match = workspaces.find(function(w) { return w.groups && w.groups.includes(scr.group); });
    if (match) return match;
  }
  if (scr.link) {
    var match = workspaces.find(function(w) {
      return w.shortcuts && w.shortcuts.some(function(sc) { return scr.link === sc || scr.link.startsWith(sc); });
    });
    if (match) return match;
  }
  if (scr.link && scr.link.startsWith('/Reports')) {
    var rp = workspaces.find(function(w) { return w.code === 'RP'; });
    if (rp) return rp;
  }
  return workspaces[0] || null;
}

function reg(scr) {
  REG[scr.link] = scr;
  if (scr.alias) REG[scr.alias] = scr;
  if (!ORDER.includes(scr.link)) {
    ORDER.push(scr.link);
  }
}

var route = function(path) {
  if (!path || path === '/') return { home: true };
  var clean = path.split('?')[0];
  if (REG[clean]) return { scr: REG[clean], id: null, q: path.split('?')[1] || '' };
  var i = clean.lastIndexOf('/');
  if (i > 0) {
    var base = clean.slice(0, i);
    if (REG[base]) return { scr: REG[base], id: decodeURIComponent(clean.slice(i + 1)), q: path.split('?')[1] || '' };
  }
  return { scr: null };
};

function save() {
  try {
    var key = 'bo:' + ((window.BO_CONFIG && window.BO_CONFIG.slug) || 'default');
    localStorage.setItem(key, JSON.stringify(S));
  } catch (e) {}
}

function resetAll() {
  try {
    var key = 'bo:' + ((window.BO_CONFIG && window.BO_CONFIG.slug) || 'default');
    localStorage.removeItem(key);
  } catch (e) {}
  initS();
  save();
  render();
}

function nav(link) {
  if (!link) return;
  S.active = link;
  var clean = link.split('?')[0];
  if (!S.tabs.includes(clean)) {
    S.tabs.push(clean);
  }
  S.curTab = 0;
  save();
  render();
}

function closeTab(link) {
  var idx = S.tabs.indexOf(link);
  if (idx !== -1) {
    S.tabs.splice(idx, 1);
    if (S.active === link) {
      S.active = S.tabs[Math.max(0, idx - 1)] || '/';
    }
    save();
    render();
  }
}

function initS() {
  var cfg = window.BO_CONFIG || {};
  var saved = null;
  try {
    var raw = localStorage.getItem('bo:' + (cfg.slug || 'default'));
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}

  S = {
    active: (saved && saved.active) || cfg.active || (cfg.workspaces && cfg.workspaces[0] && ('/Workspace/' + cfg.workspaces[0].code)) || '/',
    tabs: (saved && Array.isArray(saved.tabs) && saved.tabs.length) ? saved.tabs : (cfg.tabs ? cfg.tabs.slice() : []),
    dirty: (saved && saved.dirty) || {},
    filter: (saved && saved.filter) || {},
    x: (saved && saved.x) || {},
    q: '',
    curTab: 0
  };
  if (S.active && !S.tabs.includes(S.active)) {
    S.tabs.push(S.active);
  }
}
initS();

function renderWorkspacePage(w) {
  var shortcuts = (w.shortcuts || []).map(function(sc) {
    var s = REG[sc];
    if (!s) return '';
    return '<div class="ws-card" data-act="go" data-arg="' + sc + '">' +
      '<div class="ws-card-ic"><i class="fa-solid ' + (w.ic || 'fa-folder') + '"></i></div>' +
      '<div class="ws-card-b"><b>' + esc(s.title) + '</b><span>' + esc(sc) + '</span></div>' +
    '</div>';
  }).filter(Boolean).join('');

  var groupsHtml = (w.groups || []).map(function(grp) {
    var screens = ORDER.filter(function(l) { return REG[l] && !REG[l].wsPage && REG[l].group === grp; });
    if (!screens.length) return '';
    return '<div><div class="ws-section-title">' + esc(grp) + '</div><div class="ws-grid">' +
      screens.map(function(l) {
        var s = REG[l];
        return '<div class="ws-card" data-act="go" data-arg="' + l + '">' +
          '<div class="ws-card-ic"><i class="fa-solid fa-table-cells"></i></div>' +
          '<div class="ws-card-b"><b>' + esc(s.title) + '</b><span>' + esc(l) + '</span></div>' +
        '</div>';
      }).join('') +
    '</div></div>';
  }).join('');

  return '<div class="ws-dashboard">' +
    '<div class="ws-hero">' +
      '<div class="ws-hero-ic"><i class="fa-solid ' + (w.ic || 'fa-layer-group') + '"></i></div>' +
      '<div><h2>' + esc(w.title) + '</h2><p>' + esc(w.sub || '') + '</p></div>' +
    '</div>' +
    (shortcuts ? '<div><div class="ws-section-title">Lối tắt thao tác nhanh</div><div class="ws-grid">' + shortcuts + '</div></div>' : '') +
    groupsHtml +
  '</div>';
}

function renderCrudList(scr) {
  var list = scr.list || {};
  var cols = list.cols || [];
  var filters = list.filters || [];
  var allRows = typeof list.rows === 'function' ? list.rows() : (list.rows || []);

  S.filter = S.filter || {};
  var curF = S.filter[scr.link] || {};

  var filtered = allRows.filter(function(r) {
    if (S.q) {
      var q = S.q.toLowerCase();
      var match = cols.some(function(c) {
        var v = r[c.k];
        return v != null && String(v).toLowerCase().includes(q);
      });
      if (!match) return false;
    }
    for (var i = 0; i < filters.length; i++) {
      var f = filters[i];
      var fVal = curF[f.k];
      if (fVal != null && fVal !== '' && typeof f.test === 'function') {
        if (!f.test(r, fVal)) return false;
      }
    }
    return true;
  });

  var acts = [];
  if (!scr.noNew) {
    acts.push(btn('Thêm mới', 'fa-plus', 'pri', 'go', scr.link + (scr.blankId ? '/new' : '/new')));
  }
  acts.push(btn('Xuất Excel', 'fa-file-excel', 'sec', 'dead', 'Xuất Excel'));
  acts.push(btn('Làm mới', 'fa-rotate-right', 'sec', 'refresh'));

  var filterItems = [];
  filterItems.push('<div><label style="font-size:12px;color:#5f6b7a;display:block;margin-bottom:3px">Tìm kiếm</label>' +
    '<input class="sim-in" placeholder="Tìm theo từ khóa…" value="' + esc(S.q || '') + '" data-chg="searchQ"></div>');
  filters.forEach(function(f) {
    var opts = (f.opts || []).map(function(o) {
      var val = o[0], txt = o[1];
      var sel = String(curF[f.k] != null ? curF[f.k] : '') === String(val) ? ' selected' : '';
      return '<option value="' + esc(val) + '"' + sel + '>' + esc(txt) + '</option>';
    }).join('');
    filterItems.push('<div><label style="font-size:12px;color:#5f6b7a;display:block;margin-bottom:3px">' + esc(f.t) + '</label>' +
      '<select class="sel" data-chg="crudFilter" data-k="' + scr.link + '|' + f.k + '"><option value="">Tất cả</option>' + opts + '</select></div>');
  });

  var filterHtml = '<div class="card tight"><div style="display:grid;grid-template-columns:repeat(' + Math.min(filterItems.length, 5) + ',minmax(0,1fr));gap:10px;align-items:end">' +
    filterItems.join('') + '</div></div>';

  var heads = cols.map(function(c) {
    var num = c.num || (/^#|SL|Số|Điểm|%|Tổng|Tuổi|giờ|ngày/.test(c.t));
    return '<th class="' + (num ? 'num' : '') + '">' + esc(c.t) + '</th>';
  }).join('');

  var bodyRows = filtered.map(function(r, idx) {
    var cells = cols.map(function(c) {
      var num = c.num || (/^#|SL|Số|Điểm|%|Tổng|Tuổi|giờ|ngày/.test(c.t));
      var cls = num ? ' class="num"' : '';
      var val = r[c.k];
      if (c.k === '#') val = idx + 1;
      var formatted = c.fmt ? c.fmt(val, r) : (val != null ? esc(String(val)) : '—');
      if (c.link) {
        formatted = '<a data-act="go" data-arg="' + scr.link + '/' + encodeURIComponent(r.id) + '">' + formatted + '</a>';
      }
      return '<td' + cls + '>' + formatted + '</td>';
    }).join('');
    return '<tr>' + cells + '</tr>';
  }).join('');

  var tableHtml = '<div class="card tight"><div class="gridwrap"><table class="g sub"><thead><tr>' + heads + '</tr></thead><tbody>' +
    (bodyRows || '<tr><td colspan="' + cols.length + '" style="text-align:center;color:#9e9e9e;padding:24px">Không tìm thấy bản ghi nào</td></tr>') +
    '</tbody></table></div><div class="gfoot"><span>Tổng: ' + filtered.length + ' dòng</span></div></div>';

  return pageHeader(scr.title, acts) + filterHtml + tableHtml;
}

function renderCrudEdit(scr, id) {
  var effId = (id === 'new' && scr.blankId) ? scr.blankId : id;
  var ed = typeof scr.edit === 'function' ? scr.edit(effId) : null;
  if (!ed) {
    return pageHeader(scr.title, [btn('Trở về', 'fa-arrow-left', 'sec', 'go', scr.link)]) +
      '<div class="card"><p class="muted">Không tìm thấy thông tin bản ghi <b>' + esc(id) + '</b>.</p></div>';
  }

  var acts = [
    btn('Quay lại', 'fa-arrow-left', 'sec', 'go', scr.link),
    btn('Lưu', 'fa-floppy-disk', 'pri', 'saveRecord'),
    btn('Đóng', '', 'sec', 'go', scr.link)
  ];
  if (ed.extras) {
    acts = acts.concat(ed.extras);
  }

  var title = ed.title || scr.title;
  var topHtml = ed.top ? '<div style="margin-bottom:12px">' + ed.top + '</div>' : '';

  var formA = ed.a && ed.a.length ? '<div class="card">' + formLayout(ed.a) + '</div>' : '';
  var formB = ed.b && ed.b.length ? '<div class="card">' + formLayout(ed.b) + '</div>' : '';

  // Tabs
  var tabsHtml = '';
  if (ed.tabs && ed.tabs.length) {
    var curT = S.curTab || 0;
    if (curT >= ed.tabs.length) curT = 0;
    var tBar = tabsbar(ed.tabs, curT, 'editTab');
    var tabObj = ed.tabs[curT];
    var tBody = typeof tabObj.body === 'function' ? tabObj.body(ed.doc) : tabObj.body;
    tabsHtml = '<div class="card">' + tBar + '<div style="margin-top:14px">' + (tBody || '') + '</div></div>';
  }

  // Sidebar
  var sideHtml = '';
  if (ed.side) {
    var sideParts = [];
    if (ed.side.assign && ed.side.assign.length) {
      sideParts.push('<div style="margin-bottom:12px"><b style="font-size:12px;color:#5f6b7a">Người phụ trách</b><div style="margin-top:4px">' +
        ed.side.assign.map(function(u) { return bd(u, 'info'); }).join(' ') + '</div></div>');
    }
    if (ed.side.wf && ed.side.wf.length) {
      var wfRows = ed.side.wf.map(function(w) { return [w[0], w[1], w[2]]; });
      sideParts.push('<div style="margin-bottom:12px"><b style="font-size:12px;color:#5f6b7a">Quy trình xử lý</b>' +
        tbl(['Thời gian', 'Thao tác', 'Người thực hiện'], wfRows, { left: 1 }) + '</div>');
    }
    if (ed.side.hist && ed.side.hist.length) {
      sideParts.push('<div><b style="font-size:12px;color:#5f6b7a">Lịch sử</b>' +
        tbl(['Người', 'Thời gian', 'Nội dung'], ed.side.hist, { left: 1 }) + '</div>');
    }
    if (sideParts.length) {
      sideHtml = '<div class="card" style="font-size:12px">' + sideParts.join('<hr style="border:0;border-top:1px solid #eef0f4;margin:12px 0">') + '</div>';
    }
  }

  var mainContent = topHtml + formA + formB + tabsHtml;
  if (sideHtml) {
    mainContent = '<div class="crud-edit-grid"><div>' + mainContent + '</div><div>' + sideHtml + '</div></div>';
  }

  return pageHeader(title, acts) + mainContent;
}

function render() {
  var app = document.getElementById('app');
  if (!app) return;

  var cfg = window.BO_CONFIG || {};
  var r = route(S.active);
  var curScr = r ? r.scr : null;

  var tabsHtml = (S.tabs || []).map(function(t) {
    var scrObj = REG[t] || (route(t) && route(t).scr);
    var title = scrObj ? scrObj.title : t;
    var isActive = S.active === t || S.active.startsWith(t + '/');
    return '<div class="bo-tab' + (isActive ? ' active' : '') + '" data-act="tabClick" data-arg="' + t + '">' +
      '<span>' + esc(title) + '</span>' +
      (S.tabs.length > 1 ? '<span class="bo-tab-close" data-act="closeTab" data-arg="' + t + '">✕</span>' : '') +
    '</div>';
  }).join('');

  var contentHtml = '';
  if (!curScr) {
    contentHtml = '<div class="card"><p class="muted">Không tìm thấy màn hình: <b>' + esc(S.active) + '</b></p>' +
      btn('Về trang chủ', 'fa-home', 'pri', 'go', '/Workspace/' + ((cfg.workspaces && cfg.workspaces[0] && cfg.workspaces[0].code) || 'DMS')) +
    '</div>';
  } else if (curScr.wsPage) {
    contentHtml = typeof curScr.render === 'function' ? curScr.render() : '';
  } else if (curScr.type === 'page') {
    contentHtml = typeof curScr.render === 'function' ? curScr.render() : '';
  } else if (curScr.type === 'crud') {
    if (r.id != null) {
      contentHtml = renderCrudEdit(curScr, r.id);
    } else {
      contentHtml = renderCrudList(curScr);
    }
  }

  var modalHtml = '';
  if (MODAL) {
    var mW = MODAL.w ? ' style="width:' + MODAL.w + 'px"' : '';
    modalHtml = '<div class="ovl" data-act="ovl"><div class="mdl"' + mW + ' onclick="event.stopPropagation()">' +
      '<div class="mdl-h"><b>' + esc(MODAL.title || '') + '</b><button type="button" class="mdl-close" data-act="closeModal">✕</button></div>' +
      '<div class="mdl-b">' + (MODAL.body || '') + '</div>' +
      (MODAL.foot ? '<div class="mdl-f">' + MODAL.foot + '</div>' : '') +
    '</div></div>';
  }

  app.innerHTML = '<div class="bo-shell">' +
    '<div class="bo-topbar">' +
      '<div class="bo-brand" data-act="go" data-arg="/Workspace/' + ((cfg.workspaces && cfg.workspaces[0] && cfg.workspaces[0].code) || 'DMS') + '">' +
        '<i class="fa-solid fa-cube"></i> Xspire · eSales ISE' +
      '</div>' +
      '<div class="bo-tabs">' + tabsHtml + '</div>' +
      '<div class="bo-user">' +
        '<span class="bo-user-badge"><i class="fa-solid fa-user-shield"></i> ' + esc(cfg.user || 'Admin HQSOFT') + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="bo-content">' + contentHtml + '</div>' +
    modalHtml +
  '</div>';
}

function initWorkspaces() {
  var wsList = (window.BO_CONFIG && window.BO_CONFIG.workspaces) || [];
  wsList.forEach(function(w) {
    var link = '/Workspace/' + w.code;
    if (!REG[link]) {
      REG[link] = {
        link: link,
        code: 'WS_' + w.code,
        title: w.title,
        wsPage: true,
        wsObj: w,
        type: 'page',
        spec: { biz: [w.sub || w.title], flow: ['Màn hình làm việc'], data: [], rules: [], links: [], api: [] },
        render: function() { return renderWorkspacePage(w); }
      };
      if (!ORDER.includes(link)) {
        ORDER.unshift(link);
      }
    }
  });
}

function initEvents() {
  document.addEventListener('click', function(e) {
    var actEl = e.target.closest('[data-act]');
    if (actEl) {
      var act = actEl.getAttribute('data-act');
      var arg = actEl.getAttribute('data-arg');
      if (ACT[act]) {
        ACT[act](arg, actEl);
      }
      return;
    }
    var goEl = e.target.closest('[data-go]');
    if (goEl) {
      nav(goEl.getAttribute('data-go'));
      return;
    }
  });

  document.addEventListener('change', function(e) {
    var chgEl = e.target.closest('[data-chg]');
    if (chgEl) {
      var chg = chgEl.getAttribute('data-chg');
      if (ACT[chg]) {
        ACT[chg](chgEl.value, chgEl);
      }
    }
  });

  document.addEventListener('input', function(e) {
    var chgEl = e.target.closest('[data-chg]');
    if (chgEl && chgEl.tagName === 'INPUT' && (chgEl.type === 'text' || chgEl.type === 'search')) {
      var chg = chgEl.getAttribute('data-chg');
      if (ACT[chg]) {
        ACT[chg](chgEl.value, chgEl);
      }
    }
  });
}

// Default action dispatchers
ACT.go = function(p) { nav(p); };
ACT.nav = function(p) { nav(p); };
ACT.closeTab = function(p) { closeTab(p); };
ACT.tabClick = function(p) { nav(p); };
ACT.closeModal = function() { closeModal(); };
ACT.dead = function(msg) { toast(msg || 'Thao tác không khả dụng', 'w'); };
ACT.say = function(t) { toast(t, 'w'); };
ACT.okMsg = function(t) { toast(t, ''); };
ACT.refresh = function() { render(); toast('Đã làm mới dữ liệu', ''); };
ACT.saveRecord = function() { S.dirty[S.active] = false; save(); toast('Đã lưu dữ liệu thành công', ''); };
ACT.editTab = function(idx) { S.curTab = +idx; render(); };
ACT.searchQ = function(val) { S.q = val; render(); };
ACT.crudFilter = function(val, el) {
  var k = el.dataset.k.split('|');
  var link = k[0], fKey = k[1];
  S.filter = S.filter || {};
  S.filter[link] = S.filter[link] || {};
  S.filter[link][fKey] = val;
  save();
  render();
};

function boot() {
  initWorkspaces();
  initEvents();
  render();
}
