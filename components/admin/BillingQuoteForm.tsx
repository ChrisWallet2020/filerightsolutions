"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AdminClientEmailCombobox, type AdminClientEmailOption } from "@/components/admin/AdminClientEmailCombobox";
import type { QuoteUploaderRole, StagingSlotPublic } from "@/lib/admin/paymentQuoteStaging";

const CLIENT_PICK_REQUIRED =
  "Choose a client from the list, or type their full name (or sign-in email) until it matches exactly.";

const PREVIEW_ERR: Record<string, string> = {
  user_not_found: "Preview failed: no registered account matches the client email.",
  evaluation_not_submitted:
    "Preview failed: billing is limited to clients who have already submitted their 1701A evaluation.",
  invalid_form: "Preview failed: please check required fields and try again.",
  attachment_type: "Preview failed: quote images must be image files (JPEG, PNG, etc.).",
  attachment_size: "Preview failed: each image must be 10MB or smaller.",
  preview_side_incomplete:
    "Preview failed: upload the required quote images for this workspace first.",
};

const SEND_ERR: Record<string, string> = {
  unauthorized: "You are not signed in as admin, Processor1, or Processor2.",
  invalid: "Send failed: please check required fields and try again.",
  attachment_must_be_image: "Send failed: quote images must be image files (JPEG, PNG, etc.).",
  attachment_too_large_max_10mb: "Send failed: each image must be 10MB or smaller.",
  attachments_incomplete:
    "Send failed: slots 1-2 must be uploaded by Processor1 and slots 3-4 by Processor2.",
};

function slotMeta(slot: number, role: QuoteUploaderRole): { editable: boolean; locked: boolean } {
  if (role === "admin") return { editable: true, locked: false };
  if (role === "processor1") return { editable: slot <= 2, locked: slot > 2 };
  return { editable: slot >= 3, locked: slot <= 2 };
}

function quoteDashboardHeader(role: QuoteUploaderRole): HeadersInit {
  const v =
    role === "processor2" ? "processor2" : role === "admin" ? "admin" : "processor1";
  return { "x-quote-dashboard": v };
}

/** e.g. "Friday, October 24, 2026 at 10:30 AM" for quote-image last-saved line. */
function formatQuoteImagesLastSaved(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${datePart} at ${timePart}`;
}

function processorWorkspaceSlotNumbers(role: QuoteUploaderRole): number[] {
  if (role === "processor2") return [3, 4];
  if (role === "processor1") return [1, 2];
  return [1, 2, 3, 4];
}

function countProcessorWorkspaceImagesUploaded(slots: StagingSlotPublic[] | null, role: QuoteUploaderRole): number {
  if (!slots || slots.length < 4) return 0;
  const need = processorWorkspaceSlotNumbers(role);
  return need.filter((n) => {
    const row = slots.find((s) => s.slot === n);
    return Boolean(row?.present);
  }).length;
}

function myDashboardImagesReady(slots: StagingSlotPublic[] | null, role: QuoteUploaderRole): boolean {
  if (!slots || slots.length < 4) return false;
  const need = processorWorkspaceSlotNumbers(role);
  return need.every((n) => {
    const row = slots.find((s) => s.slot === n);
    return Boolean(row?.present);
  });
}

type SendAllJob = {
  id: string;
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  lastError: string;
  /** Present when job was loaded from API after stacking support shipped. */
  queuedBatches?: string[][];
};

function sendAllRunningBanner(job: SendAllJob): string {
  const q = job.queuedBatches?.length ?? 0;
  const base = `Sending in background… ${job.processed}/${job.total} processed (Sent: ${job.sent}, Skipped: ${job.skipped}, Failed: ${job.failed}).`;
  if (q < 1) return base;
  return `${base} ${q} additional batch${q === 1 ? "" : "es"} queued after the current list.`;
}

export function BillingQuoteForm({
  submittedClients,
  quoteUploaderRole,
}: {
  submittedClients: AdminClientEmailOption[];
  quoteUploaderRole: QuoteUploaderRole;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [sendBanner, setSendBanner] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [committedClientEmail, setCommittedClientEmail] = useState("");
  const [slots, setSlots] = useState<StagingSlotPublic[] | null>(null);
  const [stagingErr, setStagingErr] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [slotImageUrls, setSlotImageUrls] = useState<Partial<Record<number, string>>>({});
  /** ISO timestamp: max staging `updatedAt` for this dashboard's slots and client (from GET staging). */
  const [quoteImagesLastSavedAt, setQuoteImagesLastSavedAt] = useState<string | null>(null);
  const [hasSupersededStagingRows, setHasSupersededStagingRows] = useState(false);
  const [activeSubmissionSubmittedAt, setActiveSubmissionSubmittedAt] = useState<string | null>(null);
  const [sendAllBanner, setSendAllBanner] = useState<string | null>(null);
  const [sendAllBannerTone, setSendAllBannerTone] = useState<"success" | "warn" | "error">("success");
  const [sendAllJob, setSendAllJob] = useState<SendAllJob | null>(null);

  const isProcessorDashboard =
    quoteUploaderRole === "processor1" || quoteUploaderRole === "processor2";

  const refreshStaging = useCallback(
    async (email: string): Promise<{ ok: boolean; slots: StagingSlotPublic[] | null }> => {
      const em = email.trim();
      if (!em) {
        setSlots(null);
        setQuoteImagesLastSavedAt(null);
        setHasSupersededStagingRows(false);
        setActiveSubmissionSubmittedAt(null);
        return { ok: false, slots: null };
      }
      try {
        const res = await fetch(
          `/api/admin/payment-quotes/staging?clientEmail=${encodeURIComponent(em)}`,
          { credentials: "include", headers: quoteDashboardHeader(quoteUploaderRole) },
        );
        if (!res.ok) {
          setStagingErr("Could not load quote image status. Try again.");
          setQuoteImagesLastSavedAt(null);
          setHasSupersededStagingRows(false);
          setActiveSubmissionSubmittedAt(null);
          return { ok: false, slots: null };
        }
        const data = (await res.json()) as {
          slots?: StagingSlotPublic[];
          lastSavedAt?: string | null;
          hasSupersededStagingRows?: boolean;
          activeSubmissionSubmittedAt?: string | null;
        };
        const list = Array.isArray(data.slots) ? data.slots : [];
        setSlots(list);
        setQuoteImagesLastSavedAt(typeof data.lastSavedAt === "string" ? data.lastSavedAt : null);
        setHasSupersededStagingRows(Boolean(data.hasSupersededStagingRows));
        setActiveSubmissionSubmittedAt(
          typeof data.activeSubmissionSubmittedAt === "string" ? data.activeSubmissionSubmittedAt : null
        );
        setStagingErr(null);
        return { ok: true, slots: list };
      } catch {
        setStagingErr("Could not load quote image status. Check your connection.");
        setQuoteImagesLastSavedAt(null);
        setHasSupersededStagingRows(false);
        setActiveSubmissionSubmittedAt(null);
        return { ok: false, slots: null };
      }
    },
    [quoteUploaderRole],
  );

  const onCommittedEmailChange = useCallback((email: string) => {
    setCommittedClientEmail(email);
    setSlots(null);
    setQuoteImagesLastSavedAt(null);
    setHasSupersededStagingRows(false);
    setActiveSubmissionSubmittedAt(null);
    setPreviewHtml(null);
    setPreviewBanner(null);
    setSendBanner(null);
    setSendAllBanner(null);
    setSaveSuccess(false);
    void refreshStaging(email);
  }, [refreshStaging]);

  useEffect(() => {
    const em = committedClientEmail.trim();
    if (!em) return;
    const t = window.setInterval(() => void refreshStaging(em), 2800);
    return () => window.clearInterval(t);
  }, [committedClientEmail, refreshStaging]);

  const loadSendAllStatus = useCallback(async (): Promise<SendAllJob | null> => {
    try {
      const res = await fetch("/api/admin/payment-quotes/send-all", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => ({}))) as { job?: SendAllJob };
      return data.job ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (isProcessorDashboard) return;
    let cancelled = false;
    void (async () => {
      const job = await loadSendAllStatus();
      if (cancelled || !job) return;
      setSendAllJob(job);
      if (job.status === "running") {
        setSendingAll(true);
        setSendAllBanner(sendAllRunningBanner(job));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isProcessorDashboard, loadSendAllStatus]);

  useEffect(() => {
    if (!sendingAll || isProcessorDashboard) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void (async () => {
        const job = await loadSendAllStatus();
        if (cancelled || !job) return;
        setSendAllJob(job);
        if (job.status === "running") {
          setSendAllBanner(sendAllRunningBanner(job));
          return;
        }
        if (job.status === "done") {
          setSendAllBanner(`Done. Sent: ${job.sent}, Skipped: ${job.skipped}, Failed: ${job.failed}, Total: ${job.total}.`);
          setSendingAll(false);
          return;
        }
        if (job.status === "error") {
          setSendAllBanner(job.lastError ? `Send all failed: ${job.lastError}` : "Send all failed.");
          setSendingAll(false);
          return;
        }
        setSendingAll(false);
      })();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sendingAll, isProcessorDashboard, loadSendAllStatus]);

  useEffect(() => {
    return () => {
      Object.values(slotImageUrls).forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [slotImageUrls]);

  useEffect(() => {
    if (!isProcessorDashboard) return;
    const email = committedClientEmail.trim();
    if (!email || !slots) {
      setSlotImageUrls((prev) => {
        Object.values(prev).forEach((u) => {
          if (u) URL.revokeObjectURL(u);
        });
        return {};
      });
      return;
    }

    const wantedSlots = (quoteUploaderRole === "processor1" ? [1, 2] : [3, 4]).filter((slot) =>
      Boolean(slots.find((s) => s.slot === slot)?.present),
    );
    let cancelled = false;

    async function loadOwnSlotPreviews() {
      const next: Partial<Record<number, string>> = {};
      await Promise.all(
        wantedSlots.map(async (slot) => {
          try {
            const res = await fetch(
              `/api/admin/payment-quotes/staging-slot?clientEmail=${encodeURIComponent(email)}&slot=${slot}`,
              { credentials: "include", headers: quoteDashboardHeader(quoteUploaderRole) },
            );
            if (!res.ok) return;
            const blob = await res.blob();
            next[slot] = URL.createObjectURL(blob);
          } catch {
            // Keep UI usable even if one preview fails.
          }
        }),
      );
      if (cancelled) {
        Object.values(next).forEach((u) => {
          if (u) URL.revokeObjectURL(u);
        });
        return;
      }
      setSlotImageUrls((prev) => {
        Object.values(prev).forEach((u) => {
          if (u) URL.revokeObjectURL(u);
        });
        return next;
      });
    }

    void loadOwnSlotPreviews();
    return () => {
      cancelled = true;
    };
  }, [committedClientEmail, slots, isProcessorDashboard, quoteUploaderRole]);

  const allFourReady = Boolean(
    slots &&
      slots.length === 4 &&
      slots.find((s) => s.slot === 1)?.uploadedBy === "processor1" &&
      slots.find((s) => s.slot === 2)?.uploadedBy === "processor1" &&
      slots.find((s) => s.slot === 3)?.uploadedBy === "processor2" &&
      slots.find((s) => s.slot === 4)?.uploadedBy === "processor2",
  );

  async function uploadSlot(slot: number, file: File) {
    const email = committedClientEmail.trim();
    if (!email) {
      setStagingErr(CLIENT_PICK_REQUIRED);
      return;
    }
    if (!slotMeta(slot, quoteUploaderRole).editable) {
      setStagingErr("You cannot upload to that image slot from this workspace.");
      return;
    }
    setStagingErr(null);
    setSaveSuccess(false);
    setUploadingSlot(slot);
    try {
      const fd = new FormData();
      fd.set("clientEmail", email);
      fd.set("slot", String(slot));
      fd.set("file", file);
      const res = await fetch("/api/admin/payment-quotes/staging-slot", {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: quoteDashboardHeader(quoteUploaderRole),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const code = data.error || "request_failed";
        setStagingErr(
          code === "slot_not_allowed"
            ? "You cannot upload to that image slot from this workspace."
            : code === "attachment_must_be_image"
              ? "Images must be JPEG, PNG, WebP, or GIF."
              : code === "attachment_too_large_max_10mb"
                ? "Each image must be 10MB or smaller."
                : code === "duplicate_workspace_filename"
                  ? "Use a different filename for the other image in your workspace."
                  : code === "no_active_submission"
                    ? "No active 1701A submission was found for this client. Ask the client to submit/resubmit first."
                : "Upload failed. Try again.",
        );
        return;
      }
      await refreshStaging(email);
      const inp = fileInputRefs.current[slot];
      if (inp) inp.value = "";
    } catch {
      setStagingErr("Upload failed. Check your connection.");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handlePreview() {
    setPreviewBanner(null);
    setPreviewHtml(null);
    const form = formRef.current;
    if (!form) return;
    setPreviewing(true);
    try {
      const fd = new FormData(form);
      if (!fd.get("userEmail")?.toString().trim()) {
        setPreviewBanner(CLIENT_PICK_REQUIRED);
        return;
      }
      if (!myDashboardImagesReady(slots, quoteUploaderRole)) {
        setPreviewBanner(PREVIEW_ERR.preview_side_incomplete);
        return;
      }
      const res = await fetch("/api/admin/payment-quotes/preview", {
        method: "POST",
        body: fd,
        credentials: "include",
        redirect: "manual",
        headers: quoteDashboardHeader(quoteUploaderRole),
      });

      if (res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
        const loc = res.headers.get("Location") || "";
        let code = "";
        try {
          code = new URL(loc, window.location.origin).searchParams.get("previewError") || "";
        } catch {
          code = "";
        }
        setPreviewBanner(PREVIEW_ERR[code] || "Preview failed. Please try again.");
        return;
      }

      if (res.status === 401) {
        setPreviewBanner("You are not signed in as admin, Processor1, or Processor2.");
        return;
      }

      const html = await res.text();
      if (!res.ok) {
        setPreviewBanner("Preview failed. Please try again.");
        return;
      }

      setPreviewHtml(html);
    } catch {
      setPreviewBanner("Preview failed. Check your connection and try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSendBanner(null);
    const fd0 = new FormData(form);
    if (!fd0.get("userEmail")?.toString().trim()) {
      setSendBanner(CLIENT_PICK_REQUIRED);
      return;
    }
    if (!allFourReady) {
      setSendBanner(SEND_ERR.attachments_incomplete);
      return;
    }
    setSending(true);
    let navigated = false;
    try {
      const res = await fetch(form.action || "/api/admin/payment-quotes/send", {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
        redirect: "follow",
      });

      if (res.redirected && res.url) {
        navigated = true;
        window.location.assign(res.url);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const code = typeof data.error === "string" ? data.error : "request_failed";
      setSendBanner(SEND_ERR[code] || `Send failed (${res.status}). Try again.`);
    } catch {
      setSendBanner("Send failed: check your connection and try again.");
    } finally {
      if (!navigated) setSending(false);
    }
  }

  async function handleSendAll() {
    setSendBanner(null);
    setSendAllBanner(null);
    setSendAllBannerTone("success");
    setSendingAll(true);
    try {
      const res = await fetch("/api/admin/payment-quotes/send-all", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        job?: SendAllJob;
        stackAppend?: boolean;
      };
      if (!res.ok) {
        if (data.error === "busy_with_reminders") {
          setSendAllBanner(
            "Reminder emails are currently running. Send-all quotes will be available once that batch finishes.",
          );
          setSendAllBannerTone("warn");
          setSendingAll(false);
          return;
        }
        setSendAllBanner(
          data.error === "unauthorized"
            ? "Send all failed: you are not signed in as admin, Processor1, or Processor2."
            : "Send all failed. Please try again.",
        );
        setSendAllBannerTone("error");
        setSendingAll(false);
        return;
      }
      const job = data.job ?? null;
      setSendAllJob(job);
      if (!job) {
        setSendAllBanner("Send all started. Refresh to check progress.");
        setSendAllBannerTone("success");
        return;
      }
      if (job.status === "running") {
        if (data.stackAppend) {
          setSendAllBanner(
            `Your latest client list was added to the queue and will send after the current batch finishes. ${sendAllRunningBanner(job)}`,
          );
        } else {
          setSendAllBanner(sendAllRunningBanner(job));
        }
        setSendAllBannerTone("success");
        return;
      }
      if (job.status === "done") {
        setSendAllBanner(`Done. Sent: ${job.sent}, Skipped: ${job.skipped}, Failed: ${job.failed}, Total: ${job.total}.`);
        setSendAllBannerTone("success");
        setSendingAll(false);
        return;
      }
      if (job.status === "error") {
        setSendAllBanner(job.lastError ? `Send all failed: ${job.lastError}` : "Send all failed.");
        setSendAllBannerTone("error");
        setSendingAll(false);
        return;
      }
      setSendingAll(false);
    } catch {
      setSendAllBanner("Send all failed: check your connection and try again.");
      setSendAllBannerTone("error");
      setSendingAll(false);
    }
  }

  async function handleProcessorSave() {
    setSaveSuccess(false);
    const email = committedClientEmail.trim();
    if (!email) {
      setStagingErr(CLIENT_PICK_REQUIRED);
      return;
    }
    setSaving(true);
    try {
      const { ok, slots: fresh } = await refreshStaging(email);
      if (!ok) {
        return;
      }
      if (!myDashboardImagesReady(fresh, quoteUploaderRole)) {
        if (quoteUploaderRole === "processor1" || quoteUploaderRole === "processor2") {
          const uploaded = countProcessorWorkspaceImagesUploaded(fresh, quoteUploaderRole);
          setStagingErr(
            uploaded === 0
              ? "You need to upload at least 2 images for this workspace before you can save."
              : "You have only uploaded 1 image. Upload at least 2 images for this workspace before you can save.",
          );
        } else {
          setStagingErr("Upload both images for this workspace before saving.");
        }
        return;
      }
      setSaveSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  const previewDisabled = previewing || sending || sendingAll || !myDashboardImagesReady(slots, quoteUploaderRole);
  const sendDisabled = previewing || sending || sendingAll || !allFourReady;
  const saveDisabled = saving || uploadingSlot != null || !committedClientEmail.trim();

  return (
    <div className="adminStack" style={{ maxWidth: 760 }}>
      <div className="adminCard">
        <h2>{isProcessorDashboard ? "Quote images" : "Create quote"}</h2>
        {!isProcessorDashboard && previewBanner ? (
          <div className="adminNotice adminNotice--error" style={{ marginBottom: 14 }}>
            <strong className="adminNoticeTitle">Quote preview</strong>
            <p className="adminNoticeBody">{previewBanner}</p>
          </div>
        ) : null}
        {!isProcessorDashboard && sendBanner ? (
          <div className="adminNotice adminNotice--error" style={{ marginBottom: 14 }}>
            <strong className="adminNoticeTitle">Send quote email</strong>
            <p className="adminNoticeBody">{sendBanner}</p>
          </div>
        ) : null}
        {!isProcessorDashboard && sendAllBanner ? (
          <div
            className={
              sendAllBannerTone === "error"
                ? "adminNotice adminNotice--error"
                : sendAllBannerTone === "warn"
                  ? "adminNotice adminNotice--warn"
                  : "adminNotice adminNotice--success"
            }
            style={{ marginBottom: 14 }}
          >
            <strong className="adminNoticeTitle">Send all quote emails</strong>
            <p className="adminNoticeBody">{sendAllBanner}</p>
          </div>
        ) : null}
        {stagingErr ? (
          <div className="adminNotice adminNotice--error" style={{ marginBottom: 14 }}>
            <strong className="adminNoticeTitle">Quote images</strong>
            <p className="adminNoticeBody">{stagingErr}</p>
          </div>
        ) : null}
        <form
          ref={formRef}
          method={isProcessorDashboard ? undefined : "post"}
          action={isProcessorDashboard ? undefined : "/api/admin/payment-quotes/send"}
          className="form"
          onSubmit={(ev) => {
            if (isProcessorDashboard) {
              ev.preventDefault();
              return;
            }
            void handleSend(ev);
          }}
        >
          {hasSupersededStagingRows ? (
            <div className="adminNotice adminNotice--warn" style={{ marginBottom: 14 }}>
              <strong className="adminNoticeTitle">Quote images</strong>
              <p className="adminNoticeBody">
                New resubmission detected
                {activeSubmissionSubmittedAt ? ` (${formatQuoteImagesLastSaved(activeSubmissionSubmittedAt)})` : ""} -
                attachments must be refreshed for this submission before sending.
              </p>
            </div>
          ) : null}
          <label className="adminLabel">
            <strong>Client Name</strong>
            <AdminClientEmailCombobox
              options={submittedClients}
              inputName="userEmail"
              required
              variant="name"
              placeholder="Search by name…"
              onCommittedEmailChange={onCommittedEmailChange}
            />
          </label>
          {!isProcessorDashboard ? (
            <label className="adminLabel">
              <strong>Service fee override (PHP)</strong>
              <input
                type="number"
                name="serviceFeeOverridePhp"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Leave blank to use auto-computed fee"
              />
              <p className="muted" style={{ marginTop: 4, marginBottom: 0, fontSize: 13, lineHeight: 1.45 }}>
                Admin only. When set, this replaces the auto-computed service fee in preview and sent quote emails.
              </p>
            </label>
          ) : null}
          {committedClientEmail.trim() && quoteImagesLastSavedAt ? (
            <p className="muted" style={{ marginTop: 4, marginBottom: 14, fontSize: 13, lineHeight: 1.45 }}>
              Last saved on {formatQuoteImagesLastSaved(quoteImagesLastSavedAt)}.
            </p>
          ) : null}
          {isProcessorDashboard ? (
            <div className="adminFieldset">
              <p className="adminFieldsetTitle">Quote images</p>
              {[1, 2, 3, 4].map((slot) => {
                const { editable, locked } = slotMeta(slot, quoteUploaderRole);
                const row = slots?.find((s) => s.slot === slot);
                const busy = uploadingSlot === slot;

                if (isProcessorDashboard && !editable) {
                  return null;
                }

                if (locked && row?.present) {
                  return (
                    <div key={slot} className="muted adminLabel" style={{ marginBottom: 10 }}>
                      <strong>Image {slot}</strong>
                      <div
                        style={{
                          marginTop: 6,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          fontSize: 13,
                          lineHeight: 1.45,
                        }}
                      >
                        Added by the other processor — you cannot view, change, or download this file from your
                        workspace.
                      </div>
                    </div>
                  );
                }

                return (
                  <label key={slot} className="muted adminLabel">
                    <strong>Image {slot}</strong>
                    {row?.present && row.filename ? (
                      <div style={{ fontSize: 12, marginBottom: 4, color: "#334155" }}>
                        Current: {row.filename}
                      </div>
                    ) : null}
                    {editable && row?.present && slotImageUrls[slot] ? (
                      <div style={{ margin: "0 0 8px" }}>
                        <img
                          src={slotImageUrls[slot]}
                          alt={`Uploaded quote image ${slot}`}
                          style={{
                            display: "block",
                            width: "100%",
                            maxWidth: 320,
                            height: "auto",
                            borderRadius: 8,
                            border: "1px solid #dbe3ef",
                          }}
                        />
                      </div>
                    ) : null}
                    <input
                      ref={(el) => {
                        fileInputRefs.current[slot] = el;
                      }}
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        if (f) void uploadSlot(slot, f);
                      }}
                    />
                    {busy ? <span style={{ marginLeft: 8, fontSize: 12 }}>Uploading…</span> : null}
                  </label>
                );
              })}
            </div>
          ) : null}
          {isProcessorDashboard && saveSuccess ? (
            <div
              className="adminNotice adminNotice--success"
              style={{ marginTop: 12, marginBottom: 10, minHeight: 44, display: "flex", alignItems: "center" }}
            >
              <p className="adminNoticeBody" style={{ margin: 0 }}>
                <strong>Images saved</strong>
              </p>
            </div>
          ) : null}
          <div className="adminActions">
            {isProcessorDashboard ? (
              <button
                type="button"
                className="btn"
                disabled={saveDisabled}
                onClick={() => void handleProcessorSave()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btnSecondary"
                  disabled={previewDisabled}
                  onClick={() => void handlePreview()}
                >
                  {previewing ? "Loading preview…" : "Preview Quote email"}
                </button>
                <button type="submit" className="btn" disabled={sendDisabled}>
                  {sending ? "Sending..." : "Send Quote email"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={previewing || sending || sendingAll}
                  onClick={() => void handleSendAll()}
                >
                  {sendingAll
                    ? `Sending all... ${sendAllJob ? `${sendAllJob.processed}/${sendAllJob.total}` : ""}`
                    : "Send All Quote emails"}
                </button>
              </>
            )}
          </div>
        </form>

        {!isProcessorDashboard && previewHtml ? (
          <div className="adminPreviewWrap" style={{ marginTop: 28 }}>
            <iframe title="Quote email preview" srcDoc={previewHtml} className="adminPreviewFrame" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
