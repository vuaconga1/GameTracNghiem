'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const MESSAGE =
  'Bạn có thay đổi chưa lưu. Rời trang / hủy sửa sẽ mất các thay đổi chưa lưu.';

type DirtyContextValue = {
  setDirty: (id: string, dirty: boolean) => void;
  confirmLeave: () => boolean;
  message: string;
};

const DirtyContext = createContext<DirtyContextValue | null>(null);

export function AdminDirtyProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setFlags((prev) => {
      if (!dirty) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const isDirty = Object.keys(flags).length > 0;

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm(MESSAGE);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = MESSAGE;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const value = useMemo(
    () => ({ setDirty, confirmLeave, message: MESSAGE }),
    [setDirty, confirmLeave]
  );

  return <DirtyContext.Provider value={value}>{children}</DirtyContext.Provider>;
}

export function useAdminDirty(id: string, dirty: boolean) {
  const ctx = useContext(DirtyContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setDirty(id, dirty);
    return () => ctx.setDirty(id, false);
  }, [ctx, id, dirty]);
}

export function useAdminLeaveGuard() {
  const ctx = useContext(DirtyContext);
  return {
    confirmLeave: ctx?.confirmLeave ?? (() => true),
    message: ctx?.message ?? MESSAGE,
  };
}
