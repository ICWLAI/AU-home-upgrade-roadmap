// api/explain.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const {
    upgradeName,
    cost,
    savings,
    payback,
    confidence,
    keyAssumptions,
    isDelayed,
    delayYears,
  } = req.body || {};

  if (!upgradeName || cost == null || savings == null || payback == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = isDelayed
    ? `You are an independent energy consulting engineer writing for an Australian homeowner — never a salesperson. Write exactly 2 short sentences, plain English, explaining why "${upgradeName}" is not favourable yet under the numbers below. Be factual only: no "you should", no recommendations, no guaranteed outcomes — just explain what the numbers show and, briefly, what would need to change for this to become worthwhile.

Cost: $${cost}
Estimated annual saving: $${savings}
Payback period: ${payback === Infinity ? 'not calculable with current inputs' : payback.toFixed(1) + ' years'}
Delay threshold: ${delayYears} years
Confidence: ${confidence}
Key assumptions this depends on: ${keyAssumptions}`
    : `You are an independent energy consulting engineer writing for an Australian homeowner — never a salesperson. Write exactly 2 short sentences, plain English, explaining this upgrade calculation. Be factual only: no "you should", no recommendations, no guaranteed outcomes — just explain what the numbers show and why.

Upgrade: ${upgradeName}
Cost: $${cost}
Estimated annual saving: $${savings}
Payback period: ${payback.toFixed(1)} years
Confidence: ${confidence}
Key assumptions this depends on: ${keyAssumptions}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((block) => block.text || '')
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({ error: 'Empty response from model' });
    }

    return res.status(200).json({ explanation: text });
  } catch (err) {
    return res.status(500).json({ error: 'Request failed' });
  }
}
