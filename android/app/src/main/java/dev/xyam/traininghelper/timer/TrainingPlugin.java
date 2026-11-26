package dev.xyam.traininghelper.timer;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONException;

/**
 * Puente con la web (src/lib/native.ts). La web manda el cronograma de etapas con sus horas de fin;
 * de ahí en adelante el lado nativo (servicio + alarmas) funciona solo, aunque la WebView se duerma.
 */
@CapacitorPlugin(
    name = "Training",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class TrainingPlugin extends Plugin {
    private static TrainingPlugin instance;

    @Override
    public void load() {
        instance = this;
        TimerNotifications.ensureChannels(getContext());
        TimerStore.setAppVisible(getContext(), true);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        TimerStore.setAppVisible(getContext(), true);
        TimerService.refresh(getContext());
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        TimerStore.setAppVisible(getContext(), false);
        TimerService.refresh(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        TimerStore.setAppVisible(getContext(), false);
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    /** Llamado por ActionReceiver cuando tocan Pausa/Seguir/Parar en la notificación. */
    static void emitAction(Context c, String action) {
        TrainingPlugin p = instance;
        if (p != null && p.getBridge() != null) {
            JSObject data = new JSObject();
            data.put("action", action);
            p.notifyListeners("action", data, true);
        } else {
            TimerStore.setPendingAction(c, action);
        }
    }

    // ---- métodos para la web ----

    /** { workoutName, alerts, stages: [{ name, chip, speed, color, endAt, durationMs }] } (solo etapas restantes) */
    @PluginMethod
    public void start(PluginCall call) {
        try {
            TimerStore.saveSchedule(getContext(), new org.json.JSONObject(call.getData().toString()));
        } catch (JSONException e) {
            call.reject("Cronograma inválido");
            return;
        }
        AlarmScheduler.scheduleAll(getContext());
        TimerService.start(getContext());
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        TimerStore.setPaused(getContext(), System.currentTimeMillis());
        AlarmScheduler.cancelAll(getContext());
        TimerService.refresh(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AlarmScheduler.cancelAll(getContext());
        TimerService.stop(getContext());
        TimerStore.clear(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setBubble(PluginCall call) {
        TimerStore.setBubbleEnabled(getContext(), Boolean.TRUE.equals(call.getBoolean("enabled", true)));
        TimerService.refresh(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("canDrawOverlays", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c));
        r.put("bubbleEnabled", TimerStore.isBubbleEnabled(c));
        r.put("supportsPromotion", Build.VERSION.SDK_INT >= 36);
        r.put("canPromote", TimerNotifications.canPromote(c));
        call.resolve(r);
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + c.getPackageName()))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        c.startActivity(i);
        call.resolve();
    }

    /** Ajuste del sistema para permitir el Live Update (chip en la barra de estado). */
    @PluginMethod
    public void openPromotionSettings(PluginCall call) {
        Context c = getContext();
        Intent i;
        if (Build.VERSION.SDK_INT >= 36) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
        } catch (Exception e) {
            c.startActivity(
                new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            );
        }
        call.resolve();
    }

    /** Acción tocada en la notificación mientras la web no estaba (Pausa/Seguir/Parar). */
    @PluginMethod
    public void takePendingAction(PluginCall call) {
        JSObject r = new JSObject();
        r.put("action", TimerStore.takePendingAction(getContext()));
        call.resolve(r);
    }
}
