export default {
  "wsEndpoint": "wss://stream.binance.com:9443/stream?streams=",
  "restEndpoint": "https://api.binance.com/api/v3/",

  // 5, 10, 20, 50, 100, 500, 1000 or 5000
  "depthSnapshotLimit": 1000,
  // 100ms or 1000ms
  "wsDepthFreq": "100ms",
  "wsAggDepthLevels": "20",
  "wsPingInterval": 15000,
};
