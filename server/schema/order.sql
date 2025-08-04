create table public.orders (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id character varying(255) not null,
  user_id uuid not null,
  shop_id uuid not null,
  order_items jsonb not null,
  total_price numeric(10, 2) not null default 0.0,
  payment_result jsonb null,
  is_paid boolean null default false,
  paid_at timestamp with time zone null,
  qr_code text null,
  qr_valid_until timestamp with time zone null,
  balance_amount numeric(10, 2) null default 0,
  held_amount numeric(10, 2) null default 0,
  final_validity timestamp with time zone null,
  is_verified boolean null default false,
  verified_at timestamp with time zone null,
  status character varying(50) null default 'pending'::character varying,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  parent_order_id text null,
  constraint orders_pkey primary key (id),
  constraint orders_order_id_key unique (order_id),
  constraint orders_shop_id_fkey foreign KEY (shop_id) references shops (id),
  constraint orders_user_id_fkey foreign KEY (user_id) references users (id),
  constraint orders_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'completed'::character varying,
            'expired'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_orders_user on public.orders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_orders_shop on public.orders using btree (shop_id) TABLESPACE pg_default;

create index IF not exists idx_orders_order_id on public.orders using btree (order_id) TABLESPACE pg_default;

create trigger update_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();