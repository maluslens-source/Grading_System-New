import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import { useMaterialUIController, setLayout } from "context";
import { DEMO_MODE } from "config/demoMode";
import api from "services/api";
import { BRAND, inputBlackSx, primaryBtnSx } from "config/brand";
import appLogo from "assets/images/app-logo.png";
import AuthBackground from "layouts/apple/components/AuthBackground";
import OtpInput from "layouts/apple/components/OtpInput";
import { emailValidationMessage } from "utils/emailValidation";

const OTP_LENGTH = 6;

function ForgotPassword() {
  const navigate = useNavigate();
  const [, dispatch] = useMaterialUIController();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLayout(dispatch, "page");
  }, [dispatch]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const requestCode = async () => {
    const problem = emailValidationMessage(email);
    if (problem) {
      setError(problem);
      return;
    }
    if (DEMO_MODE) {
      setError("Password reset is not available right now. Contact your admin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.forgotPassword({ email: email.trim().toLowerCase() });
      setDevCode(data?.dev_code || "");
      setResendIn(data?.resend_after_seconds || 60);
      setCode("");
      setStep("otp");
    } catch (err) {
      setError(err.message || "Could not send the code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.verifyPasswordOtp({
        email: email.trim().toLowerCase(),
        code,
      });
      setResetToken(data.reset_token);
      setStep("password");
    } catch (err) {
      setError(err.message || "Incorrect code");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.resetPassword({ token: resetToken, new_password: password });
      navigate("/authentication/sign-in");
    } catch (err) {
      setError(err.message || "Could not update the password");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (step === "email") requestCode();
    else if (step === "otp") verifyCode();
    else savePassword();
  };

  return (
    <AuthBackground>
      <MDBox
        component="form"
        onSubmit={onSubmit}
        noValidate
        position="relative"
        zIndex={1}
        width="100%"
        maxWidth={420}
        px={{ xs: 3, sm: 4 }}
        py={{ xs: 3.5, sm: 4.5 }}
        borderRadius={3}
        sx={{
          bgcolor: "#fff",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
        }}
      >
        <MDBox
          component="img"
          src={appLogo}
          alt="Malus Lens"
          mb={2.5}
          mx="auto"
          sx={{
            width: "100%",
            maxWidth: 480.48,
            height: "auto",
            maxHeight: 113.57,
            objectFit: "contain",
            display: "block",
          }}
        />

        <MDTypography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          mb={0.5}
          sx={{ color: BRAND.accent }}
        >
          {step === "password" ? "Set a new password" : "Forgot password"}
        </MDTypography>
        <MDTypography variant="body2" textAlign="center" mb={3} sx={{ color: "#555" }}>
          {step === "email" && "Enter your account email. We will send a 6-digit code."}
          {step === "otp" && `We sent a 6-digit code to ${email.trim().toLowerCase()}`}
          {step === "password" && "Choose a new password for this account."}
        </MDTypography>

        {error && (
          <MDBox
            mb={2}
            p={1.5}
            borderRadius={2}
            sx={{ bgcolor: "#fff5f5", border: `1px solid ${BRAND.accent}` }}
          >
            <MDTypography variant="caption" fontWeight="bold" sx={{ color: BRAND.black }}>
              {error}
            </MDTypography>
          </MDBox>
        )}

        {step === "otp" && devCode && (
          <MDBox
            mb={2}
            p={1.5}
            borderRadius={2}
            sx={{ bgcolor: "#fff8e1", border: "1px solid #ffe082" }}
          >
            <MDTypography variant="caption" sx={{ color: BRAND.black }}>
              SMTP not configured — development code: <strong>{devCode}</strong>
            </MDTypography>
          </MDBox>
        )}

        {step === "email" && (
          <MDBox mb={3}>
            <MDInput
              type="email"
              name="email"
              label="Email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={inputBlackSx}
            />
          </MDBox>
        )}

        {step === "otp" && (
          <MDBox mb={2}>
            <OtpInput
              value={code}
              onChange={setCode}
              disabled={loading}
              hasError={Boolean(error)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === OTP_LENGTH) verifyCode();
              }}
            />
            <MDBox display="flex" justifyContent="center" gap={2} mt={1}>
              <MDTypography
                component="button"
                type="button"
                variant="button"
                fontWeight="bold"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                sx={{
                  color: BRAND.black,
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                Change email
              </MDTypography>
              <MDTypography
                component="button"
                type="button"
                variant="button"
                fontWeight="bold"
                disabled={resendIn > 0 || loading}
                onClick={requestCode}
                sx={{
                  color: resendIn > 0 ? "#999" : BRAND.accent,
                  background: "none",
                  border: 0,
                  cursor: resendIn > 0 ? "default" : "pointer",
                }}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </MDTypography>
            </MDBox>
          </MDBox>
        )}

        {step === "password" && (
          <>
            <MDBox mb={2}>
              <MDInput
                type="password"
                name="password"
                label="New password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={inputBlackSx}
              />
            </MDBox>
            <MDBox mb={3}>
              <MDInput
                type="password"
                name="confirm"
                label="Confirm password"
                fullWidth
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                sx={inputBlackSx}
              />
            </MDBox>
          </>
        )}

        <MDButton
          type="submit"
          fullWidth
          size="large"
          disabled={loading || (step === "otp" && code.length !== OTP_LENGTH)}
          sx={{ ...primaryBtnSx, py: 1.5 }}
        >
          {loading
            ? "Please wait…"
            : step === "email"
            ? "Send code"
            : step === "otp"
            ? "Verify code"
            : "Submit"}
        </MDButton>

        <MDBox mt={3} textAlign="center">
          <MDTypography
            component={Link}
            to="/authentication/sign-in"
            variant="button"
            fontWeight="bold"
            sx={{ color: BRAND.accent, textDecoration: "none" }}
          >
            Back to Login
          </MDTypography>
        </MDBox>
      </MDBox>
    </AuthBackground>
  );
}

export default ForgotPassword;
