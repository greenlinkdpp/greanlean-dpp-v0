begin;

do $$
begin
  if to_regclass('public.dpp_publication_read_control') is not null then
    update public.dpp_publication_read_control
    set read_mode = 'LEGACY', updated_at = now()
    where singleton = true;
  end if;
end;
$$;

commit;
