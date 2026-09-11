UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='home') WHERE category_id = (SELECT id FROM public.categories WHERE slug='kitchen');
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='accessories') WHERE slug IN ('meshochki-dlya-pokupok','bambukovaya-shchetka');
DELETE FROM public.categories WHERE slug='kitchen';
UPDATE public.categories SET slug='uhod-kosmetika', title='Уход и косметика', description='Мыло, шампуни, кремы — мягкие формулы без лишней упаковки', sort_order=1 WHERE slug='care';
UPDATE public.categories SET slug='aromaty-svechi', title='Ароматы и свечи', description='Соевые свечи и ароматы весеннего сада', sort_order=2 WHERE slug='candles';
UPDATE public.categories SET slug='dom-kuhnya', title='Для дома и кухни', description='Салфетки, мешочки и посуда для быта без отходов', sort_order=3 WHERE slug='home';
UPDATE public.categories SET slug='zero-waste', title='Zero Waste', description='Многоразовые вещи на каждый день', sort_order=4 WHERE slug='accessories';