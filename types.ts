
export type ClassLevel = '9' | '10' | 'All' | 'Custom';

export interface Chapter {
  id: string;
  title: string;
  // Updated to include English book names
  book: 'Sparsh' | 'Sanchayan' | 'Beehive' | 'Moments' | 'First Flight' | 'Footprints' | 'Grammar' | 'Writing' | 'Correction' | 'Custom';
  class: ClassLevel;
  language: 'hindi' | 'english'; // New field
  // Content file reference
  contentFile?: string;
  // Detailed content is now loaded asynchronously
  originalText?: string;
  authorBio?: string;
  vocabulary?: string;
  enrichment?: string;
  qa?: string;
  // New field for External Google Drive Links (Key = tabId, Value = URL)
  externalResources?: Record<string, string>;
}

export type TabType = string;

export interface BoardElement {
  id: string;
  type: 'draw';
  points: { x: number; y: number }[];
  color: string;
  size: number;
}
