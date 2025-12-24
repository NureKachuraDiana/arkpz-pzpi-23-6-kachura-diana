"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { apiService } from "@/api";
import type { User, UpdateProfileRequest } from "@/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, CheckCircle2 } from "lucide-react";

const EMAIL_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

export function AccountForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { user: authUser, refreshUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [initialData, setInitialData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Load user data on mount
  useEffect(() => {
    // Wait for auth context to load
    if (authLoading) {
      return;
    }

    // If not authenticated, the axios interceptor will handle redirect
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadUserData = async () => {
      setIsLoading(true);
      setErrors({});
      
      try {
        const user = await apiService.getCurrentUser();
        
        const userData = {
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: "", // Phone is not in User type, but might be in UpdateProfileRequest
        };
        
        setFormData(userData);
        setInitialData(userData);
      } catch (error) {
        let errorMessage = t("forms.account.errors.loadFailed");
        
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { status?: number; data?: { message?: string } };
            message?: string;
          };
          
          if (axiosError.response?.status === 401) {
            errorMessage = t("forms.account.errors.sessionExpired");
          } else if (axiosError.response?.status === 404) {
            errorMessage = t("forms.account.errors.userNotFound");
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
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, authLoading]);

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return t("forms.account.errors.emailRequired");
    }
    if (!EMAIL_REGEX.test(email)) {
      return t("forms.account.errors.emailInvalid");
    }
    return null;
  };

  const validateName = (name: string, fieldName: "firstName" | "lastName"): string | null => {
    if (name && name.trim().length < 2) {
      return fieldName === "firstName" 
        ? t("forms.account.errors.firstNameMinLength")
        : t("forms.account.errors.lastNameMinLength");
    }
    if (name && name.trim().length > 50) {
      return fieldName === "firstName"
        ? t("forms.account.errors.firstNameMaxLength")
        : t("forms.account.errors.lastNameMaxLength");
    }
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (phone && phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        return t("forms.account.errors.phoneInvalid");
      }
      if (phone.replace(/\D/g, "").length < 10) {
        return t("forms.account.errors.phoneMinDigits");
      }
    }
    return null;
  };

  const hasChanges = () => {
    return (
      formData.firstName !== initialData.firstName ||
      formData.lastName !== initialData.lastName ||
      formData.email !== initialData.email ||
      formData.phone !== initialData.phone
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear success message when user starts typing
    if (isSuccess) {
      setIsSuccess(false);
    }

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    
    // Clear submit error
    if (errors.submit) {
      setErrors((prev) => ({ ...prev, submit: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if there are any changes
    if (!hasChanges()) {
      setErrors({ submit: t("forms.account.errors.noChanges") });
      return;
    }

    const newErrors: Record<string, string | null> = {};
    
    const firstNameError = validateName(formData.firstName, "firstName");
    const lastNameError = validateName(formData.lastName, "lastName");
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone);

    if (firstNameError) newErrors.firstName = firstNameError;
    if (lastNameError) newErrors.lastName = lastNameError;
    if (emailError) newErrors.email = emailError;
    if (phoneError) newErrors.phone = phoneError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setIsSuccess(false);

    try {
      const updateData: UpdateProfileRequest = {};
      
      // Only include fields that have changed
      if (formData.firstName !== initialData.firstName) {
        updateData.firstName = formData.firstName.trim() || undefined;
      }
      if (formData.lastName !== initialData.lastName) {
        updateData.lastName = formData.lastName.trim() || undefined;
      }
      if (formData.email !== initialData.email) {
        updateData.email = formData.email.trim();
      }
      if (formData.phone !== initialData.phone) {
        updateData.phone = formData.phone.trim() || undefined;
      }

      const updatedUser = await apiService.updateProfile(updateData);
      
      // Update initial data to reflect saved state
      setInitialData({
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        email: updatedUser.email || "",
        phone: formData.phone, // Phone might not be in response
      });
      
      // Refresh auth context
      await refreshUser();
      
      setIsSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      let errorMessage = t("forms.account.errors.updateFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 401) {
          errorMessage = t("forms.account.errors.sessionExpired");
        } else if (axiosError.response?.status === 400) {
          errorMessage = axiosError.response.data?.message || t("forms.account.errors.invalidData");
        } else if (axiosError.response?.status === 404) {
          errorMessage = t("forms.account.errors.userNotFound");
        } else if (axiosError.response?.status === 409) {
          errorMessage = t("forms.account.errors.emailInUse");
        } else if (axiosError.response?.status === 429) {
          errorMessage = t("forms.account.errors.tooManyRequests");
        } else if (axiosError.response?.status === 500) {
          errorMessage = t("forms.account.errors.serverError");
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

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)} {...props}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("forms.account.loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)} {...props}>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{t("forms.account.title")}</CardTitle>
        <CardDescription>
          {t("forms.account.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={handleSubmit}
        >
          {errors.submit && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {errors.submit}
            </div>
          )}

          {isSuccess && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t("forms.account.profileUpdated")}
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">{t("forms.account.email")}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("forms.account.emailPlaceholder")}
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="w-full"
              />
              {errors.email && (
                <p id="email-error" className="text-sm font-medium text-destructive">
                  {errors.email}
                </p>
              )}
              <FieldDescription>
                {t("forms.account.emailDescription")}
              </FieldDescription>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field>
                <FieldLabel htmlFor="firstName">{t("forms.account.firstName")}</FieldLabel>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder={t("forms.account.firstNamePlaceholder")}
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  className="w-full"
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-sm font-medium text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">{t("forms.account.lastName")}</FieldLabel>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder={t("forms.account.lastNamePlaceholder")}
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  className="w-full"
                />
                {errors.lastName && (
                  <p id="lastName-error" className="text-sm font-medium text-destructive">
                    {errors.lastName}
                  </p>
                )}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="phone">{t("forms.account.phone")}</FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder={t("forms.account.phonePlaceholder")}
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                className="w-full"
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm font-medium text-destructive">
                  {errors.phone}
                </p>
              )}
              <FieldDescription>
                {t("forms.account.phoneDescription")}
              </FieldDescription>
            </Field>

            <Field>
              <Button
                type="submit"
                disabled={isSubmitting || !hasChanges()}
                className="w-full bg-green-600 hover:bg-green-700 text-white relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("forms.account.saving")}
                  </>
                ) : (
                  t("forms.account.saveChanges")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

