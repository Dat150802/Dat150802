// Chart.js helpers
function renderBarChart(ctx, labels, data, label='Số liệu', color='rgba(15,82,186,0.7)') {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: color }] },
    options: { responsive: true }
  });
}
function renderLineChart(ctx, labels, data, label='Thống kê', color='rgba(246,201,14,0.7)') {
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label, data, backgroundColor: color, borderColor: color, fill: true }] },
    options: { responsive: true }
  });
}
function renderDoughnutChart(ctx, labels, data, colors) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { responsive: true }
  });
}
function renderStackedBarChart(ctx, labels, datasets) {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
  });
}