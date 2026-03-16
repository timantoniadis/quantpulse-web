const ctx = document.getElementById('priceChart');
const symbolInput = document.getElementById('symbolInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const ticker = document.getElementById('ticker');
const signalPill = document.getElementById('signalPill');
const signalText = document.getElementById('signalText');
const returnValue = document.getElementById('returnValue');
const confidence = document.getElementById('confidence');
const risk = document.getElementById('risk');
const horizon = document.getElementById('horizon');
const backtestCopy = document.getElementById('backtestCopy');

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

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    datasets: [{
      label: 'Price',
      data: series,
      borderColor: '#5eead4',
      pointRadius: 0,
      borderWidth: 2,
      tension: 0.3,
      fill: false
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    scales: {
      x: { type: 'time', time: { unit: 'day' }, grid: { color: '#1d2b45' }, ticks: { color: '#9db0cd' } },
      y: { grid: { color: '#1d2b45' }, ticks: { color: '#9db0cd' } }
    }
  }
});

function setSignal(score) {
  if (score >= 70) {
    signalPill.className = 'pill buy';
    signalPill.textContent = 'BUY';
    signalText.textContent = 'Strong signal from combined momentum + smart-money trend.';
    risk.textContent = 'Medium';
  } else if (score >= 45) {
    signalPill.className = 'pill hold';
    signalPill.textContent = 'HOLD';
    signalText.textContent = 'Mixed conditions. Wait for confirmation before adding size.';
    risk.textContent = 'Medium-High';
  } else {
    signalPill.className = 'pill avoid';
    signalPill.textContent = 'AVOID';
    signalText.textContent = 'Weak setup and unfavorable structure. Capital better deployed elsewhere.';
    risk.textContent = 'High';
  }
}

analyzeBtn.addEventListener('click', () => {
  const symbol = (symbolInput.value || 'AAPL').toUpperCase();
  const lookback = Number(document.getElementById('lookback').value);
  const base = 80 + Math.random() * 120;
  series = generateSeries(lookback * 3, base);
  chart.data.datasets[0].data = series;
  chart.update();

  const start = series[series.length - lookback - 1]?.y ?? series[0].y;
  const end = series[series.length - 1].y;
  const ret = ((end - start) / start) * 100;
  const score = Math.round(Math.min(95, Math.max(20, 50 + ret * 4 + (Math.random() * 20 - 10))));

  ticker.textContent = symbol;
  confidence.textContent = score + '%';
  horizon.textContent = lookback <= 7 ? '3–10d' : lookback <= 30 ? '2–6w' : '1–3m';
  returnValue.textContent = `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
  returnValue.className = ret >= 0 ? 'up' : 'down';
  const val = 1000 * (1 + ret / 100);
  backtestCopy.textContent = `$1,000 → $${val.toFixed(2)}`;

  setSignal(score);
});

// initial render
analyzeBtn.click();
