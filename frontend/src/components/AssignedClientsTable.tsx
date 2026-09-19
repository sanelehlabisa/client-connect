import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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

import { getAssignedClients, type ClientSummary } from "../api/clients";

type AssignedClientsTableProps = {
  getAccessToken: () => Promise<string | undefined>;
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

/** Show the clients assigned to the authenticated Adviser. */
export function AssignedClientsTable({
  getAccessToken,
}: AssignedClientsTableProps) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshNumber, setRefreshNumber] = useState(0);

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
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Typography fontWeight={700}>No assigned clients yet</Typography>
        <Typography color="text.secondary">
          Clients assigned to you will appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Box sx={{ p: 3, pb: 1 }}>
        <Typography component="h2" fontWeight={700} variant="h6">
          Assigned clients
        </Typography>
        <Typography color="text.secondary" variant="body2">
          A quick view of each Client's financial position and open work.
        </Typography>
      </Box>
      <Table aria-label="Assigned clients">
        <TableHead>
          <TableRow>
            <TableCell>Client</TableCell>
            <TableCell align="right">Monthly position</TableCell>
            <TableCell align="right">Net worth</TableCell>
            <TableCell align="right">Products</TableCell>
            <TableCell align="right">Pending actions</TableCell>
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
