import React, { useState, useContext } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Mic,
  Brain,
  FileText,
  Plus,
  ChevronRight,
} from "lucide-react";
import { ThemeContext } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Group, Text, Button } from "@mantine/core";


// 🧊 Custom Animated Tooltip Component
const AnimatedTooltip = ({ active, payload, label, colorScheme }) => {
  if (!active || !payload || !payload.length) return null;

  const isDark = colorScheme === "dark";

  return (
    <AnimatePresence>
      <motion.div
        key={label}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          background: isDark
            ? "rgba(30, 41, 59, 0.75)"
            : "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "12px",
          color: isDark ? "#F8FAFC" : "#111827",
          boxShadow: isDark
            ? "0 8px 25px rgba(0,0,0,0.5)"
            : "0 6px 15px rgba(0,0,0,0.1)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          padding: "0.8rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          minWidth: "130px",
        }}
      >
        <Text fw={600} style={{ marginBottom: 4, color: isDark ? "#E2E8F0" : "#334155" }}>
          {label}
        </Text>
        {payload.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: isDark ? "#F8FAFC" : "#111827",
            }}
          >
            <span>{item.name}</span>
            <span style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};


export default function Dashboard() {
  const { theme, colorScheme } = useContext(ThemeContext);
  const [timeRange, setTimeRange] = useState("week");

  // ✅ Chart Data
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
      { label: "Jul", meetings: 260 },
      { label: "Aug", meetings: 270 },
      { label: "Sep", meetings: 250 },
      { label: "Oct", meetings: 290 },
      { label: "Nov", meetings: 310 },
      { label: "Dec", meetings: 340 },
    ],
  };
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

  const recentMeetings = [
    { id: 1, title: "Product Roadmap Q4", date: "Today, 2:30 PM", duration: "45 min", insights: 8 },
    { id: 2, title: "Design Review", date: "Yesterday, 4:00 PM", duration: "30 min", insights: 6 },
  ];

  const isDark = colorScheme === "dark";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)";
  const border = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)";
  const text = isDark ? "#F8FAFC" : "#111827";
  const subtext = isDark ? "#94A3B8" : "#475569";

  return (
    <motion.div
      style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(135deg,#0f172a,#1e293b)"
          : "linear-gradient(135deg,#f9fafb,#eef2ff)",
        padding: "2rem",
        color: text,
        transition: "all 0.3s ease",
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
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
          >
            <Plus size={18} style={{ marginRight: 6 }} /> New Meeting
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {statsData.map((stat, i) => (
          <motion.div key={i} whileHover={{ scale: 1.03 }} transition={{ duration: 0.3 }}>
            <Card
              radius="lg"
              shadow="md"
              style={{
                background: cardBg,
                border,
                backdropFilter: "blur(15px)",
                color: text,
              }}
            >
              <Group position="apart">
                <div
                  style={{
                    padding: 10,
                    borderRadius: "10px",
                    background: stat.color,
                    display: "inline-flex",
                  }}
                >
                  <stat.icon color="white" size={22} />
                </div>
                <Text fw={600} size="sm" color="teal">
                  {stat.change}
                </Text>
              </Group>
              <Text mt="sm" size="sm" style={{ color: subtext }}>
                {stat.label}
              </Text>
              <Text fw={700} size="xl" style={{ color: text }}>
                {stat.value}
              </Text>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Area Chart */}
        <Card radius="lg" shadow="sm" style={{ background: cardBg, border, backdropFilter: "blur(15px)" }}>
          <Group position="apart" mb="md">
            <Text fw={700} size="lg" style={{ color: text }}>
              Meeting Activity
            </Text>
            <Group>
              {["week", "month", "year"].map((r) => (
                <Button
                  key={r}
                  variant={timeRange === r ? "filled" : "default"}
                  onClick={() => setTimeRange(r)}
                  style={{
                    background:
                      timeRange === r
                        ? "linear-gradient(to right,#6366F1,#8B5CF6)"
                        : "transparent",
                    color: timeRange === r ? "#fff" : text,
                    border,
                    fontSize: "13px",
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Button>
              ))}
            </Group>
          </Group>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#334155" : "#E2E8F0"}
              />
              <XAxis dataKey="label" stroke={subtext} />
              <YAxis stroke={subtext} />
              <Tooltip content={<AnimatedTooltip colorScheme={colorScheme} />} />
              <Area
                type="monotone"
                dataKey="meetings"
                stroke="#6366F1"
                fill="url(#colorMeetings)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card radius="lg" shadow="sm" style={{ background: cardBg, border, backdropFilter: "blur(15px)" }}>
          <Text fw={700} mb="md" style={{ color: text }}>
            Meeting Types
          </Text>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={meetingTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {meetingTypes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<AnimatedTooltip colorScheme={colorScheme} />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.8rem",
              marginTop: "1.2rem",
            }}
          >
            {meetingTypes.map((type, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  borderRadius: "12px",
                  padding: "0.7rem 0.8rem",
                  background: isDark
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(0, 0, 0, 0.03)",
                  boxShadow: isDark
                    ? "inset 0 0 15px rgba(255,255,255,0.05)"
                    : "inset 0 0 10px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: type.color,
                    boxShadow: `0 0 10px ${type.color}55`,
                  }}
                ></div>
                <Text
                  size="sm"
                  style={{
                    color: isDark ? "#F1F5F9" : "#111827",
                    fontWeight: 600,
                  }}
                >
                  {type.name}
                </Text>
                <Text
                  size="xs"
                  style={{
                    color: isDark ? "#CBD5E1" : "#475569",
                    marginLeft: "auto",
                    fontWeight: 600,
                  }}
                >
                  {type.value}%
                </Text>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Meetings */}
      <Card radius="lg" shadow="sm" style={{ background: cardBg, border, backdropFilter: "blur(15px)" }}>
        <Group position="apart" mb="md">
          <Text fw={700} size="lg" style={{ color: text }}>
            Recent Meetings
          </Text>
          <Button variant="subtle" rightSection={<ChevronRight size={16} />} color="blue">
            View All
          </Button>
        </Group>
        {recentMeetings.map((m) => (
          <motion.div
            key={m.id}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              marginBottom: "0.75rem",
              borderRadius: "10px",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
              cursor: "pointer",
            }}
          >
            <div>
              <Text fw={600} style={{ color: text }}>
                {m.title}
              </Text>
              <Text size="sm" style={{ color: subtext }}>
                {m.date} • {m.duration}
              </Text>
            </div>
            <Text size="sm" style={{ color: "#8B5CF6", fontWeight: 600 }}>
              {m.insights} Insights
            </Text>
          </motion.div>
        ))}
      </Card>
    </motion.div>
  );
}