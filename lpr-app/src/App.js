import { useState, useRef, useCallback, useEffect } from 'react';

const API = 'http://localhost:5050';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────── */
const C = {
  bg:      '#07080d',
  bg2:     '#0e0f18',
  bg3:     '#141520',
  card:    '#191b28',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  text:    '#f0f2ff',
  muted:   '#6b7094',
  muted2:  '#3a3d58',
  m1:      '#818cf8',
  m2:      '#fb923c',
  m3:      '#34d399',
  danger:  '#f87171',
  warn:    '#fbbf24',
};

const f = {
  display: "'Outfit', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

/* ─── GLOBAL STYLES injected once ───────────────────────────────── */
const GlobalStyle = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body {
        background: ${C.bg};
        color: ${C.text};
        font-family: ${f.display};
        min-height: 100vh;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }
      body::before {
        content: '';
        position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background:
          radial-gradient(ellipse 80% 50% at 20% 10%, rgba(129,140,248,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 90%, rgba(52,211,153,0.04) 0%, transparent 60%);
      }
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-track { background: ${C.bg}; }
      ::-webkit-scrollbar-thumb { background: ${C.muted2}; border-radius: 3px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
      .slide-up { animation: slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  return null;
};

/* ─── SMALL COMPONENTS ───────────────────────────────────────────── */
const Tag = ({ children, color = C.muted }) => (
  <span style={{
    fontFamily: f.mono, fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', color,
    background: `${color}18`, border: `1px solid ${color}30`,
    borderRadius: 4, padding: '3px 8px',
  }}>{children}</span>
);

const MetaCard = ({ label, value }) => (
  <div style={{
    background: C.bg3, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 14px',
    flex: '1 1 130px',
  }}>
    <div style={{ fontFamily: f.mono, fontSize: 9, color: C.muted2, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
    <div style={{ fontFamily: f.mono, fontSize: 14, fontWeight: 700, color: C.text }}>{value ?? '—'}</div>
  </div>
);

const ImgTile = ({ src, label }) => (
  src ? (
    <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', flex: '1 1 160px' }}>
      <img src={`data:image/png;base64,${src}`} alt={label} style={{ width: '100%', display: 'block' }} />
      <div style={{ fontFamily: f.mono, fontSize: 10, color: C.muted, padding: '6px 8px', textAlign: 'center', borderTop: `1px solid ${C.border}` }}>{label}</div>
    </div>
  ) : null
);


const CharCard = ({ src, index, size }) => (
  <div style={{ 
    textAlign: 'center', background: C.bg3, padding: '10px', 
    borderRadius: '10px', border: `1px solid ${C.border}`,
    flex: '0 0 auto'
  }}>
    <div style={{ 
      background: '#fff', padding: '4px', borderRadius: '4px', 
      display: 'flex', alignItems: 'center', justifyContent: 'center' 
    }}>
      <img 
        src={`data:image/png;base64,${src}`} 
        alt={`char-${index}`} 
        style={{ width: '36px', height: '54px', objectFit: 'contain' }} 
      />
    </div>
    <div style={{ fontFamily: f.mono, fontSize: 10, color: C.muted, marginTop: 8 }}>#{index}</div>
    <div style={{ fontFamily: f.mono, fontSize: 8, color: C.muted2 }}>{size}</div>
  </div>
);

const WarnChip = ({ msg }) => (
  <div style={{
    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: 6, padding: '4px 12px',
    fontFamily: f.mono, fontSize: 11, color: C.warn,
  }}>⚠ {msg}</div>
);

/* ─── STAGE ACCORDION ────────────────────────────────────────────── */
const StagePanel = ({ accent, number, title, chip, meta, imgs, warns, defaultOpen,children }) => {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: 'hidden',
      borderLeft: `3px solid ${accent}`,
    }}>
      {/* header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 22px', cursor: 'pointer',
          borderBottom: open ? `1px solid ${C.border}` : '1px solid transparent',
          transition: 'background 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.bg3}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${accent}20`, border: `1px solid ${accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: f.mono, fontSize: 11, fontWeight: 700, color: accent,
          flexShrink: 0,
        }}>{number}</div>

        <div style={{ fontFamily: f.display, fontSize: 16, fontWeight: 600, flex: 1, color: C.text }}>{title}</div>
        {chip && <Tag color={accent}>{chip}</Tag>}
        <span style={{ color: C.muted2, fontSize: 12, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
      </div>

      {/* body */}
      {open && (
        <div style={{ padding: 22 }}>
          {meta && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {Object.entries(meta).map(([k, v]) => <MetaCard key={k} label={k} value={String(v)} />)}
            </div>
          )}
          {imgs && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {imgs.map(([src, label]) => <ImgTile key={label} src={src} label={label} />)}
            </div>
          )}

          {children}
          {warns?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {warns.map(w => <WarnChip key={w} msg={w} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── PIPELINE FLOW DIAGRAM ──────────────────────────────────────── */
const PipelineFlow = () => {
  const stages = [
    { num: '01', color: C.m1, owner: 'M1', title: 'Edge Detection', steps: ['BGR → Grayscale', 'CLAHE contrast', 'Bilateral filter', 'Otsu-tuned Canny'] },
    { num: '02', color: C.m2, owner: 'M2', title: 'Plate Candidate', steps: ['Adaptive morph', 'Multi-source contours', 'Solidity scoring', 'Best rect select'] },
    { num: '03', color: C.m3, owner: 'M3', title: 'Binarize', steps: ['Perspective warp', 'Warp quality score', 'Otsu vs adaptive', 'Polarity correct'] },
    { num: '04', color: C.warn, owner: 'M4', title: 'Segmentation', steps: ['Connected Components', 'Filter noise', 'Sort L→R', 'Resized 20×30'] },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 32px 1fr 32px 1fr 32px 1fr',
      alignItems: 'stretch',
      background: C.bg2, border: `1px solid ${C.border}`,
      borderRadius: 16, overflow: 'hidden',
      position: 'relative', marginBottom: 40,
    }}>
      {/* top gradient bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.m1}, ${C.m2}, ${C.m3})` }} />

      {stages.map((s, i) => (
        <>
          <div key={s.num} style={{ padding: '28px 22px', borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontFamily: f.mono, fontSize: 9, letterSpacing: 2, color: s.color, textTransform: 'uppercase', marginBottom: 8 }}>{s.owner}</div>
            <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 14, lineHeight: 1.2 }}>{s.title}</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {s.steps.map(step => (
                <li key={step} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: f.mono, fontSize: 11, color: C.muted }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
                  {step}
                </li>
              ))}
            </ul>
          </div>
          {i <3  && (
            <div key={`arr-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted2, fontSize: 18 }}>→</div>
          )}
        </>
      ))}
    </div>
  );
};

/* ─── SERVER STATUS BAR ──────────────────────────────────────────── */
const ServerBar = ({ status, onRetry }) => {
  const colors = { ok: C.m3, err: C.danger, checking: C.warn };
  const labels = {
    ok: '● Server online — calling your Python notebook functions',
    err: '● Server offline — run the Flask Server cell in your notebook first',
    checking: '● Checking server…',
  };
  const color = colors[status];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: C.bg2, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '11px 18px', marginBottom: 32,
      fontFamily: f.mono, fontSize: 12,
    }}>
      <span style={{
        color,
        animation: status === 'checking' ? 'pulse 1.2s infinite' : 'none',
      }}>{labels[status]}</span>
      <div style={{ flex: 1 }} />
      <button onClick={onRetry} style={{
        background: 'none', border: `1px solid ${C.border2}`,
        borderRadius: 6, padding: '4px 12px', color: C.muted,
        cursor: 'pointer', fontFamily: f.mono, fontSize: 11,
      }}>↺ Retry</button>
    </div>
  );
};

/* ─── UPLOAD ZONE ────────────────────────────────────────────────── */
const UploadZone = ({ file, onFile, onClear }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState(null);

  const load = useCallback((f) => {
    if (!f || !f.type.startsWith('image/')) return;
    onFile(f);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { setDims(`${img.width} × ${img.height}`); setPreview(url); };
    img.src = url;
  }, [onFile]);

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); load(e.dataTransfer.files[0]); };
  const handleChange = (e) => load(e.target.files[0]);
  const clear = () => { onClear(); setPreview(null); setDims(null); inputRef.current.value = ''; };

  return (
    <div style={{ marginBottom: 20 }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange} />

      {!preview ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? C.m1 : C.border2}`,
            borderRadius: 16, padding: '60px 32px', textAlign: 'center',
            background: dragging ? `${C.m1}08` : C.bg2,
            transition: 'all 0.2s', cursor: 'default',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 16 }}>📷</div>
          <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Drop your car image here
          </div>
          <div style={{ fontFamily: f.mono, fontSize: 12, color: C.muted, marginBottom: 24 }}>
            Results come from your actual Python pipeline
          </div>
          <button
            onClick={() => { inputRef.current.value = ''; inputRef.current.click(); }}
            style={{
              background: C.bg3, border: `1px solid ${C.border2}`,
              borderRadius: 10, padding: '11px 28px',
              fontFamily: f.display, fontSize: 15, fontWeight: 500, color: C.text,
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.m1}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border2}
          >
            Browse files
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px',
        }}>
          <img src={preview} alt="" style={{ width: 88, height: 62, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border2}`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: f.display, fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</div>
            <div style={{ fontFamily: f.mono, fontSize: 11, color: C.muted, marginTop: 3 }}>
              {dims} · {file ? (file.size / 1024).toFixed(1) : 0} KB
            </div>
          </div>
          <button onClick={clear} style={{ background: 'none', border: `1px solid ${C.border2}`, borderRadius: 7, padding: '6px 14px', fontFamily: f.mono, fontSize: 11, color: C.muted, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  );
};

/* ─── RUN BUTTON ─────────────────────────────────────────────────── */
const RunButton = ({ disabled, loading }) => (
  <button
    type="submit"
    disabled={disabled || loading}
    style={{
      width: '100%', padding: '17px',
      background: disabled || loading
        ? C.bg3
        : 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
      border: disabled || loading ? `1px solid ${C.border2}` : 'none',
      borderRadius: 12,
      fontFamily: f.display, fontSize: 18, fontWeight: 700,
      letterSpacing: 1, color: disabled || loading ? C.muted : '#fff',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      boxShadow: disabled || loading ? 'none' : '0 4px 30px rgba(99,102,241,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}
  >
    {loading
      ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> RUNNING…</>
      : '▶  RUN PIPELINE'
    }
  </button>
);

/* ─── CONFIDENCE BAR ─────────────────────────────────────────────── */
const ConfBar = ({ value }) => {
  const pct = Math.min(100, Math.round(value * 200));
  const color = pct > 60 ? C.m3 : pct > 30 ? C.warn : C.danger;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontFamily: f.mono, fontSize: 11, color: C.muted, letterSpacing: 1 }}>CONFIDENCE</span>
      <div style={{ width: 160, height: 5, background: C.bg3, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${C.m3})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontFamily: f.mono, fontSize: 12, fontWeight: 700, color }}>{(value * 100).toFixed(1)}%</span>
    </div>
  );
};

/* ─── FINAL RESULT BOX ───────────────────────────────────────────── */
const FinalBox = ({ data }) => {
  const m3 = data.m3;
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(129,140,248,0.07), rgba(52,211,153,0.04))`,
      border: `1px solid rgba(129,140,248,0.2)`,
      borderRadius: 16, padding: '32px', textAlign: 'center', marginTop: 16,
    }}>
      <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: 'uppercase', marginBottom: 16 }}>
        Binarized Plate — Ready for OCR
      </div>
      <img
        src={`data:image/png;base64,${m3.binary}`}
        alt="Binary plate"
        style={{ maxWidth: '100%', borderRadius: 8, border: `1px solid ${C.border2}`, display: 'block', margin: '0 auto 20px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 24 }}>
        {[['Warp Mode', m3.meta?.warp_mode], ['Warp Score', m3.meta?.warp_score], ['Binarization', m3.meta?.binarization ?? 'Otsu/Adaptive'], ['Size', m3.meta?.out_size]].map(([k, v]) => (
          <div key={k} style={{ fontFamily: f.mono, fontSize: 12, color: C.muted }}>
            {k}: <span style={{ color: C.text, fontWeight: 700 }}>{String(v ?? '—')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── MAIN APP ───────────────────────────────────────────────────── */
export default function App() {
  const [serverStatus, setServerStatus] = useState('checking');
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  /* server health */
  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    try {
      const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      setServerStatus(d.ok ? 'ok' : 'err');
    } catch { setServerStatus('err'); }
  }, []);

  useEffect(() => { checkServer(); const t = setInterval(checkServer, 20000); return () => clearInterval(t); }, [checkServer]);

  /* run pipeline */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || serverStatus !== 'ok') return;
    setLoading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API}/run`, { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.trace ? data.error + '\n\n' + data.trace : data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setFile(null); setResult(null); setError(null); };

  return (
    <>
      <GlobalStyle />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1060, margin: '0 auto', padding: '0 24px 100px' }}>

        {/* ── HEADER ── */}
        <header style={{ padding: '52px 0 40px', borderBottom: `1px solid ${C.border}`, marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
              Digital Image Processing · Group Project
            </div>
            <h1 style={{ fontFamily: f.display, fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: -1 }}>
              Plate Detector
            </h1>
            <div style={{ fontFamily: f.mono, fontSize: 12, color: C.muted, marginTop: 8 }}>
              Adaptive License Plate Recognition · M1 → M2 → M3
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start', marginTop: 8 }}>
            <Tag color={C.m1}>M1 Edges</Tag>
            <Tag color={C.m2}>M2 Detect</Tag>
            <Tag color={C.m3}>M3 Binarize</Tag>
          </div>
        </header>

        {/* ── SERVER BAR ── */}
        <ServerBar status={serverStatus} onRetry={checkServer} />

        {/* ── PIPELINE DIAGRAM ── */}
        <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: 3, color: C.muted2, textTransform: 'uppercase', marginBottom: 14 }}>Pipeline Architecture</div>
        <PipelineFlow />

        {/* ── UPLOAD FORM ── */}
        <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: 3, color: C.muted2, textTransform: 'uppercase', marginBottom: 14 }}>Input Image</div>
        <form onSubmit={handleSubmit}>
          <UploadZone file={file} onFile={setFile} onClear={handleClear} />
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 16px', fontFamily: f.mono, fontSize: 12, color: C.danger, marginBottom: 14 }}>
              ⚠ {error}
            </div>
          )}
          <RunButton disabled={!file || serverStatus !== 'ok'} loading={loading} />
        </form>

        {/* ── RESULTS ── */}
        {result && (
          <div className="slide-up" style={{ marginTop: 48 }}>

            {/* topbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
              <div style={{ fontFamily: f.mono, fontSize: 10, letterSpacing: 3, color: C.muted2, textTransform: 'uppercase' }}>Pipeline Output</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <ConfBar value={result.confidence} />
                <button onClick={handleClear} style={{ background: 'none', border: `1px solid ${C.border2}`, borderRadius: 7, padding: '6px 16px', fontFamily: f.mono, fontSize: 11, color: C.muted, cursor: 'pointer' }}>↺ New image</button>
              </div>
            </div>

            {/* warnings */}
            {result.warnings?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {result.warnings.map(w => <WarnChip key={w} msg={w} />)}
              </div>
            )}

            {/* stage panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StagePanel
                accent={C.m1} number="01" title="M1 — Edge Detection"
                chip={`CANNY ${result.m1.meta?.canny ?? ''}`}
                meta={result.m1.meta}
                imgs={[
                  [result.m1.original, `Original ${(result.size||[]).join('×')}`],
                  [result.m1.gray, 'Grayscale'],
                  [result.m1.edges, `Canny ${result.m1.meta?.canny ?? ''}`],
                ]}
                warns={result.warnings?.filter(w => w.startsWith('M1'))}
                defaultOpen={true}
              />
              <StagePanel
                accent={C.m2} number="02" title="M2 — Plate Candidate"
                chip={`SCORE ${result.m2.meta?.score ?? ''}`}
                meta={result.m2.meta}
                imgs={[
                  [result.m2.detection, 'Detection Overlay'],
                  [result.m2.crop, 'Plate Crop'],
                ]}
                warns={result.warnings?.filter(w => w.startsWith('M2'))}
              />
              <StagePanel
                accent={C.m3} number="03" title="M3 — Perspective & Binarize"
                chip={`${result.m3.meta?.warp_mode ?? ''}`}
                meta={result.m3.meta}
                imgs={[
                  [result.m3.warped, `Warped [${result.m3.meta?.warp_mode ?? ''}]`],
                  [result.m3.binary, 'Binary → OCR'],
                ]}
                warns={result.warnings?.filter(w => w.startsWith('M3'))}
              />

              {result.m4 && (
                <StagePanel
                  accent={C.warn} 
                  number="04" 
                  title="M4 — Character Segmentation"
                  chip={`${result.m4.num_characters} CHARS`}
                  meta={result.m4.meta}
                  warns={result.warnings?.filter(w => w.startsWith('M4'))}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 }}>
                    {result.m4.characters.map((char) => (
                      <CharCard 
                        key={char.index} 
                        src={char.image} 
                        index={char.index} 
                        size={char.size} 
                      />
                    ))}
                  </div>
                </StagePanel>
              )}
              </div>
            <FinalBox data={result} />
          </div>
        )}
      </div>
    </>
  );
}
