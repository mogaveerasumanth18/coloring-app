import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode as atob } from 'base-64';

export type GeminiParams = {
  style?: 'lineart' | 'sketch';
};

// Note: We won’t ship a server secret; users provide their own key.
export const GeminiService = {
  async generateLineArt(imageBase64: string, apiKey: string, mimeType: string = 'image/jpeg', _params?: GeminiParams): Promise<string> {
    // Use the latest Gemini 2.5 Flash Image model for image generation.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`;
    const req: any = {
      // Enhanced prompt to ensure proper coloring book format from an input image.
      contents: [
        {
          parts: [
            {
              text: 'Convert the provided image into a SIMPLE coloring book page. Draw ONLY thick black outlines (4-6px wide) on a pure white background. The output should have COMPLETELY CLOSED boundaries for all shapes, making them flood-fill friendly. Simplify the details from the original image into large, easy-to-color shapes. AVOID: tiny details, thin lines, complex patterns, and overlapping shapes. Use ONLY pure black lines (RGB 0,0,0) on a pure white background (RGB 255,255,255).',
            },
            // REST uses snake_case for request payloads
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      // Gemini 1.5 Flash supports multimodal output.
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('❌ Gemini API Error:', {
        status: res.status,
        statusText: res.statusText,
        response: txt,
      });
      throw new Error(`Gemini API error (${res.status}): ${txt}`);
    }
    const data = await res.json();
    console.log('✅ Gemini API Response:', JSON.stringify(data, null, 2));
    
    // Find an image either in inlineData (SDK-style) or inline_data (REST-style)
    const candidates = data?.candidates || [];
    for (const c of candidates) {
      const parts = c?.content?.parts || [];
      for (const p of parts) {
        const inlineData = p.inlineData || p.inline_data;
        const mt = inlineData?.mimeType || inlineData?.mime_type;
        let b64 = inlineData?.data;
        if (inlineData && typeof mt === 'string' && mt.startsWith('image/') && typeof b64 === 'string' && b64.length > 0) {
          // Clean and validate base64 data from Gemini
          b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');
          while (b64.length % 4 !== 0) {
            b64 += '=';
          }
          
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) {
            console.warn('⚠️ Invalid base64 from Gemini, skipping this part');
            continue;
          }
          
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
      let cb64 = candInline?.data;
      if (candInline && typeof cmt === 'string' && cmt.startsWith('image/') && typeof cb64 === 'string' && cb64.length > 0) {
        // Clean and validate base64 data from Gemini
        cb64 = cb64.replace(/[^A-Za-z0-9+/=]/g, '');
        while (cb64.length % 4 !== 0) {
          cb64 += '=';
        }
        
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cb64)) {
          console.warn('⚠️ Invalid base64 from Gemini candidate, skipping');
          continue;
        }
        
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
      // Step 1: Clean and validate the base64 data
      let base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
      
      // Remove any whitespace and invalid characters
      base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Ensure proper base64 padding
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        throw new Error('Invalid base64 format');
      }
      
      // Step 2: Validate base64 data can be decoded and is a valid image
      try {
        // Test decode the full base64 to validate format
        const testBinary = atob(base64Data);
        if (testBinary.length === 0) {
          throw new Error('Base64 decodes to empty data');
        }
        
        // Check PNG signature (first 8 bytes should be PNG header)
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (testBinary.length >= 8) {
          for (let i = 0; i < 8; i++) {
            if (testBinary.charCodeAt(i) !== pngSignature[i]) {
              console.warn('⚠️ Data does not appear to be a valid PNG, but proceeding anyway');
              break;
            }
          }
        }
        
        // Ensure the binary data length is reasonable
        if (testBinary.length < 100) {
          throw new Error('Decoded data too small to be a valid image');
        }
        
      } catch (decodeError) {
        const errorMessage = decodeError instanceof Error ? decodeError.message : String(decodeError);
        throw new Error(`Base64 validation failed: ${errorMessage}`);
      }
      
      // Step 3: Save the cleaned data URL to a temporary file
      const tempPath = FileSystem.documentDirectory + 'temp_gemini_' + Date.now() + '.png';
      
      await FileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Step 4: Resize and standardize the image
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
      
      // Step 5: Apply additional processing to enhance for coloring
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
      
      // Step 6: Validate and clean the processed base64 data
      let processedBase64 = enhanced.base64 || '';
      
      // Clean the base64 data
      processedBase64 = processedBase64.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Ensure proper padding
      while (processedBase64.length % 4 !== 0) {
        processedBase64 += '=';
      }
      
      // Validate the processed base64
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(processedBase64)) {
        console.warn('⚠️ Processed base64 is invalid, using original');
        return dataUrl;
      }
      
      const processedDataUrl = `data:image/png;base64,${processedBase64}`;
      
      // Step 7: Clean up temporary files
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
      
      return processedDataUrl;
      
    } catch (error) {
      console.error('Failed to process image for coloring book:', error);
      
      // If processing fails, try to clean the original dataUrl before returning
      try {
        let fallbackBase64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
        fallbackBase64 = fallbackBase64.replace(/[^A-Za-z0-9+/=]/g, '');
        
        // Ensure proper padding
        while (fallbackBase64.length % 4 !== 0) {
          fallbackBase64 += '=';
        }
        
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(fallbackBase64)) {
          const mimeMatch = dataUrl.match(/^data:(image\/[^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          return `data:${mimeType};base64,${fallbackBase64}`;
        }
      } catch (cleanError) {
        console.error('Failed to clean original image:', cleanError);
      }
      
      return dataUrl;
    }
  },
};