import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import {
  getClientInsuranceRequests,
  getNextClaimProviders,
  selectNextClaimProvider,
  updateInsuranceRequestStatus,
  type AccidentReport,
  type ClaimProviderShortlist,
  type InsuranceRequest,
  type InsuranceRequestStatus,
} from "../api/insuranceRequests";
import { useAuth } from "../auth/AuthContext";

type ClaimProgressPanelProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  productId: string;
};

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Format a stored date-time or explain why an old claim has no value. */
function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not provided";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed);
}

/** Parse only structured accident reports created by the Client form. */
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

/** Show the small set of claim information shared by both roles. */
function ClaimDetails({ request }: { request: InsuranceRequest }) {
  const report = parseAccidentReport(request.details);

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
      }}
    >
      <Box>
        <Typography color="text.secondary" variant="caption">
          Incident
        </Typography>
        <Typography variant="body2">
          {report?.incident_at ?? request.details}
        </Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          Location
        </Typography>
        <Typography variant="body2">{report?.location ?? "Not recorded"}</Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          Preferred assessment
        </Typography>
        <Typography variant="body2">
          {formatDateTime(request.preferred_assessment_at)}
        </Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          Preferred repair
        </Typography>
        <Typography variant="body2">
          {formatDateTime(request.preferred_repair_at)}
        </Typography>
      </Box>
      {report?.description && (
        <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
          <Typography color="text.secondary" variant="caption">
            Description
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }} variant="body2">
            {report.description}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/** Display selected mock providers to both the Client and Adviser. */
function SelectedProviders({ request }: { request: InsuranceRequest }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
      }}
    >
      <Box>
        <Typography color="text.secondary" variant="caption">
          Assessor
        </Typography>
        <Typography fontWeight={600} variant="body2">
          {request.selected_assessor_name ?? "Not selected yet"}
        </Typography>
        {request.assessor_selected_at && (
          <Typography color="success.main" variant="caption">
            Accepted immediately for this demo
          </Typography>
        )}
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          Repairer
        </Typography>
        <Typography fontWeight={600} variant="body2">
          {request.selected_repairer_name ?? "Not selected yet"}
        </Typography>
        {request.repairer_selected_at && (
          <Typography color="success.main" variant="caption">
            Accepted immediately for this demo
          </Typography>
        )}
      </Box>
    </Box>
  );
}

type RecommendationsProps = {
  disabled: boolean;
  onSelect: (providerId: string) => void;
  shortlist: ClaimProviderShortlist | undefined;
};

/** Show only the three choices for the next provider step. */
function ProviderRecommendations({
  disabled,
  onSelect,
  shortlist,
}: RecommendationsProps) {
  if (!shortlist) {
    return (
      <Stack alignItems="center" direction="row" spacing={1}>
        <CircularProgress size={18} />
        <Typography color="text.secondary" variant="body2">
          Loading provider recommendations...
        </Typography>
      </Stack>
    );
  }

  if (shortlist.complete) {
    return (
      <Alert severity="success">
        The Assessor and Repairer are selected. No external provider login is
        needed for this demo.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography fontWeight={700}>
          Recommended {shortlist.provider_type}s
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Select one of the top three. It will be accepted immediately.
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        }}
      >
        {shortlist.providers.map((provider) => (
          <Paper key={provider.id} sx={{ p: 2 }} variant="outlined">
            <Stack alignItems="flex-start" height="100%" spacing={1}>
              <Typography fontWeight={700} variant="body2">
                {provider.name}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                Rating {provider.rating} | {provider.location}
              </Typography>
              <Button
                disabled={disabled}
                onClick={() => onSelect(provider.id)}
                size="small"
                sx={{ mt: "auto" }}
                variant="outlined"
              >
                Select
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

/** Show the intentionally small shared Client and Adviser claim workflow. */
export function ClaimProgressPanel({
  clientId,
  getAccessToken,
  productId,
}: ClaimProgressPanelProps) {
  const auth = useAuth();
  const [requests, setRequests] = useState<InsuranceRequest[]>([]);
  const [shortlists, setShortlists] = useState<
    Record<string, ClaimProviderShortlist>
  >({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        const productRequests = clientRequests.filter(
          (request) => request.product_id === productId,
        );
        if (controller.signal.aborted) {
          return;
        }
        setRequests(productRequests);

        if (isAdviser) {
          const approvedRequests = productRequests.filter(
            (request) => request.status === "Approved",
          );
          const loadedShortlists = await Promise.all(
            approvedRequests.map(async (request) => [
              request.id,
              await getNextClaimProviders(accessToken, request.id),
            ] as const),
          );
          if (!controller.signal.aborted) {
            setShortlists(Object.fromEntries(loadedShortlists));
          }
        }
      } catch (requestError: unknown) {
        if (
          !(requestError instanceof DOMException) ||
          requestError.name !== "AbortError"
        ) {
          setErrorMessage(
            requestError instanceof Error
              ? requestError.message
              : "Claim progress could not be loaded.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRequests();
    return () => controller.abort();
  }, [clientId, getAccessToken, isAdviser, productId]);

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
      const updated = await updateInsuranceRequestStatus(
        accessToken,
        request.id,
        status,
      );
      replaceRequest(updated);
      if (updated.status === "Approved") {
        const shortlist = await getNextClaimProviders(accessToken, updated.id);
        setShortlists((current) => ({
          ...current,
          [updated.id]: shortlist,
        }));
      }
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

  async function handleProviderSelection(
    request: InsuranceRequest,
    providerId: string,
  ): Promise<void> {
    setUpdatingId(request.id);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const updated = await selectNextClaimProvider(
        accessToken,
        request.id,
        providerId,
      );
      replaceRequest(updated);
      const nextShortlist = await getNextClaimProviders(
        accessToken,
        request.id,
      );
      setShortlists((current) => ({
        ...current,
        [request.id]: nextShortlist,
      }));
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The provider could not be selected.",
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
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h2" fontWeight={700} variant="h6">
            Claims
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Client preferences and Adviser provider selections in one place.
          </Typography>
        </Box>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {requests.length === 0 && (
          <Typography color="text.secondary">
            No claims have been submitted yet.
          </Typography>
        )}

        {requests.map((request) => {
          const isUpdating = updatingId === request.id;
          const canStartReview =
            isAdviser && request.status === "Submitted";
          const canDecide = isAdviser && request.status === "Under Review";

          return (
            <Paper key={request.id} sx={{ p: 2.5 }} variant="outlined">
              <Stack spacing={2.5}>
                <Stack
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Typography fontWeight={700}>
                      {request.product_name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Claim {request.provider_claim_number ?? "pending"}
                    </Typography>
                  </Box>
                  <Chip label={request.status} size="small" variant="outlined" />
                </Stack>

                <ClaimDetails request={request} />

                {canStartReview && (
                  <Button
                    disabled={isUpdating}
                    onClick={() =>
                      void handleStatusChange(request, "Under Review")
                    }
                    size="small"
                    sx={{ alignSelf: "flex-start" }}
                    variant="contained"
                  >
                    {isUpdating ? "Updating..." : "Start review"}
                  </Button>
                )}

                {canDecide && (
                  <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
                    <Button
                      color="error"
                      disabled={isUpdating}
                      onClick={() => void handleStatusChange(request, "Rejected")}
                      size="small"
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={isUpdating}
                      onClick={() =>
                        void handleStatusChange(request, "Changes Required")
                      }
                      size="small"
                      variant="outlined"
                    >
                      Request changes
                    </Button>
                    <Button
                      disabled={isUpdating}
                      onClick={() => void handleStatusChange(request, "Approved")}
                      size="small"
                      variant="contained"
                    >
                      {isUpdating ? "Updating..." : "Approve"}
                    </Button>
                  </Stack>
                )}

                {request.status === "Approved" && (
                  <Stack spacing={2}>
                    <SelectedProviders request={request} />
                    {isAdviser ? (
                      <ProviderRecommendations
                        disabled={isUpdating}
                        onSelect={(providerId) =>
                          void handleProviderSelection(request, providerId)
                        }
                        shortlist={shortlists[request.id]}
                      />
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Your Adviser selects the mock Assessor and Repairer.
                      </Typography>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}
