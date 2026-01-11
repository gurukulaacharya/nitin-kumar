
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface SpecialToolsProps {
  toolType: 'shrutlekh' | 'keeki';
  language?: 'hindi' | 'english';
}

const SpecialTools: React.FC<SpecialToolsProps> = ({ toolType, language = 'hindi' }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [hardWords, setHardWords] = useState<string[]>([]);

  // Reset state when tool changes
  useEffect(() => {
    setContent(null);
    setHardWords([]);
    setUserAnswers({});
    setShowResult(false);
  }, [toolType, language]);

  const generateContent = async () => {
    setLoading(true);
    setContent(null);
    setHardWords([]);
    setUserAnswers({});
    setShowResult(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      
      if (toolType === 'shrutlekh') {
        if (language === 'hindi') {
            prompt = `
            Create a short, engaging story in Hindi (approx 150 words) suitable for Class 9/10 dictation practice. 
            Use rich vocabulary and complex sentence structures.
            Strictly output in JSON format:
            {
                "story": "Full story text here...",
                "hardWords": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"]
            }
            `;
        } else {
            prompt = `
            Create a short, engaging story in English (approx 150 words) suitable for Class 9/10 Spelling Bee / Dictation practice. 
            Use sophisticated vocabulary (e.g., acquiesce, camaraderie, ephemeral).
            Strictly output in JSON format:
            {
                "story": "Full story text here...",
                "hardWords": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"]
            }
            `;
        }
      } else {
        // Keeki (Hindi) or Homophones (English)
        if (language === 'hindi') {
            prompt = `
            Write a short, coherent story in Hindi (10-15 sentences) that naturally uses 'कि' (conjunction, small ki) and 'की' (possessive/verb, big kee) frequently. 
            Ensure the grammar is perfectly correct.
            Just return the plain text of the story. Do not add any title or extra formatting.
            `;
        } else {
            prompt = `
            Write a short, coherent story in English (10-15 sentences) that naturally uses confusing homophones like 'their/there/they're' and 'its/it's' and 'your/you're' frequently.
            Ensure the grammar is perfectly correct.
            Just return the plain text of the story. Do not add any title or extra formatting.
            `;
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Fast model
        contents: prompt,
        config: toolType === 'shrutlekh' ? { responseMimeType: 'application/json' } : {}
      });
      
      const text = response.text || "";

      if (toolType === 'shrutlekh') {
        const data = JSON.parse(text);
        setContent(data.story);
        setHardWords(data.hardWords || []);
      } else {
        setContent(text);
      }

    } catch (e) {
      console.error(e);
      setContent("त्रुटि: सामग्री लोड करने में समस्या हुई। कृपया पुनः प्रयास करें।");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
        utterance.rate = 0.9; // Slightly slower for dictation
        
        // Try to find a voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes(language === 'hindi' ? 'hi' : 'en'));
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    } else {
        alert("आपका ब्राउज़र टेक्स्ट-टू-स्पीच का समर्थन नहीं करता है।");
    }
  };

  const renderKeekiStory = () => {
    if (!content) return null;

    // Split regex based on language
    let splitRegex;
    let targetWords: string[] = [];
    
    if (language === 'hindi') {
        splitRegex = /(\sकि\s|\sकी\s|(?<=\s)कि(?=[^\w])|(?<=\s)की(?=[^\w]))/g;
        targetWords = ['कि', 'की'];
    } else {
        // English Homophones
        splitRegex = /\b(their|there|they're|its|it's|your|you're)\b/gi;
        // Logic will be slightly different for regex split in english due to case sensitivity
    }
    
    // Custom splitting for English to preserve the word for checking
    let parts: string[] = [];
    if (language === 'english') {
        // We need to capture the delimiter
        parts = content.split(/(\b(?:their|there|they're|its|it's|your|you're)\b)/gi);
    } else {
        parts = content.split(splitRegex);
    }
    
    let answerIndex = 0;

    return (
      <div className="leading-loose text-lg text-slate-700 text-justify">
        {parts.map((part, idx) => {
          const trimmed = part.trim();
          const lowerTrimmed = trimmed.toLowerCase();
          
          let isTarget = false;
          let options: string[] = [];

          if (language === 'hindi') {
             if (trimmed === 'कि' || trimmed === 'की') {
                 isTarget = true;
                 options = ['कि', 'की'];
             }
          } else {
             if (['their', 'there', "they're"].includes(lowerTrimmed)) {
                 isTarget = true;
                 options = ['their', 'there', "they're"];
             } else if (['its', "it's"].includes(lowerTrimmed)) {
                 isTarget = true;
                 options = ['its', "it's"];
             } else if (['your', "you're"].includes(lowerTrimmed)) {
                 isTarget = true;
                 options = ['your', "you're"];
             }
          }

          if (isTarget) {
            const currentIdx = answerIndex++;
            // Case insensitive check for English
            const isCorrect = userAnswers[currentIdx]?.toLowerCase() === lowerTrimmed;
            
            return (
              <span key={idx} className="mx-1 inline-block">
                {showResult ? (
                  <span className={`font-bold px-2 py-1 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-rose-100 text-rose-700 border border-rose-300'}`}>
                    {trimmed}
                    {!isCorrect && userAnswers[currentIdx] && <span className="ml-1 line-through text-xs opacity-50">{userAnswers[currentIdx]}</span>}
                  </span>
                ) : (
                  <select 
                    className="appearance-none bg-indigo-50 border-b-2 border-indigo-300 text-indigo-700 font-bold px-2 py-1 rounded focus:outline-none focus:border-indigo-600 cursor-pointer"
                    onChange={(e) => setUserAnswers(prev => ({...prev, [currentIdx]: e.target.value}))}
                    value={userAnswers[currentIdx] || ''}
                  >
                    <option value="">?</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  const getTitle = () => {
      if (toolType === 'shrutlekh') return language === 'hindi' ? 'श्रुतलेख (Dictation)' : 'Spelling Bee / Dictation';
      return language === 'hindi' ? "'कि' और 'की' का अभ्यास" : "Homophones Practice (Their/There, Its/It's)";
  };

  const getSubtitle = () => {
      if (toolType === 'shrutlekh') return language === 'hindi' ? 'कठिन शब्दों और वर्तनी सुधार के लिए कहानी आधारित अभ्यास।' : 'Story-based practice for vocabulary and spelling mastery.';
      return language === 'hindi' ? 'कहानी के माध्यम से योजक (कि) और संबंध कारक (की) का सही प्रयोग सीखें।' : 'Master confusing words through interactive storytelling.';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`p-6 text-white shrink-0 bg-gradient-to-r ${toolType === 'shrutlekh' ? 'from-amber-600 to-orange-600' : 'from-blue-600 to-indigo-600'}`}>
        <h2 className="text-2xl font-black devanagari-title flex items-center gap-3">
          <span>{toolType === 'shrutlekh' ? '✍️' : '🔑'}</span> 
          {getTitle()}
        </h2>
        <p className="text-white/90 text-sm mt-1">
          {getSubtitle()}
        </p>
      </div>

      <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-slate-50/50">
        
        {!content && !loading && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-70">
            <div className="text-6xl">{toolType === 'shrutlekh' ? '📝' : '🤔'}</div>
            <div className="text-center max-w-md">
              <h3 className="text-xl font-bold text-slate-700 mb-2">
                {language === 'hindi' ? 'नया अभ्यास शुरू करें' : 'Start New Practice'}
              </h3>
              <p className="text-slate-500 text-sm">
                {language === 'hindi' ? 'AI द्वारा तुरंत एक नई कहानी जनरेट करें और अभ्यास शुरू करें।' : 'Generate a fresh story with AI and start practicing instantly.'}
              </p>
            </div>
            <button 
              onClick={generateContent}
              className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${toolType === 'shrutlekh' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              ✨ {language === 'hindi' ? 'नई कहानी बनाएँ' : 'Generate Story'}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-current text-indigo-600"></div>
            <p className="text-slate-600 font-bold animate-pulse">{language === 'hindi' ? 'कहानी लिखी जा रही है...' : 'Writing story...'}</p>
          </div>
        )}

        {content && !loading && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
            
            {/* Controls */}
            <div className="flex justify-between items-center">
               <button onClick={generateContent} className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                 <span>🔄</span> {language === 'hindi' ? 'दूसरी कहानी' : 'New Story'}
               </button>
               {toolType === 'shrutlekh' && (
                 <button onClick={() => handleSpeak(content)} className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                   <span>🔊</span> {language === 'hindi' ? 'कहानी सुनें (AI वाचन)' : 'Listen (Text-to-Speech)'}
                 </button>
               )}
            </div>

            {/* Main Content Card */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 relative">
               {toolType === 'shrutlekh' ? (
                 <>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">{language === 'hindi' ? 'मूल पाठ' : 'Original Text'}</h3>
                   <p className="text-xl leading-relaxed text-slate-800 font-medium font-['Hind']">{content}</p>
                   
                   {hardWords.length > 0 && (
                     <div className="mt-8 pt-6 border-t border-slate-100">
                       <h4 className="text-sm font-black text-rose-600 mb-3 flex items-center gap-2">
                         <span>🔥</span> {language === 'hindi' ? 'कठिन शब्द' : 'Vocabulary Focus'}
                       </h4>
                       <div className="flex flex-wrap gap-2">
                         {hardWords.map((word, i) => (
                           <span key={i} className="px-3 py-1 bg-rose-50 text-rose-800 rounded-lg text-sm font-bold border border-rose-100">
                             {word}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                 </>
               ) : (
                 <>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">{language === 'hindi' ? 'अभ्यास' : 'Practice'}</h3>
                   <div className="font-['Hind']">
                     {renderKeekiStory()}
                   </div>
                   
                   {!showResult && (
                     <div className="mt-8 flex justify-center">
                       <button 
                         onClick={() => setShowResult(true)}
                         className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all"
                       >
                         ✅ {language === 'hindi' ? 'उत्तर जाँचें' : 'Check Answers'}
                       </button>
                     </div>
                   )}
                   
                   {showResult && (
                     <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                        <p className="text-blue-800 font-bold">
                          {language === 'hindi' 
                            ? `आपने ${Object.keys(userAnswers).length} में से ${Object.entries(userAnswers).filter(([idx, ans]) => {
                                const parts = content.split(/(\sकि\s|\sकी\s|(?<=\s)कि(?=[^\w])|(?<=\s)की(?=[^\w]))/g);
                                let kCount = 0; let correct = false;
                                parts.forEach(p => { const t = p.trim(); if(t === 'कि' || t === 'की') { if(kCount === Number(idx) && t === ans) correct = true; kCount++; } });
                                return correct;
                              }).length} सही उत्तर दिए।`
                            : "Check the colored boxes above to see your score!"
                          }
                        </p>
                        <button onClick={generateContent} className="mt-2 text-sm text-blue-600 underline font-bold">{language === 'hindi' ? 'अगला अभ्यास करें' : 'Next Exercise'}</button>
                     </div>
                   )}
                 </>
               )}
            </div>

            {/* Instructions */}
            <div className="bg-slate-100 p-4 rounded-xl text-sm text-slate-600">
              <span className="font-bold">{language === 'hindi' ? 'शिक्षक निर्देश:' : 'Teacher Instructions:'}</span>
              {toolType === 'shrutlekh' 
                ? (language === 'hindi' ? " छात्रों को यह कहानी सुनाएँ और उन्हें अपनी कॉपी में लिखने को कहें।" : " Read this story aloud to students and ask them to write it down.")
                : (language === 'hindi' ? " छात्रों से कहें कि वे वाक्य के संदर्भ को समझें।" : " Ask students to understand the context and choose the correct homophone.")
              }
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialTools;
