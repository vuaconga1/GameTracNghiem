/** English for Logistics (DB typo: "Logictics"). */

export const LOGISTICS_LEVEL = 'English For Logictics';

export type LogisticsCourseSeed = {
  id: string;
  name: string;
  /** Short key for externalId prefixes. */
  key: string;
  speakingTitle: string;
};

/** Stable Neon/local course IDs under English For Logictics. */
export const LOGISTICS_COURSES: LogisticsCourseSeed[] = [
  {
    id: 'cms9s0qua0004asx5au4ku2sj',
    name: 'Level 1: English for Logistics & Supply Chain',
    key: 'L1-SUPPLY',
    speakingTitle: 'Chat about logistics and supply chain',
  },
  {
    id: 'cms9s0qiw0002asx52eskrt6a',
    name: 'Level 1: Supply Chain Management English',
    key: 'L1-SCM',
    speakingTitle: 'Chat about supply chain management',
  },
  {
    id: 'cms9s1gux0006asx5s17horih',
    name: 'Level 2: Logistics & Operations Vocabulary',
    key: 'L2-OPS',
    speakingTitle: 'Chat about logistics operations',
  },
  {
    id: 'cms9s1h5h0008asx5pva57imn',
    name: 'Level 2: Urgent Calls & Booking Container Space',
    key: 'L2-BOOKING',
    speakingTitle: 'Chat about booking container space',
  },
];

export function isLogisticsLevel(levelName: string | null | undefined): boolean {
  return /logi[sc]tics/i.test(String(levelName || ''));
}
