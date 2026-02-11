import PageMeta from "../../components/common/PageMeta";
// import AuthLayout from "./AuthPageLayout"; // Layout gốc – bật lại khi hết Tết
import AuthLayout from "./TetAuthPageLayout";   // 🧧 Layout Tết 2026
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="Reset Password | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Reset Password page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
}

