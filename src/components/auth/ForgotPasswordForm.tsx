import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { forgotPassword, pickErrMsg, pickFieldErrors } from "../../api/auth.api";
import toast from "react-hot-toast";

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return "Email không được để trống";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Email không hợp lệ";
    return null;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (fieldErr.email) setFieldErr((prev) => ({ ...prev, email: "" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setFieldErr({});

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErr({ email: emailError });
      setErr("Vui lòng kiểm tra lại email đã nhập.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      toast.success("Email khôi phục mật khẩu đã được gửi!");
      // Tự động chuyển sang trang reset password
      navigate("/reset-password");
    } catch (ex: unknown) {
      const e = ex as any;
      const fe = pickFieldErrors(e);
      const errorMsg = pickErrMsg(e);
      if (Object.keys(fe).length) setFieldErr(fe);
      setErr(errorMsg);
      toast.error(errorMsg || "Gửi email thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const FIELD_CLASS =
    "w-full h-12 px-5 text-[16px] font-medium text-gray-900 placeholder-gray-500 rounded-lg border";

  const errorStyle =
    "border-red-500 ring-2 ring-red-400/30 focus:ring-red-400/50";
  const normalStyle =
    "border-gray-200 focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400";

  return (
    <div className="auth-bg flex flex-col w-full text-white min-h-screen justify-center items-center py-12">
      <div className="w-full max-w-[720px] px-6">
        <div className="mb-6 text-center sm:text-left flex items-center gap-4">
          <div className="flex-none">
            <div className="flame-logo" aria-hidden />
          </div>
          <div>
            <h1 className="mb-2 font-semibold text-white text-[28px] sm:text-3xl">
              Quên mật khẩu
            </h1>
            <p className="mt-2 text-blue-100/80">
              Nhập email của bạn để nhận link đặt lại mật khẩu
            </p>
          </div>
        </div>

        <div className="auth-card mx-auto bg-white/6 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl">
          <form onSubmit={onSubmit} noValidate className="space-y-5">
          {err && (
            <div className="text-sm text-red-600 bg-red-100/80 border border-red-300 rounded p-2">
              {err}
            </div>
          )}

          <div className="space-y-2 field-row group">
            <Label className="text-white">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={onChange}
              onBlur={() => {
                setFieldErr((prev) => ({
                  ...prev,
                  email: validateEmail(email) || "",
                }));
              }}
              autoComplete="email"
              aria-invalid={!!fieldErr.email}
              aria-describedby="email-error"
              className={`${FIELD_CLASS} ${fieldErr.email ? errorStyle : normalStyle}`}
            />
            {fieldErr.email && (
              <p id="email-error" className="text-sm text-red-400">
                {fieldErr.email}
              </p>
            )}
          </div>

          <div>
            <Button
              className="neon-btn w-full py-3 text-base font-semibold rounded-lg disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? "Đang gửi..." : "Gửi email"}
            </Button>
          </div>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link
            to="/signin"
            className="text-sm text-blue-200 hover:text-white underline"
          >
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

