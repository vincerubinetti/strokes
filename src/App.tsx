import { useEffect, useRef, useState } from "react";
import { useElementSize } from "@reactuses/core";
import { now, random } from "lodash";
import gsap from "gsap";
import * as freehand from "perfect-freehand";
import { getSvgPathFromStroke, type Point } from "./freehand";
import { sin } from "./math";
import { Vector } from "./vector";
import "./App.css";

/** params */
const size = 1;
const grow = 0.25;
const stagger = 0.1;
const fade = 2;
const tail = 50;
const interval = 50;
const waveFreq = 0.2;
const waveAmp = 20;
const wisp = 20;
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
const generate = (positions: Vector[]) => {
  /** unique id */
  const id = Symbol();

  /** distance traveled */
  let dist = 0;

  /** generate path of points */
  const points = positions
    .map((point, index, array) => {
      const next = array[index + 1];
      if (!next) return;
      if (next.equals(point)) return;
      const step = next.subtract(point);
      if (!step.length()) return;
      dist += waveFreq;
      /** wiggle */
      return point.add(
        step
          .normalize()
          .rotate(90)
          .scale(waveAmp * sin(dist))
      );
    })
    .filter((point) => point !== undefined)
    .map((point) => ({ ...point, w: 0 }));

  /** wisp offsets, smoothed */
  const offsets = points.map(() => random(-wisp, wisp));

  /** cycle color */
  const color = colors[colorIndex++ % colors.length];

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
        x: point.x + offsets[index],
        y: point.y + offsets[index],
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
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
    }
  ) as Point[];

  /** convert stroke to svg path  */
  return getSvgPathFromStroke(stroke);
};

const App = () => {
  const ref = useRef<SVGSVGElement>(null);

  /** tick counter */
  const [, setTick] = useState(0);

  /** re-render on gsap tick */
  useEffect(() => {
    const inc = () => setTick((tick) => tick + 1);
    gsap.ticker.add(inc);
    return () => gsap.ticker.remove(inc);
  }, []);

  trackTrail();

  /** last generate timestamp */
  const lastGenerate = useRef(0);
  if (now() - lastGenerate.current > interval) {
    /** generate new paint */
    generate(trail);
    lastGenerate.current = now();
  }

  /** svg dimensions */
  const [width, height] = useElementSize(ref);

  return (
    <svg
      ref={(el) => {
        ref.current = el;
        svg = el;
      }}
      viewBox={[-width / 2, -height / 2, width, height].join(" ")}
      style={{ overflow: "visible" }}
    >
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

/** mouse position */
let mouse: Vector | null = null;

/** mouse trail */
const trail: Vector[] = [];

/** reference svg */
let svg: SVGSVGElement | null = null;

/** track mouse */
window.addEventListener("mousemove", (event) => {
  if (!svg) return;
  const svgPoint = svg.createSVGPoint();
  svgPoint.x = event.clientX;
  svgPoint.y = event.clientY;
  mouse = Vector.fromObject(
    svgPoint.matrixTransform(svg.getScreenCTM()?.inverse())
  );
});

/** track trail */
const trackTrail = () => {
  if (!mouse) return;
  trail.push(mouse.clone());
  if (trail.length > tail) trail.shift();
};
