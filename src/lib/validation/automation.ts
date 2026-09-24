import { z } from "zod";
import { TRIGGER_EVENTS, ACTION_TYPES } from "@/lib/automations/engine";

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(120),
  triggerEvent: z.enum(TRIGGER_EVENTS),
  actionType: z.enum(ACTION_TYPES),
  // Free-form JSON config for the single action this simple UI creates, e.g. { "userId": "..." } or { "userIds": [...] } or { "title": "..." }.
  actionConfig: z.record(z.string(), z.unknown()),
});

export const updateAutomationRuleSchema = z.object({
  isActive: z.boolean(),
});
