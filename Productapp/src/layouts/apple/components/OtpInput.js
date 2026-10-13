import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import { BRAND } from "config/brand";

const BOXES = 6;

/**
 * Six single-digit boxes for the registration OTP.
 * Typing or pasting advances automatically, Backspace moves back, and arrow
 * keys navigate, so the code can be entered without touching the mouse.
 */
function OtpInput({ value, onChange, onKeyDown, disabled, length, hasError }) {
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  // Keep the caret in the first empty box as digits arrive.
  useEffect(() => {
    if (value.length < length) refs.current[value.length]?.focus();
  }, [value, length]);

  const setAt = (index, digit) => {
    const next = value.split("");
    next[index] = digit;
    onChange(next.join("").slice(0, length).replace(/\D/g, ""));
  };

  const onChangeAt = (index) => (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAt(index, "");
      return;
    }
    // A pasted code lands entirely in one box — spread it across.
    if (raw.length > 1) {
      const digits = raw.slice(0, length);
      onChange(digits);
      refs.current[Math.min(digits.length, length - 1)]?.focus();
      return;
    }
    setAt(index, raw);
  };

  const handleKeyAt = (index) => (e) => {
    // Digits are handled here and the native insertion is suppressed: letting the
    // browser fill the box would write into whichever box has focus after the
    // advance, which drops or duplicates a digit.
    if (e.key?.length === 1 && /\d/.test(e.key)) {
      e.preventDefault();
      const next = value.split("");
      next[index] = e.key;
      onChange(next.join("").slice(0, length).replace(/\D/g, ""));
      refs.current[Math.min(index + 1, length - 1)]?.focus();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        setAt(index, "");
      } else if (index > 0) {
        setAt(index - 1, "");
        refs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <MDBox display="flex" justifyContent="center" gap={{ xs: 0.75, sm: 1.25 }} my={1}>
      {Array.from({ length: BOXES }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] || ""}
          onChange={onChangeAt(i)}
          onKeyDown={(e) => {
            handleKeyAt(i)(e);
            onKeyDown?.(e);
          }}
          onPaste={onChangeAt(i)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          maxLength={1}
          style={{
            width: "100%",
            maxWidth: 52,
            height: 58,
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: BRAND.black,
            background: "#fff",
            border: `2px solid ${
              hasError ? BRAND.accent : value[i] ? BRAND.accentDark : "#d9d9d9"
            }`,
            borderRadius: 10,
            outline: "none",
          }}
        />
      ))}
    </MDBox>
  );
}

OtpInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func,
  disabled: PropTypes.bool,
  length: PropTypes.number,
  hasError: PropTypes.bool,
};

OtpInput.defaultProps = {
  onKeyDown: undefined,
  disabled: false,
  length: BOXES,
  hasError: false,
};

export default OtpInput;
