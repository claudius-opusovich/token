import React, { createContext, useCallback, useContext, useState } from 'react';

type SelectionContextValue = {
  selected: Set<string>;
  active: boolean;
  toggle: (eventId: string) => void;
  enter: (eventId: string) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue>({
  selected: new Set(),
  active: false,
  toggle: () => {},
  enter: () => {},
  clear: () => {},
});

export function MessageSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((eventId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const enter = useCallback((eventId: string) => {
    setSelected(new Set([eventId]));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return (
    <SelectionContext.Provider value={{ selected, active: selected.size > 0, toggle, enter, clear }}>
      {children}
    </SelectionContext.Provider>
  );
}

export const useMessageSelection = () => useContext(SelectionContext);
