import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout"; // Layout gốc – bật lại khi hết Tết
// import AuthLayout from "./TetAuthPageLayout";   // 🧧 Layout Tết 2026
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Quản lý công việc | TAGTECH"
        description="This is React.js SignIn Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
