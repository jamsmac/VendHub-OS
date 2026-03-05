// Type declaration for optional socket.io-client dependency
// The actual package may not be installed — the code handles this gracefully via dynamic import
declare module "socket.io-client" {
  export function io(url: string, opts?: Record<string, unknown>): unknown;
  export default function io(
    url: string,
    opts?: Record<string, unknown>,
  ): unknown;
}
