/**
 * Phase 2 — Apple Grading app routes (Material Dashboard shell retained).
 */

import Landing from "layouts/apple/Landing";
import Dashboard from "layouts/apple/Dashboard";
import Admin from "layouts/apple/Admin";
import Login from "layouts/apple/Login";
import Register from "layouts/apple/Register";
import ForgotPassword from "layouts/apple/ForgotPassword";
import ResetPassword from "layouts/apple/ResetPassword";
import PendingApproval from "layouts/apple/PendingApproval";
import SubscriptionBlocked from "layouts/apple/SubscriptionBlocked";
import LotDetails from "layouts/apple/analysis/LotDetails";
import Photos from "layouts/apple/analysis/Photos";
import Review from "layouts/apple/analysis/Review";
import Processing from "layouts/apple/analysis/Processing";
import Results from "layouts/apple/analysis/Results";
import ProtectedRoute from "components/ProtectedRoute";

import Icon from "@mui/material/Icon";

const routes = [
  {
    key: "landing",
    route: "/landing",
    component: <Landing />,
  },
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "Admin",
    key: "admin",
    icon: <Icon fontSize="small">admin_panel_settings</Icon>,
    route: "/admin",
    component: (
      <ProtectedRoute requireAdmin>
        <Admin />
      </ProtectedRoute>
    ),
  },
  {
    type: "collapse",
    name: "New Analysis",
    key: "analysis-lot",
    icon: <Icon fontSize="small">science</Icon>,
    route: "/analysis/lot",
    component: (
      <ProtectedRoute requireSubscription>
        <LotDetails />
      </ProtectedRoute>
    ),
  },
  {
    key: "analysis-photos",
    route: "/analysis/photos",
    component: (
      <ProtectedRoute requireSubscription>
        <Photos />
      </ProtectedRoute>
    ),
  },
  {
    key: "analysis-review",
    route: "/analysis/review",
    component: (
      <ProtectedRoute requireSubscription>
        <Review />
      </ProtectedRoute>
    ),
  },
  {
    key: "analysis-processing",
    route: "/analysis/processing",
    component: (
      <ProtectedRoute requireSubscription>
        <Processing />
      </ProtectedRoute>
    ),
  },
  {
    key: "analysis-results",
    route: "/analysis/results",
    component: (
      <ProtectedRoute>
        <Results />
      </ProtectedRoute>
    ),
  },
  {
    key: "subscription-blocked",
    route: "/subscription-blocked",
    component: (
      <ProtectedRoute>
        <SubscriptionBlocked />
      </ProtectedRoute>
    ),
  },
  {
    // Auth pages — not shown in app sidebar
    key: "sign-in",
    route: "/authentication/sign-in",
    component: <Login />,
  },
  {
    key: "sign-up",
    route: "/authentication/sign-up",
    component: <Register />,
  },
  {
    key: "forgot-password",
    route: "/authentication/forgot-password",
    component: <ForgotPassword />,
  },
  {
    key: "reset-password",
    route: "/authentication/reset-password",
    component: <ResetPassword />,
  },
  {
    key: "pending",
    route: "/authentication/pending",
    component: <PendingApproval />,
  },
];

export default routes;
