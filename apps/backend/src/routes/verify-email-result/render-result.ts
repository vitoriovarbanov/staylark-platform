import { env } from '../../config/env.js';
import { escapeHtml } from '../../services/email/layout.js';

/**
 * Renders the email-verification outcome as a complete, self-contained HTML page.
 *
 * Critically contains NO `<script>` and no external JS: webmail clients open the
 * verification link inside a sandboxed iframe without `allow-scripts`, so anything
 * needing client-side JS (the SPA) renders blank. Better Auth encodes the outcome only
 * in the `?error=` query param, which a static file can't branch on without JS — so this
 * runs server-side, where the outcome is known, and ships finished HTML.
 *
 * Error codes come from Better Auth's verify-email `redirectOnError`
 * (TOKEN_EXPIRED, INVALID_TOKEN, USER_NOT_FOUND, INVALID_USER); unknown codes fall
 * through to the generic invalid page rather than ever showing a false "verified".
 */
export function renderResult(errorCode?: string): string {
    const view = errorCode ? (errorCode === 'TOKEN_EXPIRED' ? EXPIRED : INVALID) : SUCCESS;
    // Deliberately NO link/button to the app. Webmail opens this page in a sandboxed
    // frame, and anything clicked from it (link or button, even target=_blank) inherits
    // that sandbox — so the SPA it opens can't run its JS and dead-ends on a blank page.
    // Showing the URL as plain, non-clickable text is the one path that never traps: the
    // user opens it in their own browser tab. Verification itself is already complete.
    const signInHost = escapeHtml(`${env.FRONTEND_URL}/sign-in`.replace(/^https?:\/\//, ''));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(view.title)} — Staylark</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;">
        <tr><td style="background:#1A2744;border-radius:12px 12px 0 0;padding:20px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Staylark<span style="color:#80A4FF;">IQ</span></span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:36px 32px;border:1px solid #F1F3F8;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <div style="font-size:40px;line-height:1;margin:0 0 16px;">${view.icon}</div>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1E2A3A;">${escapeHtml(view.title)}</h1>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#64748B;">${escapeHtml(view.body)}</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#64748B;">
            ${escapeHtml(view.action)} <span style="color:#4870E5;font-weight:600;">${signInHost}</span> in your browser. You can close this tab.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const SUCCESS = {
    icon: '✅',
    title: 'Email verified',
    body: "Your email is confirmed — you're all set. Sign in to start using Staylark.",
    action: 'Go to'
};

const EXPIRED = {
    icon: '⏳',
    title: 'Link expired',
    body: 'This verification link has expired. You can request a new one from the sign-in page.',
    action: 'Go to'
};

const INVALID = {
    icon: '⚠️',
    title: 'Invalid link',
    body: 'This verification link is invalid or has already been used.',
    action: 'Go to'
};
