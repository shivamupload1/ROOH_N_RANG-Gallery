export type PublicApp = "website" | "admin" | "gallery";

export type PublishedContent<T> = {
  key: string;
  value: T;
  updatedAt: Date;
};
