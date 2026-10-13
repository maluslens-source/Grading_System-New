import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import loginBg from "assets/images/login-bg.png";

/**
 * Shared backdrop for the whole authentication flow (sign-in, sign-up, and the
 * pending-approval screen) so those pages share one background treatment.
 * Values must stay identical to the sign-in page.
 */
export const authBackgroundSx = {
  position: "relative",
  overflow: "hidden",
  backgroundImage: `url(${loginBg})`,
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center 28%",
};

export const authScrimSx = {
  background: "rgba(0,0,0,0.28)",
};

function AuthBackground({ children, align }) {
  return (
    <MDBox
      minHeight="100vh"
      width="100%"
      display="flex"
      alignItems="center"
      justifyContent={align}
      px={{ xs: 2, md: 6, lg: 10 }}
      py={{ xs: 4, md: 6 }}
      sx={authBackgroundSx}
    >
      <MDBox position="absolute" top={0} left={0} right={0} bottom={0} sx={authScrimSx} />
      {children}
    </MDBox>
  );
}

AuthBackground.propTypes = {
  children: PropTypes.node.isRequired,
  /** Horizontal placement of the card — sign-in pins right, other pages center. */
  align: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

AuthBackground.defaultProps = { align: "center" };

export default AuthBackground;
