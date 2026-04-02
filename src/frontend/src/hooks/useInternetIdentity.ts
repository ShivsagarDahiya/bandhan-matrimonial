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

const ONE_HOUR_IN_NANOSECONDS = BigInt(3_600_000_000_000);
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

export function InternetIdentityProvider({
  children,
  createOptions,
}: PropsWithChildren<{
  children: ReactNode;
  createOptions?: AuthClientCreateOptions;
}>) {
  // All mutable state that should NOT trigger re-initialization lives in refs
  const authClientRef = useRef<AuthClient | null>(null);
  const derivationOriginRef = useRef<string | undefined>(undefined);
  const createOptionsRef = useRef(createOptions);
  const initDoneRef = useRef(false);

  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally empty — must run exactly once on mount
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const opts = createOptionsRef.current;

    void (async () => {
      try {
        setStatus("initializing");

        const config = await loadConfig();
        derivationOriginRef.current = config.ii_derivation_origin;

        const client = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true,
            disableIdle: true,
            ...opts?.idleOptions,
          },
          ...opts,
        });
        authClientRef.current = client;

        // Restore session; clear corrupted tokens gracefully
        let isAuthenticated = false;
        try {
          isAuthenticated = await client.isAuthenticated();
        } catch {
          // Corrupted delegation — wipe II storage and proceed unauthenticated
          for (const key of Object.keys(localStorage)) {
            if (
              key.startsWith("ic-") ||
              key.startsWith("delegation") ||
              key.includes("identity")
            ) {
              localStorage.removeItem(key);
            }
          }
          isAuthenticated = false;
        }

        if (isAuthenticated) {
          const loadedIdentity = client.getIdentity();
          setIdentity(loadedIdentity);
        }

        setStatus("idle");
      } catch (unknownError) {
        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("Initialization failed"),
        );
        setStatus("loginError");
      }
    })();
  }, []);

  const login = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setStatus("loginError");
      setError(new Error("AuthClient is not initialized yet"));
      return;
    }

    const options: AuthClientLoginOptions = {
      identityProvider: DEFAULT_IDENTITY_PROVIDER,
      derivationOrigin: derivationOriginRef.current,
      onSuccess: () => {
        const latestIdentity = client.getIdentity();
        setIdentity(latestIdentity);
        setStatus("success");
        setError(undefined);
      },
      onError: (maybeError?: string) => {
        setStatus("loginError");
        setError(new Error(maybeError ?? "Login failed"));
      },
      maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30),
    };

    setStatus("logging-in");
    void client.login(options);
  }, []);

  const clear = useCallback(() => {
    const client = authClientRef.current;
    if (!client) return;

    void client
      .logout()
      .then(() => {
        // Clear identity/status only — keep client ref alive to prevent re-init
        setIdentity(undefined);
        setStatus("idle");
        setError(undefined);
      })
      .catch((unknownError: unknown) => {
        setStatus("loginError");
        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("Logout failed"),
        );
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
