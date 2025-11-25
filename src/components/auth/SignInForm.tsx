import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { signIn, normalizeRoles, pickErrMsg, getUserAccount } from "../../api/auth.api";
import api from "../../api/client";
import toast from "react-hot-toast";
import { useNotification } from "../../context/NotificationContext";

type FormErrors = {
  username?: string | null;
  password?: string | null;
};

export default function SignInForm() {
  const navigate = useNavigate();
  const { clearNotifications, loadNotifications } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange =
    (k: "username" | "password") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setForm((s) => ({ ...s, [k]: value }));
        // validate realtime từng field
        setErrors((prev) => ({ ...prev, [k]: validateField(k, value) }));
      };

  // --- VALIDATION ---
  const validateField = (
    k: "username" | "password",
    value: string
  ): string | null => {
    if (k === "username") {
      if (!value.trim()) return "Tên đăng nhập là bắt buộc";
      if (value.length < 6) return "Tên đăng nhập phải từ 6 ký tự";
      if (!/^[a-zA-Z0-9]+$/.test(value))
        return "Chỉ dùng chữ và số, không có khoảng trắng/ký tự đặc biệt";
      return null;
    }
    if (k === "password") {
      if (!value) return "Mật khẩu là bắt buộc";
      if (value.length < 8) return "Mật khẩu phải từ 8 ký tự";
      return null;
    }
    return null;
  };

  const validateForm = (): boolean => {
    const usernameErr = validateField("username", form.username);
    const passwordErr = validateField("password", form.password);
    const nextErrors: FormErrors = { username: usernameErr, password: passwordErr };
    setErrors(nextErrors);
    // có lỗi nào thì không cho submit
    return !usernameErr && !passwordErr;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    // chặn submit khi form chưa hợp lệ
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 🔹 Clear all old user data AND notifications first to prevent cache conflicts
      clearNotifications();
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("username");
      localStorage.removeItem("roles");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("roles");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("userId");

      const data = await signIn({
        username: form.username.trim(),
        password: form.password,
      });

      // 🔹 Store new user data
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("access_token", data.accessToken);
      storage.setItem("username", data.username);
      storage.setItem("roles", JSON.stringify(normalizeRoles(data.roles)));
      if (data.userId != null) storage.setItem("userId", String(data.userId));

      // 🔹 Fetch and persist full user profile BEFORE redirect
      api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
      
      try {
        if (data.userId != null) {
          const profile = await getUserAccount(Number(data.userId));
          storage.setItem("user", JSON.stringify(profile));
          console.log("User profile fetched and stored:", profile.team, profile.roles);
          
          // 🔹 Load new user's notifications
          await loadNotifications(20);
        }
      } catch (err) {
        console.warn("Could not fetch user profile after sign-in:", err);
        // Continue anyway - some pages will fetch on demand
      }

      toast.success("Đăng nhập thành công!");
      
      // Redirect based on user role
      const roles = normalizeRoles(data.roles);
      const isSuperAdmin = roles.some((role: string) => role === "SUPERADMIN" || role === "SUPER_ADMIN" || role === "Super Admin");
      
      if (isSuperAdmin) {
        navigate("/superadmin/home");
      } else {
        navigate("/home");
      }
    } catch (err: unknown) {
      // lỗi từ BE (sai tài khoản/mật khẩu, v.v…)
      const errorMsg = pickErrMsg(err);
      setErr(errorMsg);
      toast.error(errorMsg || "Đăng nhập thất bại!");
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
          {/* Animated flame/logo */}
          <div className="flex-none">
            <div className="flame-logo" aria-hidden />
          </div>
          <div>
            <h1 className="mb-2 font-semibold text-white text-[28px] sm:text-3xl">
              Đăng nhập
            </h1>
            <p className="text-sm text-blue-100/80">Đăng nhập để tiếp tục trải nghiệm</p>
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
              Tên đăng nhập <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Nhập tên đăng nhập"
              value={form.username}
              onChange={onChange("username")}
              onBlur={() => {
                setErrors((prev: FormErrors) => ({
                  ...prev,
                  username: validateField("username", form.username),
                }));
              }}
              autoComplete="username"
              aria-invalid={!!errors.username}
              aria-describedby="username-error"
              className={`${FIELD_CLASS} ${errors.username ? errorStyle : normalStyle}`}
            />
            {errors.username && (
              <p id="username-error" className="text-sm text-red-400">
                {errors.username}
              </p>
            )}
          </div>

          <div className="space-y-2 field-row group">
            <Label className="text-white">
              Mật khẩu <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={onChange("password")}
                onBlur={() => {
                  setErrors((prev: FormErrors) => ({
                    ...prev,
                    // ✅ set đúng vào errors.password (trước đây gán nhầm username)
                    password: validateField("password", form.password),
                  }));
                }}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby="password-error"
                className={`${FIELD_CLASS} ${errors.password ? errorStyle : normalStyle}`}
              />

              {/* 👇 icon đổi sang màu xám để nhìn rõ */}
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
            {errors.password && (
              <p id="password-error" className="text-sm text-red-400">
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between field-row group">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Checkbox
                checked={remember}
                onChange={(e: React.ChangeEvent<HTMLInputElement> | boolean) => {
                  if (typeof e === "boolean") setRemember(e);
                  else setRemember(e.target.checked);
                }}
                className="w-5 h-5"
              />
              <span className="block font-normal text-white text-[14px]">
                Ghi nhớ đăng nhập
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="text-sm text-blue-300 hover:text-blue-200 underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div>
            <Button
              className="neon-btn w-full py-3 text-base font-semibold rounded-lg disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </div>
          </form>
  </div>

        {/* <div className="mt-5 text-center">
          <p className="text-sm font-normal text-center text-white/90">
            Chưa có tài khoản?{' '}
            <Link to="/signup" className="underline text-blue-200 hover:text-white">
              Đăng ký
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
}
