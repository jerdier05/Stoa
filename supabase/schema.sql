-- ============================================================
--  Stoa · Esquema de la base de datos
--  Cómo usarlo: Supabase → SQL Editor → New query → pega este
--  archivo entero → Run. Solo se ejecuta una vez.
-- ============================================================


-- ------------------------------------------------------------
-- 1. PERFILES
-- Supabase guarda los usuarios en auth.users (no lo tocamos).
-- Nosotros creamos "profiles" con los datos públicos de cada uno.
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null default 'usuario',
  friend_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  privacy     text not null default 'private' check (privacy in ('private', 'friends', 'public')),
  created_at  timestamptz not null default now()
);

-- Trigger: cada vez que alguien se registra, se le crea su perfil
-- automáticamente con el nombre que eligió en el formulario.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 2. AMISTADES (se agregan por el código #friend_code)
-- ------------------------------------------------------------
create table public.friendships (
  id         bigint generated always as identity primary key,
  requester  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

-- Evita solicitudes duplicadas en los dos sentidos (A→B y B→A).
create unique index friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- ¿Puede el usuario actual ver la rutina de "owner"?
-- Sí si es suya, si es pública, o si es "solo amigos" y son amigos.
create function public.can_view(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid() or exists (
    select 1 from profiles p
    where p.id = owner and (
      p.privacy = 'public'
      or (p.privacy = 'friends' and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.requester = owner and f.addressee = auth.uid())
            or (f.addressee = owner and f.requester = auth.uid()))
      ))
    )
  );
$$;


-- ------------------------------------------------------------
-- 3. RUTINA SEMANAL
-- blocks: tus bloques de actividad (Gimnasio, Estudio…)
-- routine_items: cada bloque colocado en un día y un horario
-- Las horas se guardan en minutos desde las 00:00 (540 = 09:00).
-- ------------------------------------------------------------
create table public.blocks (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.routine_items (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  block_id   bigint not null references public.blocks(id) on delete cascade,
  day        smallint not null check (day between 0 and 6),      -- 0 = lunes
  start_min  smallint not null check (start_min between 0 and 1440),
  end_min    smallint not null check (end_min between 0 and 1440),
  created_at timestamptz not null default now(),
  check (end_min > start_min)
);


-- ------------------------------------------------------------
-- 4. GYM
-- ------------------------------------------------------------
create table public.workouts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        smallint not null check (day between 0 and 6),
  exercise   text not null check (char_length(exercise) between 1 and 60),
  sets       smallint,
  reps       smallint,
  weight     numeric(6, 2),
  created_at timestamptz not null default now()
);

-- Un registro por cada día que marcas el entrenamiento como hecho.
create table public.workout_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);


-- ------------------------------------------------------------
-- 5. NUTRICIÓN
-- ------------------------------------------------------------
create table public.nutrition (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  sex        text check (sex in ('m', 'f')),
  age        smallint,
  weight     numeric(5, 1),
  height     smallint,
  activity   numeric(4, 3) not null default 1.55,
  goal       text not null default 'keep' check (goal in ('lose', 'keep', 'gain')),
  updated_at timestamptz not null default now()
);

create table public.meals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null default current_date,
  name       text not null check (char_length(name) between 1 and 60),
  kcal       integer not null default 0,
  protein    numeric(6, 1) not null default 0,
  carbs      numeric(6, 1) not null default 0,
  fat        numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 6. DINERO
-- ------------------------------------------------------------
create table public.finance (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  balance     numeric(12, 2) not null default 0,
  invested    numeric(12, 2) not null default 0,
  income      numeric(12, 2) not null default 0,
  return_rate numeric(5, 2) not null default 7,
  updated_at  timestamptz not null default now()
);

create table public.budget_categories (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 30),
  percent       numeric(5, 2) not null default 0,
  is_investment boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.expenses (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id bigint references public.budget_categories(id) on delete set null,
  amount      numeric(10, 2) not null check (amount > 0),
  note        text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- 7. SEGURIDAD POR FILA (RLS)
-- Sin esto, cualquiera con la clave pública podría leer todo.
-- Con RLS, la propia base de datos comprueba en cada consulta
-- que solo tocas tus filas.
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.friendships       enable row level security;
alter table public.blocks            enable row level security;
alter table public.routine_items     enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_log       enable row level security;
alter table public.nutrition         enable row level security;
alter table public.meals             enable row level security;
alter table public.finance           enable row level security;
alter table public.budget_categories enable row level security;
alter table public.expenses          enable row level security;

-- Perfiles: cualquier usuario con sesión puede buscarlos (para agregar
-- amigos por código), pero solo tú editas el tuyo.
create policy "Ver perfiles" on public.profiles
  for select to authenticated using (true);
create policy "Editar mi perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Amistades: solo las ves si participas en ellas.
create policy "Ver mis amistades" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));
create policy "Enviar solicitud" on public.friendships
  for insert to authenticated with check (requester = auth.uid());
create policy "Aceptar solicitud" on public.friendships
  for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());
create policy "Borrar amistad" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

-- Rutina: la puedes leer si can_view() lo permite; editar solo la tuya.
create policy "Ver bloques" on public.blocks
  for select to authenticated using (public.can_view(user_id));
create policy "Crear bloques" on public.blocks
  for insert to authenticated with check (user_id = auth.uid());
create policy "Editar bloques" on public.blocks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Borrar bloques" on public.blocks
  for delete to authenticated using (user_id = auth.uid());

create policy "Ver rutina" on public.routine_items
  for select to authenticated using (public.can_view(user_id));
create policy "Crear rutina" on public.routine_items
  for insert to authenticated with check (user_id = auth.uid());
create policy "Editar rutina" on public.routine_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Borrar rutina" on public.routine_items
  for delete to authenticated using (user_id = auth.uid());

-- Todo lo demás es privado: solo el dueño.
create policy "Solo dueño" on public.workouts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Solo dueño" on public.workout_log
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Solo dueño" on public.nutrition
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Solo dueño" on public.meals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Solo dueño" on public.finance
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Solo dueño" on public.budget_categories
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Solo dueño" on public.expenses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ============================================================
-- 8. BORRAR CUENTA
-- Borra el usuario y, en cascada, todos sus datos.
-- ============================================================
create function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
