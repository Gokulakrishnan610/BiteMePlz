create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  roll_no character varying(255) not null,
  email character varying(255) not null,
  password character varying(255) not null,
  role character varying(50) not null default 'student'::character varying,
  shop uuid null,
  is_verified boolean null default false,
  otp jsonb null,
  password_reset_otp jsonb null,
  password_reset_token jsonb null,
  balance numeric(10, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_roll_no_key unique (roll_no),
  constraint fk_users_shop foreign KEY (shop) references shops (id),
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'admin'::character varying,
            'shopAdmin'::character varying,
            'student'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;

create index IF not exists idx_users_roll_no on public.users using btree (roll_no) TABLESPACE pg_default;

create index IF not exists idx_users_shop on public.users using btree (shop) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();