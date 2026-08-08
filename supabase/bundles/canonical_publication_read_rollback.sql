-- Logical rollback. Immutable publications and audit records are preserved.

begin;

select public.greanlean_set_publication_read_mode(
  'LEGACY',
  'ad5aba5a-7cd5-4d26-8178-6a8c38051abb'::uuid
) as rollback_result;

commit;

select
  read_mode,
  updated_by,
  updated_at
from public.dpp_publication_read_control
where singleton = true;
