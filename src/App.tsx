import { useEffect, useRef, type RefObject } from "react";
import {
  useCounter,
  useElementSize,
  useInterval,
  useMouse,
} from "@reactuses/core";
import { mean, random, range, sample } from "lodash";
import gsap from "gsap";
import * as freehand from "perfect-freehand";
import { useHistory } from "./hooks";
import { Vector } from "./vector";
import "./App.css";

/** params */
const size = 2;
const duration = 0.35;
const steps = 10;
const bulge = 0.01;
const curve = 20;

/** objects on screen */
const objects = new Map<symbol, Object>();

type Object = { points: { x: number; y: number; w: number }[]; color: string };

type Point = { x: number; y: number };

/** generate object */
const generate = (ap: Point, bp: Point) => {
  /** unique id */
  const id = Symbol();

  /** from */
  const a = new Vector(ap.x, ap.y);
  /** to */
  const b = new Vector(bp.x, bp.y);

  /** start length */
  const lengthStart = 0;
  /** total change in length */
  const lengthChange = b.subtract(a).length();
  /** length delta */
  const lengthStep = (lengthChange / steps) * random(0.5, 2, true);

  /** total change in angle */
  const angleChange = random(-curve, curve);
  /** start angle */
  const angleStart = a.subtract(b).angle();
  /** angle delta */
  const angleStep = angleChange / steps;

  /** generate path of points */
  const points = range(steps)
    .map((step) => {
      const length = lengthStart + step * lengthStep;
      const angle = angleStart + step * angleStep;
      return b.add(Vector.fromPolar({ length, angle }));
    })
    .map((p) => ({ ...p, w: 0 }))
    .reverse();

  /** random color */
  const color = `var(--${sample(["a", "b", "c", "d", "e"])})`;

  /** point animations */
  const timelines = points.map((point, index) => {
    gsap
      .timeline({
        /** stagger animations by index */
        delay: (index / points.length) * duration,
        onComplete: () => {
          /** mark this animation as done */
          timelines[index] = true;
          /** if all animations are done */
          if (timelines.every(Boolean))
            /** delete object */
            objects.delete(id);
        },
      })
      /** bulge width */
      .to(point, { w: lengthChange * bulge, ease: "linear", duration })
      /** un-bulge width */
      .to(point, { w: 0, ease: "linear", duration });

    /** not done yet */
    return false;
  });

  /** create object */
  objects.set(id, { points, color });
};

/** https://github.com/steveruizok/perfect-freehand?tab=readme-ov-file#rendering */
const avg = (a: [number, number], b: [number, number]) => [
  mean([a[0], b[0]]),
  mean([a[1], b[1]]),
];

/** draw one frame of animation */
const draw = (points: Object["points"]) => {
  /** convert points to stroke */
  const stroke = freehand.getStroke(
    points.map(({ x, y, w }) => [x, y, w]),
    /** stroke options */
    {
      size,
      thinning: 1,
      smoothing: 0,
      streamline: 0,
      simulatePressure: false,
      // start: { cap: false },
      // end: { cap: false },
    }
  ) as [number, number][];

  /** convert stroke to svg path */
  /** https://github.com/steveruizok/perfect-freehand?tab=readme-ov-file#rendering */
  const path = [
    "M",
    ...stroke[0],
    "Q",
    ...stroke[1],
    ...avg(stroke[1], stroke[2]),
    "T",
    ...range(2, stroke.length - 1)
      .map((i) => avg(stroke[i], stroke[i + 1]))
      .flat(),
  ].join(" ");

  return path;
};

/** get mouse position in svg coordinates */
const useSvgMouse = (ref: RefObject<SVGSVGElement | null>) => {
  const fallback = { x: 0, y: 0 };
  const mouse = useMouse(ref);
  if (!ref.current) return fallback;
  if (Number.isNaN(mouse.clientX) || Number.isNaN(mouse.clientY))
    return fallback;
  const point = ref.current.createSVGPoint();
  point.x = mouse.clientX;
  point.y = mouse.clientY;
  return point.matrixTransform(ref.current.getScreenCTM()?.inverse());
};

const App = () => {
  const ref = useRef<SVGSVGElement>(null);

  const [, , inc] = useCounter();

  /** re-render on gsap tick */
  useEffect(() => {
    gsap.ticker.add(inc);
    return () => gsap.ticker.remove(inc);
  }, [inc]);

  /** track mouse position history */
  const mouse = useHistory(useSvgMouse(ref), 20);

  /** periodically generate new points */
  useInterval(() => {
    /** earliest point */
    const start = mouse.current.at(0);
    /** latest point */
    const end = mouse.current.at(-1);
    if (!start || !end) return;
    /** generate new object */
    generate(start, end);
  }, 20);

  /** client dimensions of svg */
  const [width, height] = useElementSize(ref);

  return (
    <svg
      ref={ref}
      viewBox={[0, 0, width, height].join(" ")}
      filter="url(#filter)"
    >
      <rect x={0} y={0} width={width} height={height} fill="var(--f)" />

      {Array.from(objects.values()).map(({ points, color }, index) => (
        <path key={index} d={draw(points)} fill={color} />
      ))}
    </svg>
  );
};

export default App;
