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
  getClientOverview,
  getOwnClientOverview,
  type ClientOverview,
  type Product,
} from "../api/clients";
import { useAuth } from "../auth/AuthContext";
import { AccidentReportDialog } from "./AccidentReportDialog";
import { AddGoalDialog } from "./AddGoalDialog";
import { ProductDetailsDialog } from "./ProductDetailsDialog";
import { ChatPanel } from "./ChatPanel";

type ClientOverviewPanelProps = {
  clientId?: string;
  getAccessToken: () => Promise<string | undefined>;
};

const randCurrency = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

/** Format API decimal strings consistently as South African Rand. */
function formatCurrency(value: number | string): string {
  return randCurrency.format(Number(value));
}

/** Read a numeric product detail without trusting untyped JSON values. */
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

/** Format the key value or progress shown for each supported product type. */
function productValue(product: Product): string {
  if (product.product_type === "GOAL") {
    const currentValue = readNumber(product, "current_value");
    const targetAmount = readNumber(product, "target_amount");
    if (currentValue !== null && targetAmount !== null) {
      return `${formatCurrency(currentValue)} / ${formatCurrency(targetAmount)}`;
    }
  }

  const premium = readNumber(product, "premium");
  return premium === null ? "-" : `${formatCurrency(premium)}/month`;
}

/** Render the same financial and product view for a Client and Adviser. */
export function ClientOverviewPanel({
  clientId,
  getAccessToken,
}: ClientOverviewPanelProps) {
  const auth = useAuth();
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [accidentProduct, setAccidentProduct] = useState<Product | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview(): Promise<void> {
      setLoading(true);
      setError(false);

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("A valid access token is required.");
        }

        const clientOverview = clientId
          ? await getClientOverview(accessToken, clientId, controller.signal)
          : await getOwnClientOverview(accessToken, controller.signal);
        setOverview(clientOverview);
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

    void loadOverview();
    return () => controller.abort();
  }, [clientId, getAccessToken]);

  if (loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <CircularProgress size={36} />
        <Typography color="text.secondary">Loading financial view...</Typography>
      </Stack>
    );
  }

  if (error || !overview) {
    return (
      <Alert severity="error">
        This Client could not be loaded or is not assigned to your account.
      </Alert>
    );
  }

  const position = overview.financial_position;
  const financialCards = [
    ["Assets", position.assets],
    ["Liabilities", position.liabilities],
    ["Net worth", position.net_worth],
    ["Monthly income", position.monthly_income],
    ["Monthly expenses", position.monthly_expenses],
  ] as const;

  return (
    <Stack spacing={4}>
      <Box>
        <Typography component="h2" fontWeight={700} variant="h4">
          {overview.name}
        </Typography>
        <Typography color="text.secondary">Financial position</Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(5, 1fr)",
          },
        }}
      >
        {financialCards.map(([label, value]) => (
          <Paper key={label} variant="outlined" sx={{ p: 2.5 }}>
            <Typography color="text.secondary" variant="body2">
              {label}
            </Typography>
            <Typography fontWeight={700} variant="h6">
              {formatCurrency(value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Box
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            justifyContent: "space-between",
            p: 3,
            pb: 1,
          }}
        >
          <Box>
            <Typography component="h2" fontWeight={700} variant="h6">
              Products
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Goals and insurance in one simple view.
            </Typography>
          </Box>
          <Button onClick={() => setGoalDialogOpen(true)} variant="contained">
            Add Goal
          </Button>
        </Box>
        <Table aria-label={`${overview.name} products`}>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Value / Progress</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overview.products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" textAlign="center">
                    No products have been added yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {overview.products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Typography fontWeight={600}>{product.name}</Typography>
                </TableCell>
                <TableCell>
                  {product.product_type === "GOAL" ? "Goal" : "Insurance"}
                </TableCell>
                <TableCell>{product.provider}</TableCell>
                <TableCell>{productValue(product)}</TableCell>
                <TableCell>
                  <Chip label={product.status} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Button
                    onClick={() => setSelectedProduct(product)}
                    size="small"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ChatPanel
        clientId={overview.id}
        getAccessToken={getAccessToken}
      />
      <ProductDetailsDialog
        canReportAccident={!auth.roles.includes("adviser")}
        onClose={() => setSelectedProduct(null)}
        onReportAccident={(product) => {
          setSelectedProduct(null);
          setAccidentProduct(product);
        }}
        product={selectedProduct}
      />
      <AccidentReportDialog
        clientId={overview.id}
        getAccessToken={getAccessToken}
        onClose={() => setAccidentProduct(null)}
        product={accidentProduct}
      />
      <AddGoalDialog
        clientId={overview.id}
        getAccessToken={getAccessToken}
        onClose={() => setGoalDialogOpen(false)}
        onCreated={(goal) => {
          setOverview((current) =>
            current
              ? {
                  ...current,
                  products: [...current.products, goal].sort((first, second) =>
                    first.name.localeCompare(second.name),
                  ),
                }
              : current,
          );
        }}
        open={goalDialogOpen}
      />
    </Stack>
  );
}
