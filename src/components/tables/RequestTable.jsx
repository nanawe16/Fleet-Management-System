import { Fragment, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
  Collapse,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AssignmentIcon from "@mui/icons-material/Assignment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

const statusColor = (status) => {
  switch (status) {
    case "DRAFT":
      return "default";
    case "SUBMITTED":
    case "DEPARTMENT_APPROVED":
    case "TRANSPORT_APPROVED":
      return "warning";
    case "ALLOCATED":
    case "IN_PROGRESS":
      return "info";
    case "COMPLETED":
      return "success";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
};

const statusLabel = (status) =>
  status === "DEPARTMENT_APPROVED" ? "WORK UNIT APPROVED" : (status || "").replace(/_/g, " ");

/**
 * Every handler prop here is optional — Requests.jsx only passes the
 * ones the logged-in role can actually use (mirrors the isFinance
 * pattern from FuelTable). Whether a specific row shows a given action
 * additionally depends on that row's current status — a Department
 * Head only gets Approve/Reject on a SUBMITTED row, a Transport Manager
 * only gets Approve/Reject on DEPARTMENT_APPROVED and Allocate on
 * TRANSPORT_APPROVED. onDelete is only passed for Admin (027 removed
 * delete rights from Transport Manager and Department Head).
 */
const RequestTable = ({
  requests,
  onEdit,
  onDelete,
  onDepartmentApprove,
  onDepartmentReject,
  onTransportApprove,
  onTransportReject,
  onAllocate,
  onSubmit,
  currentUserId,
  restrictEditToOwnDraft = false,
  processingId,
  onOpenManifest,
}) => {
  const [expandedId, setExpandedId] = useState(null);
  if (requests.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <AssignmentIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No transport requests found.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Try adjusting your search or filter, or create a new request.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Work Unit</TableCell>
            <TableCell>Requester</TableCell>
            <TableCell>Passengers</TableCell>
            <TableCell>Task</TableCell>
            <TableCell>Route</TableCell>
            <TableCell>Destination</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {requests.map((request) => {
            const isProcessing = processingId === request.id;

            const canDepartmentAct =
              request.status === "SUBMITTED" && onDepartmentApprove && onDepartmentReject;
            const canTransportAct =
              request.status === "DEPARTMENT_APPROVED" && onTransportApprove && onTransportReject;
            const canAllocate = request.status === "TRANSPORT_APPROVED" && onAllocate;
            const canSubmit = request.status === "DRAFT" && onSubmit && request.requestedBy === currentUserId;
            const canEditRow =
              onEdit &&
              (!restrictEditToOwnDraft ||
                (request.status === "DRAFT" && request.requestedBy === currentUserId));

            return (
              <Fragment key={request.id}>
                <TableRow key={request.id} hover>
                  <TableCell>{request.department}</TableCell>
                  <TableCell>{request.requester}</TableCell>
                  <TableCell>{request.passengerCount || "—"}</TableCell>
                  <TableCell>{request.task || "—"}</TableCell>
                  <TableCell>{request.startLocation || "—"}</TableCell>
                  <TableCell>{request.destination}</TableCell>
                  <TableCell>{request.date}</TableCell>

                  <TableCell>
                    <Chip label={statusLabel(request.status)} color={statusColor(request.status)} size="small" />
                  </TableCell>

                  <TableCell align="right">
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, alignItems: "center" }}>
                    {isProcessing ? (
                      <CircularProgress size={20} sx={{ mx: 1 }} />
                    ) : (
                      <>
                        {canDepartmentAct && (
                          <>
                            <Tooltip title="Approve (Office Head)">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => onDepartmentApprove(request.id)}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => onDepartmentReject(request.id)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {canTransportAct && (
                          <>
                            <Tooltip title="Approve (Transport)">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => onTransportApprove(request.id)}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => onTransportReject(request.id)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {canAllocate && (
                          <Tooltip title="Allocate Vehicle & Driver">
                            <IconButton size="small" color="primary" onClick={() => onAllocate(request.id)}>
                              <LocalShippingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canSubmit && (
                          <Tooltip title="Submit Request">
                            <IconButton size="small" color="primary" onClick={() => onSubmit(request.id)}>
                              <AssignmentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}

                      <Tooltip title={expandedId === request.id ? "Hide request details" : "View request details"}>
                        <IconButton size="small" onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {canEditRow && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(request)} disabled={isProcessing}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                      {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(request.id)}
                          disabled={isProcessing}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 0, borderBottom: expandedId === request.id ? undefined : 0 }}>
                    <Collapse in={expandedId === request.id} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2 }}>
                        <Typography variant="subtitle2">Passenger list & contacts</Typography>
                        <Typography variant="body2" whiteSpace="pre-line" sx={{ mb: 1 }}>
                          {request.passengerList || "Not provided for this older request."}
                        </Typography>
                        {request.passengerManifestPath && onOpenManifest && (
                          <Button
                            size="small"
                            startIcon={<PictureAsPdfIcon />}
                            onClick={() => onOpenManifest(request)}
                            sx={{ mb: 1 }}
                          >
                            Open passenger list PDF{request.passengerManifestName ? `: ${request.passengerManifestName}` : ""}
                          </Button>
                        )}
                        <Typography variant="subtitle2">Task / purpose</Typography>
                        <Typography variant="body2" whiteSpace="pre-line">{request.task || "Not provided for this older request."}</Typography>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RequestTable;
