import { API_BASE } from "../config/apiClient";
import { UserContext } from "../context/UserContext";
import { getIdToken } from "firebase/auth";
import { auth } from "../firebase";
import React, { useContext, useState, useEffect, useRef } from "react";
import {
  Card,
  Group,
  Text,
  Button,
  Badge,
  Paper,
  Divider,
  List,
  ThemeIcon,
  Stack,
} from "@mantine/core";
import {
  Mic,
  Brain,
  Clock,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

/* ---------- shimmer ---------- */
const shimmerKeyframes = `
@keyframes shimmerMove {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

export default function Dashboard() {
  const { theme, colorScheme } = useContext(ThemeContext);
  const { user } = useContext(UserContext);
  const isDark = colorScheme === "dark";
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("week");

  const chartData = {
    week: [
      { label: "Mon", meetings: 12 },
      { label: "Tue", meetings: 15 },
      { label: "Wed", meetings: 18 },
      { label: "Thu", meetings: 14 },
      { label: "Fri", meetings: 16 },
      { label: "Sat", meetings: 4 },
      { label: "Sun", meetings: 2 },
    ],
    month: [
      { label: "Week 1", meetings: 54 },
      { label: "Week 2", meetings: 48 },
      { label: "Week 3", meetings: 60 },
      { label: "Week 4", meetings: 58 },
    ],
    year: [
      { label: "Jan", meetings: 220 },
      { label: "Feb", meetings: 180 },
      { label: "Mar", meetings: 240 },
      { label: "Apr", meetings: 210 },
      { label: "May", meetings: 300 },
      { label: "Jun", meetings: 280 },
    ],
  };

  const statsData = [
    { icon: Mic, label: "Total Meetings", value: "248", change: "+12%", color: "#3B82F6" },
    { icon: Brain, label: "AI Summaries", value: "186", change: "+8%", color: "#8B5CF6" },
    { icon: Clock, label: "Hours Saved", value: "127", change: "+24%", color: "#22C55E" },
    { icon: TrendingUp, label: "Insights", value: "342", change: "+18%", color: "#F59E0B" },
  ];

  const meetingTypes = [
    { name: "Strategy", value: 35, color: "#6366F1" },
    { name: "Review", value: 28, color: "#8B5CF6" },
    { name: "Planning", value: 22, color: "#EC4899" },
    { name: "1-on-1", value: 15, color: "#F59E0B" },
  ];

  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState(null);
  const [expandedAll, setExpandedAll] = useState(false);

  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingMeetingDetails, setLoadingMeetingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const detailsControllerRef = useRef(null);

  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const border = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)";
  const text = isDark ? "#F8FAFC" : "#111827";
  const subtext = isDark ? "#CBD5E1" : "#475569";

  const shimmerBase = {
    background: isDark
      ? "linear-gradient(90deg, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.8) 50%, rgba(59,130,246,0.8) 100%)"
      : "linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 50%, rgba(59,130,246,0.12) 100%)",
    backgroundSize: "200% 100%",
    borderRadius: 10,
    animation: "shimmerMove 1.2s linear infinite",
  };

  useEffect(() => {
    if (!auth.currentUser) return; // ✅ Wait until Firebase initializes
    let mounted = true;
  
    async function loadMeetings() {
      setLoadingMeetings(true);
      setMeetingsError(null);
  
      try {
        // ✅ Force refresh Firebase token to avoid expired token 401
        const token = await getIdToken(auth.currentUser, true);
  
        const res = await fetch(`${API_BASE}/api/v1/meetings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (!res.ok) {
          if (res.status === 401) {
            console.warn("⚠️ Unauthorized — Firebase token might have expired");
          }
          throw new Error(`Server responded ${res.status}`);
        }
  
        const data = await res.json();
        if (mounted) setRecentMeetings(data.meetings || []);
      } catch (err) {
        console.error("❌ Error fetching meetings:", err);
        if (mounted) setMeetingsError("Failed to load recent meetings.");
      } finally {
        if (mounted) setLoadingMeetings(false);
      }
    }
  
    loadMeetings();
    return () => {
      mounted = false;
    };
  }, [user]);

  /* -------- fetch details -------- */
  const handleSelectMeeting = async (id) => {
    setSelectedMeeting(null);
    setDetailsError(null);
    setLoadingMeetingDetails(true);
    if (detailsControllerRef.current) detailsControllerRef.current.abort();
    const controller = new AbortController();
    detailsControllerRef.current = controller;
    try {
      const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setSelectedMeeting(data);
      setTimeout(() => {
        const el = document.getElementById("meeting-insights");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("❌ Failed to load meeting details:", err);
        setDetailsError("Unable to load meeting details. Try again.");
      }
    } finally {
      setLoadingMeetingDetails(false);
      detailsControllerRef.current = null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(135deg,#0f172a,#1e293b)"
          : "linear-gradient(135deg,#f9fafb,#eef2ff)",
        color: text,
        padding: "1.5rem",
        transition: "all 0.4s ease",
      }}
    >
      <style>{shimmerKeyframes}</style>

      {/* Header */}
      <Group position="apart" mb="lg" align="center">
        <div>
      <Text fw={700} size="1.8rem" style={{ color: text }}>
          {user
            ? `Welcome back, ${user.displayName || user.name || "User"} 👋`
            : "Welcome to Meetly.AI"}
      </Text>
        <Text size="sm" style={{ color: subtext }}>
          Here’s your AI meeting summary
        </Text>
        </div>
        <Button
          style={{
            background: "linear-gradient(to right,#6366F1,#8B5CF6)",
            color: "#fff",
            fontWeight: 600,
          }}
          onClick={() => navigate("/analyze")}
        >
          <Plus size={18} style={{ marginRight: 6 }} /> New Meeting
        </Button>
      </Group>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {statsData.map((s, i) => (
          <Card key={i} radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem" }}>
            <Group position="apart">
              <div style={{ padding: 10, borderRadius: 10, background: s.color, display: "inline-flex" }}>
                <s.icon color="#fff" size={18} />
              </div>
              <Badge color="gray" variant="outline">{s.change}</Badge>
            </Group>
            <Text mt="sm" size="sm" style={{ color: subtext }}>{s.label}</Text>
            <Text fw={700} size="xl" style={{ color: text }}>{s.value}</Text>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Area chart */}
        <Card radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem" }}>
          <Group position="apart" mb="sm">
            <Text fw={700} style={{ color: text }}>Meeting Activity</Text>
            <Group>
              {["week", "month", "year"].map((r) => (
                <Button
                  key={r}
                  variant={timeRange === r ? "filled" : "default"}
                  onClick={() => setTimeRange(r)}
                  style={{
                    background: timeRange === r ? "linear-gradient(to right,#6366F1,#8B5CF6)" : "transparent",
                    color: timeRange === r ? "#fff" : text,
                    border,
                    fontSize: 13,
                    height: 32,
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Button>
              ))}
            </Group>
          </Group>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData[timeRange]}>
              <defs>
                <linearGradient id="colorMeet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2937" : "#EEF2FF"} />
              <XAxis dataKey="label" stroke={subtext} />
              <YAxis stroke={subtext} />
              <Tooltip
                contentStyle={{
                  background: isDark ? "rgba(30,41,59,0.9)" : "#fff",
                  color: text,
                  borderRadius: 8,
                  border,
                }}
              />
              <Area type="monotone" dataKey="meetings" stroke="#6366F1" fill="url(#colorMeet)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Meeting Types */}
        <Card radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem" }}>
          <Text fw={700} mb="sm" style={{ color: text }}>Meeting Types</Text>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={meetingTypes} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                {meetingTypes.map((t, i) => <Cell key={i} fill={t.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isDark ? "rgba(30,41,59,0.9)" : "#fff",
                  color: text,
                  borderRadius: 8,
                  border,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem", marginTop: ".8rem" }}>
            {meetingTypes.map((type, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                borderRadius: 12,
                padding: "0.7rem 0.8rem",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
              }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: type.color }} />
                <Text size="sm" fw={600} style={{ color: text }}>{type.name}</Text>
                <Text size="xs" style={{ marginLeft: "auto", color: subtext }}>{type.value}%</Text>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Meetings */}
<Card
  radius="lg"
  shadow="sm"
  style={{ background: cardBg, border, padding: "1rem", color: text }}
>
  <Group position="apart" mb="sm">
    <Text fw={700} style={{ color: text }}>
      Recent Meetings
    </Text>
    <Button
      variant="subtle"
      color="blue"
      rightSection={<ChevronRight size={16} />}
      onClick={() => setExpandedAll((s) => !s)}
      style={{
        color: isDark ? "#93C5FD" : "#1D4ED8",
        fontWeight: 600,
      }}
    >
      {expandedAll ? "Collapse" : "View All"}
    </Button>
  </Group>

  {loadingMeetings ? (
    <>
      <div style={{ ...shimmerBase, height: 60 }} />
      <div style={{ ...shimmerBase, height: 60 }} />
    </>
  ) : meetingsError ? (
    <Text color="red">{meetingsError}</Text>
  ) : recentMeetings.length === 0 ? (
    <Text size="sm" style={{ color: subtext }}>
      No meetings yet — create one to see insights.
    </Text>
  ) : (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: expandedAll ? "60vh" : "260px",
        overflowY: "auto",
        paddingRight: 6,
      }}
    >
      {(expandedAll ? recentMeetings : recentMeetings.slice(0, 2)).map((m) => (
        <motion.div
          key={m.id}
          layout
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <button
            onClick={() => handleSelectMeeting(m.id)}
            aria-label={`Open meeting ${m.title}`}
            aria-pressed={selectedMeeting?.id === m.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.9rem",
              borderRadius: 10,
              width: "100%",
              cursor: "pointer",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.02)",
              border:
                selectedMeeting?.id === m.id
                  ? `1px solid #8B5CF6`
                  : "1px solid transparent",
              boxShadow:
                selectedMeeting?.id === m.id
                  ? "0 8px 20px rgba(139,92,246,0.08)"
                  : "none",
              textAlign: "left",
            }}
          >
            <div>
              <Text fw={700} style={{ color: text }}>
                {m.title}
              </Text>
              <Text size="xs" style={{ color: subtext }}>
                {m.date} • {m.duration || "—"}
              </Text>
            </div>
            <div style={{ textAlign: "right" }}>
              <Text
                size="sm"
                fw={700}
                style={{ color: isDark ? "#A78BFA" : "#7C3AED" }}
              >
                {m.insights ?? "—"} Insights
              </Text>
              <Text size="xs" style={{ color: subtext }}>
                {m.created_at
                  ? new Date(m.created_at).toLocaleDateString()
                  : ""}
              </Text>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  )}
</Card>

{/* Meeting Insights */}
<AnimatePresence>
  <motion.div
    id="meeting-insights"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
  >
    <Card
      radius="lg"
      shadow="sm"
      style={{
        background: cardBg,
        border,
        padding: "1rem",
        marginTop: "1.2rem",
        maxHeight: "60vh",
        overflow: "hidden",
        color: text,
      }}
    >
      <div style={{ height: "100%", overflowY: "auto", paddingRight: 6 }}>
        <Group position="apart" mb="sm">
          <Text fw={700} style={{ color: text }}>
            📋 Meeting Insights
          </Text>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setSelectedMeeting(null)}
            aria-label="Close meeting insights"
            style={{
              color: isDark ? "#E0E7FF" : "#1E3A8A",
              borderColor: isDark ? "#6366F1" : "#3B82F6",
            }}
          >
            Close
          </Button>
        </Group>

        {loadingMeetingDetails ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...shimmerBase, height: 18 }} />
            <div style={{ ...shimmerBase, height: 100 }} />
          </div>
        ) : detailsError ? (
          <Group>
            <Text color="red">{detailsError}</Text>
            <Button
              variant="light"
              size="xs"
              onClick={() =>
                handleSelectMeeting(
                  selectedMeeting?.id || recentMeetings[0]?.id
                )
              }
            >
              Retry
            </Button>
          </Group>
        ) : !selectedMeeting ? (
          <Text size="sm" style={{ color: subtext }}>
            Click a meeting above to view full summary, action items,
            decisions and sentiment.
          </Text>
        ) : (
          <Stack spacing="md">
            <div>
              <Text fw={700} style={{ color: text }}>
                {selectedMeeting.title || "Untitled Meeting"}
              </Text>
              <Text size="xs" style={{ color: subtext }}>
                {selectedMeeting.date || ""} •{" "}
                {selectedMeeting.created_at
                  ? new Date(selectedMeeting.created_at).toLocaleString()
                  : ""}
              </Text>
            </div>

            <Divider />

            {/* Summary */}
            <div>
              <Text fw={700} style={{ color: text }}>
                Summary
              </Text>
              {Array.isArray(selectedMeeting.summary) &&
              selectedMeeting.summary.length > 0 ? (
                <List spacing="xs" mt="xs">
                  {selectedMeeting.summary.map((s, i) => (
                    <List.Item
                      key={i}
                      icon={
                        <ThemeIcon
                          radius="xl"
                          size={18}
                          color="#8B5CF6"
                          variant="light"
                        >
                          <ChevronDown size={12} />
                        </ThemeIcon>
                      }
                    >
                      <Text size="sm" style={{ color: subtext }}>
                        {s}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text size="sm" style={{ color: subtext }}>
                  No summary available.
                </Text>
              )}
            </div>

            {/* Action Items */}
            <div>
              <Text fw={700} style={{ color: text }}>
                Action Items
              </Text>
              {Array.isArray(selectedMeeting.action_items) &&
              selectedMeeting.action_items.length > 0 ? (
                selectedMeeting.action_items.map((a, i) => (
                  <Paper
                    key={i}
                    p="sm"
                    radius="md"
                    style={{
                      marginTop: 8,
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "#fff",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <Group position="apart" align="flex-start">
                      <div>
                        <Text
                          size="sm"
                          fw={700}
                          style={{
                            color: isDark ? "#F8FAFC" : "#111827",
                          }}
                        >
                          {a.task}
                        </Text>
                        <Text size="xs" style={{ color: subtext }}>
                          {a.assignee || "Unassigned"} • Due:{" "}
                          {a.due || "—"}
                        </Text>
                      </div>
                      <Badge
                        color="violet"
                        variant={isDark ? "light" : "filled"}
                      >
                        Action
                      </Badge>
                    </Group>
                  </Paper>
                ))
              ) : (
                <Text size="sm" style={{ color: subtext }}>
                  No action items recorded.
                </Text>
              )}
            </div>

            {/* Decisions */}
            <div>
              <Text fw={700} style={{ color: text }}>
                Decisions
              </Text>
              {Array.isArray(selectedMeeting.decisions) &&
              selectedMeeting.decisions.length > 0 ? (
                <List spacing="xs" mt="xs">
                  {selectedMeeting.decisions.map((d, i) => (
                    <List.Item
                      key={i}
                      icon={
                        <ThemeIcon
                          radius="xl"
                          size={18}
                          color="#3B82F6"
                          variant="light"
                        >
                          <ChevronRight size={12} />
                        </ThemeIcon>
                      }
                    >
                      <Text size="sm" style={{ color: subtext }}>
                        {d}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text size="sm" style={{ color: subtext }}>
                  No decisions captured.
                </Text>
              )}
            </div>
          </Stack>
        )}
      </div>
    </Card>
  </motion.div>
</AnimatePresence>
    </motion.div>
  );
}