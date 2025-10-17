declare module 'expo-screen-orientation' {
  export enum OrientationLock {
    DEFAULT = 0,
    ALL = 1,
    PORTRAIT = 2,
    PORTRAIT_UP = 3,
    PORTRAIT_DOWN = 4,
    LANDSCAPE = 5,
    LANDSCAPE_LEFT = 6,
    LANDSCAPE_RIGHT = 7,
  }

  export function lockAsync(orientationLock: OrientationLock): Promise<void>;
  export function unlockAsync(): Promise<void>;
  export function getOrientationAsync(): Promise<number>;
  export function getOrientationLockAsync(): Promise<OrientationLock>;
  export function getPlatformOrientationLockAsync(): Promise<number>;
  export function supportsOrientationLockAsync(orientationLock: OrientationLock): Promise<boolean>;
}
