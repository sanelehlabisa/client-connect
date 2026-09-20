import { type FormEvent, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

import { createGoal, type GoalCreate, type Product } from "../api/clients";

type AddGoalDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  onCreated: (goal: Product) => void;
  open: boolean;
};

const emptyGoal: GoalCreate = {
  name: "",
  starting_balance: 0,
  target_amount: 0,
  start_date: "",
  target_date: "",
};

/** Collect the values needed for a Client Investment Goal. */
export function AddGoalDialog({
  clientId,
  getAccessToken,
  onClose,
  onCreated,
  open,
}: AddGoalDialogProps) {
  const [goal, setGoal] = useState<GoalCreate>(emptyGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateGoal<Key extends keyof GoalCreate>(
    key: Key,
    value: GoalCreate[Key],
  ): void {
    setGoal((current) => ({ ...current, [key]: value }));
  }

  function handleClose(): void {
    if (saving) {
      return;
    }
    setGoal(emptyGoal);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const createdGoal = await createGoal(accessToken, clientId, goal);
      setGoal(emptyGoal);
      onCreated(createdGoal);
      onClose();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The Investment Goal could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
      <Stack component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Add an Investment Goal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              disabled={saving}
              inputProps={{ maxLength: 120 }}
              label="Investment Goal name"
              onChange={(event) => updateGoal("name", event.target.value)}
              required
              value={goal.name}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: 0, step: 0.01 }}
              label="Starting balance (ZAR)"
              onChange={(event) =>
                updateGoal("starting_balance", Number(event.target.value))
              }
              required
              type="number"
              value={goal.starting_balance}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: 0.01, step: 0.01 }}
              label="Target amount (ZAR)"
              onChange={(event) =>
                updateGoal("target_amount", Number(event.target.value))
              }
              required
              type="number"
              value={goal.target_amount}
            />
            <TextField
              disabled={saving}
              label="Start date"
              onChange={(event) => updateGoal("start_date", event.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
              type="date"
              value={goal.start_date}
            />
            <TextField
              disabled={saving}
              label="Target date"
              onChange={(event) => updateGoal("target_date", event.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
              type="date"
              value={goal.target_date}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={saving} type="submit" variant="contained">
            {saving ? "Adding..." : "Add Investment Goal"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
