/**
=========================================================
* Product App — Auth basic layout (navbar/footer branding removed)
=========================================================
*/

import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import PageLayout from "examples/LayoutContainers/PageLayout";
import { BRAND } from "config/brand";

function BasicLayout({ image, children }) {
  return (
    <PageLayout>
      <MDBox
        position="absolute"
        width="100%"
        minHeight="100vh"
        sx={{
          background: image
            ? undefined
            : `linear-gradient(160deg, ${BRAND.teal} 0%, ${BRAND.tealDark} 55%, ${BRAND.grey} 55%)`,
          backgroundImage: image
            ? `linear-gradient(rgba(198, 40, 40, 0.45), rgba(0, 0, 0, 0.4)), url(${image})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <MDBox px={1} width="100%" height="100vh" mx="auto">
        <Grid container spacing={1} justifyContent="center" alignItems="center" height="100%">
          <Grid item xs={11} sm={9} md={5} lg={4} xl={3}>
            {children}
          </Grid>
        </Grid>
      </MDBox>
    </PageLayout>
  );
}

BasicLayout.defaultProps = {
  image: "",
};

BasicLayout.propTypes = {
  image: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default BasicLayout;
