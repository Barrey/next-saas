import { getCurrentUser } from "./server";

export async function requireOrgMember() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!user.organizationId) {
    throw new Error("NoOrganization");
  }
  return user;
}

export async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!user.organizationId || user.role !== "owner") {
    throw new Error("Forbidden");
  }
  return user;
}
