import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import StepProgress from "layouts/apple/components/StepProgress";
import { useAnalysis } from "context/AnalysisContext";
import { BRAND, cardSx, primaryBtnSx, inputBlackSx } from "config/brand";

const MAX_CRATES = 10;

function LotDetails() {
  const { lot, updateLot } = useAnalysis();
  const navigate = useNavigate();
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    document.title = "Lot details · Malus Lens";
  }, []);

  const crates = Number(lot.cratesSampled);
  const cratesOk = crates >= 1 && crates <= MAX_CRATES;
  const canNext = String(lot.lotNumber || "").trim() && cratesOk && Number(lot.averageWeight) > 0;

  const onNext = () => {
    setTouched(true);
    if (!canNext) return;
    navigate("/analysis/photos");
  };

  return (
    <AppShell title="New Analysis">
      <StepProgress step={1} />
      <MDTypography variant="h4" fontWeight="bold" mb={0.5} sx={{ color: BRAND.black }}>
        Lot details
      </MDTypography>
      <MDTypography variant="body2" mb={2.5} sx={{ color: BRAND.black, opacity: 0.7 }}>
        Enter sampling info. Next you will add exactly 1 tray photo per crate.
      </MDTypography>

      <Alert
        icon={<Icon sx={{ color: BRAND.accent }}>info</Icon>}
        sx={{
          mb: 2,
          bgcolor: "#fff8f8",
          border: "1px solid #f0c7c7",
          borderRadius: 2,
          "& .MuiAlert-message": { color: BRAND.black },
        }}
      >
        Tip: crates sampled drives how many photos you must capture (max {MAX_CRATES}).
      </Alert>

      <Card sx={{ ...cardSx, p: 3 }}>
        <MDBox mb={2.5}>
          <MDInput
            label="Grower Name (optional)"
            fullWidth
            value={lot.growerName}
            onChange={(e) => updateLot({ growerName: e.target.value })}
            sx={inputBlackSx}
          />
        </MDBox>
        <MDBox mb={2.5}>
          <MDInput
            label="Sub-Grower Name (optional)"
            fullWidth
            value={lot.subGrowerName}
            onChange={(e) => updateLot({ subGrowerName: e.target.value })}
            sx={inputBlackSx}
          />
        </MDBox>
        <MDBox mb={2.5}>
          <MDInput
            label="Lot Number"
            fullWidth
            value={lot.lotNumber}
            onChange={(e) => updateLot({ lotNumber: e.target.value })}
            sx={inputBlackSx}
          />
        </MDBox>
        <MDBox mb={2.5}>
          <MDInput
            type="number"
            label="Crates Sampled"
            fullWidth
            value={lot.cratesSampled}
            onChange={(e) => updateLot({ cratesSampled: e.target.value })}
            inputProps={{ min: 1, max: MAX_CRATES, step: 1 }}
            sx={inputBlackSx}
          />
          <MDTypography
            variant="caption"
            display="block"
            mt={0.75}
            sx={{ color: BRAND.black, opacity: 0.65 }}
          >
            Required photos = crates sampled (1 image per crate, max {MAX_CRATES}).
          </MDTypography>
        </MDBox>
        <MDBox mb={2}>
          <MDInput
            type="number"
            label="Average Weight (kg / crate)"
            fullWidth
            value={lot.averageWeight}
            onChange={(e) => updateLot({ averageWeight: e.target.value })}
            inputProps={{ min: 0.01, step: 0.01 }}
            sx={inputBlackSx}
          />
        </MDBox>

        {touched && !canNext && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            {!String(lot.lotNumber || "").trim()
              ? "Lot number is required."
              : !cratesOk
              ? `Crates sampled must be between 1 and ${MAX_CRATES}.`
              : "Enter a valid average weight greater than 0."}
          </Alert>
        )}

        <MDButton variant="gradient" fullWidth size="large" onClick={onNext} sx={primaryBtnSx}>
          Next: Photos
        </MDButton>
        <MDBox mt={1}>
          <MDButton
            variant="text"
            fullWidth
            onClick={() => navigate("/dashboard")}
            sx={{ color: BRAND.black, textTransform: "none" }}
          >
            Cancel to dashboard
          </MDButton>
        </MDBox>
      </Card>
    </AppShell>
  );
}

export default LotDetails;
