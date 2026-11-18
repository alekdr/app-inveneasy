-- =====================================================
-- InvenEasy - Migración 006: Rachas de hábitos
-- =====================================================
-- Calcula current_streak y best_streak automáticamente cada
-- vez que cambia habit_logs.
--
-- Reglas:
--   * Un día 'completed' suma 1 a la racha.
--   * Un día 'skipped' NO rompe la racha (motivo válido).
--   * Un día aplicable sin registro o en 'pending' rompe la racha.
--   * Los días no aplicables según la frecuencia se ignoran:
--       daily   -> todos los días
--       weekdays-> lunes a viernes
--       weekends-> sábado y domingo
--       custom  -> se trata como daily
-- =====================================================

CREATE OR REPLACE FUNCTION public.habit_applies_on(p_frequency TEXT, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_frequency = 'weekdays' THEN
    RETURN EXTRACT(ISODOW FROM p_date) BETWEEN 1 AND 5;
  ELSIF p_frequency = 'weekends' THEN
    RETURN EXTRACT(ISODOW FROM p_date) IN (6, 7);
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_habit_streaks(p_habit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_frequency TEXT;
  v_today DATE := CURRENT_DATE;
  v_last_done DATE;
  v_current INT := 0;
  v_best INT := 0;
  v_run INT := 0;
  v_date DATE;
  v_first DATE;
  v_status TEXT;
BEGIN
  SELECT frequency INTO v_frequency FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Último día completado (puede ser hoy)
  SELECT MAX(log_date) INTO v_last_done
  FROM public.habit_logs
  WHERE habit_id = p_habit_id AND status = 'completed';

  IF v_last_done IS NOT NULL THEN
    -- Racha actual: retroceder desde el último día completado
    v_date := v_last_done;
    LOOP
      IF NOT public.habit_applies_on(v_frequency, v_date) THEN
        v_date := v_date - 1;
        CONTINUE;
      END IF;

      SELECT status INTO v_status
      FROM public.habit_logs
      WHERE habit_id = p_habit_id AND log_date = v_date;

      IF v_status = 'completed' THEN
        v_current := v_current + 1;
      ELSIF v_status = 'skipped' THEN
        NULL; -- no suma ni rompe
      ELSE
        EXIT; -- sin registro / pending en el pasado: rompe
      END IF;

      EXIT WHEN v_date <= v_last_done - 4000; -- guard
      v_date := v_date - 1;
    END LOOP;
  END IF;

  -- Mejor racha histórica: recorrer de adelante hacia atrás
  SELECT MIN(log_date) INTO v_first
  FROM public.habit_logs
  WHERE habit_id = p_habit_id;

  IF v_first IS NOT NULL THEN
    v_date := v_first;
    WHILE v_date <= v_today LOOP
      IF NOT public.habit_applies_on(v_frequency, v_date) THEN
        v_date := v_date + 1;
        CONTINUE;
      END IF;

      SELECT status INTO v_status
      FROM public.habit_logs
      WHERE habit_id = p_habit_id AND log_date = v_date;

      IF v_status = 'completed' THEN
        v_run := v_run + 1;
        IF v_run > v_best THEN v_best := v_run; END IF;
      ELSIF v_status = 'skipped' THEN
        NULL; -- no rompe
      ELSE
        v_run := 0; -- pendiente o sin registro: rompe
      END IF;

      v_date := v_date + 1;
    END LOOP;
  END IF;

  UPDATE public.habits
  SET current_streak = v_current,
      best_streak = GREATEST(COALESCE(best_streak, 0), v_best)
  WHERE id = p_habit_id;
END;
$$;

-- Disparador: recalcula tras cualquier cambio en habit_logs
CREATE OR REPLACE FUNCTION public.trigger_recalc_habit_streaks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_habit_streaks(COALESCE(NEW.habit_id, OLD.habit_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS habit_logs_recalc_streaks ON public.habit_logs;
CREATE TRIGGER habit_logs_recalc_streaks
AFTER INSERT OR UPDATE OR DELETE ON public.habit_logs
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_habit_streaks();

-- Recalcular una vez para datos existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.habits LOOP
    PERFORM public.recalc_habit_streaks(r.id);
  END LOOP;
END $$;
