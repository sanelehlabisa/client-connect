import { type FormEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  submitAccidentReport,
  type AccidentReport,
  type InsuranceRequest,
} from "../api/insuranceRequests";
import type { Product } from "../api/clients";

type AccidentReportDialogProps = {
  clientId: string;
  getAccessToken: () => Promise<string | undefined>;
  onClose: () => void;
  product: Product | null;
};

type FormValues = {
  incidentAt: string;
  location: string;
  description: string;
  policeNotified: "" | "yes" | "no";
  policeCaseNumber: string;
  driverName: string;
  vehicleUse: "" | "Personal" | "Business";
  witnessDetails: string;
  otherVehicleOrProperty: string;
  thirdPartyDetails: string;
};

const initialValues: FormValues = {
  incidentAt: "",
  location: "",
  description: "",
  policeNotified: "",
  policeCaseNumber: "",
  driverName: "",
  vehicleUse: "",
  witnessDetails: "",
  otherVehicleOrProperty: "",
  thirdPartyDetails: "",
};

const sceneChecklist = [
  "Photograph the road surface, direction of travel, vehicles, damage, and people involved.",
  "Record the address or nearest cross streets.",
  "Capture licence plates, registration discs, licences, and ID documents.",
  "Collect witness names, contact details, and a statement where possible.",
  "Collect the other parties' insurer and policy information.",
  "Report the accident to the police within 48 hours.",
];

/** Collect the minimum structured motor-claim information for the demo. */
export function AccidentReportDialog({
  clientId,
  getAccessToken,
  onClose,
  product,
}: AccidentReportDialogProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [submittedRequest, setSubmittedRequest] =
    useState<InsuranceRequest | null>(null);

  if (!product) {
    return null;
  }

  function updateValue<Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !values.vehicleUse || !values.policeNotified) {
      return;
    }

    setSubmitting(true);
    setError(false);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("A valid access token is required.");
      }

      const report: AccidentReport = {
        incident_at: values.incidentAt,
        location: values.location.trim(),
        description: values.description.trim(),
        police_notified: values.policeNotified === "yes",
        police_case_number: values.policeCaseNumber.trim(),
        driver_name: values.driverName.trim(),
        vehicle_use: values.vehicleUse,
        witness_details: values.witnessDetails.trim(),
        other_vehicle_or_property: values.otherVehicleOrProperty.trim(),
        third_party_details: values.thirdPartyDetails.trim(),
        file_names: fileNames,
      };
      const request = await submitAccidentReport(
        accessToken,
        clientId,
        product.id,
        report,
      );
      setSubmittedRequest(request);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="md" onClose={submitting ? undefined : onClose} open>
      <DialogTitle>Report an Accident — {product.name}</DialogTitle>
      <DialogContent dividers>
        {submittedRequest ? (
          <Alert severity="success">
            Your accident report was submitted successfully. Its current status
            is {submittedRequest.status}. Provider claim number:{" "}
            <strong>
              {submittedRequest.provider_claim_number ?? "Pending"}
            </strong>
            . Claims handler:{" "}
            <strong>{submittedRequest.claims_handler ?? "Pending"}</strong>.
          </Alert>
        ) : (
          <Box component="form" id="accident-report-form" onSubmit={(event) => void handleSubmit(event)}>
            <Stack spacing={3}>
              <Alert severity="info">
                <Typography fontWeight={700}>At the scene</Typography>
                <List dense disablePadding>
                  {sceneChecklist.map((item) => (
                    <ListItem disableGutters key={item} sx={{ py: 0 }}>
                      <ListItemText primary={`• ${item}`} />
                    </ListItem>
                  ))}
                </List>
              </Alert>

              {error && (
                <Alert severity="error">
                  The report could not be submitted. Check the form and try
                  again.
                </Alert>
              )}

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <TextField
                  disabled={submitting}
                  InputLabelProps={{ shrink: true }}
                  label="Incident date and time"
                  onChange={(event) => updateValue("incidentAt", event.target.value)}
                  required
                  type="datetime-local"
                  value={values.incidentAt}
                />
                <TextField
                  disabled={submitting}
                  label="Location or nearest cross streets"
                  onChange={(event) => updateValue("location", event.target.value)}
                  required
                  value={values.location}
                />
                <TextField
                  disabled={submitting}
                  label="Was the police notified?"
                  onChange={(event) =>
                    updateValue(
                      "policeNotified",
                      event.target.value as FormValues["policeNotified"],
                    )
                  }
                  required
                  select
                  value={values.policeNotified}
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField
                  disabled={submitting}
                  label="Police case number"
                  onChange={(event) => updateValue("policeCaseNumber", event.target.value)}
                  required={values.policeNotified === "yes"}
                  value={values.policeCaseNumber}
                />
                <TextField
                  disabled={submitting}
                  label="Driver's full name"
                  onChange={(event) => updateValue("driverName", event.target.value)}
                  required
                  value={values.driverName}
                />
                <TextField
                  disabled={submitting}
                  label="Vehicle use"
                  onChange={(event) =>
                    updateValue(
                      "vehicleUse",
                      event.target.value as FormValues["vehicleUse"],
                    )
                  }
                  required
                  select
                  value={values.vehicleUse}
                >
                  <MenuItem value="Personal">Personal</MenuItem>
                  <MenuItem value="Business">Business</MenuItem>
                </TextField>
              </Box>

              <TextField
                disabled={submitting}
                label="Description of the incident"
                minRows={3}
                multiline
                onChange={(event) => updateValue("description", event.target.value)}
                required
                value={values.description}
              />
              <TextField
                disabled={submitting}
                label="Witness names, contacts, and statements"
                minRows={2}
                multiline
                onChange={(event) => updateValue("witnessDetails", event.target.value)}
                value={values.witnessDetails}
              />
              <TextField
                disabled={submitting}
                label="Other vehicles or property involved"
                minRows={2}
                multiline
                onChange={(event) =>
                  updateValue("otherVehicleOrProperty", event.target.value)
                }
                value={values.otherVehicleOrProperty}
              />
              <TextField
                disabled={submitting}
                label="Third-party licence, registration, insurer, and policy"
                minRows={2}
                multiline
                onChange={(event) => updateValue("thirdPartyDetails", event.target.value)}
                value={values.thirdPartyDetails}
              />

              <Stack alignItems="flex-start" spacing={1}>
                <Button component="label" disabled={submitting} variant="outlined">
                  Select photos and documents
                  <input
                    accept="image/*,.pdf"
                    hidden
                    multiple
                    onChange={(event) =>
                      setFileNames(
                        Array.from(event.target.files ?? []).map(
                          (file) => file.name,
                        ),
                      )
                    }
                    type="file"
                  />
                </Button>
                <Typography color="text.secondary" variant="body2">
                  {fileNames.length === 0
                    ? "For this demo, only selected filenames are stored."
                    : fileNames.join(", ")}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={submitting} onClick={onClose}>
          {submittedRequest ? "Done" : "Cancel"}
        </Button>
        {!submittedRequest && (
          <Button
            disabled={submitting}
            form="accident-report-form"
            type="submit"
            variant="contained"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
