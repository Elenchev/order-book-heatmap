export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// format time to mm:ss.ms in N steps -> eg round to 250ms
export const fmtTime = (ts, precision) => {
  const t = new Date(ts);

  let ms = t.getMilliseconds();
  if (precision) {
    const r = ms % precision;
    if (r > precision / 2) {
      ms += precision - r;
    } else {
      ms -= r;
    }
  }

  if (ms < 10) {
    ms = `00${ms}`;
  } else if (ms < 100) {
    ms = `0${ms}`;
  }

  let s = t.getSeconds();
  if (s < 10)
    s = `0${s}`;

  if (ms === 1000) {
    ms = '000';
    s += 1;
  }

  let m = t.getMinutes();
  if (m < 10)
    m = `0${m}`;

  if (s === 60) {
    s = 0;
    m += 1;

    if (m === 60) {
      m = 0;
    }
  }

  let h = t.getHours();

  return `${h}:${m}:${s}.${ms}`;
};

// format number according to locale
export const numberFormatter = new Intl.NumberFormat('en-US');
export const fmtNum = (num) => numberFormatter.format(num);
