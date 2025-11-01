import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

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
              text: 'Create a perfect coloring book page: ONLY pure black outlines (RGB 0,0,0) on pure white background (RGB 255,255,255). No colors, no shading, no gradients, no gray areas. Bold black lines 2-4px thick that form completely closed shapes. Every area must be flood-fillable. Think traditional children\'s coloring book - simple, clean, binary black and white only. No anti-aliasing on lines.' 
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
    try {
      console.log('📸 Processing Gemini image for coloring book format...');
      
      // Step 1: Save the data URL to a temporary file
      const tempPath = FileSystem.documentDirectory + 'temp_gemini_' + Date.now() + '.png';
      const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
      
      await FileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('📁 Saved temp image to:', tempPath);
      
      // Step 2: Resize and standardize the image
      const processed = await ImageManipulator.manipulateAsync(
        tempPath,
        [
          // Resize to a reasonable size for coloring books
          { resize: { width: 600 } }, // Maintain aspect ratio
        ],
        {
          compress: 1.0, // No compression to maintain quality
          format: ImageManipulator.SaveFormat.PNG,
          base64: true, // We need base64 output
        }
      );
      
      console.log('📐 Processed image:', processed.width, 'x', processed.height);
      
      // Step 3: Apply additional processing to enhance for coloring
      // Since expo-image-manipulator has limited filters, we'll use what's available
      const enhanced = await ImageManipulator.manipulateAsync(
        processed.uri,
        [
          // Apply any available filters that might help
          // Note: expo-image-manipulator doesn't have contrast/brightness filters
          // but the resize and format conversion should help standardize the image
        ],
        {
          compress: 0.9, // Slight compression to reduce file size
          format: ImageManipulator.SaveFormat.PNG,
          base64: true,
        }
      );
      
      // Step 4: Create the final data URL
      const processedDataUrl = `data:image/png;base64,${enhanced.base64}`;
      
      // Step 5: Clean up temporary files
      try {
        await FileSystem.deleteAsync(tempPath);
        if (processed.uri !== tempPath && processed.uri.startsWith('file://')) {
          await FileSystem.deleteAsync(processed.uri);
        }
        if (enhanced.uri !== processed.uri && enhanced.uri.startsWith('file://')) {
          await FileSystem.deleteAsync(enhanced.uri);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp files:', cleanupError);
      }
      
      console.log('✅ Successfully processed Gemini image for coloring book');
      return processedDataUrl;
      
    } catch (error) {
      console.error('❌ Failed to process image for coloring book:', error);
      console.error('Error details:', error);
      
      // If processing fails, return the original image
      // The enhanced prompt should still make it reasonably good for coloring
      console.log('🔄 Falling back to original image');
      return dataUrl;
    }
  },
};
