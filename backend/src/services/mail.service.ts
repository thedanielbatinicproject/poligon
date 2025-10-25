import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendPasswordEmail(toEmail: string, password: string) {
  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: toEmail,
    subject: 'Your Poligon Account Password',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafc; padding: 32px; border-radius: 12px; max-width: 480px; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
        <h2 style="color: #319795; margin-bottom: 16px;">Welcome to the <span style='color:#2b6cb0'>Poligon</span> app!</h2>
        <p style="font-size: 1.1em; color: #2d3748;">Your account has been successfully created, and a secure password has been generated for you:</p>
        <div style="background: #e6fffa; color: #234e52; font-size: 1.3em; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center; letter-spacing: 1px; font-weight: bold;">
          ${password}
        </div>
        <p style="color: #2d3748;">Please keep this password confidential. You can update it at any time in your profile settings.</p>
        <p style="color: #718096; font-size: 0.95em; margin-top: 32px;">If you did not create this account or believe this email was sent in error, please disregard it or contact system admin.<p>
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #cbd5e0;">
        <div style="text-align: center; color: #4a5568; font-size: 0.95em;">Best regards,<br><span style="color:#319795;font-weight:bold;">The Poligon Team</span></div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}