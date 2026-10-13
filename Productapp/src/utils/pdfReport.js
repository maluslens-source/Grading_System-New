import { jsPDF } from "jspdf";

/** Pure black & white report (client request). */
const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

function buildDoc(report) {
  const doc = new jsPDF();
  const lot = report.lot || {};
  const summary = report.grade?.summary || {};
  const weights = report.weights || {};
  const when = report.createdAt ? new Date(report.createdAt).toLocaleString() : "";
  const unit = weights.weight_unit || "kg";
  const orgName = report.organisationName || report.organizationName || "—";
  const sampledBy = report.sampledByName || "—";

  // White header
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, 210, 36, "F");
  doc.setTextColor(...BLACK);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Quality Check Report", 14, 14);
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(String(orgName), 14, 24);
  doc.setFontSize(9);
  doc.text("Malus Lens", 14, 32);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(14, 36, 196, 36);

  doc.setFontSize(11);
  let y = 48;
  const line = (label, value) => {
    doc.setFont(undefined, "bold");
    doc.text(String(label), 14, y);
    doc.setFont(undefined, "normal");
    doc.text(String(value ?? "—"), 78, y);
    y += 8;
  };

  line("Generated", when);
  line("Grower Name", lot.growerName);
  line("Sub-Grower Name", lot.subGrowerName);
  line("Lot Number", lot.lotNumber);
  line("Crates Sampled", lot.cratesSampled);
  line("Avg Weight (kg)", lot.averageWeight);
  y += 4;

  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("Grading Summary", 14, y);
  doc.setFontSize(11);
  y += 8;
  line("Images analyzed", report.grade?.image_count);
  line("Total apples", summary.total_apples);
  line("A Grade", `${summary.good_apples} (${summary.pct_A ?? 0}%)`);
  line("B Grade", `${summary.bad_apples} (${summary.pct_B ?? 0}%)`);
  y += 4;

  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("Estimated Weights", 14, y);
  doc.setFontSize(11);
  y += 8;
  line("Total sampled", `${weights.total_sampled_weight} ${unit}`);
  line("Est. A Grade weight", `${weights.estimated_good_weight} ${unit}`);
  line("Est. B Grade weight", `${weights.estimated_bad_weight} ${unit}`);
  line("Avg A-Grade weight / crate", `${weights.avg_a_grade_weight_per_crate} ${unit}`);
  line("Avg B-Grade weight / crate", `${weights.avg_b_grade_weight_per_crate} ${unit}`);

  y += 14;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);
  y += 10;
  doc.setFont(undefined, "bold");
  doc.text(`Sampled by: ${sampledBy}`, 14, y);

  return doc;
}

/** Branded PDF on the client only — not stored on server. */
export function downloadAnalysisPdf(report) {
  const doc = buildDoc(report);
  const filename = `grading-${report.lot?.lotNumber || "lot"}-${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

export async function shareAnalysisPdf(report) {
  const doc = buildDoc(report);
  const filename = `grading-${report.lot?.lotNumber || "lot"}.pdf`;
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Quality Check Report",
        text: `Lot ${report.lot?.lotNumber || ""}`,
        files: [file],
      });
      return "shared";
    }
  } catch (err) {
    if (err?.name === "AbortError") return "cancelled";
  }
  doc.save(filename);
  return "downloaded";
}
