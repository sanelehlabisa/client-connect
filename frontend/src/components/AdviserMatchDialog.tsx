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
  Rating,
  Stack,
  Typography,
} from "@mui/material";

import {
  matchFinancialAdvisers,
  selectFinancialAdviser,
  type ProviderRecommendation,
} from "../api/providers";

type AdviserMatchDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  onSelected: () => void;
  open: boolean;
};

/** Recommend two seeded Advisers and connect the Client to a safe chat. */
export function AdviserMatchDialog({
  clientId,
  getAccessToken,
  onClose,
  onSelected,
  open,
}: AdviserMatchDialogProps) {
  const [advisers, setAdvisers] = useState<ProviderRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    async function loadAdvisers(): Promise<void> {
      setLoading(true);
      setErrorMessage(undefined);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }
        setAdvisers(
          await matchFinancialAdvisers(accessToken, controller.signal),
        );
      } catch (requestError: unknown) {
        if (
          !(requestError instanceof DOMException) ||
          requestError.name !== "AbortError"
        ) {
          setErrorMessage(
            requestError instanceof Error
              ? requestError.message
              : "Adviser recommendations could not be loaded.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAdvisers();
    return () => controller.abort();
  }, [getAccessToken, open]);

  async function handleSelect(adviser: ProviderRecommendation): Promise<void> {
    setSelectingId(adviser.id);
    setErrorMessage(undefined);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      await selectFinancialAdviser(accessToken, clientId, adviser.id);
      onSelected();
    } catch (requestError: unknown) {
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The Adviser could not be selected.",
      );
    } finally {
      setSelectingId(undefined);
    }
  }

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <DialogTitle>Recommended Financial Advisers</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          ClientConnect matched these Advisers for financial planning.
        </Typography>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            }}
          >
            {advisers.map((adviser) => (
              <Paper key={adviser.id} sx={{ p: 2.5 }} variant="outlined">
                <Stack height="100%" spacing={1.5}>
                  <Box>
                    <Typography fontWeight={700} variant="h6">
                      {adviser.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {adviser.location}
                    </Typography>
                  </Box>
                  <Stack alignItems="center" direction="row" spacing={1}>
                    <Rating
                      precision={0.1}
                      readOnly
                      size="small"
                      value={Number(adviser.rating)}
                    />
                    <Typography variant="body2">{adviser.rating}/5</Typography>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {adviser.services.map((service) => (
                      <Chip key={service} label={service} size="small" />
                    ))}
                  </Stack>
                  <Chip
                    color="success"
                    label={adviser.is_available ? "Available" : "Unavailable"}
                    size="small"
                    sx={{ alignSelf: "flex-start" }}
                    variant="outlined"
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    disabled={
                      adviser.adviser_user_id === null ||
                      selectingId !== undefined
                    }
                    onClick={() => void handleSelect(adviser)}
                    variant={adviser.adviser_user_id ? "contained" : "outlined"}
                  >
                    {selectingId === adviser.id
                      ? "Connecting..."
                      : adviser.adviser_user_id
                        ? "Choose Adviser"
                        : "Chat unavailable in demo"}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={selectingId !== undefined} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
