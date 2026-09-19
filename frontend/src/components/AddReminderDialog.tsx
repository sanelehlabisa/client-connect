import { type FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import { getAssignedClients, type ClientSummary } from "../api/clients";
import {
  createReminder,
  type Reminder,
  type ReminderCreate,
} from "../api/reminders";

type AddReminderDialogProps = {
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  onCreated: (reminder: Reminder) => void;
  open: boolean;
};

const emptyReminder: ReminderCreate = {
  client_id: "",
  title: "",
  due_date: "",
  audience: "Both",
};

/** Let an Adviser schedule one dated reminder for an assigned Client. */
export function AddReminderDialog({
  getAccessToken,
  onClose,
  onCreated,
  open,
}: AddReminderDialogProps) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [reminder, setReminder] = useState<ReminderCreate>(emptyReminder);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    async function loadClients(): Promise<void> {
      setLoadingClients(true);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }
        const assignedClients = await getAssignedClients(
          accessToken,
          controller.signal,
        );
        setClients(assignedClients);
        setReminder((current) => ({
          ...current,
          client_id: current.client_id || assignedClients[0]?.id || "",
        }));
      } catch (requestError: unknown) {
        if (
          !(requestError instanceof DOMException) ||
          requestError.name !== "AbortError"
        ) {
          setErrorMessage("Assigned Clients could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingClients(false);
        }
      }
    }

    void loadClients();
    return () => controller.abort();
  }, [getAccessToken, open]);

  function updateReminder<Key extends keyof ReminderCreate>(
    key: Key,
    value: ReminderCreate[Key],
  ): void {
    setReminder((current) => ({ ...current, [key]: value }));
  }

  function handleClose(): void {
    if (saving) {
      return;
    }
    setReminder(emptyReminder);
    setErrorMessage(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const created = await createReminder(accessToken, reminder);
      setReminder(emptyReminder);
      onCreated(created);
      onClose();
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The reminder could not be scheduled.",
      );
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
      <Stack component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Schedule reminder</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            {loadingClients ? (
              <Stack alignItems="center" py={2}>
                <CircularProgress size={28} />
              </Stack>
            ) : (
              <TextField
                disabled={saving || clients.length === 0}
                label="Client"
                onChange={(event) =>
                  updateReminder("client_id", event.target.value)
                }
                required
                select
                value={reminder.client_id}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              autoFocus
              disabled={saving}
              inputProps={{ maxLength: 160 }}
              label="Reminder"
              onChange={(event) => updateReminder("title", event.target.value)}
              required
              value={reminder.title}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: today }}
              label="Due date"
              onChange={(event) =>
                updateReminder("due_date", event.target.value)
              }
              required
              slotProps={{ inputLabel: { shrink: true } }}
              type="date"
              value={reminder.due_date}
            />
            <TextField
              disabled={saving}
              label="Visible to"
              onChange={(event) =>
                updateReminder(
                  "audience",
                  event.target.value as ReminderCreate["audience"],
                )
              }
              select
              value={reminder.audience}
            >
              <MenuItem value="Client">Client</MenuItem>
              <MenuItem value="Adviser">Adviser</MenuItem>
              <MenuItem value="Both">Client and Adviser</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={
              saving ||
              loadingClients ||
              clients.length === 0 ||
              !reminder.client_id
            }
            type="submit"
            variant="contained"
          >
            {saving ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
