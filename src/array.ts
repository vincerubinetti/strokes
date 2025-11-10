const nullish = <Item>(item: Item): item is NonNullable<Item> =>
  item === null || item === undefined;

/** find first defined item before index */
export const findBefore = <Item>(array: Item[], startIndex: number) => {
  for (let index = startIndex - 1; index >= 0; index--) {
    const item = array[index];
    if (!nullish(item)) return { item: item as NonNullable<Item>, index };
  }
};

/** find first defined item after index */
export const findAfter = <Item>(array: Item[], startIndex: number) => {
  for (let index = startIndex + 1; index < array.length; index++) {
    const item = array[index];
    if (!nullish(item)) return { item: item as NonNullable<Item>, index };
  }
};
