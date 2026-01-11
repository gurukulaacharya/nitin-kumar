
import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { Chapter } from '../types';

interface SidebarProps {
  chapters: Chapter[];
  onSelectChapter: (chapter: Chapter) => void;
  onSelectActivity: (activity: string) => void;
  onOpenCustomForm: () => void;
  selectedId: string;
  language: 'hindi' | 'english';
  onToggleLanguage: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chapters, onSelectChapter, onSelectActivity, onOpenCustomForm, selectedId, language, onToggleLanguage }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('grammar');

  // Reset expanded section when language changes
  useEffect(() => {
    setExpandedSection('grammar');
  }, [language]);

  const renderChapterButton = (chapter: Chapter, activeColor: string, hoverColor: string, icon: string, bgColor: string = '') => (
    <button
      key={chapter.id}
      onClick={() => onSelectChapter(chapter)}
      className={`w-full text-left p-2 my-1 rounded-lg transition-all text-[11px] font-bold flex items-center gap-2 group border-l-4 ${
        selectedId === chapter.id 
          ? `bg-white/20 text-white border-white shadow-lg scale-105 backdrop-blur-md` 
          : `${bgColor || 'bg-white/5'} border-transparent text-white/70 hover:bg-white/10 hover:text-white hover:pl-3`
      }`}
    >
      <span className="text-sm filter drop-shadow-sm">{icon}</span>
      <span className="truncate flex-1 tracking-wide">{chapter.title}</span>
    </button>
  );

  const SectionHeader = ({ title, icon, id, colorClass }: { title: string, icon: string, id: string, colorClass: string }) => (
    <button 
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className={`w-full flex items-center justify-between p-3 rounded-xl mb-1 transition-all shadow-md transform hover:scale-[1.02] ${
        expandedSection === id ? `${colorClass} text-white ring-2 ring-white/30` : 'bg-white/10 text-white/80 hover:bg-white/20'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-lg filter drop-shadow-md">{icon}</span>
        <span className="font-black text-xs uppercase tracking-wider">{title}</span>
      </div>
      <span className={`text-[10px] transition-transform duration-300 ${expandedSection === id ? 'rotate-180' : ''}`}>▼</span>
    </button>
  );

  return (
    <div className={`w-64 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 h-full flex flex-col shadow-2xl overflow-hidden relative border-r border-slate-700`}>
      {/* Decorative background element */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>

      <div className="p-5 border-b border-white/10 bg-black/20 shrink-0 backdrop-blur-sm relative z-10">
        <div className="flex justify-between items-start mb-2">
            <h1 className="text-xl font-black text-white devanagari-title flex items-center gap-2">
            <span className="text-orange-400 text-3xl filter drop-shadow-[0_2px_4px_rgba(249,115,22,0.5)]">॥</span> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-100 drop-shadow-sm">
                {language === 'hindi' ? 'गुरुकुल आचार्य' : 'आंग्ल आचार्य'}
            </span>
            </h1>
        </div>
        <p className="text-[9px] text-indigo-200 mt-1 pl-7 font-medium tracking-wide">
            {language === 'hindi' ? 'डिजिटल हिंदी शिक्षण साथी' : 'Digital English Teaching Companion'}
        </p>
        
        <button 
            onClick={onToggleLanguage}
            className="mt-3 w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-1.5 px-3 text-[10px] font-bold text-white flex items-center justify-center gap-2 transition-all"
        >
            <span>🌐</span> {language === 'hindi' ? 'आंग्ल भाषा' : 'हिंदी भाषा'}
        </button>
      </div>

      <div className="p-3 pb-0 relative z-10">
        <button 
          onClick={onOpenCustomForm}
          className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg border border-emerald-400/30 ${selectedId === 'custom_form' ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' : 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-100 hover:from-emerald-600 hover:to-teal-600 hover:text-white'}`}
        >
          <span className="text-lg">➕</span> {language === 'hindi' ? 'नया पाठ जोड़ें' : 'Add New Chapter'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 relative z-10">
        
        {/* Custom Chapters (User Created) */}
        {chapters.some(c => c.book === 'Custom') && (
          <div className="section-group">
            <SectionHeader title={language === 'hindi' ? "मेरे जोड़े गए पाठ" : "My Custom Chapters"} icon="📂" id="custom" colorClass="bg-gradient-to-r from-emerald-600 to-teal-600" />
            {expandedSection === 'custom' && (
              <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
                {chapters.filter(c => c.book === 'Custom').map(c => 
                  renderChapterButton(c, 'bg-emerald-500', '', '📄')
                )}
              </div>
            )}
          </div>
        )}

        {language === 'hindi' ? (
            <>
                {/* Class 10 Hindi */}
                <div className="section-group">
                <SectionHeader title="कक्षा १० (स्पर्श/संचयन)" icon="🏵️" id="10" colorClass="bg-gradient-to-r from-orange-600 to-red-600" />
                {expandedSection === '10' && (
                    <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
                    {['Sparsh', 'Sanchayan'].map(book => (
                        <div key={book} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-2 px-2 py-1 mb-1">
                            <div className={`h-px flex-1 ${book === 'Sparsh' ? 'bg-orange-500/50' : 'bg-amber-500/50'}`}></div>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${book === 'Sparsh' ? 'text-orange-300' : 'text-amber-300'}`}>{book}</p>
                            <div className={`h-px flex-1 ${book === 'Sparsh' ? 'bg-orange-500/50' : 'bg-amber-500/50'}`}></div>
                        </div>
                        {chapters.filter(c => c.class === '10' && c.book === book && c.language === 'hindi').map(c => 
                            renderChapterButton(c, book === 'Sparsh' ? 'bg-orange-500' : 'bg-amber-600', '', '📖')
                        )}
                        </div>
                    ))}
                    </div>
                )}
                </div>

                {/* Class 9 Hindi */}
                <div className="section-group">
                <SectionHeader title="कक्षा ९ (स्पर्श)" icon="📘" id="9" colorClass="bg-gradient-to-r from-blue-600 to-cyan-600" />
                {expandedSection === '9' && (
                    <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
                    {chapters.filter(c => c.class === '9' && c.language === 'hindi').map(c => 
                        renderChapterButton(c, 'bg-blue-500', '', '📖')
                    )}
                    </div>
                )}
                </div>
            </>
        ) : (
            <>
                {/* Class 10 English */}
                <div className="section-group">
                <SectionHeader title="कक्षा १० (आंग्ल साहित्य)" icon="🦅" id="10_en" colorClass="bg-gradient-to-r from-orange-600 to-red-600" />
                {expandedSection === '10_en' && (
                    <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
                    {['First Flight', 'Footprints'].map(book => (
                        <div key={book} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-2 px-2 py-1 mb-1">
                            <div className="h-px flex-1 bg-orange-500/50"></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-orange-300">{book}</p>
                            <div className="h-px flex-1 bg-orange-500/50"></div>
                        </div>
                        {chapters.filter(c => c.class === '10' && c.book === book && c.language === 'english').map(c => 
                            renderChapterButton(c, 'bg-orange-500', '', '📖')
                        )}
                        </div>
                    ))}
                    </div>
                )}
                </div>

                {/* Class 9 English */}
                <div className="section-group">
                <SectionHeader title="कक्षा ९ (आंग्ल साहित्य)" icon="🐝" id="9_en" colorClass="bg-gradient-to-r from-blue-600 to-cyan-600" />
                {expandedSection === '9_en' && (
                    <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
                    {['Beehive', 'Moments'].map(book => (
                        <div key={book} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-2 px-2 py-1 mb-1">
                            <div className="h-px flex-1 bg-blue-500/50"></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">{book}</p>
                            <div className="h-px flex-1 bg-blue-500/50"></div>
                        </div>
                        {chapters.filter(c => c.class === '9' && c.book === book && c.language === 'english').map(c => 
                            renderChapterButton(c, 'bg-blue-500', '', '📖')
                        )}
                        </div>
                    ))}
                    </div>
                )}
                </div>
            </>
        )}

        {/* Grammar Lab */}
        <div className="section-group">
          <SectionHeader title={language === 'hindi' ? "व्याकरण प्रयोगशाला" : "आंग्ल व्याकरण"} icon="🧪" id="grammar" colorClass="bg-gradient-to-r from-pink-600 to-rose-600" />
          {expandedSection === 'grammar' && (
            <div className="pl-1 mb-2 space-y-1 bg-black/10 p-2 rounded-xl mt-1">
              {chapters.filter(c => c.book === 'Grammar' && c.language === language).map(c => 
                renderChapterButton(c, 'bg-pink-500', '', '⚗️', 'bg-pink-900/20')
              )}
            </div>
          )}
        </div>

        <div className="section-group">
          <SectionHeader title={language === 'hindi' ? "रचनात्मक लेखन" : "रचनात्मक लेखन (आंग्ल)"} icon="✍️" id="writing" colorClass="bg-gradient-to-r from-teal-600 to-emerald-600" />
          {expandedSection === 'writing' && (
            <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
              {chapters.filter(c => c.book === 'Writing' && c.language === language).map(c => renderChapterButton(c, 'bg-teal-500', '', '📝'))}
            </div>
          )}
        </div>

         <div className="section-group">
          <SectionHeader title={language === 'hindi' ? "विशेष गतिविधियाँ" : "विशेष गतिविधियाँ (आंग्ल)"} icon="🌟" id="activities" colorClass="bg-gradient-to-r from-indigo-500 to-violet-600" />
          {expandedSection === 'activities' && (
            <div className="pl-1 mb-2 space-y-1 mt-1 bg-black/10 p-2 rounded-xl">
              <button 
                onClick={() => onSelectActivity('vachan')} 
                className={`w-full text-left p-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all border-l-4 ${selectedId === 'vachan_activity' ? 'bg-indigo-500 text-white border-white' : 'bg-white/5 border-transparent text-indigo-100 hover:bg-white/10 hover:text-white'}`}
              >
                <span>🎙️</span> {language === 'hindi' ? 'वाचन कौशल (Speaking)' : 'Speaking Skills'}
              </button>
              <button 
                onClick={() => onSelectActivity('shrutlekh')} 
                className={`w-full text-left p-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all border-l-4 ${selectedId === 'shrutlekh' ? 'bg-amber-600 text-white border-white' : 'bg-white/5 border-transparent text-amber-100 hover:bg-white/10 hover:text-white'}`}
              >
                <span>✍️</span> {language === 'hindi' ? 'श्रुतलेख (Dictation)' : 'Spelling Bee / Dictation'}
              </button>
              <button 
                onClick={() => onSelectActivity('keeki')} 
                className={`w-full text-left p-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all border-l-4 ${selectedId === 'keeki' ? 'bg-blue-600 text-white border-white' : 'bg-white/5 border-transparent text-blue-100 hover:bg-white/10 hover:text-white'}`}
              >
                <span>🔑</span> {language === 'hindi' ? "'कि' और 'की' अभ्यास" : 'Confusing Words (Homophones)'}
              </button>
            </div>
          )}
        </div>

      </div>
      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }` }} />
    </div>
  );
};

export default Sidebar;
