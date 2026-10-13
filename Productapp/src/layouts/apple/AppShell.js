import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useMaterialUIController, setLayout } from "context";
import { useAuth } from "context/AuthContext";
import { useAnalysis } from "context/AnalysisContext";
import { BRAND } from "config/brand";
import appLogo from "assets/images/app-logo.png";

const DRAWER_WIDTH = 268;
const DRAWER_COLLAPSED = 76;
const COLLAPSE_KEY = "apple_sidebar_collapsed";

const baseNavItems = [
  { label: "Dashboard", path: "/dashboard", icon: "dashboard", match: (p) => p === "/dashboard" },
  {
    label: "New Analysis",
    path: "/analysis/lot",
    icon: "science",
    match: (p) => p.startsWith("/analysis/") && !p.startsWith("/analysis/results"),
  },
  {
    label: "Results",
    path: "/analysis/results",
    icon: "assessment",
    match: (p) => p.startsWith("/analysis/results"),
    needsResult: true,
  },
  {
    label: "Admin",
    path: "/admin",
    icon: "admin_panel_settings",
    match: (p) => p.startsWith("/admin"),
    adminOnly: true,
  },
];

/** White professional shell — logo blends on white. */
function AppShell({ title, children, showLogout = true, contentMaxWidth = 900 }) {
  const [, dispatch] = useMaterialUIController();
  const { user, logout, subscriptionActive, refreshMe } = useAuth();
  const navItems = baseNavItems.filter((item) => !item.adminOnly || user?.role === "admin");
  const { result, resetAnalysis } = useAnalysis();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const desktopWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;
  const coldStoreName = user?.organization_name || "Cold Store";

  useEffect(() => {
    setLayout(dispatch, "page");
  }, [dispatch]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  const go = async (item) => {
    setMobileOpen(false);
    if (item.path === "/analysis/lot") {
      try {
        const me = await refreshMe();
        if (!me?.subscription_active) {
          navigate("/subscription-blocked");
          return;
        }
      } catch {
        navigate("/subscription-blocked");
        return;
      }
      resetAnalysis();
      navigate("/analysis/lot");
      return;
    }
    if (item.needsResult && !result) {
      navigate("/dashboard");
      return;
    }
    navigate(item.path);
  };

  const drawerContent = (isCollapsed) => (
    <MDBox display="flex" flexDirection="column" height="100%" sx={{ bgcolor: BRAND.white }}>
      <MDBox px={isCollapsed ? 1.25 : 2.5} pt={2.5} pb={2} sx={{ borderBottom: "1px solid #eee" }}>
        <MDBox
          sx={{
            bgcolor: BRAND.white,
            borderRadius: 2,
            px: isCollapsed ? 0.5 : 0,
            py: 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            minHeight: isCollapsed ? 48 : 67,
          }}
        >
          <MDBox
            component="img"
            src={appLogo}
            alt="Malus Lens"
            sx={{
              width: "100%",
              maxWidth: isCollapsed ? 67 : 280,
              maxHeight: isCollapsed ? 56 : 67,
              objectFit: "contain",
              objectPosition: "left center",
              display: "block",
            }}
          />
        </MDBox>
        {!isCollapsed && (
          <MDTypography
            variant="caption"
            display="block"
            mt={1}
            sx={{ color: BRAND.black, opacity: 0.5 }}
          >
            Malus Lens
          </MDTypography>
        )}
        {!isCollapsed && (
          <MDBox mt={1.25} height={3} width={36} borderRadius={1} sx={{ bgcolor: BRAND.accent }} />
        )}
      </MDBox>

      <List sx={{ px: isCollapsed ? 1 : 1.5, py: 1.5, flexGrow: 1 }}>
        {navItems.map((item) => {
          const selected = item.match(location.pathname);
          const disabled = Boolean(item.needsResult && !result);
          const btn = (
            <ListItemButton
              selected={selected}
              disabled={disabled}
              onClick={() => go(item)}
              sx={{
                borderRadius: 2,
                mb: 0.75,
                py: 1.3,
                px: isCollapsed ? 1 : 1.5,
                justifyContent: isCollapsed ? "center" : "flex-start",
                color: BRAND.black,
                "&.Mui-disabled": { opacity: 0.35 },
                "&:hover": { bgcolor: BRAND.grey },
                "&.Mui-selected": {
                  bgcolor: "rgba(198,40,40,0.1)",
                  color: BRAND.accentDark,
                  "&:hover": { bgcolor: "rgba(198,40,40,0.16)" },
                },
                "&.Mui-selected .MuiListItemIcon-root": { color: BRAND.accentDark },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: isCollapsed ? 0 : 38,
                  mr: isCollapsed ? 0 : undefined,
                  justifyContent: "center",
                  color: selected ? BRAND.accentDark : BRAND.black,
                }}
              >
                <Icon fontSize="small">{item.icon}</Icon>
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: selected ? 700 : 500,
                    fontSize: "0.92rem",
                    noWrap: true,
                    color: selected ? BRAND.accentDark : BRAND.black,
                  }}
                />
              )}
            </ListItemButton>
          );
          return (
            <Tooltip
              key={item.path}
              title={isCollapsed ? item.label : ""}
              placement="right"
              disableHoverListener={!isCollapsed}
            >
              <span style={{ display: "block" }}>{btn}</span>
            </Tooltip>
          );
        })}
      </List>

      <MDBox px={isCollapsed ? 1 : 2} pb={2.5} pt={1} sx={{ borderTop: "1px solid #eee" }}>
        {isCollapsed ? (
          showLogout && (
            <Tooltip title="Logout" placement="right">
              <IconButton
                onClick={onLogout}
                sx={{
                  width: "100%",
                  color: BRAND.black,
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  py: 1.25,
                  "&:hover": { borderColor: BRAND.accent, bgcolor: "rgba(198,40,40,0.06)" },
                }}
              >
                <Icon>logout</Icon>
              </IconButton>
            </Tooltip>
          )
        ) : (
          <MDBox textAlign="center">
            <MDTypography
              variant="button"
              fontWeight="bold"
              display="block"
              noWrap
              sx={{ color: BRAND.black }}
            >
              {user?.full_name || "User"}
            </MDTypography>
            <MDTypography
              variant="caption"
              display="block"
              noWrap
              mb={1}
              sx={{ color: BRAND.black, opacity: 0.55 }}
            >
              {user?.organization_name || user?.email || ""}
            </MDTypography>
            <MDBox display="flex" justifyContent="center" mb={1.5}>
              <MDBox
                px={1}
                py={0.35}
                borderRadius={1}
                sx={{
                  bgcolor: subscriptionActive ? "rgba(198,40,40,0.1)" : BRAND.grey,
                }}
              >
                <MDTypography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ color: subscriptionActive ? BRAND.accentDark : BRAND.black }}
                >
                  {subscriptionActive
                    ? "Subscription Active"
                    : user?.subscription_status || "Inactive"}
                </MDTypography>
              </MDBox>
            </MDBox>
            {showLogout && (
              <MDBox display="flex" justifyContent="center">
                <MDButton
                  variant="outlined"
                  onClick={onLogout}
                  sx={{
                    color: BRAND.black,
                    borderColor: "#ddd",
                    textTransform: "none",
                    fontWeight: 600,
                    minHeight: 42,
                    minWidth: 140,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: BRAND.accent,
                      bgcolor: "rgba(198,40,40,0.06)",
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 18 }}>logout</Icon>
                  <span>Logout</span>
                </MDButton>
              </MDBox>
            )}
          </MDBox>
        )}
      </MDBox>
    </MDBox>
  );

  return (
    <MDBox minHeight="100vh" display="flex" sx={{ bgcolor: BRAND.grey }}>
      {!isMobile && (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: desktopWidth,
            flexShrink: 0,
            transition: "width 0.25s ease",
            [`& .MuiDrawer-paper`]: {
              width: desktopWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #eee",
              bgcolor: BRAND.white,
              overflowX: "hidden",
              transition: "width 0.25s ease",
            },
          }}
        >
          {drawerContent(collapsed)}
        </Drawer>
      )}

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              bgcolor: BRAND.white,
            },
          }}
        >
          {drawerContent(false)}
        </Drawer>
      )}

      <MDBox
        component="main"
        flexGrow={1}
        minWidth={0}
        display="flex"
        flexDirection="column"
        sx={{
          width: { md: `calc(100% - ${desktopWidth}px)` },
          bgcolor: BRAND.grey,
          transition: "width 0.25s ease",
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: BRAND.white,
            borderBottom: "1px solid #eee",
            color: BRAND.black,
          }}
        >
          <Toolbar sx={{ gap: 1, py: 1.25, alignItems: "center" }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Icon sx={{ color: BRAND.black }}>menu</Icon>
              </IconButton>
            )}
            {!isMobile && (
              <IconButton
                edge="start"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                sx={{ mr: 0.5 }}
              >
                <Icon sx={{ color: BRAND.black }}>{collapsed ? "menu_open" : "menu"}</Icon>
              </IconButton>
            )}
            <MDBox sx={{ flexGrow: 1, minWidth: 0 }}>
              <MDTypography
                variant="h6"
                fontWeight="bold"
                sx={{ color: BRAND.black, lineHeight: 1.25 }}
              >
                Quality Check Report
              </MDTypography>
              <MDTypography
                variant="caption"
                display="block"
                sx={{ color: BRAND.black, opacity: 0.65 }}
              >
                {coldStoreName}
              </MDTypography>
            </MDBox>
            {isMobile && showLogout && (
              <MDButton variant="text" size="small" onClick={onLogout} sx={{ color: BRAND.black }}>
                <Icon>logout</Icon>
              </MDButton>
            )}
            {!isMobile && (
              <MDBox display="flex" alignItems="center" gap={2}>
                <MDTypography
                  component={RouterLink}
                  to="/dashboard"
                  variant="button"
                  fontWeight="medium"
                  sx={{ textDecoration: "none", color: BRAND.accent }}
                >
                  Home
                </MDTypography>
                <MDTypography
                  component={RouterLink}
                  to="/"
                  variant="caption"
                  fontWeight="medium"
                  sx={{ textDecoration: "none", color: BRAND.black, opacity: 0.55 }}
                >
                  Website
                </MDTypography>
              </MDBox>
            )}
          </Toolbar>
        </AppBar>

        <MDBox px={{ xs: 2, md: 3 }} py={3} maxWidth={contentMaxWidth} width="100%" mx="auto">
          {children}
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

AppShell.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  showLogout: PropTypes.bool,
  contentMaxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default AppShell;
