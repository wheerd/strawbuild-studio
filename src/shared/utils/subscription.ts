import isDeepEqual from 'fast-deep-equal'

export function subscribeRecords<TState, TKey extends string, TRecord>(
  store: {
    getState: () => TState
    subscribe: <U>(
      selector: (state: TState) => U,
      listener: (selectedState: U, previousSelectedState: U) => void,
      options?: {
        equalityFn?: (a: U, b: U) => boolean
        fireImmediately?: boolean
      }
    ) => () => void
  },
  selector: (state: TState) => Record<TKey, TRecord>,
  entryChange: (current?: TRecord, previous?: TRecord) => void
): () => void {
  const subscriptions: Partial<Record<TKey, () => void>> = {}

  const keysChange = (current: TKey[], previous: TKey[]) => {
    for (const id of current) {
      if (!previous.includes(id)) {
        subscriptions[id] = store.subscribe(s => selector(s)[id], entryChange, { equalityFn: isDeepEqual })
        entryChange(selector(store.getState())[id] ?? undefined)
      }
    }

    for (const id of previous) {
      if (!current.includes(id)) {
        const subscription = subscriptions[id]
        delete subscriptions[id]
        // Delay removing the subscription so that entryChange still gets called for the removed entry
        setTimeout(() => {
          subscription?.()
        }, 0)
      }
    }
  }

  keysChange(Object.keys(selector(store.getState())) as TKey[], [])

  const unsubscribe = store.subscribe(s => Object.keys(selector(s)) as TKey[], keysChange, {
    equalityFn: isDeepEqual
  })

  return () => {
    for (const id of Object.keys(subscriptions) as TKey[]) {
      subscriptions[id]?.()
      delete subscriptions[id]
    }
    unsubscribe()
  }
}
