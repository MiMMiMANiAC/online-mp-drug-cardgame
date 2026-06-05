import { analyzeAllCards } from "../src/game/balance";
import { cards } from "../src/game/cards";

const analysis = analyzeAllCards(cards);
const severeWarnings = analysis.warnings.filter((warning) => warning.severity === "danger");

console.log("Nebenwirkungen card balance check");
console.log("----------------------------------");
console.log(`Cards:       ${analysis.totalCards}`);
console.log(`Fair:        ${analysis.fairCards}`);
console.log(`Too strong:  ${analysis.tooStrongCards}`);
console.log(`Too weak:    ${analysis.tooWeakCards}`);
console.log(`Needs review:${analysis.needsReviewCards}`);
console.log(`Warnings:    ${analysis.warnings.length}`);
console.log(`Danger:      ${severeWarnings.length}`);
console.log("");

console.log("Average deviation by Cash cost:");
for (const [cost, deviation] of Object.entries(analysis.averageDeviationByCost)) {
  console.log(`  ${cost}: ${formatDeviation(deviation)}`);
}
console.log("");

console.log("Average deviation by faction:");
for (const [faction, deviation] of Object.entries(analysis.averageDeviationByFaction)) {
  console.log(`  ${faction}: ${formatDeviation(deviation)}`);
}
console.log("");

console.log("Most suspicious cards:");
for (const evaluation of analysis.mostSuspiciousCards) {
  console.log(`  ${evaluation.name} (${evaluation.cardId})`);
  console.log(`    result: ${evaluation.rating}`);
  console.log(`    cost: ${evaluation.cost}`);
  console.log(`    expected budget: ${evaluation.adjustedBudget}`);
  console.log(`    estimated value: ${evaluation.estimatedValue}`);
  console.log(`    deviation: ${formatDeviation(evaluation.deviation)}`);
  console.log(`    effect: ${evaluation.effectStrength} [${formatList(evaluation.effectCategories)}]`);
  console.log(`    drawback: ${evaluation.drawbackStrength} [${formatList(evaluation.drawbackCategories)}]`);
  console.log(`    reason: ${evaluation.reason}`);
  for (const warning of evaluation.warnings.slice(0, 3)) {
    console.log(`    [${warning.severity}] ${warning.code}: ${warning.message}`);
  }
}

if (severeWarnings.length) {
  console.log("");
  console.log("Extreme warnings found. These should be reviewed manually, but this script does not change card values.");
}

function formatDeviation(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatList(items: string[]) {
  return items.length ? items.join(", ") : "none";
}
