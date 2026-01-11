
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ReaderPanel from './components/ReaderPanel';
import Whiteboard from './components/Whiteboard';
import SpeakingActivity from './components/SpeakingActivity';
import Explorer from './components/Explorer';
import SpecialTools from './components/SpecialTools';
import { Chapter } from './types';
import { extractTextFromImage } from './services/geminiService';

const App: React.FC = () => {
  // Content State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [currentView, setCurrentView] = useState<'chapter' | 'vachan' | 'custom_entry' | 'explorer' | 'special_tool'>('chapter');
  const [selectedTool, setSelectedTool] = useState<'shrutlekh' | 'keeki'>('shrutlekh');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showReader, setShowReader] = useState(true);
  const [showBoard, setShowBoard] = useState(false);
  const [isReaderFullScreen, setIsReaderFullScreen] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  // Language State
  const [language, setLanguage] = useState<'hindi' | 'english'>('hindi');

  // Custom Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [isExtractingText, setIsExtractingText] = useState(false);

  // Global cache to store generated/edited content for all chapters
  const [chapterCache, setChapterCache] = useState<Record<string, Record<string, string>>>(() => {
    const saved = localStorage.getItem('hindi_guru_v2_cache');
    return saved ? JSON.parse(saved) : {};
  });

  // Load Master JSON on mount
  useEffect(() => {
    fetch('master_chapters.json')
      .then(res => res.json())
      .then(data => {
        setChapters(data);
        if (data.length > 0) {
          // Default to first Hindi chapter
          const firstHindi = data.find((c: Chapter) => c.language === 'hindi');
          if (firstHindi) handleSelectChapter(firstHindi);
        }
      })
      .catch(err => console.error("Failed to load master chapters:", err));
  }, []);

  // Sync cache to localStorage for persistence
  useEffect(() => {
    localStorage.setItem('hindi_guru_v2_cache', JSON.stringify(chapterCache));
  }, [chapterCache]);

  const handleSelectChapter = async (chapterMeta: Chapter) => {
    // If selecting the same chapter, just switch view
    if (selectedChapter && selectedChapter.id === chapterMeta.id) {
      setCurrentView('chapter');
      setShowReader(true);
      return;
    }

    setIsLoadingContent(true);
    setCurrentView('chapter');
    setShowReader(true);

    try {
      // Check if we need to fetch detailed content
      if (chapterMeta.contentFile && !chapterMeta.originalText) {
        const res = await fetch(chapterMeta.contentFile);
        if (!res.ok) throw new Error("Content not found");
        const contentData = await res.json();
        
        // Merge metadata with content
        const fullChapter: Chapter = { ...chapterMeta, ...contentData };
        setSelectedChapter(fullChapter);
      } else {
        // Already has content or no file specified
        setSelectedChapter(chapterMeta);
      }
    } catch (error) {
      console.error("Error loading chapter content:", error);
      // Fallback: set metadata only, UI will show empty/loading state
      setSelectedChapter(chapterMeta);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSelectActivity = (activity: string) => {
    if (activity === 'vachan') {
      setCurrentView('vachan');
      setShowReader(true);
    } else if (activity === 'shrutlekh' || activity === 'keeki') {
      setCurrentView('special_tool');
      setSelectedTool(activity as 'shrutlekh' | 'keeki');
      setShowReader(true);
    }
  };

  const handleOpenCustomForm = () => {
    setCurrentView('custom_entry');
    setShowReader(true);
    setCustomTitle('');
    setCustomText('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingText(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const extractedText = await extractTextFromImage(base64String);
        setCustomText(prev => prev + (prev ? '\n\n' : '') + extractedText);
      } catch (err) {
        alert("इमेज से टेक्स्ट पढ़ने में विफल।");
      } finally {
        setIsExtractingText(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCustomChapter = () => {
    if (!customTitle.trim() || !customText.trim()) {
      alert("कृपया शीर्षक और पाठ दोनों भरें।");
      return;
    }

    const newChapter: Chapter = {
      id: `custom_${Date.now()}`,
      title: customTitle,
      book: 'Custom',
      class: 'Custom',
      language: language,
      originalText: customText
    };

    setChapters(prev => [newChapter, ...prev]);
    setSelectedChapter(newChapter);
    setCurrentView('chapter');
  };

  const updateChapterCache = (chapterId: string, tabId: string, content: string) => {
    setChapterCache(prev => ({
      ...prev,
      [chapterId]: {
        ...(prev[chapterId] || {}),
        [tabId]: content
      }
    }));
  };

  const toggleReaderFullScreen = (val: boolean) => {
    setIsReaderFullScreen(val);
    if (val) {
      setShowSidebar(false);
      setShowBoard(false);
    } else {
      setShowSidebar(true);
      setShowBoard(false);
    }
  };

  const filteredChapters = chapters.filter(c => c.language === language || c.book === 'Custom');

  return (
    <div className="flex h-screen w-full bg-[#fdf6e3] overflow-hidden relative">
      
      {/* Sidebar */}
      <div className={`transition-all duration-300 ease-in-out ${showSidebar ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <Sidebar 
          chapters={filteredChapters}
          onSelectChapter={handleSelectChapter}
          onSelectActivity={handleSelectActivity}
          onOpenCustomForm={handleOpenCustomForm}
          selectedId={currentView === 'vachan' ? 'vachan_activity' : currentView === 'custom_entry' ? 'custom_form' : currentView === 'special_tool' ? selectedTool : selectedChapter?.id || ''} 
          language={language}
          onToggleLanguage={() => setLanguage(prev => prev === 'hindi' ? 'english' : 'hindi')}
        />
      </div>

      <main className="flex-1 flex flex-col p-2 sm:p-3 space-y-3 overflow-hidden relative">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-xl shadow-md border border-slate-200 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-orange-100 rounded-lg hidden sm:block">
              <span className="text-lg">
                {currentView === 'vachan' ? '🎙️' : currentView === 'custom_entry' ? '✍️' : currentView === 'explorer' ? '🔍' : currentView === 'special_tool' ? (selectedTool === 'shrutlekh' ? '📝' : '🔑') : '🎓'}
              </span>
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight truncate max-w-[200px] sm:max-w-none">
                {currentView === 'vachan' ? (language === 'hindi' ? 'वाचन कौशल गतिविधि' : 'Speaking Activity') 
                 : currentView === 'custom_entry' ? (language === 'hindi' ? 'नया पाठ जोड़ें' : 'Add New Chapter') 
                 : currentView === 'explorer' ? (language === 'hindi' ? 'ज्ञान अन्वेषण' : 'Knowledge Explorer') 
                 : currentView === 'special_tool' ? (selectedTool === 'shrutlekh' ? (language === 'hindi' ? 'श्रुतलेख' : 'Spelling Bee') : (language === 'hindi' ? "'कि' और 'की' अभ्यास" : "Homophones Practice")) 
                 : (selectedChapter?.title || '...')}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500">
                {currentView === 'vachan' || currentView === 'special_tool' ? (language === 'hindi' ? 'विशेष गतिविधि' : 'Special Activity') 
                 : currentView === 'custom_entry' ? (language === 'hindi' ? 'शिक्षक द्वारा रचित' : 'Created by Teacher') 
                 : currentView === 'explorer' ? 'AI Assistant' 
                 : (selectedChapter ? `${selectedChapter.book} • Class ${selectedChapter.class}` : '')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
            <button 
              onClick={() => { setShowSidebar(!showSidebar); if(showSidebar) setIsReaderFullScreen(false); }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${showSidebar ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              {language === 'hindi' ? '📋 सूची' : '📋 List'}
            </button>
            <div className="w-px h-3 bg-slate-300 mx-1"></div>
            <button 
              onClick={() => { setShowReader(!showReader); if(currentView !== 'explorer') setShowReader(true); else setCurrentView('chapter'); }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${showReader && currentView !== 'explorer' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              {language === 'hindi' ? '📖 पाठ' : '📖 Chapter'}
            </button>
            <div className="w-px h-3 bg-slate-300 mx-1"></div>
            <button 
              onClick={() => { setCurrentView('explorer'); setShowReader(true); setIsReaderFullScreen(false); }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${currentView === 'explorer' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <span>🔍</span> {language === 'hindi' ? 'अन्वेषण' : 'Explore'}
            </button>
            <div className="w-px h-3 bg-slate-300 mx-1"></div>
            <button 
              onClick={() => { setShowBoard(!showBoard); if(!showBoard) setIsReaderFullScreen(false); }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${showBoard ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              {language === 'hindi' ? '🎨 बोर्ड' : '🎨 Board'}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Teacher Mode</span>
              <span className="text-[10px] font-bold text-emerald-600">{language === 'hindi' ? 'सक्रिय' : 'Active'}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center text-lg">
              👨‍🏫
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex gap-3 overflow-hidden relative">
          <div className={`transition-all duration-500 h-full ${showReader ? (showBoard ? 'w-1/2' : 'w-full') : 'w-0 overflow-hidden'}`}>
            {currentView === 'vachan' ? (
              <SpeakingActivity />
            ) : currentView === 'explorer' ? (
              <Explorer />
            ) : currentView === 'special_tool' ? (
              <SpecialTools toolType={selectedTool} language={language} />
            ) : currentView === 'custom_entry' ? (
              <div className="h-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
                 <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shrink-0">
                    <h2 className="text-2xl font-black devanagari-title mb-2">{language === 'hindi' ? 'नया पाठ जोड़ें' : 'Add New Chapter'}</h2>
                    <p className="text-emerald-100 text-sm">{language === 'hindi' ? 'किसी भी कक्षा का पाठ यहाँ जोड़ें। आप किताब की फोटो भी ले सकते हैं, AI उसे टेक्स्ट में बदल देगा।' : 'Add a chapter from any class here. You can even take a photo of the book, AI will convert it to text.'}</p>
                 </div>
                 <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-slate-50">
                    <div className="max-w-3xl mx-auto space-y-6">
                       <div>
                         <label className="block text-slate-500 font-bold text-xs uppercase mb-2">{language === 'hindi' ? 'पाठ का शीर्षक (Title)' : 'Chapter Title'}</label>
                         <input 
                           type="text" 
                           value={customTitle}
                           onChange={(e) => setCustomTitle(e.target.value)}
                           className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 font-bold text-lg text-slate-800 transition-all outline-none"
                           placeholder={language === 'hindi' ? "उदाहरण: कर्मवीर, ईदगाह..." : "E.g. A Letter to God..."}
                         />
                       </div>
                       
                       <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-all shadow-md flex items-center gap-2 font-bold text-sm">
                            <span>📷</span> {language === 'hindi' ? 'फोटो से स्कैन करें (Image to Text)' : 'Scan from Photo'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          <span className="text-xs text-emerald-700 font-medium">{language === 'hindi' ? 'किताब के पन्ने की फोटो अपलोड करें, AI उसे यहाँ लिख देगा।' : 'Upload a photo of the book page, AI will type it here.'}</span>
                       </div>

                       <div className="relative">
                         <label className="block text-slate-500 font-bold text-xs uppercase mb-2">{language === 'hindi' ? 'पाठ की सामग्री (Content)' : 'Chapter Content'}</label>
                         {isExtractingText && (
                           <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl border-2 border-emerald-100">
                             <div className="flex flex-col items-center">
                               <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-emerald-500 mb-3"></div>
                               <p className="text-emerald-700 font-bold animate-pulse">AI...</p>
                             </div>
                           </div>
                         )}
                         <textarea 
                           value={customText}
                           onChange={(e) => setCustomText(e.target.value)}
                           className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-slate-700 min-h-[300px] transition-all outline-none leading-relaxed"
                           placeholder={language === 'hindi' ? "पाठ का पूरा टेक्स्ट यहाँ पेस्ट करें या ऊपर बटन से स्कैन करें..." : "Paste full text here or scan from above..."}
                         />
                       </div>
                       
                       <button 
                         onClick={handleCreateCustomChapter}
                         disabled={isExtractingText}
                         className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-emerald-700 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
                       >
                         <span>🚀</span> {language === 'hindi' ? 'अध्यापन शुरू करें' : 'Start Teaching'}
                       </button>
                    </div>
                 </div>
              </div>
            ) : (
              selectedChapter && (
                isLoadingContent ? (
                  <div className="flex items-center justify-center h-full bg-white rounded-3xl border shadow-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
                  </div>
                ) : (
                  <ReaderPanel 
                    chapter={selectedChapter} 
                    cache={chapterCache[selectedChapter.id] || {}}
                    onUpdateCache={(tabId, content) => updateChapterCache(selectedChapter.id, tabId, content)}
                    isFullScreen={isReaderFullScreen}
                    onToggleFullScreen={toggleReaderFullScreen}
                  />
                )
              )
            )}
          </div>
          
          <div className={`transition-all duration-500 h-full ${showBoard ? (showReader ? 'w-1/2' : 'w-full') : 'w-0 overflow-hidden'}`}>
            <Whiteboard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
