export type TourRole = "GUEST" | "TENANT" | "ADMIN" | "MASTER_ADMIN";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  target?: string;
  view?: string;
  openMenu?: boolean;
};

const ready = (description: string): TourStep => ({
  id: "ready",
  title: "You are ready to use RentWise",
  description
});

export const roleBasedTourSteps: Record<TourRole, TourStep[]> = {
  GUEST: [
    {
      id: "welcome-home",
      title: "A calmer way to manage rentals",
      description: "This home screen introduces RentWise Lite and gives you quick access to sign in or create an account.",
      target: '[data-tour="landing-hero"]'
    },
    {
      id: "features",
      title: "Everything important, clearly organised",
      description: "Explore utility tracking, scoped account access, useful dashboards, and timely status updates.",
      target: '[data-tour="landing-features"]'
    },
    {
      id: "roles",
      title: "Designed for owners and tenants",
      description: "Each account sees only the tools and rental records allowed for its role.",
      target: "#roles"
    },
    {
      id: "account-access",
      title: "Sign in or create your account",
      description: "Use the same secure sign-in for every role. New registrations are available for owners and tenants.",
      target: '[data-tour="landing-auth"]'
    },
    {
      id: "install",
      title: "Use RentWise like an app",
      description: "The install page explains how to add RentWise Lite to your phone for a focused app-like experience.",
      target: '[data-tour="landing-install"]'
    },
    ready("Sign in when you are ready. Your dashboard guide will adapt automatically to your account role.")
  ],
  TENANT: [
    {
      id: "tenant-overview",
      title: "Your rental overview",
      description: "See important rent, bill, document, and verification information at a glance.",
      target: ".welcome-card",
      view: "overview"
    },
    {
      id: "tenant-navigation",
      title: "Your rental workspace",
      description: "Use this menu to move between rent, bills, documents, complaints, notices, receipts, and your calendar.",
      target: ".dashboard-sidebar",
      openMenu: true
    },
    {
      id: "tenant-rent",
      title: "Follow your rent status",
      description: "Review rent amounts, due dates, your reported payment status, and the owner's final verification.",
      target: '[data-tour="rent-section"]',
      view: "rent"
    },
    {
      id: "tenant-bills",
      title: "Track water and electricity",
      description: "Review utility bills, leave a note, and mark whether payment has been made for owner review.",
      target: '[data-tour="bills-section"]',
      view: "bills"
    },
    {
      id: "tenant-documents",
      title: "Keep rental documents together",
      description: "Upload and review agreements or identity documents and follow their verification status.",
      target: '[data-tour="documents-section"]',
      view: "documents"
    },
    {
      id: "tenant-help",
      title: "Help is always close",
      description: "Replay this tutorial whenever you need a refresher. Support and complaint tools remain available in the navigation.",
      target: '[data-tour="guide-replay"]'
    },
    ready("You can now review your records, update payment statuses, and contact your owner with confidence.")
  ],
  ADMIN: [
    {
      id: "admin-overview",
      title: "Your owner dashboard",
      description: "Monitor tenants, rent, utility bills, documents, and items waiting for your review.",
      target: ".welcome-card",
      view: "overview"
    },
    {
      id: "admin-navigation",
      title: "Manage every workflow",
      description: "The main menu connects tenant management, rent tracking, utility records, documents, notices, receipts, and analytics.",
      target: ".dashboard-sidebar",
      openMenu: true
    },
    {
      id: "admin-tenants",
      title: "Manage your tenants",
      description: "Create tenant accounts, review connected renters, and safely edit or remove records that belong to you.",
      target: '[data-tour="tenants-section"]',
      view: "tenants"
    },
    {
      id: "admin-rent",
      title: "Track rent collection",
      description: "Add rent records and compare tenant-reported payment status with your final verification.",
      target: '[data-tour="rent-section"]',
      view: "rent"
    },
    {
      id: "admin-bills",
      title: "Review utility payments",
      description: "Add water or electricity bills and verify, reject, waive, or flag tenant payment claims.",
      target: '[data-tour="bills-section"]',
      view: "bills"
    },
    {
      id: "admin-analytics",
      title: "Understand your portfolio",
      description: "Analytics summarise your properties, tenants, payment states, and operational attention items.",
      target: '[data-tour="analytics-section"]',
      view: "analytics"
    },
    {
      id: "admin-records",
      title: "Protected record management",
      description: "Destructive actions require confirmation and remain restricted to records inside your account.",
      target: ".cleanup-panel",
      view: "overview"
    },
    ready("Your owner workspace is ready. Use the guide button in the top bar whenever you want to replay this tour.")
  ],
  MASTER_ADMIN: [
    {
      id: "master-overview",
      title: "Your Master Admin command center",
      description: "See platform-wide owner, tenant, property, rent, bill, document, and support information.",
      target: '[data-tour="master-overview"]',
      view: "overview"
    },
    {
      id: "master-navigation",
      title: "Platform-wide controls",
      description: "Move between owner governance, all tenants, analytics, live usage, support, activity logs, and deleted records.",
      target: ".dashboard-sidebar",
      openMenu: true
    },
    {
      id: "master-owners",
      title: "Govern owner accounts",
      description: "Review owner registrations, approve or block access, and inspect activity across the rental network.",
      target: '[data-tour="owners-section"]',
      view: "owners"
    },
    {
      id: "master-tenants",
      title: "See every tenant safely",
      description: "Review tenants across all owners while preserving the application's role and ownership boundaries.",
      target: '[data-tour="master-tenants-section"]',
      view: "master-tenants"
    },
    {
      id: "master-analytics",
      title: "Platform analytics",
      description: "Use global charts and operational summaries to understand adoption and rental activity.",
      target: '[data-tour="analytics-section"]',
      view: "analytics"
    },
    {
      id: "master-live",
      title: "Live website and app usage",
      description: "Monitor first-party visitor, device, session, install, launch, and guided-tour activity.",
      target: '[data-tour="live-usage-section"]',
      view: "usage"
    },
    {
      id: "master-security",
      title: "Audit and recovery controls",
      description: "Activity logs and deleted records provide accountability for sensitive management actions.",
      target: '[data-tour="activity-section"]',
      view: "activity"
    },
    {
      id: "master-deleted",
      title: "Recover deleted records",
      description: "Review protected deletion history and restore eligible records without weakening the permanent audit trail.",
      target: '[data-tour="deleted-section"]',
      view: "deleted"
    },
    ready("The platform command center is ready. All privileged actions remain protected and auditable.")
  ]
};
