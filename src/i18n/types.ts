import en from "./locales/en.json";

export type AppLocale = "en" | "pl";

export const SUPPORTED_LOCALES = ["en", "pl"] as const satisfies readonly AppLocale[];

export type TranslationResources = typeof en;

type Join<K extends string, P extends string> = P extends "" ? K : `${P}.${K}`;

type FlattenKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? Join<K, Prefix>
    : FlattenKeys<T[K], Join<K, Prefix>>;
}[keyof T & string];

export type TranslationKey = FlattenKeys<TranslationResources>;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationResources;
    };
  }
}
