package dev.xyam.traininghelper.timer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import dev.xyam.traininghelper.MainActivity;
import dev.xyam.traininghelper.R;

/**
 * - Notificación fija (servicio en primer plano) con la cuenta regresiva de la etapa. Se pide que sea
 *   "Live Update" (Android 16): así aparece el chip con el timer en la barra de estado.
 * - Avisos de cambio de etapa (alta prioridad, con sonido y vibración: aparecen arriba de otras apps).
 */
public final class TimerNotifications {
    public static final String CHANNEL_TIMER = "timer";
    public static final String CHANNEL_STAGES = "stages";
    public static final int ONGOING_ID = 1;
    private static final int ALERT_ID = 2;

    public static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Importancia baja: se actualiza sin sonar (pero no MIN, que impide el Live Update).
        NotificationChannel timer = new NotificationChannel(CHANNEL_TIMER, "Cronómetro en curso", NotificationManager.IMPORTANCE_LOW);
        timer.setDescription("Cuenta regresiva de la etapa mientras entrenás");
        timer.setShowBadge(false);
        nm.createNotificationChannel(timer);

        NotificationChannel stages = new NotificationChannel(CHANNEL_STAGES, "Cambios de etapa", NotificationManager.IMPORTANCE_HIGH);
        stages.setDescription("Aviso al cambiar de etapa o ciclo");
        stages.enableVibration(true);
        stages.setVibrationPattern(new long[] { 0, 400, 150, 400 });
        stages.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()
        );
        nm.createNotificationChannel(stages);
    }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent action(Context c, String action, int code) {
        Intent i = new Intent(c, ActionReceiver.class).putExtra(ActionReceiver.EXTRA, action);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int parseColor(String hex) {
        try {
            return Color.parseColor(hex);
        } catch (Exception e) {
            return Color.parseColor("#22c55e");
        }
    }

    /** Notificación fija del servicio. */
    public static Notification buildOngoing(Context c, TimerStore.Snapshot s) {
        ensureChannels(c);
        TimerStore.Stage cur = s.current();
        TimerStore.Stage next = s.next();

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL_TIMER)
            .setSmallIcon(R.drawable.ic_stat_treadmill)
            .setContentIntent(openApp(c))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setRequestPromotedOngoing(true);

        if (cur == null) {
            return b.setContentTitle("¡Entrenamiento terminado! 🎉").setContentText(s.workoutName).build();
        }

        String title = cur.name + " · " + cur.speed;
        String nextText = next != null ? "Siguiente: " + next.name + " · " + next.speed : "Última etapa 💪";
        b.setColor(parseColor(cur.color)).setSubText(cur.chip);

        if (s.paused) {
            b.setContentTitle("⏸ En pausa · " + cur.name)
                .setContentText("Quedan " + TimerStore.formatMs(s.remainingMs) + " · " + nextText)
                .setShowWhen(false)
                .setShortCriticalText(TimerStore.formatMs(s.remainingMs))
                .addAction(0, "Seguir", action(c, "resume", 11))
                .addAction(0, "Parar", action(c, "stop", 12));
        } else {
            // Cronómetro en cuenta regresiva hasta el fin de la etapa: Android lo anima solo
            // (en la notificación y en el chip de la barra de estado).
            b.setContentTitle(title)
                .setContentText(nextText)
                .setWhen(cur.endAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .addAction(0, "Pausa", action(c, "pause", 10))
                .addAction(0, "Parar", action(c, "stop", 12));
        }
        return b.build();
    }

    /** Actualiza la notificación fija (si hay permiso). */
    public static void updateOngoing(Context c, TimerStore.Snapshot s) {
        try {
            NotificationManagerCompat.from(c).notify(ONGOING_ID, buildOngoing(c, s));
        } catch (SecurityException ignored) {
            // sin permiso de notificaciones
        }
    }

    /** Aviso de que empieza la etapa `index`. */
    public static void postStageAlert(Context c, TimerStore.Snapshot s, int index) {
        TimerStore.Stage st = s.stages[index];
        String dur = TimerStore.formatMs(st.durationMs);
        String chipPrefix = st.chip.startsWith("Ciclo") ? st.chip + " · " : "";
        post(c, chipPrefix + st.name, st.speed + " durante " + dur, parseColor(st.color));
    }

    public static void postFinish(Context c, TimerStore.Snapshot s) {
        post(c, "¡Entrenamiento terminado! 🎉", "Bien ahí, " + s.workoutName, parseColor("#22c55e"));
    }

    private static void post(Context c, String title, String text, int color) {
        ensureChannels(c);
        Notification n = new NotificationCompat.Builder(c, CHANNEL_STAGES)
            .setSmallIcon(R.drawable.ic_stat_treadmill)
            .setContentTitle(title)
            .setContentText(text)
            .setColor(color)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setTimeoutAfter(20_000)
            .setContentIntent(openApp(c))
            .build();
        try {
            NotificationManagerCompat.from(c).notify(ALERT_ID, n);
        } catch (SecurityException ignored) {
        }
    }

    public static void cancelAll(Context c) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        nm.cancel(ONGOING_ID);
    }

    /** ¿El usuario permite que la notificación se muestre como Live Update (chip en la barra de estado)? */
    public static boolean canPromote(Context c) {
        if (Build.VERSION.SDK_INT < 36) return false;
        return NotificationManagerCompat.from(c).canPostPromotedNotifications();
    }

    private TimerNotifications() {}
}
