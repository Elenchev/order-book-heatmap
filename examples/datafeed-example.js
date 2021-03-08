import DataFeed from '../src/DataFeed.js';

// create a data feed using the default endpoint
const feed = new DataFeed();
/*
// REST
// get a snapshot of the current state of the orderbook for a selected symbol
feed.getOrderBookSnapshot('ADXBTC', (data) => {
  console.log(data)
});
*/
// get a json descriptor of tick sizes, symbols & rate limits
feed.getExchangeInfo((data) => {
  console.log(data.symbols[0]);
});
/*
// WebSockets
// get live updates for every trade for a specific symbol
const sub1 = feed.subscribe('BNBBTC', {
  onTrade: (data) => console.log('sub1 trade: ', data),
  onError: (err) => console.log(err),
});

// if you're interested in more than 1 stream, just specify
// an event handler for it and you'll automatically start receiving
// live updates. In this example sub2 subscribes to all available
// event streams for the ADXBTC symbol over a single WebSocket.
//
// sub2 will reuse the ADXBTC@trade stream from sub1 for better performance
const sub2 = feed.subscribe('ADXBTC', {
  onTrade: (data) => console.log('sub2 trade: ', data),
  onAggTrade: (data) => console.log('sub2 agg trade: ', data),
  onDepth: (data) => console.log('sub2 depth: ', data),
  onKline: (data) => console.log('sub2 kline: ', data),
  onTicker: (data) => console.log('sub2 ticker: ', data),
  onBookTicker: (data) => console.log('sub2 book ticker: ', data),
  onMiniTicker: (data) => console.log('sub2 mini ticker: ', data),
});

// you can easily subscribe to more than 1 symbol at once
// your event handlers can make use of the symbol parameter
//
// define an onError & onLog handler if you want to get notified for
// all errors & debug log messages
const sub3 = feed.subscribe(['ADXBTC', 'BNBBTC'], {
  onTrade: (data, symbol) => console.log(`sub3 ${symbol} trade: `, data),

  onError: (err) => console.log(err),
  onLog: (log) => console.log(log)
});


// if you're no longer interested in a particular subscription
// you can easily unsubscribe. The library will automatically close
// the websocket, if it's no longer used by other subscriptions
setTimeout(() => {
  feed.unsubscribe(sub3);
}, 20000);

// even if you don't explicitly unsubscribe, all interval handlers
// will be destroyed once the subscription objects go out of scope
// sub2 and sub1's periodic PINGs to binance will automatically stop
*/
