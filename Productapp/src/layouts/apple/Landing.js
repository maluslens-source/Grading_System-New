import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useMaterialUIController, setLayout } from "context";
import { useAuth } from "context/AuthContext";
import { BRAND, cardSx, primaryBtnSx } from "config/brand";
import { LANDING } from "config/landing";
import appLogo from "assets/images/app-logo.png";
import landingHero from "assets/images/landing-hero.jpg";
import sampleApple from "assets/images/sample-apple.jpg";

const NAVY = "#1a2332";
const CHARCOAL = "#2c3340";

const navLinks = [
  { id: "how", label: "How it works" },
  { id: "about", label: "About" },
  { id: "problem", label: "Problem" },
  { id: "benefits", label: "Benefits" },
  { id: "accuracy", label: "Accuracy" },
  { id: "showcase", label: "Product" },
  { id: "vision", label: "Vision" },
  { id: "contact", label: "Contact" },
];

const workflowSteps = [
  { step: "1", title: "Sign in", text: "Approved users log in on a single trusted device." },
  { step: "2", title: "New analysis", text: "Enter lot, crates sampled, and average weight." },
  { step: "3", title: "Capture trays", text: "One clear photo per crate — camera or upload." },
  { step: "4", title: "Get report", text: "See A/B counts, estimated weights, download PDF." },
];

const benefits = [
  {
    icon: "photo_camera",
    title: "Capture & upload",
    text: "Workers photograph apple trays on the floor — camera or gallery, mobile-first.",
  },
  {
    icon: "psychology",
    title: "AI grade in seconds",
    text: "Custom ML detects apples and classifies Grade A vs Grade B with clear counts.",
  },
  {
    icon: "scale",
    title: "Estimated weights",
    text: "Combine crate counts with lot weight inputs for estimated A/B grade weights.",
  },
  {
    icon: "picture_as_pdf",
    title: "Branded PDF reports",
    text: "Download or share a professional report. No permanent server storage of images.",
  },
];

const NAV_OFFSET = 72;

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function Landing() {
  const [, dispatch] = useMaterialUIController();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    setLayout(dispatch, "page");
    document.title = "Malus Lens — Apple Quality. Assessed in Seconds.";
    return () => {
      document.title = "Malus Lens";
    };
  }, [dispatch]);

  useEffect(() => {
    const ids = ["hero", ...navLinks.map((l) => l.id)];
    const onScroll = () => {
      const pos = window.scrollY + NAV_OFFSET + 24;
      let current = ids[0];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= pos) current = id;
      });
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openBooking = () => {
    if (LANDING.bookMeetingUrl) {
      window.open(LANDING.bookMeetingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    scrollToId("contact");
  };

  const appEntry = isAuthenticated ? "/dashboard" : "/authentication/sign-in";

  const sectionTitle = (title, subtitle) => (
    <MDBox mb={4} textAlign="center" maxWidth={720} mx="auto">
      <MDTypography variant="h3" fontWeight="bold" sx={{ color: NAVY, letterSpacing: -0.5 }}>
        {title}
      </MDTypography>
      {subtitle && (
        <MDTypography variant="body1" mt={1.5} sx={{ color: CHARCOAL, opacity: 0.8 }}>
          {subtitle}
        </MDTypography>
      )}
      <MDBox
        mt={2}
        mx="auto"
        width={48}
        height={4}
        borderRadius={1}
        sx={{ bgcolor: BRAND.accent }}
      />
    </MDBox>
  );

  return (
    <MDBox minHeight="100vh" sx={{ bgcolor: BRAND.white, color: CHARCOAL }}>
      {/* Nav */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #eee",
          color: NAVY,
        }}
      >
        <Toolbar sx={{ maxWidth: 1140, width: "100%", mx: "auto", gap: 1 }}>
          <MDBox
            component="button"
            type="button"
            onClick={() => scrollToId("hero")}
            sx={{
              border: 0,
              background: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              p: 0,
              mr: 1,
            }}
          >
            <MDBox
              component="img"
              src={appLogo}
              alt="Malus Lens"
              sx={{ height: 40, maxWidth: 160, objectFit: "contain" }}
            />
          </MDBox>

          <MDBox flexGrow={1} />

          {!isMobile &&
            navLinks.map((l) => {
              const active = activeSection === l.id;
              return (
                <MDButton
                  key={l.id}
                  variant="text"
                  onClick={() => scrollToId(l.id)}
                  sx={{
                    color: active ? BRAND.accentDark : CHARCOAL,
                    textTransform: "none",
                    fontWeight: active ? 800 : 600,
                    minWidth: 0,
                    px: 1.1,
                    borderBottom: active ? `2px solid ${BRAND.accent}` : "2px solid transparent",
                    borderRadius: 0,
                  }}
                >
                  {l.label}
                </MDButton>
              );
            })}

          {!isMobile && (
            <>
              <MDButton
                variant="outlined"
                onClick={openBooking}
                sx={{
                  ml: 1,
                  color: BRAND.accentDark,
                  borderColor: BRAND.accent,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Book a Meeting
              </MDButton>
              <MDButton
                component={RouterLink}
                to={appEntry}
                sx={{ ...primaryBtnSx, ml: 1, py: 1, px: 2 }}
              >
                Use Malus Lens
              </MDButton>
            </>
          )}

          {isMobile && (
            <IconButton onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Icon sx={{ color: NAVY }}>menu</Icon>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <MDBox width={280} p={2}>
          <List>
            {navLinks.map((l) => (
              <ListItemButton
                key={l.id}
                onClick={() => {
                  setMenuOpen(false);
                  scrollToId(l.id);
                }}
              >
                <ListItemText primary={l.label} />
              </ListItemButton>
            ))}
          </List>
          <MDButton fullWidth onClick={openBooking} sx={{ ...primaryBtnSx, mb: 1 }}>
            Book a Meeting
          </MDButton>
          <MDButton
            fullWidth
            component={RouterLink}
            to={appEntry}
            variant="outlined"
            sx={{ color: BRAND.accentDark, borderColor: BRAND.accent, textTransform: "none" }}
            onClick={() => setMenuOpen(false)}
          >
            Use Malus Lens
          </MDButton>
        </MDBox>
      </Drawer>

      {/* Hero */}
      <MDBox
        id="hero"
        component="section"
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { xs: 420, md: 560 },
          aspectRatio: { md: "1672 / 940" },
          display: "flex",
          alignItems: "flex-end",
          backgroundImage: `url(${landingHero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderBottom: "1px solid #eee",
          scrollMarginTop: `${NAV_OFFSET}px`,
        }}
      >
        <MDBox
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          sx={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        <Container
          maxWidth="lg"
          sx={{ position: "relative", zIndex: 1, pb: { xs: 3, md: 4 }, pt: 2 }}
        >
          <MDBox
            display="flex"
            flexWrap="wrap"
            gap={1.5}
            justifyContent={{ xs: "center", md: "flex-start" }}
          >
            <MDButton
              component={RouterLink}
              to={appEntry}
              sx={{ ...primaryBtnSx, px: 3.5, py: 1.25, fontSize: "0.95rem" }}
            >
              Get Started
            </MDButton>
            <MDButton
              onClick={openBooking}
              variant="outlined"
              sx={{
                color: BRAND.white,
                borderColor: "rgba(255,255,255,0.7)",
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                "&:hover": {
                  borderColor: BRAND.white,
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              Book a Meeting
            </MDButton>
          </MDBox>
        </Container>
      </MDBox>

      {/* How it works */}
      <MDBox
        id="how"
        component="section"
        py={{ xs: 7, md: 9 }}
        sx={{ bgcolor: BRAND.white, scrollMarginTop: `${NAV_OFFSET}px` }}
      >
        <Container maxWidth="lg">
          {sectionTitle("How it works", "From the landing page to a PDF report in four steps.")}
          <Grid container spacing={2.5}>
            {workflowSteps.map((s) => (
              <Grid item xs={12} sm={6} md={3} key={s.step}>
                <Card sx={{ ...cardSx, p: 2.5, height: "100%", position: "relative" }}>
                  <MDBox
                    width={36}
                    height={36}
                    borderRadius="50%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mb={1.5}
                    sx={{ bgcolor: BRAND.accent, color: BRAND.white, fontWeight: 800 }}
                  >
                    {s.step}
                  </MDBox>
                  <MDTypography variant="h6" fontWeight="bold" sx={{ color: NAVY }}>
                    {s.title}
                  </MDTypography>
                  <MDTypography variant="body2" mt={1} sx={{ color: CHARCOAL, opacity: 0.8 }}>
                    {s.text}
                  </MDTypography>
                </Card>
              </Grid>
            ))}
          </Grid>
          <MDBox mt={4} textAlign="center">
            <MDButton component={RouterLink} to={appEntry} sx={{ ...primaryBtnSx, px: 3 }}>
              {isAuthenticated ? "Go to dashboard" : "Start with login"}
            </MDButton>
          </MDBox>
        </Container>
      </MDBox>

      {/* About */}
      <MDBox
        id="about"
        component="section"
        py={{ xs: 7, md: 9 }}
        sx={{ scrollMarginTop: `${NAV_OFFSET}px` }}
      >
        <Container maxWidth="lg">
          {sectionTitle(
            "About Malus Lens",
            "Quality assessment designed for cold-storage workflows."
          )}
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <MDTypography variant="body1" sx={{ color: CHARCOAL, lineHeight: 1.8 }}>
                Malus Lens is a web platform from {LANDING.company} that connects a mobile-friendly
                product app to your existing Python ML grading model. Operators run lot-based
                sampling on the floor; managers get clear A/B outcomes and shareable reports without
                building a heavy IT stack.
              </MDTypography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card sx={{ ...cardSx, p: 2.5, bgcolor: "#fff8f8", borderColor: "#f0c7c7" }}>
                <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.accentDark }}>
                  What you get
                </MDTypography>
                <MDBox component="ul" pl={2.5} mt={1} mb={0} sx={{ color: CHARCOAL }}>
                  <li>Public landing + authenticated analysis app</li>
                  <li>API integrated with your GPU ML model</li>
                  <li>Admin approval, orgs & subscriptions</li>
                  <li>No permanent image or report storage</li>
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </MDBox>

      {/* Problem */}
      <MDBox id="problem" component="section" py={{ xs: 7, md: 9 }} sx={{ bgcolor: BRAND.grey }}>
        <Container maxWidth="lg">
          {sectionTitle(
            "The problem",
            "Manual grading is slow, inconsistent, and hard to document at scale."
          )}
          <Grid container spacing={2}>
            {[
              "Human grading varies by shift and fatigue",
              "Paper or spreadsheet trails are easy to lose",
              "Lots move fast — decisions need seconds, not hours",
              "Photos and reports shouldn’t linger on shared servers",
            ].map((text) => (
              <Grid item xs={12} sm={6} key={text}>
                <Card sx={{ ...cardSx, p: 2.25, height: "100%" }}>
                  <MDBox display="flex" gap={1.5} alignItems="flex-start">
                    <Icon sx={{ color: BRAND.accent }}>warning_amber</Icon>
                    <MDTypography variant="body2" fontWeight="medium" sx={{ color: NAVY }}>
                      {text}
                    </MDTypography>
                  </MDBox>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </MDBox>

      {/* Benefits */}
      <MDBox id="benefits" component="section" py={{ xs: 7, md: 9 }}>
        <Container maxWidth="lg">
          {sectionTitle("Benefits", "From tray photo to actionable grade summary.")}
          <Grid container spacing={3}>
            {benefits.map((b) => (
              <Grid item xs={12} sm={6} md={3} key={b.title}>
                <Card sx={{ ...cardSx, p: 2.5, height: "100%" }}>
                  <MDBox
                    width={44}
                    height={44}
                    borderRadius={2}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mb={1.5}
                    sx={{ bgcolor: "rgba(198,40,40,0.1)" }}
                  >
                    <Icon sx={{ color: BRAND.accentDark }}>{b.icon}</Icon>
                  </MDBox>
                  <MDTypography variant="h6" fontWeight="bold" sx={{ color: NAVY }}>
                    {b.title}
                  </MDTypography>
                  <MDTypography variant="body2" mt={1} sx={{ color: CHARCOAL, opacity: 0.8 }}>
                    {b.text}
                  </MDTypography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </MDBox>

      {/* Accuracy placeholder */}
      <MDBox id="accuracy" component="section" py={{ xs: 7, md: 9 }} sx={{ bgcolor: BRAND.grey }}>
        <Container maxWidth="md">
          {sectionTitle("Accuracy", "Validated with your trays and QC process.")}
          <Card sx={{ ...cardSx, p: { xs: 3, md: 4 }, textAlign: "center" }}>
            <Icon sx={{ fontSize: 40, color: BRAND.accent, mb: 1 }}>insights</Icon>
            <MDTypography variant="h6" fontWeight="bold" sx={{ color: NAVY }}>
              Accuracy metrics — placeholder
            </MDTypography>
            <MDTypography variant="body2" mt={1.5} sx={{ color: CHARCOAL, opacity: 0.8 }}>
              This section will show detection and grade accuracy figures agreed with your QC team
              after field evaluation on cold-store images. Until then, treat model output as
              assistive and validate with annotated CLI runs and expert review.
            </MDTypography>
          </Card>
        </Container>
      </MDBox>

      {/* Showcase */}
      <MDBox id="showcase" component="section" py={{ xs: 7, md: 9 }}>
        <Container maxWidth="lg">
          {sectionTitle("Product showcase", "Analysis flow built for the floor.")}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ ...cardSx, overflow: "hidden", height: "100%" }}>
                <MDBox
                  component="img"
                  src={sampleApple}
                  alt="Sample apple"
                  sx={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                />
                <MDBox p={2.5}>
                  <MDTypography variant="h6" fontWeight="bold" sx={{ color: NAVY }}>
                    Lot → Photos → Results
                  </MDTypography>
                  <MDTypography variant="body2" mt={1} sx={{ color: CHARCOAL, opacity: 0.8 }}>
                    Enter lot details, capture 1–10 tray photos, review, and get Grade A/B counts,
                    percentages, and estimated weights in one session.
                  </MDTypography>
                </MDBox>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ ...cardSx, p: 2.5, height: "100%" }}>
                <MDTypography variant="h6" fontWeight="bold" mb={2} sx={{ color: NAVY }}>
                  Included in the platform
                </MDTypography>
                {[
                  "Login, registration & admin approval",
                  "One-device sessions · 7-day login",
                  "Subscription gating for analysis",
                  "Admin panel for users & organisations",
                  "PDF download / share on device",
                ].map((line) => (
                  <MDBox key={line} display="flex" gap={1} alignItems="center" mb={1.25}>
                    <Icon sx={{ color: BRAND.accent, fontSize: 20 }}>check_circle</Icon>
                    <MDTypography variant="body2" sx={{ color: CHARCOAL }}>
                      {line}
                    </MDTypography>
                  </MDBox>
                ))}
                <MDButton component={RouterLink} to={appEntry} sx={{ ...primaryBtnSx, mt: 2 }}>
                  Open the app
                </MDButton>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </MDBox>

      {/* Feedback placeholder */}
      <MDBox id="feedback" component="section" py={{ xs: 6, md: 8 }} sx={{ bgcolor: "#fff8f8" }}>
        <Container maxWidth="md">
          <Card sx={{ ...cardSx, p: 3, textAlign: "center" }}>
            <MDTypography variant="h5" fontWeight="bold" sx={{ color: NAVY }}>
              Feedback
            </MDTypography>
            <MDTypography variant="body2" mt={1.5} sx={{ color: CHARCOAL, opacity: 0.8 }}>
              Customer testimonials and case studies will appear here after pilot deployments.
              Placeholder per proposal scope.
            </MDTypography>
          </Card>
        </Container>
      </MDBox>

      {/* Vision */}
      <MDBox id="vision" component="section" py={{ xs: 7, md: 9 }}>
        <Container maxWidth="md">
          {sectionTitle(
            "Vision",
            "Make objective apple quality assessment available in seconds — anywhere a tray can be photographed."
          )}
          <MDTypography
            variant="body1"
            textAlign="center"
            sx={{ color: CHARCOAL, lineHeight: 1.8 }}
          >
            Malus Lens aims to become the standard digital QC companion for apple cold stores:
            consistent grades, clear weights, and shareable reports that keep data on the device
            when permanence isn’t required.
          </MDTypography>
        </Container>
      </MDBox>

      {/* Contact */}
      <MDBox id="contact" component="section" py={{ xs: 7, md: 9 }} sx={{ bgcolor: NAVY }}>
        <Container maxWidth="md">
          <MDTypography
            variant="h3"
            fontWeight="bold"
            textAlign="center"
            sx={{ color: BRAND.white }}
          >
            Contact
          </MDTypography>
          <MDBox
            mt={2}
            mx="auto"
            width={48}
            height={4}
            borderRadius={1}
            sx={{ bgcolor: BRAND.accent }}
          />
          <MDTypography
            variant="body1"
            textAlign="center"
            mt={2}
            sx={{ color: "rgba(255,255,255,0.8)" }}
          >
            Book a demo or ask about deploying Malus Lens on your GPU infrastructure.
          </MDTypography>
          <MDBox mt={4} display="flex" flexDirection="column" alignItems="center" gap={1.5}>
            <MDTypography variant="h6" sx={{ color: BRAND.white }}>
              {LANDING.company}
            </MDTypography>
            <MDTypography
              component="a"
              href={`mailto:${LANDING.contactEmail}`}
              variant="body1"
              sx={{ color: "#ffc9c9", textDecoration: "none" }}
            >
              {LANDING.contactEmail}
            </MDTypography>
            <MDTypography variant="body1" sx={{ color: "rgba(255,255,255,0.85)" }}>
              {LANDING.contactPhone}
            </MDTypography>
            <MDBox mt={2} display="flex" flexWrap="wrap" gap={1.5} justifyContent="center">
              <MDButton onClick={openBooking} sx={{ ...primaryBtnSx, px: 3 }}>
                Book a Meeting
              </MDButton>
              <MDButton
                component={RouterLink}
                to={appEntry}
                variant="outlined"
                sx={{
                  color: BRAND.white,
                  borderColor: "rgba(255,255,255,0.4)",
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { borderColor: BRAND.white, bgcolor: "rgba(255,255,255,0.06)" },
                }}
              >
                Use Malus Lens
              </MDButton>
            </MDBox>
          </MDBox>
        </Container>
      </MDBox>

      {/* Footer */}
      <MDBox component="footer" py={4} sx={{ bgcolor: "#111820", borderTop: "1px solid #2a3340" }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <MDBox
                component="img"
                src={appLogo}
                alt="Malus Lens"
                sx={{
                  height: 36,
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                  opacity: 0.9,
                }}
              />
              <MDTypography
                variant="caption"
                display="block"
                mt={1.5}
                sx={{ color: "rgba(255,255,255,0.55)" }}
              >
                {LANDING.productName} · {LANDING.company}
              </MDTypography>
            </Grid>
            <Grid item xs={6} md={3}>
              <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.white }}>
                Product
              </MDTypography>
              <MDBox mt={1}>
                <MDTypography
                  component={RouterLink}
                  to={appEntry}
                  variant="caption"
                  display="block"
                  sx={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", mb: 0.5 }}
                >
                  Open app
                </MDTypography>
                <MDTypography
                  component="button"
                  type="button"
                  onClick={() => scrollToId("showcase")}
                  variant="caption"
                  display="block"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    p: 0,
                    textAlign: "left",
                  }}
                >
                  Showcase
                </MDTypography>
              </MDBox>
            </Grid>
            <Grid item xs={6} md={4}>
              <MDTypography variant="button" fontWeight="bold" sx={{ color: BRAND.white }}>
                Legal
              </MDTypography>
              <MDTypography
                variant="caption"
                display="block"
                mt={1}
                sx={{ color: "rgba(255,255,255,0.45)" }}
              >
                Privacy Policy (placeholder)
              </MDTypography>
              <MDTypography
                variant="caption"
                display="block"
                sx={{ color: "rgba(255,255,255,0.45)" }}
              >
                Terms of Use (placeholder)
              </MDTypography>
            </Grid>
          </Grid>
          <MDTypography
            variant="caption"
            display="block"
            mt={3}
            sx={{ color: "rgba(255,255,255,0.35)" }}
          >
            © {new Date().getFullYear()} {LANDING.company}. www.cnelindia.com
          </MDTypography>
        </Container>
      </MDBox>

      {/* Mobile sticky CTAs */}
      {isMobile && (
        <MDBox
          position="fixed"
          left={0}
          right={0}
          bottom={0}
          zIndex={1200}
          px={1.5}
          py={1.25}
          display="flex"
          gap={1}
          sx={{
            bgcolor: "rgba(255,255,255,0.96)",
            borderTop: "1px solid #eee",
            boxShadow: "0 -6px 20px rgba(0,0,0,0.08)",
          }}
        >
          <MDButton
            fullWidth
            variant="outlined"
            onClick={openBooking}
            sx={{
              color: BRAND.accentDark,
              borderColor: BRAND.accent,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Book
          </MDButton>
          <MDButton
            fullWidth
            component={RouterLink}
            to={appEntry}
            sx={{ ...primaryBtnSx, py: 1.25 }}
          >
            Use app
          </MDButton>
        </MDBox>
      )}
    </MDBox>
  );
}

export default Landing;
