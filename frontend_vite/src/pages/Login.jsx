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
  MantineProvider,
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

  // 🌅 Dynamic Theme State
  const [isDaytime, setIsDaytime] = useState(true);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    // Dark mode starts after 18:00 (6 PM)
    setIsDaytime(hour >= 6 && hour < 18); 
  }, []);

  const theme = isDaytime
    ? {
        background: "linear-gradient(135deg, #eef2ff, #ffffff, #f9fafb)",
        formBg: "white",
        textColor: "#111827",
      }
    : {
        // Dark Mode Background matching the left panel's gradient base
        background: "linear-gradient(135deg, #111827 0%, #1e1b4b 50%, #111827 100%)", 
        formBg: "rgba(255,255,255,0.05)",
        textColor: "#f3f4f6",
      };

  // Redirect guard (unchanged)
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

  // OTP countdown (unchanged)
  useEffect(() => {
    if (!otpStep) return;
    if (timer <= 0) {
      setError("⏰ OTP expired. Please resend a new code.");
      return;
    }
    const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(countdown);
  }, [otpStep, timer]);

  // Handle Forgot Password (unchanged logic)
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

  // Login/Signup/OTP handlers (unchanged logic)
  const handleGoogleLogin = async () => { /* ... unchanged ... */ }
  const handleEmailLogin = async (e) => { /* ... unchanged ... */ }
  const handleSignUp = async (e) => { /* ... unchanged ... */ }
  const handleVerifyOTP = async () => { /* ... unchanged ... */ }
  const handleResendOTP = async () => { /* ... unchanged ... */ }
  const cancelOtpStep = () => { /* ... unchanged ... */ }

  // ---------------- UI STYLES (Dynamic) ----------------

  // BASE LIGHT MODE STYLES (for inputs, checkboxes, modal when isDaytime is true)
  const lightInputStyles = {
    input: {
      backgroundColor: '#ffffff', 
      color: '#000000', 
      borderColor: '#ced4da', 
      '::placeholder': { color: '#adb5bd' }
    },
    label: { color: '#000000' },
    rightSection: { color: '#adb5bd' }
  };

  const lightCheckboxStyles = {
    label: { color: '#000000' },
    input: {
        backgroundColor: '#f8f9fa',
        borderColor: '#ced4da',
        '&:checked': {
            backgroundColor: '#4F46E5', // Changed to purple for better match to theme
            borderColor: '#4F46E5',
        }
    }
  };

  const lightModalStyles = {
    content: { backgroundColor: '#ffffff' },
    header: { backgroundColor: '#ffffff', color: '#000000' },
  };


  // ✨ NEW DARK MODE STYLES (for the clean, dark form design)
  
  // Dark style for the main form Paper container
  const darkFormStyles = {
    background: 'rgba(30, 27, 75, 0.6)', // Deep purple/blue transparent background
    border: '1px solid rgba(126, 34, 206, 0.3)', // Purple border
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    transition: 'transform 0.35s ease, box-shadow 0.35s ease, background 0.35s ease',
  };

  // Dark style for Text/Password Inputs
  const darkInputStyles = {
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Very slight white transparency
        color: '#f3f4f6', // Light text
        borderColor: '#4f46e5', // Theme purple border
        '::placeholder': { color: 'rgba(243, 244, 246, 0.5)' }
    },
    label: { color: '#f3f4f6' }, // Light label text
    rightSection: { color: '#a78bfa' } // Light purple icon
  };

  // Dark style for Checkbox
  const darkCheckboxStyles = {
    label: { color: '#f3f4f6' },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: '#4f46e5',
        '&:checked': {
            backgroundColor: '#4F46E5', 
            borderColor: '#4F46E5',
        }
    }
  };

  // Dark style for Forgot Password Modal
  const darkModalStyles = {
    content: { backgroundColor: '#1f2937' }, // Dark Slate background
    header: { backgroundColor: '#1f2937' },
  };

  // Determine current styles
  const currentInputStyles = isDaytime ? lightInputStyles : darkInputStyles;
  const currentCheckboxStyles = isDaytime ? lightCheckboxStyles : darkCheckboxStyles;
  const currentModalStyles = isDaytime ? lightModalStyles : darkModalStyles;
  const currentTextColor = isDaytime ? '#111827' : '#f3f4f6';


  return (
    <MantineProvider forceColorScheme={isDaytime ? "light" : "dark"}>
      <>
        {/* MODAL: FORGOT PASSWORD WINDOW */}
        <Modal 
            opened={forgotOpen} 
            onClose={() => setForgotOpen(false)} 
            // Conditional style for the title text
            title={<Title order={3} style={{ color: currentTextColor }}>Reset Password</Title>}
            centered
            styles={currentModalStyles} // Apply dynamic modal styles
        >
          <Stack>
            <TextInput
              label="Enter your email"
              placeholder="you@example.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              styles={currentInputStyles} // Apply dynamic input styles
            />
            {forgotMsg && <Alert color="blue">{forgotMsg}</Alert>}
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleForgotPassword}
              style={{ 
                background: "linear-gradient(to right,#6366F1,#8B5CF6)", 
                color: "#fff" 
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
            background: theme.background,
            transition: "background 1s ease, color 0.5s ease",
            minWidth: "1200px", 
          }}
        >
          {/* LEFT SIDE - Meetly.AI Branding (This side remains vibrant purple/blue regardless of time) */}
          <motion.div
            className="left-branding"
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            style={{
              // Always use the vibrant gradient for the branding panel
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
            {/* Floating Glow Orbs (unchanged) */}
            <div style={{ /* ... styles ... */ }} />
            <div style={{ /* ... styles ... */ }} />

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

              <Title order={1} style={{ color: "white", fontSize: "44px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                Meetly.AI
              </Title>
              <Text size="lg" style={{ color: "rgba(255,255,255,0.95)", marginTop: "0.6rem", marginBottom: "1.25rem", lineHeight: 1.4, maxWidth: 420 }}>
                Transform your meetings with AI-powered insights and analytics
              </Text>

              <Stack spacing="lg" align="flex-start" className="branding-features" style={{ textAlign: "left" }}>
                {[
                  // ... feature map (unchanged) ...
                  { icon: <IconRobot size={22} color="white" />, title: "AI Transcription", desc: "Automatic summaries in seconds" },
                  { icon: <IconMicrophone size={22} color="white" />, title: "Real-Time Analysis", desc: "Instant meeting insights" },
                  { icon: <IconChartBar size={22} color="white" />, title: "Smart Analytics", desc: "Track patterns and actions" },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                  >
                    <Group spacing="md" noWrap>
                      <Paper p="sm" radius="md" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 6px 20px rgba(0,0,0,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
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
              // Apply dynamic background for the right panel based on time
              background: isDaytime
                ? "linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)"
                : "linear-gradient(145deg, #111827, #1e1b4b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6rem 5rem",
              position: "relative",
              color: theme.textColor,
              transition: "background 1s ease, color 0.5s ease",
            }}
          >
            {/* ... (Soft gradient glows unchanged) ... */}

            <Container size={600} style={{ zIndex: 2 }}>
              <Paper
                className="container-paper"
                p={48}
                radius="xl"
                withBorder
                shadow="md"
                // Apply conditional form styles here
                style={isDaytime ? {
                  // LIGHT MODE STYLES
                  background: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
                  border: "1px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 16px 48px rgba(99,102,241,0.08), 0 6px 24px rgba(0,0,0,0.06)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  borderRadius: 24,
                  transition: "transform 0.35s ease, box-shadow 0.35s ease",
                } : darkFormStyles} // DARK MODE STYLES
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  // Use dark or light shadow based on mode
                  e.currentTarget.style.boxShadow = isDaytime 
                    ? "0 22px 60px rgba(99,102,241,0.14)" 
                    : "0 12px 40px rgba(126, 34, 206, 0.4)";
                  // Adjust background on hover
                  e.currentTarget.style.background = isDaytime ? "#f9fafb" : 'rgba(30, 27, 75, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow = isDaytime 
                    ? "0 16px 48px rgba(99,102,241,0.08)" 
                    : "0 8px 30px rgba(0, 0, 0, 0.4)";
                  // Restore initial background
                  e.currentTarget.style.background = isDaytime 
                    ? "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))"
                    : 'rgba(30, 27, 75, 0.6)';
                }}
              >
                <Group position="center" mb="xl">
                  <IconSparkles size={26} color="#4F46E5" />
                  <Title order={2} style={{ fontSize: "1.6rem", color: currentTextColor }}>
                    {mode === "signin" ? "Welcome Back" : "Create Account"}
                  </Title>
                </Group>

                {error && (
                  // Alert remains light for high contrast
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
                            styles={currentInputStyles} // Apply dynamic input styles
                          />
                        )}
                        <TextInput
                          label="Email"
                          placeholder="you@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          size="md"
                          styles={currentInputStyles} // Apply dynamic input styles
                        />
                        <PasswordInput
                          label="Password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          size="md"
                          styles={currentInputStyles} // Apply dynamic input styles
                        />
                        <Group position="apart" mt="sm">
                          {/* DYNAMIC CHECKBOX STYLE */}
                          <Checkbox
                            label="Remember me"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.currentTarget.checked)}
                            styles={currentCheckboxStyles} // Apply dynamic checkbox styles
                          />
                          <Anchor
                            component="button"
                            onClick={() => setForgotOpen(true)}
                            style={{
                              color: "#8B5CF6", // Use a bright purple for anchor text
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

                    <Divider 
                      label="or continue with" 
                      labelPosition="center" 
                      my="xl" 
                      // Dynamic Divider color for dark mode contrast
                      color={isDaytime ? 'gray' : 'dark'} 
                    />

                    {/* Google button (unchanged) */}
                    <Button
                    fullWidth
                    size="lg"
                    variant="white"
                    onClick={handleGoogleLogin}
                    leftSection={
                       <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    }
                    // Apply different style for dark mode to make the button pop
                    style={isDaytime ? {} : { 
                        backgroundColor: '#fff', 
                        color: '#111827', 
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.15)' 
                    }}
                  >
                    Continue with Google
                  </Button>

                    <Text align="center" mt="lg" color={isDaytime ? "#6B7280" : "dimmed"} size="sm">
                      {mode === "signin" ? "New user?" : "Already have an account?"}{" "}
                      <Anchor
                        component="button"
                        onClick={() => {
                          setError("");
                          setMode(mode === "signin" ? "signup" : "signin");
                        }}
                        style={{ color: "#8B5CF6", fontWeight: 600 }}
                      >
                        {mode === "signin" ? "Create one" : "Sign in"}
                      </Anchor>
                    </Text>
                  </>
                ) : (
                  <>
                    {/* OTP / 2FA screen content (applies dynamic input styles) */}
                    <Text fw={600} size="lg" align="center" mb="sm" style={{ color: currentTextColor }}>
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
                        styles={{ 
                            ...currentInputStyles, 
                            input: { 
                                ...currentInputStyles.input, 
                                textAlign: "center", 
                                letterSpacing: "4px" 
                            } 
                        }} 
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
    </MantineProvider> 
  );
}