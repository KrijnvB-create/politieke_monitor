/**
 * components/FollowButton.tsx
 * Client component: volg/sla op via Supabase saved_items (polymorf)
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FollowButtonProps {
  kind: string;    // 'dossier' | 'commissie' | 'kamerlid' | etc.
  refId: string;
  label: string;
  meta?: Record<string, unknown>;
}

export function FollowButton({ kind, refId, label, meta }: FollowButtonProps) {
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    async function checkFollowed() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('kind', kind)
        .eq('ref_id', refId)
        .maybeSingle();

      if (!cancelled) {
        setFollowed(!!data);
        setLoading(false);
      }
    }
    checkFollowed();
    return () => { cancelled = true; };
  }, [kind, refId, supabase]);

  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect naar login of toon melding
      window.location.href = '/login';
      return;
    }

    startTransition(async () => {
      if (followed) {
        await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('kind', kind)
          .eq('ref_id', refId);
        setFollowed(false);
      } else {
        await supabase.from('saved_items').insert({
          user_id: user.id,
          kind,
          ref_id: refId,
          label,
          meta: meta ?? {},
        });
        setFollowed(true);
      }
    });
  }

  if (loading) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 bg-slate-50"
      >
        <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
        Laden...
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={[
        'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors',
        followed
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      <span>{followed ? '★' : '☆'}</span>
      {followed ? 'Volgend' : 'Volgen'}
    </button>
  );
}
