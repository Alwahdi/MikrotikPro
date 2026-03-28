import { env } from "@/env";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import type { ReactNode } from "react";
import { getLocale, getDictionary } from "@/i18n/get-dictionary";
import { isRTL } from "@/i18n/config";
import { DictionaryProvider } from "@/i18n/dictionary-provider";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

const RootLayout = async ({ children }: RootLayoutProperties) => {
  const locale = await getLocale();
  const dictionary = await getDictionary();

  return (
    <html
      className={fonts}
      lang={locale}
      dir={isRTL(locale) ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body>
        <AnalyticsProvider>
          <DesignSystemProvider
            helpUrl={env.NEXT_PUBLIC_DOCS_URL}
            privacyUrl={new URL(
              "/legal/privacy",
              env.NEXT_PUBLIC_WEB_URL
            ).toString()}
            termsUrl={new URL(
              "/legal/terms",
              env.NEXT_PUBLIC_WEB_URL
            ).toString()}
          >
            <DictionaryProvider dictionary={dictionary} locale={locale}>
              {children}
            </DictionaryProvider>
          </DesignSystemProvider>
        </AnalyticsProvider>
        <Toolbar />
      </body>
    </html>
  );
};

export default RootLayout;
