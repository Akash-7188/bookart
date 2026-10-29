-- ============================================================================
--  Bookart — production schema (PostgreSQL 15+ with PostGIS)
--
--  Hosted schema for the Supabase-backed paths in src/lib/hosted-data.ts.
--
--  Apply once to a new Supabase project in its SQL Editor.
-- ============================================================================

create extension if not exists "postgis";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role        as enum ('buyer', 'seller', 'admin');
create type seller_kind      as enum ('individual', 'bookstore', 'library');
create type occupation_kind  as enum ('Student', 'Teacher', 'Reader', 'Shop Owner', 'Other');
create type gender_kind      as enum ('Female', 'Male', 'Non-binary', 'Prefer not to say');

create type item_kind        as enum ('book', 'notes', 'bundle');
create type category_kind    as enum ('competitive_exams', 'college_notes', 'school_textbooks',
                                      'fiction_nonfiction', 'rare_books');
create type condition_grade  as enum ('brand_new', 'like_new', 'gently_used', 'heavily_annotated');
create type format_kind      as enum ('hardcover', 'paperback', 'spiral_notes', 'digital_pack');
create type listing_status   as enum ('available', 'rented', 'sold', 'draft');

create type verification_status as enum ('none', 'pending', 'approved', 'rejected');
create type rental_status    as enum ('active', 'return_requested', 'returned_inspected',
                                      'refunded', 'overdue', 'cancelled');
create type penalty_grade    as enum ('ok', 'minor', 'major', 'lost');
create type purchase_status  as enum ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled');
create type payment_method   as enum ('upi', 'card', 'cod', 'wallet');
create type delivery_mode    as enum ('pickup', 'courier');
create type ledger_direction as enum ('credit', 'debit');

-- ---------------------------------------------------------------------------
--  Users (profiles linked to Supabase Auth users)
-- ---------------------------------------------------------------------------
create table users (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null,
  email             text not null unique,
  password_hash     text,                                   -- null for OAuth-only accounts
  provider          text not null default 'password',       -- 'password' | 'google'
  phone             text,
  role              user_role not null default 'buyer',
  seller_kind       seller_kind not null default 'individual',
  occupation        occupation_kind,
  age               int check (age between 13 and 99),
  gender            gender_kind,
  address           text,
  city              text,
  pincode           text,
  -- Geo point for radius search (WGS84). Maintained by trigger from lat/lng.
  latitude          double precision,
  longitude         double precision,
  location          geography(Point, 4326),
  rating            numeric(2,1) not null default 0,
  ratings_count     int not null default 0,
  wallet_balance    numeric(12,2) not null default 0,
  avatar_color      text default '#4f46e5',
  verified_seller   boolean not null default false,
  verification_status verification_status not null default 'none',
  gstin             text,
  registration_id   text,
  verification_note text,
  verification_submitted_at timestamptz,
  verified_at       timestamptz,
  created_at        timestamptz not null default now(),
  -- Bookshops must carry a GSTIN; libraries a registration id.
  constraint bookstore_needs_gstin check (seller_kind <> 'bookstore' or gstin is not null or verification_status <> 'approved'),
  constraint library_needs_reg      check (seller_kind <> 'library'   or registration_id is not null or verification_status <> 'approved')
);

-- Create the Bookart profile in the same transaction as Supabase Auth signup.
create or replace function create_bookart_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (
    id, name, email, provider, phone, role, seller_kind, occupation, age, gender,
    address, city, pincode, latitude, longitude, verification_status, gstin, registration_id,
    verification_submitted_at, verified_seller
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data->>'provider', ''), 'password'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    case
      when coalesce(new.raw_user_meta_data->>'seller_kind', 'individual') = 'individual' then 'buyer'::user_role
      else 'seller'::user_role
    end,
    coalesce(nullif(new.raw_user_meta_data->>'seller_kind', '')::seller_kind, 'individual'),
    nullif(new.raw_user_meta_data->>'occupation', '')::occupation_kind,
    nullif(new.raw_user_meta_data->>'age', '')::int,
    nullif(new.raw_user_meta_data->>'gender', '')::gender_kind,
    nullif(new.raw_user_meta_data->>'address', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'pincode', ''),
    nullif(new.raw_user_meta_data->>'latitude', '')::double precision,
    nullif(new.raw_user_meta_data->>'longitude', '')::double precision,
    case
      when coalesce(new.raw_user_meta_data->>'seller_kind', 'individual') = 'individual'
        then 'none'::verification_status
      else 'pending'::verification_status
    end,
    nullif(new.raw_user_meta_data->>'gstin', ''),
    nullif(new.raw_user_meta_data->>'registration_id', ''),
    case when new.raw_user_meta_data->>'seller_kind' in ('bookstore', 'library') then now() else null end,
    coalesce(new.raw_user_meta_data->>'seller_kind', 'individual') = 'individual'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function update_bookart_profile(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_pincode text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update users
     set name = p_name,
         phone = nullif(p_phone, ''),
         address = nullif(p_address, ''),
         city = nullif(p_city, ''),
         pincode = nullif(p_pincode, '')
   where id = auth.uid();
  if not found then raise exception 'profile not found'; end if;
end;
$$;

create or replace function submit_seller_verification(
  p_seller_kind seller_kind,
  p_gstin text,
  p_registration_id text,
  p_address text,
  p_city text,
  p_pincode text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_seller_kind = 'bookstore' and nullif(trim(p_gstin), '') is null then
    raise exception 'GSTIN is required for a bookstore';
  end if;
  if p_seller_kind = 'library' and nullif(trim(p_registration_id), '') is null then
    raise exception 'Registration ID is required for a library';
  end if;

  update users
     set seller_kind = p_seller_kind,
         role = case when role = 'admin' then role else 'seller' end,
         gstin = nullif(upper(trim(p_gstin)), ''),
         registration_id = nullif(trim(p_registration_id), ''),
         address = coalesce(nullif(p_address, ''), address),
         city = coalesce(nullif(p_city, ''), city),
         pincode = coalesce(nullif(p_pincode, ''), pincode),
         verification_status = case when p_seller_kind = 'individual' then 'approved'::verification_status else 'pending'::verification_status end,
         verified_seller = p_seller_kind = 'individual',
         verification_submitted_at = now(),
         verification_note = case when p_seller_kind = 'individual'
           then 'Individual seller — KYC auto-approved'
           else 'Queued for manual verification (GST/Registration check)' end
   where id = auth.uid();
  if not found then raise exception 'profile not found'; end if;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_bookart_profile_for_auth_user();

create index users_location_gix on users using gist (location);
create index users_role_idx     on users (role, seller_kind);
create index users_pincode_idx  on users (pincode);

-- Keep the geography column in sync with the editable lat/lng pair.
create or replace function sync_user_location() returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger users_sync_location
  before insert or update of latitude, longitude on users
  for each row execute function sync_user_location();

-- ---------------------------------------------------------------------------
-- Products (listings)
-- ---------------------------------------------------------------------------
create table products (
  id                uuid primary key default gen_random_uuid(),
  seller_id         uuid not null references users(id) on delete cascade,
  kind              item_kind not null default 'book',
  title             text not null,
  author            text not null,
  publisher         text,
  edition           text,
  year              int check (year between 1800 and 2100),
  isbn              text,
  language          text not null default 'English',
  pages             int check (pages > 0),
  subject           text,
  course            text,
  category          category_kind not null,
  format            format_kind not null default 'paperback',
  condition         condition_grade not null,
  condition_notes   text[] not null default '{}',   -- disclosed defects
  purchased_on      date,                            -- when the seller bought it
  mrp               numeric(10,2) not null check (mrp > 0),
  buy_price         numeric(10,2) check (buy_price > 0),  -- null ⇒ rent only
  is_rentable       boolean not null default false,
  rental_base_rate  numeric(10,2) check (rental_base_rate > 0), -- ₹ per day
  rental_tiers      jsonb not null default '[]',     -- [{days,label,fee}] generated on save
  deposit_multiplier numeric(4,2) not null default 1.0,
  images            text[] not null default '{}',    -- front, back, spine, sample page
  tags              text[] not null default '{}',
  latitude          double precision not null,
  longitude         double precision not null,
  location          geography(Point, 4326),
  pickup_area       text,
  pickup_city       text not null,
  pickup_pincode    text,
  status            listing_status not null default 'available',
  rented_by         uuid references users(id),
  rating            numeric(2,1) not null default 0,
  rating_count      int not null default 0,
  views             int not null default 0,
  cover_style       int not null default 1,
  created_at        timestamptz not null default now(),
  constraint rentable_needs_rate check (not is_rentable or rental_base_rate is not null),
  constraint listing_needs_price check (buy_price is not null or is_rentable)
);

create index products_location_gix  on products using gist (location);
create index products_category_idx  on products (category, status);
create index products_seller_idx    on products (seller_id, status);
create index products_price_idx     on products (buy_price);
create index products_search_idx    on products using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' ||
              coalesce(subject,'') || ' ' || coalesce(course,'') || ' ' || coalesce(publisher,''))
);
create index products_isbn_idx      on products (isbn);
create index products_tags_idx      on products using gin (tags);

create trigger products_sync_location
  before insert or update of latitude, longitude on products
  for each row execute function sync_user_location();

-- ---------------------------------------------------------------------------
-- ★ Radius query — the SQL equivalent of queryProducts({ origin, radiusKm })
-- ---------------------------------------------------------------------------
create or replace function search_listings(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_km      double precision default 25,   -- 0 or null ⇒ anywhere (courier)
  p_query          text default null,
  p_categories     category_kind[] default null,
  p_conditions     condition_grade[] default null,
  p_formats        format_kind[] default null,
  p_modes          text[] default null,           -- {'buy','rent'}
  p_min_price      numeric default null,
  p_max_price      numeric default null,
  p_seller_kinds   seller_kind[] default null,
  p_sort           text default 'relevance',
  p_limit          int default 24,
  p_offset         int default 0
)
returns table (
  id uuid, title text, author text, buy_price numeric, is_rentable boolean,
  condition condition_grade, status listing_status, distance_km double precision,
  seller_name text, seller_rating numeric, seller_kind seller_kind, total_count bigint
)
language sql stable as $$
with origin as (
  select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as geog
), filtered as (
  select p.*,
         case when p_radius_km is null or p_radius_km = 0 then null
              else st_distance(p.location, o.geog) / 1000.0 end as distance_km
  from products p
  cross join origin o
  join users s on s.id = p.seller_id
  where p.status <> 'draft'
    -- index-friendly radius filter (GIST on products.location)
    and (p_radius_km is null or p_radius_km = 0
         or st_dwithin(p.location, o.geog, p_radius_km * 1000))
    and (p_query is null or p_query = '' or
         (p.title || ' ' || p.author || ' ' || coalesce(p.isbn,'')) ilike '%' || p_query || '%')
    and (p_categories   is null or p.category  = any(p_categories))
    and (p_conditions   is null or p.condition = any(p_conditions))
    and (p_formats      is null or p.format    = any(p_formats))
    and (p_seller_kinds is null or s.seller_kind = any(p_seller_kinds))
    and (p_min_price is null or coalesce(p.buy_price, p.mrp) >= p_min_price)
    and (p_max_price is null or coalesce(p.buy_price, p.mrp) <= p_max_price)
    and (p_modes is null
         or ('buy'  = any(p_modes) and p.buy_price is not null)
         or ('rent' = any(p_modes) and p.is_rentable))
)
select f.id, f.title, f.author, f.buy_price, f.is_rentable, f.condition, f.status,
       f.distance_km, s.name, s.rating, s.seller_kind,
       count(*) over () as total_count
from filtered f
join users s on s.id = f.seller_id
order by
  -- available stock first, then by the requested sort
  (f.status <> 'available'),
  case when p_sort = 'distance'   then f.distance_km end asc nulls last,
  case when p_sort = 'price_asc'  then coalesce(f.buy_price, f.mrp) end asc,
  case when p_sort = 'price_desc' then coalesce(f.buy_price, f.mrp) end desc,
  case when p_sort = 'rating'     then s.rating end desc,
  case when p_sort = 'newest'     then extract(epoch from f.created_at) end desc,
  case when p_sort = 'relevance'  then f.rating end desc
limit p_limit offset p_offset;
$$;

-- ---------------------------------------------------------------------------
-- Rentals — the security-deposit ledger
-- ---------------------------------------------------------------------------
create table rental_orders (
  id                  uuid primary key default gen_random_uuid(),
  buyer_id            uuid not null references users(id) on delete restrict,
  seller_id           uuid not null references users(id) on delete restrict,
  product_id          uuid not null references products(id) on delete restrict,
  days                int not null check (days > 0),
  tier_label          text not null,
  deposit_paid        numeric(10,2) not null check (deposit_paid >= 0),   -- full item value, escrow
  rental_fee          numeric(10,2) not null check (rental_fee >= 0),     -- earned by seller
  late_fee            numeric(10,2) not null default 0,
  penalty_pct         numeric(4,3)  not null default 0,
  penalty_amount      numeric(10,2) not null default 0,
  refund_amount       numeric(10,2) not null default 0,                   -- deposit - fee - penalty - late
  start_date          timestamptz not null default now(),
  due_date            timestamptz not null,
  return_requested_at timestamptz,
  returned_at         timestamptz,
  refunded_at         timestamptz,
  refund_method       text check (refund_method in ('wallet','original_payment_method')),
  inspection_grade    penalty_grade,
  inspection_notes    text,
  timeline            jsonb not null default '[]'::jsonb,
  status              rental_status not null default 'active',
  payment_ref         text,
  created_at          timestamptz not null default now(),
  constraint refund_within_deposit check (refund_amount <= deposit_paid)
);

create index rentals_buyer_idx   on rental_orders (buyer_id, status);
create index rentals_seller_idx  on rental_orders (seller_id, status);
create index rentals_due_idx     on rental_orders (due_date) where status in ('active','overdue');
create index rentals_product_idx on rental_orders (product_id);

-- Refund arithmetic lives in the database so every client agrees.
create or replace function rental_refund(
  p_deposit  numeric, p_fee numeric, p_penalty_pct numeric, p_late_fee numeric
) returns numeric language sql immutable as $$
  select greatest(0, p_deposit - p_fee - round(p_deposit * p_penalty_pct) - p_late_fee);
$$;

-- Late fee: 10% of the daily rate per overdue day, capped at 60% of the deposit.
create or replace function rental_late_fee(
  p_base_rate numeric, p_late_days int, p_deposit numeric
) returns numeric language sql immutable as $$
  select least(round(p_base_rate * 0.10 * greatest(0, p_late_days)), round(p_deposit * 0.60));
$$;

-- Guard rail: a rental can only start when the copy is actually available.
create or replace function assert_listing_available() returns trigger as $$
declare v_status listing_status;
begin
  select status into v_status from products where id = new.product_id for update;
  if v_status <> 'available' then
    raise exception 'Listing % is not available (status=%)', new.product_id, v_status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger rentals_require_available
  before insert on rental_orders
  for each row execute function assert_listing_available();

-- ---------------------------------------------------------------------------
-- Purchases, cart, reviews, sessions
-- ---------------------------------------------------------------------------
create table purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      uuid not null references users(id) on delete restrict,
  seller_id     uuid not null references users(id) on delete restrict,
  product_id    uuid not null references products(id) on delete restrict,
  amount        numeric(10,2) not null,
  courier_fee   numeric(10,2) not null default 0,
  delivery_mode delivery_mode not null default 'pickup',
  address       text not null,
  payment_method payment_method not null,
  status        purchase_status not null default 'placed',
  created_at    timestamptz not null default now()
);

create table cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  mode       text not null check (mode in ('buy','rent')),
  days       int,
  added_at   timestamptz not null default now(),
  unique (user_id, product_id, mode),
  constraint rent_needs_days check (mode <> 'rent' or days is not null)
);

create table reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  seller_id  uuid not null references users(id) on delete cascade,
  buyer_id   uuid not null references users(id) on delete cascade,
  score      int not null check (score between 1 and 5),
  comment    text not null,
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);

-- Convenience view with distance-free business fields, used by the PDP.
create view product_details as
select p.*, s.name as seller_name, s.seller_kind, s.rating as seller_rating,
       s.ratings_count as seller_ratings, s.verified_seller,
       (select count(*) from reviews r where r.product_id = p.id) as review_count
from products p join users s on s.id = p.seller_id;

create table search_logs (
  id         bigserial primary key,
  query      text not null,
  created_at timestamptz not null default now()
);

create index search_logs_created_at_idx on search_logs (created_at desc);

create or replace function checkout_bookart(
  p_lines jsonb,
  p_address text,
  p_payment_method payment_method,
  p_delivery_mode delivery_mode,
  p_courier_fee numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_buyer uuid := auth.uid();
  v_line jsonb;
  v_product products%rowtype;
  v_mode text;
  v_days int;
  v_amount numeric;
  v_deposit numeric;
  v_rental_fee numeric;
  v_fee numeric;
  v_total numeric := 0;
  v_purchase_ids uuid[] := '{}';
  v_rental_ids uuid[] := '{}';
  v_order_id uuid;
  v_rental_id uuid;
  v_wallet numeric;
  v_tier_label text;
  v_buy_count int := 0;
begin
  if v_buyer is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'cart is empty';
  end if;
  if p_payment_method in ('upi','card') then
    raise exception 'online payments are not configured yet';
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_mode := v_line->>'mode';
    v_days := coalesce((v_line->>'days')::int, 7);
    select * into v_product from products where id = (v_line->>'productId')::uuid for update;
    if not found or v_product.status <> 'available' then
      raise exception 'listing is unavailable';
    end if;
    if v_mode = 'buy' then
      v_buy_count := v_buy_count + 1;
      if v_product.buy_price is null then raise exception 'listing is rent-only'; end if;
      if p_payment_method = 'cod' then
        v_amount := v_product.buy_price;
      elsif p_payment_method = 'wallet' then
        v_amount := v_product.buy_price;
      else
        raise exception 'unsupported payment method';
      end if;
      v_total := v_total + v_amount;
    elsif v_mode = 'rent' then
      if not v_product.is_rentable then raise exception 'listing is not rentable'; end if;
      if p_payment_method <> 'wallet' then
        raise exception 'rental deposits require wallet funds until online payments are configured';
      end if;
      v_deposit := round(coalesce(v_product.buy_price, v_product.mrp) * v_product.deposit_multiplier, 2);
      select (tier->>'fee')::numeric into v_rental_fee
        from jsonb_array_elements(v_product.rental_tiers) tier
       where (tier->>'days')::int = v_days
       limit 1;
      if v_rental_fee is null then raise exception 'invalid rental tier'; end if;
      v_total := v_total + v_deposit;
    else
      raise exception 'invalid cart mode';
    end if;
  end loop;

  if p_courier_fee < 0 then raise exception 'courier fee cannot be negative'; end if;
  if p_delivery_mode = 'courier' and v_buy_count > 0 then
    v_total := v_total + p_courier_fee;
  end if;

  select wallet_balance into v_wallet from users where id = v_buyer for update;
  if p_payment_method = 'wallet' and coalesce(v_wallet, 0) < v_total then
    raise exception 'insufficient wallet balance';
  end if;
  if p_payment_method = 'wallet' and v_total > 0 then
    update users set wallet_balance = wallet_balance - v_total where id = v_buyer;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_mode := v_line->>'mode';
    v_days := coalesce((v_line->>'days')::int, 7);
    select * into v_product from products where id = (v_line->>'productId')::uuid for update;
    if v_mode = 'buy' then
      v_amount := v_product.buy_price;
      v_fee := case when p_delivery_mode = 'courier' and v_buy_count > 0
        then p_courier_fee / v_buy_count else 0 end;
      insert into purchase_orders (
        buyer_id, seller_id, product_id, amount, courier_fee, delivery_mode, address, payment_method
      ) values (
        v_buyer, v_product.seller_id, v_product.id, v_amount, v_fee,
        p_delivery_mode, p_address, p_payment_method
      ) returning id into v_order_id;
      update products set status = 'sold' where id = v_product.id;
      v_purchase_ids := array_append(v_purchase_ids, v_order_id);
      if p_payment_method = 'wallet' then
        insert into wallet_ledger (user_id, order_id, direction, amount, reason)
          values (v_buyer, v_order_id, 'debit', v_amount + v_fee, 'purchase');
      end if;
    else
      v_deposit := round(coalesce(v_product.buy_price, v_product.mrp) * v_product.deposit_multiplier, 2);
      select (tier->>'fee')::numeric, tier->>'label'
        into v_rental_fee, v_tier_label
        from jsonb_array_elements(v_product.rental_tiers) tier
       where (tier->>'days')::int = v_days
       limit 1;
      insert into rental_orders (
        buyer_id, seller_id, product_id, days, tier_label, deposit_paid, rental_fee, due_date, timeline
      ) values (
        v_buyer, v_product.seller_id, v_product.id, v_days, coalesce(v_tier_label, v_days || ' days'),
        v_deposit, v_rental_fee, now() + make_interval(days => v_days),
        jsonb_build_array(jsonb_build_object('at', now(), 'label', 'Rental started — deposit held'))
      ) returning id into v_rental_id;
      v_rental_ids := array_append(v_rental_ids, v_rental_id);
    end if;
  end loop;

  return jsonb_build_object(
    'purchase_ids', to_jsonb(v_purchase_ids),
    'rental_ids', to_jsonb(v_rental_ids),
    'wallet_balance', (select wallet_balance from users where id = v_buyer)
  );
end;
$$;

create table sessions (
  token      text primary key,
  user_id    uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

-- Immutable double-entry ledger for escrow, refunds and payouts.
create table wallet_ledger (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  rental_id   uuid references rental_orders(id),
  order_id    uuid references purchase_orders(id),
  direction   ledger_direction not null,
  amount      numeric(12,2) not null check (amount > 0),
  reason      text not null,        -- deposit_hold | rental_fee | damage_penalty | late_fee | refund | payout
  created_at  timestamptz not null default now()
);

create index ledger_user_idx on wallet_ledger (user_id, created_at desc);

-- Escrow exposure at a glance (admin console).
create view v_escrow_position as
select coalesce(sum(deposit_paid - refund_amount), 0) as escrow_held,
       count(*) filter (where status in ('active','overdue','return_requested')) as active_rentals,
       count(*) filter (where status = 'overdue') as overdue_rentals,
       coalesce(sum(rental_fee + penalty_amount) filter (where status = 'refunded'), 0) as rental_revenue
from rental_orders;

-- ---------------------------------------------------------------------------
-- Triggers: inventory status + escrow side effects
-- ---------------------------------------------------------------------------
create or replace function on_rental_created() returns trigger as $$
begin
  update products set status = 'rented', rented_by = new.buyer_id where id = new.product_id;
  insert into wallet_ledger (user_id, rental_id, direction, amount, reason)
    values (new.buyer_id, new.id, 'debit', new.deposit_paid, 'deposit_hold');
  return new;
end;
$$ language plpgsql;

create trigger rentals_after_insert
  after insert on rental_orders
  for each row execute function on_rental_created();

create or replace function on_rental_settled() returns trigger as $$
begin
  if new.status = 'refunded' and old.status <> 'refunded' then
    -- Buyer gets deposit minus everything withheld; seller earns fee + penalty + late fee.
    update wallet_ledger set amount = amount where false;  -- keep ledger append-only
    insert into wallet_ledger (user_id, rental_id, direction, amount, reason)
      values (new.buyer_id, new.id, 'credit', new.refund_amount, 'refund');
    insert into wallet_ledger (user_id, rental_id, direction, amount, reason)
      values (new.seller_id, new.id, 'credit', new.rental_fee, 'rental_fee');
    if new.penalty_amount + new.late_fee > 0 then
      insert into wallet_ledger (user_id, rental_id, direction, amount, reason)
        values (new.seller_id, new.id, 'credit', new.penalty_amount + new.late_fee,
                case when new.penalty_amount > 0 then 'damage_penalty' else 'late_fee' end);
    end if;

    update users set wallet_balance = wallet_balance + new.refund_amount where id = new.buyer_id;
    update users set wallet_balance = wallet_balance + new.rental_fee + new.penalty_amount + new.late_fee
      where id = new.seller_id;

    update products
       set status = case when new.inspection_grade = 'lost' then 'sold' else 'available' end,
           rented_by = null,
           condition = case
             when new.inspection_grade in ('major','lost') then 'heavily_annotated'
             when new.inspection_grade = 'minor' then 'gently_used'
             else condition
           end
     where id = new.product_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger rentals_after_settle
  after update of status on rental_orders
  for each row execute function on_rental_settled();

create or replace function request_rental_return(p_rental_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update rental_orders
     set status = 'return_requested',
         return_requested_at = now(),
         timeline = timeline || jsonb_build_array(
           jsonb_build_object('at', now(), 'label', 'Return requested by buyer — awaiting seller inspection')
         )
   where id = p_rental_id
     and buyer_id = auth.uid()
     and status in ('active','overdue');
  if not found then raise exception 'rental not found or return cannot be requested'; end if;
end;
$$;

create or replace function inspect_rental_return(
  p_rental_id uuid,
  p_grade penalty_grade,
  p_notes text default null
) returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rental rental_orders%rowtype;
  v_rate numeric;
  v_late_days int;
  v_penalty_pct numeric;
  v_late_fee numeric;
  v_penalty numeric;
  v_refund numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_rental from rental_orders where id = p_rental_id for update;
  if not found then raise exception 'rental not found'; end if;
  if v_rental.seller_id <> auth.uid() and not is_admin() then
    raise exception 'seller or admin access required';
  end if;
  if v_rental.status not in ('return_requested','overdue','active') then
    raise exception 'rental cannot be inspected in its current state';
  end if;
  select rental_base_rate into v_rate from products where id = v_rental.product_id;
  v_late_days := greatest(0, ceil(extract(epoch from (now() - v_rental.due_date)) / 86400)::int);
  v_penalty_pct := case p_grade
    when 'ok' then 0 when 'minor' then 0.10 when 'major' then 0.35 when 'lost' then 1
  end;
  v_late_fee := rental_late_fee(coalesce(v_rate, 8), v_late_days, v_rental.deposit_paid);
  v_penalty := round(v_rental.deposit_paid * v_penalty_pct);
  v_refund := greatest(0, v_rental.deposit_paid - v_rental.rental_fee - v_penalty - v_late_fee);

  update rental_orders
     set status = 'refunded',
         inspection_grade = p_grade,
         inspection_notes = p_notes,
         returned_at = now(),
         refunded_at = now(),
         refund_method = 'wallet',
         late_fee = v_late_fee,
         penalty_pct = v_penalty_pct,
         penalty_amount = v_penalty,
         refund_amount = v_refund,
         timeline = timeline || jsonb_build_array(
           jsonb_build_object('at', now(), 'label', 'Inspected return — refund credited to buyer wallet')
         )
   where id = p_rental_id;
  return v_refund;
end;
$$;

-- Nightly sweep: flag overdue rentals so late fees start accruing.
create or replace function sweep_overdue_rentals() returns int language sql as $$
  with updated as (
    update rental_orders set status = 'overdue'
     where status = 'active' and due_date < now()
     returning 1
  ) select count(*) from updated;
$$;
-- select cron.schedule('sweep-overdue', '0 * * * *', 'select sweep_overdue_rentals()');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- The app uses the publishable/anon key with Supabase Auth and RLS.
-- Keep direct public access to user records disabled; expose seller profiles
-- through the limited view below.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin');
$$;

create or replace view public_seller_profiles as
select id, name, role, seller_kind, city, rating, ratings_count, avatar_color, verified_seller
from users
where role = 'seller';

grant select on public_seller_profiles to anon, authenticated;

alter table users          enable row level security;
alter table products       enable row level security;
alter table rental_orders  enable row level security;
alter table purchase_orders enable row level security;
alter table cart_items     enable row level security;
alter table reviews        enable row level security;
alter table wallet_ledger  enable row level security;
alter table search_logs enable row level security;

-- Anyone can browse listings and read public seller profiles.
create policy products_public_read  on products for select using (status <> 'draft');
create policy reviews_public_read   on reviews  for select using (true);
create policy reviews_buyer_insert on reviews for insert
  with check (buyer_id = auth.uid());
create policy users_self_read on users for select using (id = auth.uid() or is_admin());

-- Sellers own their listings.
create policy products_owner_write  on products for all
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());

-- Buyers see their own rentals; sellers see rentals of their stock; admins see all.
create policy rentals_participant_read on rental_orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

create policy purchases_participant on purchase_orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());
create policy cart_owner on cart_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ledger_owner on wallet_ledger for select
  using (user_id = auth.uid() or is_admin());
create policy search_logs_admin_read on search_logs for select
  using (is_admin());

create or replace function update_seller_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update users
     set rating = (select round(avg(score)::numeric, 1) from reviews where seller_id = new.seller_id),
         ratings_count = (select count(*) from reviews where seller_id = new.seller_id)
   where id = new.seller_id;
  return new;
end;
$$;

create trigger reviews_update_seller_rating
  after insert on reviews
  for each row execute function update_seller_rating();

create or replace function log_bookart_search(p_query text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(p_query), '') is not null then
    insert into search_logs (query) values (left(trim(p_query), 200));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin verification workflow
-- ---------------------------------------------------------------------------
create or replace function approve_seller(p_user uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update users
     set verification_status = case when p_approve then 'approved' else 'rejected' end,
         verified_seller     = p_approve,
         verification_note   = coalesce(p_note, verification_note),
         verified_at         = now()
   where id = p_user;
end;
$$;
