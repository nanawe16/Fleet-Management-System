import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
} from "@mui/material";

const emptyItem = {
  partName: "",
  category: "",
  quantity: "",
  unit: "unit",
  reorderLevel: "",
  unitCost: "",
  supplier: "",
};

const UNIT_OPTIONS = ["unit", "set", "can", "liter", "box"];

const InventoryForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [item, setItem] = useState(emptyItem);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setItem(initialData || emptyItem);
    setErrors({});
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!item.partName.trim()) newErrors.partName = "Part name is required";
    if (!item.category.trim()) newErrors.category = "Category is required";

    if (item.quantity === "" || Number(item.quantity) < 0) {
      newErrors.quantity = "Quantity must be zero or a positive number";
    }
    if (item.reorderLevel === "" || Number(item.reorderLevel) < 0) {
      newErrors.reorderLevel = "Reorder level must be zero or a positive number";
    }
    if (!item.unitCost || Number(item.unitCost) <= 0) {
      newErrors.unitCost = "Unit cost must be a positive number";
    }
    if (!item.supplier.trim()) newErrors.supplier = "Supplier is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Parent closes this dialog itself once the save actually succeeds —
    // same pattern as every other form in this app, to avoid closing
    // before an async save/validation error can be shown.
    onSave(item);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Spare Part" : "Add Spare Part"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Part Name"
            name="partName"
            value={item.partName}
            onChange={handleChange}
            error={!!errors.partName}
            helperText={errors.partName}
            fullWidth
          />

          <TextField
            label="Category"
            name="category"
            value={item.category}
            onChange={handleChange}
            error={!!errors.category}
            helperText={errors.category}
            placeholder="e.g. Brakes, Filters, Tires, Fluids"
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Quantity in Stock"
              name="quantity"
              type="number"
              value={item.quantity}
              onChange={handleChange}
              error={!!errors.quantity}
              helperText={errors.quantity}
              fullWidth
            />

            <TextField
              select
              label="Unit"
              name="unit"
              value={item.unit}
              onChange={handleChange}
              fullWidth
            >
              {UNIT_OPTIONS.map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Reorder Level"
            name="reorderLevel"
            type="number"
            value={item.reorderLevel}
            onChange={handleChange}
            error={!!errors.reorderLevel}
            helperText={errors.reorderLevel || "You'll be alerted when stock falls to or below this level"}
            fullWidth
          />

          <TextField
            label="Unit Cost (ETB)"
            name="unitCost"
            type="number"
            value={item.unitCost}
            onChange={handleChange}
            error={!!errors.unitCost}
            helperText={errors.unitCost}
            fullWidth
          />

          <TextField
            label="Supplier"
            name="supplier"
            value={item.supplier}
            onChange={handleChange}
            error={!!errors.supplier}
            helperText={errors.supplier}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryForm;