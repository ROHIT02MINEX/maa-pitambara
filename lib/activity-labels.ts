/**
 * Human-readable names for audit-log actions. Kept free of `server-only`
 * imports so both server and client components can use it.
 */
const LABELS: Record<string, string> = {
  "user.signup": "Account created",
  "user.login": "Signed in",
  "user.login_failed": "Failed sign-in attempt",
  "user.logout": "Signed out",
  "user.email_verified": "E-mail verified",
  "user.password_reset_requested": "Password reset requested",
  "user.password_reset": "Password reset completed",
  "user.password_changed": "Password changed",
  "user.profile_created": "Profile completed",
  "user.profile_updated": "Profile updated",
  "pdf.viewed": "Opened a document",
  "pdf.bookmarked": "Bookmarked a document",
  "pdf.unbookmarked": "Removed a bookmark",
  "retest.requested": "Requested a retest",
  "retest.approved": "Approved a retest request",
  "retest.rejected": "Rejected a retest request",
  "test.started": "Started a test",
  "test.submitted": "Submitted a test",
  "test.auto_submitted": "Test auto-submitted (time up)",
  "admin.pdf_created": "Published a document",
  "admin.pdf_updated": "Updated a document",
  "admin.pdf_deleted": "Deleted a document",
  "admin.question_created": "Added a question",
  "admin.question_updated": "Updated a question",
  "admin.question_deleted": "Deleted a question",
  "admin.questions_imported": "Imported questions",
  "admin.user_updated": "Updated a user",
  "admin.user_deleted": "Deleted a user",
  "admin.user_disabled": "Disabled a user",
  "admin.user_enabled": "Enabled a user",
  "admin.user_password_reset": "Issued a password reset",
  "admin.export": "Exported a report",
};

export function activityLabel(action: string): string {
  return LABELS[action] ?? action.replace(/[._]/g, " ");
}
