create table public.products (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  description text null,
  price numeric(10, 2) not null,
  image character varying(500) null,
  shop uuid not null,
  is_available boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  category text null,
  stock numeric null,
  constraint products_pkey primary key (id),
  constraint products_shop_fkey foreign KEY (shop) references shops (id)
) TABLESPACE pg_default;

create index IF not exists idx_products_shop on public.products using btree (shop) TABLESPACE pg_default;

create trigger update_products_updated_at BEFORE
update on products for EACH row
execute FUNCTION update_updated_at_column ();