export const noop = () => {};

// comparator for use in Array.sort(numSorter)
export const numCompare = (a, b) => a - b; 

// check if code executes in the browser or on a server
export const isBrowser = () => {
  return (typeof window !== 'undefined');
};
