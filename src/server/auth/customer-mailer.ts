import "server-only";

import { readAdminDeliveryConfig } from "@/lib/admin-env";
import nodemailer from "nodemailer";
import path from "node:path";

function emailHtml(code: string) {
  const digits = code.split("").map((digit) => `<td style="width:52px;height:56px;border-radius:12px;background:#f4f7f5;border:1px solid #d7e5db;font-size:28px;font-weight:700;color:#0c3d1e;text-align:center;">${digit}</td>`).join("");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td align="center" style="background:#157037;padding:28px 24px 22px;">
                <img src="cid:mafateeh-logo" alt="Mafateeh" width="168" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:#dfb026;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 28px 12px;font-family:Arial,Helvetica,sans-serif;color:#0c3d1e;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;">Your sign-in code</h1>
                <p style="margin:8px 0 0;font-size:16px;line-height:1.6;color:#3d4d44;">رمز الدخول إلى مفاتيح</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="8" align="center">
                  <tr>${digits}</tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 32px;font-family:Arial,Helvetica,sans-serif;color:#5d6b62;font-size:14px;line-height:1.7;">
                <p style="margin:0;">This code expires in 5 minutes and can be used once.</p>
                <p style="margin:4px 0 0;">تنتهي صلاحية الرمز خلال 5 دقائق ويمكن استخدامه مرة واحدة.</p>
                <p style="margin:16px 0 0;">If you did not request this code, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendCustomerOtpEmail(to: string, code: string) {
  const config = readAdminDeliveryConfig();
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
    subject: "Mafateeh sign-in code",
    text: [
      "Your Mafateeh sign-in code is:",
      code,
      "",
      "رمز الدخول إلى مفاتيح هو الرمز أعلاه.",
      "",
      "The code expires in 5 minutes and can be used once.",
      "If you did not request it, you can ignore this email.",
    ].join("\n"),
    html: emailHtml(code),
    attachments: [
      {
        filename: "logo-white.png",
        path: path.join(process.cwd(), "public", "images", "logo-white.png"),
        cid: "mafateeh-logo",
      },
    ],
  });
}
