import {
  AuthClient,
  type AuthClientCreateOptions,
  type AuthClientLoginOptions,
} from "@dfinity/auth-client";
import type { Identity } from "@icp-sdk/core/agent";
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadConfig } from "../config";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

export type InternetIdentityContext = {
  identity?: Identity;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError?: Error;
};

const DEFAULT_IDENTITY_PROVIDER = process.env.II_URL;

type ProviderValue = InternetIdentityContext;
const InternetIdentityReactContext = createContext<ProviderValue | undefined>(
  undefined,
);

function assertProviderPresent(
  context: ProviderValue | undefined,
): asserts context is ProviderValue {
  if (!context) {
    throw new Error(
      "InternetIdentityProvider is not present. Wrap your component tree with it.",
    );
  }
}

export const useInternetIdentity = (): InternetIdentityContext => {
  const context = useContext(InternetIdentityReactContext);
  assertProviderPresent(context);
  return context;
};

function clearCorruptedTokens() {
  const keys = Object.keys(localStorage).filter(
    (k) =>
      k.startsWith("ic-") || k.includes("delegation") || k.includes("identity"),
  );
  for (const k of keys) localStorage.removeItem(k);
}

export function InternetIdentityProvider({
  children,
  createOptions,
}: PropsWithChildren<{
  children: ReactNode;
  createOptions?: AuthClientCreateOptions;
}>) {
  // authClient stored in ref so it never triggers re-renders or effect re-runs
  const authClientRef = useRef<AuthClient | null>(null);
  const initDoneRef = useRef(false);

  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    void (async () => {
      try {
        setStatus("initializing");

        // Validate existing tokens; clear if corrupted
        try {
          const testKey = Object.keys(localStorage).find(
            (k) => k.startsWith("ic-") || k.includes("delegation"),
          );
          if (testKey) {
            const val = localStorage.getItem(testKey);
            if (val) JSON.parse(val);
          }
        } catch {
          clearCorruptedTokens();
        }

        const client = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true,
            disableIdle: true,
          },
          ...createOptions,
        });
        authClientRef.current = client;

        let isAuth = false;
        try {
          isAuth = await client.isAuthenticated();
        } catch {
          // Corrupted session — clear storage and stay anonymous
          clearCorruptedTokens();
          isAuth = false;
        }

        if (isAuth) {
          const loadedIdentity = client.getIdentity();
          setIdentity(loadedIdentity);
          setStatus("success");
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
    })();
  }, []);

  const login = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setStatus("loginError");
      setError(new Error("AuthClient not initialized yet"));
      return;
    }

    setStatus("logging-in");

    void (async () => {
      try {
        const config = await loadConfig();
        const options: AuthClientLoginOptions = {
          identityProvider: DEFAULT_IDENTITY_PROVIDER,
          derivationOrigin: config.ii_derivation_origin,
          maxTimeToLive: BigInt(3_600_000_000_000) * BigInt(24 * 30),
          onSuccess: () => {
            const newIdentity = client.getIdentity();
            setIdentity(newIdentity);
            setStatus("success");
            setError(undefined);
          },
          onError: (err) => {
            setStatus("loginError");
            setError(new Error(err ?? "Login failed"));
          },
        };
        await client.login(options);
      } catch (e) {
        setStatus("loginError");
        setError(e instanceof Error ? e : new Error("Login failed"));
      }
    })();
  }, []);

  const clear = useCallback(() => {
    const client = authClientRef.current;
    if (!client) return;
    void client
      .logout()
      .then(() => {
        setIdentity(undefined);
        setStatus("idle");
        setError(undefined);
        // Do NOT clear authClientRef — that would re-trigger init
      })
      .catch(() => {
        setIdentity(undefined);
        setStatus("idle");
        setError(undefined);
      });
  }, []);

  const value = useMemo<ProviderValue>(
    () => ({
      identity,
      login,
      clear,
      loginStatus,
      isInitializing: loginStatus === "initializing",
      isLoginIdle: loginStatus === "idle",
      isLoggingIn: loginStatus === "logging-in",
      isLoginSuccess: loginStatus === "success",
      isLoginError: loginStatus === "loginError",
      loginError,
    }),
    [identity, login, clear, loginStatus, loginError],
  );

  return createElement(InternetIdentityReactContext.Provider, {
    value,
    children,
  });
}
