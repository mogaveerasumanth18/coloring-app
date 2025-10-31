export type GeminiParams = {
  style?: 'lineart' | 'sketch';
};

// Note: We won’t ship a server secret; users provide their own key.
export const GeminiService = {
  async generateLineArt(imageBase64: string, apiKey: string, mimeType: string = 'image/jpeg', _params?: GeminiParams): Promise<string> {
    // Use Generative Language API v1beta with the experimental 2.0 flash model, per reference.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${encodeURIComponent(apiKey)}`;
    const req: any = {
      // Enhanced prompt to ensure proper coloring book format
      contents: [
        {
          role: 'user',
          parts: [
            { 
              text: 'Create a coloring book page: black outlines ONLY on pure white background. No colors, no shading, no gradients. Simple bold black lines (2-3px thick) that form closed shapes perfect for flood fill coloring. Make it look exactly like a traditional coloring book outline - just black lines on white, nothing else.' 
            },
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
          const rawDataUrl = `data:${mt};base64,${b64}`;
          
          // Process the image to ensure it's compatible with coloring book format
          const processedDataUrl = await this.processForColoringBook(rawDataUrl);
          return processedDataUrl;
        }
        if (typeof p.text === 'string' && p.text.startsWith('data:image/')) {
          // Process the image to ensure it's compatible with coloring book format
          const processedDataUrl = await this.processForColoringBook(p.text);
          return processedDataUrl;
        }
      }
      // Fallback: some responses may place inline_data at the candidate level
      const candInline = (c as any).inlineData || (c as any).inline_data;
      const cmt = candInline?.mimeType || candInline?.mime_type;
      const cb64 = candInline?.data;
      if (candInline && typeof cmt === 'string' && cmt.startsWith('image/') && typeof cb64 === 'string' && cb64.length > 0) {
        const rawDataUrl = `data:${cmt};base64,${cb64}`;
        
        // Process the image to ensure it's compatible with coloring book format
        const processedDataUrl = await this.processForColoringBook(rawDataUrl);
        return processedDataUrl;
      }
    }
    throw new Error('Gemini response missing image data');
  },

  // Process Gemini images to make them compatible with coloring book format
  async processForColoringBook(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        const img = new Image();
        img.onload = () => {
          try {
            // Set canvas size
            canvas.width = img.width;
            canvas.height = img.height;

            // Fill with white background first
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            // Get image data for processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Process pixels to create proper coloring book format
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];

              // Calculate luminance
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

              // If pixel is dark enough (likely an outline), make it pure black
              if (luminance < 128 && a > 128) {
                data[i] = 0;     // R
                data[i + 1] = 0; // G
                data[i + 2] = 0; // B
                data[i + 3] = 255; // A
              } else {
                // Otherwise, make it pure white
                data[i] = 255;   // R
                data[i + 1] = 255; // G
                data[i + 2] = 255; // B
                data[i + 3] = 255; // A
              }
            }

            // Put the processed data back
            ctx.putImageData(imageData, 0, 0);

            // Convert to PNG data URL
            const processedDataUrl = canvas.toDataURL('image/png');
            resolve(processedDataUrl);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for processing'));
        };

        img.src = dataUrl;
      } catch (error) {
        reject(error);
      }
    });
  },
};
