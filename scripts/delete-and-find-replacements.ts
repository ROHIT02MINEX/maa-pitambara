import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function run() {
  const idsToProcess = JSON.parse(fs.readFileSync('suspected_ids.json', 'utf8'));
  
  const beforeCount = await prisma.question.count({ where: { active: true } });
  
  // Get details for breakdown before deactivating
  const questionsToDeactivate = await prisma.question.findMany({
    where: { id: { in: idsToProcess } }
  });
  
  const breakdown = {};
  for (const q of questionsToDeactivate) {
    const key = `${q.occupation} | ${q.subject}`; // Simplification since year isn't directly on question
    breakdown[key] = (breakdown[key] || 0) + 1;
  }

  // Safely delete by setting active = false to preserve TestAnswers and scores
  const result = await prisma.question.updateMany({
    where: { id: { in: idsToProcess } },
    data: { active: false }
  });
  
  const deletedCount = result.count;
  const remainingCount = await prisma.question.count({ where: { active: true } });

  console.log(`Before count: ${beforeCount}`);
  console.log(`Deleted/Deactivated count: ${deletedCount}`);
  console.log(`Remaining count: ${remainingCount}`);
  
  console.log("\nReplacement Requirement by Trade/Subject:");
  for (const [key, count] of Object.entries(breakdown)) {
    console.log(`- ${key}: ${count} questions needed`);
  }
  
  // Now check question-bank.json for unused text-only questions
  const bankData = JSON.parse(fs.readFileSync('prisma/data/question-bank.json', 'utf8'));
  const activeQuestions = await prisma.question.findMany({ where: { active: true }, select: { importKey: true } });
  const activeImportKeys = new Set(activeQuestions.map(q => q.importKey).filter(Boolean));
  
  const imageKeywords = [
    "चित्र में", "चित्र देखकर", "दिए गए चित्र", "दिखाए गए चित्र", "आकृति में", 
    "आकृति देखकर", "निम्न आकृति", "आरेख में", "आरेख देखकर", "दर्शाए गए", "दिखाए गए चिन्ह",
    "प्रतीक को पहचानें", "चित्र की पहचान", "चित्र में दिखाए गए",
    "shown in the picture", "shown in the image", "shown in the figure",
    "identify the figure", "identify the image", "identify the symbol shown",
    "refer to the figure", "refer to the diagram", "according to the diagram",
    "look at the picture", "image shown below", "figure shown below",
    "diagram shown below", "shown above", "pictured below"
  ];
  
  let suitableReplacementsCount = 0;
  let breakdownReplacements = {};
  
  for (const item of bankData) {
    // Basic checks
    if (!item.question || !item.optionA || !item.optionB || !item.optionC || !item.optionD || !item.correctAnswer) continue;
    
    // Check if it's already active
    if (activeImportKeys.has(item.importKey)) continue;
    
    // Check if it's image dependent
    let isDependent = false;
    const textToSearch = [
      item.question, item.questionHi, 
      item.optionA, item.optionB, item.optionC, item.optionD,
      item.optionAHi, item.optionBHi, item.optionCHi, item.optionDHi,
      item.explanation, item.explanationHi
    ].filter(Boolean).join(' ').toLowerCase();
    
    for (const kw of imageKeywords) {
      if (textToSearch.includes(kw.toLowerCase())) {
        isDependent = true;
        break;
      }
    }
    
    if (!isDependent) {
      suitableReplacementsCount++;
      const key = `${item.occupation} | ${item.subject || 'TRADE_THEORY'}`;
      breakdownReplacements[key] = (breakdownReplacements[key] || 0) + 1;
    }
  }

  console.log(`\nNumber of suitable official replacement questions found in JSON: ${suitableReplacementsCount}`);
  if (suitableReplacementsCount > 0) {
     console.log("Replacement candidates by category:");
     for (const [key, count] of Object.entries(breakdownReplacements)) {
        console.log(`- ${key}: ${count} available`);
     }
  }
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
