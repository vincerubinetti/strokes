import { useEffect, useId, useRef, useState } from "react";
import { useElementSize } from "@reactuses/core";
import { now, random, range } from "lodash";
import * as freehand from "perfect-freehand";
import gsap from "gsap";
import { findAfter, findBefore } from "./array";
import { getSvgPathFromStroke, type Point } from "./freehand";
import { useHistory, useSvgMouse } from "./hooks";
import { sin } from "./math";
import { Vector } from "./vector";
import "./App.css";

/** params */
const size = 2;
const grow = 0.1;
const stagger = 0.5;
const fade = 1;
const interval = 20;
const waveFreq = 0.01;
const waveAmp = 10;
const wisp = 10;
const background = "hsl(230, 50%, 20%)";
const colors = [
  "hsl(330, 70%, 60%)",
  "hsl(30, 70%, 60%)",
  "hsl(140, 70%, 60%)",
  "hsl(200, 70%, 60%)",
  "hsl(260, 70%, 60%)",
] as const;

/** current color */
let colorIndex = 0;

/** paints on screen */
const paints = new Map<symbol, Paint>();

/** paint data */
type Paint = { points: { x: number; y: number; w: number }[]; color: string };

/** generate paint */
const generate = (from: Vector, to: Vector) => {
  /** unique id */
  const id = Symbol();

  /** total length */
  const length = to.subtract(from).length();
  /** direction */
  const direction = to.subtract(from).normalize();
  /** random phase shift */
  const shift = random(0, 1, true);

  /** generate path of points */
  const points = range(0, length, size)
    .map((dist) =>
      from
        .mix(to, dist / length)
        .add(direction.rotate(90).scale(sin(dist * waveFreq + shift) * waveAmp))
    )
    .map((p) => ({ ...p, w: 0 }));

  /** cycle color */
  const color = colors[colorIndex++ % colors.length];

  /** wisp offsets */
  const offsets = points
    .map((_, index) =>
      /** only randomly offset ever nth point */
      index % wisp === 0
        ? new Vector(random(-wisp, wisp), random(-wisp, wisp))
        : null
    )
    .map((offset, index, array) => {
      if (offset !== null) return offset;
      /** interpolate missing values in between generated randoms */
      const before = findBefore(array, index);
      const after = findAfter(array, index);
      if (!before || !after) return new Vector(0, 0);
      const mix = (index - before.index) / (after.index - before.index);
      return before.item.mix(after.item, mix);
    });

  /** point animations */
  const timelines = points.map((point, index) => {
    gsap
      .timeline({
        /** stagger animations by index */
        delay: (index / points.length) * stagger,
        onComplete: () => {
          /** mark this animation as done */
          timelines[index] = true;
          /** if all animations are done */
          if (timelines.every(Boolean))
            /** delete paint */
            paints.delete(id);
        },
      })
      /** grow */
      .to(point, { w: 1, ease: "linear", duration: grow })
      /** fade out */
      .to(point, {
        w: 0,
        x: point.x + (offsets[index]?.x ?? 0),
        y: point.y + (offsets[index]?.y ?? 0),
        ease: "linear",
        duration: fade,
      });

    /** not done yet */
    return false;
  });

  /** create paint */
  paints.set(id, { points, color });
};

/** draw one frame of animation */
const draw = (points: Paint["points"]) => {
  /** convert points to stroke */
  const stroke = freehand.getStroke(
    points.map(({ x, y, w }) => [x, y, w]),
    /** stroke options */
    {
      size,
      thinning: 1,
      smoothing: 1,
      streamline: 1,
      simulatePressure: false,
    }
  ) as Point[];

  /** convert stroke to svg path  */
  return getSvgPathFromStroke(stroke);
};

const App = () => {
  const filter = useId();

  const ref = useRef<SVGSVGElement>(null);

  /** tick counter */
  const [, setTick] = useState(0);

  /** re-render on gsap tick */
  useEffect(() => {
    const inc = () => setTick((tick) => tick + 1);
    gsap.ticker.add(inc);
    return () => gsap.ticker.remove(inc);
  }, []);

  /** track mouse position history */
  const mouse = useHistory(useSvgMouse(ref), 20);

  /** last generate timestamp */
  const lastGenerate = useRef(0);
  if (now() - lastGenerate.current > interval) {
    /** mouse positions */
    const earliest = mouse.current.at(0);
    const latest = mouse.current.at(-1);
    if (earliest && latest) {
      /** paint from/to */
      const from = Vector.fromObject(earliest);
      const to = Vector.fromObject(latest);
      /** generate new paint */
      generate(from, to);
      lastGenerate.current = now();
    }
  }

  /** svg dimensions */
  const [width, height] = useElementSize(ref);

  return (
    <svg
      ref={ref}
      viewBox={[-width / 2, -height / 2, width, height].join(" ")}
      filter={`url(#${filter})`}
      style={{ overflow: "visible" }}
    >
      <filter
        id={filter}
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
      ></filter>

      <rect
        x={-width / 2 - 100}
        y={-height / 2 - 100}
        width={width + 2 * 200}
        height={height + 2 * 200}
        fill={background}
      />

      {Array.from(paints.values()).map(({ points, color }, index) => (
        <path key={index} d={draw(points)} fill={color} />
      ))}
    </svg>
  );
};

export default App;
