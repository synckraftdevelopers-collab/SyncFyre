import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "../actions";
export default function ForgotPasswordPage() { return <AuthForm action={forgotPasswordAction} mode="forgot" />; }
