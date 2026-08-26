import { AuthForm } from "@/components/auth/auth-form";
import { registerAction } from "../actions";

export default function RegisterPage() {
  return <AuthForm action={registerAction} mode="register" />;
}
