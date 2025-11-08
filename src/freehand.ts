import { range } from "lodash";

/** https://github.com/steveruizok/perfect-freehand?tab=readme-ov-file#rendering */

export type Point = [number, number];

const avg = ([ax, ay]: Point, [bx, by]: Point): Point => [
  (ax + bx) / 2,
  (ay + by) / 2,
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
    ...range(2, stroke.length - 1).map((i) => avg(stroke[i], stroke[i + 1])),
    closed ? "Z" : "",
  ]
    .flat()
    .map((v) => (typeof v === "number" ? v.toFixed(2) : v))
    .filter(Boolean)
    .join(" ");
};
