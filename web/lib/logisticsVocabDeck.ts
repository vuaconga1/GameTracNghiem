import { LOGISTICS_WEEK1_COURSES, LOGISTICS_WEEK2_COURSES } from '@/lib/logisticsUnits';

export type LogisticsVocabCard = {
  word: string;
  meaning: string;
  example: string;
  /** Font Awesome icon class without the `fas` prefix, e.g. `fa-file-alt`. */
  icon: string;
  /** Accent theme for border / title. */
  accent: 'coral' | 'green' | 'amber';
};

/**
 * Word used in scramble / pronunciation games.
 * Strips a trailing parenthetical, e.g. "Dangerous Goods (DG)" → "Dangerous Goods".
 */
export function logisticsGameWord(displayWord: string): string {
  return String(displayWord || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

const ACCENTS: LogisticsVocabCard['accent'][] = ['coral', 'green', 'amber'];

function card(
  word: string,
  meaning: string,
  example: string,
  icon: string,
  index: number
): LogisticsVocabCard {
  return { word, meaning, example, icon, accent: ACCENTS[index % ACCENTS.length] };
}

/** Level 1: English for Logistics & Supply Chain */
export const L1_SUPPLY_VOCAB: LogisticsVocabCard[] = [
  card('Documentation', 'Shipping papers.', 'Check export documentation before shipping out.', 'fa-file-alt', 0),
  card('Customer Service', 'Client support.', 'Customer service tracked the delayed parcel.', 'fa-headset', 1),
  card('Responsible for', 'Job duties.', 'She is responsible for warehouse inventory.', 'fa-check-circle', 2),
  card('Supply Chain', 'Flow of goods from supplier to customer.', 'A strong supply chain keeps stores stocked.', 'fa-link', 3),
  card('Warehouse', 'Storage facility for goods.', 'The warehouse stores containers before delivery.', 'fa-warehouse', 4),
  card('Shipment', 'Goods sent by transport.', 'The shipment arrives at the port tomorrow.', 'fa-shipping-fast', 5),
];

/** Level 1: Supply Chain Management English */
export const L1_SCM_VOCAB: LogisticsVocabCard[] = [
  card(
    'Supply Chain (SCM)',
    'Managing how products move from raw materials to the customer.',
    'SCM teams plan every step of the product journey.',
    'fa-project-diagram',
    0
  ),
  card(
    '3PL / 4PL',
    'Hiring outside companies to handle transport, warehousing, or full logistics.',
    'Many brands use a 3PL to deliver online orders.',
    'fa-handshake',
    1
  ),
  card(
    'Freight Forwarding',
    'An agency service that organizes international shipping.',
    'Freight forwarding helps exporters clear customs faster.',
    'fa-globe',
    2
  ),
  card(
    'Logistics',
    'Organizing the flow of goods, information, and resources.',
    'Good logistics reduces delays across the network.',
    'fa-truck',
    3
  ),
  card(
    'Inventory',
    'Stock of goods held for sale or production.',
    'They check inventory before confirming the order.',
    'fa-boxes',
    4
  ),
  card(
    'Procurement',
    'Buying materials or services for the business.',
    'Procurement negotiated a better rate with suppliers.',
    'fa-shopping-cart',
    5
  ),
];

/** Level 2: Logistics & Operations Vocabulary */
export const L2_OPS_VOCAB: LogisticsVocabCard[] = [
  card(
    'Carrier',
    'The shipping line or transport company.',
    'The carrier confirmed the vessel schedule today.',
    'fa-ship',
    0
  ),
  card(
    'Available Dates',
    'The specific days a ship can carry your goods.',
    'Please send the available dates for next week.',
    'fa-calendar-alt',
    1
  ),
  card(
    'Fulfillment',
    'Picking, packing, and shipping customer orders.',
    'Fulfillment centers prepare parcels for delivery.',
    'fa-box-open',
    2
  ),
  card(
    'Lead Time',
    'Time from order to delivery.',
    'Shorter lead time improves customer satisfaction.',
    'fa-clock',
    3
  ),
  card(
    'Throughput',
    'Volume of goods processed in a period.',
    'The warehouse increased throughput this quarter.',
    'fa-tachometer-alt',
    4
  ),
  card(
    'Cross-docking',
    'Moving goods from inbound to outbound with little storage.',
    'Cross-docking speeds up distribution for retail.',
    'fa-exchange-alt',
    5
  ),
];

/** Level 2: Urgent Calls & Booking Container Space */
export const L2_BOOKING_VOCAB: LogisticsVocabCard[] = [
  card(
    'Book Space',
    'To reserve a place for your goods on a vessel or truck.',
    'We need to book space before the cutoff time.',
    'fa-bookmark',
    0
  ),
  card(
    'Urgent',
    'Very important and needs action right away.',
    'This is an urgent booking for Friday’s sailing.',
    'fa-exclamation-circle',
    1
  ),
  card(
    'Container Space',
    'Capacity available inside a shipping container.',
    'Is there any container space left on the vessel?',
    'fa-cube',
    2
  ),
  card(
    'Cutoff Time',
    'The latest time cargo can be received for sailing.',
    'Submit documents before the cutoff time tonight.',
    'fa-hourglass-end',
    3
  ),
  card(
    'Booking Confirmation',
    'Official notice that space has been reserved.',
    'We received the booking confirmation by email.',
    'fa-file-invoice',
    4
  ),
  card(
    'Peak Season',
    'Busy period with high demand for space.',
    'Peak season makes container space harder to find.',
    'fa-chart-line',
    5
  ),
];

/** Week 2 — Phone Etiquette & Basic Cargo Enquiries */
export const W2_PHONE_VOCAB: LogisticsVocabCard[] = [
  card(
    'Tracking number',
    'A unique code used to track shipment status.',
    'Please provide your tracking number so I can check the status.',
    'fa-barcode',
    0
  ),
  card(
    'Container number',
    'The standard identification code on a cargo container.',
    'What is your container number to locate the cargo?',
    'fa-cube',
    1
  ),
  card(
    'Hold the line',
    'A polite request asking the caller to stay on the call.',
    'Please hold the line while I verify the details.',
    'fa-phone',
    2
  ),
  card(
    'Transfer',
    'Connecting the caller to another department or person.',
    'I will transfer your call to the logistics team.',
    'fa-exchange-alt',
    3
  ),
  card(
    'Hold on',
    'A friendly phrase asking someone to wait briefly.',
    'Hold on a second while I check the system.',
    'fa-clock',
    4
  ),
  card(
    'Booking ref.',
    'The confirmation reference code for a cargo booking.',
    'May I have your booking ref. to look up the reservation?',
    'fa-file-invoice',
    5
  ),
];

/** Week 2 — Container Types & Loading Specs */
export const W2_CONTAINER_VOCAB: LogisticsVocabCard[] = [
  card('Dry Van Container', 'Standard closed container for general cargo.', 'We booked a dry van container for the cartons.', 'fa-box', 0),
  card("High Cube Container (40'HC)", 'Taller 40-foot container with extra height.', "Use a 40'HC high cube container for bulky cargo.", 'fa-arrows-alt-v', 1),
  card('Reefer Container', 'Refrigerated container for temperature-controlled goods.', 'Fruit must travel in a reefer container.', 'fa-snowflake', 2),
  card('Open Top Container', 'Container with an open roof for oversized cargo.', 'Machinery was loaded into an open top container.', 'fa-border-top', 3),
  card('Flat Rack Container', 'Platform container without side walls for heavy/odd loads.', 'Steel pipes were secured on a flat rack container.', 'fa-th-large', 4),
  card('SOC (Shipper-Owned)', 'Container owned by the shipper, not the carrier.', 'The customer provided an SOC for this shipment.', 'fa-user-tag', 5),
  card('COC (Carrier-Owned)', 'Container owned and supplied by the carrier.', 'Please request a COC from the shipping line.', 'fa-ship', 6),
  card(
    'Tare Weight',
    'The dead weight of the empty metal container box itself.',
    'An empty 40ft standard box weighs approx. 3,800 kg.',
    'fa-weight',
    7
  ),
  card(
    'Payload Weight',
    'The maximum weight of cargo you can safely pack inside the box.',
    'Cargo limit strictly enforced to prevent highway fines.',
    'fa-balance-scale',
    8
  ),
];

/** Week 2 — Dangerous Goods (DG) */
export const W2_DG_VOCAB: LogisticsVocabCard[] = [
  card(
    'Dangerous Goods (DG)',
    'Items or substances that can cause harm during transport.',
    'Lithium batteries are dangerous goods.',
    'fa-skull-crossbones',
    0
  ),
  card(
    'MSDS (Material Safety Data Sheet)',
    'A document with information about the hazards and safe handling of a chemical.',
    'We read the MSDS before using any chemical.',
    'fa-file-medical',
    1
  ),
  card(
    'Chemical',
    'A substance used in industry or production.',
    'Acetone is a chemical used for cleaning.',
    'fa-flask',
    2
  ),
  card(
    'Safety Rules',
    'Rules and procedures to protect people and the environment.',
    'Always wear PPE when handling chemicals.',
    'fa-shield-alt',
    3
  ),
  card(
    'UN Code',
    'A four-digit number used to identify dangerous goods.',
    'UN 1203 is used for gasoline.',
    'fa-hashtag',
    4
  ),
  card(
    'Hazard Class',
    'A class that shows the main type of danger.',
    'Class 3 is for flammable liquids.',
    'fa-exclamation-triangle',
    5
  ),
  card(
    'Safe Packing',
    'Packing goods in a strong, secure and approved way to prevent leaks or damage.',
    'We use UN approved drums.',
    'fa-box-open',
    6
  ),
  card(
    'Class Approved',
    'Approved to meet international safety standards.',
    'This packaging is class approved.',
    'fa-check-circle',
    7
  ),
];

const DECKS_BY_COURSE_ID: Record<string, LogisticsVocabCard[]> = {
  [LOGISTICS_WEEK1_COURSES[0].id]: L1_SUPPLY_VOCAB,
  [LOGISTICS_WEEK1_COURSES[1].id]: L1_SCM_VOCAB,
  [LOGISTICS_WEEK1_COURSES[2].id]: L2_OPS_VOCAB,
  [LOGISTICS_WEEK1_COURSES[3].id]: L2_BOOKING_VOCAB,
  [LOGISTICS_WEEK2_COURSES[0].id]: W2_PHONE_VOCAB,
  [LOGISTICS_WEEK2_COURSES[1].id]: W2_CONTAINER_VOCAB,
  [LOGISTICS_WEEK2_COURSES[2].id]: W2_DG_VOCAB,
};

export function getCourseVocabDeck(courseId: string): LogisticsVocabCard[] | null {
  return DECKS_BY_COURSE_ID[courseId] ?? null;
}
