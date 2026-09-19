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

import {
  getClientInsuranceRequests,
  updateInsuranceRequestProgress,
  type InsuranceRequest,
  type InsuranceRequestProgressStage,
} from "../api/insuranceRequests";
import { useAuth } from "../auth/AuthContext";

type ClaimProgressPanelProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
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
  "Ready for Collection": "Closed",
};

const dateTime = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Show shared claim history and Adviser-only progress controls. */
export function ClaimProgressPanel({
  clientId,
  getAccessToken,
}: ClaimProgressPanelProps) {
  const auth = useAuth();
  const [requests, setRequests] = useState<InsuranceRequest[]>([]);
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
        setRequests(
          await getClientInsuranceRequests(
            accessToken,
            clientId,
            controller.signal,
          ),
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
  }, [clientId, getAccessToken]);

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
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
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
            {isAdviser && <TableCell align="right">Next action</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdviser ? 6 : 5}>
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

            return (
              <TableRow key={request.id}>
                <TableCell>{request.product_name}</TableCell>
                <TableCell>
                  {request.provider_claim_number ?? "Pending"}
                </TableCell>
                <TableCell>
                  <Chip label={request.status} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip color="primary" label={request.progress_stage} size="small" />
                </TableCell>
                <TableCell>
                  {dateTime.format(new Date(request.progress_updated_at))}
                </TableCell>
                {isAdviser && (
                  <TableCell align="right">
                    {canAdvance ? (
                      <Button
                        disabled={updatingId === request.id}
                        onClick={() => void handleAdvance(request)}
                        size="small"
                        variant="outlined"
                      >
                        {updatingId === request.id
                          ? "Updating..."
                          : followingStage}
                      </Button>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        {request.progress_stage === "Closed"
                          ? "Complete"
                          : "Awaiting approval"}
                      </Typography>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
