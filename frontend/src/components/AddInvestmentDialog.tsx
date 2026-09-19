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
  createInvestmentProduct,
  type InvestmentProductCreate,
  type Product,
} from "../api/clients";

type AddInvestmentDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  onCreated: (product: Product) => void;
  open: boolean;
};

const emptyProduct: InvestmentProductCreate = {
  name: "",
  provider: "",
  investment_type: "Unit Trust",
  account_number: "",
  current_value: 0,
  monthly_contribution: 0,
};

const investmentTypes = [
  "Unit Trust",
  "Retirement Annuity",
  "Tax-Free Investment",
  "Endowment",
];

/** Collect the core details for one Client Investment. */
export function AddInvestmentDialog({
  clientId,
  getAccessToken,
  onClose,
  onCreated,
  open,
}: AddInvestmentDialogProps) {
  const [product, setProduct] = useState<InvestmentProductCreate>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProduct<Key extends keyof InvestmentProductCreate>(
    key: Key,
    value: InvestmentProductCreate[Key],
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
      const createdProduct = await createInvestmentProduct(
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
          : "The Investment could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
      <Stack component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Add an Investment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              disabled={saving}
              inputProps={{ maxLength: 120 }}
              label="Investment name"
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
              label="Investment type"
              onChange={(event) =>
                updateProduct("investment_type", event.target.value)
              }
              select
              value={product.investment_type}
            >
              {investmentTypes.map((investmentType) => (
                <MenuItem key={investmentType} value={investmentType}>
                  {investmentType}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              disabled={saving}
              inputProps={{ maxLength: 80 }}
              label="Account number"
              onChange={(event) =>
                updateProduct("account_number", event.target.value)
              }
              required
              value={product.account_number}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: 0, step: 0.01 }}
              label="Current value (ZAR)"
              onChange={(event) =>
                updateProduct("current_value", Number(event.target.value))
              }
              required
              type="number"
              value={product.current_value}
            />
            <TextField
              disabled={saving}
              inputProps={{ min: 0, step: 0.01 }}
              label="Monthly contribution (ZAR)"
              onChange={(event) =>
                updateProduct(
                  "monthly_contribution",
                  Number(event.target.value),
                )
              }
              required
              type="number"
              value={product.monthly_contribution}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={saving} type="submit" variant="contained">
            {saving ? "Adding..." : "Add Investment"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
