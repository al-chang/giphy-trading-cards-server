export type SelectFields<T> = Partial<{ [key in keyof T]: boolean }>;
