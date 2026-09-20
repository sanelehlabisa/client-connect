import { type FormEvent, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import {
  createInsuranceProduct,
  type InsuranceProductCreate,
  type Product,
} from "../api/clients";

type AddInsuranceDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  onCreated: (product: Product) => void;
  open: boolean;
};

const emptyProduct: InsuranceProductCreate = {
  name: "",
  provider: "",
  insurance_type: "Motor",
  policy_number: "",
  premium: 0,
  cover_amount: 0,
};

const insuranceTypes = ["Motor", "Life", "Home", "Funeral", "Health"];

/** Collect the core details for one Client Insurance policy. */
export function AddInsuranceDialog({
  clientId,
  getAccessToken,
  onClose,
  onCreated,
  open,
}: AddInsuranceDialogProps) {
  const [product, setProduct] = useState<InsuranceProductCreate>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProduct<Key extends keyof InsuranceProductCreate>(
    key: Key,
    value: InsuranceProductCreate[Key],
  ): void {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function handleClose(): void {
    if (saving) {
      return;
    }
    setProduct(emptyProduct);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }
      const createdProduct = await createInsuranceProduct(
        accessToken,
        clientId,
        product,
      );
      setProduct(emptyProduct);
      onCreated(createdProduct);
      onClose();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The Insurance policy could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
      <Stack component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Add Insurance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              disabled={saving}
              inputProps={{ maxLength: 120 }}
              label="Policy name"
              onChange={(event) => updateProduct("name", event.target.value)}
              required
              value={product.name}
            />
            <TextField
              disabled={saving}
              inputProps={{ maxLength: 120 }}
              label="Provider"
              onChange={(event) => updateProduct("provider", event.target.value)}
              required
              value={product.provider}
            />
            <TextField
              disabled={saving}
              label="Insurance type"
              onChange={(event) =>
                updateProduct("insurance_type", event.target.value)
              }
              select
              value={product.insurance_type}
            >
              {insuranceTypes.map((insuranceType) => (
                <MenuItem key={insuranceType} value={insuranceType}>
                  {insuranceType}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              disabled={saving}
              inputProps={{ maxLength: 80 }}
              label="Policy number"
              onChange={(event) =>
                updateProduct("policy_number", event.target.value)
              }
              required
              value={product.policy_number}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: 0, step: 0.01 }}
              label="Monthly premium (ZAR)"
              onChange={(event) =>
                updateProduct("premium", Number(event.target.value))
              }
              required
              type="number"
              value={product.premium}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: 0.01, step: 0.01 }}
              label="Cover amount (ZAR)"
              onChange={(event) =>
                updateProduct("cover_amount", Number(event.target.value))
              }
              required
              type="number"
              value={product.cover_amount}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={saving} type="submit" variant="contained">
            {saving ? "Adding..." : "Add Insurance"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
