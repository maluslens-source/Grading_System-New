import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import { useAnalysis } from "context/AnalysisContext";
import { useAuth } from "context/AuthContext";
import { downloadAnalysisPdf, shareAnalysisPdf } from "utils/pdfReport";
import { BRAND, cardSx, primaryBtnSx } from "config/brand";

function Stat({ label, value, accent }) {
  return (
    <Card
      sx={{
        ...cardSx,
        p: 2,
        textAlign: "center",
        height: "100%",
        borderTop: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      <MDTypography variant="caption" sx={{ color: BRAND.black, opacity: 0.6 }}>
        {label}
      </MDTypography>
      <MDTypography variant="h4" fontWeight="bold" mt={0.5} sx={{ color: BRAND.black }}>
        {value}
      </MDTypography>
    </Card>
  );
}

Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  accent: PropTypes.string,
};

function Results() {
  const { result, resetAnalysis } = useAnalysis();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    document.title = "Results · Malus Lens";
    if (!result) navigate("/dashboard", { replace: true });
  }, [result, navigate]);

  if (!result) return null;

  const summary = result.grade?.summary || {};
  const weights = result.weights || {};
  const unit = weights.weight_unit || "kg";

  const reportPayload = {
    ...result,
    organisationName: user?.organization_name || "—",
    sampledByName: user?.full_name || "—",
  };

  const onDownload = () => {
    downloadAnalysisPdf(reportPayload);
    setShareMsg("PDF downloaded on this device.");
  };

  const onShare = async () => {
    const mode = await shareAnalysisPdf(reportPayload);
    if (mode === "shared") setShareMsg("Shared via device share sheet.");
    else if (mode === "downloaded") setShareMsg("Share not available — PDF downloaded instead.");
  };

  const newAnalysis = () => {
    resetAnalysis();
    navigate("/analysis/lot");
  };

  const countRows = [
    { label: "A Grade (good)", value: summary.good_apples ?? 0, color: "#2e7d32" },
    { label: "B Grade (defective)", value: summary.bad_apples ?? 0, color: BRAND.accentDark },
  ];
  const weightRows = [
    { label: "Total sampled", value: `${weights.total_sampled_weight} ${unit}` },
    { label: "Est. A Grade", value: `${weights.estimated_good_weight} ${unit}` },
    { label: "Est. B Grade", value: `${weights.estimated_bad_weight} ${unit}` },
    {
      label: "Avg A-Grade weight / crate",
      value: `${weights.avg_a_grade_weight_per_crate ?? 0} ${unit}`,
    },
    {
      label: "Avg B-Grade weight / crate",
      value: `${weights.avg_b_grade_weight_per_crate ?? 0} ${unit}`,
    },
  ];

  return (
    <AppShell title="Results">
      <Card sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
          <MDBox display="flex" alignItems="center" gap={1.5}>
            <MDBox
              display="flex"
              alignItems="center"
              justifyContent="center"
              width={48}
              height={48}
              borderRadius={2}
              sx={{ bgcolor: "rgba(198,40,40,0.12)" }}
            >
              <Icon sx={{ color: BRAND.accent, fontSize: 28 }}>assessment</Icon>
            </MDBox>
            <MDBox>
              <MDTypography variant="h5" fontWeight="bold" sx={{ color: BRAND.black }}>
                Analysis results
              </MDTypography>
              <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.65 }}>
                Lot {result.lot.lotNumber} · {result.grade?.image_count || 0} image(s)
              </MDTypography>
              {(result.lot.growerName || result.lot.subGrowerName) && (
                <MDTypography
                  variant="caption"
                  display="block"
                  sx={{ color: BRAND.black, opacity: 0.55 }}
                >
                  {[result.lot.growerName, result.lot.subGrowerName].filter(Boolean).join(" · ")}
                </MDTypography>
              )}
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>

      <Grid container spacing={2} mb={2.5}>
        <Grid item xs={4}>
          <Stat label="Total apples" value={summary.total_apples ?? 0} />
        </Grid>
        <Grid item xs={4}>
          <Stat label="A Grade %" value={`${summary.pct_A ?? 0}%`} accent="#2e7d32" />
        </Grid>
        <Grid item xs={4}>
          <Stat label="B Grade %" value={`${summary.pct_B ?? 0}%`} accent={BRAND.accent} />
        </Grid>
      </Grid>

      <Card sx={{ ...cardSx, p: 0, mb: 2, overflow: "hidden" }}>
        <MDBox px={2.5} py={1.5} sx={{ bgcolor: BRAND.grey, borderBottom: "1px solid #eee" }}>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.black }}>
            Counts
          </MDTypography>
        </MDBox>
        <MDBox px={2.5} py={1}>
          {countRows.map((row, i) => (
            <MDBox key={row.label}>
              <MDBox display="flex" justifyContent="space-between" py={1.25}>
                <MDTypography variant="body2" sx={{ color: row.color, fontWeight: 600 }}>
                  {row.label}
                </MDTypography>
                <MDTypography variant="body2" fontWeight="bold" sx={{ color: BRAND.black }}>
                  {row.value}
                </MDTypography>
              </MDBox>
              {i < countRows.length - 1 && <Divider />}
            </MDBox>
          ))}
        </MDBox>
      </Card>

      <Card sx={{ ...cardSx, p: 0, mb: 2.5, overflow: "hidden" }}>
        <MDBox px={2.5} py={1.5} sx={{ bgcolor: BRAND.grey, borderBottom: "1px solid #eee" }}>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.black }}>
            Estimated weights
          </MDTypography>
        </MDBox>
        <MDBox px={2.5} py={1}>
          {weightRows.map((row, i) => (
            <MDBox key={row.label}>
              <MDBox display="flex" justifyContent="space-between" py={1.25} gap={2}>
                <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.65 }}>
                  {row.label}
                </MDTypography>
                <MDTypography variant="body2" fontWeight="bold" sx={{ color: BRAND.black }}>
                  {row.value}
                </MDTypography>
              </MDBox>
              {i < weightRows.length - 1 && <Divider />}
            </MDBox>
          ))}
        </MDBox>
      </Card>

      {shareMsg && (
        <Alert
          severity="success"
          icon={false}
          onClose={() => setShareMsg("")}
          sx={{
            mb: 2,
            bgcolor: BRAND.white,
            border: `1px solid ${BRAND.accent}`,
            borderRadius: 2,
            "& .MuiAlert-message": { color: BRAND.black },
          }}
        >
          {shareMsg}
        </Alert>
      )}

      <MDTypography
        variant="caption"
        display="block"
        mb={1.5}
        sx={{ color: BRAND.black, opacity: 0.55 }}
      >
        Reports stay on this device — nothing is stored as history on the server.
      </MDTypography>

      <MDButton
        variant="gradient"
        fullWidth
        size="large"
        onClick={onDownload}
        sx={{ ...primaryBtnSx, mb: 1 }}
      >
        <Icon sx={{ mr: 1 }}>picture_as_pdf</Icon>
        Download PDF report
      </MDButton>
      <MDButton
        variant="outlined"
        fullWidth
        size="large"
        onClick={onShare}
        sx={{
          mb: 1,
          py: 1.4,
          borderColor: BRAND.accent,
          color: BRAND.accentDark,
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 2,
          "&:hover": { borderColor: BRAND.accentDark, bgcolor: "rgba(198,40,40,0.06)" },
        }}
      >
        Share PDF
      </MDButton>
      <MDButton
        variant="gradient"
        fullWidth
        size="large"
        onClick={newAnalysis}
        sx={{ ...primaryBtnSx, mb: 1 }}
      >
        New Analysis
      </MDButton>
      <MDButton
        variant="text"
        fullWidth
        onClick={() => navigate("/dashboard")}
        sx={{ color: BRAND.black, textTransform: "none" }}
      >
        Back to dashboard
      </MDButton>
    </AppShell>
  );
}

export default Results;
