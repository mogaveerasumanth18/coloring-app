/**
 * Native Module for Efficient Bitmap Operations
 * Inspired by niccokunzmann/coloring-book's bitmap approach
 *
 * This module provides efficient flood fill and bitmap manipulation
 * operations that would be too slow if implemented in JavaScript.
 *
 * To implement this native module:
 * 1. Create the native module files (Android/iOS)
 * 2. Register the module in your React Native project
 * 3. Use expo-modules-core for Expo projects
 */

import { NativeModules } from 'react-native';

interface BitmapOperationsModule {
  /**
   * Performs flood fill operation on a bitmap
   * @param imagePath - Path to the PNG bitmap file
   * @param x - X coordinate where flood fill starts
   * @param y - Y coordinate where flood fill starts
   * @param fillColor - Color to fill with (hex format)
   * @param tolerance - Color tolerance for flood fill (0-255)
   * @returns Promise<string> - Path to the modified bitmap
   */
  floodFill(
    imagePath: string,
    x: number,
    y: number,
    fillColor: string,
    tolerance?: number
  ): Promise<string>;

  /**
   * Creates a bitmap from canvas data
   * @param width - Canvas width
   * @param height - Canvas height
   * @param backgroundColor - Background color (hex format)
   * @returns Promise<string> - Path to the created bitmap
   */
  createBitmap(
    width: number,
    height: number,
    backgroundColor: string
  ): Promise<string>;

  /**
   * Combines multiple bitmap layers into one
   * @param layers - Array of layer data { path, opacity, blendMode }
   * @returns Promise<string> - Path to the combined bitmap
   */
  combineLayers(
    layers: {
      path: string;
      opacity: number;
      blendMode: 'normal' | 'multiply' | 'overlay';
    }[]
  ): Promise<string>;

  /**
   * Gets pixel color at specific coordinates
   * @param imagePath - Path to the bitmap file
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Promise<string> - Color in hex format
   */
  getPixelColor(imagePath: string, x: number, y: number): Promise<string>;

  /**
   * Applies a brush stroke to bitmap
   * @param imagePath - Path to the bitmap file
   * @param points - Array of {x, y} coordinates
   * @param color - Brush color (hex format)
   * @param size - Brush size in pixels
   * @returns Promise<string> - Path to the modified bitmap
   */
  applyBrushStroke(
    imagePath: string,
    points: { x: number; y: number }[],
    color: string,
    size: number
  ): Promise<string>;
}

// Native module interface (will be null if not implemented)
const BitmapOperationsNative =
  NativeModules.BitmapOperations as BitmapOperationsModule | null;

/**
 * Bitmap Operations Service
 * Provides efficient bitmap operations with fallbacks for non-native implementations
 */
export class BitmapOperationsService {
  private static isNativeModuleAvailable(): boolean {
    return BitmapOperationsNative !== null;
  }

  /**
   * Performs flood fill operation
   * Uses native implementation if available, falls back to JavaScript simulation
   */
  static async floodFill(
    imagePath: string,
    x: number,
    y: number,
    fillColor: string,
    tolerance: number = 0
  ): Promise<string> {
    if (this.isNativeModuleAvailable() && BitmapOperationsNative) {
      try {
        return await BitmapOperationsNative.floodFill(
          imagePath,
          x,
          y,
          fillColor,
          tolerance
        );
      } catch (error) {
        console.warn(
          'Native flood fill failed, falling back to simulation:',
          error
        );
      }
    }

    // Fallback: Return original path (simulation)
    console.warn(
      'Using flood fill simulation - implement native module for production'
    );
    return imagePath;
  }

  /**
   * Creates a new bitmap canvas
   */
  static async createBitmap(
    width: number,
    height: number,
    backgroundColor: string = '#FFFFFF'
  ): Promise<string> {
    if (this.isNativeModuleAvailable() && BitmapOperationsNative) {
      try {
        return await BitmapOperationsNative.createBitmap(
          width,
          height,
          backgroundColor
        );
      } catch (error) {
        console.warn('Native bitmap creation failed:', error);
      }
    }

    // Fallback: Create using expo-image-manipulator
    const { ImageManipulator } = require('expo-image-manipulator');

    // Create a simple white bitmap as fallback
    const svgData = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
    </svg>`;

    const dataUri = `data:image/svg+xml;base64,${btoa(svgData)}`;

    try {
      const result = await ImageManipulator.manipulateAsync(dataUri, [], {
        format: ImageManipulator.SaveFormat.PNG,
      });
      return result.uri;
    } catch (error) {
      throw new Error(`Failed to create bitmap: ${error}`);
    }
  }

  /**
   * Gets pixel color at coordinates
   */
  static async getPixelColor(
    imagePath: string,
    x: number,
    y: number
  ): Promise<string> {
    if (this.isNativeModuleAvailable() && BitmapOperationsNative) {
      try {
        return await BitmapOperationsNative.getPixelColor(imagePath, x, y);
      } catch (error) {
        console.warn('Native pixel color detection failed:', error);
      }
    }

    // Fallback: Return transparent (cannot detect without native implementation)
    console.warn('Pixel color detection requires native implementation');
    return '#00000000';
  }

  /**
   * Applies brush stroke to bitmap
   */
  static async applyBrushStroke(
    imagePath: string,
    points: { x: number; y: number }[],
    color: string,
    size: number
  ): Promise<string> {
    if (this.isNativeModuleAvailable() && BitmapOperationsNative) {
      try {
        return await BitmapOperationsNative.applyBrushStroke(
          imagePath,
          points,
          color,
          size
        );
      } catch (error) {
        console.warn('Native brush stroke failed:', error);
      }
    }

    // Fallback: Return original path (no modification)
    console.warn(
      'Brush stroke requires native implementation for bitmap modification'
    );
    return imagePath;
  }

  /**
   * Combines multiple layers
   */
  static async combineLayers(
    layers: {
      path: string;
      opacity: number;
      blendMode: 'normal' | 'multiply' | 'overlay';
    }[]
  ): Promise<string> {
    if (this.isNativeModuleAvailable() && BitmapOperationsNative) {
      try {
        return await BitmapOperationsNative.combineLayers(layers);
      } catch (error) {
        console.warn('Native layer combination failed:', error);
      }
    }

    // Fallback: Return first layer path
    console.warn('Layer combination requires native implementation');
    return layers.length > 0 ? layers[0].path : '';
  }
}

/**
 * Android Native Module Implementation Guide
 *
 * Create: android/src/main/java/com/yourapp/BitmapOperationsModule.java
 *
 * ```java
 * package com.yourapp;
 *
 * import android.graphics.Bitmap;
 * import android.graphics.BitmapFactory;
 * import android.graphics.Canvas;
 * import android.graphics.Paint;
 * import android.graphics.Path;
 * import android.graphics.Color;
 * import com.facebook.react.bridge.ReactApplicationContext;
 * import com.facebook.react.bridge.ReactContextBaseJavaModule;
 * import com.facebook.react.bridge.ReactMethod;
 * import com.facebook.react.bridge.Promise;
 * import java.io.FileOutputStream;
 * import java.io.IOException;
 * import java.util.Queue;
 * import java.util.LinkedList;
 *
 * public class BitmapOperationsModule extends ReactContextBaseJavaModule {
 *     public BitmapOperationsModule(ReactApplicationContext reactContext) {
 *         super(reactContext);
 *     }
 *
 *     @Override
 *     public String getName() {
 *         return "BitmapOperations";
 *     }
 *
 *     @ReactMethod
 *     public void floodFill(String imagePath, int x, int y, String fillColor, int tolerance, Promise promise) {
 *         try {
 *             Bitmap bitmap = BitmapFactory.decodeFile(imagePath);
 *             if (bitmap == null) {
 *                 promise.reject("BITMAP_ERROR", "Failed to load bitmap");
 *                 return;
 *             }
 *
 *             Bitmap mutableBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true);
 *             int targetColor = Color.parseColor(fillColor);
 *
 *             // Implement efficient flood fill algorithm
 *             floodFillAlgorithm(mutableBitmap, x, y, targetColor, tolerance);
 *
 *             // Save modified bitmap
 *             String outputPath = imagePath.replace(".png", "_filled.png");
 *             FileOutputStream out = new FileOutputStream(outputPath);
 *             mutableBitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
 *             out.close();
 *
 *             promise.resolve(outputPath);
 *         } catch (Exception e) {
 *             promise.reject("FLOOD_FILL_ERROR", e.getMessage());
 *         }
 *     }
 *
 *     private void floodFillAlgorithm(Bitmap bitmap, int x, int y, int newColor, int tolerance) {
 *         int width = bitmap.getWidth();
 *         int height = bitmap.getHeight();
 *
 *         if (x < 0 || x >= width || y < 0 || y >= height) return;
 *
 *         int originalColor = bitmap.getPixel(x, y);
 *         if (originalColor == newColor) return;
 *
 *         // Queue-based flood fill for efficiency
 *         Queue<Point> queue = new LinkedList<>();
 *         boolean[][] visited = new boolean[width][height];
 *         queue.add(new Point(x, y));
 *
 *         while (!queue.isEmpty()) {
 *             Point p = queue.poll();
 *             if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height || visited[p.x][p.y]) {
 *                 continue;
 *             }
 *
 *             int currentColor = bitmap.getPixel(p.x, p.y);
 *             if (colorMatches(currentColor, originalColor, tolerance)) {
 *                 bitmap.setPixel(p.x, p.y, newColor);
 *                 visited[p.x][p.y] = true;
 *
 *                 queue.add(new Point(p.x + 1, p.y));
 *                 queue.add(new Point(p.x - 1, p.y));
 *                 queue.add(new Point(p.x, p.y + 1));
 *                 queue.add(new Point(p.x, p.y - 1));
 *             }
 *         }
 *     }
 *
 *     private boolean colorMatches(int color1, int color2, int tolerance) {
 *         if (tolerance == 0) return color1 == color2;
 *
 *         int r1 = Color.red(color1), g1 = Color.green(color1), b1 = Color.blue(color1);
 *         int r2 = Color.red(color2), g2 = Color.green(color2), b2 = Color.blue(color2);
 *
 *         return Math.abs(r1 - r2) <= tolerance &&
 *                Math.abs(g1 - g2) <= tolerance &&
 *                Math.abs(b1 - b2) <= tolerance;
 *     }
 *
 *     private static class Point {
 *         int x, y;
 *         Point(int x, int y) { this.x = x; this.y = y; }
 *     }
 * }
 * ```
 */

/**
 * iOS Native Module Implementation Guide
 *
 * Create: ios/BitmapOperations.swift
 *
 * ```swift
 * import Foundation
 * import UIKit
 *
 * @objc(BitmapOperations)
 * class BitmapOperations: NSObject {
 *
 *     @objc
 *     static func requiresMainQueueSetup() -> Bool {
 *         return false
 *     }
 *
 *     @objc
 *     func floodFill(_ imagePath: String, x: NSNumber, y: NSNumber, fillColor: String, tolerance: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
 *
 *         DispatchQueue.global(qos: .userInitiated).async {
 *             guard let image = UIImage(contentsOfFile: imagePath),
 *                   let cgImage = image.cgImage else {
 *                 reject("BITMAP_ERROR", "Failed to load bitmap", nil)
 *                 return
 *             }
 *
 *             // Create bitmap context
 *             let width = cgImage.width
 *             let height = cgImage.height
 *             let colorSpace = CGColorSpaceCreateDeviceRGB()
 *             let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
 *
 *             guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: bitmapInfo.rawValue) else {
 *                 reject("CONTEXT_ERROR", "Failed to create bitmap context", nil)
 *                 return
 *             }
 *
 *             context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
 *
 *             // Perform flood fill
 *             let fillColorComponents = self.hexStringToRGBA(fillColor)
 *             self.floodFillContext(context, x: x.intValue, y: y.intValue, fillColor: fillColorComponents, tolerance: tolerance.intValue, width: width, height: height)
 *
 *             // Save modified image
 *             guard let modifiedCGImage = context.makeImage(),
 *                   let modifiedUIImage = UIImage(cgImage: modifiedCGImage) else {
 *                 reject("SAVE_ERROR", "Failed to create modified image", nil)
 *                 return
 *             }
 *
 *             let outputPath = imagePath.replacingOccurrences(of: ".png", with: "_filled.png")
 *             guard let imageData = modifiedUIImage.pngData() else {
 *                 reject("PNG_ERROR", "Failed to convert to PNG", nil)
 *                 return
 *             }
 *
 *             do {
 *                 try imageData.write(to: URL(fileURLWithPath: outputPath))
 *                 resolve(outputPath)
 *             } catch {
 *                 reject("WRITE_ERROR", error.localizedDescription, nil)
 *             }
 *         }
 *     }
 *
 *     private func floodFillContext(_ context: CGContext, x: Int, y: Int, fillColor: (r: UInt8, g: UInt8, b: UInt8, a: UInt8), tolerance: Int, width: Int, height: Int) {
 *         // Implement efficient flood fill algorithm using Core Graphics
 *         // Similar to Android implementation but using iOS APIs
 *     }
 *
 *     private func hexStringToRGBA(_ hex: String) -> (r: UInt8, g: UInt8, b: UInt8, a: UInt8) {
 *         let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
 *         var int = UInt64()
 *         Scanner(string: hex).scanHexInt64(&int)
 *
 *         let r, g, b, a: UInt64
 *         switch hex.count {
 *         case 3: // RGB (12-bit)
 *             (r, g, b, a) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17, 255)
 *         case 6: // RGB (24-bit)
 *             (r, g, b, a) = (int >> 16, int >> 8 & 0xFF, int & 0xFF, 255)
 *         case 8: // ARGB (32-bit)
 *             (r, g, b, a) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
 *         default:
 *             (r, g, b, a) = (0, 0, 0, 255)
 *         }
 *
 *         return (UInt8(r), UInt8(g), UInt8(b), UInt8(a))
 *     }
 * }
 * ```
 */

export default BitmapOperationsService;
export { BitmapOperationsService };
