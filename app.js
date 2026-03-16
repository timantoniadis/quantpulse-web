const ctx = document.getElementById('priceChart');
const symbolInput = document.getElementById('symbolInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const ticker = document.getElementById('ticker');
const signalTitle = document.getElementById('signalTitle');
const signalPill = document.getElementById('signalPill');
const signalText = document.getElementById('signalText');
const returnValue = document.getElementById('returnValue');
const confidence = document.getElementById('confidence');
const risk = document.getElementById('risk');
const horizon = document.getElementById('horizon');
const backtestCopy = document.getElementById('backtestCopy');
const alertBanner = document.getElementById('alertBanner');
const positionsTable = document.getElementById('positionsTable');
const tradesTable = document.getElementById('tradesTable');
const tradesMeta = document.getElementById('tradesMeta');
const apiStatus = document.getElementById('apiStatus');
const loginBtn = document.getElementById('loginBtn');

const WATCHLIST = ['AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL'];

function generateSeries(days = 60, start = 100) {
  const out = [];
  let p = start;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    p = p * (1 + (Math.random() - 0.45) * 0.02);
    out.push({ x: d, y: Number(p.toFixed(2)) });
  }
  return out;
}

let series = generateSeries(90, 120);
let latestPrices = Object.fromEntries(WATCHLIST.map(t => [t, Number((80 + Math.random() * 180).toFixed(2))]));
let currentSymbol = 'AAPL';

const chart = new Chart(ctx, {
  type: 'line',
  data: { datasets: [{ label: 'Price', data: series, borderColor: '#5eead4', pointRadius: 0, borderWidth: 2, tension: 0.3, fill: false }] },
  options: {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    scales: {
      x: { type: 'time', time: { unit: 'day' }, grid: { color: '#1d2b45' }, ticks: { color: '#9db0cd' } },
      y: { grid: { color: '#1d2b45' }, ticks: { color: '#9db0cd' } }
    }
  }
});

function setSignal(score) {
  if (score >= 70) {
    signalPill.className = 'pill buy'; signalPill.textContent = 'BUY';
    signalText.textContent = 'Strong signal from combined momentum + smart-money trend.'; risk.textContent = 'Medium';
  } else if (score >= 45) {
    signalPill.className = 'pill hold'; signalPill.textContent = 'HOLD';
    signalText.textContent = 'Mixed conditions. Wait for confirmation before adding size.'; risk.textContent = 'Medium-High';
  } else {
    signalPill.className = 'pill avoid'; signalPill.textContent = 'AVOID';
    signalText.textContent = 'Weak setup and unfavorable structure. Capital better deployed elsewhere.'; risk.textContent = 'High';
  }
}

function getPositions() {
  try { return JSON.parse(localStorage.getItem('qp_positions') || '[]'); } catch { return []; }
}
function savePositions(items) { localStorage.setItem('qp_positions', JSON.stringify(items)); }

function evaluatePosition(p) {
  const current = latestPrices[p.ticker] ?? p.entryPrice;
  const pnlPct = ((current - p.entryPrice) / p.entryPrice) * 100;
  let action = 'HOLD';
  let reason = 'Trend still acceptable.';
  if (pnlPct <= -7) { action = 'SELL'; reason = 'Stop-loss hit (-7% or worse).'; }
  else if (pnlPct >= 15) { action = 'TRIM'; reason = 'Take-profit zone reached (+15%+).'; }
  else if (pnlPct <= -4) { action = 'TRIM'; reason = 'Weakness increasing; de-risk position.'; }
  return { ...p, current, pnlPct, action, reason };
}

function deletePosition(index) {
  const positions = getPositions();
  positions.splice(index, 1);
  savePositions(positions);
  renderPositions();
}

function exportCsv() {
  const rows = getPositions().map(evaluatePosition);
  if (!rows.length) return;
  const header = ['ticker','entryPrice','qty','current','pnlPct','action','reason'];
  const lines = [header.join(',')].concat(rows.map(r => [
    r.ticker,
    r.entryPrice,
    r.qty || '',
    r.current.toFixed(2),
    r.pnlPct.toFixed(2),
    r.action,
    `"${r.reason.replace(/"/g, '""')}"`
  ].join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quantpulse-positions-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderPositions() {
  const rows = getPositions().map(evaluatePosition);
  const urgent = rows.find(r => r.action === 'SELL');

  if (urgent) {
    alertBanner.classList.remove('hidden');
    alertBanner.textContent = `⚠ Sell alert: ${urgent.ticker} ${urgent.pnlPct.toFixed(2)}% — ${urgent.reason}`;
  } else {
    alertBanner.classList.add('hidden');
  }

  if (!rows.length) {
    positionsTable.innerHTML = '<p class="muted">No positions yet. Add one above.</p>';
    return;
  }

  positionsTable.innerHTML = `
    <table class="table">
      <thead><tr><th>Ticker</th><th>Entry</th><th>Current</th><th>P/L %</th><th>Action</th><th>Reason</th><th></th></tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td>${r.ticker}</td>
            <td>$${Number(r.entryPrice).toFixed(2)}</td>
            <td>$${Number(r.current).toFixed(2)}</td>
            <td class="${r.pnlPct >= 0 ? 'up' : 'down'}">${r.pnlPct >= 0 ? '+' : ''}${r.pnlPct.toFixed(2)}%</td>
            <td><span class="badge ${r.action.toLowerCase()}">${r.action}</span></td>
            <td>${r.reason}</td>
            <td><button class="btn-delete" data-del="${i}">Delete</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deletePosition(Number(btn.dataset.del)));
  });
}

async function loadCongressTrades(symbol = currentSymbol) {
  const key = localStorage.getItem('qp_quiver_key') || document.getElementById('apiKey').value.trim();
  if (!key) {
    tradesTable.innerHTML = '<p class="muted">Add API key above to load live congress trades.</p>';
    return;
  }

  tradesMeta.textContent = `Loading recent congress trades for ${symbol}...`;
  try {
    const res = await fetch(`https://api.quiverquant.com/beta/live/congresstrading?ticker=${encodeURIComponent(symbol)}`, {
      headers: { 'accept': 'application/json', 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, 25) : [];

    if (!items.length) {
      tradesTable.innerHTML = '<p class="muted">No recent trade rows for this ticker.</p>';
      tradesMeta.textContent = `No recent records for ${symbol}.`;
      return;
    }

    tradesMeta.textContent = `Showing ${items.length} recent records for ${symbol}.`;
    tradesTable.innerHTML = `
      <table class="table">
        <thead><tr><th>Date</th><th>Name</th><th>Ticker</th><th>Action</th><th>Range</th><th>Party</th></tr></thead>
        <tbody>
          ${items.map(r => `
            <tr>
              <td>${r.TransactionDate || r.ReportDate || '-'}</td>
              <td>${r.Representative || '-'}</td>
              <td>${r.Ticker || '-'}</td>
              <td>${r.Transaction || '-'}</td>
              <td>${r.Range || '-'}</td>
              <td>${r.Party || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    const isCors = String(e.message || '').toLowerCase().includes('failed to fetch');
    tradesMeta.textContent = `Couldn’t load live trades (${e.message}).`;
    tradesTable.innerHTML = isCors
      ? '<p class="muted">Blocked by browser CORS policy. Next fix: move Quiver call behind backend proxy (VPS/Cloudflare Worker) so browser does not call Quiver directly.</p>'
      : '<p class="muted">Live fetch failed. Check API key/auth format.</p>';
  }
}

document.getElementById('addPositionBtn').addEventListener('click', () => {
  const ticker = (document.getElementById('posTicker').value || '').toUpperCase().trim();
  const entryPrice = Number(document.getElementById('posEntryPrice').value);
  const qty = Number(document.getElementById('posQty').value || 0);
  if (!ticker || !entryPrice) return;
  const positions = getPositions();
  positions.push({ ticker, entryPrice, qty, addedAt: new Date().toISOString() });
  savePositions(positions);
  document.getElementById('posTicker').value = '';
  document.getElementById('posEntryPrice').value = '';
  document.getElementById('posQty').value = '';
  renderPositions();
});

document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('refreshTradesBtn').addEventListener('click', () => loadCongressTrades(currentSymbol));
document.getElementById('saveKey').addEventListener('click', () => {
  const k = document.getElementById('apiKey').value.trim();
  const p = proxyUrlInput.value.trim().replace(/\/$/, '');
  if (!k || !p) {
    apiStatus.textContent = 'Need both API key and Proxy URL.';
    return;
  }
  localStorage.setItem('qp_quiver_key', k);
  localStorage.setItem('qp_proxy_url', p);
  apiStatus.textContent = 'API key + proxy saved locally in this browser.';
  loadCongressTrades(currentSymbol);
});

loginBtn.addEventListener('click', () => {
  const logged = localStorage.getItem('qp_logged_in') === '1';
  if (logged) {
    localStorage.setItem('qp_logged_in', '0');
    loginBtn.textContent = 'Log in';
  } else {
    localStorage.setItem('qp_logged_in', '1');
    loginBtn.textContent = 'Logged in';
  }
});

analyzeBtn.addEventListener('click', () => {
  const symbol = (symbolInput.value || 'AAPL').toUpperCase();
  currentSymbol = symbol;
  signalTitle.textContent = `Signal — ${symbol}`;

  const lookback = Number(document.getElementById('lookback').value);
  const base = 80 + Math.random() * 120;
  series = generateSeries(lookback * 3, base);
  chart.data.datasets[0].data = series;
  chart.update();

  const start = series[series.length - lookback - 1]?.y ?? series[0].y;
  const end = series[series.length - 1].y;
  latestPrices[symbol] = end;
  const ret = ((end - start) / start) * 100;
  const score = Math.round(Math.min(95, Math.max(20, 50 + ret * 4 + (Math.random() * 20 - 10))));

  ticker.textContent = symbol;
  confidence.textContent = score + '%';
  horizon.textContent = lookback <= 7 ? '3–10d' : lookback <= 30 ? '2–6w' : '1–3m';
  returnValue.textContent = `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
  returnValue.className = ret >= 0 ? 'up' : 'down';
  backtestCopy.textContent = `$1,000 → $${(1000 * (1 + ret / 100)).toFixed(2)}`;

  setSignal(score);
  renderPositions();
  loadCongressTrades(symbol);
});

// initial UI state
const savedKey = localStorage.getItem('qp_quiver_key') || '';
const savedProxy = localStorage.getItem('qp_proxy_url') || '';
if (savedKey) document.getElementById('apiKey').value = savedKey;
if (savedProxy) proxyUrlInput.value = savedProxy;
if (savedKey || savedProxy) {
  apiStatus.textContent = 'Saved settings loaded from local storage.';
}
if (localStorage.getItem('qp_logged_in') === '1') {
  loginBtn.textContent = 'Logged in';
}

analyzeBtn.click();
renderPositions();
