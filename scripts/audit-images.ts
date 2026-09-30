import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const imageKeywords = [
  // Hindi
  "चित्र में",
  "चित्र देखकर",
  "दिए गए चित्र",
  "दिखाए गए चित्र",
  "आकृति में",
  "आकृति देखकर",
  "निम्न आकृति",
  "आरेख में",
  "आरेख देखकर",
  "दर्शाए गए",
  "दिखाए गए चिन्ह",
  "प्रतीक को पहचानें",
  "चित्र की पहचान",
  "चित्र में दिखाए गए",
  // English
  "shown in the picture",
  "shown in the image",
  "shown in the figure",
  "identify the figure",
  "identify the image",
  "identify the symbol shown",
  "refer to the figure",
  "refer to the diagram",
  "according to the diagram",
  "look at the picture",
  "image shown below",
  "figure shown below",
  "diagram shown below",
  "shown above",
  "pictured below"
];

// We want to avoid false positives for just "identify the symbol" without "shown".
// The above list is pretty specific.

async function audit() {
  const allQuestions = await prisma.question.findMany({
    select: {
      id: true,
      occupation: true,
      subject: true,
      question: true,
      questionHi: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      optionAHi: true,
      optionBHi: true,
      optionCHi: true,
      optionDHi: true,
      explanation: true,
      explanationHi: true
    }
  });

  const suspected = [];

  for (const q of allQuestions) {
    let isDependent = false;
    let reason = '';
    
    const textToSearch = [
      q.question, q.questionHi, 
      q.optionA, q.optionB, q.optionC, q.optionD,
      q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi,
      q.explanation, q.explanationHi
    ].filter(Boolean).join(' ').toLowerCase();

    for (const kw of imageKeywords) {
      if (textToSearch.includes(kw.toLowerCase())) {
        isDependent = true;
        reason = `Matches keyword: "${kw}"`;
        break;
      }
    }

    if (isDependent) {
      suspected.push({
        id: q.id,
        occupation: q.occupation,
        subject: q.subject,
        text: q.question,
        textHi: q.questionHi,
        reason,
        confidence: 'HIGH',
        category: 'A' // Since there's no image field in the DB, it's definitely missing
      });
    }
  }

  // Generate Report
  let report = `# Question Database Image Dependency Audit\n\n`;
  report += `**Total Questions Scanned:** ${allQuestions.length}\n`;
  report += `**Suspected Image-Dependent Questions:** ${suspected.length}\n\n`;

  const byTrade = suspected.reduce((acc, q) => {
    acc[q.occupation] = (acc[q.occupation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  report += `### Breakdown by Trade\n`;
  for (const [trade, count] of Object.entries(byTrade)) {
    report += `- **${trade}:** ${count}\n`;
  }

  const bySubject = suspected.reduce((acc, q) => {
    acc[q.subject] = (acc[q.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  report += `\n### Breakdown by Subject\n`;
  for (const [subj, count] of Object.entries(bySubject)) {
    report += `- **${subj}:** ${count}\n`;
  }

  report += `\n### Detailed List (First 100)\n\n`;
  report += `| ID | Trade | Subject | Confidence | Reason | Category | Question (EN/HI) |\n`;
  report += `|---|---|---|---|---|---|---|\n`;

  for (const q of suspected.slice(0, 100)) {
    const qText = (q.text || '').replace(/\n/g, ' ') + (q.textHi ? ' / ' + q.textHi.replace(/\n/g, ' ') : '');
    report += `| ${q.id} | ${q.occupation} | ${q.subject} | ${q.confidence} | ${q.reason} | ${q.category} | ${qText} |\n`;
  }
  
  if (suspected.length > 100) {
    report += `\n... and ${suspected.length - 100} more.\n`;
  }

  // write full json of ids for easy deletion later
  fs.writeFileSync('suspected_ids.json', JSON.stringify(suspected.map(s => s.id)));
  fs.writeFileSync('audit_report.md', report);

  console.log("Audit complete. Found", suspected.length);
}

audit()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
