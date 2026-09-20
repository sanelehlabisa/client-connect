import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import { archiveInsuranceProduct, type Product } from "../api/clients";

type ArchiveInsuranceDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onArchived: (product: Product) => void;
  onClose: () => void;
  product: Product | null;
};

/** Confirm an Insurance archive without deleting its historical records. */
export function ArchiveInsuranceDialog({
  clientId,
  getAccessToken,
  onArchived,
  onClose,
  product,
}: ArchiveInsuranceDialogProps) {
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return null;
  }

  const insuranceProduct = product;

  function closeDialog(): void {
    if (archiving) {
      return;
    }
    setError(null);
    onClose();
  }

  async function confirmArchive(): Promise<void> {
    setArchiving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const archivedProduct = await archiveInsuranceProduct(
        accessToken,
        clientId,
        insuranceProduct.id,
      );
      onArchived(archivedProduct);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The Insurance policy could not be archived.",
      );
    } finally {
      setArchiving(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="xs" onClose={closeDialog} open>
      <DialogTitle>Archive Insurance policy?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {insuranceProduct.name} will be marked as archived. Its claims and
          notification history will be kept.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={archiving} onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          color="warning"
          disabled={archiving}
          onClick={() => void confirmArchive()}
          variant="contained"
        >
          {archiving ? "Archiving..." : "Archive policy"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
