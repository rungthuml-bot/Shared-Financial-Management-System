"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ReceiptText,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginInput } from "@/validators/auth";
import { authClient } from "@/lib/auth-client";
import { clearDevLoggedOutAction } from "@/actions/auth.actions";

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [quickLoginTarget, setQuickLoginTarget] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (res.error) {
        setErrorMsg(res.error.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        toast.error("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
        return;
      }

      await clearDevLoggedOutAction();
      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push("/");
      router.refresh();
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (email: string, name: string) => {
    setValue("email", email);
    setValue("password", "Password@123");
    setQuickLoginTarget(email);
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await authClient.signIn.email({
        email,
        password: "Password@123",
      });

      if (res.error) {
        setErrorMsg(`เข้าสู่ระบบเป็น ${name} ไม่สำเร็จ: ${res.error.message}`);
        toast.error("Quick Login ไม่สำเร็จ");
        return;
      }

      await clearDevLoggedOutAction();
      toast.success(`เข้าสู่ระบบสำเร็จในฐานะ ${name}`);
      router.push("/");
      router.refresh();
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
      setQuickLoginTarget(null);
    }
  };

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
          <ReceiptText className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          เข้าสู่ระบบ Installment Manager
        </h1>
        <p className="text-sm text-muted-foreground">
          จัดการรายการผ่อนชำระและเคลียร์ยอดระหว่างกันอย่างง่ายดาย
        </p>
      </div>

      {/* Main Login Card */}
      <Card className="p-6 md:p-8 shadow-lg border-border/80">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>อีเมล</span>
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              {...register("email")}
              className="w-full h-10 px-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>รหัสผ่าน</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
              className="w-full h-10 px-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 gap-2 font-semibold shadow-xs"
            disabled={isSubmitting}
          >
            {isSubmitting && !quickLoginTarget ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Development Quick-Login Helper */}
        {isDev && (
          <div className="mt-6 pt-5 border-t border-border/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold flex items-center gap-1 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Dev Mode Quick-Login
              </span>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">ทดสอบระบบ</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin("usera@example.com", "User A")}
                disabled={isSubmitting}
                className="text-xs h-9 justify-start px-2.5 hover:border-primary/50"
              >
                {quickLoginTarget === "usera@example.com" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 mr-1.5 text-primary" />
                )}
                <div className="text-left truncate">
                  <span className="font-medium block leading-tight">User A</span>
                  <span className="text-[10px] text-muted-foreground block leading-tight">ผู้ใช้หลัก</span>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin("userb@example.com", "User B")}
                disabled={isSubmitting}
                className="text-xs h-9 justify-start px-2.5 hover:border-violet-500/50"
              >
                {quickLoginTarget === "userb@example.com" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 mr-1.5 text-violet-500" />
                )}
                <div className="text-left truncate">
                  <span className="font-medium block leading-tight">User B</span>
                  <span className="text-[10px] text-muted-foreground block leading-tight">คู่แชร์</span>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Link to Register */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          ยังไม่มีบัญชีผู้ใช้?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            สร้างบัญชีใหม่
          </Link>
        </div>
      </Card>
    </div>
  );
}
