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
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../context/UserContext";

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
          const res = await fetch("http://127.0.0.1:8000/api/v1/send_otp", {
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

      const res = await fetch("http://127.0.0.1:8000/api/v1/verify_otp", {
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
      const res = await fetch("http://127.0.0.1:8000/api/v1/send_otp", {
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
  // UI
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
      {/* LEFT SIDE - Branding + important points */}
      <motion.div
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        style={{
          background:
            "linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "4rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Floating Glow Circles */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "300px",
            height: "300px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "50%",
            filter: "blur(70px)",
            animation: "float1 8s ease-in-out infinite alternate",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: "250px",
            height: "250px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "50%",
            filter: "blur(60px)",
            animation: "float2 10s ease-in-out infinite alternate",
          }}
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <Paper
            p="xl"
            radius="xl"
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              display: "inline-block",
              marginBottom: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <IconBrain size={80} color="white" stroke={1.5} />
          </Paper>

          {/* Meetly.AI branding */}
          <Title order={1} style={{ color: "white", fontSize: "42px", fontWeight: 800 }}>
            Meetly.AI
          </Title>
          <Text size="xl" style={{ color: "rgba(255,255,255,0.9)", marginBottom: "2rem" }}>
          Transform your meetings with AI-powered insights and analytics
          </Text>

          {/* Important points (restored) */}
          <Stack spacing="lg" align="flex-start" style={{ textAlign: "left", marginTop: 8 }}>
            {[
              {
                icon: <IconRobot size={28} color="white" />,
                title: "AI Transcription",
                desc: "Automatic summaries in seconds",
              },
              {
                icon: <IconMicrophone size={28} color="white" />,
                title: "Real-Time Analysis",
                desc: "Instant meeting insights",
              },
              {
                icon: <IconChartBar size={28} color="white" />,
                title: "Smart Analytics",
                desc: "Track patterns and actions",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15 }}
              >
                <Group spacing="md">
                  <Paper
                    p="md"
                    radius="md"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  >
                    {f.icon}
                  </Paper>
                  <Box>
                    <Text weight={600} size="lg" style={{ color: "white" }}>
                      {f.title}
                    </Text>
                    <Text size="sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                      {f.desc}
                    </Text>
                  </Box>
                </Group>
              </motion.div>
            ))}
          </Stack>
        </motion.div>
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
          <Paper
            radius="xl"
            p={40}
            withBorder
            style={{
              backgroundColor: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(229,231,235,0.7)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Group position="center" mb="lg">
              <IconSparkles size={24} color="#4F46E5" />
              <Title order={2} style={{ color: "#111827", fontSize: "32px" }}>
                {mode === "signin" ? "Welcome Back" : "Create Account"}
              </Title>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg">
                {error}
              </Alert>
            )}

            {/* LOGIN / SIGNUP FORM */}
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
                      label="Email Address"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<IconMail size={18} />}
                    />
                    <PasswordInput
                      label="Password"
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={<IconLock size={18} />}
                    />
                    <Group position="apart">
                      <Checkbox
                        label="Remember me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.currentTarget.checked)}
                      />
                    </Group>
                    <Button
                      fullWidth
                      type="submit"
                      size="lg"
                      loading={isLoading}
                      leftSection={<IconLogin size={20} />}
                      style={{
                        background: "linear-gradient(to right, #6366F1, #3B82F6)",
                        color: "white",
                        fontWeight: 600,
                        boxShadow: "0 6px 20px rgba(99,102,241,0.5)",
                      }}
                    >
                      {mode === "signin" ? "Sign In" : "Create Account"}
                    </Button>
                  </Stack>
                </form>

                <Divider label="or continue with" labelPosition="center" my="lg" />

                <Button
                  fullWidth
                  size="lg"
                  variant="white"
                  onClick={handleGoogleLogin}
                  leftSection={
                    <svg width="20" height="20" viewBox="0 0 24 24">
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
                    required
                    maxLength={6}
                    styles={{
                      input: { letterSpacing: "6px", textAlign: "center" },
                    }}
                  />

                  <Text align="center" size="sm" color="dimmed" mb="xs">
                    ⏳ Expires in {Math.floor(timer / 60)}:
                    {(timer % 60).toString().padStart(2, "0")}
                  </Text>

                  <Button
                    variant="outline"
                    onClick={handleResendOTP}
                    disabled={resendDisabled}
                    style={{
                      alignSelf: "center",
                      width: "fit-content",
                      marginBottom: "1rem",
                    }}
                  >
                    {resendDisabled
                      ? `Resend in ${resendTimer}s`
                      : "Resend OTP"}
                  </Button>

                  <Group position="apart">
                    <Button variant="default" onClick={cancelOtpStep}>
                      Cancel
                    </Button>

                    <Group>
                      <Button
                        onClick={handleVerifyOTP}
                        loading={isLoading}
                        style={{
                          background: "linear-gradient(to right, #6366F1, #3B82F6)",
                          color: "white",
                        }}
                      >
                        Verify & Sign In
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </>
            )}
          </Paper>
        </Container>
      </motion.div>

      {/* Animations */}
      <style>
        {`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}
      </style>
    </div>
  );
}