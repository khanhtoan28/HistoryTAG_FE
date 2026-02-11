import PageMeta from "../../components/common/PageMeta";
// import AuthLayout from "./AuthPageLayout"; // Layout gốc – bật lại khi hết Tết
import AuthLayout from "./TetAuthPageLayout";   // 🧧 Layout Tết 2026
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <>
      <PageMeta
        title="Forgot Password | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Forgot Password page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
}

