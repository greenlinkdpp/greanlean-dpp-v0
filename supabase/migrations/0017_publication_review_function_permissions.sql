begin;

do $$
begin
  if to_regprocedure(
    'public.greanlean_decide_publication_review(uuid,text,text)'
  ) is null then
    raise exception '0017 requires migration 0016 publication review';
  end if;
end;
$$;

revoke all on function public.greanlean_decide_publication_review(
  uuid,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.greanlean_decide_publication_review(
  uuid,
  text,
  text
) to authenticated;

revoke all on function public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_withdraw_current_dpp_publication(
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_create_publication_review(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_record_publication_validation(
  uuid,
  text,
  jsonb,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_publish_approved_review(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_withdraw_current_dpp_publication(
  uuid,
  uuid,
  text,
  uuid
) to service_role;
grant execute on function public.greanlean_create_publication_review(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
) to service_role;
grant execute on function public.greanlean_record_publication_validation(
  uuid,
  text,
  jsonb,
  uuid
) to service_role;
grant execute on function public.greanlean_publish_approved_review(
  uuid,
  text,
  uuid
) to service_role;

commit;
