import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { getReminders, type Reminder } from "../api/reminders";
import { useAuth } from "../auth/AuthContext";

type RemindersPanelProps = {
  getAccessToken: () => Promise<string | undefined>;
};

const reminderDate = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
});

/** Describe whether a reminder is overdue, due soon, or upcoming. */
function dueState(reminder: Reminder): {
  color: "default" | "error" | "warning" | "success";
  label: string;
} {
  if (reminder.is_completed) {
    return { color: "success", label: "Completed" };
  }

  const dueDate = new Date(`${reminder.due_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysRemaining < 0) {
    return { color: "error", label: "Overdue" };
  }
  if (daysRemaining <= 30) {
    return { color: "warning", label: "Due soon" };
  }
  return { color: "default", label: "Upcoming" };
}

/** Show role-appropriate reminders on the main dashboard. */
export function RemindersPanel({ getAccessToken }: RemindersPanelProps) {
  const auth = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isAdviser = auth.roles.includes("adviser");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReminders(): Promise<void> {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }
        setReminders(await getReminders(accessToken, controller.signal));
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

    void loadReminders();
    return () => controller.abort();
  }, [getAccessToken]);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">Loading reminders...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="error">Reminders could not be loaded.</Alert>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Box sx={{ p: 3, pb: 1 }}>
        <Typography component="h2" fontWeight={700} variant="h6">
          Reminders
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Upcoming documents, renewals, and financial reviews.
        </Typography>
      </Box>
      <Table aria-label="Reminders">
        <TableHead>
          <TableRow>
            {isAdviser && <TableCell>Client</TableCell>}
            <TableCell>Reminder</TableCell>
            <TableCell>Audience</TableCell>
            <TableCell>Due date</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reminders.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdviser ? 5 : 4}>
                <Typography color="text.secondary" textAlign="center">
                  No reminders are scheduled.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {reminders.map((reminder) => {
            const state = dueState(reminder);
            return (
              <TableRow key={reminder.id}>
                {isAdviser && <TableCell>{reminder.client_name}</TableCell>}
                <TableCell>{reminder.title}</TableCell>
                <TableCell>{reminder.audience}</TableCell>
                <TableCell>
                  {reminderDate.format(
                    new Date(`${reminder.due_date}T00:00:00`),
                  )}
                </TableCell>
                <TableCell>
                  <Chip color={state.color} label={state.label} size="small" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
