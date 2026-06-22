import {
  computeMonitorScore,
  computeEditorScore,
  computeChiefScore,
  speedBonusFromHours,
  priorityWeight,
  qualityWeight,
} from "../src/constants/newsAnalyticsScoring.js";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("newsAnalyticsScoring tests\n");

assert(priorityWeight(1) === 4, "priority 1 weight");
assert(qualityWeight(5) === 4, "quality 5 weight");
assert(computeMonitorScore({ newsCount: 10, avgPriorityWeight: 3, avgQualityWeight: 3 }) === 22, "monitor score");
assert(computeEditorScore({ reviewedCount: 5, avgApprovedPriorityWeight: 2, avgApprovedQualityWeight: 3, speedBonus: 0.5 }) === 15.5, "editor score");
assert(computeChiefScore({ publishedCount: 3, avgPriorityWeight: 4, avgQualityWeight: 4, speedBonus: 1 }) === 20, "chief score");
assert(speedBonusFromHours(0) === 1, "speed bonus instant");
assert(speedBonusFromHours(48) === 0, "speed bonus max delay");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
