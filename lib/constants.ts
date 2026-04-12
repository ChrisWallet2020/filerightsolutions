// lib/constants.ts

export const ORDER_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  REFUNDED: "REFUNDED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const EMAIL_TYPE = {
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  UPLOAD_REQUEST_INITIAL: "UPLOAD_REQUEST_INITIAL",
  UPLOAD_REMINDER_1: "UPLOAD_REMINDER_1",
  UPLOAD_REMINDER_2: "UPLOAD_REMINDER_2",
  DOCUMENTS_RECEIVED: "DOCUMENTS_RECEIVED",
  WORK_STARTED: "WORK_STARTED",
  COMPLETION: "COMPLETION",
  REFUND_APPROVED: "REFUND_APPROVED",
  /** Filing-processed notice; sent once when a quoted-billing order is paid (see PayMongo/Dragonpay webhooks). */
  FILING_COMPLETE_NOTIFY: "FILING_COMPLETE_NOTIFY",
} as const;

export type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE];