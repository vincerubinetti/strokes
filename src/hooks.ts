import { useMouse } from "@reactuses/core";
import { useRef, type RefObject } from "react";

/** get mouse position in svg coordinates */
export const useSvgMouse = (ref: RefObject<SVGSVGElement | null>) => {
  const mouse = useMouse(ref);
  if (!ref.current) return;
  if (Number.isNaN(mouse.clientX) || Number.isNaN(mouse.clientY)) return;
  const point = ref.current.createSVGPoint();
  point.x = mouse.clientX;
  point.y = mouse.clientY;
  return point.matrixTransform(ref.current.getScreenCTM()?.inverse());
};

/** use previous N values */
export const useHistory = <T>(value: T, limit: number) => {
  const ref = useRef<T[]>([]);
  ref.current.push(value);
  if (ref.current.length > limit) ref.current.shift();
  return ref;
};
