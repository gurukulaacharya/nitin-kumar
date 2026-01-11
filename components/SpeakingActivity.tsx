
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

const SpeakingActivity: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAnalysis(null);
    } catch (err) {
      console.error("माइक्रोफोन एक्सेस एरर:", err);
      alert("कृपया माइक्रोफोन एक्सेस की अनुमति दें।");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const analyzeAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    setLoading(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: base64Data
                }
              },
              {
                text: `
                You are a senior Hindi language teacher. Analyze this audio recording of a student.
                Provide the output strictly in HTML format (do not use markdown code blocks).
                
                Structure the HTML as follows:
                <div class="report-container">
                  <div class="score-summary">
                     <!-- Create a table or grid for scores -->
                     <table class="score-table">
                       <tr><th>मापदंड (Criteria)</th><th>अंक (Score / 10)</th></tr>
                       <tr><td>आत्मविश्वास (Confidence)</td><td>...</td></tr>
                       <tr><td>आरोह-अवरोह (Intonation)</td><td>...</td></tr>
                       <tr><td>उच्चारण (Pronunciation)</td><td>...</td></tr>
                       <tr><td>प्रवाह (Fluency)</td><td>...</td></tr>
                       <tr><td>व्याकरण (Grammar)</td><td>...</td></tr>
                     </table>
                  </div>
                  
                  <div class="feedback-section">
                    <h3>🌟 प्रशंसनीय बिंदु (Strengths)</h3>
                    <ul><li>...</li></ul>
                    
                    <h3>💡 सुधार के क्षेत्र (Areas for Improvement)</h3>
                    <ul><li>...</li></ul>
                    
                    <h3>📝 विस्तृत टिप्पणी (Teacher's Comment)</h3>
                    <p>...</p>
                  </div>
                </div>

                Keep the tone encouraging, professional, and formal Hindi.
                `
              }
            ]
          }
        });

        // Clean up response if it contains markdown code blocks
        let text = response.text || "विश्लेषण उपलब्ध नहीं है।";
        text = text.replace(/```html/g, '').replace(/```/g, '');
        
        setAnalysis(text);
      } catch (error) {
        console.error("AI Analysis Error:", error);
        setAnalysis("क्षमा करें, विश्लेषण के दौरान त्रुटि हुई। कृपया पुनः प्रयास करें।");
      } finally {
        setLoading(false);
      }
    };
  };

  const handlePrint = () => {
    if (!analysis) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("कृपया पॉप-अप को अनुमति दें।");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>वाचन कौशल मूल्यांकन रिपोर्ट</title>
          <style>
            body { font-family: 'Hind', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 28px; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            
            .score-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .score-table th, .score-table td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
            .score-table th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
            .score-table td:last-child { font-weight: bold; color: #059669; text-align: center; width: 100px; }
            
            .feedback-section h3 { color: #d97706; border-left: 4px solid #d97706; padding-left: 10px; margin-top: 25px; font-size: 18px; }
            .feedback-section ul { padding-left: 20px; }
            .feedback-section li { margin-bottom: 8px; line-height: 1.5; }
            .feedback-section p { line-height: 1.6; color: #334155; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="header">
            <h1>गुरुकुल आचार्य</h1>
            <p>वाचन कौशल मूल्यांकन रिपोर्ट (Oral Assessment Report)</p>
          </div>
          ${analysis}
          <div class="footer">
            शिक्षक हस्ताक्षर: ____________________ | दिनांक: ${new Date().toLocaleDateString('hi-IN')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shrink-0">
        <h2 className="text-2xl font-black devanagari-title flex items-center gap-3">
          <span>🎙️</span> वाचन कौशल गतिविधि
        </h2>
        <p className="text-emerald-100 text-sm mt-1">छात्र की वाणी का गहन विश्लेषण और मूल्यांकन</p>
      </div>

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-8 bg-slate-50/50">
        {/* Recording Controls */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center space-y-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner ${isRecording ? 'bg-rose-100 animate-pulse ring-4 ring-rose-200' : 'bg-emerald-50 ring-4 ring-emerald-100'}`}>
            <span className={`text-4xl ${isRecording ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isRecording ? '⏹️' : '🎤'}
            </span>
          </div>
          
          <div className="flex gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all flex items-center gap-2 active:scale-95"
              >
                🔴 रिकॉर्डिंग शुरू करें
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-rose-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-rose-700 hover:shadow-xl transition-all flex items-center gap-2 active:scale-95"
              >
                ⏹️ रिकॉर्डिंग बंद करें
              </button>
            )}
          </div>

          {audioUrl && !isRecording && (
            <div className="w-full max-w-md pt-6 border-t border-slate-100 flex flex-col items-center gap-4 animate-fadeIn">
              <audio src={audioUrl} controls className="w-full shadow-sm rounded-full" />
              <button
                onClick={analyzeAudio}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg'}`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    आचार्य विश्लेषण कर रहे हैं...
                  </>
                ) : (
                  <>✨ एआई विश्लेषण प्राप्त करें</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        {analysis && (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500"></div>
            
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-2xl">📝</span> मूल्यांकन रिपोर्ट
                </h3>
                <button 
                    onClick={handlePrint}
                    className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-2"
                >
                    🖨️ प्रिंट करें
                </button>
            </div>

            <div 
                className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-['Hind']"
                dangerouslySetInnerHTML={{ __html: analysis }} 
            />
            
            <style dangerouslySetInnerHTML={{ __html: `
                .score-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
                .score-table th { background: #f8fafc; padding: 12px; text-align: left; color: #475569; font-weight: 800; border-bottom: 1px solid #e2e8f0; }
                .score-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
                .score-table tr:last-child td { border-bottom: none; }
                .score-table td:last-child { font-weight: 900; color: #059669; text-align: center; background: #f0fdf4; }
                
                .feedback-section h3 { color: #d97706; margin-top: 25px; margin-bottom: 10px; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 8px; }
                .feedback-section ul { list-style: none; padding: 0; margin-bottom: 20px; }
                .feedback-section li { padding-left: 20px; position: relative; margin-bottom: 8px; }
                .feedback-section li::before { content: '•'; color: #cbd5e1; position: absolute; left: 0; font-weight: bold; font-size: 1.2em; }
            `}} />
          </div>
        )}

        {!analysis && !loading && !isRecording && !audioUrl && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="text-4xl mb-4">📢</div>
            <p className="text-lg font-bold text-slate-500 mb-2">अध्यापन निर्देश</p>
            <ul className="text-sm space-y-2 text-center">
              <li>१. छात्र को कोई अनुच्छेद पढ़ने के लिए कहें।</li>
              <li>२. रिकॉर्ड बटन दबाकर वाचन शुरू करें।</li>
              <li>३. अंत में 'एआई विश्लेषण' पर क्लिक करें।</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakingActivity;
