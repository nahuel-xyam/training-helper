package dev.xyam.traininghelper.timer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Se dispara en cada cambio de etapa: avisa (si la app no está a la vista) y actualiza la notificación fija. */
public class StageAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int index = intent.getIntExtra("index", -1);
        TimerStore.Snapshot s = TimerStore.load(context, System.currentTimeMillis());
        if (!s.active || s.paused || index < 0) return;

        // Con la app abierta avisa la web (beep + vibración); acá solo cuando estás en otra cosa.
        if (s.alerts && !TimerStore.isAppVisible(context)) {
            if (index >= s.stages.length) TimerNotifications.postFinish(context, s);
            else TimerNotifications.postStageAlert(context, s, index);
        }

        if (index >= s.stages.length) {
            TimerService.stop(context);
            TimerStore.clear(context);
        } else {
            TimerService.refresh(context);
        }
    }
}
