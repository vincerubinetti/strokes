import { useEffect, useId, useRef, type RefObject } from "react";
import {
  useCounter,
  useElementSize,
  useInterval,
  useMouse,
} from "@reactuses/core";
import { random, range, sample } from "lodash";
import gsap from "gsap";
import * as freehand from "perfect-freehand";
import { useHistory } from "./hooks";
import { getSvgPathFromStroke, type Point } from "./freehand";
import { Vector } from "./vector";
import "./App.css";

/** params */
const size = 2;
const duration = 0.35;
const steps = 10;
const bulge = 0.01;
const curve = 20;
const crinkleFreq = 0.1;
const crinkleAmp = 5;
const fps = 10;
const background = "hsl(236, 47%, 35%)";
const colors = [
  "hsl(331, 70%, 65%)",
  "hsl(32, 80%, 58%)",
  "hsl(145, 60%, 58%)",
  "hsl(202, 67%, 60%)",
  "hsl(258, 53%, 55%)",
] as const;

/** gsap settings */
gsap.ticker.fps(fps);

/** paints on screen */
const paints = new Map<symbol, Paint>();

/** paint data */
type Paint = { points: { x: number; y: number; w: number }[]; color: string };

/** generate paint */
const generate = (from: Vector, to: Vector) => {
  /** unique id */
  const id = Symbol();

  /** start length */
  const lengthStart = 0;
  /** total change in length */
  const lengthChange = to.subtract(from).length();
  /** length delta */
  const lengthStep = (lengthChange / steps) * random(0.5, 2, true);

  /** total change in angle */
  const angleChange = random(-curve, curve);
  /** start angle */
  const angleStart = from.subtract(to).angle();
  /** angle delta */
  const angleStep = angleChange / steps;

  /** generate path of points */
  const points = range(steps)
    .map((step) => {
      const length = lengthStart + step * lengthStep;
      const angle = angleStart + step * angleStep;
      return to.add(Vector.fromPolar({ length, angle }));
    })
    .map((p) => ({ ...p, w: 0 }))
    .reverse();

  /** random color */
  const color = sample(colors)!;

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
            /** delete paint */
            paints.delete(id);
        },
      })
      /** bulge width */
      .to(point, { w: lengthChange * bulge, ease: "linear", duration })
      /** un-bulge width */
      .to(point, { w: 0, ease: "linear", duration });

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
      smoothing: 0,
      streamline: 0,
      simulatePressure: false,
      // start: { cap: false },
      // end: { cap: false },
    }
  ) as Point[];

  /** convert stroke to svg path  */
  return getSvgPathFromStroke(stroke);
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
  const crinkleFilter = useId();

  const ref = useRef<SVGSVGElement>(null);

  /** tick counter */
  const [tick, , inc] = useCounter();

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
    /** generate new paint */
    generate(Vector.fromObject(start), Vector.fromObject(end));
  }, 20);

  /** svg dimensions */
  const [width, height] = useElementSize(ref);

  return (
    <svg
      ref={ref}
      viewBox={[0, 0, width, height].join(" ")}
      filter={`url(#${crinkleFilter})`}
      style={{ overflow: "visible" }}
    >
      <filter
        id={crinkleFilter}
        color-interpolation-filters="linearRGB"
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency={crinkleFreq}
          numOctaves="1"
          stitchTiles="stitch"
          seed={tick}
          result="turbulence"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="turbulence"
          scale={crinkleAmp}
          result="displacementMap"
        />
      </filter>

      <rect
        x={-crinkleAmp}
        y={-crinkleAmp}
        width={width + 2 * crinkleAmp}
        height={height + 2 * crinkleAmp}
        fill={background}
      />

      {Array.from(paints.values()).map(({ points, color }, index) => (
        <path key={index} d={draw(points)} fill={color} />
      ))}
    </svg>
  );
};

export default App;
