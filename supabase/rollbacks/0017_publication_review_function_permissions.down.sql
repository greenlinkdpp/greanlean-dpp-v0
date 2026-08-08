begin;

revoke all on function public.greanlean_decide_publication_review(
  uuid,
  text,
  text
) from public, anon, authenticated;

commit;
