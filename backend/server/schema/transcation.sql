create table public.transactions (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  shop_id uuid null,
  order_id uuid null,
  amount numeric(10, 2) not null,
  type character varying(50) not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  metadata jsonb null,
  payment_method text null,
  status text null,
  constraint transactions_pkey primary key (id),
  constraint transactions_order_id_fkey foreign KEY (order_id) references orders (id),
  constraint transactions_shop_id_fkey foreign KEY (shop_id) references shops (id),
  constraint transactions_user_id_fkey foreign KEY (user_id) references users (id),
  constraint transactions_type_check check (
    (
      (type)::text = any (
        (
          array[
            'credit'::character varying,
            'debit'::character varying,
            'payment'::character varying,
            'refund'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_transactions_user on public.transactions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_shop on public.transactions using btree (shop_id) TABLESPACE pg_default;

create trigger update_transactions_updated_at BEFORE
update on transactions for EACH row
execute FUNCTION update_updated_at_column ();