const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string);

/** Plain text in, minimal HTML fragment out (line breaks kept, text escaped). Also used as the HubSpot template body. */
export const textToHtml = (text: string): string =>
  `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${escapeHtml(text).replace(/\r?\n/g, '<br>')}</div>`;

/** The HTML alternative of an SMTP message: a complete document around the fragment, so clients render it consistently. */
export const textToHtmlDocument = (text: string, subject: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:16px;background:#ffffff;color:#1a1a1a">${textToHtml(text)}</body></html>`;

/** Domain part of an address, used to mint a Message-ID that belongs to the sending domain. */
export const domainOf = (address: string): string => address.slice(address.lastIndexOf('@') + 1).toLowerCase();
