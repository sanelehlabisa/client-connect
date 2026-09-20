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
import { Link, useNavigate } from "react-router-dom";

import {
  getClientOverview,
  getOwnClientOverview,
  type ClientOverview,
  type Product,
} from "../api/clients";
import { useAuth } from "../auth/AuthContext";
import { AccidentReportDialog } from "./AccidentReportDialog";
import { AddGoalDialog } from "./AddGoalDialog";
import { AddInsuranceDialog } from "./AddInsuranceDialog";
import { ArchiveInsuranceDialog } from "./ArchiveInsuranceDialog";
import { ProductDetailsDialog } from "./ProductDetailsDialog";
import { RemoveProductDialog } from "./RemoveProductDialog";
import { ChatPanel } from "./ChatPanel";

type ClientOverviewPanelProps = {
  clientId?: string;
  getAccessToken: () => Promise<string | undefined>;
  productId?: string;
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

  if (product.product_type === "INVESTMENT") {
    const currentValue = readNumber(product, "current_value");
    return currentValue === null ? "-" : formatCurrency(currentValue);
  }

  const premium = readNumber(product, "premium");
  return premium === null ? "-" : `${formatCurrency(premium)}/month`;
}

/** Convert an API product type into a user-facing label. */
function productTypeLabel(product: Product): string {
  if (product.product_type === "GOAL") {
    return "Investment Goal";
  }
  if (product.product_type === "INVESTMENT") {
    return "Investment";
  }
  return "Insurance";
}

/** Render the same financial and product view for a Client and Adviser. */
export function ClientOverviewPanel({
  clientId,
  getAccessToken,
  productId,
}: ClientOverviewPanelProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [productToRemove, setProductToRemove] = useState<Product | null>(null);
  const [insuranceToArchive, setInsuranceToArchive] =
    useState<Product | null>(null);
  const [accidentProduct, setAccidentProduct] = useState<Product | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false);
  const isAdviser = auth.roles.includes("adviser");

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
  const routedProduct = productId
    ? [...overview.products, ...overview.archived_products].find(
        (product) => product.id === productId,
      ) ?? null
    : null;
  const financialCards = [
    ["Assets", position.assets],
    ["Liabilities", position.liabilities],
    ["Net worth", position.net_worth],
    ["Monthly income", position.monthly_income],
    ["Monthly expenses", position.monthly_expenses],
  ] as const;
  const overviewClientId = overview.id;

  function closeProductRoute(): void {
    if (productId) {
      navigate(`/clients/${overviewClientId}`);
    }
  }

  return (
    <Stack spacing={1.5}>
      <Paper
        aria-label="Financial position"
        variant="outlined"
        sx={{
          alignSelf: "center",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          maxWidth: 440,
          p: 2,
          rowGap: 1,
          width: "100%",
        }}
      >
        <Typography
          component="h2"
          fontWeight={700}
          sx={{ gridColumn: "1 / -1", mb: 0.5 }}
          variant="subtitle1"
        >
          Financial position
        </Typography>
        {financialCards.map(([label, value]) => (
          <Box key={label} sx={{ display: "contents" }}>
            <Typography color="text.secondary" component="span" variant="body2">
              {label}
            </Typography>
            <Typography component="span" fontWeight={700} textAlign="right">
              {formatCurrency(value)}
            </Typography>
          </Box>
        ))}
      </Paper>

      {productId && !routedProduct && (
        <Alert severity="warning">
          This product could not be found for the selected Client.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Box
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            justifyContent: "space-between",
            p: 2,
            pb: 1,
          }}
        >
          <Box>
            <Typography component="h2" fontWeight={700} variant="h6">
              Products
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Investment Goals and Insurance in one simple view.
            </Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
            <Button onClick={() => setGoalDialogOpen(true)} variant="outlined">
              Add Investment Goal
            </Button>
            <Button
              onClick={() => setInsuranceDialogOpen(true)}
              variant="contained"
            >
              Add Insurance
            </Button>
          </Stack>
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
                  {productTypeLabel(product)}
                </TableCell>
                <TableCell>{product.provider}</TableCell>
                <TableCell>{productValue(product)}</TableCell>
                <TableCell>
                  <Chip label={product.status} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Button
                    component={Link}
                    size="small"
                    to={`/clients/${overview.id}/products/${product.id}`}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {overview.archived_products.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography component="h2" fontWeight={700} variant="h6">
              Product history
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Existing claims and notifications stay available for archived
              policies.
            </Typography>
          </Box>
          <Table aria-label={`${overview.name} archived products`}>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.archived_products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Typography fontWeight={600}>{product.name}</Typography>
                  </TableCell>
                  <TableCell>{productTypeLabel(product)}</TableCell>
                  <TableCell>{product.provider}</TableCell>
                  <TableCell>
                    <Chip
                      color="default"
                      label={product.status}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={Link}
                      size="small"
                      to={`/clients/${overview.id}/products/${product.id}`}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box id="client-chat" sx={{ scrollMarginTop: 96 }}>
        <ChatPanel
          clientId={overview.id}
          getAccessToken={getAccessToken}
        />
      </Box>
      <ProductDetailsDialog
        canReportAccident={!isAdviser}
        clientId={overview.id}
        getAccessToken={getAccessToken}
        onArchive={(product) => {
          closeProductRoute();
          setInsuranceToArchive(product);
        }}
        onClose={closeProductRoute}
        onReportAccident={(product) => {
          closeProductRoute();
          setAccidentProduct(product);
        }}
        onRemove={(product) => {
          closeProductRoute();
          setProductToRemove(product);
        }}
        product={routedProduct}
      />
      <ArchiveInsuranceDialog
        clientId={overview.id}
        getAccessToken={getAccessToken}
        onArchived={(archivedProduct) => {
          setOverview((current) =>
            current
              ? {
                  ...current,
                  products: current.products.filter(
                    (product) => product.id !== archivedProduct.id,
                  ),
                  archived_products: [
                    ...current.archived_products.filter(
                      (product) => product.id !== archivedProduct.id,
                    ),
                    archivedProduct,
                  ].sort((first, second) =>
                    first.name.localeCompare(second.name),
                  ),
                }
              : current,
          );
          setInsuranceToArchive(null);
        }}
        onClose={() => setInsuranceToArchive(null)}
        product={insuranceToArchive}
      />
      <RemoveProductDialog
        clientId={overview.id}
        getAccessToken={getAccessToken}
        onClose={() => setProductToRemove(null)}
        onRemoved={(productId) => {
          setOverview((current) =>
            current
              ? {
                  ...current,
                  products: current.products.filter(
                    (product) => product.id !== productId,
                  ),
                }
              : current,
          );
          setProductToRemove(null);
        }}
        product={productToRemove}
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
          navigate(`/clients/${overview.id}/products/${goal.id}`);
        }}
        open={goalDialogOpen}
      />
      <AddInsuranceDialog
        clientId={overview.id}
        getAccessToken={getAccessToken}
        onClose={() => setInsuranceDialogOpen(false)}
        onCreated={(product) => {
          setOverview((current) =>
            current
              ? {
                  ...current,
                  products: [...current.products, product].sort(
                    (first, second) => first.name.localeCompare(second.name),
                  ),
                }
              : current,
          );
        }}
        open={insuranceDialogOpen}
      />
    </Stack>
  );
}
