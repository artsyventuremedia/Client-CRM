import { z } from "zod";

export const appointmentTypeValues = ["ONLINE", "OFFLINE", "PHONE", "VIDEO_CONFERENCE"] as const;

export const appointmentStatusValues = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

export const createAppointmentSchema = z
  .object({
    title: z.string().min(1).max(200),
    clientId: z.string().optional(),
    agenda: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    type: z.enum(appointmentTypeValues).optional().default("ONLINE"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    location: z.string().max(300).optional(),
    meetingUrl: z.string().url().optional().or(z.literal("")),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const updateAppointmentSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    clientId: z.string().optional(),
    agenda: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    type: z.enum(appointmentTypeValues).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    location: z.string().max(300).optional(),
    meetingUrl: z.string().url().optional().or(z.literal("")),
    status: z.enum(appointmentStatusValues).optional(),
  })
  .refine((data) => !(data.startTime && data.endTime) || data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
