export function createCounter() {
  let { count } = $state({ count: 0 });

  let doubled = count * 2;

  function increment() {
    count += 1;
  }

  return { count, doubled, increment };
}
