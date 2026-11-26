// Corrections for module names the PDF extraction garbled (prospectus prose, wrapped table cells,
// old-code prefixes, bullets). Each name was checked against NustWeShare_Official_Academic_Seed_Data_2026.md.
// Applied by the seed importer and by migration 0006 (for already-seeded databases).
export const MODULE_NAME_FIXES: Record<string, string> = {
  ACH521S: "Engineering Chemistry 123",
  ACT711S: "Analogue Communication Techniques and Systems 315",
  ANE511S: "Analogue Electronics 115",
  ANE521S: "Analogue Electronics 125",
  AOR901S: "Applied Operations Research in Mining",
  APH511S: "Engineering Physics 114",
  AUT611S: "Industrial Automation 314",
  CCE611S: "Communication Electronics 314",
  CCE620S: "Communication Electronics 224",
  CED721S: "Civil Engineering Design Project",
  CFR712S: "Computer Forensics",
  CMT721S: "Construction Material Technologies",
  CON110S: "Construction Methods",
  DCT721S: "Digital Communication Techniques and Systems 324",
  DFC721S: "Digital Forensics 2 – Internet Forensics and Steganography",
  DGE511S: "Digital Electronics 215",
  DGE521S: "Digital Electronics 125",
  DME610S: "Design of Machine Elements 1",
  DQM721S: "Descriptive Quantification for Mechanical and Electrical Building Works",
  DRL720S: "Deeds Registration Law 3",
  EMD610S: "Engineering Mechanics (Dynamics)",
  EMS901S: "Environmental Management and Sustainable Development",
  ENM520S: "Engineering Mathematics 2",
  ENM610S: "Engineering Mathematics 3",
  ENS521S: "Engineering Surveying",
  ERD611S: "Electrical Transmission and Distribution 214",
  EUR612S: "Elements of Urban and Rural Economics",
  FMC320S: "Fluid Mechanics 3B",
  FMC420S: "Fluid Mechanics 4",
  GDS811S: "Geodetic Surveying",
  HSP811S: "Human Settlement Planning and Design",
  HVA720S: "Heating, Ventilation, Air Conditioning and Refrigeration",
  IET912S: "Industrial Engineering Thesis",
  ILM812S: "IT in Logistics Management",
  IPH402S: "Introduction to Physics B",
  IPS620S: "In-Service Training",
  ITM402S: "Introduction to Mathematics B",
  LAR811S: "Land Administration for Urban and Rural Development",
  LLA610S: "Law for Land Administration 2",
  MAI711S: "Measurements and Instrumentation 315",
  MCM610S: "Mechanics of Materials 1",
  MNL711S: "Management and Leadership",
  MOM521S: "Mechanics of Materials 124",
  MTM521S: "Engineering Mathematics 125",
  MVN410S: "Mechanical Vibration and Noise 4",
  PAR610S: "Participatory Planning Methods",
  PED621S: "Power Electronics and Drives 224",
  PHD106S: "PhD Thesis",
  PLM811S: "Project Leadership and Management",
  PTT611S: "Pavement Technology",
  RAC410S: "Refrigeration and Air Conditioning",
  RDM711S: "Reticulation Design and Management",
  RFC611S: "Reinforced Concrete Design",
  SAU620S: "Systems Audit",
  STL620S: "Sectional Titles Legislation",
  SWM711S: "Solid Waste Management",
  TEE912S: "Environmental Engineering Thesis (Extension)",
  TFE611S: "Traffic Engineering",
  TMD610S: "Thermodynamics",
  TSE912S: "Sustainable Energy Systems Thesis",
  UPD711S: "Urban Planning and Design",
  WME610S: "Work Integrated Learning (WIL)",
  WME820S: "Work Integrated Learning 400",
  WPR510S: "Workshop Practice",
  WWT611S: "Water and Wastewater Treatment Technology 1",
  WWT721S: "Water and Wastewater Treatment Technology 2",
};

/** Patterns that indicate a scraped/garbled name rather than a real module title. */
export function looksMalformed(name: string): boolean {
  return (
    /^[•*\-–]/.test(name) ||
    /[–\-(,&]\s*$/.test(name) ||
    /\s(and|of|in|for|the|to|with)\s*$/i.test(name) ||
    /^[a-z]/.test(name) ||
    /(note:|applicants|students should|will be required|an average of)/i.test(name) ||
    /^[A-Z]{2,4} ?[0-9]{3,4}[A-Z]?\s/.test(name)
  );
}
