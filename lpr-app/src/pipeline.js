function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function imageToCanvas(img) {
  const MAX = 1200;
  let w = img.width, h = img.height;
  if (w > MAX || h > MAX) {
    const s = Math.min(MAX/w, MAX/h);
    w = ~~(w*s); h = ~~(h*s);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

function canvasToBase64(canvas) {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

function toGrayscale(imgData, w, h) {
  const data = imgData.data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    gray[i] = ~~(0.299*r + 0.587*g + 0.114*b);
  }
  return gray;
}

function computeStats(gray) {
  let sum = 0, sumSq = 0, n = gray.length;
  for (let i = 0; i < n; i++) { sum += gray[i]; sumSq += gray[i]*gray[i]; }
  const mean = sum / n;
  const std = Math.sqrt(sumSq/n - mean*mean);
  let lapSum = 0, lapN = 0;
  const stride = ~~(n / 5000) || 1;
  for (let i = stride; i < n-stride; i += stride) {
    const v = gray[i] * (-4) + gray[i-1] + gray[i+1] + gray[i-stride] + gray[i+stride];
    lapSum += v * v; lapN++;
  }
  const texture = lapN > 0 ? lapSum / lapN : 1;
  let cnt = 0;
  for (let i = stride; i < n-stride; i += stride) {
    if (Math.abs(gray[i] - gray[i+stride]) > 15) cnt++;
  }
  const edgeDensity = cnt / (n / stride);
  return { mean, std, texture, edgeDensity };
}

function applyCLAHE(gray, w, h, stats) {
  const clip = Math.min(5, Math.max(2, 2 + 50/(stats.std + 1e-5)));
  const tileW = ~~(w/8), tileH = ~~(h/8);
  const out = new Uint8ClampedArray(w*h);
  for (let ty = 0; ty < 8; ty++) {
    for (let tx = 0; tx < 8; tx++) {
      const x0 = tx*tileW, y0 = ty*tileH;
      const x1 = Math.min(w, x0+tileW), y1 = Math.min(h, y0+tileH);
      const hist = new Float32Array(256);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) hist[gray[y*w+x]]++;
      const pxCount = (x1-x0)*(y1-y0);
      const clipPx = (clip / 256) * pxCount;
      let excess = 0;
      for (let b = 0; b < 256; b++) { if (hist[b] > clipPx) { excess += hist[b]-clipPx; hist[b] = clipPx; } }
      const add = excess/256;
      for (let b = 0; b < 256; b++) hist[b] += add;
      const cdf = new Float32Array(256);
      cdf[0] = hist[0];
      for (let b = 1; b < 256; b++) cdf[b] = cdf[b-1] + hist[b];
      const cdfMin = cdf[0], cdfMax = cdf[255];
      const lut = new Uint8Array(256);
      for (let b = 0; b < 256; b++) lut[b] = ~~(((cdf[b]-cdfMin)/(cdfMax-cdfMin+1e-5))*255);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out[y*w+x] = lut[gray[y*w+x]];
    }
  }
  return out;
}

function applyBilateral(gray, w, h, stats) {
  const d = Math.max(5, Math.min(15, ~~(Math.min(w,h)/60)*2+1));
  const sigma = Math.min(60, Math.max(10, 0.3*stats.std + 0.2*Math.sqrt(stats.texture)));
  const r = ~~(d/2);
  const out = new Uint8ClampedArray(w*h);
  const sigmaI2 = sigma*sigma*2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let wSum = 0, vSum = 0;
      const center = gray[y*w+x];
      for (let dy = -r; dy <= r; dy++) {
        const ny = Math.min(h-1, Math.max(0, y+dy));
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.min(w-1, Math.max(0, x+dx));
          const v = gray[ny*w+nx];
          const diff = center - v;
          const w_i = Math.exp(-(diff*diff)/sigmaI2 - (dx*dx+dy*dy)/(d*d));
          wSum += w_i; vSum += w_i * v;
        }
      }
      out[y*w+x] = ~~(vSum/wSum);
    }
  }
  return out;
}

function gaussianBlur5(src, w, h) {
  const kernel = [1,4,6,4,1,4,16,24,16,4,6,24,36,24,6,4,16,24,16,4,1,4,6,4,1];
  const kw = 256;
  const out = new Uint8ClampedArray(w*h);
  for (let y = 2; y < h-2; y++) for (let x = 2; x < w-2; x++) {
    let s = 0, ki = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      s += kernel[ki++]*src[(y+dy)*w+(x+dx)];
    out[y*w+x] = ~~(s/kw);
  }
  return out;
}

function computeOtsu(gray, w, h) {
  const hist = new Int32Array(256);
  const n = w*h;
  for (let i=0;i<n;i++) hist[gray[i]]++;
  let total = 0;
  for (let i=0;i<256;i++) total += i*hist[i];
  let sumB=0, wB=0, best=-1, t=0;
  for (let i=0;i<256;i++) {
    wB+=hist[i]; if(!wB) continue;
    const wF=n-wB; if(!wF) break;
    sumB+=i*hist[i];
    const mB=sumB/wB, mF=(total-sumB)/wF;
    const v=wB*wF*(mB-mF)*(mB-mF);
    if(v>best){best=v;t=i;}
  }
  return t;
}

function cannyEdge(src, w, h, low, high) {
  const Gx = new Int16Array(w*h);
  const Gy = new Int16Array(w*h);
  const mag = new Uint16Array(w*h);
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const i=y*w+x;
    Gx[i]=(-src[(y-1)*w+(x-1)]+src[(y-1)*w+(x+1)]-2*src[y*w+(x-1)]+2*src[y*w+(x+1)]-src[(y+1)*w+(x-1)]+src[(y+1)*w+(x+1)]);
    Gy[i]=(-src[(y-1)*w+(x-1)]-2*src[(y-1)*w+x]-src[(y-1)*w+(x+1)]+src[(y+1)*w+(x-1)]+2*src[(y+1)*w+x]+src[(y+1)*w+(x+1)]);
    mag[i]=~~Math.min(255,Math.sqrt(Gx[i]*Gx[i]+Gy[i]*Gy[i])*0.5);
  }
  const nms = new Uint8ClampedArray(w*h);
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const i=y*w+x, m=mag[i];
    if(!m){nms[i]=0;continue;}
    const angle=(Math.atan2(Gy[i],Gx[i])*180/Math.PI+180)%180;
    let n1,n2;
    if(angle<22.5||angle>=157.5){n1=mag[i-1];n2=mag[i+1];}
    else if(angle<67.5){n1=mag[(y+1)*w+(x-1)];n2=mag[(y-1)*w+(x+1)];}
    else if(angle<112.5){n1=mag[(y-1)*w+x];n2=mag[(y+1)*w+x];}
    else{n1=mag[(y-1)*w+(x-1)];n2=mag[(y+1)*w+(x+1)];}
    nms[i]=(m>=n1&&m>=n2)?m:0;
  }
  const edges = new Uint8ClampedArray(w*h);
  for (let i=0;i<w*h;i++) edges[i]= nms[i]>=high ? 255 : nms[i]>=low ? 128 : 0;
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const i=y*w+x;
    if(edges[i]===128) {
      const hasStrong=edges[i-1]===255||edges[i+1]===255||edges[(y-1)*w+x]===255||edges[(y+1)*w+x]===255;
      edges[i]=hasStrong?255:0;
    }
  }
  return edges;
}

function applyCanny(filtered, w, h, stats) {
  const blurred = gaussianBlur5(filtered, w, h);
  const otsuVal = computeOtsu(blurred, w, h);
  const edgeBias = Math.min(1.3, Math.max(0.8, stats.texture/1000));
  const canny_low = Math.min(120, Math.max(10, ~~(0.4 * otsuVal * edgeBias)));
  const canny_high = Math.min(250, Math.max(80, ~~(1.2 * otsuVal * edgeBias)));
  const edges = cannyEdge(filtered, w, h, canny_low, canny_high);
  return { edges, canny_low, canny_high };
}

function morphClose(edges, w, h, kw, kh) {
  return erode(dilate(edges, w, h, kw, kh), w, h, kw, kh);
}

function dilate(src, w, h, kw, kh) {
  const out = new Uint8ClampedArray(w*h);
  const rx=~~(kw/2), ry=~~(kh/2);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    let m=0;
    for (let dy=-ry;dy<=ry;dy++) for (let dx=-rx;dx<=rx;dx++) {
      const ny=Math.min(h-1,Math.max(0,y+dy)), nx=Math.min(w-1,Math.max(0,x+dx));
      if(src[ny*w+nx]>m) m=src[ny*w+nx];
    }
    out[y*w+x]=m;
  }
  return out;
}

function erode(src, w, h, kw, kh) {
  const out = new Uint8ClampedArray(w*h);
  const rx=~~(kw/2), ry=~~(kh/2);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    let m=255;
    for (let dy=-ry;dy<=ry;dy++) for (let dx=-rx;dx<=rx;dx++) {
      const ny=Math.min(h-1,Math.max(0,y+dy)), nx=Math.min(w-1,Math.max(0,x+dx));
      if(src[ny*w+nx]<m) m=src[ny*w+nx];
    }
    out[y*w+x]=m;
  }
  return out;
}

function findConnectedComponents(mask, w, h) {
  const rects = [];
  const visited = new Uint8Array(w*h);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    if (mask[y*w+x]<128 || visited[y*w+x]) continue;
    let minX=x,maxX=x,minY=y,maxY=y;
    const queue = [[x,y]];
    visited[y*w+x]=1;
    while (queue.length) {
      const [cx,cy]=queue.pop();
      if(cx<minX)minX=cx;if(cx>maxX)maxX=cx;
      if(cy<minY)minY=cy;if(cy>maxY)maxY=cy;
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=cx+dx, ny=cy+dy;
        if(nx>=0&&nx<w&&ny>=0&&ny<h&&!visited[ny*w+nx]&&mask[ny*w+nx]>=128) {
          visited[ny*w+nx]=1; queue.push([nx,ny]);
        }
      }
    }
    rects.push({ x:minX, y:minY, w:maxX-minX+1, h:maxY-minY+1 });
  }
  return rects;
}

function scoreCandidate(r, edges, w, h, imgArea) {
  const { x, y, w: rw, h: rh } = r;
  const area = rw*rh;
  if (area<=0) return -1;
  const aspect = rw/(rh+1e-5);
  const aspectPenalty = Math.abs(aspect-4)/4;
  const aspectScore = Math.max(0, 1-aspectPenalty);
  let edgeSum=0, total=0;
  const step=Math.max(1,~~(Math.sqrt(area)/30));
  for (let ey=y;ey<y+rh;ey+=step) for (let ex=x;ex<x+rw;ex+=step) {
    if(ey<h&&ex<w) { edgeSum+=edges[ey*w+ex]; total++; }
  }
  const regionEdge=total>0?(edgeSum/total)/255:0;
  const yCenter=(y+rh/2)/h;
  const posBias=1+0.2*(yCenter>0.3?1:0);
  const fillRatio=Math.min(1, area/(rw*rh+1e-5));
  const areaScore=area/imgArea;
  return (0.35*fillRatio + 0.20*regionEdge + 0.15*aspectScore + 0.05*areaScore) * posBias;
}

function findPlateCandidates(edges, w, h, imgData) {
  const imgArea = w*h;
  const kw = Math.max(9, ~~(w*0.022)) | 1;
  const morphH = morphClose(edges, w, h, kw, 1);
  const morphS = morphClose(edges, w, h, kw, kw);
  const dilated = dilate(morphH, w, h, 3, 3);
  const sources = [
    { name: 'horizontal', data: morphH },
    { name: 'square', data: morphS },
    { name: 'dilated', data: dilated }
  ];
  let bestScore = -1, bestRect = null, source = 'fallback';
  for (const src of sources) {
    const rects = findConnectedComponents(src.data, w, h);
    for (const r of rects) {
      if (r.w < 20 || r.h < 10) continue;
      const score = scoreCandidate(r, edges, w, h, imgArea);
      if (score > bestScore) { bestScore = score; bestRect = r; source = src.name; }
    }
  }
  if (!bestRect) { bestRect = { x:0, y:0, w, h }; source = 'fallback'; bestScore = 0; }
  const padX = Math.max(4, ~~(bestRect.w*0.02));
  const padY = Math.max(4, ~~(bestRect.h*0.05));
  const rx = Math.max(0, bestRect.x-padX);
  const ry = Math.max(0, bestRect.y-padY);
  const rw = Math.min(w-rx, bestRect.w+padX*2);
  const rh = Math.min(h-ry, bestRect.h+padY*2);
  return { bestRect: { x:rx, y:ry, w:rw, h:rh }, m2score: bestScore, source };
}

function bilinearResize(src, sw, sh, dw, dh) {
  const out = new Uint8ClampedArray(dw*dh);
  for (let y=0;y<dh;y++) for (let x=0;x<dw;x++) {
    const sx=(x/(dw-1))*(sw-1), sy=(y/(dh-1))*(sh-1);
    const x0=~~sx, x1=Math.min(sw-1,x0+1), y0=~~sy, y1=Math.min(sh-1,y0+1);
    const fx=sx-x0, fy=sy-y0;
    out[y*dw+x]=~~(
      src[y0*sw+x0]*(1-fx)*(1-fy)+src[y0*sw+x1]*fx*(1-fy)+
      src[y1*sw+x0]*(1-fx)*fy+src[y1*sw+x1]*fx*fy
    );
  }
  return out;
}

function computeStd(arr) {
  let s=0,s2=0,n=arr.length;
  for(let i=0;i<n;i++){s+=arr[i];s2+=arr[i]*arr[i];}
  return Math.sqrt(Math.max(0,s2/n-(s/n)*(s/n)));
}

function computeWarpScore(img, w, h) {
  let lapVar=0,n=0;
  const stride=Math.max(1,~~(w*h/2000));
  for (let i=stride;i<w*h-stride;i+=stride) {
    const v=img[i]*(-2)+img[i-stride]+img[i+stride];
    lapVar+=v*v; n++;
  }
  const edgeVar=n>0?lapVar/n:0;
  const std=computeStd(img);
  const otsuV=computeOtsu(img,w,h);
  const bin=threshold(img,w,h,otsuV);
  let fg=0; for(let i=0;i<bin.length;i++) if(bin[i]===255) fg++;
  const fgRatio=fg/bin.length;
  const balance=1-Math.abs(fgRatio-0.5);
  return 0.5*Math.min(edgeVar/500,1)+0.3*balance+0.2*Math.min(std/80,1);
}

function threshold(img, w, h, t) {
  const out = new Uint8ClampedArray(w*h);
  for(let i=0;i<img.length;i++) out[i]=img[i]>t?255:0;
  return out;
}

function adaptiveThreshold(img, w, h) {
  const block=Math.max(11,~~(w/15)|1);
  const out = new Uint8ClampedArray(w*h);
  const r=~~(block/2);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    let s=0,c=0;
    for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) {
      const ny=Math.min(h-1,Math.max(0,y+dy)), nx=Math.min(w-1,Math.max(0,x+dx));
      s+=img[ny*w+nx]; c++;
    }
    out[y*w+x]=img[y*w+x]>(s/c-4)?255:0;
  }
  return out;
}

function binQuality(b) {
  let w=0,n=b.length;
  for(let i=0;i<n;i++){if(b[i]===255)w++;}
  return (w/n)*(computeStd(b));
}

function medianBlur3(src, w, h) {
  const out = new Uint8ClampedArray(w*h);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
    const nb=[src[(y-1)*w+(x-1)],src[(y-1)*w+x],src[(y-1)*w+(x+1)],
               src[y*w+(x-1)],src[y*w+x],src[y*w+(x+1)],
               src[(y+1)*w+(x-1)],src[(y+1)*w+x],src[(y+1)*w+(x+1)]].sort((a,b)=>a-b);
    out[y*w+x]=nb[4];
  }
  return out;
}

function perspectiveBinarize(gray, rect, w, h) {
  const { x, y, w: rw, h: rh } = rect;
  const cropGray = new Uint8ClampedArray(rw*rh);
  for (let cy=0;cy<rh;cy++) for (let cx=0;cx<rw;cx++) {
    const sy=Math.min(h-1,y+cy), sx=Math.min(w-1,x+cx);
    cropGray[cy*rw+cx]=gray[sy*w+sx];
  }
  const h_out=80;
  const aspect=Math.min(6.5, Math.max(2.0, rw/(rh+1e-5)));
  const w_out=Math.min(480, Math.max(160, ~~(h_out*aspect)));
  const warped = bilinearResize(cropGray, rw, rh, w_out, h_out);
  const warpScore = computeWarpScore(warped, w_out, h_out);
  const localStd = computeStd(warped);
  const otsuVal = computeOtsu(warped, w_out, h_out);
  const otsuBin = threshold(warped, w_out, h_out, otsuVal);
  const adaptBin = adaptiveThreshold(warped, w_out, h_out);
  const otsuQ = binQuality(otsuBin);
  const adaptQ = binQuality(adaptBin);
  let binary = otsuQ >= adaptQ ? otsuBin : adaptBin;
  let whiteCount=0;
  for (let i=0;i<binary.length;i++) if(binary[i]===255) whiteCount++;
  if(whiteCount/binary.length < 0.5) {
    for (let i=0;i<binary.length;i++) binary[i]=binary[i]===255?0:255;
  }
  binary = medianBlur3(binary, w_out, h_out);
  return { warped: { data: warped, w: w_out, h: h_out }, binary, warpScore, warpMode: 'bbox', localStd };
}

function grayToCanvas(gray, w, h) {
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  const id=ctx.createImageData(w,h);
  for(let i=0;i<w*h;i++){const v=gray[i];id.data[i*4]=v;id.data[i*4+1]=v;id.data[i*4+2]=v;id.data[i*4+3]=255;}
  ctx.putImageData(id,0,0);
  return c;
}

function drawDetection(imgData, w, h, rect, src, score) {
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  ctx.putImageData(imgData, 0, 0);
  ctx.strokeStyle='#6c6ff8';
  ctx.lineWidth=Math.max(2, ~~(w/200));
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle='rgba(108,111,248,0.15)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle='#6c6ff8';
  ctx.font=`${Math.max(11,~~(w/80))}px "JetBrains Mono", monospace`;
  ctx.fillText(`${src} | ${score.toFixed(3)}`, rect.x+2, Math.max(rect.y-4, 14));
  return c;
}

function cropRegion(imgData, w, h, rect) {
  const { x, y, w:rw, h:rh } = rect;
  const c=document.createElement('canvas');
  c.width=rw; c.height=rh;
  const ctx=c.getContext('2d');
  const src=document.createElement('canvas');
  src.width=w; src.height=h;
  src.getContext('2d').putImageData(imgData,0,0);
  ctx.drawImage(src, x, y, rw, rh, 0, 0, rw, rh);
  return c;
}

function charSegmentation(binary, w, h) {
  const visited = new Uint8Array(w*h);
  const chars = [];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    if (binary[y*w+x] < 128 || visited[y*w+x]) continue;
    let minX=x,maxX=x,minY=y,maxY=y;
    const queue = [[x,y]];
    visited[y*w+x]=1;
    while (queue.length) {
      const [cx,cy]=queue.pop();
      if(cx<minX)minX=cx;if(cx>maxX)maxX=cx;
      if(cy<minY)minY=cy;if(cy>maxY)maxY=cy;
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=cx+dx, ny=cy+dy;
        if(nx>=0&&nx<w&&ny>=0&&ny<h&&!visited[ny*w+nx]&&binary[ny*w+nx]>=128) {
          visited[ny*w+nx]=1; queue.push([nx,ny]);
        }
      }
    }
    const cw=maxX-minX+1, ch=maxY-minY+1;
    if (cw > 4 && ch > 10 && cw < w*0.25) {
      const charCanvas = document.createElement('canvas');
      const targetW=20, targetH=30;
      charCanvas.width=targetW; charCanvas.height=targetH;
      const ctx=charCanvas.getContext('2d');
      const srcC=document.createElement('canvas');
      srcC.width=w; srcC.height=h;
      const srcCtx=srcC.getContext('2d');
      const srcId=srcCtx.createImageData(w,h);
      for (let i=0;i<w*h;i++){const v=binary[i];srcId.data[i*4]=v;srcId.data[i*4+1]=v;srcId.data[i*4+2]=v;srcId.data[i*4+3]=255;}
      srcCtx.putImageData(srcId,0,0);
      ctx.drawImage(srcC, minX, minY, cw, ch, 0, 0, targetW, targetH);
      chars.push({ base64: canvasToBase64(charCanvas), w: cw, h: ch });
    }
  }
  return chars.sort((a,b) => a.base64.localeCompare(b.base64));
}

export async function runPipeline(imageFile) {
  const img = new Image();
  const url = URL.createObjectURL(imageFile);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const src = imageToCanvas(img);
  const { width: w, height: h } = src;
  const ctx = src.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const size = [w, h];

  await delay(50);

  const gray = toGrayscale(imgData, w, h);
  const m1Stats = computeStats(gray);
  const clahe = applyCLAHE(gray, w, h, m1Stats);
  const bilateral = applyBilateral(clahe, w, h, m1Stats);
  const { edges, canny_low, canny_high } = applyCanny(bilateral, w, h, m1Stats);

  const { bestRect, m2score, source } = findPlateCandidates(edges, w, h, imgData);

  const { warped, binary, warpScore, warpMode, localStd } = perspectiveBinarize(gray, bestRect, w, h);

  const confidence = (m2score + warpScore) / 2;

  const warnings = [];
  if (m1Stats.edgeDensity < 0.01) warnings.push('M1: Extremely low edge signal — image may be blank or overexposed');
  if (m2score < 0.002) warnings.push('M2: Weak plate confidence — plate may be occluded or not present');
  if (warpScore < 0.2) warnings.push('M3: Low warp confidence — perspective geometry unstable');

  const grayCanvas = grayToCanvas(gray, w, h);
  const claheCanvas = grayToCanvas(clahe, w, h);
  const edgeCanvas = grayToCanvas(edges, w, h);
  const detCanvas = drawDetection(imgData, w, h, bestRect, source, m2score);
  const cropCanvas = cropRegion(imgData, w, h, bestRect);
  const warpedCanvas = grayToCanvas(warped.data, warped.w, warped.h);
  const binaryCanvas = grayToCanvas(binary, warped.w, warped.h);

  const result = {
    ok: true,
    confidence,
    warnings,
    size,
    m1: {
      original: canvasToBase64(src),
      gray: canvasToBase64(grayCanvas),
      edges: canvasToBase64(edgeCanvas),
      meta: {
        mean: m1Stats.mean.toFixed(0),
        contrast: m1Stats.std.toFixed(1),
        texture: m1Stats.texture.toFixed(1),
        canny: `${canny_low}–${canny_high}`,
        'bilateral d': Math.max(5, Math.min(15, Math.floor(Math.min(w,h)/60)*2+1)).toString(),
        'CLAHE clip': Math.min(5, Math.max(2, +(2 + 50/(m1Stats.std+1e-5)).toFixed(2))).toFixed(2),
      },
    },
    m2: {
      detection: canvasToBase64(detCanvas),
      crop: canvasToBase64(cropCanvas),
      meta: {
        score: m2score.toFixed(4),
        source,
        'kernel w': Math.max(9, ~~(w*0.022)).toString(),
        'rect x': bestRect.x.toString(),
        'rect y': bestRect.y.toString(),
        'plate w': bestRect.w.toString(),
        'plate h': bestRect.h.toString(),
      },
    },
    m3: {
      warped: canvasToBase64(warpedCanvas),
      binary: canvasToBase64(binaryCanvas),
      meta: {
        warp_mode: warpMode,
        warp_score: warpScore.toFixed(4),
        local_std: localStd.toFixed(1),
        out_size: `${warped.w} × ${warped.h}`,
        binarization: 'Otsu/Adaptive auto-select',
      },
    },
  };

  const chars = charSegmentation(binary, warped.w, warped.h);
  if (chars.length > 1) {
    result.m4 = {
      characters: chars.map(c => c.base64),
      num_characters: chars.length,
      meta: {
        target_size: '20×30',
        count: chars.length,
      },
    };
  }

  return result;
}
