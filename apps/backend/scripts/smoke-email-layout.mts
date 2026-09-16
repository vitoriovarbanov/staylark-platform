import { renderEmail, escapeHtml, p } from '../src/services/email/layout.js';

const TAG = '[smoke-email-layout]';
let failures = 0;
function check(label: string, cond: boolean) {
    if (cond) console.log(`${TAG} ✓ ${label}`);
    else { console.error(`${TAG} ✗ ${label}`); failures++; }
}

// escapeHtml
check('escapes angle brackets + quotes', escapeHtml(`<script>"'&`) === '&lt;script&gt;&quot;&#39;&amp;');

// p
check('p wraps in a styled paragraph', p('hi').startsWith('<p style="margin:0 0 12px;">') && p('hi').includes('hi'));

// renderEmail
const html = renderEmail({
    heading: 'A ticket was assigned to you',
    bodyHtml: p('Hello there'),
    button: { label: 'View ticket', url: 'https://app.test/admin/tickets?ticket=abc' },
    preheader: 'NOISE · Bansko'
});
check('contains the heading', html.includes('A ticket was assigned to you'));
check('contains the CTA url', html.includes('https://app.test/admin/tickets?ticket=abc'));
check('contains the wordmark', html.includes('Staylark'));
check('contains the preheader', html.includes('NOISE · Bansko'));
check('is a full html doc', html.trim().startsWith('<!DOCTYPE html>'));

// XSS: a script-laced heading must be escaped, not raw
const evil = renderEmail({ heading: '<script>alert(1)</script>', bodyHtml: p('x') });
check('escapes a script-laced heading', !evil.includes('<script>alert(1)</script>') && evil.includes('&lt;script&gt;'));

if (failures) { console.error(`${TAG} FAIL — ${failures} assertion(s)`); process.exit(1); }
console.log(`${TAG} PASS`);
