import hindi from "@/lib/locales/hi.json";
import { hindiOverrides } from "@/lib/locales/hi-overrides";
import type { Language } from "@/lib/constants";
const dictionary: Record<string, string> = { ...hindi, ...hindiOverrides };
export function translate(text: string, language: Language): string {
  if (language !== "hi" || !text.trim()) return text;
  const key = text.replace(/\s+/g, " ").trim();
  const translated = dictionary[key];
  if (translated !== undefined) return text.replace(text.trim(), translated);
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(key)) return key.replace(pattern, replacement);
  }
  return text;
}
const patterns: [RegExp, string][] = [
  [/^(\d+) active · (\d+) disabled$/, "$1 सक्रिय · $2 निष्क्रिय"],
  [/^(\d+) passed · (\d+) failed$/, "$1 उत्तीर्ण · $2 अनुत्तीर्ण"],
  [/^(\d+) in progress$/, "$1 जारी"], [/^(\d+) bookmarked$/, "$1 बुकमार्क"],
  [/^(\d+) questions$/, "$1 प्रश्न"], [/^(\d+)% to pass$/, "उत्तीर्ण होने के लिए $1%"],
  [/^That is (\d+) correct out of (\d+)\.$/, "$2 में से $1 सही उत्तर।"],
  [/^You scored ([\d.]+)%, above the (\d+)% pass mark\.$/, "आपको $1% अंक मिले, जो $2% उत्तीर्ण अंक से अधिक हैं।"],
  [/^You scored ([\d.]+)%\. You need (\d+)% to pass\. The study plan below is built from the questions you missed\.$/, "आपको $1% अंक मिले। उत्तीर्ण होने के लिए $2% चाहिए। नीचे गलत उत्तरों के आधार पर अध्ययन योजना है।"],
  [/^Too many (.+)\. Try again in (\d+)s\.$/, "बहुत अधिक अनुरोध। $2 सेकंड बाद पुनः प्रयास करें।"],
  [/^Imported (\d+) question\(s\)\.$/, "$1 प्रश्न आयात किए गए।"],
  [/^last seen (.+)$/, "अंतिम उपस्थिति $1"], [/^Page (\d+) of (\d+)$/, "पृष्ठ $1 / $2"],
  [/^Time remaining (.+)$/, "शेष समय $1"], [/^Actions for (.+)$/, "$1 के लिए कार्य"],
  [/^Showing (\d+)–(\d+) of (\d+)$/, "$3 में से $1–$2 दिखाए जा रहे हैं"],
];
export function currentLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try { return localStorage.getItem("mppiti.language") === "hi" ? "hi" : "en"; } catch { return "en"; }
}
