begin;

create table if not exists public.dpp_organisation (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  registration_id text,
  country_code text,
  organisation_type text not null default 'economic_operator',
  verification_status text not null default 'pending',
  status text not null default 'active',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dpp_organisation_type_check check (
    organisation_type in (
      'economic_operator',
      'buyer',
      'service_provider',
      'recycler',
      'authority',
      'platform_operator'
    )
  ),
  constraint dpp_organisation_verification_check check (
    verification_status in ('pending', 'verified', 'rejected', 'suspended')
  ),
  constraint dpp_organisation_status_check check (status in ('active', 'suspended', 'retired'))
);

create unique index if not exists dpp_organisation_registration_idx
  on public.dpp_organisation (registration_id)
  where registration_id is not null;

create table if not exists public.dpp_user_membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.dpp_organisation(id) on delete cascade,
  role_code text not null,
  status text not null default 'pending',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organisation_id),
  constraint dpp_membership_role_check check (
    role_code in (
      'viewer',
      'buyer',
      'service_provider',
      'recycler',
      'authority_reviewer',
      'organisation_admin',
      'platform_admin'
    )
  ),
  constraint dpp_membership_status_check check (
    status in ('pending', 'active', 'suspended', 'revoked')
  ),
  constraint dpp_membership_validity_check check (
    valid_until is null or valid_until > valid_from
  )
);

create index if not exists dpp_membership_user_idx
  on public.dpp_user_membership (user_id, status);
create index if not exists dpp_membership_organisation_idx
  on public.dpp_user_membership (organisation_id, status);

create table if not exists public.dpp_product_access_grant (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.dpp_user_membership(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  sector_code text,
  access_level_code text not null references public.access_level(code) on delete restrict,
  purpose text not null,
  status text not null default 'active',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dpp_access_grant_scope_check check (
    (product_id is not null and sector_code is null)
    or (product_id is null and sector_code is not null)
  ),
  constraint dpp_access_grant_status_check check (
    status in ('active', 'suspended', 'revoked', 'expired')
  ),
  constraint dpp_access_grant_validity_check check (
    valid_until is null or valid_until > valid_from
  )
);

create index if not exists dpp_access_grant_membership_idx
  on public.dpp_product_access_grant (membership_id, status);
create index if not exists dpp_access_grant_product_idx
  on public.dpp_product_access_grant (product_id, access_level_code)
  where product_id is not null;
create index if not exists dpp_access_grant_sector_idx
  on public.dpp_product_access_grant (sector_code, access_level_code)
  where sector_code is not null;

create table if not exists public.dpp_access_request (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text,
  organisation_id uuid not null references public.dpp_organisation(id) on delete cascade,
  membership_id uuid not null references public.dpp_user_membership(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  requested_role_code text not null,
  requested_access_level text not null references public.access_level(code) on delete restrict,
  purpose text not null,
  status text not null default 'pending',
  decision_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dpp_access_request_role_check check (
    requested_role_code in ('buyer', 'service_provider', 'recycler', 'authority_reviewer')
  ),
  constraint dpp_access_request_level_check check (
    requested_access_level in ('LEGITIMATE_INTEREST', 'AUTHORITY_ONLY')
  ),
  constraint dpp_access_request_status_check check (
    status in ('pending', 'approved', 'rejected', 'withdrawn', 'expired')
  )
);

create unique index if not exists dpp_access_request_open_idx
  on public.dpp_access_request (requester_user_id, product_id, requested_access_level)
  where status = 'pending';
create index if not exists dpp_access_request_review_idx
  on public.dpp_access_request (status, created_at);

create table if not exists public.dpp_access_audit (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  organisation_id uuid references public.dpp_organisation(id) on delete set null,
  requested_access_level text references public.access_level(code) on delete restrict,
  granted_access_level text references public.access_level(code) on delete restrict,
  decision text not null,
  reason_code text not null,
  purpose text,
  request_path text,
  correlation_id text,
  ip_context text,
  user_agent text,
  accessed_at timestamptz not null default now(),
  constraint dpp_access_audit_decision_check check (decision in ('allowed', 'denied'))
);

create index if not exists dpp_access_audit_product_idx
  on public.dpp_access_audit (product_id, accessed_at desc);
create index if not exists dpp_access_audit_user_idx
  on public.dpp_access_audit (user_id, accessed_at desc);

create or replace function public.greanlean_access_rank(level_code text)
returns integer
language sql
immutable
as $$
  select case upper(coalesce(level_code, ''))
    when 'PUBLIC' then 0
    when 'LEGITIMATE_INTEREST' then 1
    when 'AUTHORITY_ONLY' then 2
    when 'INTERNAL' then 3
    else -1
  end;
$$;

create or replace function public.greanlean_visibility_access_level(visibility_value text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(visibility_value, 'public'))
    when 'professional' then 'LEGITIMATE_INTEREST'
    when 'legitimate_interest' then 'LEGITIMATE_INTEREST'
    when 'restricted' then 'LEGITIMATE_INTEREST'
    when 'authority' then 'AUTHORITY_ONLY'
    when 'authority_only' then 'AUTHORITY_ONLY'
    when 'internal' then 'INTERNAL'
    else 'PUBLIC'
  end;
$$;

create or replace function public.greanlean_filter_dpp_payload(
  source_payload jsonb,
  viewer_level text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  result_payload jsonb := coalesce(source_payload, '{}'::jsonb);
  collection_key text;
  filtered_collection jsonb;
  visibility_collections text[] := array[
    'certificates',
    'documents',
    'sectorFieldValues',
    'registrySubmissions',
    'registrationProofs',
    'evidenceLinks',
    'blockchainAnchors'
  ];
begin
  foreach collection_key in array visibility_collections loop
    if result_payload ? collection_key
      and jsonb_typeof(result_payload -> collection_key) = 'array'
    then
      select coalesce(jsonb_agg(item), '[]'::jsonb)
      into filtered_collection
      from jsonb_array_elements(result_payload -> collection_key) item
      where public.greanlean_access_rank(viewer_level)
        >= public.greanlean_access_rank(
          public.greanlean_visibility_access_level(item ->> 'visibility_level')
        );
      result_payload := jsonb_set(
        result_payload,
        array[collection_key],
        coalesce(filtered_collection, '[]'::jsonb),
        true
      );
    end if;
  end loop;

  if public.greanlean_access_rank(viewer_level)
    < public.greanlean_access_rank('AUTHORITY_ONLY')
  then
    result_payload := jsonb_set(result_payload, '{governance}', '[]'::jsonb, true);
    result_payload := result_payload - 'registrySubmissions' - 'registrationProofs';
  end if;

  if result_payload ? 'product' then
    result_payload := jsonb_set(
      result_payload,
      '{product}',
      (result_payload -> 'product')
        - 'customer_id'
        - 'owner_id'
        - 'created_by'
        - 'eu_registration_status',
      true
    );
  end if;

  return result_payload;
end;
$$;

create or replace function public.greanlean_is_platform_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dpp_user_membership membership
    join public.dpp_organisation organisation
      on organisation.id = membership.organisation_id
    where membership.user_id = check_user_id
      and membership.role_code = 'platform_admin'
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and organisation.organisation_type = 'platform_operator'
      and organisation.verification_status = 'verified'
      and organisation.status = 'active'
  );
$$;

create or replace function public.greanlean_product_access_level(
  target_product_id uuid,
  check_user_id uuid default auth.uid()
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_sector text;
  result_level text;
begin
  if check_user_id is null then
    return 'PUBLIC';
  end if;

  if public.greanlean_is_platform_admin(check_user_id) then
    return 'INTERNAL';
  end if;

  select sector_code into target_sector
  from public.products
  where id = target_product_id;

  select grant_row.access_level_code into result_level
  from public.dpp_product_access_grant grant_row
  join public.dpp_user_membership membership
    on membership.id = grant_row.membership_id
  join public.dpp_organisation organisation
    on organisation.id = membership.organisation_id
  where membership.user_id = check_user_id
    and membership.status = 'active'
    and membership.valid_from <= now()
    and (membership.valid_until is null or membership.valid_until > now())
    and organisation.verification_status = 'verified'
    and organisation.status = 'active'
    and grant_row.status = 'active'
    and grant_row.valid_from <= now()
    and (grant_row.valid_until is null or grant_row.valid_until > now())
    and (
      grant_row.product_id = target_product_id
      or (grant_row.product_id is null and grant_row.sector_code = target_sector)
    )
  order by public.greanlean_access_rank(grant_row.access_level_code) desc
  limit 1;

  return coalesce(result_level, 'PUBLIC');
end;
$$;

create or replace function public.greanlean_get_my_identity()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'userId', auth.uid(),
    'isPlatformAdmin', public.greanlean_is_platform_admin(auth.uid()),
    'canUseDashboard', public.greanlean_is_platform_admin(auth.uid()),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membershipId', membership.id,
        'organisationId', organisation.id,
        'organisationName', organisation.legal_name,
        'organisationType', organisation.organisation_type,
        'verificationStatus', organisation.verification_status,
        'roleCode', membership.role_code,
        'status', membership.status,
        'validUntil', membership.valid_until
      ) order by membership.created_at)
      from public.dpp_user_membership membership
      join public.dpp_organisation organisation
        on organisation.id = membership.organisation_id
      where membership.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

create or replace function public.greanlean_resolve_dpp_access(
  target_identifier text,
  requested_level text default 'AUTO',
  access_purpose text default null,
  request_path_value text default null,
  correlation_id_value text default null,
  user_agent_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_product public.products%rowtype;
  maximum_level text;
  effective_requested text;
  effective_granted text;
  allowed boolean;
  reason text;
  current_organisation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select p.* into target_product
  from public.products p
  where (
    p.dpp_id = target_identifier
    or p.public_slug = target_identifier
    or p.id = case
      when target_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then target_identifier::uuid
      else null
    end
    or p.id = (
      select alias.product_id
      from public.dpp_identifier_alias alias
      where alias.alias = target_identifier and alias.is_active = true
      limit 1
    )
  )
    and (
      p.status in ('published', 'updated', 'expired')
      or public.greanlean_is_platform_admin(auth.uid())
    )
  limit 1;

  if target_product.id is null then
    raise exception 'DPP_NOT_FOUND' using errcode = 'P0002';
  end if;

  maximum_level := public.greanlean_product_access_level(target_product.id, auth.uid());
  effective_requested := upper(coalesce(requested_level, 'AUTO'));
  if effective_requested = 'AUTO' then
    effective_requested := case
      when public.greanlean_access_rank(maximum_level) >= 2 then 'AUTHORITY_ONLY'
      when public.greanlean_access_rank(maximum_level) >= 1 then 'LEGITIMATE_INTEREST'
      else 'PUBLIC'
    end;
  end if;
  if effective_requested not in ('PUBLIC', 'LEGITIMATE_INTEREST', 'AUTHORITY_ONLY') then
    raise exception 'INVALID_ACCESS_LEVEL' using errcode = '22023';
  end if;

  allowed := public.greanlean_access_rank(maximum_level)
    >= public.greanlean_access_rank(effective_requested);
  effective_granted := case when allowed then maximum_level else 'PUBLIC' end;
  reason := case
    when allowed and maximum_level = 'INTERNAL' then 'PLATFORM_ADMIN'
    when allowed then 'ACTIVE_PRODUCT_GRANT'
    when maximum_level = 'PUBLIC' then 'NO_ACTIVE_GRANT'
    else 'INSUFFICIENT_GRANT'
  end;

  select membership.organisation_id into current_organisation_id
  from public.dpp_user_membership membership
  join public.dpp_organisation organisation
    on organisation.id = membership.organisation_id
  where membership.user_id = auth.uid()
    and membership.status = 'active'
    and organisation.status = 'active'
  order by
    case when membership.role_code = 'platform_admin' then 0 else 1 end,
    membership.created_at
  limit 1;

  insert into public.dpp_access_audit (
    product_id,
    user_id,
    organisation_id,
    requested_access_level,
    granted_access_level,
    decision,
    reason_code,
    purpose,
    request_path,
    correlation_id,
    user_agent
  ) values (
    target_product.id,
    auth.uid(),
    current_organisation_id,
    effective_requested,
    effective_granted,
    case when allowed then 'allowed' else 'denied' end,
    reason,
    nullif(trim(access_purpose), ''),
    nullif(trim(request_path_value), ''),
    nullif(trim(correlation_id_value), ''),
    nullif(trim(user_agent_value), '')
  );

  return jsonb_build_object(
    'allowed', allowed,
    'reasonCode', reason,
    'productId', target_product.id,
    'productStatus', target_product.status,
    'identifier', coalesce(target_product.dpp_id, target_product.public_slug),
    'requestedLevel', effective_requested,
    'grantedLevel', effective_granted,
    'maximumLevel', maximum_level,
    'audience', case
      when allowed and public.greanlean_access_rank(effective_requested) >= 2 then 'AUTHORITY_ONLY'
      when allowed and public.greanlean_access_rank(effective_requested) >= 1 then 'LEGITIMATE_INTEREST'
      else 'PUBLIC'
    end
  );
end;
$$;

create or replace function public.greanlean_public_dpp_snapshot(target_identifier text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_product_id uuid;
  publication_record record;
begin
  select p.id into target_product_id
  from public.products p
  where (
    p.dpp_id = target_identifier
    or p.public_slug = target_identifier
    or p.id = (
      select alias.product_id
      from public.dpp_identifier_alias alias
      where alias.alias = target_identifier and alias.is_active = true
      limit 1
    )
  )
    and p.status in ('published', 'updated', 'expired')
  limit 1;
  if target_product_id is null then
    return null;
  end if;

  select version_row.snapshot, version_row.version, version_row.created_at
  into publication_record
  from public.product_versions version_row
  where version_row.product_id = target_product_id
    and version_row.lifecycle_status in ('published', 'updated', 'expired')
    and version_row.snapshot ? 'publicDpp'
  order by version_row.created_at desc
  limit 1;
  if publication_record.snapshot is null then
    return null;
  end if;

  return public.greanlean_filter_dpp_payload(
    publication_record.snapshot -> 'publicDpp',
    'PUBLIC'
  ) || jsonb_build_object(
    'publication',
    jsonb_build_object(
      'version', publication_record.version,
      'publishedAt', publication_record.created_at
    )
  );
end;
$$;

create or replace function public.greanlean_authorized_dpp_snapshot(
  target_identifier text,
  requested_level text default 'AUTO',
  access_purpose text default null,
  request_path_value text default null,
  correlation_id_value text default null,
  user_agent_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  decision jsonb;
  target_product_id uuid;
  publication_record record;
  projected_payload jsonb;
begin
  decision := public.greanlean_resolve_dpp_access(
    target_identifier,
    requested_level,
    access_purpose,
    request_path_value,
    correlation_id_value,
    user_agent_value
  );

  if not coalesce((decision ->> 'allowed')::boolean, false) then
    return jsonb_build_object('access', decision, 'data', null);
  end if;

  target_product_id := (decision ->> 'productId')::uuid;
  select version_row.snapshot, version_row.version, version_row.created_at
  into publication_record
  from public.product_versions version_row
  where version_row.product_id = target_product_id
    and version_row.snapshot ? 'publicDpp'
    and (
      version_row.lifecycle_status in ('published', 'updated', 'expired')
      or decision ->> 'maximumLevel' = 'INTERNAL'
    )
  order by version_row.created_at desc
  limit 1;

  if publication_record.snapshot is null then
    return jsonb_build_object('access', decision, 'data', null);
  end if;

  projected_payload := public.greanlean_filter_dpp_payload(
    publication_record.snapshot -> 'publicDpp',
    decision ->> 'requestedLevel'
  ) || jsonb_build_object(
    'publication',
    jsonb_build_object(
      'version', publication_record.version,
      'publishedAt', publication_record.created_at
    )
  );

  return jsonb_build_object('access', decision, 'data', projected_payload);
end;
$$;

create or replace function public.greanlean_submit_access_request(
  target_identifier text,
  requested_level text,
  requested_role text,
  organisation_name text,
  organisation_registration_id text,
  organisation_country_code text,
  access_purpose text,
  requester_email_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_product_id uuid;
  target_organisation_id uuid;
  target_membership_id uuid;
  result_request public.dpp_access_request%rowtype;
  normalized_registration text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if upper(requested_level) not in ('LEGITIMATE_INTEREST', 'AUTHORITY_ONLY') then
    raise exception 'INVALID_ACCESS_LEVEL' using errcode = '22023';
  end if;
  if requested_role not in ('buyer', 'service_provider', 'recycler', 'authority_reviewer') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;
  if requested_role = 'authority_reviewer' and upper(requested_level) <> 'AUTHORITY_ONLY' then
    raise exception 'AUTHORITY_ROLE_LEVEL_MISMATCH' using errcode = '22023';
  end if;
  if requested_role <> 'authority_reviewer' and upper(requested_level) <> 'LEGITIMATE_INTEREST' then
    raise exception 'PROFESSIONAL_ROLE_LEVEL_MISMATCH' using errcode = '22023';
  end if;
  if length(trim(coalesce(organisation_name, ''))) < 2
    or length(trim(coalesce(access_purpose, ''))) < 10 then
    raise exception 'ORGANISATION_AND_PURPOSE_REQUIRED' using errcode = '22023';
  end if;

  select p.id into target_product_id
  from public.products p
  where (
    p.dpp_id = target_identifier
    or p.public_slug = target_identifier
    or p.id = (
      select alias.product_id
      from public.dpp_identifier_alias alias
      where alias.alias = target_identifier and alias.is_active = true
      limit 1
    )
  )
    and p.status in ('published', 'updated', 'expired')
  limit 1;
  if target_product_id is null then
    raise exception 'DPP_NOT_FOUND' using errcode = 'P0002';
  end if;

  normalized_registration := nullif(trim(organisation_registration_id), '');
  if normalized_registration is not null then
    select id into target_organisation_id
    from public.dpp_organisation
    where registration_id = normalized_registration
    limit 1;
  end if;

  if target_organisation_id is null then
    insert into public.dpp_organisation (
      legal_name,
      registration_id,
      country_code,
      organisation_type
    ) values (
      trim(organisation_name),
      normalized_registration,
      upper(nullif(trim(organisation_country_code), '')),
      case
        when requested_role = 'buyer' then 'buyer'
        when requested_role = 'service_provider' then 'service_provider'
        when requested_role = 'recycler' then 'recycler'
        else 'authority'
      end
    )
    returning id into target_organisation_id;
  end if;

  insert into public.dpp_user_membership (
    user_id,
    organisation_id,
    role_code,
    status
  ) values (
    auth.uid(),
    target_organisation_id,
    requested_role,
    'pending'
  )
  on conflict (user_id, organisation_id) do update set
    role_code = case
      when public.dpp_user_membership.status = 'active'
        then public.dpp_user_membership.role_code
      else excluded.role_code
    end,
    updated_at = now()
  returning id into target_membership_id;

  insert into public.dpp_access_request (
    requester_user_id,
    requester_email,
    organisation_id,
    membership_id,
    product_id,
    requested_role_code,
    requested_access_level,
    purpose
  ) values (
    auth.uid(),
    nullif(trim(requester_email_value), ''),
    target_organisation_id,
    target_membership_id,
    target_product_id,
    requested_role,
    upper(requested_level),
    trim(access_purpose)
  )
  on conflict (requester_user_id, product_id, requested_access_level)
    where status = 'pending'
  do update set
    requester_email = excluded.requester_email,
    organisation_id = excluded.organisation_id,
    membership_id = excluded.membership_id,
    requested_role_code = excluded.requested_role_code,
    purpose = excluded.purpose,
    updated_at = now()
  returning * into result_request;

  return jsonb_build_object(
    'requestId', result_request.id,
    'status', result_request.status,
    'createdAt', result_request.created_at
  );
end;
$$;

create or replace function public.greanlean_decide_access_request(
  target_request_id uuid,
  decision_value text,
  decision_reason_value text default null,
  valid_until_value timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.dpp_access_request%rowtype;
begin
  if not public.greanlean_is_platform_admin(auth.uid()) then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if lower(decision_value) not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;

  select * into target_request
  from public.dpp_access_request
  where id = target_request_id and status = 'pending'
  for update;
  if target_request.id is null then
    raise exception 'PENDING_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if lower(decision_value) = 'approved' then
    update public.dpp_organisation
    set
      verification_status = 'verified',
      verified_at = coalesce(verified_at, now()),
      verified_by = auth.uid(),
      status = 'active',
      updated_at = now()
    where id = target_request.organisation_id;

    update public.dpp_user_membership
    set
      role_code = target_request.requested_role_code,
      status = 'active',
      valid_from = now(),
      valid_until = valid_until_value,
      approved_by = auth.uid(),
      approved_at = now(),
      revoked_by = null,
      revoked_at = null,
      updated_at = now()
    where id = target_request.membership_id;

    insert into public.dpp_product_access_grant (
      membership_id,
      product_id,
      access_level_code,
      purpose,
      status,
      valid_from,
      valid_until,
      approved_by,
      approved_at
    ) values (
      target_request.membership_id,
      target_request.product_id,
      target_request.requested_access_level,
      target_request.purpose,
      'active',
      now(),
      valid_until_value,
      auth.uid(),
      now()
    );
  end if;

  update public.dpp_access_request
  set
    status = lower(decision_value),
    decision_reason = nullif(trim(decision_reason_value), ''),
    decided_by = auth.uid(),
    decided_at = now(),
    updated_at = now()
  where id = target_request.id;

  return jsonb_build_object(
    'requestId', target_request.id,
    'status', lower(decision_value),
    'productId', target_request.product_id
  );
end;
$$;

create or replace function public.greanlean_prevent_access_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'DPP access audit records are append-only';
end;
$$;

drop trigger if exists dpp_access_audit_append_only on public.dpp_access_audit;
create trigger dpp_access_audit_append_only
  before update or delete on public.dpp_access_audit
  for each row execute function public.greanlean_prevent_access_audit_mutation();

drop trigger if exists dpp_organisation_touch_updated_at on public.dpp_organisation;
create trigger dpp_organisation_touch_updated_at
  before update on public.dpp_organisation
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists dpp_membership_touch_updated_at on public.dpp_user_membership;
create trigger dpp_membership_touch_updated_at
  before update on public.dpp_user_membership
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists dpp_access_grant_touch_updated_at on public.dpp_product_access_grant;
create trigger dpp_access_grant_touch_updated_at
  before update on public.dpp_product_access_grant
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists dpp_access_request_touch_updated_at on public.dpp_access_request;
create trigger dpp_access_request_touch_updated_at
  before update on public.dpp_access_request
  for each row execute function public.greanlean_touch_updated_at();

alter table public.dpp_organisation enable row level security;
alter table public.dpp_user_membership enable row level security;
alter table public.dpp_product_access_grant enable row level security;
alter table public.dpp_access_request enable row level security;
alter table public.dpp_access_audit enable row level security;

drop policy if exists "Members can read their organisations" on public.dpp_organisation;
create policy "Members can read their organisations"
  on public.dpp_organisation for select to authenticated
  using (
    public.greanlean_is_platform_admin(auth.uid())
    or exists (
      select 1 from public.dpp_user_membership membership
      where membership.organisation_id = id and membership.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read their memberships" on public.dpp_user_membership;
create policy "Users can read their memberships"
  on public.dpp_user_membership for select to authenticated
  using (user_id = auth.uid() or public.greanlean_is_platform_admin(auth.uid()));
drop policy if exists "Platform admins can manage memberships" on public.dpp_user_membership;
create policy "Platform admins can manage memberships"
  on public.dpp_user_membership for all to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Users can read their product grants" on public.dpp_product_access_grant;
create policy "Users can read their product grants"
  on public.dpp_product_access_grant for select to authenticated
  using (
    public.greanlean_is_platform_admin(auth.uid())
    or exists (
      select 1 from public.dpp_user_membership membership
      where membership.id = membership_id and membership.user_id = auth.uid()
    )
  );
drop policy if exists "Platform admins can manage product grants" on public.dpp_product_access_grant;
create policy "Platform admins can manage product grants"
  on public.dpp_product_access_grant for all to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Users can read their access requests" on public.dpp_access_request;
create policy "Users can read their access requests"
  on public.dpp_access_request for select to authenticated
  using (requester_user_id = auth.uid() or public.greanlean_is_platform_admin(auth.uid()));
drop policy if exists "Platform admins can manage access requests" on public.dpp_access_request;
create policy "Platform admins can manage access requests"
  on public.dpp_access_request for all to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Users can read their access audit" on public.dpp_access_audit;
create policy "Users can read their access audit"
  on public.dpp_access_audit for select to authenticated
  using (user_id = auth.uid() or public.greanlean_is_platform_admin(auth.uid()));

do $$
declare
  target_table text;
  target_policy text;
  managed_tables text[] := array[
    'dpp_category_profiles',
    'dpp_field_templates',
    'dpp_validation_rules',
    'products',
    'product_sector_field_values',
    'product_versions',
    'product_suppliers',
    'supplier_products',
    'product_materials',
    'product_bom',
    'product_esg_metrics',
    'product_certificates',
    'product_traceability',
    'product_circularity',
    'product_consumer_transparency',
    'product_digital_identity',
    'product_documents',
    'product_data_governance',
    'dpp_registry_submissions',
    'dpp_registration_proofs',
    'dpp_evidence_links',
    'dpp_blockchain_anchors'
  ];
begin
  foreach target_table in array managed_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    for target_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and cmd = 'ALL'
        and 'authenticated' = any(roles)
    loop
      execute format('drop policy if exists %I on public.%I', target_policy, target_table);
    end loop;
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.greanlean_is_platform_admin(auth.uid())) with check (public.greanlean_is_platform_admin(auth.uid()))',
      'Platform administrators manage ' || target_table,
      target_table
    );
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.dpp_audit_logs') is not null then
    drop policy if exists "Authenticated can manage audit logs" on public.dpp_audit_logs;
    drop policy if exists "Platform administrators read audit logs" on public.dpp_audit_logs;
    drop policy if exists "Platform administrators append audit logs" on public.dpp_audit_logs;
    create policy "Platform administrators read audit logs"
      on public.dpp_audit_logs for select to authenticated
      using (public.greanlean_is_platform_admin(auth.uid()));
    create policy "Platform administrators append audit logs"
      on public.dpp_audit_logs for insert to authenticated
      with check (public.greanlean_is_platform_admin(auth.uid()));

    drop trigger if exists dpp_legacy_audit_append_only on public.dpp_audit_logs;
    create trigger dpp_legacy_audit_append_only
      before update or delete on public.dpp_audit_logs
      for each row execute function public.greanlean_prevent_access_audit_mutation();
  end if;
end;
$$;

drop policy if exists "Public can read published product versions" on public.product_versions;

revoke all on function public.greanlean_access_rank(text) from public;
revoke all on function public.greanlean_visibility_access_level(text) from public;
revoke all on function public.greanlean_filter_dpp_payload(jsonb, text) from public;
revoke all on function public.greanlean_is_platform_admin(uuid) from public;
revoke all on function public.greanlean_product_access_level(uuid, uuid) from public;
revoke all on function public.greanlean_get_my_identity() from public;
revoke all on function public.greanlean_resolve_dpp_access(text, text, text, text, text, text) from public;
revoke all on function public.greanlean_public_dpp_snapshot(text) from public;
revoke all on function public.greanlean_authorized_dpp_snapshot(text, text, text, text, text, text) from public;
revoke all on function public.greanlean_submit_access_request(text, text, text, text, text, text, text, text) from public;
revoke all on function public.greanlean_decide_access_request(uuid, text, text, timestamptz) from public;

grant execute on function public.greanlean_access_rank(text) to authenticated;
grant execute on function public.greanlean_public_dpp_snapshot(text) to anon, authenticated;
grant execute on function public.greanlean_authorized_dpp_snapshot(text, text, text, text, text, text) to authenticated;
grant execute on function public.greanlean_is_platform_admin(uuid) to authenticated;
grant execute on function public.greanlean_product_access_level(uuid, uuid) to authenticated;
grant execute on function public.greanlean_get_my_identity() to authenticated;
grant execute on function public.greanlean_submit_access_request(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.greanlean_decide_access_request(uuid, text, text, timestamptz) to authenticated;

insert into public.dpp_organisation (
  id,
  legal_name,
  registration_id,
  country_code,
  organisation_type,
  verification_status,
  status,
  verified_at
) values (
  '00000000-0000-4000-8000-000000000013',
  'GREANLEAN Platform Operator',
  'GREANLEAN-PLATFORM',
  null,
  'platform_operator',
  'verified',
  'active',
  now()
)
on conflict (id) do update set
  legal_name = excluded.legal_name,
  organisation_type = excluded.organisation_type,
  verification_status = 'verified',
  status = 'active',
  verified_at = coalesce(public.dpp_organisation.verified_at, now()),
  updated_at = now();

insert into public.dpp_user_membership (
  user_id,
  organisation_id,
  role_code,
  status,
  approved_by,
  approved_at
)
select
  user_row.id,
  '00000000-0000-4000-8000-000000000013',
  'platform_admin',
  'active',
  user_row.id,
  now()
from auth.users user_row
where upper(coalesce(user_row.raw_app_meta_data ->> 'dpp_access_level', '')) = 'INTERNAL'
on conflict (user_id, organisation_id) do update set
  role_code = 'platform_admin',
  status = 'active',
  approved_at = coalesce(public.dpp_user_membership.approved_at, now()),
  updated_at = now();

comment on table public.dpp_organisation is
  'Verified legal organisations participating in role-based DPP access.';
comment on table public.dpp_product_access_grant is
  'Time-bounded product or sector grants. QR codes and URL parameters never create grants.';
comment on table public.dpp_access_audit is
  'Append-only allow/deny audit written by server-side database functions.';

commit;
