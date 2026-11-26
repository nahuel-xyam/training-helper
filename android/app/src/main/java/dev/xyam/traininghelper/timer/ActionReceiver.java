package dev.xyam.traininghelper.timer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Botones de la notificación (Pausa / Seguir / Parar). Se aplican acá mismo (funciona aunque la
 * WebView esté dormida) y se le avisan a la web para que sincronice su cronómetro.
 */
public class ActionReceiver extends BroadcastReceiver {
    public static final String EXTRA = "action";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getStringExtra(EXTRA);
        if (action == null) return;
        long now = System.currentTimeMillis();
        switch (action) {
            case "pause":
                TimerStore.setPaused(context, now);
                AlarmScheduler.cancelAll(context);
                TimerService.refresh(context);
                break;
            case "resume":
                TimerStore.resumeShift(context, now);
                AlarmScheduler.scheduleAll(context);
                TimerService.refresh(context);
                break;
            case "stop":
                AlarmScheduler.cancelAll(context);
                TimerService.stop(context);
                TimerStore.clear(context);
                break;
            default:
                return;
        }
        TrainingPlugin.emitAction(context, action);
    }
}
