CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  description text NOT NULL DEFAULT '',
  composition text,
  care text,
  price integer NOT NULL DEFAULT 0,
  old_price integer,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  stock integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read published" ON public.products FOR SELECT USING (published = true);
CREATE POLICY "products admin read all" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE public.order_number_seq START 1024;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('MSK-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  delivery_method text NOT NULL DEFAULT 'courier_mkad',
  address text,
  delivery_date text,
  comment text,
  items_total integer NOT NULL DEFAULT 0,
  delivery_price integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO anon, authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders anyone can create" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders admin read" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders admin delete" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  image text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items anyone can create" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order items admin read" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "order items admin write" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.categories (slug, title, description, sort_order) VALUES
 ('candles','Свечи и ароматы','Соевые свечи и саше с весенними нотами',1),
 ('care','Уход за собой','Твёрдая косметика и натуральное мыло',2),
 ('home','Для дома','Мягкий текстиль и предметы без пластика',3),
 ('kitchen','Кухня без отходов','Всё для жизни zero-waste',4),
 ('accessories','Аксессуары','Шопперы, мешочки, бутылки',5);

INSERT INTO public.products (slug, title, subtitle, description, composition, care, price, old_price, category_id, tags, images, stock, published, featured) VALUES
 ('svecha-pervotsvet','Свеча «Первоцвет»','соя, гиацинт и белый чай','Мягкий весенний аромат: первые гиацинты, влажная зелень и капля белого чая. Горит ровно 40 часов и не оставляет копоти.','Соевый воск, эфирные масла, хлопковый фитиль. 180 г.','Подрезайте фитиль до 5 мм перед каждым зажиганием.',1890,2200,(SELECT id FROM public.categories WHERE slug='candles'),'{зеро-вейст,ручная работа}','{/products/candle.jpg}',24,true,true),
 ('mylo-myata-lipa','Мыло «Мята и липа»','холодный способ, 110 г','Плотная бархатная пена, прохладный аромат мяты и медовая липа. Варим небольшими партиями в Москве.','Оливковое и кокосовое масло, щёлочь, эфирные масла мяты и липы.','Храните на деревянной мыльнице, чтобы брусок высыхал.',420,NULL,(SELECT id FROM public.categories WHERE slug='care'),'{ручная работа,без упаковки}','{/products/soap.jpg}',60,true,true),
 ('shampun-romashka','Твёрдый шампунь «Ромашка»','для тонких волос','Заменяет две бутылки шампуня и не течёт в дорожной сумке. Ромашка успокаивает кожу головы, аромат — как сушёные луговые травы.','Кокосульфат натрия, масло ромашки, пантенол, каолин. 65 г.','Между применениями оставляйте на решётке для стока воды.',690,NULL,(SELECT id FROM public.categories WHERE slug='care'),'{зеро-вейст,рефилл}','{/products/shampoo.jpg}',35,true,true),
 ('meshochki-dlya-pokupok','Мешочки для покупок','набор из трёх штук','Лёгкая сетка из органического хлопка: помидоры видно на кассе, а вес почти не чувствуется. Стираются с обычным бельём.','100% органический хлопок, деревянный фиксатор.','Стирка при 30°, без отбеливателя.',890,1090,(SELECT id FROM public.categories WHERE slug='kitchen'),'{зеро-вейст,набор}','{/products/bags.jpg}',48,true,false),
 ('voskovye-salfetki','Восковые салфетки','три размера','Заменяют плёнку и фольгу: тепло рук делает салфетку пластичной, и она закрывает любую банку или половинку авокадо.','Хлопок, пчелиный воск, масло жожоба, древесная смола.','Мойте прохладной водой, не грейте.',1250,NULL,(SELECT id FROM public.categories WHERE slug='kitchen'),'{зеро-вейст,кухня}','{/products/wraps.jpg}',30,true,true),
 ('bambukovaya-shchetka','Бамбуковая щётка','мягкая щетина','Рукоятка из мосового бамбука с ботанической гравировкой, щетинки — мягкий нейлон без BPA. Упаковка из крафта, полностью компостируемая.','Бамбук, нейлоновая щетина без BPA.','После использования просушивайте вертикально.',290,NULL,(SELECT id FROM public.categories WHERE slug='care'),'{зеро-вейст}','{/products/toothbrush.jpg}',80,true,false),
 ('shopper-botanika','Шоппер «Ботаника»','ручная печать','Плотный шоппер с рисунком весенних ветвей, напечатанным вручную водными красками. Выдерживает арбуз, честно проверено.','Хлопковый твил 280 г/м², водные краски.','Стирка при 30°, глажка с изнанки.',1490,NULL,(SELECT id FROM public.categories WHERE slug='accessories'),'{ручная работа,хлопок}','{/products/tote.jpg}',22,true,true),
 ('butylka-v-chekhle','Бутылка в чехле','боросиликат, 600 мл','Стеклянная бутылка в мягком чехле из переработанного фетра пастельного цвета. Не даёт запаху и вкусу пластика испортить воду.','Боросиликатное стекло, чехол из переработанного фетра, бамбуковая крышка.','Мойте вручную, чехол снимается.',1690,1890,(SELECT id FROM public.categories WHERE slug='accessories'),'{без пластика}','{/products/bottle.jpg}',18,true,false),
 ('krem-lavanda','Крем для рук «Лаванда»','с рефиллом','Нежирный крем с лавандой и маслом ши. Баночку можно принести к нам и наполнить заново со скидкой 15%.','Масло ши, гидролат лаванды, глицерин, витамин E. 50 мл.','Храните при комнатной температуре.',740,NULL,(SELECT id FROM public.categories WHERE slug='care'),'{рефилл,ручная работа}','{/products/cream.jpg}',40,true,false);