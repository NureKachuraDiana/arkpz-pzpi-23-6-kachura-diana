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

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const { register } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return t("forms.signup.errors.emailRequired");
    }
    if (!EMAIL_REGEX.test(email)) {
      return t("forms.signup.errors.emailInvalid");
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return t("forms.signup.errors.passwordRequired");
    }
    if (password.length < 8) {
      return t("forms.signup.errors.passwordMinLength");
    }
    return null;
  };

  const validateConfirmPassword = (
    confirmPassword: string,
    password: string
  ): string | null => {
    if (!confirmPassword) {
      return t("forms.signup.errors.confirmPasswordRequired");
    }
    if (confirmPassword !== password) {
      return t("forms.signup.errors.passwordsNotMatch");
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
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword,
      formData.password
    );

    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await register(formData.email, formData.password);
    } catch (error) {
      let errorMessage = t("forms.signup.errors.registrationFailed");

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        if (axiosError.response?.data?.message) {
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
          <h1 className="text-2xl font-bold">{t("forms.signup.title")}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {t("forms.signup.description")}
          </p>
        </div>

        {errors.submit && (
          <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.submit}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">{t("forms.signup.email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("forms.signup.emailPlaceholder")}
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
          <FieldDescription>
            {t("forms.signup.emailDescription")}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t("forms.signup.password")}</FieldLabel>
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
          <FieldDescription>{t("forms.signup.passwordDescription")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="confirm-password">{t("forms.signup.confirmPassword")}</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
          />
          {errors.confirmPassword && (
            <p
              id="confirm-password-error"
              className="text-sm font-medium text-destructive"
            >
              {errors.confirmPassword}
            </p>
          )}
          <FieldDescription>{t("forms.signup.confirmPasswordDescription")}</FieldDescription>
        </Field>

        <Field>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white relative z-10"
          >
            {isSubmitting ? t("forms.signup.creatingAccount") : t("forms.signup.createAccount")}
          </Button>
        </Field>

        <Field>
          <p className="text-center text-sm text-muted-foreground">
            {t("forms.signup.haveAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("common.signIn")}
            </Link>
          </p>
        </Field>
      </FieldGroup>
    </form>
  );
}