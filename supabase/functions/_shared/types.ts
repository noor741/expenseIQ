// Type definitions for Supabase Edge Functions

interface Request {
  method: string;
  url: string;
  headers: Headers;
  json(): Promise<any>;
}

interface Response {
  constructor(body?: string | null, init?: ResponseInit);
}

interface Headers {
  get(name: string): string | null;
}

interface ResponseInit {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}

declare global {
  namespace Deno {
    function serve(handler: (request: Request) => Promise<Response> | Response): void;
    namespace env {
      function get(key: string): string | undefined;
    }
  }
}

export { };

