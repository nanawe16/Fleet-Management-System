import { supabase } from "../lib/supabase";

// DB uses request_date; the app uses camelCase date. Translated here so
// Requests.jsx / RequestForm.jsx / RequestTable.jsx need no changes
// beyond the new workflow status values and tracking fields.
const toAppShape = (row) => ({
  id: row.id,
  // Use the linked department's current name when available; old rows
  // remain readable until they are edited/backfilled.
  department: row.department_record?.name || row.department || "",
  departmentId: row.department_id || "",
  requester: row.requester,
  passengerCount: row.passenger_count ?? "",
  passengerList: row.passenger_list || "",
  task: row.task || "",
  startLocation: row.start_location || "",
  passengerManifestPath: row.passenger_manifest_path || "",
  passengerManifestName: row.passenger_manifest_name || "",
  destination: row.destination,
  date: row.request_date,
  status: row.status,
  rejectionReason: row.rejection_reason,
  rejectedAt: row.rejected_at,
  departmentApprovedAt: row.department_approved_at,
  transportApprovedAt: row.transport_approved_at,
  allocatedAt: row.allocated_at,
  requestedBy: row.requested_by,
});

// status is deliberately excluded here — it can no longer be set via a
// generic edit (027's guard trigger blocks direct status changes).
// Every transition below goes through its own dedicated function
// instead, matching the workflow's actual stages.
const toDbShape = (request) => ({
  department: request.department,
  department_id: request.departmentId || null,
  requester: request.requester,
  passenger_count: Number(request.passengerCount),
  passenger_list: request.passengerList,
  task: request.task,
  start_location: request.startLocation,
  destination: request.destination,
  request_date: request.date,
});

const MANIFEST_BUCKET = "passenger-manifests";

const uploadPassengerManifest = async (file, userId, requestId) => {
  if (!file) return {};
  if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
    throw new Error("Passenger manifest must be a PDF no larger than 10 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${requestId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(MANIFEST_BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return { passenger_manifest_path: path, passenger_manifest_name: file.name };
};

/**
 * Fetch all transport requests.
 * Returns: { data: TransportRequest[], usingMockData: boolean }
 */
export const getRequests = async () => {
  const { data, error } = await supabase
    .from("transport_requests")
    .select("*, department_record:departments!transport_requests_department_id_fkey(id, name)")
    .order("request_date", { ascending: false });

  if (error) {
    console.error("Error fetching requests:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

const createRequestWithStatus = async (request, status) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const requestId = crypto.randomUUID();
  const manifest = await uploadPassengerManifest(request.passengerManifestFile, authData.user?.id, requestId);
  const { data, error } = await supabase
    .from("transport_requests")
    .insert({ id: requestId, ...toDbShape(request), ...manifest, status, requested_by: authData.user?.id || null })
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const createRequest = (request) => createRequestWithStatus(request, "SUBMITTED");

export const createDraftRequest = (request) => createRequestWithStatus(request, "DRAFT");

export const submitRequest = async (id) => {
  const { data, error } = await supabase.rpc("submit_request", { p_request_id: id });
  if (error) throw error;
  return toAppShape(data);
};

/**
 * Edits request details (department/requester/destination/date) only —
 * never status. Available to the requester's Department Head and to
 * Transport Manager/Admin per the matrix's "E" right. Status moves
 * exclusively through the workflow functions below.
 */
export const updateRequest = async (id, request) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const manifest = await uploadPassengerManifest(request.passengerManifestFile, authData.user?.id, id);
  const { data, error } = await supabase
    .from("transport_requests")
    .update({ ...toDbShape(request), ...manifest })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const getPassengerManifestUrl = async (path) => {
  const { data, error } = await supabase.storage.from(MANIFEST_BUCKET).createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
};

export const deleteRequest = async (id) => {
  const { error } = await supabase.from("transport_requests").delete().eq("id", id);
  if (error) throw error;
};

// ===== Workflow transitions =====
// Each of these calls a SECURITY DEFINER Postgres function (027) that
// checks the caller's role and the request's current status server-side
// before making the change — mirrors the approveRequest/rejectRequest
// pattern from before Phase 4, just split into one function per stage
// instead of one flat approve/reject.

export const departmentApproveRequest = async (id) => {
  const { data, error } = await supabase.rpc("department_approve_request", { p_request_id: id });
  if (error) throw error;
  return toAppShape(data);
};

export const departmentRejectRequest = async (id, reason = "") => {
  const { data, error } = await supabase.rpc("department_reject_request", {
    p_request_id: id,
    p_reason: reason || null,
  });
  if (error) throw error;
  return toAppShape(data);
};

export const transportApproveRequest = async (id) => {
  const { data, error } = await supabase.rpc("transport_approve_request", { p_request_id: id });
  if (error) throw error;
  return toAppShape(data);
};

export const transportRejectRequest = async (id, reason = "") => {
  const { data, error } = await supabase.rpc("transport_reject_request", {
    p_request_id: id,
    p_reason: reason || null,
  });
  if (error) throw error;
  return toAppShape(data);
};

/**
 * Allocates a vehicle + driver to a TRANSPORT_APPROVED request. This
 * both moves the request to ALLOCATED and creates the actual trip row
 * (Option A — the two happen together, not as separate manual steps).
 */
export const allocateRequest = async (id, vehicleId, driverId) => {
  const { data, error } = await supabase.rpc("allocate_request", {
    p_request_id: id,
    p_vehicle_id: vehicleId,
    p_driver_id: driverId,
  });
  if (error) throw error;
  return toAppShape(data);
};
