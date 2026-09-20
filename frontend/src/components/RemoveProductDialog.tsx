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

import { removeProduct, type Product } from "../api/clients";

type RemoveProductDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  onRemoved: (productId: string) => void;
  product: Product | null;
};

/** Confirm and remove one Goal or Investment from a Client dashboard. */
export function RemoveProductDialog({
  clientId,
  getAccessToken,
  onClose,
  onRemoved,
  product,
}: RemoveProductDialogProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return null;
  }

  const productLabel = product.product_type === "GOAL" ? "Goal" : "Investment";

  function closeDialog(): void {
    if (removing) {
      return;
    }
    setError(null);
    onClose();
  }

  async function confirmRemoval(): Promise<void> {
    setRemoving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      await removeProduct(accessToken, clientId, product.id);
      onRemoved(product.id);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `The ${productLabel} could not be removed.`,
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="xs" onClose={closeDialog} open>
      <DialogTitle>Remove {productLabel}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {product.name} will be permanently removed from this Client's
          dashboard. This action cannot be undone.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={removing} onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          color="error"
          disabled={removing}
          onClick={() => void confirmRemoval()}
          variant="contained"
        >
          {removing ? "Removing..." : `Remove ${productLabel}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
