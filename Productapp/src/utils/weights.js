/**
 * Estimated grade weights from lot inputs + grade counts.
 * total_sampled_weight = crates_sampled * average_weight (same unit, e.g. kg)
 * avg A/B per crate = estimated grade weight / crates sampled
 */
export function calculateLotWeights({ cratesSampled, averageWeight, goodApples, badApples }) {
  const crates = Number(cratesSampled) || 0;
  const avg = Number(averageWeight) || 0;
  const good = Number(goodApples) || 0;
  const bad = Number(badApples) || 0;
  const totalCount = good + bad;
  const totalSampledWeight = crates * avg;

  let estimatedGood = 0;
  let estimatedBad = 0;
  if (totalCount > 0 && totalSampledWeight > 0) {
    estimatedGood = Math.round(totalSampledWeight * (good / totalCount) * 100) / 100;
    estimatedBad = Math.round(totalSampledWeight * (bad / totalCount) * 100) / 100;
  }

  const avgAPerCrate = crates > 0 ? Math.round((estimatedGood / crates) * 100) / 100 : 0;
  const avgBPerCrate = crates > 0 ? Math.round((estimatedBad / crates) * 100) / 100 : 0;

  return {
    total_sampled_weight: Math.round(totalSampledWeight * 100) / 100,
    estimated_good_weight: estimatedGood,
    estimated_bad_weight: estimatedBad,
    avg_a_grade_weight_per_crate: avgAPerCrate,
    avg_b_grade_weight_per_crate: avgBPerCrate,
    weight_unit: "kg",
  };
}

/**
 * Normalize email or mobile into API email field.
 * Mobile numbers become digits@phone.example.com
 * (.local is rejected by email-validator as reserved)
 */
export function toLoginEmail(emailOrMobile) {
  const v = (emailOrMobile || "").trim();
  if (!v) return "";
  if (v.includes("@")) return v.toLowerCase();
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  return `${digits}@phone.example.com`;
}
