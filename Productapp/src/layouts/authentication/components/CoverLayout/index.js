/**
=========================================================
* Product App — Auth cover layout (centered form)
=========================================================
*/

import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import PageLayout from "examples/LayoutContainers/PageLayout";

const solidRedCover = "#871c1c";

function CoverLayout({ image, children }) {
  return (
    <PageLayout>
      <MDBox
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
        sx={{
          background: image ? undefined : solidRedCover,
          backgroundImage: image
            ? `linear-gradient(rgba(198, 40, 40, 0.35), rgba(0, 0, 0, 0.35)), url(${image})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <MDBox
        position="relative"
        zIndex={1}
        minHeight="100vh"
        width="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={2}
        py={4}
      >
        <MDBox width="100%" maxWidth={420}>
          {children}
        </MDBox>
      </MDBox>
    </PageLayout>
  );
}

CoverLayout.defaultProps = {
  image: "",
};

CoverLayout.propTypes = {
  image: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default CoverLayout;
