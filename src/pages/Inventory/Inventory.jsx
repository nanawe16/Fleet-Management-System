import { useState, useEffect } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import InventoryTable from "../../components/tables/InventoryTable";
import InventoryForm from "../../components/forms/InventoryForm";
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  recordTransaction,
} from "../../services/inventoryService";
import { getCurrentUser } from "../../services/authService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  Skeleton,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";

const Inventory = () => {
  // Matrix: Spare Parts — Admin "F", Mechanic "F"; Transport Manager,
  // Finance, and Management are all "V" (view only); Driver and
  // Department Head have no access at all. Both write-capable roles
  // get the same flat full access (no per-row restriction, unlike
  // Maintenance's "F Assigned" for Mechanic).
  const role = getCurrentUser()?.role;
  const canWrite = role === "admin" || role === "mechanic";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // stock in/out transaction dialog
  const [transactionItem, setTransactionItem] = useState(null);
  const [transactionType, setTransactionType] = useState("in");
  const [transactionQty, setTransactionQty] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [recording, setRecording] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    const { data, usingMockData } = await getInventory();
    setItems(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleSave = async (item) => {
    setSaving(true);
    try {
      if (editingItem) {
        const updated = await updateInventoryItem(editingItem.id, item);
        setItems(items.map((i) => (i.id === editingItem.id ? updated : i)));
        setSnackbar({ open: true, message: "Spare part updated successfully!", severity: "success" });
      } else {
        const created = await createInventoryItem(item);
        setItems([...items, created]);
        setSnackbar({ open: true, message: "Spare part added successfully!", severity: "success" });
      }
      setEditingItem(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the spare part. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const item = items.find((i) => i.id === id);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteInventoryItem(itemToDelete.id);
      setItems(items.filter((i) => i.id !== itemToDelete.id));
      setSnackbar({ open: true, message: "Spare part deleted successfully!", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the spare part. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openTransactionDialog = (item) => {
    setTransactionItem(item);
    setTransactionType("in");
    setTransactionQty("");
    setTransactionNote("");
    setTransactionError("");
  };

  const confirmTransaction = async () => {
    const qty = Number(transactionQty);
    if (!transactionQty || qty <= 0) {
      setTransactionError("Enter a quantity greater than zero.");
      return;
    }
    if (transactionType === "out" && qty > transactionItem.quantity) {
      setTransactionError(`Only ${transactionItem.quantity} ${transactionItem.unit} in stock.`);
      return;
    }

    setRecording(true);
    try {
      const updated = await recordTransaction(transactionItem.id, {
        type: transactionType,
        quantity: qty,
        note: transactionNote,
      });
      setItems(items.map((i) => (i.id === transactionItem.id ? updated : i)));
      setSnackbar({ open: true, message: "Stock updated successfully!", severity: "success" });
      setTransactionItem(null);
    } catch (err) {
      // backend not connected yet — apply the change locally so the
      // demo still reflects the action
      const delta = transactionType === "in" ? qty : -qty;
      setItems(
        items.map((i) =>
          i.id === transactionItem.id ? { ...i, quantity: i.quantity + delta } : i
        )
      );
      setSnackbar({
        open: true,
        message: "Backend not connected — updated locally for now.",
        severity: "info",
      });
      setTransactionItem(null);
    } finally {
      setRecording(false);
    }
  };

  const lowStockCount = items.filter((i) => Number(i.quantity) <= Number(i.reorderLevel)).length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.partName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase());

    const isLowStock = Number(item.quantity) <= Number(item.reorderLevel);
    const matchesStock =
      stockFilter === "All" ||
      (stockFilter === "Low Stock" && isLowStock) ||
      (stockFilter === "In Stock" && !isLowStock);

    return matchesSearch && matchesStock;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Inventory Management"
        buttonText="Add Spare Part"
        onAdd={canWrite ? () => setOpen(true) : undefined}
      />

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      {lowStockCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {lowStockCount} {lowStockCount === 1 ? "part is" : "parts are"} at or below reorder level.
        </Alert>
      )}

      <SearchFilterBar
        search={search}
        setSearch={setSearch}
        status={stockFilter}
        setStatus={setStockFilter}
        statusOptions={["All", "In Stock", "Low Stock"]}
        searchLabel="Search Part, Category, or Supplier"
      />

      <InventoryForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        initialData={editingItem}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <InventoryTable
          items={filteredItems}
          onEdit={canWrite ? handleEdit : undefined}
          onDelete={canWrite ? handleDelete : undefined}
          onRecordTransaction={canWrite ? openTransactionDialog : undefined}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Spare Part"
        message={`Delete "${itemToDelete?.partName || ""}" from inventory?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <Dialog open={!!transactionItem} onClose={() => setTransactionItem(null)} fullWidth maxWidth="xs">
        <DialogTitle>Record Stock — {transactionItem?.partName}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Transaction Type"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              fullWidth
            >
              <MenuItem value="in">Stock In (received)</MenuItem>
              <MenuItem value="out">Stock Out (used)</MenuItem>
            </TextField>

            <TextField
              label="Quantity"
              type="number"
              value={transactionQty}
              onChange={(e) => {
                setTransactionQty(e.target.value);
                setTransactionError("");
              }}
              error={!!transactionError}
              helperText={
                transactionError ||
                (transactionItem
                  ? `Current stock: ${transactionItem.quantity} ${transactionItem.unit}`
                  : "")
              }
              fullWidth
            />

            <TextField
              label="Note (optional)"
              value={transactionNote}
              onChange={(e) => setTransactionNote(e.target.value)}
              placeholder="e.g. Used for OR-12345 brake service"
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionItem(null)} disabled={recording}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmTransaction} disabled={recording}>
            {recording ? "Saving..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inventory;