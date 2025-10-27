import React, { useContext, useEffect, useState } from "react";
import {
  Card,
  Group,
  Avatar,
  Text,
  Loader,
  TextInput,
  Button,
  Divider,
} from "@mantine/core";
import { ThemeContext } from "../context/ThemeContext";
import { auth } from "../firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { motion } from "framer-motion";
import {
  IconUser,
  IconMail,
  IconSettings,
  IconEdit,
} from "@tabler/icons-react";

export default function Profile() {
  const { theme } = useContext(ThemeContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  // ✅ Watch Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setName(currentUser?.displayName || "");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Handle profile picture change
  const handleChangePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const newPhotoURL = reader.result;
          try {
            await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
            setUser((prev) => ({ ...prev, photoURL: newPhotoURL }));
            console.log("✅ Profile photo updated successfully!");
          } catch (error) {
            console.error("❌ Failed to update photo:", error);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <Loader color="blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <Text align="center" mt="xl" style={{ color: theme.subtext }}>
        No user information found.
      </Text>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: theme.background,
        color: theme.text,
        transition: "all 0.4s ease",
      }}
    >
      <Card
        radius="lg"
        shadow="lg"
        style={{
          background: theme.card,
          border: theme.cardBorder,
          backdropFilter: "blur(15px)",
          maxWidth: "650px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        {/* Profile Picture Section */}
        <div
          style={{
            position: "relative",
            width: "140px",
            height: "140px",
            margin: "0 auto",
          }}
        >
          <Avatar
            src={
              user?.photoURL ||
              "https://ui-avatars.com/api/?name=User&background=6366F1&color=fff"
            }
            alt="Profile Picture"
            radius="100%"
            size={140}
            style={{
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              border: theme.cardBorder,
              objectFit: "cover",
              transition: "transform 0.3s ease",
            }}
          />

          {/* Change Button - Centered Overlay */}
          <Button
            size="xs"
            onClick={handleChangePhoto}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              padding: "0.5rem 1rem",
              fontWeight: 600,
              opacity: 0,
              transition: "opacity 0.3s ease",
            }}
            className="change-photo-btn"
          >
            Change
          </Button>
        </div>

        <style>
          {`
            .change-photo-btn {
              pointer-events: none;
            }
            div:hover > .change-photo-btn {
              opacity: 1;
              pointer-events: all;
            }
          `}
        </style>

        {/* User Details */}
        <Text
          align="center"
          fw={700}
          size="1.5rem"
          mb="xs"
          style={{ color: theme.text, marginTop: "1rem" }}
        >
          {user.displayName || "Unnamed User"}
        </Text>
        <Text align="center" size="sm" style={{ color: theme.subtext }}>
          {user.email}
        </Text>

        <Divider my="xl" />

        {/* Editable Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <TextInput
            label="Full Name"
            icon={<IconUser size={16} />}
            value={name}
            disabled={!editing}
            onChange={(e) => setName(e.target.value)}
            styles={{
              label: { color: theme.subtext },
              input: {
                background: theme.card,
                color: theme.text,
                border: theme.cardBorder,
              },
            }}
          />

          <TextInput
            label="Email Address"
            icon={<IconMail size={16} />}
            value={user?.email || ""}
            disabled
            styles={{
              label: { color: theme.subtext },
              input: {
                background: theme.card,
                color: theme.text,
                border: theme.cardBorder,
              },
            }}
          />

          <TextInput
            label="Account Provider"
            icon={<IconSettings size={16} />}
            value={user.providerData[0]?.providerId || "email/password"}
            disabled
            styles={{
              label: { color: theme.subtext },
              input: {
                background: theme.card,
                color: theme.text,
                border: theme.cardBorder,
              },
            }}
          />
        </div>

        <Group position="center" mt="xl">
          {!editing ? (
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={() => setEditing(true)}
              style={{
                background: theme.accent,
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Edit Profile
            </Button>
          ) : (
            <Group>
              <Button variant="default" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                style={{
                  background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                  color: "#fff",
                }}
                onClick={() => {
                  alert("Profile update functionality coming soon 🚀");
                  setEditing(false);
                }}
              >
                Save Changes
              </Button>
            </Group>
          )}
        </Group>
      </Card>
    </motion.div>
  );
}