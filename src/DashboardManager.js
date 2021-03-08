import DataFeed from '../lib/BinanceDataFeed.js';
import Dashboard from './Dashboard.js';

// TODO handle more than 1 Dashboard at the same time
// trivial to do, with the cuttent code structure, just
// not needed for now

// Dashboard parent class to manage multiple objects & allow
// reuse of the same data feed. OrderBook is not reused for
// multiple connections atm, although it is doable if needed
export default class DashboardManager {
  constructor() {
    this.feed = new DataFeed();
    this.dashboards = [];
  }

  create(el, symbol, updateInterval=250, levels=10, aggregation=1, maxSeriesLength=5, scale='linear', theme='rb') {
    const tickSize = this.feed.getSymbolTickSize(symbol);
    let dashboard = new Dashboard(el, this.feed, symbol, tickSize, updateInterval, levels, aggregation, maxSeriesLength, scale, theme);

    this.dashboards.push({
      el: el,
      symbol: symbol,
      dashboard: dashboard,
      options: {
        updateInterval: updateInterval,
        levels: levels,
        aggregation: aggregation,
        maxSeriesLength: maxSeriesLength,
        scale: scale,
        theme: theme
      }
    });

    return this.dashboards.length - 1;
  }

  remove(idx) {
    console.log(idx, this.dashboards[idx]);

    this.dashboards[idx].dashboard.clearDashboardIntervals();
    this.dashboards.splice(idx, 1);
  }
}
