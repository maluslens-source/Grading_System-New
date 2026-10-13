import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import { useAnalysis } from "context/AnalysisContext";
import { BRAND, cardSx, primaryBtnSx } from "config/brand";

function Processing() {
  const { photos, lot, submitAnalysis, error, submitting } = useAnalysis();
  const navigate = useNavigate();
  const started = useRef(false);
  const [retrying, setRetrying] = useState(false);

  const run = async () => {
    try {
      await submitAnalysis();
      navigate("/analysis/results", { replace: true });
    } catch {
      /* error shown below */
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    document.title = "Analyzing · Malus Lens";
    if (!lot.lotNumber || photos.length < 1) {
      navigate("/analysis/lot", { replace: true });
      return undefined;
    }
    if (started.current) return undefined;
    started.current = true;
    run();
    return undefined;
  }, [lot.lotNumber, photos.length, navigate]);

  const onRetry = () => {
    setRetrying(true);
    run();
  };

  return (
    <AppShell title="Processing" showLogout={false}>
      <Card sx={{ ...cardSx, p: { xs: 3, md: 4 }, textAlign: "center" }}>
        {!error && (
          <>
            <CircularProgress size={56} sx={{ mb: 2, color: BRAND.accent }} />
            <MDTypography variant="h5" fontWeight="bold" gutterBottom sx={{ color: BRAND.black }}>
              Analyzing trays…
            </MDTypography>
            <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.75 }}>
              Lot {lot.lotNumber} · {photos.length} photo{photos.length === 1 ? "" : "s"}
            </MDTypography>
            <MDTypography
              variant="caption"
              display="block"
              mt={2}
              sx={{ color: BRAND.black, opacity: 0.55 }}
            >
              {submitting ? "Please wait while we grade the trays." : "Preparing…"}
            </MDTypography>
          </>
        )}
        {error && (
          <MDBox>
            <MDBox
              mx="auto"
              mb={2}
              width={56}
              height={56}
              borderRadius="50%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{ bgcolor: "rgba(198,40,40,0.12)" }}
            >
              <Icon sx={{ color: BRAND.accent, fontSize: 32 }}>error_outline</Icon>
            </MDBox>
            <MDTypography variant="h5" fontWeight="bold" gutterBottom sx={{ color: BRAND.black }}>
              Analysis failed
            </MDTypography>
            <MDTypography variant="body2" mb={3} sx={{ color: BRAND.black, opacity: 0.8 }}>
              {error}
            </MDTypography>
            <MDButton
              fullWidth
              disabled={retrying || submitting}
              onClick={onRetry}
              sx={{ ...primaryBtnSx, mb: 1 }}
            >
              {retrying || submitting ? "Retrying…" : "Retry analysis"}
            </MDButton>
            <MDButton
              variant="outlined"
              fullWidth
              onClick={() => navigate("/analysis/review")}
              sx={{
                color: BRAND.black,
                borderColor: "#ccc",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Back to review
            </MDButton>
          </MDBox>
        )}
      </Card>
    </AppShell>
  );
}

export default Processing;
