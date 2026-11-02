import { config } from '../config/env.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends a transactional email using Brevo (Sendinblue) REST API.
 * Automatically handles offline/unauthorized IP states gracefully.
 */
export async function sendEmail({ to, subject, htmlContent, textContent }) {
  const apiKey = config.brevoApiKey;
  const senderEmail = config.brevoSenderEmail || 'notifications@smarttripplanner.com';
  const senderName = config.brevoSenderName || 'Smart Trip Planner';

  if (!apiKey || config.isTest) {
    console.warn('[EmailService] Email delivery is simulated because Brevo is not configured.');
    return { sent: true, simulated: true };
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to.email, name: to.name || to.email }],
        subject,
        htmlContent,
        textContent: textContent || subject,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn(`[EmailService] Brevo API warning (${res.status}):`, data.message || data);
      return { sent: false, error: data.message || 'Brevo API error', simulated: true };
    }

    return { sent: true, messageId: data.messageId };
  } catch (err) {
    console.warn('[EmailService] Network or Brevo request failed:', err.message);
    return { sent: false, error: err.message, simulated: true };
  }
}

/**
 * Sends a 6-digit login or verification OTP to the user.
 */
export async function sendOtpEmail(email, otp, userName = 'Traveler') {
  const subject = `Your Verification Code: ${otp} - Smart Trip Planner`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your Verification Code</title>
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
        <!-- Brand Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #0e5e5a 0%, #15803d 100%); padding: 28px 24px; text-align: center;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 50%; width: 44px; height: 44px; line-height: 44px; font-size: 22px; margin-bottom: 8px;">
              🧭
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
              Smart Trip Planner
            </h1>
            <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">
              Intelligent Itinerary &amp; Budget Platform
            </p>
          </td>
        </tr>

        <!-- Main Body -->
        <tr>
          <td style="padding: 32px 28px;">
            <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">
              Hello ${userName} 👋
            </p>
            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
              Use the single-use 6-digit code below to log in to your <strong>Smart Trip Planner</strong> account:
            </p>

            <!-- OTP Box -->
            <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 10px; padding: 20px 16px; text-align: center; margin: 24px 0;">
              <span style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #15803d; display: inline-block; margin-left: 12px;">
                ${otp}
              </span>
              <div style="margin-top: 10px; font-size: 12px; font-weight: 600; color: #166534;">
                ⏱️ Valid for 10 minutes &bull; One-time use
              </div>
            </div>

            <!-- Security Tip -->
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 16px; margin: 24px 0 16px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400e;">
                <strong>Security note:</strong> Never share this verification code with anyone. Our team will never ask for your code.
              </p>
            </div>

            <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
              If you didn't request this login code, you can safely ignore this email. No changes have been made to your account.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #64748b;">
              Smart Trip Planner
            </p>
            <p style="margin: 0;">
              Deterministic Travel Engine &bull; Handcrafted for Adventurers
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: { email, name: userName },
    subject,
    htmlContent,
    textContent: `Your Smart Trip Planner verification code is: ${otp}. It expires in 10 minutes.`,
  });
}

/**
 * Sends a 6-digit password reset OTP to the user via Brevo.
 */
export async function sendPasswordResetOtpEmail(email, otp, userName = 'Traveler') {
  const subject = `Reset Your Password: ${otp} - Smart Trip Planner`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
        <!-- Brand Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #0e5e5a 0%, #15803d 100%); padding: 28px 24px; text-align: center;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 50%; width: 44px; height: 44px; line-height: 44px; font-size: 22px; margin-bottom: 8px;">
              🔑
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
              Smart Trip Planner
            </h1>
            <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">
              Account Password Recovery
            </p>
          </td>
        </tr>

        <!-- Main Body -->
        <tr>
          <td style="padding: 32px 28px;">
            <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">
              Hello ${userName} 👋
            </p>
            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
              We received a request to reset your password. Use the single-use 6-digit verification code below to set your new password:
            </p>

            <!-- OTP Box -->
            <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 10px; padding: 20px 16px; text-align: center; margin: 24px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #15803d; display: inline-block; margin-left: 12px;">
                ${otp}
              </span>
              <div style="margin-top: 10px; font-size: 12px; font-weight: 600; color: #166534;">
                ⏱️ Valid for 10 minutes &bull; One-time use
              </div>
            </div>

            <!-- Security Tip -->
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 16px; margin: 24px 0 16px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400e;">
                <strong>Security Alert:</strong> If you did not request a password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </div>

            <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
              Never share this verification code with anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #64748b;">
              Smart Trip Planner
            </p>
            <p style="margin: 0;">
              Deterministic Travel Engine &bull; Handcrafted for Adventurers
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: { email, name: userName },
    subject,
    htmlContent,
    textContent: `Your Smart Trip Planner password reset code is: ${otp}. It expires in 10 minutes.`,
  });
}

/**
 * Emails a complete trip plan and itinerary breakdown directly to a traveler.
 */
export async function sendTripPlanEmail(email, trip, userName = 'Traveler') {
  const destName = trip.destination?.name || 'Your Destination';
  const subject = `Your Trip Plan for ${destName} - Smart Trip Planner`;

  const daysHtml = (trip.itinerary || [])
    .map(
      (day) => `
      <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #ffffff;">
        <h4 style="margin: 0 0 8px; color: #0f172a; font-size: 14px;">Day ${day.day} (${new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
          ${(day.items || []).map((item) => `<li style="margin-bottom: 4px;"><strong>${item.startTime} - ${item.endTime}:</strong> ${item.name} (${item.type})</li>`).join('')}
        </ul>
      </div>
    `,
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #0284c7; padding: 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">${trip.title}</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">${destName}, ${trip.destination?.state || ''} &bull; ${trip.startDate} to ${trip.endDate}</p>
        </div>
        <div style="padding: 24px;">
          <h3 style="margin-top: 0; color: #0f172a;">Trip Overview</h3>
          <p style="font-size: 14px; color: #475569;">
            <strong>Travelers:</strong> ${trip.travelers} | <strong>Mode:</strong> ${trip.tripMode || 'Standard'} | <strong>Estimated Budget:</strong> ₹${(trip.budget?.total || 0).toLocaleString('en-IN')}
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <h3 style="color: #0f172a;">Itinerary Schedule</h3>
          ${daysHtml || '<p style="font-size: 13px; color: #64748b;">No scheduled activities.</p>'}
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Have a fantastic journey! Powered by Smart Trip Planner.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: { email, name: userName },
    subject,
    htmlContent,
    textContent: `Here is your trip plan for ${trip.title} (${destName}). Total estimated budget: ₹${trip.budget?.total || 0}.`,
  });
}
