"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const EMAIL_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return t("forms.login.errors.emailRequired");
    }
    if (!EMAIL_REGEX.test(email)) {
      return t("forms.login.errors.emailInvalid");
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return t("forms.login.errors.passwordRequired");
    }
    if (password.length < 8) {
      return t("forms.login.errors.passwordMinLength");
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string | null> = {};
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(formData.email, formData.password);
    } catch (error) {
      let errorMessage = t("forms.login.errors.loginFailed");

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        if (axiosError.response?.status === 401) {
          errorMessage = t("forms.login.errors.invalidCredentials");
        } else if (axiosError.response?.status === 429) {
          errorMessage = t("forms.login.errors.tooManyAttempts");
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("forms.login.title")}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {t("forms.login.description")}
          </p>
        </div>

        {errors.submit && (
          <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.submit}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">{t("forms.login.email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("forms.login.emailPlaceholder")}
            value={formData.email}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm font-medium text-destructive">
              {errors.email}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t("forms.login.password")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p
              id="password-error"
              className="text-sm font-medium text-destructive"
            >
              {errors.password}
            </p>
          )}
          <FieldDescription>
            {t("forms.login.passwordDescription")}
          </FieldDescription>
        </Field>

        <Field>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white relative z-10"
          >
            {isSubmitting ? t("forms.login.signingIn") : t("forms.login.signIn")}
          </Button>
        </Field>

        <Field>
          <p className="text-center text-sm text-muted-foreground">
            {t("forms.login.noAccount")}{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium"
            >
              {t("common.signUp")}
            </Link>
          </p>
        </Field>
      </FieldGroup>
    </form>
  );
}
