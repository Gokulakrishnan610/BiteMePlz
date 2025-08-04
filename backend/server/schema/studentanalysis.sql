create table public.student_analytics (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  shop_id uuid null,
  total_spent numeric(10, 2) null default 0,
  total_orders integer null default 0,
  favorite_products jsonb null,
  spending_pattern jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint student_analytics_pkey primary key (id),
  constraint student_analytics_shop_id_fkey foreign KEY (shop_id) references shops (id),
  constraint student_analytics_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_student_analytics_user on public.student_analytics using btree (user_id) TABLESPACE pg_default;

create trigger update_student_analytics_updated_at BEFORE
update on student_analytics for EACH row
execute FUNCTION update_updated_at_column ();