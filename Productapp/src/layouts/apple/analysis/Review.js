import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import StepProgress from "layouts/apple/components/StepProgress";
import { useAnalysis } from "context/AnalysisContext";
import { BRAND, cardSx, primaryBtnSx } from "config/brand";

function Review() {
  const { lot, photos } = useAnalysis();
  const navigate = useNavigate();

  const cratesNeeded = Math.max(0, Number(lot.cratesSampled) || 0);
  const exactMatch = cratesNeeded > 0 && photos.length === cratesNeeded;

  useEffect(() => {
    document.title = "Review · Malus Lens";
    if (!lot.lotNumber || cratesNeeded < 1) {
      navigate("/analysis/lot", { replace: true });
      return;
    }
    if (!exactMatch) navigate("/analysis/photos", { replace: true });
  }, [lot.lotNumber, cratesNeeded, exactMatch, navigate]);

  const rows = [
    { label: "Grower Name", value: lot.growerName || "—" },
    { label: "Sub-Grower Name", value: lot.subGrowerName || "—" },
    { label: "Lot number", value: lot.lotNumber || "—" },
    { label: "Crates sampled", value: lot.cratesSampled },
    { label: "Avg weight", value: `${lot.averageWeight} kg / crate` },
    { label: "Photos", value: `${photos.length} (1 per crate)` },
  ];

  return (
    <AppShell title="New Analysis">
      <StepProgress step={3} />
      <MDTypography variant="h4" fontWeight="bold" mb={0.5} sx={{ color: BRAND.black }}>
        Review & submit
      </MDTypography>
      <MDTypography variant="body2" mb={2.5} sx={{ color: BRAND.black, opacity: 0.7 }}>
        Confirm details, then submit for AI grading.
      </MDTypography>

      <Card sx={{ ...cardSx, p: 0, mb: 2, overflow: "hidden" }}>
        <MDBox
          px={2.5}
          py={1.5}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ bgcolor: BRAND.grey, borderBottom: "1px solid #eee" }}
        >
          <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.black }}>
            Lot summary
          </MDTypography>
          <MDButton
            variant="text"
            size="small"
            onClick={() => navigate("/analysis/lot")}
            sx={{ color: BRAND.accent, textTransform: "none", fontWeight: 700, minHeight: 32 }}
          >
            Edit
          </MDButton>
        </MDBox>
        <MDBox px={2.5} py={1}>
          {rows.map((row, i) => (
            <MDBox key={row.label}>
              <MDBox display="flex" justifyContent="space-between" py={1.25} gap={2}>
                <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.65 }}>
                  {row.label}
                </MDTypography>
                <MDTypography
                  variant="body2"
                  fontWeight="medium"
                  textAlign="right"
                  sx={{ color: BRAND.black }}
                >
                  {row.value}
                </MDTypography>
              </MDBox>
              {i < rows.length - 1 && <Divider />}
            </MDBox>
          ))}
        </MDBox>
      </Card>

      <Card sx={{ ...cardSx, p: 2, mb: 2.5 }}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.black }}>
            Photos ({photos.length}/{cratesNeeded})
          </MDTypography>
          <MDButton
            variant="text"
            size="small"
            onClick={() => navigate("/analysis/photos")}
            sx={{ color: BRAND.accent, textTransform: "none", fontWeight: 700, minHeight: 32 }}
          >
            Edit
          </MDButton>
        </MDBox>
        <Grid container spacing={1}>
          {photos.map((p, idx) => (
            <Grid item xs={3} key={p.id}>
              <MDBox position="relative">
                <MDBox
                  component="img"
                  src={p.previewUrl}
                  alt={`Crate ${idx + 1}`}
                  width="100%"
                  height={72}
                  sx={{ objectFit: "cover", borderRadius: 1.5, border: "1px solid #eee" }}
                />
                <MDTypography
                  variant="caption"
                  fontWeight="bold"
                  sx={{
                    position: "absolute",
                    left: 4,
                    bottom: 4,
                    px: 0.5,
                    borderRadius: 0.5,
                    bgcolor: "rgba(0,0,0,0.65)",
                    color: BRAND.white,
                  }}
                >
                  {idx + 1}
                </MDTypography>
              </MDBox>
            </Grid>
          ))}
        </Grid>
      </Card>

      <MDButton
        variant="gradient"
        fullWidth
        size="large"
        disabled={!exactMatch}
        onClick={() => navigate("/analysis/processing")}
        sx={primaryBtnSx}
      >
        Submit for analysis
      </MDButton>
      <MDButton
        variant="text"
        fullWidth
        onClick={() => navigate("/analysis/photos")}
        sx={{ color: BRAND.black, textTransform: "none", mt: 0.5 }}
      >
        Back to photos
      </MDButton>
    </AppShell>
  );
}

export default Review;
