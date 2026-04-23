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
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "sidebar",
    title: "Main Navigation",
    description: "Use the sidebar to move between modules. The menu only shows the sections that your account can access.",
    path: "/dashboard",
    targetSelector: '[data-tour="sidebar-navigation"]',
    placement: "right",
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "pets",
    title: "Animals",
    description: "Create pet profiles, update their information, and open each animal record when you need details.",
    path: "/pets",
    targetSelector: '[data-tour="pets-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "owners",
    title: "Owners",
    description: "Staff can use this page to review pet owners and quickly jump into each owner's animal list.",
    path: "/owners",
    targetSelector: '[data-tour="owners-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic"],
  },
  {
    id: "medical-records",
    title: "Consultations",
    description: "This area stores diagnoses, treatments, prescriptions, and the full medical history for each pet.",
    path: "/medical-records",
    targetSelector: '[data-tour="medical-records-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "vaccinations",
    title: "Vaccination Tracking",
    description: "Use vaccination records to track shots, due dates, and follow-up schedules for every patient.",
    path: "/vaccinations",
    targetSelector: '[data-tour="vaccinations-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "appointments",
    title: "Appointments",
    description: "Book visits, review schedules, and manage the approval status of appointments from this page.",
    path: "/appointments",
    targetSelector: '[data-tour="appointments-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "reports",
    title: "Reports",
    description: "Reports help staff review clinic activity, track trends, and export operational data when needed.",
    path: "/reports",
    targetSelector: '[data-tour="reports-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic"],
  },
  {
    id: "users",
    title: "User Management",
    description: "Administrators can create accounts, update permissions, and manage who can access the system here.",
    path: "/users",
    targetSelector: '[data-tour="users-page"]',
    placement: "bottom",
    roles: ["admin"],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "This page collects reminders, updates, and alerts so you can respond quickly to new activity.",
    path: "/notifications",
    targetSelector: '[data-tour="notifications-page"]',
    placement: "bottom",
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
  {
    id: "settings",
    title: "Settings",
    description: "Clinic settings, operating hours, staff setup, and vaccine database tools are grouped here.",
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
    roles: ["admin", "vet_clinic", "owner", "veterinarian"],
  },
];

export function getTourSteps(user: User | null): TourStep[] {
  if (!user) {
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
