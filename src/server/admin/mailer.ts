import "server-only";

import nodemailer from "nodemailer";
import type { AdminDeliveryConfig } from "@/lib/admin-env";

export async function sendAdminOtpEmail(config: AdminDeliveryConfig, to: string, code: string) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  await transport.sendMail({
    from: config.from,
    to,
    subject: "Mafateeh admin sign-in code",
    text: [
      "Your Mafateeh administrator sign-in code is:",
      "",
      code,
      "",
      "The code expires in 5 minutes and can be used once.",
      "If you did not request it, you can ignore this email.",
    ].join("\n"),
  });
}
