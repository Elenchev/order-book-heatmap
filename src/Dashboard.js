import * as d3 from "d3";

import DataFeed from '../lib/BinanceDataFeed.js';
import OrderBook from '../lib/BinanceOrderBook.js';
import Tick from '../lib/Tick.js';
import { numCompare } from '../lib/utils.js'; 
import { fmtNum, fmtTime } from '../lib/fmt.js';

export default class Dashboard {
  constructor(el, feed, symbol, tickSize, updateInterval=250, levels=10, aggregation=1, maxSeriesLength=5, scale='linear', theme='rb') {
    this.book = new OrderBook(feed, symbol, tickSize);
    this.tick = new Tick(tickSize, aggregation);
    this.el = el;

    this.levels = levels;
    this.aggregation = aggregation;
    this.updateInterval = updateInterval;
    this.intervals = [];

    this.heatmap = {
      // linear vs log2
      scale: scale,
      theme: theme,
      linearScaleCutoff: 0.5,
    };

    this.bufferLevels = 5;
    this.maxSeriesLength = maxSeriesLength;
    console.log(this.maxSeriesLength);

    // snapshot orderbook
    this.orderbook = [];
    this.maxDepth = 1;

    this.trades = [];
    this.mktBuys = [];
    this.mktSells = [];
    this.mktOrderDeltas = [];

    this.askLine = [];
    this.bidLine = [];

    this.x = [];
    this.y = [];

    // get recent market snapshot & rerender
    let rerenderInterval = setInterval(() => {
      const snapshot = this.book.getSnapshot(levels + this.bufferLevels, aggregation);

      if (snapshot) {
        this.updateDashboard(snapshot);
        this.renderHeatmap();
        this.renderTimeAndSales();
        this.renderLimitOrdersBarChart();
        // this.renderDepthLevels();
      }
    }, updateInterval);
    this.intervals.push(rerenderInterval);

    // recalculate order book intensity every 10 seconds
    let recalculateDepth = setInterval(() => {
      let maxDepth = 0;
      for (let i = 0, l = this.orderbook.length; i < l; i++) {
        if (this.orderbook[i].value > maxDepth)
          maxDepth = this.orderbook[i].value;
      }

      this.maxDepth = maxDepth;
    }, 2000);
    this.intervals.push(recalculateDepth);
  }

  // restructure & derive secondary metrics from the OrderBook snapshot
  // truncate old data
  updateDashboard(snapshot) {
    // calculate depth for N extra bid & offer levels, but don't
    // include them in the centered Y axis.
    // Better visualization in volatile market
    const maxSeriesLength = this.maxSeriesLength;
    const ts = fmtTime(new Date(), this.updateInterval);

    // update heatmap axes
    this.x.push(ts);
    if (this.x.length > maxSeriesLength) {
      this.x.shift()
    }


    this.y = snapshot.aggBidPrices
      .reverse()
      .slice(this.bufferLevels === 0 ? 0 : this.bufferLevels - 1);

    // push spread prices (not in bid or ask) to the yAxis
    let nextP = this.tick.incrStep(this.y[ this.y.length - 1]);
    while (nextP !== snapshot.aggAskPrices[0]) {
      this.y.push(nextP);
      nextP = this.tick.incrStep(this.y[ this.y.length - 1]);
    }

    this.y = this.y.concat(
      snapshot.aggAskPrices.slice(0, this.levels - 1)
    );

    // update dashboard data
    for (let i = 0; i < this.levels + this.bufferLevels; i++) {
      this.orderbook.push({
        value: snapshot.aggAskSizes[i],
        y: snapshot.aggAskPrices[i],
        x: ts,
        type: 'ask',
      });

      this.orderbook.push({
        value: snapshot.aggBidSizes[i],
        y: snapshot.aggBidPrices[i],
        x: ts,
        type: 'bid',
      });

      // update maxDepth for heatmap intensity
      if (snapshot.aggAskSizes[i] > this.maxDepth)
        this.maxDepth = snapshot.aggAskSizes[i];
      if (snapshot.aggBidSizes[i] > this.maxDepth)
        this.maxDepth = snapshot.aggBidSizes[i];
    }

    const maxOrderbookLength = maxSeriesLength * (this.levels + this.bufferLevels) * 2;
    if (this.orderbook.length > maxOrderbookLength) {
      this.orderbook = this.orderbook.slice((this.levels + this.bufferLevels) * 2);
    }

    this.ask = snapshot.ask;
    this.bid = snapshot.bid;
    this.askLine.push({
      x: ts,
      y: snapshot.ask
    });
    this.bidLine.push({
      x: ts,
      y: snapshot.ask
    });
    if (this.mktBuys.length > maxSeriesLength) {
      this.askLine.shift();
      this.bidLine.shift();
    }

    this.mktBuys.push({
      value: snapshot.stats.mktBuySize,
      count: snapshot.stats.mktBuyOrders,
      vwap: snapshot.stats.avgBuyVWAP,
      x: ts
    });

    this.mktSells.push({
      value: snapshot.stats.mktSellSize,
      count: snapshot.stats.mktSellOrders,
      vwap: snapshot.stats.avgSellVWAP,
      x: ts
    });

    const sizeDelta = snapshot.stats.mktBuySize - snapshot.stats.mktSellSize;
    const totalTradedSize = snapshot.stats.mktBuySize + snapshot.stats.mktSellSize;
    let delta = {
      x: ts,
      value: Math.abs(snapshot.stats.mktBuySize - snapshot.stats.mktSellSize),
      totalSize: this.tick.round(totalTradedSize),
    };

    // tooltip message
    delta.msgHTML = `${delta.totalSize} contracts traded<br/>`;
    delta.msgHTML = `${delta.msgHTML}${snapshot.stats.mktBuySize} contracts bought (${snapshot.stats.mktBuyOrders}) orders<br/>`;
    delta.msgHTML = `${delta.msgHTML}${snapshot.stats.mktSellSize} contracts sold (${snapshot.stats.mktSellOrders}) orders`;

    if (sizeDelta > 0) {
      delta.y = snapshot.stats.avgBuyVWAP;
      // type is used purely for tooltip styling
      delta.type = 'bid';
    } else {
      delta.y = snapshot.stats.avgSellVWAP;
      delta.type = 'ask';
    }

    this.mktOrderDeltas.push(delta);


    if (this.mktBuys.length > maxSeriesLength) {
      this.mktBuys.shift();
      this.mktSells.shift();
      this.mktOrderDeltas.shift();
    }

    // update trades
    this.trades = this.trades.concat(snapshot.trades);
    if (this.trades.length > maxSeriesLength)
      this.trades = this.trades.slice( this.trades.length - maxSeriesLength );

    const sortedTrades = this.trades
      .map(trade => trade.size)
      .sort((a, b) => a - b);
    const top10PercentileIndex = Math.floor(sortedTrades.length - 1 - sortedTrades.length / 10);
    this.topTradeSize = sortedTrades[top10PercentileIndex];
  }

  renderHeatmap() {
    const self = this;
    const margin = {
      top: 25,
      right: 100,
      bottom: 25,
      left: 25
    };

    // TODO dirty, fix it
    const heatmapEl = this.el.querySelector('.heatmap');
    const uiBarEl = document.querySelector('.ui');
    const width = heatmapEl.clientWidth || window.innerWidth * 0.66 - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom - uiBarEl.clientHeight - 7;

    // clear any existing heatmaps
    d3.select(heatmapEl).select("svg").remove();

    // append the svg object to the web page
    const svg = d3.select(heatmapEl)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("class", "axis-y") 
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // x axis
    const x = d3.scaleBand()
      .range([ 0, width ])
      .domain(self.x);
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .attr("class", "axis-x") 
      .call(d3.axisBottom(x))

    // show every 3rd x label
    const xAxisTicks = heatmapEl.querySelectorAll('.tick text');
    const ticks = d3.selectAll(xAxisTicks);
    const xLabelPeriod = Math.ceil(self.maxSeriesLength / 10);
    ticks.each(function(_,i) {
      if (i % xLabelPeriod !== 0)
        d3.select(this).remove();
    });
 
    // y axis
    const y = d3.scaleBand()
      .range([height, 0])
      .domain(self.y);
    svg.append("g")
      .attr("transform", `translate(${width} ,0)`)
      .call(d3.axisRight(y));

    let bidColorRange = ["#073247", "#00aaff"];
    let askColorRange = ["#2e0704", "#ff0000"];

    if (this.heatmap.theme === 'bw') {
      bidColorRange = ["#222222", "#ffffff"];
      askColorRange = ["#222222", "#ffffff"];
    }

    // bid color scale
    const getBidColor = d3.scaleLinear()
      .domain([0, this.heatmap.linearScaleCutoff * this.maxDepth])
      .range(bidColorRange);
    // ask color scale
    let getAskColor = d3.scaleLinear()
      .domain([0, this.heatmap.linearScaleCutoff * this.maxDepth])
      .range(askColorRange);

    const getLogAskColor = d3.scaleLinear()
      .domain([0, Math.log2(this.maxDepth)])
      .range(askColorRange);

    const getLogBidColor = d3.scaleLinear()
      .domain([0, Math.log2(this.maxDepth)])
      .range(bidColorRange);

    // create a tooltip
    if (!window.tooltip)
      window.tooltip = d3.select(this.el)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("border", "solid")
        .style("position", "absolute")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // Three function that change the tooltip when user hover / move / leave a cell
    const mouseover = function(d) {
      window.tooltip.style("opacity", 1)
    }

    const mousemove = function(d) {
      window.tooltip
        .html(`${d.type}: ${fmtNum(d.value)}`)
        .style("left", (d3.mouse(this)[0] + 50) + "px")
        .style("background-color", d.type === 'ask' ? '#faeaea' : '#eafaea')
        .style("border-color", d.type === 'ask' ? 'red' : 'green')
        .style("top", (d3.mouse(this)[1] + 45) + "px")
    }

    const mousemoveOrderDelta = function(d) {
      window.tooltip
        .html(d.msgHTML)
        .style("left", (d3.mouse(this)[0] + 50) + "px")
        .style("background-color", d.type === 'ask' ? '#faeaea' : '#eafaea')
        .style("border-color", d.type === 'ask' ? 'red' : 'green')
        .style("top", (d3.mouse(this)[1]) + "px")
    }

    const mouseleave = function(d) {
      window.tooltip.style("opacity", 0)
    }

    const visibleBook = this.orderbook.filter(d => 
      d.y >= this.y[0]
        && d.y <= this.y[ this.y.length - 1]
    );

    // limit order heatmap segments
    svg.selectAll()
      .data(visibleBook, function(d) {return d.x+':'+d.y;})
      .enter()
      .append("rect")
        .attr("x", (d) => x(d.x))
        .attr("y", (d) => y(d.y))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function(d) {
          if (d.value === 0) {
            return '#000000'; 
          };

          if (self.heatmap.scale === 'log2') {
            if (d.type === 'bid') {
              return getLogBidColor(Math.log(d.value + 1));
            } else {
              return getLogAskColor(Math.log(d.value + 1));
            }
          } else {
            if (d.type === 'bid') {
              return getBidColor(d.value);
            } else {
              return getAskColor(d.value);
            }
          }
        })
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)

    const sDeltaValues = this.mktOrderDeltas
      .map(x => x.value)
      .sort(numCompare);
    const maxTradedSize = Math.max(...this.mktOrderDeltas.map(x => x.totalSize));

    const buyDeltaColorRange = ["#00d7ff", "#56fffa"];
    const sellDeltaColorRange = ["#ff9100", "#fff400"];

    // market order delta dor color scale
    const getBuyDeltaColor = d3.scaleLinear()
      .domain([sDeltaValues[0], sDeltaValues[ sDeltaValues.length - 1 ]])
      .range(buyDeltaColorRange);
    const getSellDeltaColor = d3.scaleLinear()
      .domain([sDeltaValues[0], sDeltaValues[ sDeltaValues.length - 1 ]])
      .range(sellDeltaColorRange);

    const visibleOrders = self.mktOrderDeltas.filter(order => 
      order.y >= this.y[0]
        && order.y <= this.y[ this.y.length - 1]
        && order.totalSize > 0
    );

    // market order delta dots
    svg.selectAll()
      .data(visibleOrders, function(d) {return d.x+':'+d.y;})
      .enter()
      .append("circle")
        .attr("cx", (d) => x(d.x) + x.bandwidth() / 2)
        .attr("r", (d) => self.getDeltaDotRadius(d.totalSize, y.bandwidth(), maxTradedSize))
        .style("fill", function(d) {
          if (d.type === 'ask') {
            return getSellDeltaColor(d.value);
          } else {
            return getBuyDeltaColor(d.value);
          }
        })
        .attr("cy", (d) => y(d.y) + y.bandwidth() / 2)
      .on("mouseover", mouseover)
      .on("mousemove", mousemoveOrderDelta)
      .on("mouseleave", mouseleave)
  }

  renderTimeAndSales() {
    const tradesWrapper = this.el.querySelector('.trades');
    if (tradesWrapper.style.display === 'none') {
      tradesWrapper.style.display = '';
    }

    const trades = this.el.querySelector('.trades-body');

    // push all recent trades ordered by timestamp & label them as buy / sell
    for (let i = 0; i < this.trades.length; i++) {
      const row = trades.insertRow(0);
      row.classList = this.trades[i].isBuy ? 'buy' : 'sell';
      row.classList += this.trades[i].size >= this.topTradeSize ? ' top-trade' : '';

      let cell = row.insertCell();
      let text = document.createTextNode( this.trades[i].size );
      cell.appendChild(text);
 
      cell = row.insertCell();
      // TODO this shouldn't be necessary - check
      text = document.createTextNode( this.tick.parse(this.trades[i].price) );
      cell.appendChild(text);

      cell = row.insertCell();
      text = document.createTextNode( this.trades[i].time );
      cell.appendChild(text);
    }

    // keep only the last N trades in the list
    if (trades.children.length > this.maxSeriesLength) {
      for (let i = trades.children.length - 1; i > this.maxSeriesLength; i--) {
        trades.removeChild(trades.children[i]);
      }
    }
  }

  renderLimitOrdersBarChart() {
    const barChartEl = this.el.querySelector('.limit-orders-bar-chart');
    d3.select(barChartEl).select("svg").remove();

    var margin = {top: 20, right: 40, bottom: 25, left: 0},
      width = barChartEl.clientWidth - margin.left - margin.right,
      height = barChartEl.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(barChartEl)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xAxis = d3.scaleBand()
      .range([ 0, width ])
      .domain(this.y)
      .padding(0.2);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .attr("class", "axis-x") 
      .call(d3.axisBottom(xAxis))
      .selectAll("text")
        .style("text-anchor", "end");

    const xAxisTicks = barChartEl.querySelectorAll('.tick text');
    const ticks = d3.selectAll(xAxisTicks);
    const xLabelPeriod = Math.ceil(this.levels / 2);
    const nthLabel = Math.ceil(xLabelPeriod / 2);
    ticks.each(function(_,i) {
      if (i % xLabelPeriod !== nthLabel)
        d3.select(this).remove();
    });

    let askLevels = [];
    let bidLevels = [];

    for (let l = this.orderbook.length - 1; l > 0; l--) {
      const lvl = this.orderbook[l];
      if (lvl.x !== this.x[ this.x.length - 1 ])
        break;

      // TODO use columnar data structs to avoid loops like this
      if (this.y.indexOf(lvl.y) === -1)
        continue

      if (lvl.type === 'ask')
          askLevels.push(lvl);

      if (lvl.type === 'bid')
          bidLevels.push(lvl);
    }

    const timeCmpr = (a, b) => (a.y > b.y) ? 1 : -1;
    askLevels.sort(timeCmpr);
    bidLevels.sort(timeCmpr);

    const levels = bidLevels.concat(askLevels);
    const max = Math.max(...levels.map(lvl => lvl.value));

    const yAxis = d3.scaleLinear()
      .domain([0, max])
      .range([ height, 0]);
    svg.append("g")
      .attr("class", "axis-y") 
      .attr("transform", `translate(${width} ,0)`)
      .call(d3.axisRight(yAxis));

    svg.selectAll("bars")
      .data(levels)
      .enter()
      .append("rect")
        .attr("x", function(d) { return xAxis(d.y); })
        .attr("width", xAxis.bandwidth())
        .attr("fill", "#69b3a2")
        .attr("height", function(d) { return height - yAxis(d.value); })
        .attr("y", function(d) { return yAxis(d.value); })
        .style("fill", (d) => {
          if (d.type === 'bid') {
            return "#073247";
          } else {
            return "#2e0704";
          }
        })
  }

  //logarithmically scale delta dot size
  getDeltaDotRadius (size, vertBandwidth, maxTradedSize) {
    const maxMultiplier = 1;
    let baseMultiplier = 0.25;

    if (0) {
      baseMultiplier += (Math.log2(size) / Math.log2(maxTradedSize)) * maxMultiplier;
    } else {
      baseMultiplier += (size / maxTradedSize) * maxMultiplier;
    }
    return vertBandwidth * baseMultiplier;
  }

  clearDashboardIntervals() {
    for (let i = 0, l = this.intervals.length; i < l; i++) {
      clearInterval(this.intervals[i]);
    }
  }
}
