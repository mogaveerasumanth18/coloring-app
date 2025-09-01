export type GeminiParams = {
  style?: 'lineart' | 'sketch';
};

// Note: We won’t ship a server secret; users provide their own key.
export const GeminiService = {
  async generateLineArt(imageBase64: string, apiKey: string, mimeType: string = 'image/jpeg', _params?: GeminiParams): Promise<string> {
    // Use Generative Language API v1beta with the image-preview model.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
    const req: any = {
      // Ask for clean line art suitable for coloring books
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Convert this photo to clean black line-art suitable for a coloring book. White background, black outlines, no shading, no text.' },
            // REST uses snake_case for request payloads
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      // Prefer an image output (PNG)
      generationConfig: {
        response_mime_type: 'image/png',
      },
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
    // Find an image either in inlineData (SDK-style) or inline_data (REST-style)
    const candidates = data?.candidates || [];
    for (const c of candidates) {
      const parts = c?.content?.parts || [];
      for (const p of parts) {
        const inlineData = p.inlineData || p.inline_data;
        const mt = inlineData?.mimeType || inlineData?.mime_type;
        const b64 = inlineData?.data;
        if (inlineData && typeof mt === 'string' && mt.startsWith('image/') && typeof b64 === 'string' && b64.length > 0) {
          const outMime = mt || 'image/png';
          return `data:${outMime};base64,${b64}`;
        }
        if (typeof p.text === 'string' && p.text.startsWith('data:image/')) {
          return p.text;
        }
      }
    }
    throw new Error('Gemini response missing image data');
  },
};
