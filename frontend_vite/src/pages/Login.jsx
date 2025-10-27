import { API_BASE } from "../config/apiClient";
import React, { useState, useEffect, useContext } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Group,
  Checkbox,
  Anchor,
  Divider,
  Stack,
  Alert,
  Box,
  Container,
} from "@mantine/core";
import {
  IconBrain,
  IconMail,
  IconLock,
  IconLogin,
  IconAlertCircle,
  IconSparkles,
  IconRobot,
  IconMicrophone,
  IconChartBar,
} from "@tabler/icons-react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../context/UserContext";

console.log("🔍 VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);

export default function Login() {
  const { setUser } = useContext(UserContext);

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // OTP / 2FA
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState(null);

  // OTP timer/resend
  const [timer, setTimer] = useState(300); // 5 minutes
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
  }, []);

  // OTP countdown
  useEffect(() => {
    if (otpStep && timer > 0) {
      const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(countdown);
    } else if (otpStep && timer === 0) {
      setError("⏰ OTP expired. Please resend a new code.");
    }
  }, [otpStep, timer]);

  // ---------------------------
  // Forgot Password
  // ---------------------------
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your registered email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("✅ Password reset email sent! Check your inbox.");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Unable to send reset email. Please check your email address.");
    }
  };

  // ---------------------------
  // Google Sign-in
  // ---------------------------
  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const loggedUser = {
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
        photoURL:
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.displayName || user.email.split("@")[0]
          )}&background=6366F1&color=fff`,
        provider: "google",
      };

      setUser(loggedUser);
      localStorage.setItem("user", JSON.stringify(loggedUser));
      console.log("✅ Google login successful:", loggedUser);
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Google Sign-in error:", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // Email Sign-in + 2FA Trigger
  // ---------------------------
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const loggedUser = {
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
        photoURL:
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.displayName || user.email.split("@")[0]
          )}&background=6366F1&color=fff`,
        provider: "email",
      };

      const userSettings = (() => {
        try {
          return JSON.parse(localStorage.getItem("userSettings") || "{}");
        } catch {
          return {};
        }
      })();

      if (userSettings?.twoFactorAuth) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/send_otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: loggedUser.email }),
          });
          if (!res.ok) throw new Error("Failed to send OTP");
        } catch (sendErr) {
          console.error("OTP send error:", sendErr);
          setError("Failed to send OTP. Please try again later.");
          setIsLoading(false);
          return;
        }

        localStorage.setItem("pending2fa", JSON.stringify(loggedUser));
        setOtpSentTo(loggedUser.email);
        setOtpStep(true);
        setTimer(300);
        setIsLoading(false);
        return;
      }

      setUser(loggedUser);
      localStorage.setItem("user", JSON.stringify(loggedUser));
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Email Sign-in error:", err);
      setError("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // Sign-up
  // ---------------------------
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // ✅ Password validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (displayName) await updateProfile(user, { displayName });

      const newUser = {
        email: user.email,
        name: displayName || user.email.split("@")[0],
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          displayName || user.email.split("@")[0]
        )}&background=6366F1&color=fff`,
        provider: "email",
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Email already in use.");
      else setError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // OTP Verify
  // ---------------------------
  const handleVerifyOTP = async () => {
    setError("");
    if (!otp.trim()) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    try {
      const pending = JSON.parse(localStorage.getItem("pending2fa") || "null");
      if (!pending) throw new Error("No pending 2FA request");

      const res = await fetch(`${API_BASE}/api/v1/verify_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email, otp }),
      });

      if (!res.ok) throw new Error("Invalid or expired OTP");

      localStorage.removeItem("pending2fa");
      setUser(pending);
      localStorage.setItem("user", JSON.stringify(pending));
      navigate("/dashboard");
    } catch (err) {
      console.error("OTP verify error:", err);
      setError("Invalid or expired OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // Resend OTP with cooldown
  // ---------------------------
  const handleResendOTP = async () => {
    setError("");
    setResendDisabled(true);
    setResendTimer(30);
    setTimer(300); // reset timer

    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setResendDisabled(false);
          return 30;
        }
        return t - 1;
      });
    }, 1000);

    setIsLoading(true);
    try {
      const pending = JSON.parse(localStorage.getItem("pending2fa") || "null");
      const emailTo = pending?.email || email || otpSentTo;
      if (!emailTo) {
        setError("No email to send OTP to.");
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/v1/send_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo }),
      });
      if (!res.ok) throw new Error("Failed to resend OTP");
      setError("✅ OTP resent successfully!");
    } catch (err) {
      console.error("❌ Resend OTP error:", err);
      setError("Failed to resend OTP. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOtpStep = () => {
    localStorage.removeItem("pending2fa");
    setOtp("");
    setOtpStep(false);
    setOtpSentTo(null);
  };

  // ---------------------------
  // UI (unchanged structure)
  // ---------------------------
  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "linear-gradient(135deg, #4f46e5, #8b5cf6, #3b82f6)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 12s ease infinite",
      }}
    >
      {/* LEFT SIDE - Branding */}
      {/* ... (no structural changes here) */}

      {/* RIGHT SIDE - Login */}
      {/* Add Forgot Password */}
      <Anchor
        component="button"
        onClick={handleForgotPassword}
        style={{ color: "#4F46E5", fontSize: "14px", alignSelf: "flex-end" }}
      >
        Forgot password?
      </Anchor>

      {/* Rest of your JSX stays exactly as before */}
    </div>
  );
}