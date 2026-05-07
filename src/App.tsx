import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  Music, 
  Video, 
  Share2, 
  ChevronRight, 
  ArrowLeft, 
  Menu,
  X,
  RefreshCw,
  BookOpen,
  Copy,
  Check
} from 'lucide-react';
import { generateShayariStream, type Shayari } from './gemini';

type AppState = 'IDLE' | 'LOADING' | 'RESULTS';

// Predefined moods for quick selection
const MOODS = [
  { id: 'romantic', label: 'Ishq-e-Yaar (Romantic)', icon: '❤️' },
  { id: 'sad', label: 'Dard-e-Dil (Sad)', icon: '🥀' },
  { id: 'motivational', label: 'Hausla (Motivation)', icon: '🔥' },
  { id: 'alone', label: 'Tanhayi (Alone)', icon: '🕯️' },
  { id: 'sufi', label: 'Ruhani (Sufi/Soul)', icon: '🎭' },
  { id: 'attitude', label: 'Andaaz (Attitude)', icon: '🕶️' }
];

// Decorative Line Art Component
function Decoration() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0 overflow-hidden">
      <svg className="absolute -top-20 -left-20 w-96 h-96 animate-slow-float" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,76.4,-44.7C83.7,-31.3,87.1,-15.7,85.6,-0.9C84.1,13.9,77.7,27.8,69.2,40.1C60.7,52.4,50.1,63.1,37.3,70.3C24.5,77.5,9.5,81.2,-5.3,80.4C-20.1,79.5,-34.7,74.1,-47.5,65.6C-60.3,57.1,-71.3,45.5,-77.8,31.9C-84.3,18.3,-86.3,2.7,-84.1,-12.3C-81.9,-27.3,-75.5,-41.7,-65.4,-53.4C-55.3,-65.1,-41.5,-74.1,-27.4,-79.8C-13.3,-85.5,1.1,-87.9,15.7,-85.5C30.3,-83.1,31.3,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
      </svg>
      <svg className="absolute bottom-10 right-10 w-64 h-64 opacity-[0.05]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>('IDLE');
  const [query, setQuery] = useState('');
  const [pages, setPages] = useState<Record<number, Shayari[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMood, setCurrentMood] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollTopRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (q: string, pageNum: number) => {
    if (!q.trim()) return;
    
    setQuery(q);
    setCurrentMood(q);
    setError(null);
    setIsMobileMenuOpen(false);

    if (pageNum === 1) {
      setState('LOADING');
      setPages({});
    } else {
      setIsLoadingMore(true);
    }

    try {
      const allTextSoFar = (Object.values(pages) as Shayari[][]).flat().map(s => s.text);
      const stream = generateShayariStream(q, allTextSoFar);
      const excludedSet = new Set(allTextSoFar);
      let started = false;

      for await (const chunk of stream) {
        if (!started && pageNum === 1) {
          setState('RESULTS');
          started = true;
        }

        const uniqueInChunk: Shayari[] = [];
        const seenInThisStream = new Set<string>();
        for (const s of chunk) {
          if (!excludedSet.has(s.text) && !seenInThisStream.has(s.text)) {
            uniqueInChunk.push(s);
            seenInThisStream.add(s.text);
          }
        }

        if (uniqueInChunk.length > 0) {
          setPages(prev => ({
            ...prev,
            [pageNum]: uniqueInChunk.slice(0, 4) // Ensure strictly 4
          }));
        }
      }
      
      setCurrentPage(pageNum);
      scrollTopRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Generation failed:', error);
      setError('Maaf kijiye, nala-e-ishq (API) mein khalal aa gaya. Please try again.');
      if (pageNum === 1) setState('IDLE');
    } finally {
      setIsLoadingMore(false);
    }
  }, [pages]);

  const handleNextPage = () => {
    const next = currentPage + 1;
    if (pages[next]) {
      setCurrentPage(next);
      scrollTopRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      fetchPage(currentMood, next);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      scrollTopRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleShare = (s: Shayari) => {
    if (navigator.share) {
      navigator.share({
        title: `Shayari by ${s.poet}`,
        text: `${s.text}\n\n- ${s.poet}\nVia 'Sukoon' by Abhinav`,
        url: window.location.href,
      });
    }
  };

  const currentShayaris = pages[currentPage] || [];

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] selection:bg-[#8B0000]/10 flex font-serif">
      <Decoration />
      
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-[#FDFCF8]/90 backdrop-blur-md border-b border-[#1A1A1A]/5 flex items-center justify-between px-6 z-50">
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-[#8B0000]">
          <Menu size={24} />
        </button>
        <span className="text-xl font-bold font-serif italic text-[#8B0000] tracking-tight">'सुकून'</span>
        <button onClick={() => setState('IDLE')} className="p-2 -mr-2 text-zinc-400">
           <Search size={20} />
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-72 bg-[#FDFCF8] border-r border-[#1A1A1A]/10 flex flex-col p-6 lg:p-8
        transition-transform duration-500 lg:translate-x-0 lg:sticky lg:top-0 h-screen
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden absolute top-6 right-6 p-2 rounded-full hover:bg-black/5">
          <X size={20} />
        </button>
        <div className="mb-12">
          <h1 className="text-4xl font-bold italic tracking-tighter leading-none mb-2 text-[#1A1A1A]">
            'सुकून'
            <span className="block text-[10px] not-italic font-sans uppercase tracking-[0.4em] opacity-30 mt-3 font-bold">By Abhinav</span>
          </h1>
        </div>
        <nav className="flex-1 flex flex-col space-y-12 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-6">
            <p className="text-[10px] uppercase tracking-[0.25em] font-sans opacity-40 font-bold border-b border-[#1A1A1A]/5 pb-2">संग्रह (Archives)</p>
            <ul className="space-y-4 text-[13px] font-sans">
              <li onClick={() => fetchPage('Aaj ki Nazm (Daily Featured)', 1)} className="font-bold flex items-center cursor-pointer group hover:text-[#8B0000] transition-colors">
                <span className="w-1.5 h-1.5 bg-[#8B0000] rounded-full mr-3 group-hover:scale-150 transition-transform"></span> आज की नज़्म
              </li>
              <li onClick={() => fetchPage('Famous Ghazals (Mashoor Ghazal)', 1)} className="opacity-60 hover:opacity-100 hover:translate-x-1 transition-all cursor-pointer flex items-center">
                <BookOpen size={14} className="mr-3 opacity-30" /> मशहूर ग़ज़लें
              </li>
              <li onClick={() => fetchPage('Classic Era Poetry (Daur-e-Qadeem)', 1)} className="opacity-60 hover:opacity-100 hover:translate-x-1 transition-all cursor-pointer flex items-center">
                <RefreshCw size={14} className="mr-3 opacity-30" /> क्लासिक दौर
              </li>
            </ul>
          </div>
          <div className="space-y-6">
            <p className="text-[10px] uppercase tracking-[0.25em] font-sans opacity-40 font-bold border-b border-[#1A1A1A]/5 pb-2">सिफारिशें (Recommended)</p>
            <div className="grid grid-cols-1 gap-2">
              {MOODS.map(m => (
                <button key={m.id} onClick={() => fetchPage(m.label, 1)}
                  className={`flex items-center p-3 rounded-sm text-left transition-all group ${currentMood === m.label ? 'bg-[#8B0000]/5 text-[#8B0000] border-l-2 border-[#8B0000]' : 'hover:bg-black/5 opacity-60 hover:opacity-100'}`}
                >
                  <span className="mr-3 text-lg group-hover:scale-125 transition-transform">{m.icon}</span>
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest">{m.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
        <div className="mt-auto pt-8 border-t border-[#1A1A1A]/5">
          <div className="p-5 bg-[#8B0000]/5 border border-[#8B0000]/10 rounded-sm">
            <p className="text-[10px] font-sans leading-relaxed opacity-60 font-medium">
              <span className="font-bold text-[#8B0000]">EDITORIAL:</span> Curated selection of classical and AI-crafted Hindi and Urdu poetry.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0 overflow-y-auto no-scrollbar" ref={scrollTopRef}>
        <AnimatePresence mode="wait">
          {state === 'IDLE' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto text-center">
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.2, duration: 1 }} className="w-24 h-px bg-[#8B0000] mb-12"></motion.div>
              <h2 className="text-8xl md:text-9xl font-serif font-bold text-[#1A1A1A] mb-8 tracking-tighter leading-none">
                'सुकून' <br/><span className="text-[#8B0000] italic text-3xl md:text-5xl uppercase tracking-[0.3em] font-sans not-italic block mt-4">By Abhinav</span>
              </h2>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-zinc-500 italic text-xl md:text-2xl mb-16 max-w-xl leading-relaxed">"हज़ारों ख्वाहिशें ऐसी कि हर ख्वाहिश पे दम निकले, <br/>बहुत निकले मेरे अरमाँ लेकिन फिर भी कम निकले."</motion.p>
              
              <div className="w-full relative mb-16 max-w-2xl group">
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && fetchPage(query, 1)} 
                  placeholder="आज दिल में क्या है? (जैसे: मोहब्बत, दर्द, हौसला)" 
                  className="w-full py-8 bg-transparent border-b-2 border-[#1A1A1A]/10 text-[#1A1A1A] placeholder:text-zinc-300 focus:outline-none focus:border-[#8B0000] transition-all text-2xl md:text-3xl italic" 
                />
                <button 
                  onClick={() => fetchPage(query, 1)} 
                  className="absolute right-0 bottom-8 text-[#8B0000] hover:translate-x-3 transition-transform p-2 bg-white/50 rounded-full hover:bg-[#8B0000]/5"
                >
                  <ChevronRight size={40} />
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-x-10 gap-y-6 max-w-2xl">
                {MOODS.map((m, i) => (
                  <motion.button 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.6 + (i * 0.05) }}
                    key={m.id} 
                    onClick={() => fetchPage(m.label, 1)} 
                    className="text-[11px] uppercase tracking-[0.4em] font-sans font-bold text-zinc-400 hover:text-[#8B0000] transition-colors border-b border-transparent hover:border-[#8B0000]/30 pb-1"
                  >
                    {m.label}
                  </motion.button>
                ))}
              </div>
              {error && <div className="mt-16 p-5 bg-red-50 text-red-600 text-xs uppercase tracking-widest font-sans font-bold border border-red-100">{error}</div>}
            </motion.div>
          )}

          {state === 'LOADING' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-16 h-16 border-2 border-[#8B0000] border-t-transparent rounded-full mb-8"></motion.div>
              <p className="text-[11px] uppercase tracking-[0.5em] font-sans font-bold text-[#8B0000] animate-pulse">अल्फ़ाज़ों की तलाश...</p>
            </motion.div>
          )}

          {state === 'RESULTS' && (
            <motion.div key="results" className="flex-1 flex flex-col">
              <header className="sticky top-16 lg:top-0 z-50 bg-[#FDFCF8]/90 backdrop-blur-sm border-b border-[#1A1A1A]/10">
                <div className="h-20 flex items-center justify-between px-6 md:px-12">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setState('IDLE')} className="p-3 -ml-2 rounded-full hover:bg-black/5 transition-colors text-zinc-400 hover:text-[#8B0000]" title="Back to Home"><ArrowLeft size={22} /></button>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="flex lg:hidden items-center gap-2 px-4 py-2 rounded-full bg-[#8B0000]/5 text-[#8B0000] text-[10px] uppercase tracking-widest font-extrabold shadow-sm active:scale-95 transition-transform">
                       <Menu size={16} /> MOODS
                    </button>
                    <div className="hidden lg:flex items-center space-x-10 text-[10px] uppercase tracking-[0.4em] font-sans font-extrabold opacity-40">
                      <span className="text-[#8B0000] opacity-100 border-b-2 border-[#8B0000] pb-1">SAFHA {currentPage}</span>
                      <span onClick={() => fetchPage('Famous Ghazals', 1)} className="hover:opacity-100 cursor-pointer hover:text-[#8B0000] transition-colors">GHAZAL</span>
                      <span onClick={() => fetchPage('Classic Era', 1)} className="hover:opacity-100 cursor-pointer hover:text-[#8B0000] transition-colors">CLASSIC</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-sans font-bold mb-1">CURRENT MOOD</p>
                    <h3 className="text-base italic font-serif font-bold text-[#8B0000]">{currentMood.toUpperCase()}</h3>
                  </div>
                </div>
                <div className="px-6 md:px-12 pb-4 overflow-x-auto no-scrollbar">
                  <div className="flex gap-5 min-w-max">
                    <div className="flex items-center pr-6 border-r border-[#1A1A1A]/10 mr-2">
                      <Sparkles size={16} className="text-[#8B0000] mr-3" /><span className="text-[10px] font-sans font-extrabold uppercase tracking-widest opacity-40">MIZAJ:</span>
                    </div>
                    {MOODS.map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => fetchPage(m.label, 1)} 
                        className={`px-6 py-2.5 rounded-full text-[10px] font-sans font-extrabold uppercase tracking-[0.2em] border transition-all flex items-center gap-3 ${currentMood === m.label ? 'bg-[#8B0000] text-white border-[#8B0000] shadow-lg shadow-red-900/10' : 'bg-white border-[#1A1A1A]/10 text-zinc-400 hover:border-[#8B0000] hover:text-[#8B0000]'}`}
                      >
                        <span className="text-base">{m.icon}</span>{m.label.split(' (')[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-4xl w-full mx-auto p-6 md:p-12 space-y-20"
                >
                  <div className="grid grid-cols-1 gap-16 md:gap-24">
                    {currentShayaris.map((s, idx) => (
                      <motion.div
                        key={`${currentPage}-${idx}`}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: idx * 0.15,
                          duration: 0.8,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                      >
                        <ShayariCard shayari={s} onShare={() => handleShare(s)} />
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-20 flex flex-col md:flex-row justify-center items-center gap-10 pb-32">
                    {currentPage > 1 && (
                      <button onClick={handlePrevPage} className="w-full md:w-auto px-12 py-5 border border-[#1A1A1A]/10 text-[11px] uppercase tracking-[0.4em] font-sans font-bold hover:bg-[#1A1A1A]/5 flex items-center justify-center gap-4 transition-all">
                        <ArrowLeft size={16} /> PREV SAFHA
                      </button>
                    )}
                    <button 
                      onClick={handleNextPage} 
                      disabled={isLoadingMore} 
                      className="w-full md:w-auto px-12 py-5 border border-[#1A1A1A] bg-[#1A1A1A] text-white text-[11px] uppercase tracking-[0.4em] font-sans font-bold hover:bg-black flex items-center justify-center gap-4 disabled:opacity-50 transition-all shadow-2xl shadow-black/20 group"
                    >
                      {isLoadingMore ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} className="text-[#8B0000] group-hover:scale-125 transition-transform" />
                      )}
                      NEXT SAFHA
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Floating Mood Toggle Button for results page */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden fixed bottom-8 right-6 w-16 h-16 bg-[#8B0000] text-white rounded-full shadow-2xl flex flex-col items-center justify-center z-[110] active:scale-90 transition-transform ring-4 ring-[#8B0000]/10"
              >
                <Sparkles size={24} />
                <span className="text-[8px] font-sans font-bold uppercase tracking-widest mt-1">Mood</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
    </div>
  );
}

function ShayariCard({ shayari, onShare }: { shayari: Shayari; onShare: () => void; key?: any }) {
  const [showMeanings, setShowMeanings] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${shayari.text}\n\n- ${shayari.poet}\nVia Sukoon App`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderShayariText = () => {
    let text = shayari.text;
    const words = Object.keys(shayari.meanings || {});
    if (words.length === 0) return text;
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${sortedWords.join('|')})`, 'gi');
    return text.split(regex).map((part, i) => {
      const match = sortedWords.find(w => w.toLowerCase() === part.toLowerCase());
      if (match) {
        return <span key={i} className="text-[#8B0000] border-b border-[#8B0000]/20 cursor-help italic px-0.5" onClick={() => setShowMeanings(true)}>{part}</span>;
      }
      return part;
    });
  };

  return (
    <motion.div className="editorial-card p-10 md:p-20 relative overflow-hidden flex flex-col items-center text-center group/card">
      <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-[15rem] font-serif italic select-none text-[#1A1A1A] pointer-events-none uppercase transition-opacity group-hover/card:opacity-[0.05]">
        {shayari.poet?.charAt(0) || 'S'}
      </div>
      
      <div className="mb-12"><span className="crimson-badge">Muntakhab (Featured)</span></div>
      
      <motion.p 
        initial={{ scale: 0.98 }}
        whileInView={{ scale: 1 }}
        className="text-3xl md:text-5xl font-serif leading-[1.8] text-[#1A1A1A] italic mb-14 relative z-10 max-w-2xl whitespace-pre-line tracking-tight font-medium"
      >
        "{renderShayariText()}"
      </motion.p>

      <div className="w-20 h-px bg-[#1A1A1A]/10 mb-10 group-hover/card:w-32 transition-all duration-700"></div>
      
      <p className="text-lg font-serif font-extrabold uppercase tracking-[0.5em] text-[#1A1A1A] mb-16 opacity-80">— {shayari.poet || "Kalam-e-Shayar"}</p>

      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 border-t border-[#1A1A1A]/5 pt-12">
        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="flex items-center gap-3 text-[10px] uppercase font-sans font-bold tracking-[0.2em] opacity-40">
            <Music size={14} className="text-[#8B0000]" /> {shayari.musicSuggestion}
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase font-sans font-bold tracking-[0.2em] opacity-40">
            <Video size={14} /> {shayari.videoConcept}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMeanings(!showMeanings)} 
            className={`px-5 py-3 border rounded-full text-[10px] font-sans font-extrabold uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${showMeanings ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white border-[#1A1A1A]/10 text-zinc-500 hover:border-[#8B0000] hover:text-[#8B0000]'}`}
          >
            GLOSSARY {showMeanings ? <ChevronRight size={12} className="rotate-90" /> : <BookOpen size={12} />}
          </button>
          
          <div className="h-10 w-px bg-zinc-100 hidden md:block"></div>
          
          <button 
            onClick={handleCopy}
            className="p-3 text-zinc-400 hover:text-[#8B0000] transition-colors hover:bg-[#8B0000]/5 rounded-full"
            title="Copy to clipboard"
          >
            {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
          </button>
          
          <button 
            onClick={onShare} 
            className="px-8 py-3 bg-[#8B0000] text-white text-[10px] font-sans font-extrabold uppercase tracking-[0.3em] flex items-center gap-3 rounded-full shadow-lg shadow-red-900/20 hover:scale-105 active:scale-95 transition-all"
          >
            SHARE <Share2 size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMeanings && shayari.meanings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="w-full overflow-hidden"
          >
            <div className="mt-12 p-10 bg-[#FDFCF8]/80 backdrop-blur-sm border border-[#1A1A1A]/5 text-left rounded-sm relative">
               <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                  <BookOpen size={64} className="opacity-[0.03]" />
               </div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-sans font-bold opacity-30 mb-8 border-b border-[#1A1A1A]/5 pb-3">शब्दकोश • DEFINITIONS</h4>
              <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
                {Object.entries(shayari.meanings).map(([word, meaning]) => (
                  <div key={word} className="flex flex-col gap-2 group/word">
                    <span className="text-3xl font-serif italic text-[#8B0000] group-hover/word:translate-x-1 transition-transform inline-block">{word}</span>
                    <span className="text-[13px] font-sans font-medium text-zinc-500 italic leading-relaxed">— {meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
