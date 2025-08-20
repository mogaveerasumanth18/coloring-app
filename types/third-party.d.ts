declare module 'upng-js' {
  export function decode(
    buf: ArrayBuffer | Uint8Array
  ): { width: number; height: number; depth: number; frames: number } & any;
  export function toRGBA8(png: any): Uint8Array[];
  const _default: { decode: typeof decode; toRGBA8: typeof toRGBA8 };
  export default _default;
}

declare module 'base-64' {
  export function decode(input: string): string;
  export function encode(input: string): string;
}
