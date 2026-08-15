export {};

declare global {
  interface Window {
    triggerCloudTransition?: (callback: () => void) => void;
  }
}
