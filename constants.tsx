
import { Chapter } from './types';

export const COLORS = {
  primary: 'bg-orange-500',
  secondary: 'bg-indigo-600',
  accent1: 'bg-emerald-500',
  accent2: 'bg-rose-500',
  light: 'bg-orange-50',
  sidebar: 'bg-[#2D1B4E]' // Deep vibrant purple for sidebar base
};

export const TABS = [
  // --- Row 1: Fixed Content & Key Teaching Tools ---
  { id: 'mool_path', labelHi: '📖 मूल पाठ', labelEn: '📖 Original Text', isFixed: true, row: 1 },
  { id: 'lekhak', labelHi: '👤 लेखक/कवि', labelEn: '👤 Author/Poet', isFixed: true, row: 1 },
  { id: 'vocabulary', labelHi: '📑 शब्दार्थ', labelEn: '📑 Vocabulary', isFixed: true, row: 1 },
  { id: 'qa', labelHi: '❓ प्रश्न-उत्तर', labelEn: '❓ Q & A', isFixed: true, row: 1 },
  { id: 'enrichment', labelHi: '🌟 योग्यता विस्तार', labelEn: '🌟 Enrichment', isFixed: false, row: 1 },
  { id: 'lesson_plan', labelHi: '📅 पाठ योजना', labelEn: '📅 Lesson Plan', isFixed: false, row: 1 },
  { id: 'quiz', labelHi: '📝 क्विज़', labelEn: '📝 Quiz', isFixed: false, row: 1 },
  { id: 'worksheet', labelHi: '📋 कार्यपत्रिका', labelEn: '📋 Worksheet', isFixed: false, row: 1 },
  { id: 'antarvishayi', labelHi: '🌐 अंतर्विषयक', labelEn: '🌐 Interdisciplinary', isFixed: false, row: 1 },
  { id: 'vyakhya', labelHi: '💡 व्याख्या', labelEn: '💡 Explanation', isFixed: false, row: 1 },
  { id: 'ek_jhalak', labelHi: '👀 एक झलक', labelEn: '👀 Glimpse', isFixed: false, row: 1 },
  { id: 'drishyamala', labelHi: '🎬 दृश्यमाला', labelEn: '🎬 Visuals', isFixed: false, row: 1 },
  { id: 'mind_map', labelHi: '🧠 माइंड मैप', labelEn: '🧠 Mind Map', isFixed: false, row: 1 },
  
  // --- Row 2: Grammar Topics (Dynamic mapping in ReaderPanel based on Language) ---
  // These IDs are generic enough or will be mapped dynamically
  { id: 'grammar_1', labelHi: 'संधि', labelEn: 'Tenses', isFixed: false, row: 2 },
  { id: 'grammar_2', labelHi: 'समास', labelEn: 'Modals', isFixed: false, row: 2 },
  { id: 'grammar_3', labelHi: 'उपसर्ग', labelEn: 'Determiners', isFixed: false, row: 2 },
  { id: 'grammar_4', labelHi: 'प्रत्यय', labelEn: 'Sub-Verb Concord', isFixed: false, row: 2 },
  { id: 'grammar_5', labelHi: 'पदबंध', labelEn: 'Clauses', isFixed: false, row: 2 },
  { id: 'grammar_6', labelHi: 'मुहावरे', labelEn: 'Idioms', isFixed: false, row: 2 },
  { id: 'grammar_7', labelHi: 'अनुस्वार', labelEn: 'Reported Speech', isFixed: false, row: 2 },
  { id: 'grammar_8', labelHi: 'विराम चिह्न', labelEn: 'Punctuation', isFixed: false, row: 2 },
  { id: 'grammar_9', labelHi: 'रचना (वाक्य)', labelEn: 'Voice (Active/Passive)', isFixed: false, row: 2 },
  { id: 'grammar_10', labelHi: 'अर्थ (वाक्य)', labelEn: 'Transformation', isFixed: false, row: 2 },
];
