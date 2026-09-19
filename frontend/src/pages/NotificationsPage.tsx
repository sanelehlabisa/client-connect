import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import {
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";

const notificationTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Show account activity shared by both Client and Adviser roles. */
export function NotificationsPage() {
  const auth = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNotifications(): Promise<void> {
      try {
        const accessToken = await auth.getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }
        setNotifications(
          await getNotifications(accessToken, controller.signal),
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
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();
    return () => controller.abort();
  }, [auth]);

  async function handleMarkRead(notificationId: string): Promise<void> {
    setUpdatingId(notificationId);
    setError(false);
    try {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const updated = await markNotificationRead(accessToken, notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === updated.id ? updated : notification,
        ),
      );
    } catch {
      setError(true);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Box component="main" minHeight="100vh">
      <AppHeader backLabel="Back to dashboard" backTo="/dashboard" />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography component="h1" variant="h1">
              Notifications
            </Typography>
            <Typography color="text.secondary">
              Messages and product activity for your account.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error">
              Notifications could not be updated. Please try again.
            </Alert>
          )}

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          ) : notifications.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography color="text.secondary">
                You do not have any notifications yet.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {notifications.map((notification) => (
                <Paper
                  key={notification.id}
                  variant="outlined"
                  sx={{
                    bgcolor: notification.is_read ? "background.paper" : "#eef6ff",
                    p: { xs: 2, sm: 3 },
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                    >
                      <Typography fontWeight={700} sx={{ flexGrow: 1 }}>
                        {notification.title}
                      </Typography>
                      <Chip
                        color={notification.is_read ? "default" : "primary"}
                        label={notification.is_read ? "Read" : "Unread"}
                        size="small"
                      />
                    </Stack>
                    <Typography>{notification.message}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {notification.client_name ?? "General activity"}
                      {notification.product_name
                        ? ` · ${notification.product_name}`
                        : ""}
                      {` · ${notificationTime.format(new Date(notification.created_at))}`}
                    </Typography>
                    {!notification.is_read && (
                      <Box>
                        <Button
                          disabled={updatingId === notification.id}
                          onClick={() => void handleMarkRead(notification.id)}
                          size="small"
                          variant="outlined"
                        >
                          {updatingId === notification.id
                            ? "Updating..."
                            : "Mark as read"}
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
