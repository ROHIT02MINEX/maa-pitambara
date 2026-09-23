/**
 * Seed script.
 *
 * Creates the initial administrator account and a starter question bank of 20
 * questions per occupation, which is the minimum a full-length test needs.
 *
 * Run with:  npm run db:seed
 *
 * Environment:
 *   ADMIN_EMAIL     — administrator's e-mail  (default: admin@skillportal.local)
 *   ADMIN_PASSWORD  — administrator's password (default: ChangeMe123! — change it)
 *   ADMIN_NAME      — display name             (default: Portal Administrator)
 *
 * Learning-material PDFs are deliberately not seeded: they are real files that
 * an administrator uploads through the admin panel.
 */
import {
  AnswerOption,
  Difficulty,
  Occupation,
  PrismaClient,
  QuestionType,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedQuestion = {
  topic: string;
  type?: QuestionType;
  question: string;
  options?: [string, string, string, string];
  answer: AnswerOption;
  explanation: string;
  difficulty?: Difficulty;
};

const FITTER: SeedQuestion[] = [
  {
    topic: "Measurement",
    question: "What is the least count of a standard vernier caliper?",
    options: ["0.01 mm", "0.02 mm", "0.1 mm", "1 mm"],
    answer: AnswerOption.B,
    explanation: "A standard metric vernier caliper divides 49 mm into 50 parts, giving 0.02 mm.",
  },
  {
    topic: "Measurement",
    question: "Which instrument gives the most accurate reading for a 12 mm shaft diameter?",
    options: ["Steel rule", "Outside micrometer", "Try square", "Divider"],
    answer: AnswerOption.B,
    explanation: "An outside micrometer reads to 0.01 mm, far finer than a rule or divider.",
    difficulty: Difficulty.EASY,
  },
  {
    topic: "Measurement",
    type: QuestionType.TRUE_FALSE,
    question: "A micrometer should be zeroed before taking a measurement.",
    answer: AnswerOption.A,
    explanation: "Checking and correcting the zero error prevents a constant offset in every reading.",
  },
  {
    topic: "Fitting Tools",
    question: "Which file cut is used for the fastest removal of material?",
    options: ["Smooth", "Second cut", "Bastard", "Dead smooth"],
    answer: AnswerOption.C,
    explanation: "A bastard cut is the coarsest of the common cuts and removes metal quickest.",
  },
  {
    topic: "Fitting Tools",
    question: "The included angle of a standard cold chisel for mild steel is about:",
    options: ["25°", "35°", "60°", "90°"],
    answer: AnswerOption.C,
    explanation: "About 60° gives a good balance of cutting ability and edge strength on mild steel.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Fitting Tools",
    question: "Which hammer is normally used for general fitting work?",
    options: ["Ball peen hammer", "Sledge hammer", "Mallet", "Claw hammer"],
    answer: AnswerOption.A,
    explanation: "The ball peen (engineer's) hammer is the general-purpose hammer in a fitting shop.",
  },
  {
    topic: "Fitting Tools",
    type: QuestionType.TRUE_FALSE,
    question: "A file should be used with a handle fitted to its tang.",
    answer: AnswerOption.A,
    explanation: "Without a handle the exposed tang can pierce the palm; it is a basic safety rule.",
  },
  {
    topic: "Drilling",
    question: "The standard point angle of a twist drill for mild steel is:",
    options: ["90°", "100°", "118°", "140°"],
    answer: AnswerOption.C,
    explanation: "118° is the general-purpose point angle for mild steel.",
  },
  {
    topic: "Drilling",
    question: "Before tapping an M10 × 1.5 thread, the correct tapping drill size is:",
    options: ["8.0 mm", "8.5 mm", "9.0 mm", "10.0 mm"],
    answer: AnswerOption.B,
    explanation: "Tapping size = major diameter − pitch = 10 − 1.5 = 8.5 mm.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Drilling",
    question: "Which operation enlarges the end of an existing hole to seat a screw head?",
    options: ["Reaming", "Counterboring", "Boring", "Spot facing"],
    answer: AnswerOption.B,
    explanation: "Counterboring produces a flat-bottomed enlargement for a cap-screw head.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Fits and Tolerances",
    question: "In the hole-basis system of fits, which member is kept constant?",
    options: ["Shaft", "Hole", "Both", "Neither"],
    answer: AnswerOption.B,
    explanation: "The hole size is fixed and the shaft is varied to obtain the required fit.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Fits and Tolerances",
    question: "A fit that always leaves clearance between shaft and hole is called a:",
    options: ["Interference fit", "Transition fit", "Clearance fit", "Force fit"],
    answer: AnswerOption.C,
    explanation: "In a clearance fit the shaft is always smaller than the hole.",
  },
  {
    topic: "Fits and Tolerances",
    type: QuestionType.TRUE_FALSE,
    question: "Tolerance is the difference between the upper and lower limits of a dimension.",
    answer: AnswerOption.A,
    explanation: "Tolerance is exactly that permissible range of variation.",
  },
  {
    topic: "Materials",
    question: "Mild steel typically contains carbon in the range:",
    options: ["0.05–0.25%", "0.6–1.0%", "1.5–2.0%", "2.5–3.5%"],
    answer: AnswerOption.A,
    explanation: "Low-carbon (mild) steel contains roughly 0.05–0.25% carbon.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Materials",
    question: "Which heat treatment is used to soften steel and relieve internal stress?",
    options: ["Hardening", "Annealing", "Case hardening", "Nitriding"],
    answer: AnswerOption.B,
    explanation: "Annealing means slow cooling after heating, which softens and relieves stress.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Materials",
    question: "Cast iron is generally not used where the part must withstand:",
    options: ["Compression", "Vibration damping", "High tensile load", "Wear"],
    answer: AnswerOption.C,
    explanation: "Cast iron is brittle and weak in tension, though strong in compression.",
    difficulty: Difficulty.HARD,
  },
  {
    topic: "Safety",
    question: "Which personal protective equipment is essential while grinding?",
    options: ["Ear plugs only", "Safety goggles", "Cotton gloves", "Apron only"],
    answer: AnswerOption.B,
    explanation: "Flying sparks and abrasive particles make eye protection mandatory.",
  },
  {
    topic: "Safety",
    type: QuestionType.TRUE_FALSE,
    question: "Compressed air may be used to blow metal chips off your clothing.",
    answer: AnswerOption.B,
    explanation: "Compressed air can drive chips into skin or eyes, so use a brush instead.",
  },
  {
    topic: "Safety",
    question: "The colour code for a fire extinguisher suitable for electrical fires (CO₂) is:",
    options: ["Red", "Black", "Blue", "Cream"],
    answer: AnswerOption.B,
    explanation: "CO₂ extinguishers carry a black band and are safe on live electrical equipment.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Marking and Layout",
    question: "Which tool is used to scribe arcs and circles on a metal surface?",
    options: ["Divider", "Try square", "Surface plate", "Vernier height gauge"],
    answer: AnswerOption.A,
    explanation: "Dividers scribe arcs and transfer distances on marked-out work.",
  },
];

const ELECTRICIAN: SeedQuestion[] = [
  {
    topic: "Basic Electricity",
    question: "Ohm's law states that:",
    options: ["V = I × R", "V = I / R", "I = V × R", "R = V × I"],
    answer: AnswerOption.A,
    explanation: "Voltage equals current multiplied by resistance.",
  },
  {
    topic: "Basic Electricity",
    question: "The SI unit of electrical power is the:",
    options: ["Volt", "Ampere", "Watt", "Ohm"],
    answer: AnswerOption.C,
    explanation: "Power is measured in watts, one joule per second.",
  },
  {
    topic: "Basic Electricity",
    question: "Three 6 Ω resistors in parallel give a total resistance of:",
    options: ["18 Ω", "6 Ω", "3 Ω", "2 Ω"],
    answer: AnswerOption.D,
    explanation: "For equal resistors in parallel, R = 6/3 = 2 Ω.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Basic Electricity",
    type: QuestionType.TRUE_FALSE,
    question: "In a series circuit the current is the same through every component.",
    answer: AnswerOption.A,
    explanation: "There is only one path, so the same current flows everywhere in it.",
  },
  {
    topic: "Wiring",
    question: "In Indian domestic wiring, the standard colour of the earth conductor is:",
    options: ["Red", "Black", "Green or green-yellow", "Blue"],
    answer: AnswerOption.C,
    explanation: "Green, or green with a yellow stripe, is reserved for protective earth.",
  },
  {
    topic: "Wiring",
    question: "A switch controlling a light must always be connected in the:",
    options: ["Neutral wire", "Earth wire", "Phase (live) wire", "Any wire"],
    answer: AnswerOption.C,
    explanation: "Switching the live conductor isolates the fitting when the switch is off.",
  },
  {
    topic: "Wiring",
    question: "Which wiring system is most suitable for a damp workshop?",
    options: ["Casing and capping", "Cleat wiring", "Conduit wiring", "Batten wiring"],
    answer: AnswerOption.C,
    explanation: "Conduit gives mechanical and moisture protection for the conductors.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Wiring",
    type: QuestionType.TRUE_FALSE,
    question: "Two-way switches allow one lamp to be controlled from two positions.",
    answer: AnswerOption.A,
    explanation: "A pair of two-way switches is the standard staircase circuit.",
  },
  {
    topic: "Safety",
    question: "The main purpose of earthing an appliance is to:",
    options: [
      "Improve efficiency",
      "Provide a safe path for fault current",
      "Reduce the bill",
      "Increase voltage",
    ],
    answer: AnswerOption.B,
    explanation: "Earthing gives fault current a low-resistance path so protection operates quickly.",
  },
  {
    topic: "Safety",
    question: "An ELCB/RCCB protects primarily against:",
    options: ["Overload", "Short circuit", "Earth leakage", "Over voltage"],
    answer: AnswerOption.C,
    explanation: "It trips when leakage current to earth exceeds its rating, typically 30 mA.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Safety",
    question: "The first action on finding a person in contact with a live conductor is to:",
    options: [
      "Pull them by the hand",
      "Switch off the supply",
      "Pour water",
      "Call the supervisor first",
    ],
    answer: AnswerOption.B,
    explanation: "Isolate the supply before touching the casualty, or you become the next victim.",
  },
  {
    topic: "Safety",
    type: QuestionType.TRUE_FALSE,
    question: "A fuse protects a circuit against excessive current.",
    answer: AnswerOption.A,
    explanation: "The fuse element melts and opens the circuit when current exceeds its rating.",
  },
  {
    topic: "Measurement",
    question: "An ammeter is always connected:",
    options: ["In parallel with the load", "In series with the load", "Across the supply", "To earth"],
    answer: AnswerOption.B,
    explanation: "Current must pass through the ammeter, so it goes in series.",
  },
  {
    topic: "Measurement",
    question: "A megger is used to measure:",
    options: ["Current", "Power factor", "Insulation resistance", "Frequency"],
    answer: AnswerOption.C,
    explanation: "A megger applies a high DC voltage to test insulation resistance.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Measurement",
    question: "An energy meter in a house records:",
    options: ["Voltage", "Power factor", "Energy in kWh", "Peak current"],
    answer: AnswerOption.C,
    explanation: "Domestic energy meters record consumption in kilowatt-hours.",
  },
  {
    topic: "Machines",
    question: "A transformer works on the principle of:",
    options: [
      "Mutual induction",
      "Self induction only",
      "Electrostatic attraction",
      "Chemical action",
    ],
    answer: AnswerOption.A,
    explanation: "Alternating flux from the primary induces a voltage in the secondary.",
  },
  {
    topic: "Machines",
    question: "The direction of rotation of a three-phase induction motor is reversed by:",
    options: [
      "Increasing the voltage",
      "Interchanging any two supply phases",
      "Adding a capacitor",
      "Reducing the frequency",
    ],
    answer: AnswerOption.B,
    explanation: "Swapping two phases reverses the rotating magnetic field.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Machines",
    question: "The synchronous speed of a 4-pole motor on a 50 Hz supply is:",
    options: ["750 rpm", "1000 rpm", "1500 rpm", "3000 rpm"],
    answer: AnswerOption.C,
    explanation: "Ns = 120f/P = 120 × 50 / 4 = 1500 rpm.",
    difficulty: Difficulty.HARD,
  },
  {
    topic: "Machines",
    type: QuestionType.TRUE_FALSE,
    question: "A capacitor-start single-phase motor uses the capacitor only while starting.",
    answer: AnswerOption.A,
    explanation: "A centrifugal switch disconnects the start capacitor near running speed.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Illumination",
    question: "Compared with an incandescent lamp, an LED lamp of the same light output uses:",
    options: ["More power", "About the same power", "Much less power", "No power"],
    answer: AnswerOption.C,
    explanation: "LEDs are several times more efficient in lumens per watt.",
  },
];

const SOLAR: SeedQuestion[] = [
  {
    topic: "PV Modules",
    question: "A solar photovoltaic cell converts sunlight directly into:",
    options: ["Heat energy", "Electrical energy", "Chemical energy", "Mechanical energy"],
    answer: AnswerOption.B,
    explanation: "The photovoltaic effect produces DC electricity directly from light.",
  },
  {
    topic: "PV Modules",
    question: "The most common material used in commercial solar cells is:",
    options: ["Germanium", "Silicon", "Copper", "Aluminium"],
    answer: AnswerOption.B,
    explanation: "Crystalline silicon dominates the commercial PV market.",
  },
  {
    topic: "PV Modules",
    question: "Standard Test Conditions (STC) for rating a PV module are:",
    options: [
      "800 W/m², 20 °C, AM 1.5",
      "1000 W/m², 25 °C, AM 1.5",
      "1000 W/m², 40 °C, AM 1.0",
      "1200 W/m², 25 °C, AM 2.0",
    ],
    answer: AnswerOption.B,
    explanation: "STC is 1000 W/m² irradiance, 25 °C cell temperature and air mass 1.5.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "PV Modules",
    type: QuestionType.TRUE_FALSE,
    question: "The output of a PV module falls as its cell temperature rises.",
    answer: AnswerOption.A,
    explanation: "Voltage drops with temperature, so power output falls on hot days.",
  },
  {
    topic: "PV Modules",
    question: "Connecting two identical modules in series doubles the:",
    options: ["Current", "Voltage", "Power factor", "Frequency"],
    answer: AnswerOption.B,
    explanation: "Series connection adds voltages while current stays the same.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Installation",
    question: "In the northern hemisphere, fixed solar panels should generally face:",
    options: ["North", "South", "East", "West"],
    answer: AnswerOption.B,
    explanation: "A south-facing array receives the most annual irradiation north of the equator.",
  },
  {
    topic: "Installation",
    question: "The tilt angle of a fixed array is usually set close to the site's:",
    options: ["Longitude", "Latitude", "Altitude", "Ambient temperature"],
    answer: AnswerOption.B,
    explanation: "A tilt roughly equal to the latitude maximises annual yield.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Installation",
    question: "Partial shading of one cell in a string is mitigated by:",
    options: ["A blocking diode", "A bypass diode", "A fuse", "An MCB"],
    answer: AnswerOption.B,
    explanation: "Bypass diodes let current pass around a shaded group of cells.",
    difficulty: Difficulty.HARD,
  },
  {
    topic: "Installation",
    type: QuestionType.TRUE_FALSE,
    question: "Modules should be mounted with a gap behind them for air circulation.",
    answer: AnswerOption.A,
    explanation: "Ventilation keeps cell temperature down and preserves output.",
  },
  {
    topic: "Inverters",
    question: "The function of an inverter in a solar power system is to:",
    options: ["Convert AC to DC", "Convert DC to AC", "Store energy", "Increase current only"],
    answer: AnswerOption.B,
    explanation: "The inverter converts the array's DC output into usable AC.",
  },
  {
    topic: "Inverters",
    question: "MPPT in a solar charge controller stands for:",
    options: [
      "Maximum Power Point Tracking",
      "Minimum Power Protection Technology",
      "Multi Phase Power Transfer",
      "Maximum Panel Protection Test",
    ],
    answer: AnswerOption.A,
    explanation: "MPPT continuously operates the array at its maximum power point.",
  },
  {
    topic: "Inverters",
    question: "A grid-tied inverter must disconnect during a grid outage. This feature is called:",
    options: ["Islanding", "Anti-islanding", "Net metering", "Load shedding"],
    answer: AnswerOption.B,
    explanation: "Anti-islanding protection keeps line workers safe during an outage.",
    difficulty: Difficulty.HARD,
  },
  {
    topic: "Batteries",
    question: "In an off-grid system the battery bank mainly provides:",
    options: [
      "Energy storage for night use",
      "Voltage step-up",
      "Frequency control",
      "Earth protection",
    ],
    answer: AnswerOption.A,
    explanation: "Batteries store surplus daytime generation for use after dark.",
  },
  {
    topic: "Batteries",
    question: "Depth of discharge (DoD) of a battery indicates:",
    options: [
      "How much capacity has been used",
      "The charging current",
      "The terminal voltage",
      "The electrolyte level",
    ],
    answer: AnswerOption.A,
    explanation: "DoD is the percentage of rated capacity that has been drawn out.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Batteries",
    type: QuestionType.TRUE_FALSE,
    question: "Deep discharging a lead-acid battery repeatedly shortens its life.",
    answer: AnswerOption.A,
    explanation: "Deep cycling accelerates plate sulphation and reduces service life.",
  },
  {
    topic: "Maintenance",
    question: "The most common cause of reduced output in a rooftop array is:",
    options: ["Inverter failure", "Dust and dirt on the modules", "Cable colour", "Low latitude"],
    answer: AnswerOption.B,
    explanation: "Soiling is the everyday cause of lost yield; regular cleaning recovers it.",
  },
  {
    topic: "Maintenance",
    question: "Modules are best cleaned:",
    options: [
      "At midday with cold water",
      "Early morning or evening with soft water and a soft brush",
      "With a metal scraper",
      "With petrol",
    ],
    answer: AnswerOption.B,
    explanation: "Cleaning cool glass avoids thermal shock; abrasives and solvents damage coatings.",
  },
  {
    topic: "Safety",
    question: "A PV array is dangerous to work on because it:",
    options: [
      "Produces voltage whenever light falls on it",
      "Is only live at night",
      "Stores no energy",
      "Cannot be isolated",
    ],
    answer: AnswerOption.A,
    explanation: "You cannot switch off the sun; the DC side is live in daylight.",
  },
  {
    topic: "Safety",
    type: QuestionType.TRUE_FALSE,
    question: "The DC side of a solar installation must be isolated before working on the inverter.",
    answer: AnswerOption.A,
    explanation: "Both AC and DC isolators must be opened before servicing.",
  },
  {
    topic: "System Design",
    question: "A 3 kW array producing an average of 4 peak sun hours generates roughly:",
    options: ["3 kWh/day", "7 kWh/day", "12 kWh/day", "40 kWh/day"],
    answer: AnswerOption.C,
    explanation: "3 kW × 4 h = 12 kWh per day before system losses.",
    difficulty: Difficulty.MEDIUM,
  },
];

const COSMETOLOGY: SeedQuestion[] = [
  {
    topic: "Skin Care",
    question: "The outermost layer of human skin is the:",
    options: ["Dermis", "Epidermis", "Hypodermis", "Subcutis"],
    answer: AnswerOption.B,
    explanation: "The epidermis is the visible, outermost layer of the skin.",
  },
  {
    topic: "Skin Care",
    question: "Which skin type generally shows enlarged pores and excess shine?",
    options: ["Dry", "Oily", "Normal", "Sensitive"],
    answer: AnswerOption.B,
    explanation: "Overactive sebaceous glands produce shine and visibly larger pores.",
  },
  {
    topic: "Skin Care",
    question: "A patch test before a facial or colour service is done to check for:",
    options: ["Skin tone", "Allergic reaction", "Hair length", "Nail strength"],
    answer: AnswerOption.B,
    explanation: "A patch test reveals sensitivity before the product is used over a large area.",
  },
  {
    topic: "Skin Care",
    type: QuestionType.TRUE_FALSE,
    question: "Sunscreen should be applied even on cloudy days.",
    answer: AnswerOption.A,
    explanation: "UV radiation penetrates cloud cover, so daily protection is still needed.",
  },
  {
    topic: "Skin Care",
    question: "Exfoliation of the skin primarily removes:",
    options: ["Living cells", "Dead surface cells", "The dermis", "Hair follicles"],
    answer: AnswerOption.B,
    explanation: "Exfoliation lifts away dead cells from the surface of the epidermis.",
  },
  {
    topic: "Hair Care",
    question: "The visible part of a hair above the scalp is called the:",
    options: ["Root", "Follicle", "Shaft", "Bulb"],
    answer: AnswerOption.C,
    explanation: "The shaft is the portion of hair that projects above the skin.",
  },
  {
    topic: "Hair Care",
    question: "Which hair-shaft layer contains the pigment melanin?",
    options: ["Cuticle", "Cortex", "Medulla", "Follicle"],
    answer: AnswerOption.B,
    explanation: "Melanin sits in the cortex, which also gives hair its strength and elasticity.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Hair Care",
    question: "A conditioner is applied after shampooing mainly to:",
    options: [
      "Clean the scalp",
      "Smooth the cuticle and reduce tangling",
      "Colour the hair",
      "Straighten the hair permanently",
    ],
    answer: AnswerOption.B,
    explanation: "Conditioner closes the cuticle scales, making hair smooth and easier to comb.",
  },
  {
    topic: "Hair Care",
    type: QuestionType.TRUE_FALSE,
    question: "Hair should be combed from the ends upward when it is badly tangled.",
    answer: AnswerOption.A,
    explanation: "Working up from the ends removes knots without tearing the shaft.",
  },
  {
    topic: "Hair Care",
    question: "Dandruff is most commonly associated with:",
    options: ["A dry scalp condition", "Split ends", "Long hair", "Hair colouring"],
    answer: AnswerOption.A,
    explanation: "Flaking of the scalp is the defining sign of dandruff.",
  },
  {
    topic: "Hygiene and Sanitation",
    question: "Sterilisation of salon tools means:",
    options: [
      "Reducing the number of germs",
      "Destroying all micro-organisms",
      "Washing with plain water",
      "Wiping with a dry cloth",
    ],
    answer: AnswerOption.B,
    explanation: "Sterilisation destroys all micro-organisms; sanitising only reduces them.",
    difficulty: Difficulty.MEDIUM,
  },
  {
    topic: "Hygiene and Sanitation",
    question: "Which practice best prevents cross-infection between clients?",
    options: [
      "Using the same towel for everyone",
      "Disinfecting tools between clients",
      "Working faster",
      "Using more product",
    ],
    answer: AnswerOption.B,
    explanation: "Disinfecting or replacing tools between clients breaks the chain of infection.",
  },
  {
    topic: "Hygiene and Sanitation",
    type: QuestionType.TRUE_FALSE,
    question: "Disposable items such as waxing spatulas may be reused on the next client.",
    answer: AnswerOption.B,
    explanation: "Single-use items must be discarded after one client. Double-dipping spreads infection.",
  },
  {
    topic: "Hygiene and Sanitation",
    question: "Hands should be washed by the beautician:",
    options: [
      "Only at the start of the day",
      "Before and after every client",
      "Only after lunch",
      "Once a week",
    ],
    answer: AnswerOption.B,
    explanation: "Hand hygiene before and after each client is the basic infection-control rule.",
  },
  {
    topic: "Salon Safety",
    question: "Chemicals such as hair colour should be stored:",
    options: [
      "In direct sunlight",
      "In a cool, labelled, closed cupboard",
      "Near a heater",
      "In open bowls",
    ],
    answer: AnswerOption.B,
    explanation: "Cool, closed, clearly labelled storage prevents degradation and accidents.",
  },
  {
    topic: "Salon Safety",
    question: "If a chemical splashes into a client's eye, you should first:",
    options: [
      "Apply cream",
      "Rinse with plenty of clean water",
      "Rub the eye",
      "Wait and watch",
    ],
    answer: AnswerOption.B,
    explanation: "Immediate, prolonged rinsing with clean water limits chemical injury.",
  },
  {
    topic: "Salon Safety",
    type: QuestionType.TRUE_FALSE,
    question: "Electrical appliances in a salon should be checked for damaged cords before use.",
    answer: AnswerOption.A,
    explanation: "Damaged insulation in a wet environment is a serious shock risk.",
  },
  {
    topic: "Client Care",
    question: "A client consultation before a service is carried out to:",
    options: [
      "Fill in time",
      "Understand needs and check for contraindications",
      "Sell the most expensive service",
      "Record attendance",
    ],
    answer: AnswerOption.B,
    explanation: "Consultation establishes what the client wants and whether it is safe to proceed.",
  },
  {
    topic: "Client Care",
    question: "A record card for each client is maintained mainly to:",
    options: [
      "Track services, products and reactions",
      "Advertise the salon",
      "Calculate salary",
      "Order stock",
    ],
    answer: AnswerOption.A,
    explanation: "Service history and any reactions guide safe, consistent future treatments.",
  },
  {
    topic: "Nail Care",
    question: "The technical term for the cuticle area at the base of the nail is the:",
    options: ["Lunula", "Eponychium", "Free edge", "Nail bed"],
    answer: AnswerOption.B,
    explanation: "The eponychium is the living skin at the base of the nail plate.",
    difficulty: Difficulty.HARD,
  },
];

function toRecords(occupation: Occupation, questions: SeedQuestion[]) {
  return questions.map((item) => {
    const isTrueFalse = item.type === QuestionType.TRUE_FALSE;
    const [a, b, c, d] = item.options ?? ["True", "False", "", ""];

    return {
      occupation,
      topic: item.topic,
      type: item.type ?? QuestionType.MCQ,
      question: item.question,
      optionA: isTrueFalse ? "True" : a,
      optionB: isTrueFalse ? "False" : b,
      optionC: isTrueFalse ? null : c || null,
      optionD: isTrueFalse ? null : d || null,
      correctAnswer: item.answer,
      explanation: item.explanation,
      difficulty: item.difficulty ?? Difficulty.EASY,
      active: true,
    };
  });
}

async function main() {
  console.log("→ Seeding Skill Learning & Assessment Portal…");

  // ---------------------------------------------------------------------
  // Administrator
  // ---------------------------------------------------------------------
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@skillportal.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME ?? "Portal Administrator";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, disabled: false },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: Role.ADMIN,
      // The seeded administrator is trusted, so the account is pre-verified.
      emailVerified: new Date(),
      phone: "9999999999",
      occupation: Occupation.FITTER,
    },
  });
  console.log(`  ✓ administrator ready: ${admin.email}`);

  // ---------------------------------------------------------------------
  // Question banks
  // ---------------------------------------------------------------------
  const banks: [Occupation, SeedQuestion[]][] = [
    [Occupation.FITTER, FITTER],
    [Occupation.ELECTRICIAN, ELECTRICIAN],
    [Occupation.SOLAR_TECHNICIAN, SOLAR],
    [Occupation.BASIC_COSMETOLOGY, COSMETOLOGY],
  ];

  for (const [occupation, questions] of banks) {
    const records = toRecords(occupation, questions);
    const existing = await prisma.question.findMany({
      where: { occupation, question: { in: records.map((row) => row.question) } },
      select: { question: true },
    });
    const existingText = new Set(existing.map((row) => row.question));
    const missing = records.filter((row) => !existingText.has(row.question));
    const result = await prisma.question.createMany({ data: missing });
    console.log(`  ✓ ${occupation}: ${result.count} question(s) inserted`);
  }

  console.log("→ Seed complete.");
  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      `\n  ⚠ Administrator password defaulted to "ChangeMe123!". Sign in and change it immediately,\n    or re-run the seed with ADMIN_PASSWORD set.\n`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
