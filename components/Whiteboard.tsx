
import React, { useRef, useState, useEffect } from 'react';
import { BoardElement } from '../types';

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use Ref for drawing state to avoid closure staleness during rapid events
  const isDrawing = useRef(false);
  
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');

  // Redraw function needs to be accessible to the resize observer
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid Background
    ctx.strokeStyle = '#e2e8f0'; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Use canvas dimensions for grid
    const width = canvas.width;
    const height = canvas.height;
    
    for (let i = 0; i < width; i += 40) {
      ctx.moveTo(i, 0); ctx.lineTo(i, height);
    }
    for (let i = 0; i < height; i += 40) {
      ctx.moveTo(0, i); ctx.lineTo(width, i);
    }
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    elements.forEach(el => {
      if (el.type === 'draw' && el.points && el.points.length > 0) {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.size;
        ctx.globalCompositeOperation = el.color === 'erase' ? 'destination-out' : 'source-over';
        
        ctx.beginPath();
        el.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    });
    
    // Reset composite operation for next draw
    ctx.globalCompositeOperation = 'source-over';
  };

  // Resize Observer to handle container size changes (e.g., when sidebar toggles)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      if (container && canvasRef.current) {
        const { width, height } = container.getBoundingClientRect();
        
        // If hidden or collapsed, don't resize yet to avoid 0x0 issues clearing state visually
        if (width === 0 || height === 0) return;

        // Set actual canvas size (2x for retina/high-DPI)
        canvasRef.current.width = width * 2;
        canvasRef.current.height = height * 2;
        
        // Set CSS display size
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        
        redraw();
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    // Initial size update
    updateSize();

    return () => resizeObserver.disconnect();
  }, [elements]); // Re-run when elements change to ensure redraw captures them

  const getCoords = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    // Robust touch/mouse detection
    if (e.touches && e.touches.length > 0) {
       clientX = e.touches[0].clientX;
       clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
       clientX = e.changedTouches[0].clientX;
       clientY = e.changedTouches[0].clientY;
    } else {
       clientX = e.clientX;
       clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const { x, y } = getCoords(e);
    
    const newEl: BoardElement = {
      id: Date.now().toString(),
      type: 'draw',
      points: [{ x, y }],
      color: tool === 'erase' ? 'erase' : color,
      size: tool === 'erase' ? size * 10 : size * 2
    };
    
    setElements(prev => [...prev, newEl]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    
    // Prevent scrolling on touch devices while drawing
    if(e.type === 'touchmove') {
      // e.preventDefault() is passive by default in React 18+, handled by CSS touch-action
    }

    const { x, y } = getCoords(e);
    
    setElements(prev => {
      if (prev.length === 0) return prev;
      
      const lastIndex = prev.length - 1;
      const last = prev[lastIndex];
      
      if (last.type === 'draw') {
        const newPoints = [...(last.points || []), { x, y }];
        const updatedLast = { ...last, points: newPoints };
        const newElements = [...prev];
        newElements[lastIndex] = updatedLast;
        return newElements;
      }
      return prev;
    });
  };

  const endDrawing = () => {
    isDrawing.current = false;
  };

  const clearBoard = () => {
    setElements([]);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        redraw();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-2xl border-4 border-slate-300 overflow-hidden">
      {/* उन्नत टूलबार */}
      <div className="bg-slate-800 p-3 flex flex-wrap gap-4 items-center shadow-md shrink-0 z-10">
        <div className="flex bg-slate-700 rounded-lg p-1 border border-slate-600">
          <button 
            onClick={() => setTool('draw')}
            className={`px-4 py-1.5 rounded-md text-sm transition-all flex items-center gap-2 ${tool === 'draw' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            <span>🖊️</span> कलम
          </button>
          <button 
            onClick={() => setTool('erase')}
            className={`px-4 py-1.5 rounded-md text-sm transition-all flex items-center gap-2 ${tool === 'erase' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
          >
            <span>🧼</span> रबर
          </button>
        </div>

        <div className="h-8 w-px bg-slate-600"></div>

        <input 
          type="color" 
          value={color} 
          onChange={(e) => { setColor(e.target.value); setTool('draw'); }}
          className="w-10 h-10 border-2 border-slate-500 cursor-pointer p-0 bg-transparent rounded-full overflow-hidden"
        />

        <div className="flex items-center gap-2 text-white text-xs">
          <span>बारीक</span>
          <input 
            type="range" 
            min="1" max="15" 
            value={size} 
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-24 accent-orange-500"
          />
          <span>मोटा</span>
        </div>

        <button 
          onClick={clearBoard}
          className="ml-auto bg-slate-100 text-slate-800 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-white transition-colors"
        >
          🗑️ साफ़ करें
        </button>
      </div>

      <div ref={containerRef} className="flex-1 relative bg-[#fafafa] overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <h3 className="text-4xl font-bold text-slate-400 devanagari-title">डिजिटल व्हाइटबोर्ड</h3>
          </div>
        )}
      </div>
      
      <div className="bg-slate-100 px-4 py-1 text-[10px] text-slate-500 flex justify-between shrink-0">
        <span>संकेत: बोर्ड पर लिखने के लिए कलम का उपयोग करें।</span>
        <span>रिज़ॉल्यूशन: 2x HD</span>
      </div>
    </div>
  );
};

export default Whiteboard;
