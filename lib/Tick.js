/*
 * Helper class for easy tick manipulation
 * can be used for parsing & rounding to specific ticksize
 *
 * TODO very big / small numbers will be a problem due to scientific notation
 * ed 1e-7 for very small or 1e7 for big numbers. No need for such small tick
 * sizes for now.
 *
 * TODO move to typescrint, this class deals with a lot of types, and only
 * constructor inputs are validated. TypeScript will help with NaN, Infinity, 1e-7...
 *
 * TODO overload to handle tick sizes over 1 & tickSize*aggregate > 1 not needed for now
 */
export default class Tick {
  constructor (tickSize, aggregate = 1) {
    this.setTickSize(tickSize);
    this.setAggregate(aggregate);
    this.init;
  }

  setTickSize(tickSize) {
    if (! tickSize) {
      throw('Tick size not specified');
    }

    let ts = tickSize;
    // if tick size is a string it is vital that we get the exact value
    // not an approximate, very close number
    if (typeof tickSize === 'string') {
      ts = Number.parseFloat(tickSize);
      const digits = this.getNumDecimals(tickSize);

      if (digits !== 0) {
        const i = Math.pow(10, digits);
        ts = Math.round(ts * i) / i;
      }
    }

    // TODO add a check for scientific notaion
    if (ts <= 0 || ts > 1) {
      console.error('Tick size it must be a number in the range (0, 1]: ', tickSize);
      throw('Invalid tick size');
    }

    this.tickSize = ts;
    this.init();
  }

  setAggregate(aggregate) {
    // aggregate levels <1 don't make sense as there's no
    // way to represent data / prices in orders smaller than
    // tick size
    if (typeof aggregate !== "number"
      || aggregate < 1
      || aggregate * this.tickSize > 1) {

      console.error('Invalid aggregate input: ', aggregate);
      throw('Invalid aggregate size');
    }

    this.aggregate = aggregate;
    this.init();
  }

  init() {
    this.stepSize = this.tickSize * this.aggregate;

    // cache for faster rounding & parsing
    this.inverse = this.getInverse();
    this.inverseStep = this.getInverse();

    // num => str conversion cache
    this.strPrecision = this.getNumDecimals(this.stepSize);
  }


  round(num) {
    return Math.round(num * this.inverse) / this.inverse;
  };

  roundStep(num) {
    return Math.round(num * this.inverseStep) / this.inverseStep;
  };


  incr(num) {
    return this.round(num + this.tickSize);
  };

  decr(num) {
    return this.round(num - this.tickSize);
  };

  incrStep(num) {
    return this.roundStep(num + this.stepSize);
  };

  decrStep(num) {
    return this.roundStep(num - this.stepSize);
  };

  addSteps(num, x) {
    return this.roundStep(num + x * this.stepSize);
  };

  subSteps(num, x) {
    return this.roundStep(num - x * this.stepSize);
  };


  parse(str) {
    return this.round(parseFloat(str));
  }

  parseStep(str) {
    return this.roundStep(parseFloat(str));
  }

  // add trailing 0s after decimal point
  toTickStr(num, digits) {
    return num.toPrecision(digits || this.strPrecision);
  }

  getNumDecimals(num) {
    const tickStr = num.toString().split('.');
    return (tickStr.length > 1) ? tickStr[1].length : 0;
  }


  getInverse() {
    return Math.round(1 / (this.tickSize));
  }

  getInverseStep() {
    return Math.round(1 / (this.stepSize));
  }

  getTickSize() {
    return this.tickSize;
  }

  getAggregate() {
    return this.tickSize;
  }

  getStepSize() {
    return this.stepSize;
  }
}
