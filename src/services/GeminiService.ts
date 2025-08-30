export type GeminiParams = {
  style?: 'lineart' | 'sketch';
};

// Note: We won’t ship a server secret; users provide their own key.
export const GeminiService = {
  async generateLineArt(imageBase64Jpeg: string, apiKey: string, _params?: GeminiParams): Promise<string> {
    // For Gemini Flash image-to-image, use the Generative Language API v1beta (pseudo)
    // Here we call a generic endpoint; adapt to your chosen model/endpoint.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const req = {
      contents: [
        {
          parts: [
            { text: 'Convert this photo to clean black line-art suitable for a coloring book. White background, black outlines, no shading, no text.' },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64Jpeg } },
          ],
        },
      ],
      // Safety/format hints could go here
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Gemini error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    // Expect image in candidates[0].content.parts[*].inline_data or base64 tool output; this varies.
    // Try to find inline_data first
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.inline_data?.mime_type?.startsWith('image/')) {
        const mime = p.inline_data.mime_type;
        const b64 = p.inline_data.data;
        // Prefer PNG output, but return whatever we got
        const outMime = mime || 'image/png';
        return `data:${outMime};base64,${b64}`;
      }
      // Sometimes the API returns a Data URL in text
      if (typeof p.text === 'string' && p.text.startsWith('data:image/')) {
        return p.text;
      }
    }
    throw new Error('Gemini response missing image data');
  },
};
