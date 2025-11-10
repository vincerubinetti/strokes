import { range } from "lodash";

export const tau = 2 * Math.PI;

export const sin = (percent: number) => Math.sin(tau * percent);
export const cos = (percent: number) => Math.cos(tau * percent);
export const atan = (x: number) => (4 * Math.atan(x)) / tau;

export const avg = (array: number[]) =>
  array.reduce((a, b) => a + b, 0) / array.length;

export const movingAvg = <Item>(
  array: Item[],
  window: number,
  func: (items: (Item | undefined)[]) => Item
) =>
  array.map((_, index) =>
    func(
      range(index - window, index + window + 1).map((index) => {
        if (index < 0) return array.at(0);
        else if (index > array.length - 1) return array.at(-1);
        else return array.at(index);
      })
    )
  );
