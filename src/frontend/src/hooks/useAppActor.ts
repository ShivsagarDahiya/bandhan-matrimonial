import type { AppBackend } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

/**
 * Wrapper around useActor that returns the actor cast to AppBackend,
 * which includes all app-specific methods beyond the base backendInterface.
 */
export function useAppActor() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalStr = identity?.getPrincipal().toString() ?? null;
  return {
    actor: actor as unknown as AppBackend | null,
    isFetching,
    principalStr,
  };
}
