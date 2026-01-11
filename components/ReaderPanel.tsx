
import React, { useState, useEffect, useRef } from 'react';
import { Chapter, TabType } from '../types';
import { TABS } from '../constants';
import { generateHindiContent } from '../services/geminiService';

interface WorksheetData {
  totalMarks: number;
  duration: string;
  generalInstructions: string;
  sections: {
    sectionA: {
      title: string;
      instructions: string;
      questions: { id: number; question: string; options: string[] }[];
    };
    sectionB: {
      title: string;
      instructions: string;
      topics: {
        topic1: string[];
        topic2: string[];
        topic3: string[];
        topic4: string[];
      };
    };
    sectionC: {
      title: string;
      instructions: string;
      questions: { id: number; question: string; marks: number }[];
    };
  };
}

interface QuizQuestion {
  id: number;
  type: string;
  skill?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

interface ReaderPanelProps {
  chapter: Chapter;
  cache: Record<string, string>;
  onUpdateCache: (tabId: string, content: string) => void;
  isFullScreen: boolean;
  onToggleFullScreen: (val: boolean) => void;
}

const tryParseJSON = (jsonString: string) => {
  try {
    // Remove markdown code blocks if present
    const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return null;
  }
};

const ReaderPanel: React.FC<ReaderPanelProps> = ({ 
  chapter, 
  cache, 
  onUpdateCache,
  isFullScreen,
  onToggleFullScreen
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('mool_path');
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [finished, setFinished] = useState(false);
  
  const processingRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Handle Literature Chapters & Custom Chapters
    if (chapter.book !== 'Grammar' && chapter.book !== 'Writing') {
      const fixedContent: Record<string, string> = {};
      
      const processText = (text: string) => {
          if (text.trim().startsWith('<')) return text;
          return text.replace(/\n/g, '<br>');
      };

      if (chapter.originalText) fixedContent['mool_path'] = processText(chapter.originalText);
      if (chapter.authorBio) fixedContent['lekhak'] = processText(chapter.authorBio);
      if (chapter.vocabulary) fixedContent['vocabulary'] = processText(chapter.vocabulary);
      if (chapter.qa) fixedContent['qa'] = processText(chapter.qa);

      Object.entries(fixedContent).forEach(([id, content]) => {
        if (!cache[id] && content) onUpdateCache(id, content);
      });
      setActiveTab('mool_path');
    } 
    // 2. Handle Grammar & Writing Chapters (Auto Generate)
    else if (chapter.book === 'Grammar' || chapter.book === 'Writing') {
      setActiveTab('vyakhya');
      if (!cache['vyakhya'] && processingRef.current !== chapter.id) {
        processingRef.current = chapter.id;
        setLoading(true);
        // We pass true for isGrammar to trigger detailed generation, though service now handles 'isWriting' separately too.
        generateHindiContent(chapter.title, chapter.originalText || '', 'vyakhya', chapter.class, true, chapter.language)
          .then((result) => {
            onUpdateCache('vyakhya', result);
            setLoading(false);
            processingRef.current = null;
          })
          .catch((err) => {
            console.error("Auto-gen error:", err);
            setLoading(false);
            processingRef.current = null;
          });
      }
    } 
  }, [chapter.id, chapter.originalText, chapter.language]);

  const handleTabClick = async (tabId: TabType) => {
    setActiveTab(tabId);
    setFinished(false);
    setUserAnswers({});
    
    if (chapter.externalResources && chapter.externalResources[tabId]) {
      return; 
    }

    if (cache[tabId]) {
      return;
    }

    if (tabId === 'ek_jhalak' || tabId === 'drishyamala') {
      return;
    }

    const selectedTab = TABS.find(t => t.id === tabId);
    
    if (selectedTab && chapter.originalText) {
      setLoading(true);
      
      const isGrammarTopic = chapter.book === 'Grammar';
      const promptType = selectedTab.id === 'lekhak' ? 'author_bio' 
                       : selectedTab.id === 'vocabulary' ? 'vocabulary'
                       : selectedTab.id === 'qa' ? 'qa'
                       : (chapter.language === 'english' ? selectedTab.labelEn : selectedTab.labelHi);

      // Pass context based on language
      const contextTitle = chapter.title;

      try {
        const result = await generateHindiContent(contextTitle, chapter.originalText, promptType, chapter.class, isGrammarTopic, chapter.language);
        onUpdateCache(tabId, result);
      } catch (error) {
        console.error("Generation failed", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = () => {
    const content = cache[activeTab];
    if (!content && !chapter.externalResources?.[activeTab]) {
      alert("प्रिंट करने के लिए कोई सामग्री नहीं है।");
      return;
    }
    
    if (chapter.externalResources?.[activeTab]) {
        window.open(chapter.externalResources[activeTab], '_blank');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("कृपया पॉप-अप को अनुमति दें (Allow Pop-ups)।");
      return;
    }

    const currentTabLabel = chapter.language === 'english' 
        ? TABS.find(t => t.id === activeTab)?.labelEn 
        : TABS.find(t => t.id === activeTab)?.labelHi;

    let htmlContent = "";
    
    // Custom Print Logic for JSON content (Worksheet/Quiz)
    if (activeTab === 'worksheet' || activeTab === 'quiz') {
        const data = tryParseJSON(content);
        
        if (data && activeTab === 'worksheet') {
            const wsData = data as WorksheetData;
            htmlContent = `
                <div class="worksheet-container">
                    <div class="ws-header">
                        <h1>${chapter.title} - ${currentTabLabel}</h1>
                        <div class="ws-meta">
                            <span>Time: ${wsData.duration}</span>
                            <span>Max Marks: ${wsData.totalMarks}</span>
                        </div>
                        <p class="ws-instructions">Instructions: ${wsData.generalInstructions}</p>
                    </div>
                    
                    ${wsData.sections.sectionA ? `
                    <div class="ws-section">
                        <h3>Section A: ${wsData.sections.sectionA.title}</h3>
                        <p><i>${wsData.sections.sectionA.instructions}</i></p>
                        ${wsData.sections.sectionA.questions.map((q, i) => `
                            <div class="question-block">
                                <p><strong>Q${i+1}.</strong> ${q.question}</p>
                                <ul class="options-list">
                                    ${q.options.map(o => `<li>${o}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>` : ''}

                    ${wsData.sections.sectionB ? `
                    <div class="ws-section">
                        <h3>Section B: ${wsData.sections.sectionB.title}</h3>
                        <p><i>${wsData.sections.sectionB.instructions}</i></p>
                        <div class="topics-grid">
                            ${Object.entries(wsData.sections.sectionB.topics).map(([k, list]) => `
                                <div><strong>${k}:</strong> ${Array.isArray(list) ? list.join(', ') : list}</div>
                            `).join('')}
                        </div>
                    </div>` : ''}

                    ${wsData.sections.sectionC ? `
                    <div class="ws-section">
                        <h3>Section C: ${wsData.sections.sectionC.title}</h3>
                        <p><i>${wsData.sections.sectionC.instructions}</i></p>
                        ${wsData.sections.sectionC.questions.map((q, i) => `
                            <div class="question-block">
                                <div style="display:flex; justify-content:space-between;">
                                    <p><strong>Q${i+1}.</strong> ${q.question}</p>
                                    <span>[${q.marks}]</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>` : ''}
                </div>
            `;
        } else if (data && activeTab === 'quiz') {
             const qData = data as QuizData;
             htmlContent = `
                <div class="quiz-container">
                    <h1>${qData.title}</h1>
                    ${qData.questions.map((q, i) => `
                        <div class="question-block">
                            <p><strong>Q${i+1}.</strong> ${q.question}</p>
                            <ul>${q.options.map(o => `<li>${o}</li>`).join('')}</ul>
                            <p class="answer">Answer: ${q.correctAnswer}</p>
                        </div>
                    `).join('')}
                </div>
             `;
        }
    } else {
        // Standard Text Content
        htmlContent = `
            <div class="header">
                <h1>${chapter.title}</h1>
                <h2>${currentTabLabel}</h2>
            </div>
            <div class="rich-content">${content}</div>
        `;
    }

    const styles = `
        <style>
            body { font-family: 'Hind', sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #000; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { font-size: 26px; font-weight: 900; margin: 0 0 5px 0; }
            .header h2 { font-size: 18px; font-weight: 600; margin: 0 0 15px 0; text-transform: uppercase; color: #444; }
            .rich-content { font-size: 14px; line-height: 1.6; }
            
            /* Worksheet Specific */
            .ws-header { text-align: center; border: 2px solid #000; padding: 20px; margin-bottom: 20px; }
            .ws-meta { display: flex; justify-content: space-between; font-weight: bold; margin: 10px 0; border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 10px 0; }
            .ws-section { margin-bottom: 30px; }
            .ws-section h3 { background: #eee; padding: 5px 10px; border-left: 5px solid #000; }
            .question-block { margin-bottom: 15px; page-break-inside: avoid; }
            .options-list { list-style-type: none; padding-left: 20px; }
            .options-list li::before { content: "⭕ "; }
            
            /* Quiz Specific */
            .quiz-container .answer { font-weight: bold; margin-top: 5px; color: #444; font-size: 0.9em; border-top: 1px dotted #ccc; padding-top: 2px;}

            @media print { body { -webkit-print-color-adjust: exact; padding: 20px; } .no-print { display: none; } }
        </style>
    `;

    printWindow.document.write(`<html><head><title>${chapter.title}</title>${styles}</head><body>${htmlContent}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const renderExternalResource = (url: string) => {
    let embedUrl = url;
    if (url.includes('drive.google.com') && (url.includes('/view') || url.includes('/edit'))) {
        embedUrl = url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
    }

    return (
      <div className="w-full h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-inner flex flex-col relative group">
         <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <button onClick={() => window.open(url, '_blank')} className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-xl shadow-lg font-bold border-2 border-slate-200 text-xs flex items-center gap-2 transform hover:scale-105 transition-all">
                🖨️ प्रिंट / खोलें
             </button>
         </div>
         <iframe 
            src={embedUrl} 
            className="w-full flex-1 border-0" 
            allow="autoplay"
            title="External Resource"
         />
      </div>
    );
  };

  const renderQuiz = (quizData: QuizData) => {
    const score = quizData.questions.reduce((acc, q) => {
      return acc + (userAnswers[q.id] === q.correctAnswer ? 1 : 0);
    }, 0);

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 opacity-10 text-9xl transform translate-x-10 -translate-y-10">?</div>
           <h2 className="text-3xl font-black mb-2">{quizData.title}</h2>
           <p className="opacity-90">{chapter.language === 'hindi' ? 'सही विकल्प चुनें और अपना ज्ञान परखें।' : 'Choose the correct option and test your knowledge.'}</p>
           {finished && (
             <div className="mt-6 inline-block bg-white/20 backdrop-blur-md rounded-xl px-6 py-3 border border-white/30">
               <span className="text-2xl font-bold">
                 {chapter.language === 'hindi' ? 'परिणाम:' : 'Score:'} {score} / {quizData.questions.length}
               </span>
             </div>
           )}
        </div>

        <div className="space-y-6">
          {quizData.questions.map((q, idx) => {
            const isCorrect = userAnswers[q.id] === q.correctAnswer;
            const isSelected = !!userAnswers[q.id];
            
            return (
              <div key={q.id} className={`bg-white rounded-2xl shadow-sm border-2 p-6 transition-all ${finished ? (isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50') : 'border-slate-100 hover:border-violet-200'}`}>
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${finished ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{q.question}</h3>
                    <div className="grid gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          disabled={finished}
                          onClick={() => setUserAnswers(prev => ({...prev, [q.id]: opt}))}
                          className={`w-full text-left p-4 rounded-xl font-medium transition-all flex justify-between items-center ${
                            finished 
                              ? opt === q.correctAnswer 
                                ? 'bg-emerald-200 text-emerald-900 border-emerald-400 border' 
                                : userAnswers[q.id] === opt 
                                  ? 'bg-rose-200 text-rose-900 border-rose-400 border'
                                  : 'bg-white text-slate-400 border border-slate-100'
                              : userAnswers[q.id] === opt
                                ? 'bg-violet-600 text-white shadow-md transform scale-[1.01]'
                                : 'bg-slate-50 text-slate-700 hover:bg-violet-50 border border-transparent'
                          }`}
                        >
                          <span>{opt}</span>
                          {finished && opt === q.correctAnswer && <span>✅</span>}
                          {finished && userAnswers[q.id] === opt && opt !== q.correctAnswer && <span>❌</span>}
                        </button>
                      ))}
                    </div>
                    {/* Show explanation and correct answer clearly if the user was wrong */}
                    {finished && !isCorrect && (
                      <div className="mt-4 p-4 bg-rose-100/50 rounded-xl border border-rose-200 animate-fadeIn">
                        <p className="text-sm font-bold text-rose-800 mb-1">
                            ❌ {chapter.language === 'hindi' ? 'आपका उत्तर गलत है।' : 'Your answer is incorrect.'}
                        </p>
                        <p className="text-sm text-emerald-700 font-bold mb-2">
                            ✅ {chapter.language === 'hindi' ? 'सही उत्तर:' : 'Correct Answer:'} {q.correctAnswer}
                        </p>
                        {q.explanation && (
                            <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                                <strong>{chapter.language === 'hindi' ? 'व्याख्या:' : 'Explanation:'}</strong> {q.explanation}
                            </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show explanation if correct but has one */}
                    {finished && isCorrect && q.explanation && (
                      <div className="mt-4 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 border border-emerald-100">
                        <strong>{chapter.language === 'hindi' ? 'व्याख्या:' : 'Explanation:'}</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!finished && (
          <div className="text-center">
            <button 
              onClick={() => setFinished(true)}
              disabled={Object.keys(userAnswers).length !== quizData.questions.length}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chapter.language === 'hindi' ? 'परिणाम देखें' : 'Submit Quiz'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderWorksheet = (data: WorksheetData) => {
    return (
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 my-4 print:shadow-none print:border-none relative">
        {/* Floating Print Button for Worksheet */}
        <button 
            onClick={handlePrint}
            className="absolute top-4 right-4 bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold shadow-lg border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-2 z-10 no-print"
        >
            <span>🖨️</span> {chapter.language === 'hindi' ? 'प्रिंट करें' : 'Print Worksheet'}
        </button>

        {/* Header */}
        <div className="bg-slate-800 text-white p-8 text-center print:bg-white print:text-black print:border-b-2 print:border-black">
           <h2 className="text-3xl font-black mb-2 uppercase tracking-widest">{chapter.title}</h2>
           <div className="flex justify-center gap-8 text-sm font-bold text-slate-300 print:text-black">
             <span>{chapter.language === 'hindi' ? 'कुल अंक' : 'Total Marks'}: {data.totalMarks}</span>
             <span>•</span>
             <span>{chapter.language === 'hindi' ? 'समय' : 'Time'}: {data.duration}</span>
           </div>
        </div>

        <div className="p-8 sm:p-12 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
           <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg text-orange-900 italic">
              <strong>{chapter.language === 'hindi' ? 'सामान्य निर्देश:' : 'General Instructions:'}</strong> {data.generalInstructions}
           </div>

           {/* Section A */}
           {data.sections.sectionA && (
             <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <div className="bg-emerald-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-md">Section A</div>
                 <h3 className="text-xl font-bold text-emerald-800">{data.sections.sectionA.title}</h3>
               </div>
               <p className="text-slate-500 text-sm ml-2">{data.sections.sectionA.instructions}</p>
               <div className="grid gap-4">
                 {data.sections.sectionA.questions.map((q, i) => (
                   <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm break-inside-avoid">
                     <p className="font-bold text-slate-800 mb-3"><span className="text-emerald-600 mr-2">{i+1}.</span> {q.question}</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
                       {q.options.map((opt, idx) => (
                         <div key={idx} className="flex items-center gap-2 text-slate-600 text-sm">
                           <div className="w-4 h-4 rounded-full border border-slate-300"></div> {opt}
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {/* Section B */}
           {data.sections.sectionB && (
             <div className="space-y-6 pt-6 border-t border-slate-200 border-dashed">
               <div className="flex items-center gap-4">
                 <div className="bg-blue-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-md">Section B</div>
                 <h3 className="text-xl font-bold text-blue-800">{data.sections.sectionB.title}</h3>
               </div>
               <p className="text-slate-500 text-sm ml-2">{data.sections.sectionB.instructions}</p>
               <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <div className="grid md:grid-cols-2 gap-6">
                    {Object.entries(data.sections.sectionB.topics).map(([key, items]) => (
                      <div key={key}>
                        <h4 className="font-bold text-blue-900 mb-2 capitalize">{key.replace('topic', 'Topic ')}</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          {(items as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
               </div>
             </div>
           )}

           {/* Section C */}
           {data.sections.sectionC && (
             <div className="space-y-6 pt-6 border-t border-slate-200 border-dashed">
               <div className="flex items-center gap-4">
                 <div className="bg-purple-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-md">Section C</div>
                 <h3 className="text-xl font-bold text-purple-800">{data.sections.sectionC.title}</h3>
               </div>
               <p className="text-slate-500 text-sm ml-2">{data.sections.sectionC.instructions}</p>
               <div className="space-y-4">
                 {data.sections.sectionC.questions.map((q, i) => (
                   <div key={q.id} className="flex justify-between items-start gap-4 bg-white p-4 rounded-lg border border-slate-100 break-inside-avoid">
                     <p className="font-medium text-slate-800"><span className="font-bold text-purple-600 mr-2">{i+1}.</span> {q.question}</p>
                     <span className="font-bold text-slate-400 text-xs shrink-0">[{q.marks} {chapter.language === 'hindi' ? 'अंक' : 'Marks'}]</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (chapter.externalResources && chapter.externalResources[activeTab]) {
      return renderExternalResource(chapter.externalResources[activeTab]);
    }

    if (loading) return (
      <div className="flex flex-col items-center justify-center h-80 space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500"></div>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
        </div>
        <div className="text-center">
          <p className="text-orange-600 font-black text-xl animate-pulse">
            {chapter.language === 'hindi' ? 'आचार्य जी, सामग्री तैयार हो रही है...' : 'Generating content, please wait...'}
          </p>
        </div>
      </div>
    );

    if (activeTab === 'ek_jhalak' || activeTab === 'drishyamala') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-3xl border-4 border-dashed border-slate-200 space-y-4">
                <div className="text-6xl mb-4">{activeTab === 'ek_jhalak' ? '🖼️' : '🎬'}</div>
                <h3 className="text-2xl font-black text-slate-700">
                    {chapter.language === 'hindi' ? (activeTab === 'ek_jhalak' ? 'एक झलक' : 'दृश्यमाला') : (activeTab === 'ek_jhalak' ? 'Glimpse' : 'Visuals')}
                </h3>
                <p className="text-slate-500 max-w-md">
                    {chapter.language === 'hindi' ? 'इस पाठ के लिए अभी कोई सामग्री उपलब्ध नहीं है।' : 'No content available for this section yet.'}
                </p>
            </div>
        );
    }

    const content = cache[activeTab];
    if (!content && activeTab !== 'mool_path') {
      return (
        <div className="text-center py-24 bg-white rounded-3xl border-4 border-dashed border-slate-200">
          <div className="text-6xl mb-6">✨</div>
          <h3 className="text-2xl font-black text-slate-700 mb-6 italic">
            {chapter.language === 'hindi' ? 'आचार्य जी, यह अनुभाग अभी रिक्त है।' : 'This section is currently empty.'}
          </h3>
          <button onClick={() => handleTabClick(activeTab)} className="bg-orange-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-2xl hover:bg-orange-700 transition-all">
            {chapter.language === 'hindi' ? 'AI से अभी तैयार करवाएँ' : 'Generate with AI'}
          </button>
        </div>
      );
    }

    // Try parsing as JSON for special tabs
    if (content && (activeTab === 'quiz')) {
        const quizData = tryParseJSON(content);
        if (quizData) return renderQuiz(quizData);
    }

    if (content && (activeTab === 'worksheet')) {
        const worksheetData = tryParseJSON(content);
        if (worksheetData) return renderWorksheet(worksheetData);
    }

    return (
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 animate-fadeIn min-h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b-4 border-slate-50 pb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 devanagari-title">
            <span className="text-orange-500 mr-4">॥</span>{chapter.title}
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => onToggleFullScreen(!isFullScreen)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs transition-all border-2 shadow-sm ${isFullScreen ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {isFullScreen ? (chapter.language === 'hindi' ? "🖥️ सामान्य" : "🖥️ Normal") : (chapter.language === 'hindi' ? "🖥️ विस्तृत" : "🖥️ Full Screen")}
            </button>
            <button onClick={handlePrint} className="flex-1 sm:flex-none bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-100 border-2 border-indigo-200 transition-all shadow-sm flex items-center gap-1">
              <span>🖨️</span> {chapter.language === 'hindi' ? 'प्रिंट / PDF' : 'Print / PDF'}
            </button>
          </div>
        </div>
        {content ? (
          <div className="rich-content text-lg sm:text-xl leading-relaxed text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: content || '' }} />
        ) : (
          <div className="text-center py-20 text-slate-400">
            <p className="text-xl">{chapter.language === 'hindi' ? 'सामग्री लोड हो रही है...' : 'Loading content...'}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden border-4 border-white shadow-2xl no-print relative">
      <div className="bg-slate-900 p-4 shrink-0 shadow-lg z-20">
        <div className="flex flex-col gap-3">
          {[1, 2].map((rowNum) => (
            <div key={rowNum} className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-2">
              {TABS.filter(t => t.row === rowNum).map(t => {
                const isActive = activeTab === t.id;
                const isGenerated = !!cache[t.id];
                const hasExternal = chapter.externalResources && chapter.externalResources[t.id];
                const label = chapter.language === 'english' ? t.labelEn : t.labelHi;
                
                return (
                  <button 
                    key={t.id} 
                    onClick={() => handleTabClick(t.id)} 
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all border-b-4 whitespace-nowrap tracking-wide ${
                      isActive 
                        ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white border-orange-800 translate-y-[-2px] shadow-lg' 
                        : hasExternal
                          ? 'bg-blue-600 text-white border-blue-800 opacity-90 hover:opacity-100'
                          : isGenerated 
                            ? 'bg-emerald-700 text-white border-emerald-900 opacity-90 hover:opacity-100' 
                            : 'bg-slate-800 text-slate-400 border-slate-950 hover:text-white'
                    }`}
                  >
                    {hasExternal && <span className="mr-1">🔗</span>} {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-reader-scrollbar z-10">{renderContent()}</div>
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-reader-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-reader-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .rich-content h3 { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-top: 1.5rem; margin-bottom: 0.75rem; border-left: 5px solid #f97316; padding-left: 10px; }
        .rich-content ul { margin-bottom: 1.5rem; padding-left: 1.5rem; }
        .rich-content li { margin-bottom: 0.5rem; position: relative; list-style-type: none; }
        .rich-content li::before { content: '🔸'; position: absolute; left: -1.5rem; top: 0; }
        .mindmap-wrapper { overflow-x: auto; padding: 20px; display: flex; justify-content: center; }
        .tree ul { position: relative; padding-top: 20px; transition: all 0.5s; display: flex; justify-content: center; margin: 0; }
        .tree li { float: left; text-align: center; list-style-type: none; position: relative; padding: 20px 5px 0 5px; transition: all 0.5s; }
        .tree li::before, .tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid #cbd5e1; width: 50%; height: 20px; }
        .tree li::after { right: auto; left: 50%; border-left: 2px solid #cbd5e1; }
        .tree li:only-child::after, .tree li:only-child::before { display: none; }
        .tree li:only-child { padding-top: 0; }
        .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
        .tree li:last-child::before { border-right: 2px solid #cbd5e1; border-radius: 0 5px 0 0; }
        .tree li:first-child::after { border-radius: 5px 0 0 0; }
        .tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid #cbd5e1; width: 0; height: 20px; }
        .tree .node { display: inline-block; border: 2px solid #e2e8f0; padding: 10px 15px; text-decoration: none; color: #1e293b; font-family: 'Hind', sans-serif; font-size: 14px; font-weight: 700; border-radius: 10px; transition: all 0.5s; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); position: relative; z-index: 10; }
        .tree .node:hover { transform: scale(1.05); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); z-index: 20; }
        .root-node { background: linear-gradient(135deg, #f97316, #fb923c); color: white !important; border-color: #c2410c !important; font-size: 18px !important; padding: 15px 25px !important; }
        .category-node { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white !important; border-color: #4338ca !important; }
        .leaf-node { background: #f0fdf4; border-color: #86efac !important; color: #166534 !important; }
        .tree .detail { display: block; font-size: 10px; color: #64748b; font-weight: normal; margin-top: 4px; }
      `}} />
    </div>
  );
};

export default ReaderPanel;
