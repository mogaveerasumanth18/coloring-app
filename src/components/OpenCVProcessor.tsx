import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export type OpenCVParams = {
  method?: 'canny' | 'adaptive';
  threshold1?: number;
  threshold2?: number;
  blur?: number; // odd
  invert?: boolean;
  maxSize?: number; // optional downscale max dimension to save memory
};

export type OpenCVProcessorHandle = {
  isReady: () => boolean;
  process: (dataUrl: string, params?: OpenCVParams) => Promise<string>; // returns data:image/png;base64,...
};

const HTML = `<!doctype html>
<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>
<body style=\"margin:0;background:#000\"><script>
let cvReady=false;let _cv=null;function send(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
window.addEventListener('message',async(ev)=>{try{const m=typeof ev.data==='string'?JSON.parse(ev.data):ev.data;if(!m)return;
 if(m.type==='load-opencv'){try{eval(m.opencvSrc);}catch(e){send({type:'error',message:'Failed to eval opencv.js: '+e});return;}
   if(typeof Module!=='undefined'&&Module&&Module.onRuntimeInitialized){Module.onRuntimeInitialized=()=>{cvReady=true;send({type:'opencv-ready'});};}
   else{setTimeout(()=>{cvReady=true;send({type:'opencv-ready'});},500);} }
 if(m.type==='process-image'){
   if(!cvReady){send({type:'error',message:'OpenCV not ready'});return;}
   try{const p=m.params||{};const img=new Image();img.onload=()=>{try{
     // optional downscale
     const maxSize=p.maxSize||1024;let w=img.width,h=img.height;const s=Math.max(w,h);if(s>maxSize){const r=maxSize/s;w=Math.round(w*r);h=Math.round(h*r);} 
     const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
     let src=cv.imread(c);let gray=new cv.Mat();let dst=new cv.Mat();
     cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY,0);
     const k=Math.max(1,(p.blur||5)|0);const kk=new cv.Size(k%2===1?k:k+1,k%2===1?k:k+1);cv.GaussianBlur(gray,gray,kk,0,0,cv.BORDER_DEFAULT);
     if(p.method==='adaptive'){cv.adaptiveThreshold(gray,dst,255,cv.ADAPTIVE_THRESH_MEAN_C,cv.THRESH_BINARY,9,2);}else{cv.Canny(gray,dst,p.threshold1||50,p.threshold2||150);let M=cv.Mat.ones(2,2,cv.CV_8U);cv.dilate(dst,dst,M);M.delete();}
     if(p.invert!==false){cv.bitwise_not(dst,dst);} let final=new cv.Mat();cv.cvtColor(dst,final,cv.COLOR_GRAY2RGBA);cv.imshow(c,final);
     const out=c.toDataURL('image/png');src.delete();gray.delete();dst.delete();final.delete(); send({type:'result',base64:out});
   }catch(e){send({type:'error',message:e.toString()});}};img.onerror=()=>send({type:'error',message:'Image load error'});img.src=m.base64;
   }catch(ex){send({type:'error',message:ex.toString()});}
 }
}catch(ex){send({type:'error',message:ex.toString()});}});
window.onload=()=>send({type:'webview-loaded'});
</script></body></html>`;

function useOnce(fn: () => void) {
  const done = useRef(false);
  useEffect(() => {
    if (!done.current) {
      done.current = true;
      fn();
    }
  }, []);
}

export const OpenCVProcessor = forwardRef<OpenCVProcessorHandle, { style?: any }>((_props, ref) => {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const handlerRef = useRef<null | ((event: any) => void)>(null);

  useImperativeHandle(ref, () => ({
    isReady: () => ready,
    process: (dataUrl: string, params?: OpenCVParams) => new Promise<string>((resolve, reject) => {
      handlerRef.current = (event: any) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data);
          if (msg.type === 'result') { resolve(msg.base64); handlerRef.current = null; }
          else if (msg.type === 'error') { reject(new Error(msg.message || 'OpenCV error')); handlerRef.current = null; }
        } catch { /* ignore */ }
      };
      webRef.current?.postMessage(JSON.stringify({ type: 'process-image', base64: dataUrl, params }));
    })
  }), [ready]);

  // Load opencv.js from bundled asset on mount
  useOnce(() => {
    (async () => {
      try {
        // Important: ensure you have placed a real OpenCV build at src/assets/opencv.txt (NOT .js)
        // Using .txt avoids Metro trying to parse a huge JS file, preventing OOM during bundling.
        const asset = Asset.fromModule(require('../assets/opencv.txt'));
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const text = await FileSystem.readAsStringAsync(uri!, { encoding: FileSystem.EncodingType.UTF8 });
        // post to webview after a tiny delay to ensure it mounted
        setTimeout(() => {
          webRef.current?.postMessage(JSON.stringify({ type: 'load-opencv', opencvSrc: text }));
        }, 200);
      } catch (e: any) {
        console.warn('OpenCV asset load failed. Place src/assets/opencv.txt (contents of opencv.js). Error:', e?.message);
        Alert.alert('OpenCV missing', 'Place a built OpenCV file at src/assets/opencv.txt to enable offline conversion.');
      }
    })();
  });

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html: HTML }}
      onMessage={(event) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data);
          if (msg.type === 'opencv-ready') setReady(true);
          if (handlerRef.current) handlerRef.current(event);
        } catch {}
      }}
      javaScriptEnabled
      allowFileAccess
      allowUniversalAccessFromFileURLs
      style={{ height: 0, width: 0, opacity: 0 }}
    />
  );
});

export default OpenCVProcessor;
