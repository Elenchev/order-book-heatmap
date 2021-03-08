import { fmtTime } from './fmt.js';
import Tick from './Tick.js';

// Very naive Binance order book implementation
export default class BinanceOrderBook {
  // use the getExchangeInfo method of the DataFeed class in order to get
  // symbol names & tick sizes
  constructor(feed, symbol, tickSize) {
    const self = this;
    this.tick = new Tick(tickSize);

    // subscribe to all trade & order book updates
    // keep track of any error / log messages
    this.subscription = feed.subscribe(symbol, {
      onDepth: this.onDepth.bind(self),
      onTrade: this.onTrade.bind(self),
      onBookTicker: this.onBookTicker.bind(self),

      onError: (err) => { self.errors.push(err) },
      onLog: (log) => { self.log.push(log) },
    })

    // for big AVL trees we could use a hashmap cache, not necessary so far
    // price => quantity
    this.book = {};
    this.trades = [];

    // references to the AVL tree nodes that represent the current bid & offer
    this.bid = null;
    this.ask = null;

    // simple array buffers
    this.errors = [];
    this.log = [];

    // keep all updates in a buffer before we get a snapshot from Binance
    // afterwards, discard all updates with timestamps before the snapshot
    // and apply the more recent changes to the book. The buffers are not used
    // once the snapsho
    this.bookBuffer = [{}];
    // trade & order book statistics
    this.stats = {};

    this.isSnapshotParsed = false;
    this.resetStats();

    // TODO this is a bit dirty, refactor to a setInterval that checks if
    // the socket has been open of forcing a hardcoded wait period
    setTimeout(() => {
      feed.getOrderBookSnapshot(
        symbol,
        this.initFromSnapshot.bind(self)
      );
    }, 2000);
  }

  initFromSnapshot(snapshot) {
    snapshot.asks.forEach(ask => {
      this.book[ this.tick.parse(ask[0]) ] = this.tick.parse(ask[1]);
    })
    this.ask = this.tick.parse(snapshot.asks[0][0]);

    snapshot.bids.forEach(bid => {
      this.book[ this.tick.parse(bid[0]) ] = this.tick.parse(bid[1]);
    })
    this.bid = this.tick.parse(snapshot.bids[0][0]);

    this.isSnapshotParsed = true;

    // process all buffered updates, newer than the snapshot id
    this.bookBuffer.forEach(update => {
      if(update.U > snapshot.lastUpdateId)
        this.onDepth(update)
    })
  }

  onDepth(data) {
    if (! this.isSnapshotParsed) {
      this.bookBuffer.push(data);
      return;
    }

    data.a.forEach(ask => {
      this.book[ this.tick.parse(ask[0]) ] = this.tick.parse(ask[1]);
    })

    data.b.forEach(bid => {
      this.book[ this.tick.parse(bid[0]) ] = this.tick.parse(bid[1]);
    })
  }

  onBookTicker(data) {
    this.book[ data.a ] = this.tick.parse(data.A);
    this.ask = this.tick.parse(data.a);

    this.bid = this.book[ data.b ] = this.tick.parse(data.B);
    this.bid = this.tick.parse(data.b);
  }

  onTrade(data) {
    if (! this.isSnapshotParsed)
      return;

    const trade = {
      id: data.t,
      isBuy: !data.m,
      price: this.tick.parse(data.p),
      size: this.tick.parse(data.q),
      time: fmtTime(data.T, 50)
    };

    this.trades.push(trade);

    if (trade.isBuy) {
      this.stats.mktBuyOrders++;
      this.stats.mktBuySize = this.tick.round(this.stats.mktBuySize + trade.size);
      this.stats.mktBuyPriceTotal += trade.price * trade.size;
    } else {
      this.stats.mktSellOrders++;
      this.stats.mktSellSize = this.tick.round(this.stats.mktSellSize + trade.size);
      this.stats.mktSellPriceTotal += trade.price * trade.size;
    }
  }

  getSnapshot(levels=25, aggregation=10) {
    if (levels <= 0 || aggregation <= 0)
      throw('Invalid aggregation step');

    if (! this.isSnapshotParsed)
      return null;

    if (this.tick.getAggregate() !== aggregation)
      this.tick.setAggregate(aggregation);

    const aggregateAsks = this.aggregateAsks(levels);
    const aggregateBids = this.aggregateBids(levels);
    
    const snapshot = {
      trades: [...this.trades],
      ask: this.ask,
      aggAskSizes: aggregateAsks.sizes,
      aggAskPrices: aggregateAsks.prices,
      bid: this.bid,
      aggBidSizes: aggregateBids.sizes,
      aggBidPrices: aggregateBids.prices,
      stats: Object.assign({
        avgBuyVWAP: this.getAvgMktOrderPrice(
          this.stats.mktBuyPriceTotal,
          this.stats.mktBuySize
        ),
        avgSellVWAP: this.getAvgMktOrderPrice(
          this.stats.mktSellPriceTotal,
          this.stats.mktSellSize
        )
      }, this.stats),

      errors: [...this.errors],
      log: [...this.log],
    }

    this.resetStats();
    this.trades = [];
    this.errors = [];
    this.log = [];

    return snapshot;
  }

  aggregateBids(levels) {
    let aggBids = {
      prices: [],
      sizes: []
    };

    // when aggregation > 1, the aggregated depth for the 1st bid / ask level
    // may fall on a tick value that forces it to include slightly more / less
    // levels than specified in the aggregation parameter.
    // This only affects the 1st bid / ask level
    let max = this.tick.roundStep(this.bid);
    // step - 1, so that intervals don't overlap
    // a bit dirtier than the bid version, but we must assure that
    // max is devisible by stepSize and mins don't overlap
    let min = this.tick.decrStep(max);
    min = this.tick.incr(min);

    for (let i = 0; i < levels; i++) {
      let size = 0;
      for (let j = max; j >= min; j = this.tick.decr(j)) {
        if (this.book[j])
          size += this.book[j];
      }

      aggBids.sizes.push(this.tick.round(size));
      aggBids.prices.push(max);

      max = this.tick.decrStep(max);
      min = this.tick.decrStep(min);
    }
    return aggBids;
  }

  aggregateAsks(levels) {
    let aggAsks = {
      prices: [],
      sizes: []
    };

    let min = this.ask;
    let max = this.tick.incrStep(min);

    for (let i = 0; i < levels; i++) {
      let size = 0;
      for (let j = max; j >= min; j = this.tick.decr(j)) {
        if (this.book[j])
          size += this.book[j];
      }

      aggAsks.sizes.push(this.tick.round(size));
      aggAsks.prices.push(max);
      // round to the nearest tick, to avoid floating point number errors
      min = this.tick.incr(max);
      max = this.tick.incrStep(max);
    }

    return aggAsks;
  }

  getAvgMktOrderPrice(priceTotal, sizeSum) {
    if (! sizeSum)
      return null;

    return this.tick.roundStep(priceTotal / sizeSum);
  }

  resetStats() {
    this.stats = {
      mktSellOrders: 0,
      mktBuyOrders: 0,
      mktSellSize: 0,
      mktBuySize: 0,
      mktSellPriceTotal: 0,
      mktBuyPriceTotal: 0
    };
  }
}
