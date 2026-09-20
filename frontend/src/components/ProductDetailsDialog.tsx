import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

import type { Product } from "../api/clients";

type ProductDetailsDialogProps = {
  canReportAccident: boolean;
  onArchive: (product: Product) => void;
  onClose: () => void;
  onReportAccident: (product: Product) => void;
  onRemove: (product: Product) => void;
  product: Product | null;
};

type DetailItemProps = {
  label: string;
  value: string;
};

const randCurrency = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

/** Show one labelled value in a product summary. */
function DetailItem({ label, value }: DetailItemProps) {
  return (
    <Box>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}

/** Safely read a numeric field from a product's JSON details. */
function readNumber(product: Product, key: string): number | null {
  const rawValue = product.details[key];
  if (typeof rawValue !== "number" && typeof rawValue !== "string") {
    return null;
  }
  if (typeof rawValue === "string" && rawValue.trim() === "") {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

/** Safely read a text field from a product's JSON details. */
function readText(product: Product, key: string): string | null {
  const value = product.details[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Format a money value or show a clear missing-value marker. */
function formatMoney(value: number | null): string {
  return value === null ? "Not recorded" : randCurrency.format(value);
}

/** Format an ISO development date without changing its calendar day. */
function formatDate(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

/** Display type-specific Goal, Investment, or Insurance details. */
export function ProductDetailsDialog({
  canReportAccident,
  onArchive,
  onClose,
  onReportAccident,
  onRemove,
  product,
}: ProductDetailsDialogProps) {
  if (!product) {
    return null;
  }

  const isGoal = product.product_type === "GOAL";
  const isInvestment = product.product_type === "INVESTMENT";
  const isInsurance = product.product_type === "INSURANCE";
  const isMotorInsurance =
    isInsurance &&
    product.status !== "Archived" &&
    readText(product, "insurance_type")?.toLowerCase() === "motor";
  const startingBalance = readNumber(product, "starting_balance");
  const currentValue = readNumber(product, "current_value");
  const targetAmount = readNumber(product, "target_amount");
  const progress =
    currentValue !== null && targetAmount !== null && targetAmount > 0
      ? Math.min(100, Math.max(0, (currentValue / targetAmount) * 100))
      : 0;

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open>
      <DialogTitle>
        <Stack alignItems="flex-start" spacing={1}>
          <Chip
            color="primary"
            label={
              isGoal ? "Goal" : isInvestment ? "Investment" : "Insurance"
            }
            size="small"
            variant="outlined"
          />
          <Typography component="span" fontWeight={700} variant="h5">
            {product.name}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {isGoal ? (
          <Stack spacing={3}>
            <Box
              sx={{
                display: "grid",
                gap: 2.5,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <DetailItem
                label="Starting balance"
                value={formatMoney(startingBalance)}
              />
              <DetailItem
                label="Current value"
                value={formatMoney(currentValue)}
              />
              <DetailItem
                label="Target amount"
                value={formatMoney(targetAmount)}
              />
              <DetailItem label="Status" value={product.status} />
              <DetailItem
                label="Start date"
                value={formatDate(readText(product, "start_date"))}
              />
              <DetailItem
                label="Target date"
                value={formatDate(readText(product, "target_date"))}
              />
            </Box>
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography fontWeight={600}>Progress</Typography>
                <Typography color="text.secondary">
                  {Math.round(progress)}%
                </Typography>
              </Stack>
              <LinearProgress
                aria-label={`${product.name} progress`}
                sx={{ height: 10, borderRadius: 5 }}
                value={progress}
                variant="determinate"
              />
            </Box>
          </Stack>
        ) : isInvestment ? (
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <DetailItem label="Provider" value={product.provider} />
            <DetailItem
              label="Investment type"
              value={readText(product, "investment_type") ?? "Not recorded"}
            />
            <DetailItem
              label="Account number"
              value={readText(product, "account_number") ?? "Not recorded"}
            />
            <DetailItem label="Status" value={product.status} />
            <DetailItem
              label="Current value"
              value={formatMoney(readNumber(product, "current_value"))}
            />
            <DetailItem
              label="Monthly contribution"
              value={formatMoney(readNumber(product, "monthly_contribution"))}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <DetailItem label="Provider" value={product.provider} />
            <DetailItem
              label="Insurance type"
              value={readText(product, "insurance_type") ?? "Not recorded"}
            />
            <DetailItem label="Status" value={product.status} />
            <DetailItem
              label="Policy number"
              value={readText(product, "policy_number") ?? "Not recorded"}
            />
            <DetailItem
              label="Monthly premium"
              value={formatMoney(readNumber(product, "premium"))}
            />
            <DetailItem
              label="Cover amount"
              value={formatMoney(readNumber(product, "cover_amount"))}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {isInsurance && product.status !== "Archived" && (
          <Button color="warning" onClick={() => onArchive(product)}>
            Archive
          </Button>
        )}
        {(isGoal || isInvestment) && (
          <Button color="error" onClick={() => onRemove(product)}>
            Remove
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
        {isMotorInsurance && canReportAccident && (
          <Button
            onClick={() => onReportAccident(product)}
            variant="contained"
          >
            Report an Accident
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
