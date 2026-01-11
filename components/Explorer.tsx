
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const Explorer: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'नमस्ते आचार्य जी! मैं आपका डिजिटल सहायक हूँ। आप मुझसे हिंदी साहित्य, व्याकरण या शिक्षण विधि से जुड़ा कोई भी प्रश्न पूछ सकते हैं।'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct history for context, limited to last few turns to save tokens
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: history,
        config: {
          systemInstruction: 'You are a helpful, polite, and knowledgeable Hindi teaching assistant. Answer primarily in Hindi. Keep answers concise, accurate, and suitable for a classroom setting.',
        }
      });

      const result = await chat.sendMessage({ message: inputText });
      const responseText = result.text;

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "क्षमा करें, मैं उत्तर नहीं दे पाया।"
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "त्रुटि: अभी संपर्क स्थापित नहीं हो पा रहा है। कृपया पुनः प्रयास करें।"
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white shadow-md z-10">
        <h2 className="text-xl font-black devanagari-title flex items-center gap-2">
          <span>🔍</span> ज्ञान अन्वेषण (Explorer)
        </h2>
        <p className="text-violet-100 text-xs mt-1 opacity-90">अपने आचार्य से सीधे बात करें</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              {msg.role === 'model' && <span className="mr-2 text-lg">🤖</span>}
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-xs text-slate-400 font-bold ml-2">विचार कर रहे हैं...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-end gap-2 bg-slate-100 p-2 rounded-xl border border-slate-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="यहाँ प्रश्न लिखें... (उदा० 'समास के कितने भेद हैं?')"
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2 text-slate-700 placeholder-slate-400 text-sm font-medium"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || loading}
            className={`p-3 rounded-lg flex-shrink-0 transition-all ${
              !inputText.trim() || loading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-violet-600 text-white hover:bg-violet-700 shadow-md active:scale-95'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          AI गलतियाँ कर सकता है। कृपया महत्वपूर्ण तथ्यों की जाँच करें।
        </p>
      </div>
    </div>
  );
};

export default Explorer;
