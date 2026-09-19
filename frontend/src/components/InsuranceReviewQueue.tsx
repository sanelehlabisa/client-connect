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

import {
  getAdviserReviewQueue,
  updateInsuranceRequestStatus,
  type AccidentReport,
  type InsuranceRequest,
  type InsuranceRequestStatus,
} from "../api/insuranceRequests";

type InsuranceReviewQueueProps = {
  getAccessToken: () => Promise<string | undefined>;
};

type ReviewDialogProps = InsuranceReviewQueueProps & {
  onClose: () => void;
  onUpdated: (request: InsuranceRequest) => void;
  request: InsuranceRequest | null;
};

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Parse only the structured accident reports produced by the Client form. */
function parseAccidentReport(details: string): AccidentReport | null {
  try {
    const report = JSON.parse(details) as Partial<AccidentReport>;
    return typeof report.description === "string" &&
      typeof report.location === "string"
      ? (report as AccidentReport)
      : null;
  } catch {
    return null;
  }
}

/** Show a labelled claim value without adding another form abstraction. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>
        {value || "Not provided"}
      </Typography>
    </Box>
  );
}

/** Show claim details and only the actions valid for the current status. */
function ReviewDialog({
  getAccessToken,
  onClose,
  onUpdated,
  request,
}: ReviewDialogProps) {
  const [currentRequest, setCurrentRequest] =
    useState<InsuranceRequest | null>(request);
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => setCurrentRequest(request), [request]);

  if (!currentRequest) {
    return null;
  }

  const report = parseAccidentReport(currentRequest.details);
  const isFinal = ["Approved", "Changes Required", "Rejected"].includes(
    currentRequest.status,
  );

  async function changeStatus(
    status: Exclude<InsuranceRequestStatus, "Submitted">,
  ) {
    if (!currentRequest) {
      return;
    }

    setUpdating(true);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const updatedRequest = await updateInsuranceRequestStatus(
        accessToken,
        currentRequest.id,
        status,
      );
      setCurrentRequest(updatedRequest);
      onUpdated(updatedRequest);
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The claim status could not be updated.",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="md" onClose={updating ? undefined : onClose} open>
      <DialogTitle>
        <Stack alignItems="flex-start" spacing={1}>
          <Chip color="primary" label={currentRequest.status} size="small" />
          <Typography component="span" fontWeight={700} variant="h5">
            {currentRequest.request_type}
          </Typography>
          <Typography color="text.secondary" component="span">
            {currentRequest.client_name} · {currentRequest.product_name}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {report ? (
            <Box
              sx={{
                display: "grid",
                gap: 2.5,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <Detail
                label="Incident date and time"
                value={report.incident_at}
              />
              <Detail label="Location" value={report.location} />
              <Detail label="Description" value={report.description} />
              <Detail
                label="Police report"
                value={
                  report.police_notified
                    ? `Reported — ${report.police_case_number || "case number pending"}`
                    : "Not yet reported"
                }
              />
              <Detail label="Driver" value={report.driver_name} />
              <Detail label="Vehicle use" value={report.vehicle_use} />
              <Detail label="Witnesses" value={report.witness_details} />
              <Detail
                label="Other vehicles or property"
                value={report.other_vehicle_or_property}
              />
              <Detail
                label="Third-party details"
                value={report.third_party_details}
              />
              <Detail
                label="Selected files"
                value={report.file_names?.join(", ") ?? "Not provided"}
              />
            </Box>
          ) : (
            <Detail
              label="Submitted information"
              value={currentRequest.details}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap" }}>
        <Button disabled={updating} onClick={onClose}>
          Close
        </Button>
        {currentRequest.status === "Submitted" && (
          <Button
            disabled={updating}
            onClick={() => void changeStatus("Under Review")}
            variant="contained"
          >
            {updating ? "Updating..." : "Start review"}
          </Button>
        )}
        {currentRequest.status === "Under Review" && (
          <>
            <Button
              color="error"
              disabled={updating}
              onClick={() => void changeStatus("Rejected")}
            >
              Reject
            </Button>
            <Button
              disabled={updating}
              onClick={() => void changeStatus("Changes Required")}
              variant="outlined"
            >
              Request changes
            </Button>
            <Button
              disabled={updating}
              onClick={() => void changeStatus("Approved")}
              variant="contained"
            >
              Approve
            </Button>
          </>
        )}
        {isFinal && (
          <Typography color="text.secondary" sx={{ px: 1 }} variant="body2">
            This decision is final for the demo.
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
}

/** List active Insurance claims assigned to the authenticated Adviser. */
export function InsuranceReviewQueue({
  getAccessToken,
}: InsuranceReviewQueueProps) {
  const [requests, setRequests] = useState<InsuranceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<InsuranceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQueue(): Promise<void> {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }

        const reviewQueue = await getAdviserReviewQueue(
          accessToken,
          controller.signal,
        );
        setRequests(reviewQueue);
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

    void loadQueue();
    return () => controller.abort();
  }, [getAccessToken]);

  function handleUpdated(updatedRequest: InsuranceRequest) {
    const remainsActive = ["Submitted", "Under Review"].includes(
      updatedRequest.status,
    );
    setRequests((current) =>
      remainsActive
        ? current.map((request) =>
            request.id === updatedRequest.id ? updatedRequest : request,
          )
        : current.filter((request) => request.id !== updatedRequest.id),
    );
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography color="text.secondary">Loading claim reviews...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error">The claim review queue could not be loaded.</Alert>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Box sx={{ p: 3, pb: 1 }}>
          <Typography component="h2" fontWeight={700} variant="h6">
            Claim reviews
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Review accident reports submitted by your assigned Clients.
          </Typography>
        </Box>
        <Table aria-label="Claim review queue">
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" textAlign="center">
                    No claims are waiting for review.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.client_name}</TableCell>
                <TableCell>{request.product_name}</TableCell>
                <TableCell>
                  {dateTime.format(new Date(request.created_at))}
                </TableCell>
                <TableCell>
                  <Chip label={request.status} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Button onClick={() => setSelectedRequest(request)} size="small">
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ReviewDialog
        getAccessToken={getAccessToken}
        onClose={() => setSelectedRequest(null)}
        onUpdated={handleUpdated}
        request={selectedRequest}
      />
    </>
  );
}
