import { liveQuery } from "dexie";
import { onMount } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

interface LiveQueryResult<T> {
  data: T | undefined;
  error?: Error;
}

export function useLiveQuery<T>(querier: () => T | Promise<T>): LiveQueryResult<T> {
  // @ts-ignore
  const [store, setStore] = createStore<LiveQueryResult<T>>({});

  onMount(() => {
    const observable = liveQuery(querier);

    observable.subscribe((value) => {
      setStore(
        reconcile({
          data: value,
        })
      );
    });
  });

  return store as LiveQueryResult<T>;
}
