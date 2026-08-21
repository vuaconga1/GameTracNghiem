import {
  LOGISTICS_WEEK1_COURSES,
  LOGISTICS_WEEK2_COURSES,
  LOGISTICS_WEEK3_COURSES,
} from '@/lib/logisticsUnits';

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

/** Week 3 — Freight Rates & Basic Quotation Structure */
export const W3_FREIGHT_VOCAB: LogisticsVocabCard[] = [
  card(
    'Ocean Freight (O/F)',
    'Base maritime carrier fee for transporting containerized cargo across the sea.',
    'Our ocean freight rate from Cat Lai to Singapore is $350 per 20ft container.',
    'fa-ship',
    0
  ),
  card(
    'Air Freight (A/F)',
    'Core charge for shipping cargo rapidly via aircraft.',
    'Air freight is faster but more expensive than ocean freight.',
    'fa-plane',
    1
  ),
  card(
    'Local Charges',
    'Port handling and administrative documentation expenses at origin or destination.',
    'Please note that local charges at POD are excluded from this quote.',
    'fa-map-marker-alt',
    2
  ),
  card(
    'THC (Terminal Handling)',
    'Port fee for lifting, moving, and stacking containers on and off vessels.',
    'THC is a standard local charge at Vietnam export ports.',
    'fa-dolly',
    3
  ),
  card(
    'Seal Fee',
    'Cost for applying high-security numbered metal seals onto container doors.',
    'The seal fee is charged once per container.',
    'fa-lock',
    4
  ),
  card(
    'Doc Fee',
    'Administrative processing fee for drafting shipping documents.',
    'Doc Fee is billed per Bill of Lading.',
    'fa-file-alt',
    5
  ),
  card(
    'Per Container Rate',
    'Fixed unit price charged per individual box for FCL shipments.',
    'The per container rate is $350 per 20ft DC.',
    'fa-box',
    6
  ),
  card(
    'Per CBM Rate',
    'Unit price multiplied by total cargo volume in cubic meters for LCL.',
    'LCL cargo is charged at $45 per CBM.',
    'fa-ruler-combined',
    7
  ),
];

/** Week 3 — Understanding Invoices & Payment Terms */
export const W3_INVOICE_VOCAB: LogisticsVocabCard[] = [
  card(
    'Freight Prepaid',
    'Shipping charges paid by the exporter before dispatch.',
    'As per our agreement, freight is Prepaid at origin prior to B/L release.',
    'fa-file-invoice-dollar',
    0
  ),
  card(
    'Freight Collect',
    'Charges paid by the receiver upon cargo arrival.',
    'Freight Collect requires trusted standing with the consignee.',
    'fa-hand-holding-usd',
    1
  ),
  card(
    'Debit Note',
    'Document notifying a client about extra fees or price rises owed.',
    'Attached is Debit Note #1042 for local charges.',
    'fa-file-invoice',
    2
  ),
  card(
    'Credit Note',
    'Document reducing what a client owes for refunds or returns.',
    'We issued a Credit Note for the damaged goods discount.',
    'fa-receipt',
    3
  ),
  card(
    'Due Date',
    'The precise deadline for invoice settlement to avoid penalties.',
    'Payment is due within 7 days of the invoice date.',
    'fa-calendar-check',
    4
  ),
  card(
    'Bank Wire Remittance',
    'Secure electronic funds transfer with an advice slip.',
    'Please confirm the bank wire remittance reference number.',
    'fa-university',
    5
  ),
];

/** Week 3 — Extra Fees & Price Increases */
export const W3_FEES_VOCAB: LogisticsVocabCard[] = [
  card(
    'Price Increase',
    'When the cost becomes higher than before.',
    'There is a price increase this month because of high fuel costs.',
    'fa-chart-line',
    0
  ),
  card(
    'Price Quote',
    'A document showing estimated freight rates.',
    'I will send you the updated price quote today.',
    'fa-file-invoice',
    1
  ),
  card(
    'Extra Fee / Charge',
    'An additional cost added to the standard shipping rate.',
    'We charge an extra fee for heavy cargo.',
    'fa-plus-circle',
    2
  ),
  card(
    'Fuel Fee (BAF)',
    'Bunker Adjustment Factor added when fuel prices rise.',
    'The fuel fee went up by $50 this week.',
    'fa-gas-pump',
    3
  ),
  card(
    'Peak Season Fee',
    'Surcharge applied during high-demand shipping months.',
    'Carriers add a peak season fee in December.',
    'fa-calendar-alt',
    4
  ),
  card(
    'Charge',
    'To ask someone to pay an amount of money.',
    'We need to charge an extra fee for this service.',
    'fa-money-bill-wave',
    5
  ),
  card(
    'Accept',
    'To agree to pay or receive the rate.',
    'Did the customer accept the new rate?',
    'fa-check',
    6
  ),
  card(
    'Reason',
    'The cause or explanation for something.',
    'High fuel cost is the main reason for the fee.',
    'fa-comment-dots',
    7
  ),
];

/** Week 3 — Free Days & Late Container Fees */
export const W3_FREEDAYS_VOCAB: LogisticsVocabCard[] = [
  card(
    'Free Days',
    'Days you can use a container without paying extra charges.',
    'We need 14 free days for this shipment.',
    'fa-calendar-day',
    0
  ),
  card(
    'Free Time',
    'The period given by the carrier to use a container without late fees.',
    'Standard free time is usually 7 days.',
    'fa-clock',
    1
  ),
  card(
    'Demurrage',
    'Fee when a full container stays inside the port longer than free days.',
    'You pay demurrage if the box stays at the port over 7 days.',
    'fa-anchor',
    2
  ),
  card(
    'Detention',
    'Fee when you keep a container outside the port and return it late.',
    'Detention applies after you pick up the container to your warehouse.',
    'fa-warehouse',
    3
  ),
  card(
    'Late Fee',
    'Extra money paid for late container return.',
    'If we are late, we must pay a late fee.',
    'fa-exclamation-triangle',
    4
  ),
  card(
    'Port Storage',
    'Fee for keeping a container at the port yard after free time.',
    'Port storage fees start after 7 days.',
    'fa-building',
    5
  ),
  card(
    'Discount',
    'A lower price or reduced late-fee amount.',
    'Could you please give us a discount on the demurrage fee?',
    'fa-percent',
    6
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
  [LOGISTICS_WEEK3_COURSES[0].id]: W3_FREIGHT_VOCAB,
  [LOGISTICS_WEEK3_COURSES[1].id]: W3_INVOICE_VOCAB,
  [LOGISTICS_WEEK3_COURSES[2].id]: W3_FEES_VOCAB,
  [LOGISTICS_WEEK3_COURSES[3].id]: W3_FREEDAYS_VOCAB,
};

export function getCourseVocabDeck(courseId: string): LogisticsVocabCard[] | null {
  return DECKS_BY_COURSE_ID[courseId] ?? null;
}
