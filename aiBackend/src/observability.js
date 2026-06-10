// Observability switch (Langfuse SDK v5 — OpenTelemetry based).
//
//   APP_ENV=development -> trace to local self-hosted Langfuse (Docker)
//   APP_ENV=production  -> trace to LangSmith (cloud, via LANGSMITH_* env vars)
//
// In v5 the Langfuse LangChain CallbackHandler emits OpenTelemetry spans; a
// LangfuseSpanProcessor (registered on an OTel NodeSDK) is what actually ships
// those spans to Langfuse. So in dev we:
//   1. start an OTel SDK with a LangfuseSpanProcessor (credentials passed in),
//   2. hand back a CallbackHandler to attach to invoke() calls,
//   3. turn LangSmith OFF so dev traces don't also hit the cloud.
// In prod we skip all that and let LangSmith trace from its env vars.

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { CallbackHandler } from "@langfuse/langchain";

const APP_ENV = process.env.APP_ENV || "development";
const isDev = APP_ENV === "development";

let langfuseHandler = null;
let langfuseProcessor = null;

if (isDev) {
  // Don't let LangSmith ALSO send traces to the cloud in dev.
  process.env.LANGSMITH_TRACING = "false";
  process.env.LANGCHAIN_TRACING_V2 = "false";

  // The processor ships OTel spans to the local Langfuse instance.
  langfuseProcessor = new LangfuseSpanProcessor({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL || "http://localhost:3000",
    // Default batching — spans are flushed in batches and on forceFlush().
    // (An aggressive flushAt:1 overruns the exporter's concurrency limit when
    // many spans fire at once.)
  });

  // Register ONLY the Langfuse processor on a tracer provider. (Using NodeSDK
  // here would also wire up a default OTLP exporter pointed at localhost:4318,
  // where nothing listens — causing export timeouts. This avoids that.)
  const provider = new NodeTracerProvider({
    spanProcessors: [langfuseProcessor],
  });
  provider.register();

  // The LangChain callback that produces the spans.
  langfuseHandler = new CallbackHandler();
}

/**
 * Callbacks to pass into a graph/agent invoke().
 *  - dev:  [langfuseHandler]
 *  - prod: [] (LangSmith traces automatically from env vars)
 */
export function getCallbacks() {
  return isDev && langfuseHandler ? [langfuseHandler] : [];
}

/** Which backend is active — for a friendly startup log. */
export function tracingTarget() {
  return isDev ? "Langfuse (local)" : "LangSmith (cloud)";
}

/**
 * Flush pending Langfuse spans. Spans are batched and sent asynchronously, so a
 * short-lived script (the CLI demo) must await this before exiting or traces
 * may be lost. The long-running server doesn't strictly need it.
 */
export async function flushTracing() {
  if (langfuseProcessor?.forceFlush) {
    await langfuseProcessor.forceFlush();
  }
}
