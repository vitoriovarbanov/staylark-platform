export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Reverse of {@link escapeHtml}. Used to recover a plain, clickable URL from an
 * already-escaped `href` (e.g. the dev email log): an escaped link contains
 * `&amp;` between query params, which pastes into a browser as a literal
 * `&amp;` and mangles the param that follows. `&amp;` is unescaped last so a
 * doubly-escaped entity like `&amp;lt;` round-trips back to `&lt;`.
 */
export function unescapeHtml(s: string): string {
    return s
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
}

/** A single body paragraph. Caller is responsible for escaping interpolated values. */
export function p(innerHtml: string): string {
    return `<p style="margin:0 0 12px;">${innerHtml}</p>`;
}

type EmailButton = { label: string; url: string };

export function renderEmail(opts: {
    heading: string;
    bodyHtml: string;
    button?: EmailButton;
    preheader?: string;
}): string {
    const { heading, bodyHtml, button, preheader } = opts;
    const buttonHtml = button
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
             <tr><td style="border-radius:8px;background:#4870E5;">
               <a href="${escapeHtml(button.url)}"
                  style="display:inline-block;padding:12px 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                 ${escapeHtml(button.label)}
               </a>
             </td></tr>
           </table>`
        : '';

    return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F8F9FC;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;font-family:Helvetica,Arial,sans-serif;">
        <tr><td style="background:#1A2744;border-radius:12px 12px 0 0;padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Staylark<span style="color:#80A4FF;">IQ</span></span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border:1px solid #F1F3F8;border-top:none;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1E2A3A;">${escapeHtml(heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#1E2A3A;">${bodyHtml}</div>
          ${buttonHtml}
        </td></tr>
        <tr><td style="background:#ffffff;padding:0 32px 28px;border:1px solid #F1F3F8;border-top:none;border-radius:0 0 12px 12px;">
          <hr style="border:none;border-top:1px solid #F1F3F8;margin:0 0 16px;">
          <p style="margin:0;font-size:13px;color:#64748B;">— The Staylark team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
