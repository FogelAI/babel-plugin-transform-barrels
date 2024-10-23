import { returnObject } from './returnObject';
import async_hooks from "node:async_hooks";

export function FirstReexported() {
  console.log("first");
}
export function SecondReexported() {
  console.log("second");
}
export function ThirdReexported() {
  console.log("third");
}

export const {
  firstKey: firstKeyVar,
  secondKey: secondKeyVar,
} = returnObject();