export const tau = 2 * Math.PI;

export const sin = (percent: number) => Math.sin(tau * percent);
export const cos = (percent: number) => Math.cos(tau * percent);
export const atan = (x: number) => 4 * Math.atan(x) / tau;