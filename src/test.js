import Tick from './Tick.js';

const tick = new Tick("0.000010000");
//0.4634500000000001 100.40000000000002 "0.46345000" "100.40000000"
console.log(tick.parse("324.0032400234"))
console.log(tick.round(parseFloat("324.0032400234")))
console.log(tick.round(324.0032400234))

const inv = Math.round(1 / tick.getTickSize());
console.log(inv, 324.0032400234 / inv, " ", Math.round(324.0032400234 * inv), " ", Math.round(324.0032400234 * inv) / inv)
