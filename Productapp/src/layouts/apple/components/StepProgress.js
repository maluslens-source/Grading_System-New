import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { BRAND } from "config/brand";

const STEPS = [
  { label: "Lot", path: "/analysis/lot" },
  { label: "Photos", path: "/analysis/photos" },
  { label: "Review", path: "/analysis/review" },
];

/** Compact 3-step progress — completed steps are clickable to go back. */
function StepProgress({ step }) {
  const navigate = useNavigate();

  return (
    <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={3} gap={1}>
      {STEPS.map((item, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        const clickable = done;
        return (
          <MDBox key={item.label} display="flex" alignItems="center" flex={1} minWidth={0}>
            <MDBox
              component={clickable ? "button" : "div"}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => navigate(item.path) : undefined}
              display="flex"
              alignItems="center"
              justifyContent="center"
              width={28}
              height={28}
              borderRadius="50%"
              flexShrink={0}
              sx={{
                bgcolor: active || done ? BRAND.accent : BRAND.white,
                color: active || done ? BRAND.white : BRAND.black,
                border: `2px solid ${active || done ? BRAND.accent : "#d0d0d0"}`,
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: clickable ? "pointer" : "default",
                p: 0,
                ...(clickable
                  ? {
                      "&:hover": { boxShadow: "0 0 0 3px rgba(198,40,40,0.2)" },
                    }
                  : {}),
              }}
            >
              {done ? "✓" : n}
            </MDBox>
            <MDTypography
              variant="caption"
              fontWeight={active ? "bold" : "regular"}
              ml={1}
              onClick={clickable ? () => navigate(item.path) : undefined}
              sx={{
                color: BRAND.black,
                display: { xs: active ? "block" : "none", sm: "block" },
                cursor: clickable ? "pointer" : "default",
                ...(clickable ? { textDecoration: "underline", textUnderlineOffset: 2 } : {}),
              }}
            >
              {item.label}
            </MDTypography>
            {i < STEPS.length - 1 && (
              <MDBox
                flex={1}
                height="2px"
                mx={1}
                sx={{ bgcolor: done ? BRAND.accent : "#e0e0e0", minWidth: 12 }}
              />
            )}
          </MDBox>
        );
      })}
    </MDBox>
  );
}

StepProgress.propTypes = {
  step: PropTypes.oneOf([1, 2, 3]).isRequired,
};

export default StepProgress;
