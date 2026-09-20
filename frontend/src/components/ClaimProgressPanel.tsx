import { Fragment, useEffect, useState } from "react";
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
  Rating,
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
  closeInsuranceRequest,
  getClientInsuranceRequests,
  updateInsuranceRequestProgress,
  updateInsuranceRequestStatus,
  type AccidentReport,
  type InsuranceRequest,
  type InsuranceRequestProgressStage,
  type InsuranceRequestStatus,
} from "../api/insuranceRequests";
import { useAuth } from "../auth/AuthContext";

type ClaimProgressPanelProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  productId: string;
};

const nextStage: Partial<
  Record<InsuranceRequestProgressStage, InsuranceRequestProgressStage>
> = {
  "Provider Acknowledged": "Assessment Scheduled",
  "Assessment Scheduled": "Assessment Complete",
  "Assessment Complete": "Repairs Authorized",
  "Repairs Authorized": "Repair In Progress",
  "Repair In Progress": "Car Hire Arranged",
  "Car Hire Arranged": "Ready for Collection",
};

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Parse only the structured accident reports created by the Client form. */
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

/** Show the claim information an Adviser needs before making a decision. */
function ClaimDetails({ request }: { request: InsuranceRequest }) {
  const report = parseAccidentReport(request.details);

  if (!report) {
    return (
      <Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
        {request.details}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 2fr" },
      }}
    >
      <Box>
        <Typography color="text.secondary" variant="caption">
          Incident date and time
        </Typography>
        <Typography variant="body2">{report.incident_at}</Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          Location
        </Typography>
        <Typography variant="body2">{report.location}</Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          Description
        </Typography>
        <Typography variant="body2">{report.description}</Typography>
      </Box>
    </Box>
  );
}

/** Show Product-specific claim history and role-appropriate actions. */
export function ClaimProgressPanel({
  clientId,
  getAccessToken,
  productId,
}: ClaimProgressPanelProps) {
  const auth = useAuth();
  const [requests, setRequests] = useState<InsuranceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closingRequest, setClosingRequest] =
    useState<InsuranceRequest | null>(null);
  const [review, setReview] = useState("");
  const [providerRating, setProviderRating] = useState(0);
  const isAdviser = auth.roles.includes("adviser");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests(): Promise<void> {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }
        const clientRequests = await getClientInsuranceRequests(
          accessToken,
          clientId,
          controller.signal,
        );
        setRequests(
          clientRequests.filter((request) => request.product_id === productId),
        );
      } catch (requestError: unknown) {
        if (
          !(requestError instanceof DOMException) ||
          requestError.name !== "AbortError"
        ) {
          setErrorMessage("Claim progress could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRequests();
    return () => controller.abort();
  }, [clientId, getAccessToken, productId]);

  /** Replace one changed claim without reloading the entire Client view. */
  function replaceRequest(updated: InsuranceRequest): void {
    setRequests((current) =>
      current.map((request) =>
        request.id === updated.id ? updated : request,
      ),
    );
  }

  async function handleStatusChange(
    request: InsuranceRequest,
    status: Exclude<InsuranceRequestStatus, "Submitted">,
  ): Promise<void> {
    setUpdatingId(request.id);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      replaceRequest(
        await updateInsuranceRequestStatus(accessToken, request.id, status),
      );
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The claim status could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAdvance(request: InsuranceRequest): Promise<void> {
    const stage = nextStage[request.progress_stage];
    if (!stage) {
      return;
    }

    setUpdatingId(request.id);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const updated = await updateInsuranceRequestProgress(
        accessToken,
        request.id,
        stage,
      );
      replaceRequest(updated);
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "Claim progress could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCloseClaim(): Promise<void> {
    const cleanReview = review.trim();
    if (!closingRequest || cleanReview.length < 2 || providerRating === 0) {
      return;
    }

    setUpdatingId(closingRequest.id);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const updated = await closeInsuranceRequest(
        accessToken,
        closingRequest.id,
        cleanReview,
        providerRating,
      );
      replaceRequest(updated);
      setClosingRequest(null);
      setReview("");
      setProviderRating(0);
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The claim could not be closed.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">Loading claims...</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
      <Box sx={{ p: 3, pb: 1 }}>
        <Typography component="h2" fontWeight={700} variant="h6">
          Claim progress
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Follow each claim from provider acknowledgement to closure.
        </Typography>
      </Box>
      {errorMessage && (
        <Alert severity="error" sx={{ mx: 3, my: 2 }}>
          {errorMessage}
        </Alert>
      )}
      <Table aria-label="Claim progress">
        <TableHead>
          <TableRow>
            <TableCell>Policy</TableCell>
            <TableCell>Claim number</TableCell>
            <TableCell>Review</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell>Client feedback</TableCell>
            <TableCell align="right">Next action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography color="text.secondary" textAlign="center">
                  No claims have been submitted yet.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {requests.map((request) => {
            const followingStage = nextStage[request.progress_stage];
            const canAdvance =
              isAdviser && request.status === "Approved" && followingStage;
            const canClientClose =
              !isAdviser &&
              request.status === "Approved" &&
              request.progress_stage === "Ready for Collection";
            const canStartReview =
              isAdviser && request.status === "Submitted";
            const canDecide =
              isAdviser && request.status === "Under Review";
            const isUpdating = updatingId === request.id;

            return (
              <Fragment key={request.id}>
                <TableRow>
                  <TableCell>{request.product_name}</TableCell>
                  <TableCell>
                    {request.provider_claim_number ?? "Pending"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      color="primary"
                      label={request.progress_stage}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {dateTime.format(new Date(request.progress_updated_at))}
                  </TableCell>
                  <TableCell>
                  {request.provider_rating !== null || request.client_review ? (
                    <Stack spacing={0.5}>
                      {request.provider_rating !== null ? (
                        <Rating
                          readOnly
                          size="small"
                          value={request.provider_rating}
                        />
                      ) : (
                        <Typography color="text.secondary" variant="caption">
                          Not rated
                        </Typography>
                      )}
                      {request.client_review && (
                        <Typography variant="body2">
                          {request.client_review}
                        </Typography>
                      )}
                    </Stack>
                  ) : (
                    "—"
                  )}
                  </TableCell>
                  <TableCell align="right">
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    justifyContent="flex-end"
                    spacing={0.75}
                    useFlexGap
                  >
                    {canStartReview && (
                      <Button
                        disabled={isUpdating}
                        onClick={() =>
                          void handleStatusChange(request, "Under Review")
                        }
                        size="small"
                        variant="contained"
                      >
                        {isUpdating ? "Updating..." : "Start review"}
                      </Button>
                    )}
                    {canDecide && (
                      <>
                        <Button
                          color="error"
                          disabled={isUpdating}
                          onClick={() =>
                            void handleStatusChange(request, "Rejected")
                          }
                          size="small"
                        >
                          Reject
                        </Button>
                        <Button
                          disabled={isUpdating}
                          onClick={() =>
                            void handleStatusChange(
                              request,
                              "Changes Required",
                            )
                          }
                          size="small"
                          variant="outlined"
                        >
                          Request changes
                        </Button>
                        <Button
                          disabled={isUpdating}
                          onClick={() =>
                            void handleStatusChange(request, "Approved")
                          }
                          size="small"
                          variant="contained"
                        >
                          {isUpdating ? "Updating..." : "Approve"}
                        </Button>
                      </>
                    )}
                    {canAdvance && (
                      <Button
                        disabled={isUpdating}
                        onClick={() => void handleAdvance(request)}
                        size="small"
                        variant="outlined"
                      >
                        {isUpdating ? "Updating..." : followingStage}
                      </Button>
                    )}
                    {canClientClose && (
                      <Button
                        onClick={() => setClosingRequest(request)}
                        size="small"
                        variant="contained"
                      >
                        Review and close
                      </Button>
                    )}
                    {!canStartReview &&
                      !canDecide &&
                      !canAdvance &&
                      !canClientClose && (
                        <Typography color="text.secondary" variant="body2">
                          {request.progress_stage === "Closed"
                            ? "Complete"
                            : request.progress_stage ===
                                "Ready for Collection"
                              ? "Awaiting Client"
                              : isAdviser
                                ? "Decision recorded"
                                : "Adviser updating"}
                        </Typography>
                      )}
                  </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ bgcolor: "action.hover" }}>
                    <Typography
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 1 }}
                      variant="caption"
                    >
                      Submitted claim information
                    </Typography>
                    <ClaimDetails request={request} />
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      </TableContainer>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => {
          if (updatingId === null) {
            setClosingRequest(null);
            setReview("");
            setProviderRating(0);
          }
        }}
        open={closingRequest !== null}
      >
        <DialogTitle>Review and close claim</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
            Confirm that the claim is complete and leave a short review for
            your Adviser.
          </Typography>
          <Typography component="label" display="block" variant="body2">
            Provider rating
          </Typography>
          <Rating
            aria-label="Provider rating"
            name="provider-rating"
            onChange={(_event, value) => setProviderRating(value ?? 0)}
            sx={{ mb: 2 }}
            value={providerRating}
          />
          <TextField
            autoFocus
            fullWidth
            inputProps={{ maxLength: 500 }}
            label="Your review"
            minRows={3}
            multiline
            onChange={(event) => setReview(event.target.value)}
            required
            value={review}
          />
        </DialogContent>
        <DialogActions>
          <Button
            disabled={updatingId !== null}
            onClick={() => {
              setClosingRequest(null);
              setReview("");
              setProviderRating(0);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={
              review.trim().length < 2 ||
              providerRating === 0 ||
              updatingId !== null
            }
            onClick={() => void handleCloseClaim()}
            variant="contained"
          >
            {updatingId !== null ? "Closing..." : "Close claim"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
