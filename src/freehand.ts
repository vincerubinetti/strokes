/** https://github.com/steveruizok/perfect-freehand?tab=readme-ov-file#rendering */

export type Point = [number, number];

export const avg = (a: Point, b: Point): Point => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];

export const getSvgPathFromStroke = (stroke: Point[], closed = true) => {
  if (stroke.length < 4) return "";
  return [
    "M",
    stroke[0],
    "Q",
    stroke[1],
    avg(stroke[1], stroke[2]),
    "T",
    ...Array(stroke.length - 3)
      .fill(null)
      .map((_, i) => avg(stroke[i + 2], stroke[i + 3])),
    closed ? "Z" : "",
  ]
    .flat()
    .map((v) => (typeof v === "number" ? v.toFixed(2) : v))
    .join(" ");
};
