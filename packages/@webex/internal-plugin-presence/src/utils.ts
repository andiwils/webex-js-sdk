/**
 * Ensure the given argument is an array. If it's not, wrap it in an array.
 *
 * @param {T | T[]} input - The argument to ensure is an array.
 * @returns {T[]} - The argument as an array.
 */
export function ensureArray<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [input];
}

/**
 * Splits an array into batches of specified size
 *
 * @param {Array} arr - The array to be batched
 * @param {number} batchLimit - The maximum size of each batch
 * @returns {Array} - The batched array
 */
export function batchArray(arr, batchLimit) {
  return Array.from({length: Math.ceil(arr.length / batchLimit)}, (_, i) =>
    arr.slice(i * batchLimit, i * batchLimit + batchLimit)
  );
}
