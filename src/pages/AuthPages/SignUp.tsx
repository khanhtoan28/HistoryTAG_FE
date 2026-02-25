import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout"; // Layout gốc – bật lại khi hết Tết
// import AuthLayout from "./TetAuthPageLayout";   // 🧧 Layout Tết 2026
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Quản lý công việc | TAGTECH"
        description="This is React.js SignUp Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
