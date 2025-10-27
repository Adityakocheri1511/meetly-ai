import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Text, Group, Loader, Button, Divider, ScrollArea } from "@mantine/core";
import { ThemeContext } from "../context/ThemeContext";
import { motion } from "framer-motion";
import {
  IconArrowLeft,
  IconCheck,
  IconFileText,
  IconListDetails,
} from "@tabler/icons-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";

export default function MeetingDetails() {
  const { theme, colorScheme } = useContext(ThemeContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  const COLORS = ["#22C55E", "#EAB308", "#EF4444"]; // green, yellow, red

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`);
        if (!res.ok) throw new Error("Failed to fetch meeting details");
        const data = await res.json();
        setMeeting(data);
      } catch (error) {
        console.error("❌ Error fetching meeting:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "5rem" }}>
        <Loader color="blue" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <Text align="center" mt="xl" style={{ color: theme.subtext }}>
        Meeting not found.
      </Text>
    );
  }

  // 🧩 Sentiment Normalization Logic
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
      base.neutral = Math.round(100 - base.positive * 0.8);
      base.negative = Math.max(0, 100 - base.positive - base.neutral);
    } else if (sentimentType === "negative") {
      base.negative = Math.round(Math.abs(score) * 80);
      base.neutral = Math.round(100 - base.negative * 0.8);
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

  // 🌀 Hover animation for Pie slices
  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(null);

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill,
    } = props;
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

  const getTooltipStyle = () => ({
    background:
      theme.colorScheme === "dark"
        ? "rgba(30,41,59,0.9)"
        : "rgba(255,255,255,0.9)",
    border: theme.cardBorder,
    borderRadius: "10px",
    color: theme.text,
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: theme.background,
        color: theme.text,
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <Group position="apart" mb="xl">
        <Group spacing="xs">
          <Button
            variant="subtle"
            leftIcon={<IconArrowLeft size={18} />}
            onClick={() => navigate("/history")}
            style={{
              color: theme.text,
              background: theme.sidebarHover,
              borderRadius: "8px",
            }}
          >
            Back
          </Button>
          <Text fw={700} size="1.8rem" style={{ color: theme.text }}>
            {meeting.title || "Untitled Meeting"}
          </Text>
        </Group>
        <Text size="sm" style={{ color: theme.subtext }}>
          {new Date(meeting.created_at).toLocaleString()}
        </Text>
      </Group>

      {/* Main Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Summary */}
          <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder, backdropFilter: "blur(15px)" }}>
            <Group mb="md">
              <IconFileText size={20} color="#6366F1" />
              <Text fw={700} size="lg" style={{ color: theme.text }}>Meeting Summary</Text>
            </Group>
            <Divider mb="md" />
            {meeting.summary?.length > 0 ? (
              meeting.summary.map((point, idx) => (
                <Text key={idx} size="sm" style={{ color: theme.subtext, marginBottom: "6px" }}>
                  • {point}
                </Text>
              ))
            ) : (
              <Text size="sm" style={{ color: theme.subtext }}>No summary available.</Text>
            )}
          </Card>

          {/* Action Items */}
          <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder, backdropFilter: "blur(15px)" }}>
            <Group mb="md">
              <IconListDetails size={20} color="#10B981" />
              <Text fw={700} size="lg" style={{ color: theme.text }}>Action Items</Text>
            </Group>
            <Divider mb="md" />
            {meeting.action_items?.length > 0 ? (
              meeting.action_items.map((action, idx) => (
                <div key={idx} style={{ marginBottom: "10px" }}>
                  <Text fw={500} style={{ color: theme.text }}>{action.task}</Text>
                  <Text size="sm" style={{ color: theme.subtext }}>
                    {action.assignee ? `Assignee: ${action.assignee}` : "Unassigned"}
                    {action.due && ` | Due: ${action.due}`}
                  </Text>
                </div>
              ))
            ) : (
              <Text size="sm" style={{ color: theme.subtext }}>No action items found.</Text>
            )}
          </Card>

          {/* Decisions */}
          <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder, backdropFilter: "blur(15px)" }}>
            <Group mb="md">
              <IconCheck size={20} color="#F59E0B" />
              <Text fw={700} size="lg" style={{ color: theme.text }}>Key Topics / Decisions</Text>
            </Group>
            <Divider mb="md" />
            {meeting.decisions?.length > 0 ? (
              meeting.decisions.map((decision, idx) => (
                <Text key={idx} size="sm" style={{ color: theme.subtext, marginBottom: "6px" }}>
                  • {decision}
                </Text>
              ))
            ) : (
              <Text size="sm" style={{ color: theme.subtext }}>No decisions found.</Text>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Sentiment Breakdown */}
          <Card
            radius="lg"
            shadow="md"
            style={{
              background: theme.card,
              border: theme.cardBorder,
              backdropFilter: "blur(15px)",
            }}
          >
            <Text fw={700} mb="sm" style={{ color: theme.text }}>
              Sentiment Breakdown
            </Text>
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
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {sentimentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={getTooltipStyle()} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: ".5rem",
              }}
            >
              {sentimentData.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: s.color,
                    }}
                  />
                  <Text size="sm" style={{ color: theme.text }}>
                    {s.name}: {s.value}%
                  </Text>
                </div>
              ))}
            </div>
          </Card>

          {/* Full Transcript */}
          <Card radius="lg" shadow="md" style={{ background: theme.card, border: theme.cardBorder, backdropFilter: "blur(15px)", height: "300px", overflow: "hidden" }}>
            <Text fw={700} size="lg" mb="sm" style={{ color: theme.text }}>Full Transcript</Text>
            <Divider mb="md" />
            <ScrollArea h={220}>
              <Text size="sm" style={{ color: theme.subtext, lineHeight: 1.6 }}>
                {meeting.transcript || "Transcript not available."}
              </Text>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}