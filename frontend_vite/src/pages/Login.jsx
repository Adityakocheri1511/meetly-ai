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
        className="login-grid"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "linear-gradient(135deg,#4f46e5,#8b5cf6,#3b82f6)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 12s ease infinite",
        }}
      >
        {/* Responsive helpers */}
        <style>
          {`
            @keyframes float1 {
              0% { transform: translateY(0px) translateX(0px); }
              100% { transform: translateY(30px) translateX(25px); }
            }
            @keyframes float2 {
              0% { transform: translateY(0px) translateX(0px); }
              100% { transform: translateY(-25px) translateX(-30px); }
            }

            @media (max-width: 1024px) {
              .login-grid {
                grid-template-columns: 1fr;
                align-items: stretch;
              }
              .left-branding {
                padding: 2rem 1.5rem !important;
                order: 0;
              }
              .right-form {
                padding: 2rem 1rem !important;
                order: 1;
              }
              .branding-features { display: none; } /* keep left side concise on small screens */
            }

            @media (max-width: 480px) {
              .left-branding { padding: 1.5rem 1rem !important; text-align: center; }
              .right-form { padding: 1.5rem 1rem !important; }
              .container-paper { padding: 20px !important; }
            }
          `}
        </style>

        {/* LEFT SIDE - Meetly.AI Branding (full details preserved) */}
        <motion.div
          className="left-branding"
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
            position: "relative",
            overflow: "hidden",
            color: "white",
          }}
        >
          {/* Floating Glow Orbs */}
          <div
            style={{
              position: "absolute",
              top: "-10%",
              left: "-10%",
              width: "340px",
              height: "340px",
              background: "radial-gradient(circle at center, rgba(255,255,255,0.2), transparent 70%)",
              borderRadius: "50%",
              filter: "blur(90px)",
              animation: "float1 9s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              right: "-15%",
              width: "280px",
              height: "280px",
              background: "radial-gradient(circle at center, rgba(255,255,255,0.18), transparent 70%)",
              borderRadius: "50%",
              filter: "blur(70px)",
              animation: "float2 10s ease-in-out infinite alternate",
            }}
          />

          {/* Logo bubble */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              zIndex: 2,
              textAlign: "center",
              maxWidth: "520px",
            }}
          >
            <Paper
              p="xl"
              radius="xl"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "inline-block",
                marginBottom: "1.5rem",
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              }}
            >
              <IconBrain size={72} color="white" stroke={1.5} />
            </Paper>

            <Title
              order={1}
              style={{
                color: "white",
                fontSize: "44px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              Meetly.AI
            </Title>
            <Text
              size="lg"
              style={{
                color: "rgba(255,255,255,0.95)",
                marginTop: "0.6rem",
                marginBottom: "1.25rem",
                lineHeight: 1.4,
                maxWidth: 420,
              }}
            >
              Transform your meetings with AI-powered insights and analytics
            </Text>

            <Stack spacing="lg" align="flex-start" className="branding-features" style={{ textAlign: "left" }}>
              {[
                {
                  icon: <IconRobot size={22} color="white" />,
                  title: "AI Transcription",
                  desc: "Automatic summaries in seconds",
                },
                {
                  icon: <IconMicrophone size={22} color="white" />,
                  title: "Real-Time Analysis",
                  desc: "Instant meeting insights",
                },
                {
                  icon: <IconChartBar size={22} color="white" />,
                  title: "Smart Analytics",
                  desc: "Track patterns and actions",
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <Group spacing="md" noWrap>
                    <Paper
                      p="sm"
                      radius="md"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 44,
                        height: 44,
                      }}
                    >
                      {f.icon}
                    </Paper>
                    <div>
                      <Text fw={600} size="md" style={{ color: "white" }}>
                        {f.title}
                      </Text>
                      <Text size="sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {f.desc}
                      </Text>
                    </div>
                  </Group>
                </motion.div>
              ))}
            </Stack>
          </motion.div>
        </motion.div>

        {/* RIGHT SIDE - Form */}
        <motion.div
          className="right-form"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          style={{
            background: "linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6rem 5rem",
            position: "relative",
          }}
        >
          {/* Soft gradient glows (subtle) */}
          <div
            style={{
              position: "absolute",
              top: "18%",
              left: "28%",
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              background: "radial-gradient(circle at center, rgba(99,102,241,0.12), transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              right: "28%",
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              background: "radial-gradient(circle at center, rgba(139,92,246,0.10), transparent 70%)",
              filter: "blur(70px)",
            }}
          />

          <Container size={600} style={{ zIndex: 2 }}>
            <Paper
              className="container-paper"
              p={48}
              radius="xl"
              withBorder
              shadow="md"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 16px 48px rgba(99,102,241,0.08), 0 6px 24px rgba(0,0,0,0.06)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                borderRadius: 24,
                transition: "transform 0.35s ease, box-shadow 0.35s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = "0 22px 60px rgba(99,102,241,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(99,102,241,0.08)";
              }}
            >
              <Group position="center" mb="xl">
                <IconSparkles size={26} color="#4F46E5" />
                <Title order={2} style={{ fontSize: "1.6rem", color: "#111827" }}>
                  {mode === "signin" ? "Welcome Back" : "Create Account"}
                </Title>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg" style={{ fontSize: "0.95rem" }}>
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
                          size="md"
                        />
                      )}
                      <TextInput
                        label="Email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        size="md"
                      />
                      <PasswordInput
                        label="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        size="md"
                      />
                      <Group position="apart" mt="sm">
                        <Checkbox
                          label="Remember me"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.currentTarget.checked)}
                        />
                        <Anchor
                          component="button"
                          onClick={() => setForgotOpen(true)}
                          style={{
                            color: "#4F46E5",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                          }}
                        >
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
                          fontWeight: 600,
                          letterSpacing: "0.3px",
                          boxShadow: "0 8px 24px rgba(99,102,241,0.18)",
                        }}
                      >
                        {mode === "signin" ? "Sign In" : "Create Account"}
                      </Button>
                    </Stack>
                  </form>

                  <Divider label="or continue with" labelPosition="center" my="xl" />

                  {/* Google button with SVG (explicitly added) */}
                  <Button
                    fullWidth
                    size="lg"
                    variant="white"
                    onClick={handleGoogleLogin}
                    style={{
                      transition: "all 0.25s ease",
                      border: "1px solid #E5E7EB",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
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