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
  Container,
  Modal,
} from "@mantine/core";
import {
  IconBrain,
  IconLogin,
  IconAlertCircle,
  IconSparkles,
  IconRobot,
  IconMicrophone,
  IconChartBar,
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

  // Forgot Password
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotMsg("Please enter a valid email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMsg("✅ Password reset link sent! Check your inbox.");
    } catch {
      setForgotMsg("❌ Failed to send reset email. Try again.");
    }
  };

  // Google Sign-in
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
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Email Sign-in + 2FA
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
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign-up
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

  // OTP Verification
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
    } catch {
      setError("Invalid or expired OTP. Please try again.");
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

  // ---------------- UI ----------------
  return (
    <>
      {/* Forgot Password Modal */}
      <Modal
        opened={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Password"
        centered
        styles={{
          content: { backgroundColor: "#fff" },
          header: { backgroundColor: "#fff" },
          title: { color: "#111827" },
        }}
      >
        <Stack>
          <TextInput
            label="Enter your email"
            placeholder="you@example.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            styles={{
              input: { backgroundColor: "#fff", color: "#111827", borderColor: "#e5e7eb" },
              label: { color: "#111827" },
            }}
          />
          {forgotMsg && <Alert color="blue">{forgotMsg}</Alert>}
          <Button
            leftSection={<IconSend size={16} />}
            onClick={handleForgotPassword}
            style={{ background: "linear-gradient(to right,#6366F1,#8B5CF6)", color: "#fff" }}
          >
            Send Reset Link
          </Button>
        </Stack>
      </Modal>

      <div
        className="login-grid"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "linear-gradient(135deg, #eef2ff, #ffffff, #f9fafb)",
        }}
      >
        {/* LEFT SIDE */}
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          style={{
            background: "linear-gradient(145deg, #4f46e5 0%, #8b5cf6 40%, #3b82f6 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "4rem",
            color: "white",
          }}
        >
          <Paper p="xl" radius="xl" style={{ background: "rgba(255,255,255,0.12)" }}>
            <IconBrain size={72} color="white" />
          </Paper>
          <Title order={1} style={{ color: "white", fontSize: "44px", fontWeight: 800 }}>
            Meetly.AI
          </Title>
          <Text size="lg" style={{ color: "rgba(255,255,255,0.95)", marginBottom: "1rem" }}>
            Transform your meetings with AI-powered insights and analytics
          </Text>
          <Stack spacing="lg" align="flex-start" style={{ textAlign: "left" }}>
            {[
              { icon: <IconRobot size={22} color="white" />, title: "AI Transcription" },
              { icon: <IconMicrophone size={22} color="white" />, title: "Real-Time Analysis" },
              { icon: <IconChartBar size={22} color="white" />, title: "Smart Analytics" },
            ].map((f, i) => (
              <Group key={i} spacing="md">
                {f.icon}
                <Text fw={600}>{f.title}</Text>
              </Group>
            ))}
          </Stack>
        </motion.div>

        {/* RIGHT SIDE */}
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          style={{
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "5rem",
          }}
        >
          <Container size={600}>
            <Paper p={48} radius="xl" shadow="md" style={{ background: "#fff", color: "#111827" }}>
              <Group position="center" mb="xl">
                <IconSparkles size={26} color="#4F46E5" />
                <Title order={2} style={{ fontSize: "1.6rem", color: "#111827" }}>
                  {mode === "signin" ? "Welcome Back" : "Create Account"}
                </Title>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg">
                  {error}
                </Alert>
              )}

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
                          styles={{
                            input: { backgroundColor: "#fff", color: "#111827", borderColor: "#e5e7eb" },
                            label: { color: "#111827" },
                          }}
                        />
                      )}
                      <TextInput
                        label="Email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        styles={{
                          input: { backgroundColor: "#fff", color: "#111827", borderColor: "#e5e7eb" },
                          label: { color: "#111827" },
                        }}
                      />
                      <PasswordInput
                        label="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        styles={{
                          input: { backgroundColor: "#fff", color: "#111827", borderColor: "#e5e7eb" },
                          label: { color: "#111827" },
                        }}
                      />
                      <Group position="apart" mt="sm">
                        <Checkbox
                          label="Remember me"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.currentTarget.checked)}
                        />
                        <Anchor component="button" onClick={() => setForgotOpen(true)} color="#4F46E5">
                          Forgot password?
                        </Anchor>
                      </Group>
                      <Button
                        fullWidth
                        type="submit"
                        size="lg"
                        loading={isLoading}
                        leftSection={<IconLogin size={20} />}
                        style={{
                          background: "linear-gradient(to right,#6366F1,#3B82F6)",
                          color: "white",
                        }}
                      >
                        {mode === "signin" ? "Sign In" : "Create Account"}
                      </Button>
                    </Stack>
                  </form>

                  <Divider label="or continue with" labelPosition="center" my="xl" />

                  {/* Google button — Google logo on the RIGHT side (as requested) */}
                  <Button
                    fullWidth
                    size="lg"
                    variant="white"
                    onClick={handleGoogleLogin}
                    styles={{
                      label: { color: "#111827", fontWeight: 600 },
                      root: { justifyContent: "space-between" },
                    }}
                    rightSection={
                      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92
                          c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57
                          c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77
                          c-.98.66-2.23 1.06-3.71 1.06-2.86
                          0-5.29-1.93-6.16-4.53H2.18v2.84
                          C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18
                          C1.43 8.55 1 10.22 1 12s.43 3.45
                          1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15
                          C17.45 2.09 14.97 1 12 1
                          7.7 1 3.99 3.47 2.18 7.07l3.66
                          2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    }
                  >
                    Continue with Google
                  </Button>

                  <Text align="center" mt="lg" color="#6B7280" size="sm">
                    {mode === "signin" ? "New user?" : "Already have an account?"}{" "}
                    <Anchor
                      component="button"
                      onClick={() => {
                        setError("");
                        setMode(mode === "signin" ? "signup" : "signin");
                      }}
                      color="#4F46E5"
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
                      styles={{ input: { textAlign: "center", letterSpacing: "4px", backgroundColor: "#fff" } }}
                    />
                    <Text align="center" size="sm" color="dimmed">
                      ⏳ Expires in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                    </Text>

                    <Button variant="outline" disabled={resendDisabled} onClick={handleVerifyOTP}>
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