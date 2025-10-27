// src/pages/Login.jsx
import { API_BASE } from "../config/apiClient";
import React, { useState, useEffect, useContext, useRef } from "react";
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
  Modal,
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
  IconKey,
  IconSend,
} from "@tabler/icons-react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../context/UserContext";

console.log("🔍 VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);

export default function Login() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

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
  const [timer, setTimer] = useState(300);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  // Forgot Password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  // Redirect guard
  useEffect(() => {
    if (redirectedRef.current) return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u?.email) {
          redirectedRef.current = true;
          navigate("/", { replace: true });
        }
      } catch {}
    }
  }, [navigate]);

  // OTP countdown
  useEffect(() => {
    if (!otpStep) return;
    if (timer <= 0) {
      setError("⏰ OTP expired. Please resend a new code.");
      return;
    }
    const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(countdown);
  }, [otpStep, timer]);

  // ---------------------------
  // Forgot Password Handler
  // ---------------------------
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotMsg("Please enter a valid email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMsg("✅ Password reset link sent! Check your inbox.");
    } catch (err) {
      console.error("Forgot password error:", err);
      setForgotMsg("❌ Failed to send reset email. Try again.");
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
      navigate("/dashboard", { replace: true });
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

      const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
      if (settings?.twoFactorAuth) {
        const res = await fetch(`${API_BASE}/api/v1/send_otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loggedUser.email }),
        });
        if (!res.ok) throw new Error("Failed to send OTP");

        localStorage.setItem("pending2fa", JSON.stringify(loggedUser));
        setOtpSentTo(loggedUser.email);
        setOtpStep(true);
        setTimer(300);
        return;
      }

      setUser(loggedUser);
      localStorage.setItem("user", JSON.stringify(loggedUser));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("❌ Email login error:", err);
      setError("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // Sign-up (with password validation)
  // ---------------------------
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // OTP Verification
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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Invalid or expired OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // OTP Resend
  // ---------------------------
  const handleResendOTP = async () => {
    setError("");
    setResendDisabled(true);
    setResendTimer(30);
    setTimer(300);
    setIsLoading(true);

    try {
      const pending = JSON.parse(localStorage.getItem("pending2fa") || "null");
      const emailTo = pending?.email || email || otpSentTo;
      if (!emailTo) throw new Error("No email to send OTP to.");

      const res = await fetch(`${API_BASE}/api/v1/send_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo }),
      });
      if (!res.ok) throw new Error("Failed to resend OTP");

      setError("✅ OTP resent successfully!");
    } catch (err) {
      setError("Failed to resend OTP. Try again later.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setResendDisabled(false), 30000);
    }
  };

  // ---------------------------
  // Cancel OTP
  // ---------------------------
  const cancelOtpStep = () => {
    localStorage.removeItem("pending2fa");
    setOtp("");
    setOtpStep(false);
    setOtpSentTo(null);
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <>
      <Modal
        opened={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Password"
        centered
      >
        <Stack>
          <TextInput
            label="Enter your email"
            placeholder="you@example.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
          {forgotMsg && <Alert color="blue">{forgotMsg}</Alert>}
          <Button
            leftSection={<IconSend size={16} />}
            onClick={handleForgotPassword}
            style={{
              background: "linear-gradient(to right,#6366F1,#8B5CF6)",
              color: "#fff",
            }}
          >
            Send Reset Link
          </Button>
        </Stack>
      </Modal>

      <div
        style={{
          height: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "linear-gradient(135deg,#4f46e5,#8b5cf6,#3b82f6)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 12s ease infinite",
        }}
      >
        {/* LEFT SIDE */}
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          style={{
            background:
              "linear-gradient(135deg,rgba(99,102,241,0.95),rgba(139,92,246,0.95))",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "4rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Paper p="xl" radius="xl" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <IconBrain size={80} color="white" stroke={1.5} />
          </Paper>
          <Title order={1} style={{ color: "white", fontSize: "42px", fontWeight: 800 }}>
            Meetly.AI
          </Title>
          <Text size="xl" style={{ color: "rgba(255,255,255,0.9)", marginBottom: "2rem" }}>
            Transform your meetings with AI-powered insights
          </Text>
        </motion.div>

        {/* RIGHT SIDE */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          style={{
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4rem",
          }}
        >
          <Container size={480}>
            <Paper radius="xl" p={40} withBorder>
              <Group position="center" mb="lg">
                <IconSparkles size={24} color="#4F46E5" />
                <Title order={2}>
                  {mode === "signin" ? "Welcome Back" : "Create Account"}
                </Title>
              </Group>

              {error && <Alert color="red">{error}</Alert>}

              {!otpStep ? (
                <>
                  <form onSubmit={mode === "signin" ? handleEmailLogin : handleSignUp}>
                    <Stack spacing="md">
                      {mode === "signup" && (
                        <TextInput
                          label="Full Name"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      )}
                      <TextInput
                        label="Email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <PasswordInput
                        label="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Group position="apart">
                        <Checkbox
                          label="Remember me"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.currentTarget.checked)}
                        />
                        <Anchor
                          component="button"
                          onClick={() => setForgotOpen(true)}
                          style={{ color: "#4F46E5", fontWeight: 600 }}
                        >
                          Forgot password?
                        </Anchor>
                      </Group>
                      <Button
                        type="submit"
                        loading={isLoading}
                        leftSection={<IconLogin size={20} />}
                        style={{
                          background: "linear-gradient(to right,#6366F1,#3B82F6)",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {mode === "signin" ? "Sign In" : "Create Account"}
                      </Button>
                    </Stack>
                  </form>

                  <Divider label="or continue with" labelPosition="center" my="lg" />
                  <Button fullWidth onClick={handleGoogleLogin} variant="white">
                    Continue with Google
                  </Button>

                  <Text align="center" mt="md" color="#6B7280" size="sm">
                    {mode === "signin" ? "New user?" : "Already have an account?"}{" "}
                    <Anchor
                      component="button"
                      onClick={() => {
                        setError("");
                        setMode(mode === "signin" ? "signup" : "signin");
                      }}
                      style={{ color: "#4F46E5", fontWeight: 600 }}
                    >
                      {mode === "signin" ? "Create one" : "Sign in"}
                    </Anchor>
                  </Text>
                </>
              ) : (
                <>
                  <Text fw={600} size="lg" align="center" mb="sm">
                    Two-factor Authentication
                  </Text>
                  <Text size="sm" align="center" color="dimmed" mb="md">
                    Enter the 6-digit code sent to <strong>{otpSentTo || email}</strong>.
                  </Text>
                  <Stack spacing="md">
                    <TextInput
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      styles={{ input: { textAlign: "center", letterSpacing: "4px" } }}
                    />
                    <Text align="center" size="sm" color="dimmed">
                      ⏳ Expires in {Math.floor(timer / 60)}:
                      {(timer % 60).toString().padStart(2, "0")}
                    </Text>
                    <Button
                      variant="outline"
                      disabled={resendDisabled}
                      onClick={handleResendOTP}
                    >
                      {resendDisabled ? `Resend in ${resendTimer}s` : "Resend OTP"}
                    </Button>
                    <Group position="apart">
                      <Button variant="default" onClick={cancelOtpStep}>
                        Cancel
                      </Button>
                      <Button onClick={handleVerifyOTP} loading={isLoading}>
                        Verify & Sign In
                      </Button>
                    </Group>
                  </Stack>
                </>
              )}
            </Paper>
          </Container>
        </motion.div>
      </div>
    </>
  );
}