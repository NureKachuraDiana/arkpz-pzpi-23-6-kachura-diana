"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { apiService } from "@/api";
import type { Settings, UpdateSettingsRequest } from "@/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, CheckCircle2, Globe, Ruler, Bell, Mail, Smartphone, MessageSquare } from "lucide-react";

// Type definition based on Prisma schema and DTO
interface UserSettings {
  language?: string;
  measurementUnit?: string;
  notificationsEnabled?: boolean;
  darkModeEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
}

export function SettingsForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  
  const LANGUAGE_OPTIONS = [
    { value: "uk", label: language === "ua" ? "Українська" : "Ukrainian" },
    { value: "en", label: "English" },
    { value: "ru", label: language === "ua" ? "Русский" : "Russian" },
  ];

  const MEASUREMENT_UNIT_OPTIONS = [
    { 
      value: "metric", 
      label: language === "ua" ? "Метрична (Цельсій, км)" : "Metric (Celsius, km)" 
    },
    { 
      value: "imperial", 
      label: language === "ua" ? "Імперська (Фаренгейт, милі)" : "Imperial (Fahrenheit, miles)" 
    },
  ];
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState<UserSettings>({
    language: "uk",
    measurementUnit: "metric",
    notificationsEnabled: true,
    darkModeEnabled: false,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  });
  const [initialData, setInitialData] = useState<UserSettings>({
    language: "uk",
    measurementUnit: "metric",
    notificationsEnabled: true,
    darkModeEnabled: false,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  });

  // Load settings data on mount
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

    const loadSettings = async () => {
      setIsLoading(true);
      setErrors({});
      
      try {
        const settings = await apiService.getSettings() as UserSettings;
        
        const settingsData: UserSettings = {
          language: settings.language || "uk",
          measurementUnit: settings.measurementUnit || "metric",
          notificationsEnabled: settings.notificationsEnabled ?? true,
          darkModeEnabled: settings.darkModeEnabled ?? false,
          emailNotifications: settings.emailNotifications ?? true,
          pushNotifications: settings.pushNotifications ?? true,
          smsNotifications: settings.smsNotifications ?? false,
        };
        
        setFormData(settingsData);
        setInitialData(settingsData);
      } catch (error) {
        let errorMessage = t("forms.settings.errors.loadFailed");
        
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { status?: number; data?: { message?: string } };
            message?: string;
          };
          
          if (axiosError.response?.status === 401) {
            errorMessage = t("forms.settings.errors.sessionExpired");
          } else if (axiosError.response?.status === 404) {
            errorMessage = t("forms.settings.errors.settingsNotFound");
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

    loadSettings();
  }, [isAuthenticated, authLoading]);

  const hasChanges = () => {
    return (
      formData.language !== initialData.language ||
      formData.measurementUnit !== initialData.measurementUnit ||
      formData.notificationsEnabled !== initialData.notificationsEnabled ||
      formData.darkModeEnabled !== initialData.darkModeEnabled ||
      formData.emailNotifications !== initialData.emailNotifications ||
      formData.pushNotifications !== initialData.pushNotifications ||
      formData.smsNotifications !== initialData.smsNotifications
    );
  };

  const handleChange = (name: keyof UserSettings, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear success message when user makes changes
    if (isSuccess) {
      setIsSuccess(false);
    }

    // Clear field error when user makes changes
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
      setErrors({ submit: t("forms.settings.errors.noChanges") });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setIsSuccess(false);

    try {
      const updateData: UpdateSettingsRequest = {};
      
      // Only include fields that have changed
      if (formData.language !== initialData.language) {
        updateData.language = formData.language;
      }
      if (formData.measurementUnit !== initialData.measurementUnit) {
        updateData.measurementUnit = formData.measurementUnit;
      }
      if (formData.notificationsEnabled !== initialData.notificationsEnabled) {
        updateData.notificationsEnabled = formData.notificationsEnabled;
      }
      if (formData.darkModeEnabled !== initialData.darkModeEnabled) {
        updateData.darkModeEnabled = formData.darkModeEnabled;
      }
      if (formData.emailNotifications !== initialData.emailNotifications) {
        updateData.emailNotifications = formData.emailNotifications;
      }
      if (formData.pushNotifications !== initialData.pushNotifications) {
        updateData.pushNotifications = formData.pushNotifications;
      }
      if (formData.smsNotifications !== initialData.smsNotifications) {
        updateData.smsNotifications = formData.smsNotifications;
      }

      const updatedSettings = await apiService.updateSettings(updateData) as UserSettings;
      
      // Update initial data to reflect saved state
      setInitialData({
        language: updatedSettings.language || formData.language || "uk",
        measurementUnit: updatedSettings.measurementUnit || formData.measurementUnit || "metric",
        notificationsEnabled: updatedSettings.notificationsEnabled ?? formData.notificationsEnabled ?? true,
        darkModeEnabled: updatedSettings.darkModeEnabled ?? formData.darkModeEnabled ?? false,
        emailNotifications: updatedSettings.emailNotifications ?? formData.emailNotifications ?? true,
        pushNotifications: updatedSettings.pushNotifications ?? formData.pushNotifications ?? true,
        smsNotifications: updatedSettings.smsNotifications ?? formData.smsNotifications ?? false,
      });
      
      setIsSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      let errorMessage = t("forms.settings.errors.updateFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 401) {
          errorMessage = t("forms.settings.errors.sessionExpired");
        } else if (axiosError.response?.status === 400) {
          errorMessage = axiosError.response.data?.message || t("forms.settings.errors.invalidData");
        } else if (axiosError.response?.status === 404) {
          errorMessage = t("forms.settings.errors.settingsNotFound");
        } else if (axiosError.response?.status === 429) {
          errorMessage = t("forms.settings.errors.tooManyRequests");
        } else if (axiosError.response?.status === 500) {
          errorMessage = t("forms.settings.errors.serverError");
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
            <p className="text-sm text-muted-foreground">{t("forms.settings.loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)} {...props}>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{t("forms.settings.title")}</CardTitle>
        <CardDescription>
          {t("forms.settings.description")}
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
              {t("forms.settings.settingsUpdated")}
            </div>
          )}

          <FieldGroup>
            {/* Language and Measurement Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field>
                <FieldLabel htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t("forms.settings.language")}
                </FieldLabel>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleChange("language", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder={t("forms.settings.selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t("forms.settings.languageDescription")}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="measurementUnit" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  {t("forms.settings.measurementUnit")}
                </FieldLabel>
                <Select
                  value={formData.measurementUnit}
                  onValueChange={(value) => handleChange("measurementUnit", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="measurementUnit" className="w-full">
                    <SelectValue placeholder={t("forms.settings.selectUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t("forms.settings.measurementUnitDescription")}
                </FieldDescription>
              </Field>
            </div>

            <FieldSeparator />

            {/* Appearance */}
            <Field>
              <FieldLabel htmlFor="darkModeEnabled" className="flex items-center gap-2">
                {t("forms.settings.darkMode")}
              </FieldLabel>
              <div className="flex items-center gap-3">
                <Switch
                  id="darkModeEnabled"
                  checked={formData.darkModeEnabled}
                  onCheckedChange={(checked) => handleChange("darkModeEnabled", checked)}
                  disabled={isSubmitting}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.darkModeEnabled ? t("forms.settings.enabled") : t("forms.settings.disabled")}
                </span>
              </div>
              <FieldDescription>
                {t("forms.settings.darkModeDescription")}
              </FieldDescription>
            </Field>

            <FieldSeparator />

            {/* Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold">{t("forms.settings.enableNotifications")}</h3>
              </div>

              <Field>
                <FieldLabel htmlFor="notificationsEnabled" className="flex items-center gap-2">
                  {t("forms.settings.enableNotifications")}
                </FieldLabel>
                <div className="flex items-center gap-3">
                  <Switch
                    id="notificationsEnabled"
                    checked={formData.notificationsEnabled}
                    onCheckedChange={(checked) => handleChange("notificationsEnabled", checked)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.notificationsEnabled ? t("forms.settings.enabled") : t("forms.settings.disabled")}
                  </span>
                </div>
                <FieldDescription>
                  {t("forms.settings.notificationsDescription")}
                </FieldDescription>
              </Field>

              {formData.notificationsEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <Field>
                    <FieldLabel htmlFor="emailNotifications" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("forms.settings.emailNotifications")}
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="emailNotifications"
                        checked={formData.emailNotifications}
                        onCheckedChange={(checked) => handleChange("emailNotifications", checked)}
                        disabled={isSubmitting || !formData.notificationsEnabled}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.emailNotifications ? t("forms.settings.enabled") : t("forms.settings.disabled")}
                      </span>
                    </div>
                    <FieldDescription>
                      {t("forms.settings.emailNotificationsDescription")}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pushNotifications" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      {t("forms.settings.pushNotifications")}
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="pushNotifications"
                        checked={formData.pushNotifications}
                        onCheckedChange={(checked) => handleChange("pushNotifications", checked)}
                        disabled={isSubmitting || !formData.notificationsEnabled}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.pushNotifications ? t("forms.settings.enabled") : t("forms.settings.disabled")}
                      </span>
                    </div>
                    <FieldDescription>
                      {t("forms.settings.pushNotificationsDescription")}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="smsNotifications" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t("forms.settings.smsNotifications")}
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="smsNotifications"
                        checked={formData.smsNotifications}
                        onCheckedChange={(checked) => handleChange("smsNotifications", checked)}
                        disabled={isSubmitting || !formData.notificationsEnabled}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.smsNotifications ? t("forms.settings.enabled") : t("forms.settings.disabled")}
                      </span>
                    </div>
                    <FieldDescription>
                      {t("forms.settings.smsNotificationsDescription")}
                    </FieldDescription>
                  </Field>
                </div>
              )}
            </div>

            <Field>
              <Button
                type="submit"
                disabled={isSubmitting || !hasChanges()}
                className="w-full bg-green-600 hover:bg-green-700 text-white relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("forms.settings.saving")}
                  </>
                ) : (
                  t("forms.settings.saveSettings")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

