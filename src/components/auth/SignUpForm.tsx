import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { signUp, pickErrMsg, pickFieldErrors } from "../../api/auth.api";

type FormState = {
  username: string;
  email: string;
  fullName: string;
  address: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

const RE_USERNAME = /^[a-zA-Z0-9]{6,100}$/;
const RE_PHONE = /^\d{10,11}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpForm() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // 👈 thêm state cho confirm password
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    fullName: "",
    address: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const validate = (v: FormState) => {
    const e: Record<string, string> = {};
    const n = {
      username: v.username.trim(),
      email: v.email.trim(),
      fullName: v.fullName.trim(),
      address: v.address.trim(),
      phoneNumber: v.phoneNumber.trim(),
      password: v.password,
      confirmPassword: v.confirmPassword,
    };

    if (!n.username) e.username = "Tên đăng nhập không được để trống";
    else if (n.username.length < 6 || n.username.length > 100)
      e.username = "Tên đăng nhập phải từ 6 đến 100 ký tự";
    else if (!RE_USERNAME.test(n.username))
      e.username = "Tên đăng nhập chỉ được chứa chữ và số";

    if (!n.email) e.email = "Email không được để trống";
    else if (!RE_EMAIL.test(n.email)) e.email = "Email không hợp lệ";

    if (!n.fullName) e.fullName = "Họ và tên không được để trống";
    if (!n.address) e.address = "Địa chỉ không được để trống";

    if (n.phoneNumber && !RE_PHONE.test(n.phoneNumber))
      e.phoneNumber = "Số điện thoại phải có 10–11 chữ số";

    if (!n.password) e.password = "Mật khẩu không được để trống";
    else if (n.password.length < 8)
      e.password = "Mật khẩu phải có ít nhất 8 ký tự";

    if (!n.confirmPassword)
      e.confirmPassword = "Vui lòng nhập lại mật khẩu xác nhận";
    else if (n.password !== n.confirmPassword)
      e.confirmPassword = "Mật khẩu và xác nhận không khớp";

    return e;
  };

  const on =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (k === "username") val = val.replace(/\s/g, "");
      if (k === "phoneNumber") val = val.replace(/[^\d]/g, "");
      setForm((s) => ({ ...s, [k]: val }));
      if (fieldErr[k]) setFieldErr((fe) => ({ ...fe, [k]: "" }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setErr(null);
    setFieldErr({});

    if (!agree) {
      setErr("Bạn cần đồng ý với điều khoản để tiếp tục.");
      return;
    }

    const local = validate(form);
    if (Object.keys(local).length) {
      setFieldErr(local);
      setErr("Vui lòng kiểm tra lại thông tin đã nhập.");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });
      setBanner("Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập...");
      setTimeout(() => navigate("/signin"), 800);
    } catch (ex: any) {
      const fe = pickFieldErrors(ex);
      if (Object.keys(fe).length) setFieldErr(fe);
      setErr(pickErrMsg(ex));
    } finally {
      setLoading(false);
    }
  };

  const FIELD_CLASS =
    "w-full h-12 px-5 text-[16px] font-medium text-gray-900 placeholder-gray-500 dark:text-gray-900 dark:placeholder-gray-500 rounded-lg";

  return (
    <div className="flex flex-col w-full text-white">
      <div className="w-full">
        <div className="w-full max-w-[2000px] mx-auto px-6 min-w-0">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-white text-3xl">
              Đăng ký tài khoản
            </h1>
            <p className="text-sm text-white/80">
              Vui lòng điền đầy đủ thông tin bên dưới để tạo tài khoản mới.
            </p>
          </div>

          <form noValidate onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-12 gap-x-8 gap-y-6 items-start">
              {(banner || err) && (
                <div className="col-span-12 space-y-3">
                  {banner && (
                    <div className="text-sm text-green-700 bg-green-100 border border-green-300 rounded p-2">
                      {banner}
                    </div>
                  )}
                  {err && (
                    <div className="text-sm text-red-600 bg-red-100 border border-red-300 rounded p-2">
                      {err}
                    </div>
                  )}
                </div>
              )}

              {/* Hàng 1 */}
              <div className="col-span-12 lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-white">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nhập tên đăng nhập"
                  value={form.username}
                  onChange={on("username")}
                  autoComplete="username"
                  error={!!fieldErr.username}
                  hint={fieldErr.username}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="col-span-12 lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-white">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="Nhập email"
                  value={form.email}
                  onChange={on("email")}
                  autoComplete="email"
                  error={!!fieldErr.email}
                  hint={fieldErr.email}
                  className={FIELD_CLASS}
                />
              </div>

              {/* Hàng 2 */}
              <div className="col-span-12 lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-white">
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nhập họ và tên"
                  value={form.fullName}
                  onChange={on("fullName")}
                  autoComplete="name"
                  error={!!fieldErr.fullName}
                  hint={fieldErr.fullName}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="col-span-12 lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-white">Số điện thoại</Label>
                <Input
                  placeholder="Nhập số điện thoại"
                  value={form.phoneNumber}
                  onChange={on("phoneNumber")}
                  autoComplete="tel"
                  inputMode="numeric"
                  error={!!fieldErr.phoneNumber}
                  hint={fieldErr.phoneNumber || "Có thể bỏ trống."}
                  className={FIELD_CLASS}
                />
              </div>

              {/* Hàng 3 */}
              <div className="col-span-12 space-y-2 min-w-0">
                <Label className="text-white">
                  Địa chỉ <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Số nhà, đường, phường, quận..."
                  value={form.address}
                  onChange={on("address")}
                  autoComplete="street-address"
                  error={!!fieldErr.address}
                  hint={fieldErr.address}
                  className={FIELD_CLASS}
                />
              </div>

             {/* Mật khẩu */}
              <div className="col-span-12 lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-white">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Nhập mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={on("password")}
                    autoComplete="new-password"
                    error={!!fieldErr.password}
                    hint={fieldErr.password}
                    className={FIELD_CLASS}
                  />
                  {/* 👇 icon màu xám nhạt */}
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-300 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-300 size-5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="col-span-12 lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-white">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Nhập lại mật khẩu"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={on("confirmPassword")}
                    autoComplete="new-password"
                    error={!!fieldErr.confirmPassword}
                    hint={fieldErr.confirmPassword}
                    className={FIELD_CLASS}
                  />
                  {/* 👇 thêm icon mắt riêng cho confirm password */}
                  <span
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="fill-gray-300 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-300 size-5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Checkbox + nút đăng ký + link giữ nguyên */}
              <div className="col-span-12">
                <div className="flex items-start gap-3 flex-wrap">
                  <Checkbox
                    className="w-5 h-5 mt-1"
                    checked={agree}
                    onChange={(v: any) =>
                      setAgree(typeof v === "boolean" ? v : v?.target?.checked)
                    }
                  />
                  <p className="text-white text-sm break-words">
                    Bằng việc tạo tài khoản, bạn đồng ý với{" "}
                    <span className="underline">Điều khoản sử dụng</span> và{" "}
                    <span className="underline">Chính sách bảo mật</span> của chúng tôi.
                  </p>
                </div>
              </div>

              <div className="col-span-12">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center w-full px-4 py-3 text-base font-medium text-white transition rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                </button>
              </div>

              <div className="col-span-12">
                <p className="text-sm text-center text-white sm:text-start">
                  Đã có tài khoản?{" "}
                  <Link
                    to="/signin"
                    className="underline text-blue-300 hover:text-blue-200"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}