package dev.xyam.traininghelper.timer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Programa una alarma exacta en cada cambio de etapa (despierta al celular aunque esté en reposo). */
public final class AlarmScheduler {
    private static final int MAX = 64;

    public static void scheduleAll(Context c) {
        cancelAll(c);
        TimerStore.Snapshot s = TimerStore.load(c, System.currentTimeMillis());
        if (!s.active || s.paused) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        for (int i = s.index; i < s.stages.length && i < MAX; i++) {
            // Al terminar la etapa i empieza la i+1 (o termina el entrenamiento)
            PendingIntent pi = pending(c, i + 1);
            long at = s.stages[i].endAt;
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    public static void cancelAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        for (int i = 0; i <= MAX; i++) am.cancel(pending(c, i));
    }

    private static PendingIntent pending(Context c, int stageIndex) {
        Intent intent = new Intent(c, StageAlarmReceiver.class).putExtra("index", stageIndex);
        return PendingIntent.getBroadcast(c, 1000 + stageIndex, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private AlarmScheduler() {}
}
