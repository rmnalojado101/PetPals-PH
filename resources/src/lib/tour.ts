import type { User, UserRole } from "@/types";

export type TourPlacement = "top" | "right" | "bottom" | "left" | "center";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  path: string;
  targetSelector: string;
  placement?: TourPlacement;
  roles: UserRole[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description: "This is your home screen. Use it to monitor daily activity, recent updates, and the most important clinic numbers.",
    path: "/dashboard",
    targetSelector: '[data-tour="dashboard-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "sidebar",
    title: "Main Navigation",
    description: "Use the sidebar to move between modules. The menu only shows the sections that your account can access.",
    path: "/dashboard",
    targetSelector: '[data-tour="sidebar-navigation"]',
    placement: "right",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "pets",
    title: "Animals",
    description: "Create pet profiles, update their information, and open each animal record when you need details.",
    path: "/pets",
    targetSelector: '[data-tour="pets-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "owners",
    title: "Owners",
    description: "Staff can use this page to review pet owners and quickly jump into each owner's animal list.",
    path: "/owners",
    targetSelector: '[data-tour="owners-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "receptionist"],
  },
  {
    id: "medical-records",
    title: "Medical Records & Attachments",
    description: "Store diagnoses, treatments, and prescriptions. You can now upload PDF or Image attachments directly to the record for easy retrieval.",
    path: "/medical-records",
    targetSelector: '[data-tour="medical-records-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "vaccinations",
    title: "Vaccinations",
    description: "Track shots and due dates. Check out the 'Vaccination Reports' to see upcoming and overdue shots across the entire clinic.",
    path: "/vaccinations",
    targetSelector: '[data-tour="vaccinations-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "billing",
    title: "Billing & Ledger",
    description: "Manage invoices and payments. Owners can upload Proof of Payment (images/PDFs) which you can review and approve here.",
    path: "/billing",
    targetSelector: '[data-tour="billing-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "receptionist"],
  },
  {
    id: "appointments",
    title: "Appointments",
    description: "Book visits and manage the clinic schedule. Appointments automatically generate billing drafts when completed.",
    path: "/appointments",
    targetSelector: '[data-tour="appointments-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "reports",
    title: "Advanced Analytics",
    description: "Review clinic activity, track revenue trends, and export professional reports in CSV or PDF format.",
    path: "/reports",
    targetSelector: '[data-tour="reports-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "receptionist"],
  },
  {
    id: "users",
    title: "User Management",
    description: "Manage accounts for staff, veterinarians, and owners. Roles ensure everyone only sees what they need to.",
    path: "/users",
    targetSelector: '[data-tour="users-page"]',
    placement: "bottom",
    roles: ["admin"],
  },
  {
    id: "notifications",
    title: "Smart Notifications",
    description: "Stay updated with real-time alerts for new appointments, payment submissions, and medical updates.",
    path: "/notifications",
    targetSelector: '[data-tour="notifications-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
  {
    id: "settings",
    title: "Clinic & Vaccine Setup",
    description: "Configure clinic details, operating hours, and your Vaccine Database with batch tracking and expiration alerts.",
    path: "/settings",
    targetSelector: '[data-tour="settings-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic"],
  },
  {
    id: "account",
    title: "Account Menu",
    description: "Open this menu for your profile, account actions, and to restart the tour any time you need a refresher.",
    path: "/dashboard",
    targetSelector: '[data-tour="header-account"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian", "receptionist"],
  },
];

export function getTourSteps(user: User | null): TourStep[] {
  if (!user || user.role === 'admin') {
    return [];
  }

  return TOUR_STEPS.filter((step) => step.roles.includes(user.role));
}

export function getTourStorageKey(user: User | null): string | null {
  if (!user) {
    return null;
  }

  return `petpals-tour-complete:${user.id}:${user.role}`;
}
