export type GeminiParams = {
  style?: 'lineart' | 'sketch';
};

// Note: We won’t ship a server secret; users provide their own key.
export const GeminiService = {
  async generateLineArt(imageBase64: string, apiKey: string, mimeType: string = 'image/jpeg', _params?: GeminiParams): Promise<string> {
    // Use Generative Language API v1beta with the experimental 2.0 flash model, per reference.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${encodeURIComponent(apiKey)}`;
    const req: any = {
      // Prompt from reference
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Generate a simple coloring-book outline: black closed 2D lines only, no shading, all areas flood-fillable.' },
            // REST uses snake_case for request payloads
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      // Request both text and image modalities (aligning with the SDK config in the reference)
      generationConfig: {
        candidateCount: 1,
        responseModalities: ['TEXT', 'IMAGE'],
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
      // Fallback: some responses may place inline_data at the candidate level
      const candInline = (c as any).inlineData || (c as any).inline_data;
      const cmt = candInline?.mimeType || candInline?.mime_type;
      const cb64 = candInline?.data;
      if (candInline && typeof cmt === 'string' && cmt.startsWith('image/') && typeof cb64 === 'string' && cb64.length > 0) {
        const outMime = cmt || 'image/png';
        return `data:${outMime};base64,${cb64}`;
      }
    }
    throw new Error('Gemini response missing image data');
  },
};
