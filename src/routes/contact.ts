import type { FastifyInstance } from "fastify";
import { contactSchema } from "../schemas/contact.schema";
import { sendContactEmail } from "../services/mail.service";

export async function contactRoute(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/contact",
    {
      config: {
        // Applies the stricter rate limit defined for this route only.
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const parseResult = contactSchema.safeParse(request.body);

      if (!parseResult.success) {
        request.log.warn(
          { issues: parseResult.error.flatten().fieldErrors },
          "Contact form validation failed"
        );
        return reply.status(400).send({
          success: false,
          message: "Invalid request data",
        });
      }

      try {
        await sendContactEmail(parseResult.data);
        return reply.status(200).send({ success: true });
      } catch (error) {
        // Never leak SMTP details or stack traces to the client.
        request.log.error({ err: error }, "Failed to send contact email");
        return reply.status(500).send({
          success: false,
          message: "Failed to send message",
        });
      }
    }
  );
}
