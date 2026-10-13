import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function ProtectedRoute({ children, requireSubscription = false, requireAdmin = false }) {
  const { booting, isAuthenticated, subscriptionActive, user } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <MDBox p={4} textAlign="center">
        <MDTypography variant="button" color="text">
          Loading session…
        </MDTypography>
      </MDBox>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/authentication/sign-in" replace state={{ from: location }} />;
  }

  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSubscription && !subscriptionActive) {
    return <Navigate to="/subscription-blocked" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireSubscription: PropTypes.bool,
  requireAdmin: PropTypes.bool,
};

export default ProtectedRoute;
