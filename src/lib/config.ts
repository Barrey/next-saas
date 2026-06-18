export const AUTH_CONFIG = {
  // Default expiry time for workspace invitations (in days, defaults to 7)
  invitationExpiryDays: Number(process.env.INVITATION_EXPIRY_DAYS) || 7,
};
