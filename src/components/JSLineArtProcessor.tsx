import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';

export type JSParams = {
  method?: 'sobel' | 'adaptive';
  blur?: number; // odd kernel size (3,5,7)
  threshold?: number; // 0-255 for sobel
  invert?: boolean;
  maxSize?: number; // max dimension downscale
  dilate?: number; // iterations
};

export type JSLineArtProcessorHandle = {
  isReady: () => boolean;
  process: (dataUrl: string, params?: JSParams) => Promise<string>;
};

const HTML = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/></head><body style=\"margin:0\"><script>
function send(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
function clamp(x,a,b){return x<a?a:(x>b?b:x);} 
function toGray(data,w,h){const N=w*h;const out=new Uint8ClampedArray(N);for(let i=0,j=0;i<N;i++,j+=4){const r=data[j],g=data[j+1],b=data[j+2];out[i]=(0.299*r+0.587*g+0.114*b)|0;}return out;}
function boxBlur(gray,w,h,k){k=(k|0);if(k<3) return gray; if((k&1)===0) k++; const r=(k-1)>>1; const tmp=new Uint16Array(w*h); const out=new Uint8ClampedArray(w*h);
 // horiz
 for(let y=0;y<h;y++){let sum=0; let idx=y*w; for(let x=-r;x<=r;x++){const xi=clamp(x,0,w-1); sum+=gray[idx+xi];} for(let x=0;x<w;x++){tmp[idx+x]=sum; const x0=x-r; const x1=x+r+1; sum+=gray[idx+clamp(x1,0,w-1)]-gray[idx+clamp(x0,0,w-1)];}}
 // vert
 for(let x=0;x<w;x++){let sum=0; for(let y=-r;y<=r;y++){const yi=clamp(y,0,h-1); sum+=tmp[yi*w+x];} for(let y=0;y<h;y++){const val=(sum/(k*k))|0; out[y*w+x]=val; const y0=y-r; const y1=y+r+1; sum+=tmp[clamp(y1,0,h-1)*w+x]-tmp[clamp(y0,0,h-1)*w+x];}}
 return out;}
function sobel(gray,w,h){const out=new Uint8ClampedArray(w*h); for(let y=1;y<h-1;y++){for(let x=1;x<w-1;x++){const i=y*w+x; const tl=gray[i-w-1], t=gray[i-w], tr=gray[i-w+1]; const l=gray[i-1], r=gray[i+1]; const bl=gray[i+w-1], b=gray[i+w], br=gray[i+w+1]; const gx = -tl-2*l-bl + tr+2*r+br; const gy = -tl-2*t-tr + bl+2*b+br; const mag = Math.sqrt(gx*gx+gy*gy); out[i] = mag>255?255:mag|0; }} return out;}
function threshold(gray,w,h,t){const out=new Uint8ClampedArray(w*h); const thr=t|0; for(let i=0;i<w*h;i++){ out[i]= gray[i] >= thr ? 255 : 0; } return out;}
function dilate1(bin,w,h){const out=new Uint8ClampedArray(w*h); for(let y=1;y<h-1;y++){for(let x=1;x<w-1;x++){let v=0; for(let dy=-1;dy<=1;dy++){for(let dx=-1;dx<=1;dx++){ if(bin[(y+dy)*w+(x+dx)]>0){v=255; break;} } if(v)break;} out[y*w+x]=v; }} return out;}
function invert1(gray,w,h){const out=new Uint8ClampedArray(w*h); for(let i=0;i<w*h;i++){ out[i]=255-gray[i]; } return out;}
function toImageData(gray,w,h){const data=new Uint8ClampedArray(w*h*4); for(let i=0,j=0;i<w*h;i++,j+=4){const v=gray[i]; data[j]=v; data[j+1]=v; data[j+2]=v; data[j+3]=255;} return new ImageData(data,w,h);}

window.addEventListener('message',async(ev)=>{try{const m=typeof ev.data==='string'?JSON.parse(ev.data):ev.data;if(!m)return; if(m.type==='process-image'){const params=m.params||{}; const img=new Image(); img.onload=()=>{try{ let W=img.width,H=img.height; const M=params.maxSize||1024; const S=Math.max(W,H); if(S>M){const r=M/S; W=(W*r)|0; H=(H*r)|0;} const c=document.createElement('canvas'); c.width=W; c.height=H; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,W,H); const id=ctx.getImageData(0,0,W,H); let g=toGray(id.data,W,H); g=boxBlur(g,W,H, params.blur||5); let e=sobel(g,W,H); e=threshold(e,W,H, params.threshold!=null?params.threshold:80); const it=params.dilate||1; for(let k=0;k<it;k++){ e=dilate1(e,W,H);} if(params.invert!==false){ e=invert1(e,W,H);} const out=toImageData(e,W,H); ctx.putImageData(out,0,0); const dataUrl=c.toDataURL('image/png'); send({type:'result', base64:dataUrl}); }catch(ex){ send({type:'error', message:String(ex)});} }; img.onerror=()=>send({type:'error', message:'Image load error'}); img.src=m.base64; }
}catch(ex){ send({type:'error', message:String(ex)});} });
window.onload=()=>send({type:'ready'});
</script></body></html>`;

export const JSLineArtProcessor = forwardRef<JSLineArtProcessorHandle, {}>((_props, ref) => {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const handlerRef = useRef<null | ((event: any) => void)>(null);

  useImperativeHandle(ref, () => ({
    isReady: () => ready,
    process: (dataUrl: string, params?: JSParams) => new Promise<string>((resolve, reject) => {
      handlerRef.current = (event: any) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data);
          if (msg.type === 'result') { resolve(msg.base64); handlerRef.current = null; }
          else if (msg.type === 'error') { reject(new Error(msg.message || 'Processor error')); handlerRef.current = null; }
        } catch {}
      };
      webRef.current?.postMessage(JSON.stringify({ type: 'process-image', base64: dataUrl, params }));
    })
  }), [ready]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html: HTML }}
      onMessage={(event) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data);
          if (msg.type === 'ready') setReady(true);
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

export default JSLineArtProcessor;
