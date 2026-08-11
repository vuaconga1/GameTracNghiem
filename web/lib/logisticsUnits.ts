/** English for Logistics (DB typo: "Logictics"). */

export const LOGISTICS_LEVEL = 'English For Logictics';

export type LogisticsCourseSeed = {
  id: string;
  name: string;
  /** Short key for externalId prefixes. */
  key: string;
  speakingTitle: string;
};

/** Week 1 — existing Logistics units. */
export const LOGISTICS_WEEK1_COURSES: LogisticsCourseSeed[] = [
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

/** Week 2 — Phone / Container / Dangerous Goods. */
export const LOGISTICS_WEEK2_COURSES: LogisticsCourseSeed[] = [
  {
    id: 'cmlgw2phn0001asx5a0000001',
    name: 'Level 1: Phone Etiquette & Basic Cargo Enquiries',
    key: 'W2-PHONE',
    speakingTitle: 'Practice phone etiquette and cargo enquiries',
  },
  {
    id: 'cmlgw2ctr0002asx5a0000002',
    name: 'Level 1: Container Types & Loading Specs',
    key: 'W2-CONTAINER',
    speakingTitle: 'Talk about container types and loading specs',
  },
  {
    id: 'cmlgw2dg00003asx5a0000003',
    name: 'Level 2: Logistics English - Dangerous Goods (DG)',
    key: 'W2-DG',
    speakingTitle: 'Discuss dangerous goods shipping rules',
  },
];

/** @deprecated Prefer LOGISTICS_WEEK1_COURSES — kept for existing import scripts. */
export const LOGISTICS_COURSES = LOGISTICS_WEEK1_COURSES;

export type LogisticsWeek = 1 | 2;

export function logisticsCoursesForWeek(week: LogisticsWeek): LogisticsCourseSeed[] {
  return week === 2 ? LOGISTICS_WEEK2_COURSES : LOGISTICS_WEEK1_COURSES;
}

export function logisticsCourseIdsForWeek(week: LogisticsWeek): Set<string> {
  return new Set(logisticsCoursesForWeek(week).map((course) => course.id));
}

export function isLogisticsLevel(levelName: string | null | undefined): boolean {
  return /logi[sc]tics/i.test(String(levelName || ''));
}
