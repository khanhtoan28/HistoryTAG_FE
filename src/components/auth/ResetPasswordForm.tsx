import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { resetPassword, pickErrMsg, pickFieldErrors } from "../../api/auth.api";
import toast from "react-hot-toast";

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    token: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setForm((prev) => ({ ...prev, token: tokenFromUrl }));
    }
  }, [searchParams]);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!form.token.trim()) {
      errors.token = "Mã xác nhận không được để trống";
    }

    if (!form.newPassword) {
      errors.newPassword = "Mật khẩu mới không được để trống";
    } else if (form.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Xác nhận mật khẩu không được để trống";
    } else if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = "Mật khẩu không khớp";
    }

    return errors;
  };

  const onChange =
    (key: "token" | "newPassword" | "confirmPassword") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      if (fieldErr[key]) setFieldErr((prev) => ({ ...prev, [key]: "" }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setFieldErr({});

    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErr(errors);
      setErr("Vui lòng kiểm tra lại thông tin đã nhập.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token: form.token.trim(),
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      toast.success("Đặt lại mật khẩu thành công!");
      navigate("/signin");
    } catch (ex: any) {
      const fe = pickFieldErrors(ex);
      const errorMsg = pickErrMsg(ex);
      if (Object.keys(fe).length) setFieldErr(fe);
      setErr(errorMsg);
      toast.error(errorMsg || "Đặt lại mật khẩu thất bại!");
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
    <div className="flex flex-col w-full text-white min-h-screen justify-center items-center">
      <div className="w-full max-w-[700px] px-6">
        <div className="mb-6 text-center sm:text-left">
          <h1 className="mb-2 font-semibold text-white text-[28px] sm:text-3xl">
            Đặt lại mật khẩu
          </h1>
          <p className="mt-2 text-white/80">
            Nhập mật khẩu mới của bạn
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {err && (
            <div className="text-sm text-red-600 bg-red-100/80 border border-red-300 rounded p-2">
              {err}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-white">
              Mã xác nhận <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Nhập mã xác nhận"
              value={form.token}
              onChange={onChange("token")}
              aria-invalid={!!fieldErr.token}
              aria-describedby="token-error"
              className={`${FIELD_CLASS} ${fieldErr.token ? errorStyle : normalStyle}`}
            />
            {fieldErr.token && (
              <p id="token-error" className="text-sm text-red-400">
                {fieldErr.token}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white">
              Mật khẩu mới <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu mới"
                value={form.newPassword}
                onChange={onChange("newPassword")}
                autoComplete="new-password"
                aria-invalid={!!fieldErr.newPassword}
                aria-describedby="password-error"
                className={`${FIELD_CLASS} ${fieldErr.newPassword ? errorStyle : normalStyle}`}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-300 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-300 size-5" />
                )}
              </span>
            </div>
            {fieldErr.newPassword && (
              <p id="password-error" className="text-sm text-red-400">
                {fieldErr.newPassword}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={form.confirmPassword}
                onChange={onChange("confirmPassword")}
                autoComplete="new-password"
                aria-invalid={!!fieldErr.confirmPassword}
                aria-describedby="confirm-password-error"
                className={`${FIELD_CLASS} ${fieldErr.confirmPassword ? errorStyle : normalStyle}`}
              />
              <span
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPassword ? (
                  <EyeIcon className="fill-gray-300 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-300 size-5" />
                )}
              </span>
            </div>
            {fieldErr.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-red-400">
                {fieldErr.confirmPassword}
              </p>
            )}
          </div>

          <div>
            <Button
              className="w-full py-3 text-base font-medium text-white transition rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </Button>
          </div>
        </form>

        <div className="mt-5 text-center sm:text-left">
          <button
            onClick={() => navigate("/signin")}
            className="text-sm text-blue-300 hover:text-blue-200 underline"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}

