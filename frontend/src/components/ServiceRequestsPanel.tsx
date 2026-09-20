import { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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

import {
  createServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from "../api/serviceRequests";
import { useAuth } from "../auth/AuthContext";

type ServiceRequestsPanelProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
};

const requestTypes: ServiceRequestType[] = [
  "Policy Document",
  "Border Letter",
  "Investment IRP5",
  "Consultation",
];

const nextStatus: Partial<
  Record<ServiceRequestStatus, Exclude<ServiceRequestStatus, "Submitted">>
> = {
  Submitted: "In Progress",
  "In Progress": "Completed",
};

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Show shared service requests and the Client submission form. */
export function ServiceRequestsPanel({
  clientId,
  getAccessToken,
}: ServiceRequestsPanelProps) {
  const auth = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestType, setRequestType] =
    useState<ServiceRequestType>("Policy Document");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string>();
  const isAdviser = auth.roles.includes("adviser");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests(): Promise<void> {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }
        setRequests(
          await getServiceRequests(accessToken, clientId, controller.signal),
        );
      } catch (requestError: unknown) {
        if (
          !(requestError instanceof DOMException) ||
          requestError.name !== "AbortError"
        ) {
          setErrorMessage("Service requests could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRequests();
    return () => controller.abort();
  }, [clientId, getAccessToken]);

  function closeDialog(): void {
    if (submitting) {
      return;
    }
    setDialogOpen(false);
    setRequestType("Policy Document");
    setDetails("");
  }

  async function handleSubmit(): Promise<void> {
    const cleanDetails = details.trim();
    if (cleanDetails.length < 2) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const created = await createServiceRequest(
        accessToken,
        clientId,
        requestType,
        cleanDetails,
      );
      setRequests((current) => [created, ...current]);
      setDialogOpen(false);
      setRequestType("Policy Document");
      setDetails("");
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The service request could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(request: ServiceRequest): Promise<void> {
    const status = nextStatus[request.status];
    if (!status) {
      return;
    }

    setUpdatingId(request.id);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const updated = await updateServiceRequestStatus(
        accessToken,
        clientId,
        request.id,
        status,
      );
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The request status could not be updated.",
      );
    } finally {
      setUpdatingId(undefined);
    }
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">Loading requests...</Typography>
        </Stack>
      </Paper>
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
              Service requests
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Request documents or arrange a consultation with your Adviser.
            </Typography>
          </Box>
          {!isAdviser && (
            <Button onClick={() => setDialogOpen(true)} variant="contained">
              New request
            </Button>
          )}
        </Stack>
        {errorMessage && (
          <Alert severity="error" sx={{ mx: 3, my: 2 }}>
            {errorMessage}
          </Alert>
        )}
        <Table aria-label="Service requests">
          <TableHead>
            <TableRow>
              <TableCell>Request</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Status</TableCell>
              {isAdviser && <TableCell align="right">Next action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdviser ? 6 : 5}>
                  <Typography color="text.secondary" textAlign="center">
                    No service requests have been submitted.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.request_type}</TableCell>
                <TableCell>{request.details}</TableCell>
                <TableCell>
                  {dateTime.format(new Date(request.created_at))}
                </TableCell>
                <TableCell>
                  {dateTime.format(new Date(request.updated_at))}
                </TableCell>
                <TableCell>
                  <Chip
                    color={request.status === "Completed" ? "success" : "default"}
                    label={request.status}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                {isAdviser && (
                  <TableCell align="right">
                    {nextStatus[request.status] ? (
                      <Button
                        disabled={updatingId !== undefined}
                        onClick={() => void handleStatusUpdate(request)}
                        size="small"
                        variant="outlined"
                      >
                        {updatingId === request.id
                          ? "Updating..."
                          : nextStatus[request.status]}
                      </Button>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Complete
                      </Typography>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog fullWidth maxWidth="sm" onClose={closeDialog} open={dialogOpen}>
        <DialogTitle>New service request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="service-request-type-label">
                Request type
              </InputLabel>
              <Select
                label="Request type"
                labelId="service-request-type-label"
                onChange={(event) =>
                  setRequestType(event.target.value as ServiceRequestType)
                }
                value={requestType}
              >
                {requestTypes.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              autoFocus
              fullWidth
              inputProps={{ maxLength: 2000 }}
              label="What do you need?"
              minRows={3}
              multiline
              onChange={(event) => setDetails(event.target.value)}
              required
              value={details}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={submitting} onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            disabled={submitting || details.trim().length < 2}
            onClick={() => void handleSubmit()}
            variant="contained"
          >
            {submitting ? "Sending..." : "Send request"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
