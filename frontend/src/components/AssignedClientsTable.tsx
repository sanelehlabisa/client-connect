import { type FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

import {
  createClientProfile,
  getAssignedClients,
  type ClientSummary,
} from "../api/clients";

type AssignedClientsTableProps = {
  getAccessToken: () => Promise<string | undefined>;
};

type AddClientDialogProps = AssignedClientsTableProps & {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const randCurrency = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

/** Format database decimal strings consistently as South African Rand. */
function formatCurrency(value: number | string): string {
  return randCurrency.format(Number(value));
}

/** Collect the minimum information needed to add a brokerage Client. */
function AddClientDialog({
  getAccessToken,
  open,
  onClose,
  onCreated,
}: AddClientDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Your session has expired. Please log in again.");
      }

      await createClientProfile(accessToken, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      setName("");
      setEmail("");
      onCreated();
      onClose();
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The Client profile could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setErrorMessage(null);
      setName("");
      setEmail("");
      onClose();
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
      <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Add Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Create the profile first. The Client must register in Keycloak
              using the same email address.
            </Typography>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              autoFocus
              disabled={saving}
              label="Full name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
            <TextField
              disabled={saving}
              label="Email address"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={saving} type="submit" variant="contained">
            {saving ? "Adding..." : "Add Client"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** Show the clients assigned to the authenticated Adviser. */
export function AssignedClientsTable({
  getAccessToken,
}: AssignedClientsTableProps) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshNumber, setRefreshNumber] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const addClientDialog = (
    <AddClientDialog
      getAccessToken={getAccessToken}
      onClose={() => setAddDialogOpen(false)}
      onCreated={() => setRefreshNumber((value) => value + 1)}
      open={addDialogOpen}
    />
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadClients(): Promise<void> {
      setLoading(true);
      setError(false);

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

    void loadClients();
    return () => controller.abort();
  }, [getAccessToken, refreshNumber]);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography color="text.secondary">
            Loading assigned clients...
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert
        action={
          <Button
            color="inherit"
            onClick={() => setRefreshNumber((value) => value + 1)}
            size="small"
          >
            Retry
          </Button>
        }
        severity="error"
      >
        Assigned clients could not be loaded.
      </Alert>
    );
  }

  if (clients.length === 0) {
    return (
      <>
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Stack alignItems="flex-start" spacing={2}>
            <Box>
              <Typography fontWeight={700}>No assigned clients yet</Typography>
              <Typography color="text.secondary">
                Add a Client profile to get started.
              </Typography>
            </Box>
            <Button
              onClick={() => setAddDialogOpen(true)}
              variant="contained"
            >
              Add Client
            </Button>
          </Stack>
        </Paper>
        {addClientDialog}
      </>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Stack
          alignItems={{ xs: "flex-start", sm: "center" }}
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ p: 3, pb: 1 }}
        >
          <Box>
            <Typography component="h2" fontWeight={700} variant="h6">
              Assigned clients
            </Typography>
            <Typography color="text.secondary" variant="body2">
              A quick view of each Client's financial position and open work.
            </Typography>
          </Box>
          <Button
            onClick={() => setAddDialogOpen(true)}
            variant="contained"
          >
            Add Client
          </Button>
        </Stack>
        <Table aria-label="Assigned clients">
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell align="right">Monthly position</TableCell>
              <TableCell align="right">Net worth</TableCell>
              <TableCell align="right">Products</TableCell>
              <TableCell align="right">Pending actions</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => {
              const monthlyPosition =
                Number(client.financial_position.monthly_income) -
                Number(client.financial_position.monthly_expenses);

              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <Typography fontWeight={600}>{client.name}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(monthlyPosition)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(client.financial_position.net_worth)}
                  </TableCell>
                  <TableCell align="right">{client.product_count}</TableCell>
                  <TableCell align="right">
                    <Chip
                      color={client.pending_actions > 0 ? "warning" : "success"}
                      label={client.pending_actions}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={Link}
                      size="small"
                      to={`/client/${client.id}`}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {addClientDialog}
    </>
  );
}
