create table public.shops (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  description text null,
  location character varying(255) not null,
  image character varying(500) null,
  shop_admin uuid not null,
  is_active boolean null default true,
  is_open boolean null default true,
  final_validity_time timestamp with time zone not null,
  next_opening_time timestamp with time zone not null,
  qr_validity_minutes integer null default 20,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint shops_pkey primary key (id),
  constraint fk_shops_admin foreign KEY (shop_admin) references users (id),
  constraint shops_qr_validity_minutes_check check (
    (
      (qr_validity_minutes >= 1)
      and (qr_validity_minutes <= 60)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_shops_admin on public.shops using btree (shop_admin) TABLESPACE pg_default;

create trigger update_shops_updated_at BEFORE
update on shops for EACH row
execute FUNCTION update_updated_at_column ();