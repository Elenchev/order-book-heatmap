import DataFeed from '../lib/BinanceDataFeed.js';
import OrderBook from '../lib/BinanceOrderBook.js';

// check out datafeed-examples.js for more info
const feed = new DataFeed();

// create a lookup table of all available symbols
let symbols = {};
feed.getExchangeInfo((data) => {
  data.symbols.forEach(s => {
    symbols[ s.symbol ] = s;
    symbols[ s.symbol ].tick = s.filters[0].tickSize;
  })
});

// alternatively use symbols.BNBBTC.symbol, symbols.BNBBTC.tick
//const book = new OrderBook(feed, 'BNBBTC', 0.0000001);
//const book = new OrderBook(feed, 'ADXBTC', 0.00000001);
//const book = new OrderBook(feed, 'BTCUSDT', 0.000001 );
const book = new OrderBook(feed, 'XRPUSDT', 0.0001 );

// periodically call getUpdate for the most recent version of
// the order book & stats
setInterval(() => {
  // the OrderBook class reconstructs the tape from live updates
  // the parameters below will return 33 levels of bids & asks
  const orderBookLevels = 3, aggregationPerLevel = 5;
  const data = book.getSnapshot(orderBookLevels, aggregationPerLevel);

  // snapshot not parsed yet or WS not ready
  if (!data)
    return

  console.log('Bp: ', data.aggBidPrices, 'Ap:: ', data.aggAskPrices);
  console.log('Bs: ', data.aggBidSizes, 'As: ', data.aggAskSizes);
}, 1000);

/*
setInterval(() => {
  // the caller can also specify a level of aggregation
  // for example the call below will return order book levels
  // in increments of 5 price levels (depending on symbol tick size)
  const orderBookLevels = 6, aggregationPerLevel = 5;
  const data = book.getUpdate(orderBookLevels, aggregationPerLevel);

  // snapshot not parsed yet or WS not ready
  if (!data)
    return

  console.log('6 ask sz: ', data.aggAskSizes, '6 bid sz: ', data.aggBidSizes);
  console.log('6 ask p: ', data.aggAskPrices, '6 bid p: ', data.aggBidPrices);

  // the OrderBook class keeps track of recent trades, sorted by timestamp
  // it will return all new trades since the last time getUpdate was called
  console.log('trades: ', data.trades);

  // OrderBook also calculates some simple statistics regarding recent trades
  // that occured since the last getUpdate call
  console.log('stats: ', data.stats.marketSellOrders, data.stats.marketBuyOrders,
    data.stats.marketSellSize, data.stats.marketBuySize);

  // finally, you can also get any recent error and debug log messages
  console.log('errors: ', data.errors, ' logs: ', data.log);
}, 1000);
*/
