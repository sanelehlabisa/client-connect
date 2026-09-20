import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { getMessages, sendMessage, type ChatMessage } from "../api/messages";
import {
  getNotifications,
  type NotificationItem,
} from "../api/notifications";
import { getReminders, type Reminder } from "../api/reminders";
import { useAuth } from "../auth/AuthContext";

type ChatPanelProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
};

const messageTime = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const reminderDate = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Provide the persistent text channel for a Client and assigned Adviser. */
export function ChatPanel({ clientId, getAccessToken }: ChatPanelProps) {
  const auth = useAuth();
  const isClient = auth.roles.includes("client");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const endOfMessages = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function refreshMessages(showLoading: boolean): Promise<void> {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }

        const [conversation, availableNotifications, availableReminders] =
          await Promise.all([
            getMessages(accessToken, clientId, controller.signal),
            getNotifications(accessToken, controller.signal),
            getReminders(accessToken, controller.signal),
          ]);
        setMessages(conversation);
        setNotifications(
          availableNotifications.filter((notification) => {
            const isMessageNotification = notification.title
              .toLowerCase()
              .startsWith("new message from");
            if (isMessageNotification) {
              return false;
            }
            return isClient
              ? notification.client_id === null ||
                  notification.client_id === clientId
              : notification.client_id === clientId;
          }),
        );
        setReminders(
          availableReminders.filter(
            (reminder) =>
              reminder.client_id === clientId && !reminder.is_completed,
          ),
        );
        setError(false);
      } catch (requestError: unknown) {
        if (
          !(requestError instanceof DOMException) ||
          requestError.name !== "AbortError"
        ) {
          setError(true);
        }
      } finally {
        if (showLoading && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void refreshMessages(true);
    const pollingId = window.setInterval(
      () => void refreshMessages(false),
      5000,
    );

    return () => {
      controller.abort();
      window.clearInterval(pollingId);
    };
  }, [clientId, getAccessToken, isClient]);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, notifications.length, reminders.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageBody = draft.trim();
    if (!messageBody) {
      return;
    }

    setSending(true);
    setError(false);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }

      const createdMessage = await sendMessage(
        accessToken,
        clientId,
        messageBody,
      );
      setMessages((currentMessages) =>
        currentMessages.some((message) => message.id === createdMessage.id)
          ? currentMessages
          : [...currentMessages, createdMessage],
      );
      setDraft("");
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography component="h2" fontWeight={700} variant="h6">
            Chat with your{" "}
            {auth.roles.includes("adviser") ? "client" : "adviser"}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Messages, reminders, and account activity stay in one conversation.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error">
            The conversation could not be updated. Please try again.
          </Alert>
        )}

        <Box
          aria-label="Conversation activity"
          sx={{
            bgcolor: "background.default",
            borderRadius: 2,
            maxHeight: 360,
            minHeight: 180,
            overflowY: "auto",
            p: 2,
          }}
        >
          {loading ? (
            <Stack alignItems="center" justifyContent="center" minHeight={140}>
              <CircularProgress size={30} />
            </Stack>
          ) : messages.length === 0 &&
            notifications.length === 0 &&
            reminders.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" minHeight={140}>
              <Typography color="text.secondary">
                No messages yet. Start the conversation below.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {reminders.map((reminder) => (
                <Box
                  key={`reminder-${reminder.id}`}
                  sx={{
                    alignSelf: "center",
                    bgcolor: "#fff8e1",
                    border: "1px solid",
                    borderColor: "warning.light",
                    borderRadius: 2,
                    maxWidth: "90%",
                    px: 2,
                    py: 1,
                    textAlign: "center",
                  }}
                >
                  <Typography fontWeight={700} variant="caption">
                    Reminder
                  </Typography>
                  <Typography variant="body2">{reminder.title}</Typography>
                  <Typography color="text.secondary" variant="caption">
                    Due{" "}
                    {reminderDate.format(
                      new Date(`${reminder.due_date}T00:00:00`),
                    )}
                  </Typography>
                </Box>
              ))}
              {notifications.map((notification) => (
                <Box
                  key={`notification-${notification.id}`}
                  sx={{
                    alignSelf: "center",
                    bgcolor: "#eef6ff",
                    border: "1px solid",
                    borderColor: "primary.light",
                    borderRadius: 2,
                    maxWidth: "90%",
                    px: 2,
                    py: 1,
                    textAlign: "center",
                  }}
                >
                  <Typography fontWeight={700} variant="caption">
                    {notification.title}
                  </Typography>
                  <Typography variant="body2">
                    {notification.message}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {notification.product_name
                      ? `${notification.product_name} - `
                      : ""}
                    {messageTime.format(new Date(notification.created_at))}
                  </Typography>
                </Box>
              ))}
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    alignSelf: message.sent_by_me ? "flex-end" : "flex-start",
                    bgcolor: message.sent_by_me ? "primary.main" : "white",
                    border: message.sent_by_me ? "none" : "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    color: message.sent_by_me
                      ? "primary.contrastText"
                      : "text.primary",
                    maxWidth: "80%",
                    px: 2,
                    py: 1.25,
                  }}
                >
                  <Typography fontWeight={700} variant="caption">
                    {message.sent_by_me ? "You" : message.sender_name}
                  </Typography>
                  <Typography sx={{ overflowWrap: "anywhere" }}>
                    {message.body}
                  </Typography>
                  <Typography
                    sx={{ opacity: 0.75 }}
                    textAlign="right"
                    variant="caption"
                  >
                    {messageTime.format(new Date(message.created_at))}
                  </Typography>
                </Box>
              ))}
              <div ref={endOfMessages} />
            </Stack>
          )}
        </Box>

        <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
          <Stack
            alignItems="flex-end"
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
          >
            <TextField
              disabled={sending}
              fullWidth
              inputProps={{ maxLength: 2000 }}
              label="Write a message"
              multiline
              onChange={(event) => setDraft(event.target.value)}
              value={draft}
            />
            <Button
              disabled={sending || draft.trim().length === 0}
              type="submit"
              variant="contained"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
