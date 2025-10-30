import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Text,
  Group,
  Loader,
  Button,
  Divider,
  ScrollArea,
} from "@mantine/core";
import { ThemeContext } from "../context/ThemeContext";
import { motion } from "framer-motion";
import {
  IconArrowLeft,
  IconCheck,
  IconFileText,
  IconListDetails,
  IconDownload,
  IconShare2,
} from "@tabler/icons-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config/apiClient";
import { auth } from "../firebase";
import { getIdToken } from "firebase/auth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function MeetingDetails() {
  const { theme, colorScheme } = useContext(ThemeContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const isDark = colorScheme === "dark";

  // ✅ Fetch meeting securely
  useEffect(() => {
    let isMounted = true;

    async function fetchMeeting() {
      if (!auth.currentUser) {
        console.warn("⚠️ No Firebase user found — skipping fetch");
        return;
      }

      setLoading(true);
      try {
        const token = await getIdToken(auth.currentUser, true);
        const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            console.warn("⚠️ Unauthorized — token might be invalid or expired");
          }
          throw new Error(`Failed to fetch meeting details (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) setMeeting(data);
      } catch (error) {
        console.error("❌ Failed to load meeting details:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMeeting();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // ✅ Download PDF
  const downloadAsPDF = async () => {
    const element = document.getElementById("meeting-details-section");
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`${meeting.title || "meeting-summary"}.pdf`);
  };

  // ✅ Share Link
  const shareMeeting = async () => {
    try {
      const token = await getIdToken(auth.currentUser, true);
      const res = await fetch(`${API_BASE}/api/v1/share/${meeting.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`Failed to generate share link (${res.status})`);
      const data = await res.json();
      await navigator.clipboard.writeText(data.share_url);
      alert(`🔗 Share link copied to clipboard:\n${data.share_url}`);
    } catch (err) {
      console.error("❌ Share link error:", err);
      alert("Failed to generate share link. Please try again.");
    }
  };

  // ---------- Loading ----------
  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "5rem" }}>
        <Loader color="blue" />
      </div>
    );

  // ---------- No Meeting ----------
  if (!meeting)
    return (
      <Text align="center" mt="xl" style={{ color: theme.subtext }}>
        Meeting not found.
      </Text>
    );

  // 🧠 Normalize sentiment data
  let sentimentData = [];
  if (meeting.sentiment?.positive !== undefined) {
    sentimentData = [
      { name: "Positive", value: meeting.sentiment.positive || 0, color: "#22C55E" },
      { name: "Neutral", value: meeting.sentiment.neutral || 0, color: "#EAB308" },
      { name: "Negative", value: meeting.sentiment.negative || 0, color: "#EF4444" },
    ];
  } else if (meeting.sentiment?.sentiment && meeting.sentiment?.score !== undefined) {
    const sentimentType = meeting.sentiment.sentiment.toLowerCase();
    const score = meeting.sentiment.score;
    const base = { positive: 0, neutral: 0, negative: 0 };

    if (sentimentType === "positive") {
      base.positive = Math.round((score + 1) * 50);
      base.neutral = 100 - base.positive * 0.8;
      base.negative = Math.max(0, 100 - base.positive - base.neutral);
    } else if (sentimentType === "negative") {
      base.negative = Math.round(Math.abs(score) * 80);
      base.neutral = 100 - base.negative * 0.8;
      base.positive = Math.max(0, 100 - base.negative - base.neutral);
    } else {
      base.positive = 33;
      base.neutral = 34;
      base.negative = 33;
    }

    sentimentData = [
      { name: "Positive", value: base.positive, color: "#22C55E" },
      { name: "Neutral", value: base.neutral, color: "#EAB308" },
      { name: "Negative", value: base.negative, color: "#EF4444" },
    ];
  }

  const getTooltipStyle = () => ({
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.95)",
    border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: "10px",
    color: isDark ? "#F8FAFC" : "#111827",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    backdropFilter: "blur(12px)",
    padding: "6px 10px",
  });

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <circle cx={sx} cy={sy} r={4} fill={fill} stroke="none" />
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: theme.background,
        color: theme.text,
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <Group position="apart" mb="xl" align="center">
        <Group spacing="xs">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate("/history")}
            style={{
              color: theme.text,
              background: theme.sidebarHover,
              borderRadius: "8px",
            }}
          >
            Back
          </Button>

          {/* ✅ Download and Share Buttons */}
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={downloadAsPDF}
            style={{
              background: "#6366F1",
              color: "#fff",
              borderRadius: "8px",
            }}
          >
            Download PDF
          </Button>

          <Button
            variant="light"
            leftSection={<IconShare2 size={16} />}
            onClick={shareMeeting}
            style={{
              background: "#10B981",
              color: "#fff",
              borderRadius: "8px",
            }}
          >
            Share Link
          </Button>
        </Group>

        <Text fw={700} size="1.6rem" style={{ color: theme.text }}>
          {meeting.title || "Untitled Meeting"}
        </Text>
      </Group>

      {/* Meeting Details Section */}
      <div id="meeting-details-section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Summary */}
            <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder }}>
              <Group mb="md">
                <IconFileText size={20} color="#6366F1" />
                <Text fw={700} style={{ color: theme.text }}>Meeting Summary</Text>
              </Group>
              <Divider mb="md" />
              {meeting.summary?.length > 0 ? (
                meeting.summary.map((point, i) => (
                  <Text key={i} size="sm" style={{ color: theme.subtext, marginBottom: 6 }}>
                    • {point}
                  </Text>
                ))
              ) : (
                <Text size="sm" style={{ color: theme.subtext }}>No summary available.</Text>
              )}
            </Card>

            {/* Action Items */}
            <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder }}>
              <Group mb="md">
                <IconListDetails size={20} color="#10B981" />
                <Text fw={700} style={{ color: theme.text }}>Action Items</Text>
              </Group>
              <Divider mb="md" />
              {meeting.action_items?.length > 0 ? (
                meeting.action_items.map((a, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <Text fw={600} size="sm" style={{ color: theme.text }}>
                      {a.task}
                    </Text>
                    <Text size="xs" style={{ color: theme.subtext }}>
                      {a.assignee ? `Assignee: ${a.assignee}` : "Unassigned"}
                      {a.due && ` | Due: ${a.due}`}
                    </Text>
                  </div>
                ))
              ) : (
                <Text size="sm" style={{ color: theme.subtext }}>No action items found.</Text>
              )}
            </Card>

            {/* Decisions */}
            <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder }}>
              <Group mb="md">
                <IconCheck size={20} color="#F59E0B" />
                <Text fw={700} style={{ color: theme.text }}>Key Topics / Decisions</Text>
              </Group>
              <Divider mb="md" />
              {meeting.decisions?.length > 0 ? (
                meeting.decisions.map((d, i) => (
                  <Text key={i} size="sm" style={{ color: theme.subtext, marginBottom: 6 }}>
                    • {d}
                  </Text>
                ))
              ) : (
                <Text size="sm" style={{ color: theme.subtext }}>No decisions found.</Text>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Sentiment Breakdown */}
            <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder }}>
              <Text fw={700} mb="sm" style={{ color: theme.text }}>Sentiment Breakdown</Text>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {sentimentData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={getTooltipStyle()} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Full Transcript */}
            <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder, height: "300px" }}>
              <Text fw={700} size="lg" mb="sm" style={{ color: theme.text }}>
                Full Transcript
              </Text>
              <Divider mb="md" />
              <ScrollArea h={220}>
                <Text size="sm" style={{ color: theme.subtext, lineHeight: 1.6 }}>
                  {meeting.transcript || "Transcript not available."}
                </Text>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>

      {/* Responsive stacking */}
      <style>
        {`
          @media (max-width: 900px) {
            div[style*="grid-template-columns: 2fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </motion.div>
  );
}