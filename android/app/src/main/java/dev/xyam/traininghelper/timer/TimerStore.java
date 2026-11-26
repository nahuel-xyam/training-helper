package dev.xyam.traininghelper.timer;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Estado del entrenamiento guardado en SharedPreferences, para que el servicio, las alarmas y el
 * plugin compartan la misma información aunque la WebView esté dormida o la app se haya cerrado.
 *
 * Cronograma (lo manda la web): etapas restantes en orden, cada una con su hora de fin (epoch ms).
 */
public final class TimerStore {
    private static final String PREFS = "training_timer";

    public static final class Stage {
        public final String name, chip, speed, color;
        public final long endAt;
        public final long durationMs;

        Stage(JSONObject o) {
            name = o.optString("name", "");
            chip = o.optString("chip", "");
            speed = o.optString("speed", "");
            color = o.optString("color", "#22c55e");
            endAt = o.optLong("endAt", 0);
            durationMs = o.optLong("durationMs", 0);
        }
    }

    /** Foto del estado en un instante. */
    public static final class Snapshot {
        public Stage[] stages = new Stage[0];
        public String workoutName = "";
        /** avisar los cambios de etapa con notificación (el usuario puede apagarlo en la app) */
        public boolean alerts = true;
        public int totalStages;
        public boolean active, paused;
        public long pausedAt;
        /** índice de la etapa actual (stages.length = terminó) */
        public int index;
        public long remainingMs;

        public Stage current() { return index < stages.length ? stages[index] : null; }
        public Stage next() { return index + 1 < stages.length ? stages[index + 1] : null; }
        public boolean finished() { return active && index >= stages.length; }
    }

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void saveSchedule(Context c, JSONObject schedule) {
        prefs(c).edit()
            .putString("schedule", schedule.toString())
            .putBoolean("active", true)
            .putBoolean("paused", false)
            .putLong("pausedAt", 0)
            .apply();
    }

    public static void setPaused(Context c, long at) {
        prefs(c).edit().putBoolean("paused", true).putLong("pausedAt", at).apply();
    }

    /** Reanuda desde lo nativo (botón de la notificación): corre todas las horas de fin. */
    public static void resumeShift(Context c, long now) {
        Snapshot s = load(c, now);
        if (!s.paused) return;
        long delta = now - s.pausedAt;
        try {
            JSONObject schedule = new JSONObject(prefs(c).getString("schedule", "{}"));
            JSONArray arr = schedule.optJSONArray("stages");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject st = arr.getJSONObject(i);
                    st.put("endAt", st.optLong("endAt") + delta);
                }
            }
            saveSchedule(c, schedule);
        } catch (JSONException ignored) {
        }
    }

    public static void clear(Context c) {
        prefs(c).edit().remove("schedule").putBoolean("active", false).putBoolean("paused", false).apply();
    }

    public static Snapshot load(Context c, long now) {
        SharedPreferences p = prefs(c);
        Snapshot s = new Snapshot();
        s.active = p.getBoolean("active", false);
        s.paused = p.getBoolean("paused", false);
        s.pausedAt = p.getLong("pausedAt", 0);
        try {
            JSONObject schedule = new JSONObject(p.getString("schedule", "{}"));
            s.workoutName = schedule.optString("workoutName", "");
            s.alerts = schedule.optBoolean("alerts", true);
            JSONArray arr = schedule.optJSONArray("stages");
            if (arr != null) {
                s.stages = new Stage[arr.length()];
                for (int i = 0; i < arr.length(); i++) s.stages[i] = new Stage(arr.getJSONObject(i));
            }
        } catch (JSONException ignored) {
        }
        s.totalStages = s.stages.length;
        long at = s.paused ? s.pausedAt : now;
        int i = 0;
        while (i < s.stages.length && s.stages[i].endAt <= at) i++;
        s.index = i;
        s.remainingMs = i < s.stages.length ? Math.max(0, s.stages[i].endAt - at) : 0;
        return s;
    }

    // ---- flags varios ----
    public static boolean isAppVisible(Context c) { return prefs(c).getBoolean("appVisible", false); }
    public static void setAppVisible(Context c, boolean v) { prefs(c).edit().putBoolean("appVisible", v).apply(); }

    public static boolean isBubbleEnabled(Context c) { return prefs(c).getBoolean("bubble", true); }
    public static void setBubbleEnabled(Context c, boolean v) { prefs(c).edit().putBoolean("bubble", v).apply(); }

    public static int[] bubblePosition(Context c) {
        SharedPreferences p = prefs(c);
        return new int[] { p.getInt("bubbleX", 24), p.getInt("bubbleY", 260) };
    }
    public static void saveBubblePosition(Context c, int x, int y) {
        prefs(c).edit().putInt("bubbleX", x).putInt("bubbleY", y).apply();
    }

    /** Acción tocada en la notificación/burbuja que la web todavía no procesó. */
    public static void setPendingAction(Context c, String action) { prefs(c).edit().putString("pendingAction", action).apply(); }
    public static String takePendingAction(Context c) {
        String a = prefs(c).getString("pendingAction", null);
        prefs(c).edit().remove("pendingAction").apply();
        return a;
    }

    public static String formatMs(long ms) {
        long secs = (long) Math.ceil(ms / 1000.0);
        long h = secs / 3600, m = (secs % 3600) / 60, s = secs % 60;
        return h > 0 ? String.format(java.util.Locale.US, "%d:%02d:%02d", h, m, s) : String.format(java.util.Locale.US, "%02d:%02d", m, s);
    }

    private TimerStore() {}
}
