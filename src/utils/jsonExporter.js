// TODO (Zadanie 5): Adapter — schemat wewnętrzny → partial JSON format Insly
export function exportIdd(internalState) {
  return JSON.stringify(internalState, null, 2)
}
