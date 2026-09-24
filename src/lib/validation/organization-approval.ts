import { z } from "zod";
import { employeeSystemRoles } from "@/lib/validation/admin";

export const updateOrgApprovalSchema = z.object({
  adminsCanManageUsers: z.boolean().optional(),
  adminAssignableRoles: z.array(z.enum([...employeeSystemRoles, "CLIENT"])).optional(),
});
