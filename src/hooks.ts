import { useRef } from "react";

/** use previous N values */
export const useHistory = <T>(value: T, limit: number) => {
  const ref = useRef<T[]>([]);
  ref.current.push(value);
  if (ref.current.length > limit) ref.current.shift();
  return ref;
};
