/**
 * Official Bharat Skills theory books that supplement the parsed AITT banks.
 *
 * These books are image-based, so the existing seed questions are linked to
 * the relevant lesson pages instead of pretending OCR produced an exact
 * question-bank extraction. `page` is the physical PDF page used by #page=.
 */
export const OFFICIAL_SOURCE_DOCUMENTS = [
  {
    slug: "solar-technician-trade-theory-nsqf-2022",
    title: "Solar Technician (Electrical) - Trade Theory (NSQF 2022)",
    titleHi: "सोलर टेक्नीशियन (इलेक्ट्रिकल) - ट्रेड थ्योरी (NSQF 2022)",
    file: "solar-technician-trade-theory-nsqf-2022.pdf",
    occupations: ["SOLAR_TECHNICIAN"],
    year: "1st Year",
    subject: "TRADE_THEORY",
    minedForQuestions: true,
    pageCount: 330,
  },
  {
    slug: "cosmetology-trade-theory-nsqf-2022",
    title: "Cosmetology - Trade Theory (NSQF 2022)",
    titleHi: "कॉस्मेटोलॉजी - ट्रेड थ्योरी (NSQF 2022)",
    file: "cosmetology-trade-theory-nsqf-2022.pdf",
    occupations: ["BASIC_COSMETOLOGY"],
    year: "1st Year",
    subject: "TRADE_THEORY",
    minedForQuestions: true,
    pageCount: 130,
  },
] as const;

type SourceLink = {
  occupation: "SOLAR_TECHNICIAN" | "BASIC_COSMETOLOGY";
  documentSlug: string;
  question: string;
  page: number;
  label: string;
};

const solar = (
  question: string,
  page: number,
  label: string,
): SourceLink => ({
  occupation: "SOLAR_TECHNICIAN",
  documentSlug: "solar-technician-trade-theory-nsqf-2022",
  question,
  page,
  label,
});

const cosmetology = (
  question: string,
  page: number,
  label: string,
): SourceLink => ({
  occupation: "BASIC_COSMETOLOGY",
  documentSlug: "cosmetology-trade-theory-nsqf-2022",
  question,
  page,
  label,
});

export const OFFICIAL_SOURCE_LINKS: SourceLink[] = [
  solar("A solar photovoltaic cell converts sunlight directly into:", 189, "Photovoltaic cells and modules"),
  solar("The most common material used in commercial solar cells is:", 189, "Semiconductor properties and PV cells"),
  solar("Standard Test Conditions (STC) for rating a PV module are:", 189, "Photovoltaic module characteristics"),
  solar("The output of a PV module falls as its cell temperature rises.", 189, "Photovoltaic module characteristics"),
  solar("Connecting two identical modules in series doubles the:", 221, "Testing solar panels and battery banks"),
  solar("In the northern hemisphere, fixed solar panels should generally face:", 272, "Array inclination and orientation"),
  solar("The tilt angle of a fixed array is usually set close to the site's:", 272, "Array inclination and orientation"),
  solar("Partial shading of one cell in a string is mitigated by:", 262, "PV installation best practices and hot spots"),
  solar("Modules should be mounted with a gap behind them for air circulation.", 261, "PV installation best practices"),
  solar("The function of an inverter in a solar power system is to:", 237, "Solar inverter classification"),
  solar("MPPT in a solar charge controller stands for:", 221, "Charge controllers and inverters"),
  solar("A grid-tied inverter must disconnect during a grid outage. This feature is called:", 241, "Grid-connected inverter standards"),
  solar("In an off-grid system the battery bank mainly provides:", 201, "Solar batteries"),
  solar("Depth of discharge (DoD) of a battery indicates:", 231, "Battery capacity, defects and maintenance"),
  solar("Deep discharging a lead-acid battery repeatedly shortens its life.", 231, "Battery capacity, defects and maintenance"),
  solar("The most common cause of reduced output in a rooftop array is:", 297, "PV system maintenance"),
  solar("Modules are best cleaned:", 297, "PV system maintenance"),
  solar("A PV array is dangerous to work on because it:", 261, "PV installation safety"),
  solar("The DC side of a solar installation must be isolated before working on the inverter.", 261, "PV installation safety"),
  solar("A 3 kW array producing an average of 4 peak sun hours generates roughly:", 244, "Solar PV project design"),

  cosmetology("The outermost layer of human skin is the:", 80, "Skin structure"),
  cosmetology("Which skin type generally shows enlarged pores and excess shine?", 35, "Facials and skin analysis"),
  cosmetology("A patch test before a facial or colour service is done to check for:", 110, "Hair-colour allergy test"),
  cosmetology("Sunscreen should be applied even on cloudy days.", 80, "Skin structure and protection"),
  cosmetology("Exfoliation of the skin primarily removes:", 35, "Facials and skin analysis"),
  cosmetology("The visible part of a hair above the scalp is called the:", 40, "Structure of hair"),
  cosmetology("Which hair-shaft layer contains the pigment melanin?", 40, "Structure of hair"),
  cosmetology("A conditioner is applied after shampooing mainly to:", 43, "Shampooing and conditioning"),
  cosmetology("Hair should be combed from the ends upward when it is badly tangled.", 56, "Common hair problems and care"),
  cosmetology("Dandruff is most commonly associated with:", 46, "Common hair problems"),
  cosmetology("Sterilisation of salon tools means:", 20, "Sterilisation and sanitation"),
  cosmetology("Which practice best prevents cross-infection between clients?", 20, "Sterilisation and sanitation"),
  cosmetology("Disposable items such as waxing spatulas may be reused on the next client.", 22, "Superfluous hair removal safety"),
  cosmetology("Hands should be washed by the beautician:", 20, "Salon hygiene"),
  cosmetology("Chemicals such as hair colour should be stored:", 115, "Hair-colour safety precautions"),
  cosmetology("If a chemical splashes into a client's eye, you should first:", 115, "Hair-colour safety precautions"),
  cosmetology("Electrical appliances in a salon should be checked for damaged cords before use.", 20, "Salon safety"),
  cosmetology("A client consultation before a service is carried out to:", 15, "Client consultation and professional ethics"),
  cosmetology("A record card for each client is maintained mainly to:", 35, "Facial client consultation"),
  cosmetology("The technical term for the cuticle area at the base of the nail is the:", 27, "Manicure and pedicure"),
];
