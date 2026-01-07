import {
  AbcAiService,
  AbcInput,
  AiError,
  AiSource,
  LearnedGrowthResponse,
  LearnedGrowthResult,
  normalizeLearnedGrowthResponse,
} from "@/models/aiService";
import { getSupabaseAccessToken, supabase, supabaseConfig } from "@/lib/supabase";
import { Platform } from "react-native";
import EventSource from "react-native-sse";

const SUPABASE_FUNCTION_NAME =
  process.env.EXPO_PUBLIC_SUPABASE_AI_FUNCTION ?? "learned-growth";
const SUPABASE_STREAM_FUNCTION =
  process.env.EXPO_PUBLIC_SUPABASE_AI_STREAM_FUNCTION ?? SUPABASE_FUNCTION_NAME;

const RAW_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  supabaseConfig.functionsUrl ??
  null;
const NORMALIZED_BASE_URL = RAW_BASE_URL?.replace(/\/+$/, "") ?? null;
const NORMALIZED_SUPABASE_BASE = supabaseConfig.functionsUrl?.replace(/\/+$/, "") ?? null;
const USING_SUPABASE =
  Boolean(NORMALIZED_SUPABASE_BASE && supabaseConfig.anonKey) &&
  NORMALIZED_BASE_URL === NORMALIZED_SUPABASE_BASE;
const BASE_URL = NORMALIZED_BASE_URL;
const JSON_PATH = USING_SUPABASE ? SUPABASE_FUNCTION_NAME : "ai/learned-growth";
const STREAM_PATH = USING_SUPABASE
  ? SUPABASE_STREAM_FUNCTION
  : "ai/learned-growth/stream";

const STREAMING_ENABLED = process.env.EXPO_PUBLIC_AI_STREAM !== "false";
const DEFAULT_STREAM_TIMEOUT = USING_SUPABASE ? 12000 : 4000;
const STREAM_TIMEOUT_MS = Number(
  process.env.EXPO_PUBLIC_AI_STREAM_TIMEOUT_MS ?? String(DEFAULT_STREAM_TIMEOUT)
);
const STREAM_EMULATE = process.env.EXPO_PUBLIC_AI_STREAM_EMULATE !== "false";
const STREAM_EMULATE_CHUNK_SIZE = Math.max(
  1,
  Number(process.env.EXPO_PUBLIC_AI_STREAM_EMULATE_CHUNK_SIZE ?? "120")
);
const STREAM_EMULATE_DELAY_MS = Math.max(
  0,
  Number(process.env.EXPO_PUBLIC_AI_STREAM_EMULATE_DELAY_MS ?? "15")
);
type RequestOpts = { signal?: AbortSignal; onChunk?: (partial: string) => void };
const AI_USAGE_RPC =
  process.env.EXPO_PUBLIC_SUPABASE_AI_USAGE_RPC ?? "use_ai_call";
const AI_USAGE_ENABLED = USING_SUPABASE && Boolean(AI_USAGE_RPC);
const COUPON_RPC =
  process.env.EXPO_PUBLIC_SUPABASE_COUPON_RPC ?? "redeem_coupon";

export class CloudAiService implements AbcAiService {
  mode: AiSource = "cloud";

  async ready(): Promise<boolean> {
    return !!BASE_URL;
  }

  async getLearnedOptimismSupport(
    input: AbcInput,
    opts?: RequestOpts
  ): Promise<LearnedGrowthResult> {
    if (!BASE_URL) {
      throw new AiError(
        "config",
        "AI endpoint is not configured. Set EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
    }

    const started = Date.now();
    let data: LearnedGrowthResponse | null = null;
    await this.guardAiUsage();

    if (STREAMING_ENABLED) {
      try {
        data = await this.tryStream(input, opts);
      } catch (err) {
        if (err instanceof AiError && err.code === "streaming-unsupported") {
          // fall through to JSON request
        } else {
          throw err;
        }
      }
    }

    if (!data) {
      data = await this.fetchJson(input, opts);
    }

    return {
      data: data,
      meta: { source: this.mode, latencyMs: Date.now() - started },
    };
  }

  private async tryStream(
    input: AbcInput,
    opts?: RequestOpts
  ): Promise<LearnedGrowthResponse | null> {
    if (!BASE_URL) return null;

    // On native (non-web) with Supabase, use EventSource because fetch streams are not exposed.
    if (USING_SUPABASE && Platform.OS !== "web") {
      try {
        return await this.tryStreamWithEventSource(input, opts);
      } catch (err) {
        if (err instanceof AiError && err.code === "streaming-unsupported") {
          return null;
        }
        throw err;
      }
    }

    const canAbort = typeof AbortController !== "undefined";
    const controller = canAbort ? new AbortController() : null;
    if (controller && opts?.signal) {
      if (opts.signal.aborted) {
        controller.abort(opts.signal.reason);
      } else {
        opts.signal.addEventListener(
          "abort",
          () => controller.abort(opts.signal?.reason),
          { once: true }
        );
      }
    }

    const timeout =
      controller && STREAM_TIMEOUT_MS > 0
        ? setTimeout(() => controller.abort("stream-timeout"), STREAM_TIMEOUT_MS)
        : null;

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/${STREAM_PATH}`, {
        method: "POST",
        headers: await this.buildHeaders({ acceptStream: true }),
        body: JSON.stringify(input),
        signal: controller?.signal ?? opts?.signal,
      });
    } catch (err: any) {
      if (timeout) clearTimeout(timeout as any);
      if (err?.name === "AbortError") return null;
      return null;
    }

    if (timeout) clearTimeout(timeout as any);

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const text = await res.text();
      const detail = text ? ` - ${text.slice(0, 140)}` : "";
      throw new AiError("http", `Cloud AI error: ${res.status}${detail}`, res.status);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      try {
        return await this.readEventStream(res, opts);
      } catch (err) {
        if (err instanceof AiError && err.code === "streaming-unsupported") {
          return null;
        }
        throw err;
      }
    }

    const json = await res.json();
    const normalized = normalizeLearnedGrowthResponse(json);
    await this.emitFakeStream(JSON.stringify(normalized), opts);
    return normalized;
  }

  private async guardAiUsage() {
    if (!AI_USAGE_ENABLED || !supabase) return;
    try {
      const { error } = await supabase.rpc(AI_USAGE_RPC);
      if (error) {
        const fingerprint = `${error.code ?? ""}:${error.message ?? ""}`.toLowerCase();
        if (fingerprint.includes("ai-limit-exceeded")) {
          throw new AiError(
            "ai-limit",
            "AI limit reached for the current cycle.",
            429
          );
        }
        if (error.code === "PGRST301" || error.code === "401") {
          throw new AiError("auth", "Sign in to use AI.");
        }
        console.warn("AI usage RPC error", error);
      }
    } catch (err: any) {
      if (err instanceof AiError) throw err;
      console.warn("AI usage check failed", err);
    }
  }

  private async readEventStream(
    res: Response,
    opts?: RequestOpts
  ): Promise<LearnedGrowthResponse> {
    if (typeof TextDecoder === "undefined") {
      throw new AiError("streaming-unsupported", "TextDecoder is not available in this environment");
    }

    if (!res.body || typeof res.body.getReader !== "function") {
      throw new AiError("streaming-unsupported", "Response body is not streamable");
    }

    const safeParseJson = (input: string) => {
      try {
        return JSON.parse(input);
      } catch {
        return null;
      }
    };

    const isOpenAiChunk = (obj: any) =>
      obj &&
      obj.object === "chat.completion.chunk" &&
      Array.isArray(obj.choices) &&
      obj.choices.length > 0 &&
      "delta" in obj.choices[0];

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assembled = "";
    let tokenContent = "";
    let doneStreaming = false;
    let sawOpenAiChunks = false;

    while (!doneStreaming) {
      const { value, done } = await reader.read();
      const text = decoder.decode(value, { stream: !done });
      buffer += text;

      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);

        const line = rawEvent.trim();
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          doneStreaming = true;
          break;
        }

        const parsed = safeParseJson(data);
        if (parsed && isOpenAiChunk(parsed)) {
          sawOpenAiChunks = true;
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            tokenContent += content;
            opts?.onChunk?.(tokenContent);
          }
          // If finish_reason is present we still wait for [DONE] to close out.
        } else {
          assembled += data;
          opts?.onChunk?.(assembled);
        }
      }

      if (done) {
        break;
      }
    }

    const remainder = decoder.decode();
    if (remainder) {
      assembled += remainder;
      opts?.onChunk?.(assembled);
    }

    const finalText = (sawOpenAiChunks ? tokenContent : assembled).trim();
    if (!finalText) {
      throw new AiError("invalid-response", "Stream ended without any data");
    }

    try {
      const parsed = JSON.parse(finalText);
      const normalized = normalizeLearnedGrowthResponse(parsed);
      opts?.onChunk?.(finalText);
      return normalized;
    } catch (err) {
      throw new AiError(
        "invalid-response",
        err instanceof Error ? err.message : "Unable to parse stream response"
      );
    }
  }

  private async fetchJson(
    input: AbcInput,
    opts?: RequestOpts
  ): Promise<LearnedGrowthResponse> {
    if (!BASE_URL) {
      throw new AiError(
        "config",
        "AI endpoint is not configured. Set EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
    }

    const res = await fetch(`${BASE_URL}/${JSON_PATH}`, {
      method: "POST",
      headers: await this.buildHeaders(),
      body: JSON.stringify(input),
      signal: opts?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      const detail = text ? ` - ${text.slice(0, 140)}` : "";
      throw new AiError("http", `Cloud AI error: ${res.status}${detail}`, res.status);
    }

    const json = await res.json();
    const normalized = normalizeLearnedGrowthResponse(json);
    await this.emitFakeStream(JSON.stringify(normalized), opts);
    return normalized;
  }

  private async tryStreamWithEventSource(
    input: AbcInput,
    opts?: RequestOpts
  ): Promise<LearnedGrowthResponse | null> {
    if (!BASE_URL) return null;

    const url = `${BASE_URL}/${STREAM_PATH}`;
    const headers = await this.buildHeaders({ acceptStream: true });

    return new Promise((resolve, reject) => {
      let tokenContent = "";
      let assembled = "";
      let sawOpenAiChunks = false;
      const es = new EventSource(url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        withCredentials: false,
      });

      const cleanAbort = () => {
        es.close();
      };

      const abortListener = () => {
        cleanAbort();
        reject(new DOMException("aborted", "AbortError"));
      };

      if (opts?.signal) {
        if (opts.signal.aborted) {
          abortListener();
          return;
        }
        opts.signal.addEventListener("abort", abortListener, { once: true });
      }

      es.addEventListener("message", (event) => {
        const raw = String((event as any).data ?? "").trim();
        if (!raw) return;
        if (raw === "[DONE]") {
          const finalText = (sawOpenAiChunks ? tokenContent : assembled).trim();
          cleanAbort();
          if (!finalText) {
            reject(new AiError("invalid-response", "Stream ended without any data"));
            return;
          }
          try {
            const parsed = JSON.parse(finalText);
            const normalized = normalizeLearnedGrowthResponse(parsed);
            resolve(normalized);
          } catch (err) {
            reject(
              new AiError(
                "invalid-response",
                err instanceof Error ? err.message : "Unable to parse stream response"
              )
            );
          }
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          const isChunk =
            parsed &&
            parsed.object === "chat.completion.chunk" &&
            Array.isArray(parsed.choices) &&
            parsed.choices.length > 0 &&
            "delta" in parsed.choices[0];

          if (isChunk) {
            sawOpenAiChunks = true;
            const content = parsed.choices?.[0]?.delta?.content ?? "";
            if (content) {
              tokenContent += content;
              opts?.onChunk?.(tokenContent);
            }
            return;
          }
        } catch (_err) {
          // fall through to assembled buffer
        }

        assembled += raw;
        opts?.onChunk?.(assembled);
      });

      es.addEventListener("error", (event) => {
        cleanAbort();
        reject(
          new AiError(
            "http",
            (event as any)?.message ?? "Streaming connection failed"
          )
        );
      });
    });
  }

  private async buildHeaders(opts?: { acceptStream?: boolean }) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (opts?.acceptStream) {
      headers.Accept = "text/event-stream";
    }

    if (USING_SUPABASE && supabaseConfig.anonKey) {
      const token = (await getSupabaseAccessToken()) ?? supabaseConfig.anonKey;
      headers.apikey = supabaseConfig.anonKey;
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async emitFakeStream(text: string, opts?: RequestOpts) {
    if (!opts?.onChunk) return;

    // If real streaming is working or emulation is disabled, just emit once.
    if (!STREAMING_ENABLED || !STREAM_EMULATE) {
      opts.onChunk(text);
      return;
    }

    const total = text.length;
    if (STREAM_EMULATE_CHUNK_SIZE >= total) {
      opts.onChunk(text);
      return;
    }

    for (let i = STREAM_EMULATE_CHUNK_SIZE; i < total; i += STREAM_EMULATE_CHUNK_SIZE) {
      opts.onChunk(text.slice(0, i));
      if (STREAM_EMULATE_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, STREAM_EMULATE_DELAY_MS));
      }
    }

    opts.onChunk(text);
  }
}
