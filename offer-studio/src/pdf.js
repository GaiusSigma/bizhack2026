// PDF przez Gotenberg (Chromium jako usługa): Gotenberg otwiera podpisany adres /render/<oferta>
// na wewnętrznej sieci Dockera i drukuje go do PDF w rozmiarze slajdu 1920x1080 px (20 x 11.25 in).
import { HttpError } from './db.js';

export async function htmlUrlToPdf({ gotenbergUrl, pageUrl, timeoutMs = 90_000 }) {
  if (!gotenbergUrl) throw new HttpError(503, 'Eksport PDF wymaga usługi Gotenberg (zmienna GOTENBERG_URL). Lokalnie użyj „Drukuj” w podglądzie.');
  const form = new FormData();
  form.append('url', pageUrl);
  form.append('paperWidth', '20');
  form.append('paperHeight', '11.25');
  for (const m of ['marginTop', 'marginBottom', 'marginLeft', 'marginRight']) form.append(m, '0');
  form.append('printBackground', 'true');
  form.append('preferCssPageSize', 'true');
  form.append('waitForExpression', 'window.__ready === true');

  let res;
  try {
    res = await fetch(`${gotenbergUrl.replace(/\/$/, '')}/forms/chromium/convert/url`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new HttpError(502, `Nie udało się połączyć z Gotenbergiem (${gotenbergUrl}): ${e.message}`);
  }
  if (!res.ok) throw new HttpError(502, `Gotenberg zwrócił ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return Buffer.from(await res.arrayBuffer());
}
