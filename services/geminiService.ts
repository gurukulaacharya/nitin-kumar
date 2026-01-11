
import { GoogleGenAI, Type } from "@google/genai";

// ... (Existing code remains the same) ...

export async function extractTextFromImage(base64Image: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using flash for fast vision tasks
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity, works for PNG too usually
              data: base64Image
            }
          },
          {
            text: "Please extract all the Hindi and English text from this image accurately. Maintain the original paragraph structure. Do not add any introductory or concluding remarks, just the extracted text."
          }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("इमेज से टेक्स्ट निकालने में विफल।");
  }
}

export async function generateHindiContent(title: string, context: string, type: string, classLevel: string = '10', isGrammar: boolean = false, language: 'hindi' | 'english' = 'hindi'): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const lowerType = type.toLowerCase();
  const isWorksheet = lowerType.includes('कार्यपत्रिका') || lowerType.includes('worksheet');
  const isLessonPlan = lowerType.includes('पाठ योजना') || lowerType.includes('lesson plan');
  const isQuiz = lowerType.includes('क्विज़') || lowerType.includes('quiz');
  const isInterdisciplinary = lowerType.includes('अंतर्विषयक') || lowerType.includes('interdisciplinary') || lowerType.includes('vimarsh');
  const isMindMap = lowerType.includes('माइंड मैप') || lowerType.includes('mind map');
  
  // New detection types for missing content
  const isAuthorBio = lowerType.includes('author_bio') || lowerType.includes('lekhak');
  const isVocabulary = lowerType.includes('vocabulary') || lowerType.includes('shabdarth');
  const isQA = lowerType.includes('qa') || lowerType.includes('prashn');
  const isMuhavare = lowerType.includes('muhavare') || lowerType.includes('मुहावरे');
  
  // Detect Writing Skills
  const isWritingSkill = title.includes('लेखन') || title.includes('Writing') || title.includes('विज्ञापन') || title.includes('पत्र');

  // Detect Grammar Extraction from Literature (Not generic grammar book topics)
  const isGrammarExtraction = !isGrammar && (
      lowerType.includes('संधि') || 
      lowerType.includes('समास') || 
      lowerType.includes('उपसर्ग') || 
      lowerType.includes('प्रत्यय') || 
      lowerType.includes('पदबंध') || 
      lowerType.includes('मुहावरे') || 
      lowerType.includes('अनुस्वार') || 
      lowerType.includes('अनुनासिक') || 
      lowerType.includes('विराम') || 
      lowerType.includes('वाक्य') ||
      lowerType.includes('idiom') ||
      lowerType.includes('tense') ||
      lowerType.includes('modal') ||
      lowerType.includes('clause') ||
      lowerType.includes('voice')
  );

  // --- STRICT JSON SCHEMAS ---
  
  const quizSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            type: { type: Type.STRING, description: "Category: 'fact', 'spelling', or 'grammar'" },
            skill: { type: Type.STRING, description: "Skill code: A, K, M, U, V, or C" },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING, description: "The exact string of the correct option" },
            explanation: { type: Type.STRING, description: language === 'english' ? "Short explanation in English" : "Short explanation in Hindi" }
          },
          required: ["id", "type", "question", "options", "correctAnswer", "skill"]
        }
      }
    },
    required: ["title", "questions"]
  };

  const worksheetSchema = {
    type: Type.OBJECT,
    properties: {
      totalMarks: { type: Type.INTEGER },
      duration: { type: Type.STRING },
      generalInstructions: { type: Type.STRING },
      sections: {
        type: Type.OBJECT,
        properties: {
          sectionA: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "question", "options"]
                }
              }
            }
          },
          sectionB: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              topics: {
                type: Type.OBJECT,
                properties: {
                  topic1: { type: Type.ARRAY, items: { type: Type.STRING } },
                  topic2: { type: Type.ARRAY, items: { type: Type.STRING } },
                  topic3: { type: Type.ARRAY, items: { type: Type.STRING } },
                  topic4: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          },
          sectionC: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    marks: { type: Type.INTEGER }
                  },
                  required: ["id", "question", "marks"]
                }
              }
            }
          }
        }
      }
    },
    required: ["totalMarks", "duration", "generalInstructions", "sections"]
  };

  // --- RICH HTML PROMPTS ---

  const baseStyleInstructions = language === 'english' ? `
    Important Instructions (Presentation):
    1. Provide the answer in pure English.
    2. Output must be in HTML format.
    3. Make content attractive using 'colorful-box' and 'bullet-points'.
    4. Use <h3 class="section-title">...</h3> for headings.
    5. Use <ul class="styled-list">...</ul> for main points.
    6. Put important facts in <div class="highlight-box">...</div>.
  ` : `
    महत्वपूर्ण निर्देश (Presentation):
    1. उत्तर केवल शुद्ध हिंदी में दें।
    2. आउटपुट HTML फॉर्मेट में होना चाहिए।
    3. सामग्री को 'colorful-box' और 'bullet-points' का उपयोग करके आकर्षक बनाएं।
    4. शीर्षक (Headings) के लिए <h3 class="section-title">...</h3> का प्रयोग करें।
    5. मुख्य बिंदुओं के लिए <ul class="styled-list">...</ul> का प्रयोग करें।
    6. महत्वपूर्ण तथ्यों को <div class="highlight-box">...</div> में रखें।
  `;

  const mindMapPrompt = `
    Subject: "${title}" (Class ${classLevel}).
    Task: Create a 'Mind Map' for this chapter.
    
    Instructions:
    1. Create a nested list structure in HTML.
    2. The root should be the Chapter Name.
    3. Branches: Main Characters, Plot Events, Themes/Message, and Language Style.
    
    Strict HTML Structure:
    <div class="mindmap-wrapper">
      <ul class="tree">
        <li>
          <div class="node root-node">${title}</div>
          <ul>
             <li>
               <div class="node category-node">Main Characters</div>
               <ul>
                 <li><div class="node leaf-node">Character 1 <br><span class="detail">Trait</span></div></li>
               </ul>
             </li>
             <!-- Other branches similarly -->
          </ul>
        </li>
      </ul>
    </div>
    ${baseStyleInstructions}
  `;

  const worksheetPrompt = `
    You are a strict examiner. Create a Worksheet/Test Paper based on: "${title}" (Class ${classLevel}).
    Strict Instruction: Do NOT provide answers. Follow JSON structure.
    (Schema details handled by config)
  `;

  const lessonPlanPrompt = `
    You are a senior teacher. Subject: "${title}" (Class ${classLevel}).
    Task: Create a lesson plan focusing on methodology and teaching points. Do not mention specific timings.
    
    Structure the HTML response using these classes:
    - <div class="card methodology-card"> for sections.
    - <h3 class="card-title icon-teach"> for titles.
    - <ul class="check-list"> for bullet points.
    
    Sections:
    1. Learning Objectives (Introduction)
    2. Reading & Presentation Strategy
    3. Explanation & Concept Clarity
    4. Common Mistakes & Grammar focus
    5. Creative Activity / Homework
    ${baseStyleInstructions}
  `;

  const interdisciplinaryPrompt = `
    You are an expert in "Integrated Learning".
    Subject: "${title}" (Class ${classLevel})
    
    Task: Connect this chapter with other subjects (History, Geography, Science, Civics, Art).
    
    Instructions:
    1. Use bullet points.
    2. Connect to at least 4-5 subjects.
    3. Presentation should be colorful.
    
    HTML Structure:
    <div class="interdisciplinary-container">
      <div class="subject-card history">
        <div class="subject-header">⏳ History Connection</div>
        <ul class="subject-list"><li>...</li></ul>
      </div>
      <!-- Repeat for Geography, Civics, Science, Art -->
    </div>
    ${baseStyleInstructions}
  `;

  const grammarPrompt = `
    Subject: Grammar - "${title}"
    Detailed Context/Definition: ${context}
    
    Task: Create an extremely detailed, high-quality, and engaging explanation for this grammar topic.
    If the topic allows (like Varnmala, Shabd Bhed, or Tatsam/Tadbhav), YOU MUST USE HTML TABLES to categorize information cleanly.
    
    HTML Presentation Rules:
    - Use <div class="content-card"> wrapper.
    - Main Definition in <div class="highlight-box">.
    - Classifications/Types in <div class="card methodology-card"> with <h3 class="card-title">.
    - Examples in <ul class="colorful-bullets">.
    - Use <table class="w-full border-collapse border border-slate-300 my-4"> for classifications (like Vowels/Consonants, Tatsam/Tadbhav, etc).
    - Table headers should have <th class="bg-orange-100 p-2 border border-slate-300">.
    - Table cells should have <td class="p-2 border border-slate-300">.
    
    Content Structure:
    1. Detailed Definition (Simple words).
    2. Deep Classification (Bhed) with definitions for each sub-type.
    3. Rules for Identification - Tricks and Tips.
    4. Extensive List of Examples (Use tables where possible).
    5. Special Exceptions or Notes.
    ${baseStyleInstructions}
  `;

  const grammarExtractionPrompt = `
    You are a strict Hindi Grammar Expert.
    Task: Analyze the provided chapter text "${title}" and extract ALL examples of "${type}".
    
    Context Text:
    ${context}

    CRITICAL INSTRUCTIONS:
    1. You MUST read the ENTIRE text provided above. Do not skip any part. Do not hallucinate, only use words/sentences from the text.
    2. Your goal is to be EXHAUSTIVE. For example, if looking for 'Muhavare', find every single idiom used in the story (e.g., for 'Bade Bhai Sahab', there are over 50 idioms, find them all). If looking for 'Padbandh', find at least 20 examples if available.
    3. Output MUST be a structured HTML Table.
    
    Output Format (HTML):
    <div class="grammar-extraction-container">
      <h3 class="text-xl font-bold mb-4 text-center text-slate-800">पाठ में प्रयुक्त ${type}</h3>
      <p class="mb-4 text-sm text-slate-500 text-center">Note: This list is generated from the text provided.</p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-slate-300 shadow-sm bg-white rounded-lg">
          <thead>
            <tr class="bg-orange-100 text-orange-900">
              <th class="border border-slate-300 p-3 text-left">क्रम (No.)</th>
              <th class="border border-slate-300 p-3 text-left">उदाहरण (Example)</th>
              <th class="border border-slate-300 p-3 text-left">विश्लेषण (Analysis/Meaning)</th>
              ${type.includes('मुहावरे') || type.includes('Padbandh') || type.includes('Vakya') ? '<th class="border border-slate-300 p-3 text-left">वाक्य प्रयोग / संदर्भ (Context)</th>' : ''}
            </tr>
          </thead>
          <tbody>
            <!-- Generate rows here. Example: -->
            <!--
            <tr class="hover:bg-slate-50">
                <td class="border border-slate-300 p-2 text-center">1</td>
                <td class="border border-slate-300 p-2 font-bold text-slate-800">...</td>
                <td class="border border-slate-300 p-2 text-slate-700">...</td>
                <td class="border border-slate-300 p-2 text-sm italic text-slate-600">...</td>
            </tr>
            -->
          </tbody>
        </table>
      </div>
    </div>

    ${baseStyleInstructions}
  `;

  const writingPrompt = `
    Subject: Writing Skills (Rachnatmak Lekhan) - "${title}"
    Context: ${context}
    
    Task: Create a comprehensive guide on this writing skill for students.
    
    HTML Presentation Rules:
    - Use <div class="content-card"> wrapper.
    - Title in <div class="highlight-box">.
    - Format/Rules in <div class="card methodology-card">.
    - Examples in <div class="example-box" style="border: 2px dashed #666; padding: 15px; margin: 10px 0; background: #fffaf0; position: relative;">.
    
    Content Structure:
    1. Definition (What is it?)
    2. Key Features / Format (Praroop) - Explain structure clearly (e.g. Sender's Address, Date, Subject).
    3. Tips for scoring full marks.
    4. SOLVED EXAMPLES (Provide at least 2 distinct examples).
       - For 'Vigyapan' (Advertisement), ensure the example looks like an Ad Box (use border style). Include Slogan and Contact info clearly.
       - For 'Patra' (Letter), show correct indentation and format.
       - For 'Anuched' (Paragraph), show flow and structure.
    ${baseStyleInstructions}
  `;

  const quizPrompt = `
    Chapter: "${title}". Create 20 Multiple Choice Questions (MCQ). JSON is mandatory.
    10 Questions (Fact/Content Based) - Skill Tags: K, U, M, A, V, C.
    5 Questions (Spelling/Vocabulary).
    5 Questions (Grammar Level).
  `;

  const authorBioPrompt = `
    Write a biography of the author/poet for the chapter: "${title}".
    Context Text: ${context.substring(0, 500)}...
    
    ${baseStyleInstructions}
    
    Content Structure:
    1. <div class="highlight-box">Author Name & Lifespan</div>
    2. Early Life & Education
    3. Major Works (Bullet points)
    4. Literary Style
    5. Awards & Recognition
  `;

  const vocabularyPrompt = `
    Extract difficult words and their meanings from: "${title}".
    Context: ${context.substring(0, 1000)}...

    ${baseStyleInstructions}
    
    Output in HTML Table format:
    <table class="w-full">
      <thead><tr><th>Word</th><th>Meaning</th></tr></thead>
      <tbody>
         <tr><td>Word 1</td><td>Meaning 1</td></tr>
         ...
      </tbody>
    </table>
    Select at least 15-20 difficult words.
  `;

  const qaPrompt = `
    Create Questions & Answers based on the chapter: "${title}".
    Context: ${context}...

    ${baseStyleInstructions}

    Categories:
    1. <h3 class="section-title">Short Questions</h3> - 5 Questions
    2. <h3 class="section-title">Descriptive Questions (30-40 words)</h3> - 5 Questions
    3. <h3 class="section-title">Value Based / Contextual Questions</h3> - 2 Questions

    Write the precise answer after each question.
  `;

  const generalPrompt = `
    Subject: "${type}" | Chapter: "${title}". 
    ${baseStyleInstructions}
    Please provide a detailed explanation. 
    Use <div class="content-card"> wrapper.
    Use <h3 class="gradient-text"> for headings.
    Use <ul class="colorful-bullets"> for lists.
  `;

  let finalPrompt = generalPrompt;
  let config: any = { temperature: 0.3 };
  let selectedModel = 'gemini-3-flash-preview'; // Default model

  if (isWorksheet) {
    finalPrompt = worksheetPrompt;
    config.responseMimeType = "application/json";
    config.responseSchema = worksheetSchema;
  } else if (isLessonPlan) {
    finalPrompt = lessonPlanPrompt;
    config.temperature = 0.5;
  } else if (isQuiz) {
    finalPrompt = quizPrompt;
    config.responseMimeType = "application/json";
    config.responseSchema = quizSchema;
  } else if (isInterdisciplinary) {
    finalPrompt = interdisciplinaryPrompt;
    config.temperature = 0.6;
  } else if (isMindMap) {
    finalPrompt = mindMapPrompt;
    config.temperature = 0.4;
  } else if (isWritingSkill) {
    finalPrompt = writingPrompt;
    config.temperature = 0.4;
  } else if (isGrammar) {
    finalPrompt = grammarPrompt;
    config.temperature = 0.3;
  } else if (isGrammarExtraction) {
    finalPrompt = grammarExtractionPrompt;
    config.temperature = 0.1; // Low temperature for extraction accuracy
    selectedModel = 'gemini-3-flash-preview'; // Large context window needed for full chapter
  } else if (isAuthorBio) {
    finalPrompt = authorBioPrompt;
    config.temperature = 0.3;
  } else if (isVocabulary) {
    finalPrompt = vocabularyPrompt;
    config.temperature = 0.2;
  } else if (isQA) {
    finalPrompt = qaPrompt;
    config.temperature = 0.4;
  } 

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: finalPrompt,
      config: config
    });
    
    return response.text || "{}";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "{}";
  }
}
