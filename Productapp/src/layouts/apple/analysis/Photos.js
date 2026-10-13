import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import StepProgress from "layouts/apple/components/StepProgress";
import { useAnalysis } from "context/AnalysisContext";
import { BRAND, cardSx, primaryBtnSx } from "config/brand";

function Photos() {
  const { photos, addPhotos, removePhoto, lot } = useAnalysis();
  const navigate = useNavigate();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const cratesNeeded = Math.max(0, Number(lot.cratesSampled) || 0);
  const exactMatch = cratesNeeded > 0 && photos.length === cratesNeeded;
  const remaining = Math.max(0, cratesNeeded - photos.length);
  const progress = cratesNeeded > 0 ? Math.min(100, (photos.length / cratesNeeded) * 100) : 0;

  useEffect(() => {
    document.title = "Photos · Malus Lens";
    if (!lot.lotNumber || cratesNeeded < 1) navigate("/analysis/lot", { replace: true });
  }, [lot.lotNumber, cratesNeeded, navigate]);

  return (
    <AppShell title="New Analysis">
      <StepProgress step={2} />
      <MDBox display="flex" justifyContent="space-between" alignItems="baseline" mb={0.5}>
        <MDTypography variant="h4" fontWeight="bold" sx={{ color: BRAND.black }}>
          Capture or upload
        </MDTypography>
        <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.accent }}>
          {photos.length}/{cratesNeeded}
        </MDTypography>
      </MDBox>
      <MDTypography variant="body2" mb={1.5} sx={{ color: BRAND.black, opacity: 0.7 }}>
        Lot {lot.lotNumber} · exactly {cratesNeeded} tray photo{cratesNeeded === 1 ? "" : "s"} (1
        per crate).
      </MDTypography>

      <MDBox mb={2.5}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: "#eee",
            "& .MuiLinearProgress-bar": {
              bgcolor: exactMatch ? "#2e7d32" : BRAND.accent,
              borderRadius: 4,
            },
          }}
        />
        <MDTypography
          variant="caption"
          display="block"
          mt={0.75}
          sx={{ color: BRAND.black, opacity: 0.6 }}
        >
          {exactMatch
            ? "All crates covered — continue to review."
            : `${remaining} photo${remaining === 1 ? "" : "s"} still needed.`}
        </MDTypography>
      </MDBox>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addPhotos(e.target.files, cratesNeeded);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addPhotos(e.target.files, cratesNeeded);
          e.target.value = "";
        }}
      />

      <Grid container spacing={2} mb={2}>
        <Grid item xs={6}>
          <MDButton
            variant="gradient"
            fullWidth
            size="large"
            disabled={photos.length >= cratesNeeded}
            onClick={() => cameraRef.current?.click()}
            sx={{ ...primaryBtnSx, py: 2 }}
          >
            <Icon sx={{ mr: 1 }}>photo_camera</Icon>
            Camera
          </MDButton>
        </Grid>
        <Grid item xs={6}>
          <MDButton
            variant="outlined"
            fullWidth
            size="large"
            disabled={photos.length >= cratesNeeded}
            onClick={() => galleryRef.current?.click()}
            sx={{
              py: 2,
              borderColor: BRAND.accent,
              color: BRAND.accentDark,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              "&:hover": { borderColor: BRAND.accentDark, bgcolor: "rgba(198,40,40,0.06)" },
            }}
          >
            <Icon sx={{ mr: 1 }}>photo_library</Icon>
            Upload
          </MDButton>
        </Grid>
      </Grid>

      {photos.length > 0 && !exactMatch && (
        <Alert
          severity="info"
          icon={false}
          sx={{
            mb: 2,
            bgcolor: BRAND.white,
            border: `1px solid ${BRAND.accent}`,
            borderRadius: 2,
            "& .MuiAlert-message": { color: BRAND.black },
          }}
        >
          {photos.length < cratesNeeded
            ? `Add ${remaining} more image${remaining === 1 ? "" : "s"} to match crates sampled.`
            : `Remove ${photos.length - cratesNeeded} image(s) — must equal crates sampled.`}
        </Alert>
      )}

      <Card sx={{ ...cardSx, p: 2, mb: 2.5 }}>
        {photos.length === 0 ? (
          <MDBox textAlign="center" py={5}>
            <Icon sx={{ fontSize: 40, color: "#ccc", mb: 1 }}>image</Icon>
            <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.6 }}>
              No photos yet — use Camera or Upload
            </MDTypography>
            <MDTypography
              variant="caption"
              display="block"
              mt={1}
              sx={{ color: BRAND.black, opacity: 0.45 }}
            >
              Prefer a clear top-down tray photo with good light.
            </MDTypography>
          </MDBox>
        ) : (
          <Grid container spacing={1.5}>
            {photos.map((p, idx) => (
              <Grid item xs={4} key={p.id}>
                <MDBox position="relative">
                  <MDBox
                    component="img"
                    src={p.previewUrl}
                    alt={p.file.name}
                    width="100%"
                    height="100px"
                    sx={{ objectFit: "cover", borderRadius: 2, border: "1px solid #eee" }}
                  />
                  <MDBox
                    position="absolute"
                    left={6}
                    bottom={6}
                    px={0.75}
                    py={0.25}
                    borderRadius={1}
                    sx={{ bgcolor: "rgba(0,0,0,0.7)" }}
                  >
                    <MDTypography variant="caption" fontWeight="bold" sx={{ color: BRAND.white }}>
                      Crate {idx + 1}
                    </MDTypography>
                  </MDBox>
                  <IconButton
                    size="small"
                    aria-label={`Remove crate ${idx + 1} photo`}
                    onClick={() => removePhoto(p.id)}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      bgcolor: "rgba(0,0,0,0.65)",
                      color: BRAND.white,
                      "&:hover": { bgcolor: BRAND.black },
                    }}
                  >
                    <Icon fontSize="small">close</Icon>
                  </IconButton>
                </MDBox>
              </Grid>
            ))}
          </Grid>
        )}
      </Card>

      <MDButton
        variant="gradient"
        fullWidth
        size="large"
        disabled={!exactMatch}
        onClick={() => navigate("/analysis/review")}
        sx={primaryBtnSx}
      >
        Next: Review
      </MDButton>
      <MDButton
        variant="text"
        fullWidth
        onClick={() => navigate("/analysis/lot")}
        sx={{ color: BRAND.black, textTransform: "none", mt: 0.5 }}
      >
        Back to lot details
      </MDButton>
    </AppShell>
  );
}

export default Photos;
