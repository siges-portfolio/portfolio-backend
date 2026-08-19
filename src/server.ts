import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config";
import { contactRoute } from "./routes/contact";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: "info",
      // Redact anything that could accidentally end up in logs.
      redact: ["req.headers.authorization"],
    },
    // Protects against overly large request bodies.
    bodyLimit: 100 * 1024, // 100 KB is more than enough for a contact form
  });

  // Security headers (CSP, X-Frame-Options, etc.)
  await app.register(helmet);

  // Only allow the configured frontend origin to call this API.
  await app.register(cors, {
    origin: config.frontendUrl,
    methods: ["POST"],
  });

  // Global baseline rate limit; the /api/contact route overrides this
  // with a stricter 5-requests-per-15-minutes limit (see routes/contact.ts).
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes",
  });

  await app.register(contactRoute);

  app.get("/health", async () => ({ status: "ok" }));

  // Centralized error handler. Ensures no stack traces or internal
  // details ever reach the client, and every unexpected error is logged.
  app.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    request.log.error({ err: error }, "Unhandled error");

    return reply.status(500).send({
      success: false,
      message: "Failed to send message",
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ success: false, message: "Not found" });
  });

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
