export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Alleen POST' });
  }

  const { bericht } = req.body || {};

  if (!bericht || typeof bericht !== 'string' || bericht.trim().length === 0) {
    return res.status(400).json({ error: 'Geen bericht' });
  }

  if (bericht.length > 2000) {
    return res.status(400).json({ error: 'Bericht te lang (max 2000 tekens)' });
  }

  // Optie 1: Stuur via Resend (stel RESEND_API_KEY in als Vercel env var)
  // Optie 2: Log naar Vercel logs (gratis, geen setup nodig)

  const resendKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.FEEDBACK_EMAIL || 'joey@example.com'; // Pas aan!

  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Roosterwijzigingen <feedback@resend.dev>',
          to: emailTo,
          subject: 'Feedback — Roosterwijzigingen',
          text: `Nieuw feedbackbericht:\n\n${bericht.trim()}\n\n---\nVerstuurd op: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`,
        }),
      });

      if (!response.ok) {
        console.error('Resend error:', await response.text());
        return res.status(500).json({ error: 'Mail versturen mislukt' });
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('Resend error:', e);
      return res.status(500).json({ error: 'Mail versturen mislukt' });
    }
  }

  // Fallback: log naar Vercel logs (zichtbaar in je Vercel dashboard)
  console.log('=== FEEDBACK ===');
  console.log('Tijd:', new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }));
  console.log('Bericht:', bericht.trim());
  console.log('================');

  return res.status(200).json({ ok: true });
}
