declare module "@playwright/test" {
  export type Page = {
    goto(url: string): Promise<void>;
    waitForURL(url: string | RegExp): Promise<void>;
    locator(selector: string): Locator;
    getByRole(role: string, options?: { level?: number; name?: string | RegExp }): Locator;
    getByPlaceholder(text: string | RegExp): Locator;
    getByText(text: string | RegExp): Locator;
    getByTitle?(text: string | RegExp): Locator;
  };

  export type Locator = {
    fill(value: string): Promise<void>;
    click(): Promise<void>;
  };

  export type TestArgs = { page: Page };
  export type TestFn = (args: TestArgs) => Promise<void> | void;

  export const test: {
    (name: string, fn: TestFn): void;
    describe(name: string, fn: () => void): void;
  };

  export const expect: (value: unknown) => {
    toHaveTitle(expected: string | RegExp): Promise<void>;
    toBeVisible(): Promise<void>;
    toHaveCount(expected: number): Promise<void>;
  };

  export function defineConfig<T>(config: T): T;
  export const devices: Record<string, Record<string, unknown>>;
}
