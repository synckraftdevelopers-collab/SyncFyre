import { notFound } from "next/navigation";
import { Bell, CalendarDays, ChartNoAxesCombined, Dumbbell, Gauge, ShieldCheck, UserRoundCog, UsersRound, Utensils, Wrench } from "lucide-react";
import { ModuleOverview, type ModuleConfig } from "@/components/modules/module-overview";

const modules: Record<string, ModuleConfig> = {
  memberships: { title: "Memberships", description: "Configure plans, activate subscriptions, and manage renewals.", icon: ShieldCheck, action: "Create plan", features: [
    { title: "Flexible plans", description: "Offer 1, 3, 6, 8, and 12-month plans with GST, discounts, and features." },
    { title: "Automatic dates", description: "Calculate subscription end dates and remaining days consistently." },
    { title: "Renewal history", description: "Preserve a complete audit trail for renewals, extensions, and status changes." },
  ]},
  appointments: { title: "Appointments", description: "Coordinate member sessions with trainers and health professionals.", icon: CalendarDays, action: "Book appointment", features: [
    { title: "Trainer sessions", description: "Schedule and approve one-to-one trainer sessions." }, { title: "Health consultations", description: "Book dietician and physiotherapist consultations." }, { title: "Status workflow", description: "Track pending, approved, completed, and cancelled bookings." },
  ]},
  trainers: { title: "Trainers", description: "Manage profiles, specializations, schedules, and assigned members.", icon: UserRoundCog, action: "Add trainer", features: [
    { title: "Trainer profiles", description: "Store experience, certifications, salary, and specialization." }, { title: "Member assignments", description: "Connect members with the right trainer and track assignment history." }, { title: "Daily schedules", description: "See appointments, attendance, and workout responsibilities." },
  ]},
  workouts: { title: "Workout management", description: "Build structured programs and assign them to members.", icon: Dumbbell, action: "Create workout", features: [
    { title: "Exercise library", description: "Organize exercises into reusable workout categories." }, { title: "Training details", description: "Configure sets, reps, weight, cardio, and rest intervals." }, { title: "Trainer guidance", description: "Record notes and adapt plans as members progress." },
  ]},
  "diet-plans": { title: "Diet plans", description: "Create practical meal and macro plans for members.", icon: Utensils, action: "Create diet plan", features: [
    { title: "Daily meals", description: "Plan breakfast, lunch, dinner, and snacks." }, { title: "Macro targets", description: "Track calories, protein, carbohydrates, fat, and water." }, { title: "Member access", description: "Members securely see only their assigned nutrition plan." },
  ]},
  progress: { title: "Progress tracking", description: "Measure outcomes with consistent monthly check-ins.", icon: Gauge, action: "Record progress", features: [
    { title: "Body metrics", description: "Capture weight, BMI, body fat, muscle mass, and measurements." }, { title: "Progress photos", description: "Store private progress images in protected Supabase Storage." }, { title: "Trend charts", description: "Visualize changes and celebrate measurable improvement." },
  ]},
  // payments is handled by the dedicated /payments route
  staff: { title: "Staff management", description: "Manage reception, trainers, managers, dieticians, and admins.", icon: UsersRound, action: "Add staff", features: [
    { title: "Roles & permissions", description: "Apply least-privilege access based on each staff role." }, { title: "Attendance & leave", description: "Track staff presence and leave balances." }, { title: "Compensation", description: "Maintain salary and employment information securely." },
  ]},
  equipment: { title: "Equipment", description: "Keep every machine safe, available, and maintained on time.", icon: Wrench, action: "Add equipment", features: [
    { title: "Asset register", description: "Track category, serial number, purchase date, and warranty." }, { title: "Maintenance schedule", description: "Plan service dates and receive due-date reminders." }, { title: "Service history", description: "Record vendors, costs, work completed, and future service dates." },
  ]},
  reports: { title: "Reports", description: "Turn operational data into decisions and exportable records.", icon: ChartNoAxesCombined, action: "Generate report", features: [
    { title: "Revenue & payments", description: "Analyze collections, balances, and payment channels." }, { title: "Members & attendance", description: "Understand retention, growth, visits, and peak hours." }, { title: "Operations", description: "Report on trainers, appointments, and memberships." },
  ]},
  notifications: { title: "Notifications", description: "Manage system alerts and multichannel communication.", icon: Bell, action: "New notification", features: [
    { title: "Membership reminders", description: "Automated expiry reminders at 15, 7, 3, and 1 days." }, { title: "Operational alerts", description: "Send payment, appointment, birthday, and maintenance reminders." }, { title: "Future-ready channels", description: "Dashboard, email, SMS, and WhatsApp provider adapters." },
  ]},
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const config = modules[(await params).module];
  if (!config) notFound();
  const actionHref = (await params).module === "reports" ? "/api/reports?resource=members" : `/${(await params).module}/new`;
  return <ModuleOverview config={config} actionHref={actionHref}/>;
}
