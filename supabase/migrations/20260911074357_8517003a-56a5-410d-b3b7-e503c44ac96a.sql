CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_delivery_method text,
  p_address text,
  p_delivery_date text,
  p_comment text,
  p_items jsonb
)
RETURNS TABLE (order_number text, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items_total integer := 0;
  v_delivery integer := 0;
  v_order_id uuid;
BEGIN
  IF p_delivery_method NOT IN ('courier_mkad', 'courier_outside', 'pickup') THEN
    RAISE EXCEPTION 'Неизвестный способ доставки';
  END IF;

  CREATE TEMP TABLE _lines ON COMMIT DROP AS
  SELECT p.id AS product_id, p.title, p.price, p.images[1] AS image,
         LEAST(GREATEST((i->>'quantity')::int, 1), 99) AS quantity
  FROM jsonb_array_elements(p_items) AS i
  JOIN public.products p ON p.id = (i->>'productId')::uuid AND p.published = true;

  SELECT COALESCE(SUM(price * quantity), 0) INTO v_items_total FROM _lines;
  IF v_items_total = 0 THEN
    RAISE EXCEPTION 'Товары не найдены';
  END IF;

  v_delivery := CASE
    WHEN p_delivery_method = 'pickup' THEN 0
    WHEN p_delivery_method = 'courier_mkad' THEN CASE WHEN v_items_total >= 4000 THEN 0 ELSE 390 END
    ELSE CASE WHEN v_items_total >= 8000 THEN 0 ELSE 690 END
  END;

  INSERT INTO public.orders (customer_name, phone, email, delivery_method, address, delivery_date,
                             comment, items_total, delivery_price, total)
  VALUES (p_customer_name, p_phone, NULLIF(p_email, ''), p_delivery_method, NULLIF(p_address, ''),
          NULLIF(p_delivery_date, ''), NULLIF(p_comment, ''), v_items_total, v_delivery,
          v_items_total + v_delivery)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, title, price, quantity, image)
  SELECT v_order_id, product_id, title, price, quantity, image FROM _lines;

  RETURN QUERY
  SELECT o.order_number, o.total FROM public.orders o WHERE o.id = v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;