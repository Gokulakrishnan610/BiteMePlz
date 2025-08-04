create table public.shop_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  shop_id uuid not null,
  action character varying(100) not null,
  performed_by uuid null,
  details jsonb null,
  created_at timestamp with time zone null default now(),
  description text null,
  ip_address text null,
  metadata jsonb null,
  new_state jsonb null,
  previous_state jsonb null,
  shop uuid null,
  user_agent text null,
  constraint shop_logs_pkey primary key (id),
  constraint shop_logs_performed_by_fkey foreign KEY (performed_by) references users (id),
  constraint shop_logs_shop_fkey foreign KEY (shop) references shops (id),
  constraint shop_logs_shop_id_fkey foreign KEY (shop_id) references shops (id)
) TABLESPACE pg_default;

create index IF not exists idx_shop_logs_shop on public.shop_logs using btree (shop_id) TABLESPACE pg_default;