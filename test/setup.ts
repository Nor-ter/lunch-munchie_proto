// Node 20 has fetch but no native WebSocket. Supabase initialises its Realtime
// client during module import even when a unit test never opens a connection.
// This inert implementation keeps those deterministic unit tests independent
// from the developer's Node minor version; browser and live E2E still use real
// WebSockets.
if (typeof globalThis.WebSocket === 'undefined') {
  class TestWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly readyState = TestWebSocket.CLOSED;
    constructor(_url: string | URL) {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
    send() {}
  }
  globalThis.WebSocket = TestWebSocket as unknown as typeof WebSocket;
}
