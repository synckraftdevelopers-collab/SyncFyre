import { AuthForm } from "@/components/auth/auth-form";
import { resetPasswordAction } from "../actions";
export default function ResetPasswordPage() { return <AuthForm action={resetPasswordAction} mode="reset" />; }
