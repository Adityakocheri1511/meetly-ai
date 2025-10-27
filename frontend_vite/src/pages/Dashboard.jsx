// src/pages/Dashboard.jsx
import { API_BASE } from "../config/apiClient";
import React, { useContext, useState, useEffect } from "react";
import {
  Card,
  Group,
  Text,
  Button,
  Loader,
  Divider,
  List,
  ThemeIcon,
  Badge,
  Paper,
  Stack,
} from "@mantine/core";
import {
  Plus,
  ChevronRight,
  Mic,
  Brain,
  Clock,
  TrendingUp,
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

/* ---------------------------
   Small helper: shimmer style
   --------------------------- */
const shimmerStyle = {
  background: "linear-gradient(90deg, #6366F1 0%, #8B5CF6 35%, #3B82F6 70%)",
  backgroundSize: "200% 100%",
  borderRadius: 12,
  height: "72px",
  marginBottom: "0.8rem",
  animation: "shimmerMove 1.2s linear infinite",
};

const shimmerKeyframes = `
@keyframes shimmerMove {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

/* ---------------------------
   Animated tooltip wrapper
   (keeps Chart tooltip as before)
   --------------------------- */
const AnimatedTooltip = ({ active, payload, label, colorScheme }) => {
  if (!active || !payload || !payload.length) return null;
  const isDark = colorScheme === "dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      style={{
        background: isDark ? "rgba(30,41,59,0.9)" : "#fff",
        color: isDark ? "#E6EEF8" : "#111827",
        padding: "0.6rem 0.8rem",
        borderRadius: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        minWidth: 140,
      }}
    >
      <Text fw={700} size="xs" style={{ marginBottom: 6 }}>
        {label}
      </Text>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </motion.div>
  );
};

export default function Dashboard() {
  const { theme, colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === "dark";

  // static chart data (unchanged)
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
  const [timeRange, setTimeRange] = useState("week");
  const currentData = chartData[timeRange];

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

  // ---------- Live data states ----------
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState(null);

  const [expandedAll, setExpandedAll] = useState(false);

  // selected meeting details
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingMeetingDetails, setLoadingMeetingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Fetch recent meetings on mount
  useEffect(() => {
    let mounted = true;
    async function loadMeetings() {
      setLoadingMeetings(true);
      setMeetingsError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/meetings`);
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        // backend returns { meetings: [...] }
        setRecentMeetings(data.meetings || []);
      } catch (err) {
        console.error("❌ Error fetching meetings:", err);
        if (mounted) setMeetingsError("Failed to load recent meetings.");
      } finally {
        if (mounted) setLoadingMeetings(false);
      }
    }
    loadMeetings();
    return () => (mounted = false);
  }, []);

  // Handler: click a meeting -> fetch details
  const handleSelectMeeting = async (id) => {
    setSelectedMeeting(null);
    setDetailsError(null);
    setLoadingMeetingDetails(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      // expected shape: meeting object
      setSelectedMeeting(data);
      // smoothly scroll the insights into view (optional)
      setTimeout(() => {
        const el = document.getElementById("meeting-insights");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (err) {
      console.error("❌ Failed to load meeting details:", err);
      setDetailsError("Unable to load meeting details. Try again.");
    } finally {
      setLoadingMeetingDetails(false);
    }
  };

  // UI helpers
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)";
  const border = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)";
  const text = isDark ? "#F8FAFC" : "#111827";
  const subtext = isDark ? "#94A3B8" : "#475569";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: isDark ? "linear-gradient(135deg,#0f172a,#1e293b)" : "linear-gradient(135deg,#f9fafb,#eef2ff)",
        color: text,
      }}
    >
      <style>{shimmerKeyframes}</style>

      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Text fw={700} size="2rem" style={{ color: text }}>
            Welcome back, Aditya 👋
          </Text>
          <Text size="sm" style={{ color: subtext }}>
            Here’s your AI meeting summary
          </Text>
        </div>

        <Group>
          <Button variant="default" style={{ border, color: text, background: cardBg }}>
            Filter
          </Button>
          <Button
            style={{
              background: "linear-gradient(to right,#6366F1,#8B5CF6)",
              color: "#fff",
              fontWeight: 600,
              boxShadow: "0 5px 20px rgba(99,102,241,0.4)",
            }}
            onClick={() => (window.location.href = "/analyze")}
          >
            <Plus size={18} style={{ marginRight: 8 }} /> New Meeting
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1.5rem", marginBottom: "1.6rem" }}>
        {statsData.map((stat, i) => (
          <motion.div key={i} whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
            <Card radius="lg" shadow="sm" style={{ background: cardBg, border, backdropFilter: "blur(12px)", color: text }}>
              <Group position="apart">
                <div style={{ padding: 10, borderRadius: 10, background: stat.color, display: "inline-flex" }}>
                  <stat.icon color="#fff" size={18} />
                </div>
                <Badge color="gray" variant="outline">{stat.change}</Badge>
              </Group>
              <Text mt="sm" size="sm" style={{ color: subtext }}>{stat.label}</Text>
              <Text fw={700} size="xl" style={{ color: text }}>{stat.value}</Text>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.6rem" }}>
        <Card radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem" }}>
          <Group position="apart" mb="md">
            <Text fw={700} size="lg" style={{ color: text }}>Meeting Activity</Text>
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
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Button>
              ))}
            </Group>
          </Group>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="colorMeet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2937" : "#EEF2FF"} />
              <XAxis dataKey="label" stroke={subtext} />
              <YAxis stroke={subtext} />
              <Tooltip content={<AnimatedTooltip colorScheme={colorScheme} />} />
              <Area type="monotone" dataKey="meetings" stroke="#6366F1" fill="url(#colorMeet)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem" }}>
          <Text fw={700} mb="md" style={{ color: text }}>Meeting Types</Text>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={meetingTypes} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={86} paddingAngle={4}>
                {meetingTypes.map((t, i) => <Cell key={i} fill={t.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {meetingTypes.map((t, i) => (
              <Paper key={i} padding="xs" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: t.color }} />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={700} style={{ color: text }}>{t.name}</Text>
                </div>
                <Text size="xs" style={{ color: subtext }}>{t.value}%</Text>
              </Paper>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Meetings + View All */}
      <Card radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem", marginBottom: "1.2rem" }}>
        <Group position="apart" mb="md">
          <Text fw={700} size="lg" style={{ color: text }}>Recent Meetings</Text>
          <Button variant="subtle" rightSection={<ChevronRight size={16} />} color="blue" onClick={() => setExpandedAll((s) => !s)}>
            {expandedAll ? "Collapse" : "View All"}
          </Button>
        </Group>

        {loadingMeetings ? (
          // shimmer placeholders
          <>
            <div style={shimmerStyle} />
            <div style={{ ...shimmerStyle, height: 56 }} />
            <div style={{ ...shimmerStyle, height: 56 }} />
          </>
        ) : meetingsError ? (
          <Text color="red">{meetingsError}</Text>
        ) : recentMeetings.length === 0 ? (
          <Text size="sm" style={{ color: subtext }}>No meetings yet — create a new meeting to see insights.</Text>
        ) : (
          <>
            {/* If collapsed show only first 2, otherwise show all */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(expandedAll ? recentMeetings : recentMeetings.slice(0, 2)).map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleSelectMeeting(m.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.9rem",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: selectedMeeting?.id === m.id ? `1px solid #8B5CF6` : "transparent",
                  }}
                >
                  <div>
                    <Text fw={700} style={{ color: text }}>{m.title}</Text>
                    <Text size="xs" style={{ color: subtext }}>{m.date} • {m.duration || "—"}</Text>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Text size="sm" style={{ color: "#8B5CF6", fontWeight: 700 }}>{m.insights ?? "—"} Insights</Text>
                    <Text size="xs" style={{ color: subtext }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : ""}</Text>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Meeting Insights (loads below list) */}
      <AnimatePresence>
        <motion.div
          id="meeting-insights"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          style={{ overflow: "hidden" }}
        >
          <Card radius="lg" shadow="sm" style={{ background: cardBg, border, padding: "1rem" }}>
            <Group position="apart" mb="md">
              <Text fw={700} size="lg" style={{ color: text }}>📋 Meeting Insights</Text>
              <div>
                <Button variant="outline" size="xs" onClick={() => { setSelectedMeeting(null); setDetailsError(null); }}>
                  Close
                </Button>
              </div>
            </Group>

            {loadingMeetingDetails ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...shimmerStyle, height: 18 }} />
                <div style={{ ...shimmerStyle, height: 120 }} />
                <div style={{ ...shimmerStyle, height: 72 }} />
              </div>
            ) : detailsError ? (
              <Text color="red">{detailsError}</Text>
            ) : !selectedMeeting ? (
              <Text size="sm" style={{ color: subtext }}>Click a meeting above to view full summary, action items, decisions and sentiment.</Text>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {/* Title + meta */}
                <div>
                  <Text fw={700} style={{ color: text, fontSize: 18 }}>{selectedMeeting.title || "Untitled Meeting"}</Text>
                  <Text size="xs" style={{ color: subtext }}>{selectedMeeting.date || ""} • {selectedMeeting.created_at ? new Date(selectedMeeting.created_at).toLocaleString() : ""}</Text>
                </div>

                <Divider />

                {/* Summary */}
                <div>
                  <Text fw={700} style={{ color: text }}>Summary</Text>
                  {Array.isArray(selectedMeeting.summary) && selectedMeeting.summary.length > 0 ? (
                    <List spacing="xs" mt="xs">
                      {selectedMeeting.summary.map((s, i) => (
                        <List.Item key={i} icon={<ThemeIcon radius="xl" size={18} color="#8B5CF6" variant="light"><ChevronRight size={12} /></ThemeIcon>}>
                          <Text size="sm" style={{ color: text }}>{s}</Text>
                        </List.Item>
                      ))}
                    </List>
                  ) : (
                    <Text size="sm" style={{ color: subtext, marginTop: 8 }}>No summary available.</Text>
                  )}
                </div>

                {/* Action items */}
                <div>
                  <Text fw={700} style={{ color: text }}>Action Items</Text>
                  {Array.isArray(selectedMeeting.action_items) && selectedMeeting.action_items.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      {selectedMeeting.action_items.map((a, idx) => (
                        <Paper key={idx} padding="sm" style={{ marginBottom: 8, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#fff" }}>
                          <Group position="apart">
                            <div>
                              <Text size="sm" fw={700}>{a.task}</Text>
                              <Text size="xs" style={{ color: subtext }}>{a.assignee || "Unassigned"} • Due: {a.due || "—"}</Text>
                              {a.context && <Text size="xs" style={{ color: subtext, marginTop: 6 }}>{a.context}</Text>}
                            </div>
                            <Badge color="violet">Action</Badge>
                          </Group>
                        </Paper>
                      ))}
                    </div>
                  ) : (
                    <Text size="sm" style={{ color: subtext, marginTop: 8 }}>No action items recorded.</Text>
                  )}
                </div>

                {/* Decisions */}
                <div>
                  <Text fw={700} style={{ color: text }}>Decisions</Text>
                  {Array.isArray(selectedMeeting.decisions) && selectedMeeting.decisions.length > 0 ? (
                    <List spacing="xs" mt="xs">
                      {selectedMeeting.decisions.map((d, i) => (
                        <List.Item key={i} icon={<ThemeIcon radius="xl" size={18} color="#3B82F6" variant="light"><ChevronRight size={12} /></ThemeIcon>}>
                          <Text size="sm" style={{ color: text }}>{d}</Text>
                        </List.Item>
                      ))}
                    </List>
                  ) : (
                    <Text size="sm" style={{ color: subtext, marginTop: 8 }}>No decisions captured.</Text>
                  )}
                </div>

                {/* Sentiment */}
                <div>
                  <Text fw={700} style={{ color: text }}>Sentiment</Text>
                  {selectedMeeting.sentiment ? (
                    <Stack spacing="xs" mt="xs">
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <Text size="sm" fw={700} style={{ color: text }}>{selectedMeeting.sentiment.sentiment || "neutral"}</Text>
                        <Text size="xs" style={{ color: subtext }}>score: {typeof selectedMeeting.sentiment.score === "number" ? selectedMeeting.sentiment.score.toFixed(2) : selectedMeeting.sentiment.score}</Text>
                      </div>
                      <div style={{ height: 8, width: "100%", background: "rgba(0,0,0,0.06)", borderRadius: 8 }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(Math.max((selectedMeeting.sentiment.score || 0) * 50 + 50, 0), 100)}%`,
                          background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
                          borderRadius: 8,
                        }} />
                      </div>
                    </Stack>
                  ) : (
                    <Text size="sm" style={{ color: subtext, marginTop: 8 }}>No sentiment data.</Text>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}