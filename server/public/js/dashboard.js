// =============================================================================
// AI Driven Analytics — Dashboard Client
// 6-page SPA with hash routing
// =============================================================================

(function () {
  'use strict';

  // Register datalabels plugin globally but disable by default
  if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels = { display: false };
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var COLORS = {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    opus: '#8b5cf6',
    sonnet: '#3b82f6',
    haiku: '#22d3ee',
    chart: [
      '#3b82f6', '#8b5cf6', '#22d3ee', '#22c55e',
      '#f59e0b', '#ef4444', '#ec4899', '#06b6d4',
      '#14b8a6', '#f97316',
    ],
  };

  var DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
  var PER_PAGE = 15;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var charts = {};
  var currentView = 'dashboard';
  var expandedMember = null;
  var expandedRepo = null;
  var feedTimer = null;
  var feedData = [];
  var feedPaused = false;
  var memberColorMap = {};
  var memberColorPalette = [
    '#3b82f6', '#8b5cf6', '#22d3ee', '#22c55e',
    '#f59e0b', '#ef4444', '#ec4899', '#06b6d4',
    '#14b8a6', '#f97316',
  ];

  // ---------------------------------------------------------------------------
  // Utility Functions
  // ---------------------------------------------------------------------------
  function formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return Number(n).toLocaleString();
  }

  function formatCompact(n) {
    if (n == null || isNaN(n)) return '0';
    n = Number(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  /**
   * Build a token detail breakdown HTML block.
   * @param {object} opts - { input, output, cacheCreation, cacheRead, compact }
   */
  function buildTokenDetail(opts) {
    var inp = Number(opts.input || 0);
    var out = Number(opts.output || 0);
    var cc = Number(opts.cacheCreation || 0);
    var cr = Number(opts.cacheRead || 0);
    var totalIn = inp + cc + cr;
    var totalOut = out;
    var compact = opts.compact;

    if (compact) {
      return '<div class="token-detail-compact">' +
        '<span class="td-total" title="Total Input / Output">' + formatCompact(totalIn) + ' in / ' + formatCompact(totalOut) + ' out</span>' +
        (cr > 0 ? '<span class="td-item td-cache" title="Cache Read">cache:' + formatCompact(cr) + '</span>' : '') +
        (cc > 0 ? '<span class="td-item td-cc" title="Cache Creation">cc:' + formatCompact(cc) + '</span>' : '') +
      '</div>';
    }

    return '<div class="token-detail">' +
      '<div class="td-row td-row-main">' +
        '<span class="td-label">Total</span>' +
        '<span class="td-val td-in">' + formatCompact(totalIn) + ' in</span>' +
        '<span class="td-sep">/</span>' +
        '<span class="td-val td-out">' + formatCompact(totalOut) + ' out</span>' +
      '</div>' +
      '<div class="td-row td-row-sub">' +
        '<span class="td-sub-item"><span class="td-sub-label">input</span> ' + formatCompact(inp) + '</span>' +
        '<span class="td-sub-item"><span class="td-sub-label">cache_read</span> ' + formatCompact(cr) + '</span>' +
        '<span class="td-sub-item"><span class="td-sub-label">cache_create</span> ' + formatCompact(cc) + '</span>' +
        '<span class="td-sub-item"><span class="td-sub-label">output</span> ' + formatCompact(out) + '</span>' +
      '</div>' +
    '</div>';
  }

  function formatPercent(value) {
    if (value == null || isNaN(value)) return '0%';
    return Number(value).toFixed(1) + '%';
  }

  function formatCost(value) {
    if (value == null || isNaN(value)) return '$0.00';
    return '$' + Number(value).toFixed(2);
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '-';
    if (seconds < 60) return seconds + 's';
    var m = Math.floor(seconds / 60);
    var s = Math.round(seconds % 60);
    if (m < 60) return m + 'm ' + s + 's';
    var h = Math.floor(m / 60);
    var rm = m % 60;
    return h + 'h ' + rm + 'm';
  }

  function formatDurationMs(ms) {
    if (!ms || ms <= 0) return '-';
    return formatDuration(Math.round(ms / 1000));
  }

  function shortModel(m) {
    if (!m) return 'unknown';
    if (m.includes('opus')) return 'Opus';
    if (m.includes('sonnet')) return 'Sonnet';
    if (m.includes('haiku')) return 'Haiku';
    return m.split('-').slice(0, 2).join('-');
  }

  function modelBadgeClass(m) {
    if (!m) return '';
    if (m.includes('opus')) return 'badge-opus';
    if (m.includes('sonnet')) return 'badge-sonnet';
    if (m.includes('haiku')) return 'badge-haiku';
    return '';
  }

  function shortRepo(r) {
    if (!r) return '-';
    var name = r.replace(/\.git$/, '').split('/').pop();
    return name || r;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      return d.toLocaleString('ja-JP', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  }

  function formatTimeShort(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      return d.toLocaleString('ja-JP', {
        hour: '2-digit', minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  // Prop accessor that handles both camelCase and snake_case
  function p(obj, camel, snake) {
    if (obj == null) return undefined;
    return obj[camel] !== undefined ? obj[camel] : obj[snake];
  }

  // ---------------------------------------------------------------------------
  // API Helpers
  // ---------------------------------------------------------------------------
  function getFilters() {
    return {
      from: document.getElementById('filter-from').value,
      to: document.getElementById('filter-to').value,
      member: document.getElementById('filter-member').value,
      repo: document.getElementById('filter-repo').value,
      model: document.getElementById('filter-model').value,
    };
  }

  function buildQuery(extra) {
    var params = {};
    var f = getFilters();
    Object.keys(f).forEach(function (k) { if (f[k]) params[k] = f[k]; });
    if (extra) {
      Object.keys(extra).forEach(function (k) { if (extra[k] != null && extra[k] !== '') params[k] = extra[k]; });
    }
    return Object.keys(params)
      .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }

  function fetchApi(endpoint, extra) {
    var q = buildQuery(extra);
    var url = '/api/dashboard' + endpoint + (q ? '?' + q : '');
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('API error: ' + res.status);
      return res.json();
    });
  }

  // ---------------------------------------------------------------------------
  // DOM Helpers
  // ---------------------------------------------------------------------------
  function el(id) { return document.getElementById(id); }

  function showLoading(container) {
    if (typeof container === 'string') container = el(container);
    if (container) container.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';
  }

  function showNoData(container, msg) {
    if (typeof container === 'string') container = el(container);
    if (container) container.innerHTML = '<div class="no-data">' + (msg || 'データがありません') + '</div>';
  }

  function showError(container, err) {
    if (typeof container === 'string') container = el(container);
    if (container) container.innerHTML = '<div class="error-msg">読み込みに失敗しました: ' + escapeHtml(err && err.message || String(err)) + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Chart Management
  // ---------------------------------------------------------------------------
  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  }

  function destroyAllCharts() {
    Object.keys(charts).forEach(function (k) {
      charts[k].destroy();
    });
    charts = {};
  }

  // Set chart.js defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148,163,184,0.1)';

  // ---------------------------------------------------------------------------
  // Filter Management
  // ---------------------------------------------------------------------------
  function loadFilters() {
    fetchApi('/filters').then(function (data) {
      populateSelect('filter-member', data.members || [], function (m) {
        return { value: m.gitEmail || m.git_email || m.id || m, label: m.gitEmail || m.git_email || m };
      });
      populateSelect('filter-repo', data.repos || [], function (r) {
        return { value: r, label: shortRepo(r) };
      });
      populateSelect('filter-model', data.models || [], function (m) {
        return { value: m, label: shortModel(m) };
      });
    }).catch(function (err) {
      console.warn('Failed to load filters:', err);
    });
  }

  function populateSelect(selectId, items, mapper) {
    var select = el(selectId);
    var firstOpt = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (firstOpt) select.appendChild(firstOpt);
    items.forEach(function (item) {
      var mapped = mapper(item);
      var opt = document.createElement('option');
      opt.value = mapped.value;
      opt.textContent = mapped.label;
      select.appendChild(opt);
    });
  }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  function setupRouter() {
    window.addEventListener('hashchange', handleHashChange);
  }

  function handleHashChange() {
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    var parts = hash.split('/');
    var page = parts[0];

    // Handle session detail route: #session/123
    if (page === 'session' && parts[1]) {
      switchToView('session-detail');
      renderSessionDetail(parts[1]);
      return;
    }

    var validPages = ['dashboard', 'tokens', 'members', 'repositories', 'sessions', 'prompt-feed'];
    if (validPages.indexOf(page) === -1) page = 'dashboard';

    switchToView(page);
    renderCurrentView(page);
  }

  function switchToView(page) {
    // Stop feed timer when navigating away
    if (currentView === 'prompt-feed' && page !== 'prompt-feed') {
      stopFeedTimer();
    }
    currentView = page;
    // Hide all views
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove('active');
    }
    // Show target view
    var target = el('view-' + page);
    if (target) target.classList.add('active');

    // Update sidebar active state
    var navLinks = document.querySelectorAll('#sidebar-nav a');
    for (var j = 0; j < navLinks.length; j++) {
      var link = navLinks[j];
      var linkPage = link.getAttribute('data-page');
      if (linkPage === page) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }

    // Show/hide filter bar for session detail
    var filterBar = el('filter-bar');
    if (page === 'session-detail') {
      filterBar.style.display = 'none';
    } else {
      filterBar.style.display = '';
    }
  }

  function renderCurrentView(page) {
    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'tokens': renderTokens(); break;
      case 'members': renderMembers(); break;
      case 'repositories': renderRepositories(); break;
      case 'sessions': renderSessions(1); break;
      case 'prompt-feed': renderPromptFeed(); break;
    }
  }

  // ---------------------------------------------------------------------------
  // View 1: Overview Dashboard
  // ---------------------------------------------------------------------------
  function renderDashboard() {
    var container = el('view-dashboard');
    container.innerHTML =
      '<div class="page-header"><h1>概要ダッシュボード</h1><p>チーム全体のClaude利用状況を一目で把握</p></div>' +
      '<div class="page-body">' +
        '<div class="kpi-grid" id="dash-kpi"></div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">日次トークン使用推移</span></div><div class="card-body"><div class="chart-container chart-container--md"><canvas id="chart-dash-daily"></canvas></div></div></div></div>' +
        '<div class="grid-2">' +
          '<div class="card"><div class="card-header"><span class="card-title">メンバー別トークン Top5</span></div><div class="card-body"><div class="chart-container chart-container--sm"><canvas id="chart-dash-members"></canvas></div></div></div>' +
          '<div class="card"><div class="card-header"><span class="card-title">リポジトリ別セッション Top5</span></div><div class="card-body"><div class="chart-container chart-container--sm"><canvas id="chart-dash-repos"></canvas></div></div></div>' +
        '</div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">リポジトリ &#xD7; 日付 トークンヒートマップ</span></div><div class="card-body" id="dash-repo-heatmap"></div></div></div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">メンバー &#xD7; 日付 アクティビティマップ</span></div><div class="card-body" id="dash-member-heatmap"></div></div></div>' +
        '<div class="grid-2">' +
          '<div class="card"><div class="card-header"><span class="card-title">モデル別コスト内訳</span></div><div class="card-body"><div class="chart-container" style="display:flex;justify-content:center;"><canvas id="chart-dash-model-cost" style="max-width:280px;max-height:280px;"></canvas></div></div></div>' +
          '<div class="card"><div class="card-header"><span class="card-title">ツールカテゴリ分布</span></div><div class="card-body"><div class="chart-container" style="display:flex;justify-content:center;"><canvas id="chart-dash-tool-cat" style="max-width:280px;max-height:280px;"></canvas></div></div></div>' +
        '</div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">メンバー生産性レーダー</span></div><div class="card-body"><div class="radar-container"><canvas id="chart-dash-radar"></canvas></div></div></div></div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">最近のセッション</span><a href="#sessions" class="btn btn-ghost" style="font-size:12px;">すべて表示 &#x2192;</a></div><div class="card-body card-body-flush" id="dash-recent-sessions"></div></div></div>' +
      '</div>';

    showLoading('dash-kpi');
    showLoading('dash-recent-sessions');

    // KPI
    fetchApi('/stats').then(function (d) {
      var totalTokens = (d.totalInputTokens || 0) + (d.totalOutputTokens || 0) + (d.totalCacheReadTokens || 0);
      var errorRate = d.totalToolUses > 0 ? ((d.toolErrorCount || d.errorCount || 0) / d.totalToolUses * 100) : 0;
      el('dash-kpi').innerHTML =
        kpiCard('blue', 'TK', formatCompact(totalTokens), '月間トークン消費量', '') +
        kpiCard('green', 'MB', String(d.activeMembers || d.activeMemberCount || 0), 'アクティブメンバー数', '') +
        kpiCard('purple', 'SS', formatNumber(d.totalSessions || 0), 'セッション数', '') +
        kpiCard('red', 'ER', formatPercent(errorRate), 'エラー率', (d.toolErrorCount || d.errorCount || 0) + ' failures');
    }).catch(function (e) { showError('dash-kpi', e); });

    // Daily chart
    fetchApi('/daily').then(function (data) {
      destroyChart('dash-daily');
      if (!data || !data.length) return;
      var canvas = document.getElementById('chart-dash-daily');
      charts['dash-daily'] = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.map(function (d) { return d.date; }),
          datasets: [
            {
              label: '入力トークン',
              data: data.map(function (d) { return p(d, 'totalInputTokens', 'total_input_tokens') || d.inputTokens || d.input_tokens || 0; }),
              borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20',
              fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3,
            },
            {
              label: '出力トークン',
              data: data.map(function (d) { return p(d, 'totalOutputTokens', 'total_output_tokens') || d.outputTokens || d.output_tokens || 0; }),
              borderColor: COLORS.warning, backgroundColor: COLORS.warning + '20',
              fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3,
            },
            {
              label: 'キャッシュRead',
              data: data.map(function (d) { return p(d, 'totalCacheReadTokens', 'total_cache_read_tokens') || d.cacheReadTokens || d.cache_read_tokens || 0; }),
              borderColor: COLORS.success, backgroundColor: COLORS.success + '20',
              fill: false, tension: 0.3, borderWidth: 1.5, pointRadius: 2, borderDash: [4, 4],
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + formatCompact(ctx.parsed.y); } } },
            datalabels: {
              display: function (ctx) { return ctx.datasetIndex === 0; },
              align: 'top', offset: 4,
              color: '#94a3b8', font: { size: 10 },
              formatter: function (v) { return formatCompact(v); },
            },
          },
          scales: {
            x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MM/dd' } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { callback: function (v) { return formatCompact(v); } } },
          },
        },
      });
    }).catch(function () {});

    // Member top5 chart
    fetchApi('/members').then(function (data) {
      destroyChart('dash-members');
      if (!data || !data.length) return;
      var sorted = data.slice().sort(function (a, b) {
        var at = (p(a, 'totalInputTokens', 'total_input_tokens') || 0) + (p(a, 'totalOutputTokens', 'total_output_tokens') || 0);
        var bt = (p(b, 'totalInputTokens', 'total_input_tokens') || 0) + (p(b, 'totalOutputTokens', 'total_output_tokens') || 0);
        return bt - at;
      });
      var top5 = sorted.slice(0, 5);
      charts['dash-members'] = new Chart(document.getElementById('chart-dash-members'), {
        type: 'bar',
        data: {
          labels: top5.map(function (d) { return p(d, 'gitEmail', 'git_email') || 'unknown'; }),
          datasets: [{
            label: 'トークン',
            data: top5.map(function (d) {
              return (p(d, 'totalInputTokens', 'total_input_tokens') || 0) + (p(d, 'totalOutputTokens', 'total_output_tokens') || 0);
            }),
            backgroundColor: COLORS.primary, borderRadius: 3,
          }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function (ctx) { return formatCompact(ctx.parsed.x) + ' tokens'; } } },
            datalabels: {
              display: true, anchor: 'end', align: 'start', offset: 8,
              color: '#fff', font: { size: 11, weight: 'bold' },
              formatter: function (v) { return formatCompact(v); },
            },
          },
          scales: {
            x: { beginAtZero: true, ticks: { callback: function (v) { return formatCompact(v); } } },
            y: { grid: { display: false } },
          },
        },
      });
    }).catch(function () {});

    // Repo top5 chart
    fetchApi('/repos').then(function (data) {
      destroyChart('dash-repos');
      if (!data || !data.length) return;
      var sorted = data.slice().sort(function (a, b) {
        return (p(b, 'sessionCount', 'session_count') || 0) - (p(a, 'sessionCount', 'session_count') || 0);
      });
      var top5 = sorted.slice(0, 5);
      charts['dash-repos'] = new Chart(document.getElementById('chart-dash-repos'), {
        type: 'bar',
        data: {
          labels: top5.map(function (d) { return shortRepo(p(d, 'gitRepo', 'git_repo') || ''); }),
          datasets: [{
            label: 'セッション',
            data: top5.map(function (d) { return p(d, 'sessionCount', 'session_count') || 0; }),
            backgroundColor: COLORS.sonnet, borderRadius: 3,
          }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: {
              display: true, anchor: 'end', align: 'end', offset: 4,
              color: '#e2e8f0', font: { size: 11, weight: 'bold' },
              formatter: function (v) { return formatNumber(v); },
            },
          },
          layout: { padding: { right: 40 } },
          scales: {
            x: { beginAtZero: true },
            y: { grid: { display: false } },
          },
        },
      });
    }).catch(function () {});

    // Repo x Date heatmap
    showLoading('dash-repo-heatmap');
    fetchApi('/repo-date-heatmap').then(function (data) {
      if (!data || !data.length) { showNoData('dash-repo-heatmap'); return; }
      el('dash-repo-heatmap').innerHTML = buildMatrixHeatmap(data, 'gitRepo', 'date', 'totalTokens', {
        labelFn: shortRepo,
        valueFmt: formatCompact,
        color: [59, 130, 246],
        unitLabel: 'tokens',
      });
    }).catch(function (e) { showError('dash-repo-heatmap', e); });

    // Member x Date heatmap
    showLoading('dash-member-heatmap');
    fetchApi('/member-date-heatmap').then(function (data) {
      if (!data || !data.length) { showNoData('dash-member-heatmap'); return; }
      el('dash-member-heatmap').innerHTML = buildMatrixHeatmap(data, 'gitEmail', 'date', 'sessionCount', {
        labelFn: function (v) { return v; },
        valueFmt: formatNumber,
        color: [34, 197, 94],
        unitLabel: 'sessions',
      });
    }).catch(function (e) { showError('dash-member-heatmap', e); });

    // Model cost doughnut
    fetchApi('/costs').then(function (data) {
      destroyChart('dash-model-cost');
      if (!data || !data.length) return;
      // Aggregate cost by model
      var modelMap = {};
      data.forEach(function (d) {
        var m = d.model || 'unknown';
        modelMap[m] = (modelMap[m] || 0) + (d.cost || 0);
      });
      var labels = Object.keys(modelMap);
      var values = labels.map(function (l) { return Math.round(modelMap[l] * 100) / 100; });
      charts['dash-model-cost'] = new Chart(document.getElementById('chart-dash-model-cost'), {
        type: 'doughnut',
        data: {
          labels: labels.map(shortModel),
          datasets: [{
            data: values,
            backgroundColor: [COLORS.opus, COLORS.sonnet, COLORS.haiku].concat(COLORS.chart.slice(3)),
            borderWidth: 0, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, cutout: '55%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                  return ctx.label + ': $' + ctx.parsed.toFixed(2) + ' (' + pct + '%)';
                },
              },
            },
            datalabels: {
              display: true, color: '#fff', font: { size: 11, weight: 'bold' },
              formatter: function (v, ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                return '$' + v.toFixed(1) + '\n' + pct + '%';
              },
            },
          },
        },
      });
    }).catch(function () {});

    // Tool category doughnut
    fetchApi('/tools').then(function (data) {
      destroyChart('dash-tool-cat');
      if (!data || !data.length) return;
      // Aggregate by toolCategory
      var catMap = {};
      data.forEach(function (t) {
        var cat = t.toolCategory || t.tool_category || 'other';
        catMap[cat] = (catMap[cat] || 0) + (t.useCount || t.use_count || 0);
      });
      var catLabels = Object.keys(catMap).sort(function (a, b) { return catMap[b] - catMap[a]; });
      var catValues = catLabels.map(function (k) { return catMap[k]; });
      charts['dash-tool-cat'] = new Chart(document.getElementById('chart-dash-tool-cat'), {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues,
            backgroundColor: COLORS.chart,
            borderWidth: 0, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, cutout: '55%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                  return ctx.label + ': ' + formatNumber(ctx.parsed) + ' (' + pct + '%)';
                },
              },
            },
            datalabels: {
              display: function (ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                return total > 0 && (ctx.dataset.data[ctx.dataIndex] / total) > 0.05;
              },
              color: '#fff', font: { size: 11, weight: 'bold' },
              formatter: function (v, ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                return formatCompact(v) + '\n' + pct + '%';
              },
            },
          },
        },
      });
    }).catch(function () {});

    // Productivity Radar
    fetchApi('/productivity').then(function (data) {
      destroyChart('dash-radar');
      if (!data || data.length < 2) return;
      // Normalize values to 0-100 scale for radar
      var maxTokens = 0, maxSessions = 0, maxTurns = 0, maxTools = 0, maxSubagents = 0;
      data.forEach(function (d) {
        if (d.totalTokens > maxTokens) maxTokens = d.totalTokens;
        if (d.sessionCount > maxSessions) maxSessions = d.sessionCount;
        if (d.totalTurns > maxTurns) maxTurns = d.totalTurns;
        if (d.totalToolUses > maxTools) maxTools = d.totalToolUses;
        if (d.totalSubagents > maxSubagents) maxSubagents = d.totalSubagents;
      });
      var norm = function (v, mx) { return mx > 0 ? Math.round((v / mx) * 100) : 0; };
      var datasets = data.slice(0, 6).map(function (d, i) {
        return {
          label: d.gitEmail || d.git_email || d.displayName,
          data: [
            norm(d.sessionCount, maxSessions),
            norm(d.totalTurns, maxTurns),
            norm(d.totalToolUses, maxTools),
            norm(d.totalTokens, maxTokens),
            norm(d.totalSubagents, maxSubagents),
            100 - (d.errorRate || 0),
          ],
          borderColor: COLORS.chart[i % COLORS.chart.length],
          backgroundColor: COLORS.chart[i % COLORS.chart.length] + '20',
          borderWidth: 2, pointRadius: 3,
        };
      });
      charts['dash-radar'] = new Chart(document.getElementById('chart-dash-radar'), {
        type: 'radar',
        data: {
          labels: ['セッション数', 'ターン数', 'ツール使用', 'トークン量', 'サブエージェント', '安定性'],
          datasets: datasets,
        },
        options: {
          responsive: true,
          scales: {
            r: {
              beginAtZero: true, max: 100,
              ticks: { display: false, stepSize: 20 },
              grid: { color: 'rgba(148,163,184,0.15)' },
              pointLabels: { color: '#94a3b8', font: { size: 11 } },
              angleLines: { color: 'rgba(148,163,184,0.1)' },
            },
          },
          plugins: {
            legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', color: '#94a3b8' } },
            tooltip: {
              callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.r + '%'; } },
            },
          },
        },
      });
    }).catch(function () {});

    // Recent sessions
    fetchApi('/sessions', { page: 1, per_page: 5 }).then(function (resp) {
      var data = resp.data || resp.sessions || [];
      if (!data.length) {
        showNoData('dash-recent-sessions');
        return;
      }
      el('dash-recent-sessions').innerHTML = buildSessionTable(data, false, true);
      attachSessionRowClicks('dash-recent-sessions');
    }).catch(function (e) { showError('dash-recent-sessions', e); });
  }

  // ---------------------------------------------------------------------------
  // View 2: Token Analysis
  // ---------------------------------------------------------------------------
  function renderTokens() {
    var container = el('view-tokens');
    container.innerHTML =
      '<div class="page-header"><h1>トークン利用分析</h1><p>トークン消費の詳細分析 &#x2014; モデル別・種別別の内訳</p></div>' +
      '<div class="page-body">' +
        '<div class="kpi-grid" id="tok-kpi"></div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">日次トークン消費推移</span></div><div class="card-body"><div class="chart-container chart-container--md"><canvas id="chart-tok-daily"></canvas></div></div></div></div>' +
        '<div class="grid-2">' +
          '<div class="card"><div class="card-header"><span class="card-title">モデル別トークン比率</span></div><div class="card-body"><div class="chart-container" style="display:flex;justify-content:center;"><canvas id="chart-tok-model" style="max-width:300px;max-height:300px;"></canvas></div></div></div>' +
          '<div class="card"><div class="card-header"><span class="card-title">トークン種別内訳</span></div><div class="card-body"><div class="chart-container" style="display:flex;justify-content:center;"><canvas id="chart-tok-type" style="max-width:300px;max-height:300px;"></canvas></div></div></div>' +
        '</div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">メンバー別トークン消費</span></div><div class="card-body card-body-flush" id="tok-member-table"></div></div></div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">高トークンセッション Top10</span></div><div class="card-body card-body-flush" id="tok-top-sessions"></div></div></div>' +
      '</div>';

    showLoading('tok-kpi');
    showLoading('tok-member-table');
    showLoading('tok-top-sessions');

    // KPI
    fetchApi('/stats').then(function (d) {
      var totalInput = d.totalInputTokens || 0;
      var totalOutput = d.totalOutputTokens || 0;
      var totalCacheCreate = d.totalCacheCreationTokens || 0;
      var totalCacheRead = d.totalCacheReadTokens || 0;
      var totalAll = totalInput + totalOutput + totalCacheCreate + totalCacheRead;
      var cacheEff = totalAll > 0 ? (totalCacheRead / totalAll * 100) : 0;
      el('tok-kpi').innerHTML =
        kpiCard('blue', 'IN', formatCompact(totalInput), '総入力トークン', '') +
        kpiCard('amber', 'OUT', formatCompact(totalOutput), '総出力トークン', '') +
        kpiCard('purple', 'CC', formatCompact(totalCacheCreate), 'キャッシュ作成', '') +
        kpiCard('green', 'CE', formatPercent(cacheEff), 'キャッシュ効率', formatCompact(totalCacheRead) + ' cache read');
    }).catch(function (e) { showError('tok-kpi', e); });

    // Daily token chart (stacked bar)
    fetchApi('/daily').then(function (data) {
      destroyChart('tok-daily');
      if (!data || !data.length) return;
      charts['tok-daily'] = new Chart(document.getElementById('chart-tok-daily'), {
        type: 'bar',
        data: {
          labels: data.map(function (d) { return d.date; }),
          datasets: [
            {
              label: '入力',
              data: data.map(function (d) { return p(d, 'totalInputTokens', 'total_input_tokens') || d.inputTokens || d.input_tokens || 0; }),
              backgroundColor: COLORS.primary, borderRadius: 2,
            },
            {
              label: '出力',
              data: data.map(function (d) { return p(d, 'totalOutputTokens', 'total_output_tokens') || d.outputTokens || d.output_tokens || 0; }),
              backgroundColor: COLORS.warning, borderRadius: 2,
            },
            {
              label: 'キャッシュRead',
              data: data.map(function (d) { return p(d, 'totalCacheReadTokens', 'total_cache_read_tokens') || d.cacheReadTokens || d.cache_read_tokens || 0; }),
              backgroundColor: COLORS.success, borderRadius: 2,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'rect' } },
            tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + formatCompact(ctx.parsed.y); } } },
            datalabels: {
              display: function (ctx) { return ctx.datasetIndex === 0; },
              anchor: 'end', align: 'end',
              color: '#94a3b8', font: { size: 9 },
              formatter: function (v, ctx) {
                var total = 0;
                ctx.chart.data.datasets.forEach(function (ds) { total += ds.data[ctx.dataIndex] || 0; });
                return formatCompact(total);
              },
            },
          },
          scales: {
            x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MM/dd' } }, stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true, ticks: { callback: function (v) { return formatCompact(v); } } },
          },
        },
      });
    }).catch(function () {});

    // Model doughnut
    fetchApi('/costs').then(function (data) {
      destroyChart('tok-model');
      if (!data || !data.length) return;
      // Aggregate by model
      var modelMap = {};
      data.forEach(function (d) {
        var m = d.model || 'unknown';
        modelMap[m] = (modelMap[m] || 0) + (d.cost || 0);
      });
      var modelLabels = Object.keys(modelMap);
      var modelValues = modelLabels.map(function (l) { return Math.round(modelMap[l] * 100) / 100; });
      charts['tok-model'] = new Chart(document.getElementById('chart-tok-model'), {
        type: 'doughnut',
        data: {
          labels: modelLabels.map(function (d) { return shortModel(d); }),
          datasets: [{
            data: modelValues,
            backgroundColor: [COLORS.opus, COLORS.sonnet, COLORS.haiku].concat(COLORS.chart.slice(3)),
            borderWidth: 0, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                  return ctx.label + ': ' + formatCompact(ctx.parsed) + ' (' + pct + '%)';
                },
              },
            },
            datalabels: {
              display: true, color: '#fff', font: { size: 11, weight: 'bold' },
              formatter: function (v, ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                return formatCompact(v) + '\n' + pct + '%';
              },
            },
          },
        },
      });
    }).catch(function () {});

    // Token type doughnut
    fetchApi('/stats').then(function (d) {
      destroyChart('tok-type');
      var vals = [
        d.totalInputTokens || 0,
        d.totalOutputTokens || 0,
        d.totalCacheCreationTokens || 0,
        d.totalCacheReadTokens || 0,
      ];
      if (vals.every(function (v) { return v === 0; })) return;
      charts['tok-type'] = new Chart(document.getElementById('chart-tok-type'), {
        type: 'doughnut',
        data: {
          labels: ['入力', '出力', 'キャッシュ作成', 'キャッシュRead'],
          datasets: [{
            data: vals,
            backgroundColor: [COLORS.primary, COLORS.warning, COLORS.purple, COLORS.success],
            borderWidth: 0, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                  return ctx.label + ': ' + formatCompact(ctx.parsed) + ' (' + pct + '%)';
                },
              },
            },
            datalabels: {
              display: true, color: '#fff', font: { size: 11, weight: 'bold' },
              formatter: function (v, ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                return formatCompact(v) + '\n' + pct + '%';
              },
            },
          },
        },
      });
    }).catch(function () {});

    // Member token table
    fetchApi('/members').then(function (data) {
      if (!data || !data.length) { showNoData('tok-member-table'); return; }
      var sorted = data.slice().sort(function (a, b) {
        var at = (p(a, 'totalInputTokens', 'total_input_tokens') || 0) + (p(a, 'totalOutputTokens', 'total_output_tokens') || 0);
        var bt = (p(b, 'totalInputTokens', 'total_input_tokens') || 0) + (p(b, 'totalOutputTokens', 'total_output_tokens') || 0);
        return bt - at;
      });
      var html = '<table class="data-table"><thead><tr>' +
        '<th>メンバー</th><th class="text-right">入力</th><th class="text-right">出力</th>' +
        '<th class="text-right">キャッシュ作成</th><th class="text-right">キャッシュRead</th>' +
        '<th class="text-right">合計</th><th class="text-right">セッション数</th>' +
        '</tr></thead><tbody>';
      sorted.forEach(function (m) {
        var inp = p(m, 'totalInputTokens', 'total_input_tokens') || 0;
        var out = p(m, 'totalOutputTokens', 'total_output_tokens') || 0;
        var cc = p(m, 'totalCacheCreationTokens', 'total_cache_creation_tokens') || 0;
        var cr = p(m, 'totalCacheReadTokens', 'total_cache_read_tokens') || 0;
        var total = inp + out + cc + cr;
        html += '<tr>' +
          '<td>' + escapeHtml(p(m, 'gitEmail', 'git_email') || '') + '</td>' +
          '<td class="text-right font-mono">' + formatNumber(inp) + '</td>' +
          '<td class="text-right font-mono">' + formatNumber(out) + '</td>' +
          '<td class="text-right font-mono">' + formatNumber(cc) + '</td>' +
          '<td class="text-right font-mono">' + formatNumber(cr) + '</td>' +
          '<td class="text-right font-mono" style="font-weight:700;">' + formatNumber(total) + '</td>' +
          '<td class="text-right">' + (p(m, 'sessionCount', 'session_count') || 0) + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      el('tok-member-table').innerHTML = html;
    }).catch(function (e) { showError('tok-member-table', e); });

    // Top sessions by token
    fetchApi('/sessions', { page: 1, per_page: 10 }).then(function (resp) {
      var data = resp.data || resp.sessions || [];
      if (!data.length) { showNoData('tok-top-sessions'); return; }
      // Sort by total tokens descending
      var sorted = data.slice().sort(function (a, b) {
        var at = (p(a, 'totalInputTokens', 'total_input_tokens') || 0) + (p(a, 'totalOutputTokens', 'total_output_tokens') || 0);
        var bt = (p(b, 'totalInputTokens', 'total_input_tokens') || 0) + (p(b, 'totalOutputTokens', 'total_output_tokens') || 0);
        return bt - at;
      }).slice(0, 10);
      var html = '<table class="data-table"><thead><tr>' +
        '<th>#</th><th>日時</th><th>メンバー</th><th>モデル</th>' +
        '<th class="text-right">入力</th><th class="text-right">出力</th>' +
        '<th class="text-right">合計</th><th>リポジトリ</th>' +
        '</tr></thead><tbody>';
      sorted.forEach(function (s, i) {
        var inp = p(s, 'totalInputTokens', 'total_input_tokens') || 0;
        var out = p(s, 'totalOutputTokens', 'total_output_tokens') || 0;
        var member = s.member ? (p(s.member, 'gitEmail', 'git_email') || '-') : (p(s, 'gitEmail', 'git_email') || '-');
        html += '<tr class="clickable-row" data-session-id="' + (s.id || p(s, 'sessionId', 'session_id') || '') + '">' +
          '<td class="text-muted">' + (i + 1) + '</td>' +
          '<td class="text-muted">' + formatDateShort(p(s, 'startedAt', 'started_at') || p(s, 'createdAt', 'created_at')) + '</td>' +
          '<td>' + escapeHtml(member) + '</td>' +
          '<td><span class="badge ' + modelBadgeClass(s.model) + '">' + escapeHtml(shortModel(s.model)) + '</span></td>' +
          '<td class="text-right font-mono">' + formatNumber(inp) + '</td>' +
          '<td class="text-right font-mono">' + formatNumber(out) + '</td>' +
          '<td class="text-right font-mono" style="font-weight:700;">' + formatNumber(inp + out) + '</td>' +
          '<td>' + escapeHtml(shortRepo(p(s, 'gitRepo', 'git_repo'))) + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      el('tok-top-sessions').innerHTML = html;
      attachSessionRowClicks('tok-top-sessions');
    }).catch(function (e) { showError('tok-top-sessions', e); });
  }

  // ---------------------------------------------------------------------------
  // View 3: Member Analysis
  // ---------------------------------------------------------------------------
  function renderMembers() {
    var container = el('view-members');
    container.innerHTML =
      '<div class="page-header"><h1>メンバー分析</h1><p>メンバー別のClaude Code利用状況を把握し、活用度を確認</p></div>' +
      '<div class="page-body">' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">メンバー × 日付 トークン数</span></div><div class="card-body" id="mem-token-heatmap"></div></div></div>' +
        '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">メンバー × 日付 ターン / セッション数</span></div><div class="card-body" id="mem-turn-heatmap"></div></div></div>' +
        '<div class="split-layout">' +
          '<div class="split-left">' +
            '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">メンバー一覧</span></div><div class="card-body card-body-flush" id="mem-table"></div></div></div>' +
          '</div>' +
          '<div class="split-right" id="mem-detail-panel"></div>' +
        '</div>' +
      '</div>';

    showLoading('mem-token-heatmap');
    showLoading('mem-turn-heatmap');
    showLoading('mem-table');
    expandedMember = null;

    fetchApi('/members').then(function (data) {
      if (!data || !data.length) { showNoData('mem-table'); return; }
      renderMemberTable(data);
    }).catch(function (e) { showError('mem-table', e); });

    fetchApi('/member-date-heatmap').then(function (data) {
      if (!data || !data.length) {
        showNoData('mem-token-heatmap');
        showNoData('mem-turn-heatmap');
        return;
      }
      el('mem-token-heatmap').innerHTML = buildMatrixHeatmap(data, 'displayName', 'date', 'totalTokens', {
        labelFn: function (v) { return v; },
        valueFmt: formatCompact,
        color: [59, 130, 246],
        unitLabel: 'tokens',
      });
      el('mem-turn-heatmap').innerHTML = buildMatrixHeatmap(data, 'displayName', 'date', 'turnCount', {
        labelFn: function (v) { return v; },
        valueFmt: formatNumber,
        color: [34, 197, 94],
        unitLabel: 'turns',
        secondaryKey: 'sessionCount',
        secondaryLabel: 'sessions',
        secondaryFmt: formatNumber,
      });
    }).catch(function (e) {
      showError('mem-token-heatmap', e);
      showError('mem-turn-heatmap', e);
    });
  }

  function renderMemberTable(data) {
    var html = '<table class="data-table"><thead><tr>' +
      '<th>メンバー</th>' +
      '<th class="text-right">セッション数</th><th class="text-right">ターン数</th>' +
      '<th class="text-right">トークン合計</th><th class="text-right">サブエージェント</th>' +
      '<th class="text-right">エラー率</th><th>最終利用</th>' +
      '</tr></thead><tbody>';
    data.forEach(function (m) {
      var memberId = p(m, 'gitEmail', 'git_email') || '';
      var isSelected = expandedMember === memberId;
      var totalTokens = (p(m, 'totalInputTokens', 'total_input_tokens') || 0) + (p(m, 'totalOutputTokens', 'total_output_tokens') || 0);
      var errRate = p(m, 'errorRate', 'error_rate') || 0;
      var errBadge = errRate > 5 ? 'badge-danger' : errRate > 3 ? 'badge-warning' : 'badge-success';
      html += '<tr class="' + (isSelected ? 'row-selected' : '') + ' clickable-row" data-member="' + escapeHtml(memberId) + '">' +
        '<td><strong>' + escapeHtml(memberId) + '</strong></td>' +
        '<td class="text-right font-mono">' + formatNumber(p(m, 'sessionCount', 'session_count') || 0) + '</td>' +
        '<td class="text-right font-mono">' + formatNumber(p(m, 'turnCount', 'turn_count') || 0) + '</td>' +
        '<td class="text-right font-mono">' + formatNumber(totalTokens) + '</td>' +
        '<td class="text-right font-mono">' + formatNumber(p(m, 'subagentCount', 'subagent_count') || 0) + '</td>' +
        '<td class="text-right"><span class="badge ' + errBadge + '">' + formatPercent(errRate) + '</span></td>' +
        '<td class="text-muted">' + formatDateShort(p(m, 'lastUsed', 'last_used') || '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el('mem-table').innerHTML = html;

    // Attach click handlers
    el('mem-table').querySelectorAll('tr[data-member]').forEach(function (row) {
      row.addEventListener('click', function () {
        var memberId = row.getAttribute('data-member');
        var panel = el('mem-detail-panel');
        if (expandedMember === memberId) {
          expandedMember = null;
          panel.innerHTML = '';
          panel.classList.remove('open');
          renderMemberTable(data);
        } else {
          expandedMember = memberId;
          renderMemberTable(data);
          loadMemberDetail(memberId);
        }
      });
    });
  }

  function loadMemberDetail(memberId) {
    var panel = el('mem-detail-panel');
    panel.classList.add('open');
    showLoading(panel);
    fetchApi('/member-detail', { email: memberId }).then(function (detail) {
      var html = '<div class="detail-panel">' +
        '<button class="detail-close" id="mem-detail-close">&times;</button>' +
        '<div class="detail-panel-header">' +
          '<div><h3>' + escapeHtml(memberId) + '</h3></div>' +
        '</div>' +
        '<div class="detail-panel-body">' +
          '<div class="detail-grid-2">' +
            '<div class="mini-chart"><div class="mini-chart-title">日別トークン推移</div><div class="chart-container"><canvas id="chart-mem-detail-daily"></canvas></div></div>' +
            '<div class="mini-chart"><div class="mini-chart-title">モデル利用比率</div><div class="chart-container" style="display:flex;justify-content:center;"><canvas id="chart-mem-detail-model" style="max-width:200px;max-height:200px;"></canvas></div></div>' +
          '</div>';

      // Recent sessions
      var sessions = detail.recentSessions || detail.recent_sessions || [];
      if (sessions.length > 0) {
        html += '<div class="section-title">最近のセッション (' + sessions.length + '件)</div>';
        html += buildSessionTable(sessions, false, true);
      }

      html += '</div></div>';
      panel.innerHTML = html;

      // Render daily chart
      var dailyStats = detail.dailyStats || detail.daily_stats || [];
      if (dailyStats.length > 0) {
        destroyChart('mem-detail-daily');
        charts['mem-detail-daily'] = new Chart(document.getElementById('chart-mem-detail-daily'), {
          type: 'bar',
          data: {
            labels: dailyStats.map(function (d) { return d.date; }),
            datasets: [{
              label: 'トークン',
              data: dailyStats.map(function (d) {
                return (p(d, 'totalInputTokens', 'total_input_tokens') || d.inputTokens || 0) +
                       (p(d, 'totalOutputTokens', 'total_output_tokens') || d.outputTokens || 0);
              }),
              backgroundColor: COLORS.primary, borderRadius: 2,
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              datalabels: {
                display: true, anchor: 'end', align: 'end',
                color: '#94a3b8', font: { size: 9 },
                formatter: function (v) { return formatCompact(v); },
              },
            },
            scales: {
              x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MM/dd' } }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { callback: function (v) { return formatCompact(v); } } },
            },
          },
        });
      }

      // Render model chart
      var modelData = detail.modelBreakdown || detail.model_breakdown || [];
      if (modelData.length > 0) {
        destroyChart('mem-detail-model');
        charts['mem-detail-model'] = new Chart(document.getElementById('chart-mem-detail-model'), {
          type: 'doughnut',
          data: {
            labels: modelData.map(function (d) { return shortModel(d.model); }),
            datasets: [{
              data: modelData.map(function (d) { return d.count || d.sessionCount || d.totalTokens || 0; }),
              backgroundColor: [COLORS.opus, COLORS.sonnet, COLORS.haiku].concat(COLORS.chart.slice(3)),
              borderWidth: 0, hoverOffset: 4,
            }],
          },
          options: {
            responsive: true, cutout: '55%',
            plugins: {
              legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
              datalabels: {
                display: true, color: '#fff', font: { size: 10, weight: 'bold' },
                formatter: function (v, ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                  return pct + '%';
                },
              },
            },
          },
        });
      }

      // Attach session row clicks in detail panel
      attachSessionRowClicks(panel);

      // Close button
      var closeBtn = el('mem-detail-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          expandedMember = null;
          panel.innerHTML = '';
          panel.classList.remove('open');
          el('mem-table').querySelectorAll('tr.row-selected').forEach(function (r) { r.classList.remove('row-selected'); });
        });
      }
    }).catch(function (e) { showError(panel, e); });
  }

  // ---------------------------------------------------------------------------
  // View 4: Repository Analysis
  // ---------------------------------------------------------------------------
  function renderRepositories() {
    var container = el('view-repositories');
    container.innerHTML =
      '<div class="page-header"><h1>リポジトリ分析</h1><p>リポジトリ単位でClaude Codeの利用状況を分析</p></div>' +
      '<div class="page-body">' +
        '<div class="kpi-grid" id="repo-kpi"></div>' +
        '<div class="split-layout">' +
          '<div class="split-left">' +
            '<div class="grid-1"><div class="card"><div class="card-header"><span class="card-title">リポジトリ別セッション・トークン</span></div><div class="card-body card-body-flush" id="repo-table"></div></div></div>' +
          '</div>' +
          '<div class="split-right" id="repo-detail-panel"></div>' +
        '</div>' +
      '</div>';

    showLoading('repo-kpi');
    showLoading('repo-table');
    expandedRepo = null;

    // KPI
    Promise.all([fetchApi('/stats'), fetchApi('/repos')]).then(function (results) {
      var stats = results[0];
      var repos = results[1] || [];
      var totalTokens = (stats.totalInputTokens || 0) + (stats.totalOutputTokens || 0);
      el('repo-kpi').innerHTML =
        kpiCard('blue', 'RP', String(stats.repoCount || repos.length || 0), 'リポジトリ数', '') +
        kpiCard('purple', 'SS', formatNumber(stats.totalSessions || 0), '総セッション', '') +
        kpiCard('amber', 'TK', formatCompact(totalTokens), '総トークン', '') +
        kpiCard('green', 'MB', String(stats.activeMembers || stats.activeMemberCount || 0), 'アクティブメンバー', '');

      if (!repos.length) { showNoData('repo-table'); return; }
      renderRepoTable(repos);
    }).catch(function (e) {
      showError('repo-kpi', e);
      showError('repo-table', e);
    });
  }

  function renderRepoTable(data) {
    var html = '<table class="data-table"><thead><tr>' +
      '<th>リポジトリ名</th>' +
      '<th class="text-right">セッション数</th><th class="text-right">トークン合計</th>' +
      '<th class="text-right">メンバー数</th><th>最終利用</th>' +
      '</tr></thead><tbody>';
    data.forEach(function (r) {
      var repoId = p(r, 'gitRepo', 'git_repo') || '';
      var isSelected = expandedRepo === repoId;
      var totalTokens = (p(r, 'totalInputTokens', 'total_input_tokens') || 0) + (p(r, 'totalOutputTokens', 'total_output_tokens') || 0);
      html += '<tr class="' + (isSelected ? 'row-selected' : '') + ' clickable-row" data-repo="' + escapeHtml(repoId) + '">' +
        '<td><strong>' + escapeHtml(shortRepo(repoId)) + '</strong><div style="font-size:11px;color:var(--text-muted);">' + escapeHtml(repoId) + '</div></td>' +
        '<td class="text-right font-mono">' + formatNumber(p(r, 'sessionCount', 'session_count') || 0) + '</td>' +
        '<td class="text-right font-mono">' + formatNumber(totalTokens) + '</td>' +
        '<td class="text-right font-mono">' + formatNumber(p(r, 'memberCount', 'member_count') || 0) + '</td>' +
        '<td class="text-muted">' + formatDateShort(p(r, 'lastUsed', 'last_used') || '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el('repo-table').innerHTML = html;

    el('repo-table').querySelectorAll('tr[data-repo]').forEach(function (row) {
      row.addEventListener('click', function () {
        var repoId = row.getAttribute('data-repo');
        var panel = el('repo-detail-panel');
        if (expandedRepo === repoId) {
          expandedRepo = null;
          panel.innerHTML = '';
          panel.classList.remove('open');
          renderRepoTable(data);
        } else {
          expandedRepo = repoId;
          renderRepoTable(data);
          loadRepoDetail(repoId);
        }
      });
    });
  }

  function loadRepoDetail(repoId) {
    var panel = el('repo-detail-panel');
    panel.classList.add('open');
    showLoading(panel);
    fetchApi('/repo-detail', { name: repoId }).then(function (detail) {
      var html = '<div class="detail-panel">' +
        '<button class="detail-close" id="repo-detail-close">&times;</button>' +
        '<div class="detail-panel-header">' +
          '<div><h3>' + escapeHtml(shortRepo(repoId)) + '</h3>' +
          '<div class="sub">' + escapeHtml(repoId) + '</div></div>' +
        '</div>' +
        '<div class="detail-panel-body">' +
          '<div class="detail-grid-2">' +
            '<div class="mini-chart"><div class="mini-chart-title">日別セッション推移</div><div class="chart-container"><canvas id="chart-repo-detail-daily"></canvas></div></div>' +
            '<div class="mini-chart"><div class="mini-chart-title">メンバー別利用比率</div><div class="chart-container" style="display:flex;justify-content:center;"><canvas id="chart-repo-detail-members" style="max-width:200px;max-height:200px;"></canvas></div></div>' +
          '</div>';

      // Branches
      var branches = detail.branches || [];
      if (branches.length > 0) {
        html += '<div class="section-title">ブランチ別集計</div>' +
          '<table class="data-table" style="margin-bottom:20px;"><thead><tr>' +
          '<th>ブランチ名</th><th class="text-right">セッション数</th><th class="text-right">トークン合計</th>' +
          '</tr></thead><tbody>';
        branches.forEach(function (b) {
          var bTokens = (p(b, 'totalInputTokens', 'total_input_tokens') || 0) + (p(b, 'totalOutputTokens', 'total_output_tokens') || 0);
          html += '<tr><td><span class="branch-name">' + escapeHtml(b.branch || p(b, 'gitBranch', 'git_branch') || '') + '</span></td>' +
            '<td class="text-right font-mono">' + formatNumber(p(b, 'sessionCount', 'session_count') || 0) + '</td>' +
            '<td class="text-right font-mono">' + formatNumber(bTokens) + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      // Recent sessions
      var sessions = detail.recentSessions || detail.recent_sessions || [];
      if (sessions.length > 0) {
        html += '<div class="section-title">最近のセッション (' + sessions.length + '件)</div>';
        html += buildSessionTable(sessions, false, true);
      }

      html += '</div></div>';
      panel.innerHTML = html;

      // Render daily chart for repo
      var dailyStats = detail.dailyStats || detail.daily_stats || [];
      if (dailyStats.length > 0) {
        destroyChart('repo-detail-daily');
        charts['repo-detail-daily'] = new Chart(document.getElementById('chart-repo-detail-daily'), {
          type: 'bar',
          data: {
            labels: dailyStats.map(function (d) { return d.date; }),
            datasets: [{
              label: 'セッション',
              data: dailyStats.map(function (d) { return p(d, 'sessionCount', 'session_count') || d.count || 0; }),
              backgroundColor: COLORS.sonnet, borderRadius: 2,
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              datalabels: {
                display: true, anchor: 'end', align: 'end',
                color: '#94a3b8', font: { size: 9 },
                formatter: function (v) { return v > 0 ? v : ''; },
              },
            },
            scales: {
              x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MM/dd' } }, grid: { display: false } },
              y: { beginAtZero: true },
            },
          },
        });
      }

      // Members breakdown doughnut
      var members = detail.members || [];
      if (members.length > 0) {
        destroyChart('repo-detail-members');
        charts['repo-detail-members'] = new Chart(document.getElementById('chart-repo-detail-members'), {
          type: 'doughnut',
          data: {
            labels: members.map(function (m) { return p(m, 'gitEmail', 'git_email') || ''; }),
            datasets: [{
              data: members.map(function (m) { return p(m, 'sessionCount', 'session_count') || m.count || 0; }),
              backgroundColor: COLORS.chart,
              borderWidth: 0, hoverOffset: 4,
            }],
          },
          options: {
            responsive: true, cutout: '55%',
            plugins: {
              legend: { position: 'bottom', labels: { padding: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
              datalabels: {
                display: function (ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  return total > 0 && (ctx.dataset.data[ctx.dataIndex] / total) > 0.05;
                },
                color: '#fff', font: { size: 10, weight: 'bold' },
                formatter: function (v, ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                  return pct + '%';
                },
              },
            },
          },
        });
      }

      attachSessionRowClicks(panel);

      // Close button
      var closeBtn = el('repo-detail-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          expandedRepo = null;
          panel.innerHTML = '';
          panel.classList.remove('open');
          el('repo-table').querySelectorAll('tr.row-selected').forEach(function (r) { r.classList.remove('row-selected'); });
        });
      }
    }).catch(function (e) { showError(panel, e); });
  }

  // ---------------------------------------------------------------------------
  // View 5: Session History
  // ---------------------------------------------------------------------------
  function renderSessions(page) {
    page = page || 1;
    var container = el('view-sessions');

    // Only rebuild the full structure on first render
    if (!container.querySelector('#sessions-table-wrapper')) {
      container.innerHTML =
        '<div class="page-header"><h1>セッション履歴</h1><p>全セッションの検索・閲覧。セッションをクリックして詳細を確認できます。</p></div>' +
        '<div class="page-body">' +
          '<div class="search-bar">' +
            '<span style="color:var(--text-muted);font-size:15px;">&#x25B7;</span>' +
            '<input type="text" id="session-search" placeholder="プロンプト内容を検索（例: 認証機能、テスト追加、バグ修正...）">' +
            '<button class="btn btn-ghost" id="session-search-btn">検索</button>' +
          '</div>' +
          '<div class="split-layout">' +
            '<div class="split-left">' +
              '<div class="card"><div class="card-body-flush" id="sessions-table-wrapper"></div>' +
              '<div class="table-footer"><div id="sessions-count"></div><div class="pagination" id="sessions-pagination"></div></div>' +
              '</div>' +
            '</div>' +
            '<div class="split-right" id="session-detail-panel"></div>' +
          '</div>' +
        '</div>';

      // Search handlers
      el('session-search-btn').addEventListener('click', function () { loadSessionsPage(1); });
      el('session-search').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') loadSessionsPage(1);
      });
    }

    loadSessionsPage(page);
  }

  function loadSessionsPage(page) {
    var wrapper = el('sessions-table-wrapper');
    showLoading(wrapper);

    var search = el('session-search') ? el('session-search').value : '';
    var extra = { page: page, per_page: PER_PAGE };
    if (search) extra.search = search;

    fetchApi('/sessions', extra).then(function (resp) {
      var data = resp.data || resp.sessions || [];
      var totalPages = resp.totalPages || resp.total_pages || resp.last_page || 1;
      var totalCount = resp.total || resp.totalCount || resp.total_count || data.length;

      if (!data.length) {
        showNoData(wrapper);
        el('sessions-count').textContent = '';
        el('sessions-pagination').innerHTML = '';
        return;
      }

      wrapper.innerHTML = buildSessionTable(data, true, false);
      attachSessionRowClicks(wrapper);

      el('sessions-count').innerHTML = '表示件数: <strong>' + data.length + '</strong> / 全 <strong>' + totalCount + '</strong>件';
      renderSessionPagination(page, totalPages);
    }).catch(function (e) { showError(wrapper, e); });
  }

  function renderSessionPagination(currentPage, totalPages) {
    var pgDiv = el('sessions-pagination');
    if (totalPages <= 1) { pgDiv.innerHTML = ''; return; }

    var html = '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' data-page="' + (currentPage - 1) + '">&lsaquo;</button>';
    var start = Math.max(1, currentPage - 2);
    var end = Math.min(totalPages, currentPage + 2);
    if (start > 1) html += '<button data-page="1">1</button>';
    if (start > 2) html += '<span class="page-info">...</span>';
    for (var i = start; i <= end; i++) {
      html += '<button class="' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    if (end < totalPages - 1) html += '<span class="page-info">...</span>';
    if (end < totalPages) html += '<button data-page="' + totalPages + '">' + totalPages + '</button>';
    html += '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' data-page="' + (currentPage + 1) + '">&rsaquo;</button>';
    pgDiv.innerHTML = html;

    pgDiv.querySelectorAll('button[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!btn.disabled) loadSessionsPage(parseInt(btn.getAttribute('data-page')));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // View 6: Session Detail
  // ---------------------------------------------------------------------------
  function renderSessionDetail(id) {
    var container = el('view-session-detail');
    showLoading(container);

    fetchApi('/sessions/' + id).then(function (s) {
      var member = s.member
        ? (p(s.member, 'gitEmail', 'git_email') || '-')
        : (p(s, 'gitEmail', 'git_email') || '-');
      var startedAt = p(s, 'startedAt', 'started_at');
      var endedAt = p(s, 'endedAt', 'ended_at');
      var durationSec = startedAt && endedAt
        ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : null;
      var inputTokens = p(s, 'totalInputTokens', 'total_input_tokens') || 0;
      var outputTokens = p(s, 'totalOutputTokens', 'total_output_tokens') || 0;
      var cacheRead = p(s, 'totalCacheReadTokens', 'total_cache_read_tokens') || 0;
      var cacheCreation = p(s, 'totalCacheCreationTokens', 'total_cache_creation_tokens') || 0;
      var turnCount = p(s, 'turnCount', 'turn_count') || 0;
      var toolUseCount = p(s, 'toolUseCount', 'tool_use_count') || 0;

      var html = '<div class="page-body">';

      // Back link
      html += '<a class="back-link" id="session-back-link">&larr; セッション一覧に戻る</a>';

      // Session Header
      var sessionTitle = s.summary || '';
      html += '<div class="session-header-card">' +
        '<div class="session-id" style="font-size:11px;color:var(--text-muted);font-family:monospace;">ID: ' + escapeHtml(p(s, 'sessionUuid', 'session_uuid') || String(id)) + '</div>' +
        (sessionTitle ? '<div style="font-size:18px;font-weight:600;color:var(--text-primary);margin:4px 0 8px;">' + escapeHtml(truncate(sessionTitle, 200)) + '</div>' : '') +
        '<div class="session-meta-row">' +
          metaItem('メンバー', member) +
          metaItem('モデル', '<span class="badge ' + modelBadgeClass(s.model) + '">' + escapeHtml(shortModel(s.model)) + '</span>') +
          metaItem('リポジトリ', '<span class="font-mono" style="font-size:12px;">' + escapeHtml(shortRepo(p(s, 'gitRepo', 'git_repo'))) + '</span>') +
          metaItem('ブランチ', '<span class="font-mono" style="font-size:12px;">' + escapeHtml(p(s, 'gitBranch', 'git_branch') || '-') + '</span>') +
          metaItem('開始', formatDateShort(startedAt)) +
          metaItem('終了', formatDateShort(endedAt)) +
          metaItem('所要時間', '<span style="color:var(--warning);">' + (durationSec ? formatDuration(durationSec) : '-') + '</span>') +
        '</div></div>';

      // Session-level token breakdown
      html += '<div style="margin-bottom:16px;">' +
        buildTokenDetail({ input: inputTokens, output: outputTokens, cacheCreation: cacheCreation, cacheRead: cacheRead }) +
      '</div>';

      // KPI
      html += '<div class="kpi-grid">' +
        kpiCard('blue', 'IN', formatCompact(inputTokens + cacheCreation + cacheRead), 'Total入力', 'input:' + formatCompact(inputTokens) + ' cache_r:' + formatCompact(cacheRead) + ' cache_c:' + formatCompact(cacheCreation)) +
        kpiCard('green', 'OUT', formatCompact(outputTokens), '出力トークン', '推定コスト: ' + formatCost(p(s, 'estimatedCost', 'estimated_cost'))) +
        kpiCard('purple', 'TN', String(turnCount), 'ターン数', '') +
        kpiCard('amber', 'TL', String(toolUseCount), 'ツール使用', '') +
      '</div>';

      // Turn Timeline
      var turns = s.turns || [];
      if (turns.length > 0) {
        html += '<div class="section-divider">ターンタイムライン</div>';
        html += '<div class="timeline">';
        turns.forEach(function (t) {
          html += buildTurnCard(t);
        });
        html += '</div>';
      }

      // Session Events
      var events = s.events || s.sessionEvents || s.session_events || [];
      if (events.length > 0) {
        html += '<div class="section-divider">セッションイベント</div>';
        html += '<div class="session-events"><div class="event-list">';
        events.forEach(function (ev) {
          html += '<div class="event-item">' +
            '<span class="event-time">' + formatTimeShort(ev.timestamp || p(ev, 'createdAt', 'created_at') || '') + '</span>' +
            '<span class="event-text">' + escapeHtml(p(ev, 'eventType', 'event_type') || ev.type || '') + '</span>' +
            '<span class="event-detail">' + escapeHtml(ev.detail || ev.description || '') + '</span>' +
          '</div>';
        });
        html += '</div></div>';
      }

      // Summary
      if (s.summary) {
        html += '<div class="section-divider">サマリー</div>';
        html += '<div class="session-summary"><div class="summary-content">' + escapeHtml(s.summary) + '</div></div>';
      }

      html += '</div>';
      container.innerHTML = html;

      // Back link handler
      el('session-back-link').addEventListener('click', function (e) {
        e.preventDefault();
        window.location.hash = '#sessions';
      });
    }).catch(function (e) { showError(container, e); });
  }

  function buildTurnCard(t) {
    var turnNum = p(t, 'turnNumber', 'turn_number') || '';
    var prompt = p(t, 'promptText', 'prompt_text') || '';
    var isAuto = !prompt || prompt === '(auto)' || (p(t, 'isAutoResponse', 'is_auto_response'));
    var hasError = false;
    var toolUses = t.toolUses || t.tool_uses || [];
    var subagents = t.subagents || [];
    var fileChanges = t.fileChanges || t.file_changes || [];

    // Check for errors
    toolUses.forEach(function (tu) {
      if (tu.status === 'error') hasError = true;
    });

    var html = '<div class="turn-card' + (hasError ? ' has-error' : '') + '">';

    // Header
    html += '<div class="turn-card-header">' +
      '<span class="turn-number">Turn ' + turnNum + '</span>' +
      '<span class="turn-time">' + formatTimeShort(p(t, 'createdAt', 'created_at') || p(t, 'startedAt', 'started_at') || '') + '</span>' +
    '</div>';

    html += '<div class="turn-card-body">';

    // Prompt
    if (isAuto) {
      html += '<div class="turn-prompt auto-response">' +
        '<span class="turn-prompt-icon">&gt;</span>' +
        '<span class="turn-prompt-text">' + (prompt ? escapeHtml(prompt) : '(自動応答)') + '</span></div>';
    } else {
      html += '<div class="turn-prompt">' +
        '<span class="turn-prompt-icon">&gt;</span>' +
        '<span class="turn-prompt-text">' + escapeHtml(prompt) + '</span></div>';
    }

    // Meta + Token detail
    var turnInput = p(t, 'inputTokens', 'input_tokens') || 0;
    var turnOutput = p(t, 'outputTokens', 'output_tokens') || 0;
    var turnCC = p(t, 'cacheCreationTokens', 'cache_creation_tokens') || 0;
    var turnCR = p(t, 'cacheReadTokens', 'cache_read_tokens') || 0;
    html += '<div class="turn-meta">' +
      '<span class="turn-meta-item">' + formatDurationMs(p(t, 'durationMs', 'duration_ms')) + '</span>' +
    '</div>';
    html += buildTokenDetail({ input: turnInput, output: turnOutput, cacheCreation: turnCC, cacheRead: turnCR });

    // Subagents
    if (subagents.length > 0) {
      html += '<div class="section-label">サブエージェント</div>';
      subagents.forEach(function (sa) {
        html += buildSubagentBlock(sa);
      });
    }

    // Tool uses (main agent)
    var mainToolUses = toolUses.filter(function (tu) { return !tu.subagentId && !tu.subagent_id; });
    if (mainToolUses.length > 0) {
      html += '<div class="section-label">ツール使用' + (subagents.length > 0 ? '（メイン）' : '') + '</div>';
      html += buildToolList(mainToolUses);
    } else if (toolUses.length > 0 && subagents.length === 0) {
      // All tool uses shown if no subagents
      html += '<div class="section-label">ツール使用</div>';
      html += buildToolList(toolUses);
    }

    // File changes
    if (fileChanges.length > 0) {
      html += '<div class="section-label">ファイル変更</div>';
      html += '<div class="file-list">';
      var deduped = {};
      fileChanges.forEach(function (fc) {
        var key = fc.operation + ':' + (p(fc, 'filePath', 'file_path') || '');
        if (!deduped[key]) deduped[key] = { op: fc.operation, path: p(fc, 'filePath', 'file_path') || '' };
      });
      var items = Object.values(deduped);
      items.forEach(function (item, idx) {
        var treeLine = idx < items.length - 1 ? '&#x251C;&#x2500;' : '&#x2514;&#x2500;';
        html += '<div class="file-item">' +
          '<span class="tool-tree-line">' + treeLine + '</span>' +
          '<span class="file-path">' + escapeHtml(item.path) + '</span>' +
          '<span class="file-action ' + escapeHtml(item.op) + '">' + escapeHtml(item.op) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    html += '</div></div>'; // turn-card-body, turn-card
    return html;
  }

  function buildSubagentBlock(sa) {
    var agentType = p(sa, 'agentType', 'agent_type') || 'agent';
    var agentId = p(sa, 'subagentUuid', 'subagent_uuid') || p(sa, 'agentId', 'agent_id') || '';
    var desc = sa.description || p(sa, 'promptText', 'prompt_text') || '';
    var saToolUses = sa.toolUses || sa.tool_uses || [];

    var html = '<div class="subagent-block">' +
      '<div class="subagent-header">' +
        '<span style="font-size:12px;color:var(--purple);font-weight:700;">SA</span>' +
        '<span class="subagent-type">' + escapeHtml(agentType) + '</span>' +
        (agentId ? '<span class="subagent-id">(' + escapeHtml(truncate(agentId, 12)) + ')</span>' : '') +
      '</div>' +
      '<div class="subagent-body">';

    if (desc) {
      html += '<div class="subagent-prompt">"' + escapeHtml(truncate(desc, 100)) + '"</div>';
    }

    var saDuration = p(sa, 'durationMs', 'duration_ms') || (p(sa, 'durationSeconds', 'duration_seconds') ? p(sa, 'durationSeconds', 'duration_seconds') * 1000 : 0);
    var saInput = p(sa, 'inputTokens', 'input_tokens') || 0;
    var saOutput = p(sa, 'outputTokens', 'output_tokens') || 0;
    var saCC = p(sa, 'cacheCreationTokens', 'cache_creation_tokens') || 0;
    var saCR = p(sa, 'cacheReadTokens', 'cache_read_tokens') || 0;
    var saCost = p(sa, 'estimatedCost', 'estimated_cost') || 0;
    html += '<div class="subagent-meta">' +
      '<span>' + formatDurationMs(saDuration) + '</span>' +
      (saCost > 0 ? '<span>' + formatCost(saCost) + '</span>' : '') +
    '</div>';
    html += buildTokenDetail({ input: saInput, output: saOutput, cacheCreation: saCC, cacheRead: saCR });

    if (saToolUses.length > 0) {
      html += '<div class="section-label" style="font-size:11px;">ツール</div>';
      html += buildToolList(saToolUses);
    }

    html += '</div></div>';
    return html;
  }

  function buildToolList(tools) {
    var html = '<div class="tool-list">';
    tools.forEach(function (tu, idx) {
      var name = p(tu, 'toolName', 'tool_name') || '';
      var input = p(tu, 'toolInputSummary', 'tool_input_summary') || '';
      var status = tu.status || 'success';
      var statusBadge = status === 'error' ? 'badge-danger' : 'badge-success';
      var treeLine = idx < tools.length - 1 ? '&#x251C;&#x2500;' : '&#x2514;&#x2500;';

      html += '<div class="tool-item">' +
        '<span class="tool-tree-line">' + treeLine + '</span>' +
        '<span class="tool-name">' + escapeHtml(name) + '</span>' +
        '<span class="tool-args" title="' + escapeHtml(input) + '">' + escapeHtml(truncate(input, 50)) + '</span>' +
        '<span class="tool-status"><span class="badge ' + statusBadge + '">' + escapeHtml(status) + '</span></span>' +
      '</div>';

      // Error message
      if (status === 'error' && (p(tu, 'errorMessage', 'error_message') || tu.error)) {
        html += '<div class="tool-error-msg">' + escapeHtml(p(tu, 'errorMessage', 'error_message') || tu.error) + '</div>';
      }
    });
    html += '</div>';
    return html;
  }

  // ---------------------------------------------------------------------------
  // Shared Components
  // ---------------------------------------------------------------------------
  function kpiCard(colorClass, _icon, value, label, sub) {
    return '<div class="kpi-card ' + colorClass + '">' +
      '<div class="kpi-label">' + label + '</div>' +
      '<div class="kpi-value">' + value + '</div>' +
      (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') +
    '</div>';
  }

  function metaItem(label, value) {
    return '<div class="session-meta-item">' +
      '<span class="label">' + label + '</span>' +
      '<span class="value">' + value + '</span></div>';
  }

  function getSessionTitle(s) {
    // Try summary first
    var summary = s.summary || '';
    if (summary) return { text: summary, isMuted: false };
    // Try first prompt
    var firstPrompt = p(s, 'firstPrompt', 'first_prompt') || '';
    if (firstPrompt) return { text: truncate(firstPrompt, 80), isMuted: true };
    // Fallback to model name
    var model = s.model ? shortModel(s.model) : '';
    if (model) return { text: model + ' session', isMuted: true };
    return { text: 'Untitled session', isMuted: true };
  }

  function buildSessionTable(data, fullColumns, compact) {
    var html = '<table class="data-table"><thead><tr>';
    if (fullColumns) {
      html += '<th>セッション</th><th>メンバー</th><th>モデル</th>' +
        '<th class="text-right">トークン</th>' +
        '<th class="text-center">ターン / サブエージェント</th>' +
        '<th>リポジトリ</th><th>日時</th>';
    } else {
      html += '<th>セッション</th><th>メンバー</th><th>モデル</th>' +
        '<th class="text-right">トークン</th><th class="text-right">ターン数</th><th>日時</th>';
    }
    html += '</tr></thead><tbody>';

    data.forEach(function (s) {
      var sessionId = s.id || p(s, 'sessionId', 'session_id') || '';
      var sessionUuid = p(s, 'sessionUuid', 'session_uuid') || sessionId;
      var member = s.member
        ? (p(s.member, 'gitEmail', 'git_email') || '-')
        : (p(s, 'gitEmail', 'git_email') || '-');
      var inp = p(s, 'totalInputTokens', 'total_input_tokens') || 0;
      var out = p(s, 'totalOutputTokens', 'total_output_tokens') || 0;
      var turns = p(s, 'turnCount', 'turn_count') || 0;
      var subagents = p(s, 'subagentCount', 'subagent_count') || 0;
      var repo = p(s, 'gitRepo', 'git_repo') || '';
      var startedAt = p(s, 'startedAt', 'started_at') || p(s, 'createdAt', 'created_at');
      var titleInfo = getSessionTitle(s);
      var shortId = String(sessionUuid).length > 12 ? sessionUuid.substring(0, 12) + '...' : sessionUuid;

      html += '<tr class="clickable-row" data-session-id="' + sessionId + '">';

      if (fullColumns) {
        html += '<td><div class="session-info-cell">' +
            '<span class="session-info-id">' + escapeHtml(shortId) + '</span>' +
            '<span class="session-info-title' + (titleInfo.isMuted ? ' muted' : '') + '">' + escapeHtml(titleInfo.text) + '</span>' +
          '</div></td>' +
          '<td>' + escapeHtml(member) + '</td>' +
          '<td><span class="badge ' + modelBadgeClass(s.model) + '">' + escapeHtml(shortModel(s.model)) + '</span></td>' +
          '<td class="text-right"><div class="token-pair"><span class="token-input font-mono">' + formatCompact(inp) + '</span><span class="token-output font-mono">/ ' + formatCompact(out) + '</span></div></td>' +
          '<td class="text-center">' + turns + ' / ' + subagents + '</td>' +
          '<td><span class="font-mono" style="font-size:12px;">' + escapeHtml(shortRepo(repo)) + '</span></td>' +
          '<td class="text-muted">' + formatDateShort(startedAt) + '</td>';
      } else {
        html += '<td><div class="session-info-cell">' +
            '<span class="session-info-id">' + escapeHtml(shortId) + '</span>' +
            '<span class="session-info-title' + (titleInfo.isMuted ? ' muted' : '') + '">' + escapeHtml(titleInfo.text) + '</span>' +
          '</div></td>' +
          '<td>' + escapeHtml(member) + '</td>' +
          '<td><span class="badge ' + modelBadgeClass(s.model) + '">' + escapeHtml(shortModel(s.model)) + '</span></td>' +
          '<td class="text-right font-mono">' + formatCompact(inp + out) + '</td>' +
          '<td class="text-right">' + turns + '</td>' +
          '<td class="text-muted">' + formatDateShort(startedAt) + '</td>';
      }

      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // ---------------------------------------------------------------------------
  // Session Sidebar
  // ---------------------------------------------------------------------------
  function openSessionSidebar(sessionId) {
    var overlay = el('session-sidebar-overlay');
    var sidebar = el('session-sidebar');
    var headerInfo = el('sidebar-header-info');
    var body = el('sidebar-body');
    var viewFull = el('sidebar-view-full');

    // Show sidebar with loading state
    headerInfo.innerHTML = '<div class="sidebar-session-id">読み込み中...</div><div class="sidebar-title">-</div>';
    body.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';
    viewFull.setAttribute('href', '#session/' + sessionId);
    viewFull.onclick = function (e) {
      e.preventDefault();
      closeSessionSidebar();
      window.location.hash = '#session/' + sessionId;
    };

    // Activate overlay and sidebar
    overlay.classList.add('active');
    sidebar.classList.add('active');

    // Fetch session detail
    fetchApi('/sessions/' + sessionId).then(function (s) {
      var member = s.member
        ? (p(s.member, 'gitEmail', 'git_email') || '-')
        : (p(s, 'gitEmail', 'git_email') || '-');
      var startedAt = p(s, 'startedAt', 'started_at');
      var endedAt = p(s, 'endedAt', 'ended_at');
      var durationSec = startedAt && endedAt
        ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : null;
      var inputTokens = p(s, 'totalInputTokens', 'total_input_tokens') || 0;
      var outputTokens = p(s, 'totalOutputTokens', 'total_output_tokens') || 0;
      var turnCount = p(s, 'turnCount', 'turn_count') || 0;
      var toolUseCount = p(s, 'toolUseCount', 'tool_use_count') || 0;
      var titleInfo = getSessionTitle(s);
      var sessionUuid = p(s, 'sessionUuid', 'session_uuid') || String(sessionId);

      // Header
      headerInfo.innerHTML =
        '<div class="sidebar-session-id">' + escapeHtml(sessionUuid) + '</div>' +
        '<div class="sidebar-title">' + escapeHtml(titleInfo.text) + '</div>' +
        '<div class="sidebar-meta">' +
          '<span class="sidebar-meta-item">' + escapeHtml(member) + '</span>' +
          '<span class="sidebar-meta-item"><span class="badge ' + modelBadgeClass(s.model) + '">' + escapeHtml(shortModel(s.model)) + '</span></span>' +
          '<span class="sidebar-meta-item">' + escapeHtml(shortRepo(p(s, 'gitRepo', 'git_repo'))) + '</span>' +
          '<span class="sidebar-meta-item">' + formatDateShort(startedAt) + '</span>' +
        '</div>';

      // Body
      var html = '';

      // KPI row
      html += '<div class="sidebar-kpi">' +
        '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + (durationSec ? formatDuration(durationSec) : '-') + '</div><div class="sidebar-kpi-label">所要時間</div></div>' +
        '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + formatCompact(inputTokens + outputTokens) + '</div><div class="sidebar-kpi-label">トークン</div></div>' +
        '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + turnCount + '</div><div class="sidebar-kpi-label">ターン</div></div>' +
        '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + toolUseCount + '</div><div class="sidebar-kpi-label">ツール</div></div>' +
      '</div>';

      // Summary
      if (s.summary) {
        html += '<div class="sidebar-section-title">サマリー</div>' +
          '<div style="font-size:13px;color:var(--text-primary);line-height:1.6;margin-bottom:16px;padding:10px 14px;background:var(--bg-base);border-radius:6px;">' +
          escapeHtml(s.summary) + '</div>';
      }

      // Turn timeline
      var turns = s.turns || [];
      if (turns.length > 0) {
        html += '<div class="sidebar-section-title">ターンタイムライン (' + turns.length + ')</div>';
        turns.forEach(function (t) {
          html += buildSidebarTurnItem(t);
        });
      } else {
        html += '<div class="no-data">ターンデータがありません</div>';
      }

      body.innerHTML = html;
    }).catch(function (e) {
      headerInfo.innerHTML = '<div class="sidebar-title">エラー</div>';
      body.innerHTML = '<div class="error-msg">読み込みに失敗しました: ' + escapeHtml(e && e.message || String(e)) + '</div>';
    });
  }

  function buildSidebarTurnItem(t) {
    var turnNum = p(t, 'turnNumber', 'turn_number') || '';
    var prompt = p(t, 'promptText', 'prompt_text') || '';
    var isAuto = !prompt || prompt === '(auto)' || (p(t, 'isAutoResponse', 'is_auto_response'));
    var inputTok = p(t, 'inputTokens', 'input_tokens') || 0;
    var outputTok = p(t, 'outputTokens', 'output_tokens') || 0;
    var durationMs = p(t, 'durationMs', 'duration_ms') || 0;
    var toolUses = t.toolUses || t.tool_uses || [];
    var subagents = t.subagents || [];
    var hasError = false;
    toolUses.forEach(function (tu) {
      if (tu.status === 'error') hasError = true;
    });

    var html = '<div style="margin-bottom:12px;padding:10px 14px;background:var(--bg-base);border-radius:8px;border-left:3px solid ' +
      (hasError ? 'var(--danger)' : isAuto ? 'var(--text-muted)' : 'var(--accent)') + ';">';

    // Turn header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<span style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;">Turn ' + turnNum + '</span>' +
      '<span style="font-size:11px;color:var(--text-muted);font-family:monospace;">' + formatTimeShort(p(t, 'createdAt', 'created_at') || p(t, 'startedAt', 'started_at') || '') + '</span>' +
    '</div>';

    // Prompt
    if (isAuto) {
      html += '<div style="font-size:12px;color:var(--text-secondary);font-style:italic;margin-bottom:6px;">' + (prompt ? escapeHtml(truncate(prompt, 120)) : '(自動応答)') + '</div>';
    } else {
      html += '<div style="font-size:13px;color:var(--text-primary);margin-bottom:6px;line-height:1.5;">' + escapeHtml(truncate(prompt, 150)) + '</div>';
    }

    // Meta line
    var sbCacheRead = p(t, 'cacheReadTokens', 'cache_read_tokens') || 0;
    var sbCacheCreate = p(t, 'cacheCreationTokens', 'cache_creation_tokens') || 0;
    html += '<div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);flex-wrap:wrap;margin-bottom:4px;">' +
      '<span>' + formatDurationMs(durationMs) + '</span>';
    if (toolUses.length > 0) {
      html += '<span>' + toolUses.length + ' tools</span>';
    }
    if (subagents.length > 0) {
      html += '<span>' + subagents.length + ' subagent</span>';
    }
    html += '</div>';
    html += buildTokenDetail({ input: inputTok, output: outputTok, cacheCreation: sbCacheCreate, cacheRead: sbCacheRead, compact: true });

    // Subagent token details in sidebar
    if (subagents.length > 0) {
      subagents.forEach(function (sa) {
        var saType = p(sa, 'agentType', 'agent_type') || 'agent';
        var saIn = p(sa, 'inputTokens', 'input_tokens') || 0;
        var saOut = p(sa, 'outputTokens', 'output_tokens') || 0;
        var saCc = p(sa, 'cacheCreationTokens', 'cache_creation_tokens') || 0;
        var saCr = p(sa, 'cacheReadTokens', 'cache_read_tokens') || 0;
        html += '<div style="margin-top:4px;padding:4px 8px;background:rgba(139,92,246,0.1);border-radius:4px;font-size:11px;">' +
          '<span style="color:var(--purple);font-weight:600;">' + escapeHtml(saType) + '</span> ' +
          buildTokenDetail({ input: saIn, output: saOut, cacheCreation: saCc, cacheRead: saCr, compact: true }) +
        '</div>';
      });
    }

    // Tool uses summary (collapsed)
    if (toolUses.length > 0) {
      var toolNames = {};
      toolUses.forEach(function (tu) {
        var name = p(tu, 'toolName', 'tool_name') || 'unknown';
        toolNames[name] = (toolNames[name] || 0) + 1;
      });
      var toolSummary = Object.keys(toolNames).map(function (name) {
        return name + (toolNames[name] > 1 ? ' x' + toolNames[name] : '');
      }).join(', ');
      html += '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
        escapeHtml(truncate(toolSummary, 80)) + '</div>';
    }

    // Errors
    if (hasError) {
      var errorCount = 0;
      toolUses.forEach(function (tu) { if (tu.status === 'error') errorCount++; });
      html += '<div style="font-size:11px;color:var(--danger);margin-top:4px;"><span class="badge badge-danger">' + errorCount + ' error' + (errorCount > 1 ? 's' : '') + '</span></div>';
    }

    html += '</div>';
    return html;
  }

  function closeSessionSidebar() {
    var overlay = el('session-sidebar-overlay');
    var sidebar = el('session-sidebar');
    overlay.classList.remove('active');
    sidebar.classList.remove('active');
  }

  function initSidebarEvents() {
    var overlay = el('session-sidebar-overlay');
    var closeBtn = el('sidebar-close-btn');
    if (overlay) {
      overlay.addEventListener('click', closeSessionSidebar);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSessionSidebar);
    }
    // ESC key to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var sidebar = el('session-sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
          closeSessionSidebar();
        }
      }
    });
  }

  function attachSessionRowClicks(containerOrId) {
    var container = typeof containerOrId === 'string' ? el(containerOrId) : containerOrId;
    if (!container) return;
    container.querySelectorAll('tr[data-session-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        var sid = row.getAttribute('data-session-id');
        if (!sid) return;
        // In sessions tab, use embedded panel; elsewhere, use overlay sidebar
        if (currentView === 'sessions') {
          if (selectedSessionId === sid) {
            selectedSessionId = null;
            var panel = el('session-detail-panel');
            if (panel) { panel.innerHTML = ''; panel.classList.remove('open'); }
            container.querySelectorAll('tr.row-selected').forEach(function (r) { r.classList.remove('row-selected'); });
          } else {
            openSessionEmbedded(sid, container);
          }
        } else {
          openSessionSidebar(sid);
        }
      });
    });
  }

  var selectedSessionId = null;

  function openSessionEmbedded(sessionId, tableContainer) {
    selectedSessionId = sessionId;
    var panel = el('session-detail-panel');
    if (!panel) { openSessionSidebar(sessionId); return; }

    // Highlight selected row
    if (tableContainer) {
      tableContainer.querySelectorAll('tr.row-selected').forEach(function (r) { r.classList.remove('row-selected'); });
      var selectedRow = tableContainer.querySelector('tr[data-session-id="' + sessionId + '"]');
      if (selectedRow) selectedRow.classList.add('row-selected');
    }

    panel.classList.add('open');
    showLoading(panel);

    fetchApi('/sessions/' + sessionId).then(function (s) {
      var member = s.member ? (p(s.member, 'gitEmail', 'git_email') || '-') : '-';
      var startedAt = p(s, 'startedAt', 'started_at');
      var endedAt = p(s, 'endedAt', 'ended_at');
      var durationSec = startedAt && endedAt ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : null;
      var inputTokens = p(s, 'totalInputTokens', 'total_input_tokens') || 0;
      var outputTokens = p(s, 'totalOutputTokens', 'total_output_tokens') || 0;
      var turnCount = p(s, 'turnCount', 'turn_count') || 0;
      var toolUseCount = p(s, 'toolUseCount', 'tool_use_count') || 0;
      var titleInfo = getSessionTitle(s);
      var sessionUuid = p(s, 'sessionUuid', 'session_uuid') || String(sessionId);

      var html = '<div class="detail-panel">' +
        '<button class="detail-close" id="session-embed-close">&times;</button>' +
        '<div class="detail-panel-header">' +
          '<div style="min-width:0;">' +
            '<h3 style="margin:0;font-size:14px;">' + escapeHtml(titleInfo.text) + '</h3>' +
            '<div class="sub" style="font-family:monospace;font-size:10px;">' + escapeHtml(sessionUuid.substring(0, 8)) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="detail-panel-body">' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">' +
            '<span class="sidebar-meta-item" style="font-size:11px;">' + escapeHtml(member) + '</span>' +
            '<span class="badge ' + modelBadgeClass(s.model) + '">' + escapeHtml(shortModel(s.model)) + '</span>' +
            '<span style="font-size:11px;color:var(--text-muted);">' + escapeHtml(shortRepo(p(s, 'gitRepo', 'git_repo'))) + '</span>' +
          '</div>' +
          '<div class="sidebar-kpi" style="margin-bottom:12px;">' +
            '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + (durationSec ? formatDuration(durationSec) : '-') + '</div><div class="sidebar-kpi-label">所要時間</div></div>' +
            '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + formatCompact(inputTokens + outputTokens) + '</div><div class="sidebar-kpi-label">トークン</div></div>' +
            '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + turnCount + '</div><div class="sidebar-kpi-label">ターン</div></div>' +
            '<div class="sidebar-kpi-item"><div class="sidebar-kpi-value">' + toolUseCount + '</div><div class="sidebar-kpi-label">ツール</div></div>' +
          '</div>';

      // Summary
      if (s.summary) {
        html += '<div class="sidebar-section-title">サマリー</div>' +
          '<div style="font-size:13px;color:var(--text-primary);line-height:1.6;margin-bottom:12px;padding:8px 12px;background:var(--bg-base);border-radius:6px;">' +
          escapeHtml(s.summary) + '</div>';
      }

      // Turn timeline
      var turns = s.turns || [];
      if (turns.length > 0) {
        html += '<div class="sidebar-section-title">ターンタイムライン (' + turns.length + ')</div>';
        turns.forEach(function (t) { html += buildSidebarTurnItem(t); });
      }

      html += '<div style="margin-top:12px;text-align:center;">' +
        '<a href="#session/' + sessionId + '" style="color:var(--accent);font-size:12px;">詳細ページを表示 &rarr;</a></div>';

      html += '</div></div>';
      panel.innerHTML = html;

      // Close button
      el('session-embed-close').addEventListener('click', function (e) {
        e.stopPropagation();
        selectedSessionId = null;
        panel.innerHTML = '';
        panel.classList.remove('open');
        var wrapper = el('sessions-table-wrapper');
        if (wrapper) wrapper.querySelectorAll('tr.row-selected').forEach(function (r) { r.classList.remove('row-selected'); });
      });
    }).catch(function (e) { showError(panel, e); });
  }

  function buildHeatmap(data) {
    // Build a 7x24 grid
    var grid = [];
    var d, h;
    for (d = 0; d < 7; d++) {
      grid[d] = [];
      for (h = 0; h < 24; h++) grid[d][h] = 0;
    }
    var maxCount = 0;
    data.forEach(function (item) {
      var dayIdx = item.dayOfWeek != null ? item.dayOfWeek : item.day_of_week;
      var hourIdx = item.hour;
      var count = item.count || 0;
      if (dayIdx != null && hourIdx != null) {
        grid[dayIdx][hourIdx] = count;
        if (count > maxCount) maxCount = count;
      }
    });

    var html = '<div style="overflow-x:auto;"><table class="heatmap-table"><thead><tr><th></th>';
    for (h = 0; h < 24; h++) html += '<th>' + h + '</th>';
    html += '</tr></thead><tbody>';

    // Reorder: Mon(1)..Sun(0)
    var dayOrder = [1, 2, 3, 4, 5, 6, 0];
    dayOrder.forEach(function (dayIdx) {
      html += '<tr><td class="day-label">' + DAY_LABELS[dayIdx] + '</td>';
      for (h = 0; h < 24; h++) {
        var count = grid[dayIdx][h];
        var intensity = maxCount > 0 ? count / maxCount : 0;
        var alpha = intensity === 0 ? '0.00' : (0.10 + intensity * 0.90).toFixed(2);
        var bg = 'rgba(59,130,246,' + alpha + ')';
        var title = DAY_LABELS[dayIdx] + ' ' + h + ':00 - ' + count + 'セッション';
        html += '<td class="cell" style="background-color:' + bg + ';" title="' + title + '">' +
          (count > 0 ? count : '') + '</td>';
      }
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Build a matrix heatmap (rows x date columns).
   * @param {Array} data - Array of { [rowKey], date, [valueKey] }
   * @param {string} rowKey - Key for the row label (e.g. 'gitRepo', 'displayName')
   * @param {string} colKey - Key for the column (should be 'date')
   * @param {string} valKey - Key for the numeric value
   * @param {object} opts - { labelFn, valueFmt, color:[r,g,b], unitLabel }
   */
  function buildMatrixHeatmap(data, rowKey, colKey, valKey, opts) {
    opts = opts || {};
    var labelFn = opts.labelFn || function (v) { return v; };
    var valueFmt = opts.valueFmt || formatNumber;
    var rgb = opts.color || [59, 130, 246];
    var unitLabel = opts.unitLabel || '';
    var secondaryKey = opts.secondaryKey || null;
    var secondaryLabel = opts.secondaryLabel || '';
    var secondaryFmt = opts.secondaryFmt || formatNumber;

    // Collect unique rows and dates
    var rowSet = {};
    var dateSet = {};
    var grid = {};
    var grid2 = {};
    var maxVal = 0;

    data.forEach(function (d) {
      var r = d[rowKey] || 'unknown';
      var c = d[colKey];
      if (typeof c === 'string' && c.indexOf('T') > -1) c = c.split('T')[0];
      var v = d[valKey] || 0;
      rowSet[r] = true;
      dateSet[c] = true;
      var key = r + '||' + c;
      grid[key] = (grid[key] || 0) + v;
      if (grid[key] > maxVal) maxVal = grid[key];
      if (secondaryKey) {
        grid2[key] = (grid2[key] || 0) + (d[secondaryKey] || 0);
      }
    });

    var rows = Object.keys(rowSet);
    var dates = Object.keys(dateSet).sort();

    // Format date as MM/dd
    function shortDate(d) {
      if (!d) return '';
      var iso = d.split('T')[0];
      var parts = iso.split('-');
      return parts.length >= 3 ? parts[1] + '/' + parts[2] : d;
    }

    var html = '<div class="matrix-heatmap"><table><thead><tr><th></th>';
    dates.forEach(function (d) {
      html += '<th>' + shortDate(d) + '</th>';
    });
    html += '</tr></thead><tbody>';

    rows.forEach(function (r) {
      html += '<tr><td class="row-label" title="' + escapeHtml(r) + '">' + escapeHtml(labelFn(r)) + '</td>';
      dates.forEach(function (d) {
        var key = r + '||' + d;
        var val = grid[key] || 0;
        var intensity = maxVal > 0 ? val / maxVal : 0;
        var alpha = val === 0 ? '0.03' : (0.12 + intensity * 0.88).toFixed(2);
        var bg = 'rgba(' + rgb.join(',') + ',' + alpha + ')';
        var title = labelFn(r) + ' / ' + d + ' : ' + valueFmt(val) + ' ' + unitLabel;
        if (secondaryKey && val > 0) {
          title += ' / ' + secondaryFmt(grid2[key] || 0) + ' ' + secondaryLabel;
        }
        html += '<td class="mcell" style="background-color:' + bg + ';" title="' + title + '">' +
          (val > 0 ? '<span style="font-size:9px;opacity:0.8;">' + valueFmt(val) + '</span>' : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    // Legend
    html += '<div class="legend">';
    html += '<span>少</span>';
    [0.1, 0.3, 0.55, 0.8, 1.0].forEach(function (a) {
      html += '<span class="legend-box" style="background:rgba(' + rgb.join(',') + ',' + a.toFixed(2) + ');"></span>';
    });
    html += '<span>多</span>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ---------------------------------------------------------------------------
  // Apply Filters
  // ---------------------------------------------------------------------------
  function applyFilters() {
    // Destroy all existing charts
    destroyAllCharts();
    // Re-render current view
    renderCurrentView(currentView);
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  function init() {
    // Set default date range (last 30 days)
    var today = new Date();
    var thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    el('filter-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    el('filter-to').value = today.toISOString().split('T')[0];

    // Load filter options
    loadFilters();

    // Setup router
    setupRouter();

    // Setup sidebar events
    initSidebarEvents();

    // Event listeners
    el('btn-apply').addEventListener('click', applyFilters);

    // Keyboard: Enter in filters
    el('filter-bar').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyFilters();
    });

    // Initial route
    handleHashChange();
  }

  // Start
  // ---------------------------------------------------------------------------
  // View 7: Prompt Feed
  // ---------------------------------------------------------------------------
  function getMemberColor(email) {
    if (!memberColorMap[email]) {
      var idx = Object.keys(memberColorMap).length % memberColorPalette.length;
      memberColorMap[email] = memberColorPalette[idx];
    }
    return memberColorMap[email];
  }

  function getTimeAgo(isoStr) {
    if (!isoStr) return '';
    var now = new Date();
    var then = new Date(isoStr);
    var diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return diffSec + '\u79D2\u524D';
    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + '\u5206\u524D';
    var diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return diffHour + '\u6642\u9593\u524D';
    var diffDay = Math.floor(diffHour / 24);
    return diffDay + '\u65E5\u524D';
  }

  function formatDurationMs(ms) {
    if (!ms) return '-';
    if (ms < 1000) return ms + 'ms';
    var sec = Math.round(ms / 1000);
    if (sec < 60) return sec + 's';
    var min = Math.floor(sec / 60);
    sec = sec % 60;
    return min + 'm' + (sec > 0 ? sec + 's' : '');
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  function renderPromptFeed() {
    var container = el('view-prompt-feed');
    container.innerHTML =
      '<div class="page-header"><h1>\u30D7\u30ED\u30F3\u30D7\u30C8\u30D5\u30A3\u30FC\u30C9</h1><p>\u30E1\u30F3\u30D0\u30FC\u304C\u9001\u4FE1\u3057\u305F\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u8868\u793A</p></div>' +
      '<div class="page-body">' +
        '<div class="prompt-feed">' +
          '<div class="prompt-feed-controls">' +
            '<div class="prompt-feed-status">' +
              '<span class="feed-live-dot" id="feed-live-dot"></span>' +
              '<span id="feed-status-text">\u30E9\u30A4\u30D6\u66F4\u65B0\u4E2D</span>' +
            '</div>' +
            '<div>' +
              '<button class="btn btn-ghost" id="feed-pause-btn">&#x23F8; \u4E00\u6642\u505C\u6B62</button>' +
            '</div>' +
          '</div>' +
          '<div id="prompt-feed-list"></div>' +
          '<div class="feed-load-more" id="feed-load-more" style="display:none;">' +
            '<button id="feed-load-more-btn">\u3082\u3063\u3068\u8AAD\u307F\u8FBC\u3080</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    feedData = [];
    feedPaused = false;

    // Pause button
    el('feed-pause-btn').addEventListener('click', function () {
      feedPaused = !feedPaused;
      if (feedPaused) {
        this.innerHTML = '&#x25B6; \u518D\u958B';
        el('feed-status-text').textContent = '\u4E00\u6642\u505C\u6B62\u4E2D';
        el('feed-live-dot').classList.add('paused');
        stopFeedTimer();
      } else {
        this.innerHTML = '&#x23F8; \u4E00\u6642\u505C\u6B62';
        el('feed-status-text').textContent = '\u30E9\u30A4\u30D6\u66F4\u65B0\u4E2D';
        el('feed-live-dot').classList.remove('paused');
        startFeedTimer();
      }
    });

    // Load more
    el('feed-load-more-btn').addEventListener('click', function () { loadMoreFeed(); });

    // Initial load
    loadPromptFeed();
    startFeedTimer();
  }

  function loadPromptFeed() {
    var list = el('prompt-feed-list');
    showLoading(list);

    fetchApi('/prompt-feed', { limit: 30 }).then(function (resp) {
      feedData = resp.data || [];
      renderFeedItems(feedData);
      if (resp.hasMore) {
        el('feed-load-more').style.display = '';
      } else {
        el('feed-load-more').style.display = 'none';
      }
      if (feedData.length === 0) {
        list.innerHTML =
          '<div class="feed-empty">' +
            '<div class="feed-empty-icon" style="font-size:36px;color:var(--text-muted);">&#x2014;</div>' +
            '<div>\u30D7\u30ED\u30F3\u30D7\u30C8\u30C7\u30FC\u30BF\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093</div>' +
            '<div style="font-size:12px;margin-top:8px;">\u30E1\u30F3\u30D0\u30FC\u304CClaude Code\u3092\u4F7F\u7528\u3059\u308B\u3068\u3053\u3053\u306B\u8868\u793A\u3055\u308C\u307E\u3059</div>' +
          '</div>';
      }
    }).catch(function (e) { showError(list, e); });
  }

  function renderFeedItems(items) {
    var list = el('prompt-feed-list');
    var html = '';
    items.forEach(function (item) {
      html += buildPromptCard(item);
    });
    list.innerHTML = html;

    // Click to open session sidebar
    list.querySelectorAll('.prompt-card[data-session-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        var sid = card.getAttribute('data-session-id');
        if (sid) openSessionSidebar(sid);
      });
    });
  }

  function buildPromptCard(item) {
    var email = item.member ? item.member.gitEmail : 'unknown';
    var displayName = item.member ? (item.member.displayName || item.member.gitEmail) : 'unknown';
    var initial = displayName.charAt(0).toUpperCase();
    var color = getMemberColor(email);
    var model = item.model || '';
    var repo = item.session ? item.session.gitRepo : '';
    var branch = item.session ? item.session.gitBranch : '';
    var timeAgo = getTimeAgo(item.promptSubmittedAt);
    var prompt = item.promptText || '';

    var html = '<div class="prompt-card" data-session-id="' + (item.session ? item.session.id : '') + '" style="border-left-color:' + color + ';">';

    // Header
    html += '<div class="prompt-card-header">' +
      '<div class="prompt-card-meta">' +
        '<div class="prompt-card-member">' + escapeHtml(displayName) + '</div>' +
        '<div class="prompt-card-time">' + escapeHtml(timeAgo) + ' \u00B7 ' + formatDateShort(item.promptSubmittedAt) + '</div>' +
      '</div>' +
      '<span class="badge ' + modelBadgeClass(model) + '">' + escapeHtml(shortModel(model)) + '</span>' +
    '</div>';

    // Body
    html += '<div class="prompt-card-body">' + escapeHtml(truncate(prompt, 300)) + '</div>';

    // Footer
    html += '<div class="prompt-card-footer">';
    if (item.durationMs) {
      html += '<span>' + formatDurationMs(item.durationMs) + '</span>';
    }
    html += '<span>' + formatCompact(item.inputTokens || 0) + ' in</span>';
    html += '<span>' + formatCompact(item.outputTokens || 0) + ' out</span>';
    if (item.toolCount > 0) {
      html += '<span>' + item.toolCount + ' tools</span>';
    }
    if (repo) {
      html += '<span class="prompt-card-repo">' + escapeHtml(shortRepo(repo)) + '</span>';
    }
    if (branch) {
      html += '<span style="font-size:11px;color:var(--text-muted);">' + escapeHtml(branch) + '</span>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  function startFeedTimer() {
    stopFeedTimer();
    feedTimer = setInterval(function () {
      if (currentView !== 'prompt-feed') { stopFeedTimer(); return; }
      refreshFeed();
    }, 15000);
  }

  function stopFeedTimer() {
    if (feedTimer) { clearInterval(feedTimer); feedTimer = null; }
  }

  function refreshFeed() {
    fetchApi('/prompt-feed', { limit: 20 }).then(function (resp) {
      var newItems = resp.data || [];
      if (newItems.length === 0) return;

      var existingIds = {};
      feedData.forEach(function (d) { existingIds[d.id] = true; });
      var fresh = newItems.filter(function (item) { return !existingIds[item.id]; });

      if (fresh.length > 0) {
        feedData = fresh.concat(feedData);
        // Cap at 200 items
        if (feedData.length > 200) feedData = feedData.slice(0, 200);
        renderFeedItems(feedData);
      }
    }).catch(function () { /* silent fail on refresh */ });
  }

  function loadMoreFeed() {
    if (feedData.length === 0) return;
    var oldestTime = feedData[feedData.length - 1].promptSubmittedAt;
    var btn = el('feed-load-more-btn');
    btn.textContent = '\u8AAD\u307F\u8FBC\u307F\u4E2D...';
    btn.disabled = true;

    fetchApi('/prompt-feed', { limit: 30, before: oldestTime }).then(function (resp) {
      var moreItems = resp.data || [];
      feedData = feedData.concat(moreItems);
      renderFeedItems(feedData);
      btn.textContent = '\u3082\u3063\u3068\u8AAD\u307F\u8FBC\u3080';
      btn.disabled = false;
      if (!resp.hasMore) {
        el('feed-load-more').style.display = 'none';
      }
    }).catch(function (e) {
      btn.textContent = '\u3082\u3063\u3068\u8AAD\u307F\u8FBC\u3080';
      btn.disabled = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
