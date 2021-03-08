Try it now: <TODO>

# Order Book Heatmap
This repo implements a live limit order book heatmap, resting limit orders graph and a buffered time &amp; sales log. Market data is received through a custom Binance WS client, which feeds data into a simple orderbook structure, responsible for keeping track of all market deltas and returning snapshots to the D3 visualizations.

The main goal of this project was to familiarize myself with the Binance WS APIs and the data streams that they provide. Keep in mind that this was writtin in a couple of days, it's nowhere near close to handling all possible market states.

# LTC low volatility example
![example gif](./asstes/images/ltc-example.gif)

# More Examples
![](./asstes/images/1.png)
![](./asstes/images/2.png)
![](./asstes/images/3.png)
